package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"time"
)

const maxQuoteTotalCents int64 = 100000000000

type QuoteItem struct {
	Description    string `json:"description"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unitPriceCents"`
	TotalCents     int64  `json:"totalCents"`
}

type QuoteCreateInput struct {
	LeadID       int64       `json:"leadId"`
	Title        string      `json:"title"`
	Items        []QuoteItem `json:"items"`
	TaxRateBPS   int64       `json:"taxRateBps"`
	Notes        string      `json:"notes"`
	ValidityDays int         `json:"validityDays"`
}

type Quote struct {
	ID            int64       `json:"id"`
	LeadID        int64       `json:"leadId"`
	QuoteNumber   string      `json:"quoteNumber"`
	Title         string      `json:"title"`
	Items         []QuoteItem `json:"items"`
	SubtotalCents int64       `json:"subtotalCents"`
	TaxRateBPS    int64       `json:"taxRateBps"`
	TaxCents      int64       `json:"taxCents"`
	TotalCents    int64       `json:"totalCents"`
	Notes         string      `json:"notes"`
	Status        string      `json:"status"`
	ValidUntil    time.Time   `json:"validUntil"`
	SentAt        *time.Time  `json:"sentAt"`
	CreatedAt     time.Time   `json:"createdAt"`
}

type quoteDocumentData struct {
	Quote
	BusinessName string
	SellerEmail  string
	SellerPhone  string
	ClientName   string
	ClientEmail  string
	ClientPhone  string
}

func quotesHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	switch r.Method {
	case http.MethodGet:
		listQuotesHandler(w, r, user)
	case http.MethodPost:
		createQuoteHandler(w, r, user)
	default:
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
	}
}

func quoteByIDHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/quotes/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "pdf" {
		http.Error(w, "Devis invalide", http.StatusBadRequest)
		return
	}
	quoteID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || quoteID <= 0 {
		http.Error(w, "Devis invalide", http.StatusBadRequest)
		return
	}

	document, err := loadQuoteDocument(r.Context(), quoteID, user.ID)
	if err != nil {
		http.Error(w, "Devis introuvable", http.StatusNotFound)
		return
	}

	pdf := generateQuotePDF(document)
	filename := safeQuoteFilename(document.QuoteNumber) + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", strconv.Itoa(len(pdf)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdf)
}

func createQuoteHandler(w http.ResponseWriter, r *http.Request, user SupabaseUser) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var input QuoteCreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Données du devis invalides", http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Devis"
	}
	if len(title) > 120 || len(input.Items) == 0 || len(input.Items) > 20 {
		http.Error(w, "Le devis doit contenir entre 1 et 20 lignes", http.StatusBadRequest)
		return
	}
	if input.TaxRateBPS < 0 || input.TaxRateBPS > 10000 {
		http.Error(w, "Taux de TVA invalide", http.StatusBadRequest)
		return
	}
	if input.ValidityDays == 0 {
		input.ValidityDays = 30
	}
	if input.ValidityDays < 1 || input.ValidityDays > 365 {
		http.Error(w, "Durée de validité invalide", http.StatusBadRequest)
		return
	}
	notes := strings.TrimSpace(input.Notes)
	if len(notes) > 3000 {
		http.Error(w, "Les conditions sont trop longues", http.StatusBadRequest)
		return
	}

	var subtotal int64
	items := make([]QuoteItem, 0, len(input.Items))
	for _, item := range input.Items {
		description := strings.TrimSpace(item.Description)
		if description == "" || len(description) > 240 || item.Quantity < 1 || item.Quantity > 10000 || item.UnitPriceCents < 0 || item.UnitPriceCents > maxQuoteTotalCents {
			http.Error(w, "Une ligne du devis est invalide", http.StatusBadRequest)
			return
		}
		lineTotal := item.Quantity * item.UnitPriceCents
		if lineTotal > maxQuoteTotalCents || subtotal > maxQuoteTotalCents-lineTotal {
			http.Error(w, "Montant du devis trop élevé", http.StatusBadRequest)
			return
		}
		subtotal += lineTotal
		items = append(items, QuoteItem{Description: description, Quantity: item.Quantity, UnitPriceCents: item.UnitPriceCents, TotalCents: lineTotal})
	}
	if subtotal <= 0 {
		http.Error(w, "Le total du devis doit être supérieur à zéro", http.StatusBadRequest)
		return
	}
	taxCents := (subtotal*input.TaxRateBPS + 5000) / 10000
	totalCents := subtotal + taxCents
	if totalCents > maxQuoteTotalCents {
		http.Error(w, "Montant du devis trop élevé", http.StatusBadRequest)
		return
	}

	var document quoteDocumentData
	var siteID int64
	err := db.QueryRow(r.Context(), `
		SELECT l.site_id, l.name, l.email, l.phone, s.business_name,
		       COALESCE(NULLIF(s.notification_email, ''), $3), s.phone
		FROM leads l
		INNER JOIN sites s ON s.id = l.site_id
		WHERE l.id = $1 AND l.user_id = $2::uuid`,
		input.LeadID, user.ID, user.Email,
	).Scan(&siteID, &document.ClientName, &document.ClientEmail, &document.ClientPhone, &document.BusinessName, &document.SellerEmail, &document.SellerPhone)
	if err != nil {
		http.Error(w, "Prospect introuvable", http.StatusNotFound)
		return
	}
	if _, err := mail.ParseAddress(strings.TrimSpace(document.ClientEmail)); err != nil {
		http.Error(w, "Le prospect doit avoir une adresse e-mail valide", http.StatusBadRequest)
		return
	}

	itemsJSON, _ := json.Marshal(items)
	validUntil := time.Now().UTC().AddDate(0, 0, input.ValidityDays)
	temporaryNumber := fmt.Sprintf("TMP-%d-%d", input.LeadID, time.Now().UnixNano())
	tx, err := db.Begin(r.Context())
	if err != nil {
		http.Error(w, "Impossible de créer le devis", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var quote Quote
	err = tx.QueryRow(r.Context(), `
		INSERT INTO quotes (lead_id, site_id, user_id, quote_number, title, items, subtotal_cents, tax_rate_bps, tax_cents, total_cents, notes, valid_until)
		VALUES ($1, $2, $3::uuid, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at`,
		input.LeadID, siteID, user.ID, temporaryNumber, title, itemsJSON, subtotal, input.TaxRateBPS, taxCents, totalCents, notes, validUntil,
	).Scan(&quote.ID, &quote.CreatedAt)
	if err != nil {
		http.Error(w, "Impossible de créer le devis", http.StatusInternalServerError)
		return
	}
	quoteNumber := fmt.Sprintf("DEV-%d-%06d", quote.CreatedAt.Year(), quote.ID)
	if _, err = tx.Exec(r.Context(), `UPDATE quotes SET quote_number = $1 WHERE id = $2`, quoteNumber, quote.ID); err != nil {
		http.Error(w, "Impossible de numéroter le devis", http.StatusInternalServerError)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		http.Error(w, "Impossible d'enregistrer le devis", http.StatusInternalServerError)
		return
	}

	quote.LeadID = input.LeadID
	quote.QuoteNumber = quoteNumber
	quote.Title = title
	quote.Items = items
	quote.SubtotalCents = subtotal
	quote.TaxRateBPS = input.TaxRateBPS
	quote.TaxCents = taxCents
	quote.TotalCents = totalCents
	quote.Notes = notes
	quote.Status = "draft"
	quote.ValidUntil = validUntil
	document.Quote = quote

	pdf := generateQuotePDF(document)
	if err := sendQuoteEmail(r.Context(), document, pdf); err != nil {
		log.Println("Devis enregistré mais non envoyé :", err)
		writeJSON(w, http.StatusCreated, map[string]any{
			"quote":     quote,
			"emailSent": false,
			"warning":   "Le devis est enregistré, mais l'e-mail n'a pas pu être envoyé.",
		})
		return
	}

	sentAt := time.Now().UTC()
	quote.Status = "sent"
	quote.SentAt = &sentAt
	_, err = db.Exec(r.Context(), `
		WITH updated_quote AS (
			UPDATE quotes SET status = 'sent', sent_at = $1 WHERE id = $2 AND user_id = $3::uuid
		)
		UPDATE leads SET status = 'quote_sent', quote_amount_cents = $4 WHERE id = $5 AND user_id = $3::uuid`,
		sentAt, quote.ID, user.ID, quote.TotalCents, quote.LeadID,
	)
	if err != nil {
		log.Println("Devis envoyé, suivi non mis à jour :", err)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"quote": quote, "emailSent": true})
}

func listQuotesHandler(w http.ResponseWriter, r *http.Request, user SupabaseUser) {
	leadID, err := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("leadId")), 10, 64)
	if err != nil || leadID <= 0 {
		http.Error(w, "Prospect invalide", http.StatusBadRequest)
		return
	}
	rows, err := db.Query(r.Context(), `
		SELECT id, lead_id, quote_number, title, items, subtotal_cents, tax_rate_bps, tax_cents, total_cents, notes, status, valid_until, sent_at, created_at
		FROM quotes WHERE user_id = $1::uuid AND lead_id = $2 ORDER BY created_at DESC LIMIT 100`, user.ID, leadID)
	if err != nil {
		http.Error(w, "Impossible de charger les devis", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	quotes := make([]Quote, 0)
	for rows.Next() {
		var quote Quote
		var itemsJSON []byte
		if err := rows.Scan(&quote.ID, &quote.LeadID, &quote.QuoteNumber, &quote.Title, &itemsJSON, &quote.SubtotalCents, &quote.TaxRateBPS, &quote.TaxCents, &quote.TotalCents, &quote.Notes, &quote.Status, &quote.ValidUntil, &quote.SentAt, &quote.CreatedAt); err != nil {
			http.Error(w, "Impossible de charger les devis", http.StatusInternalServerError)
			return
		}
		if err := json.Unmarshal(itemsJSON, &quote.Items); err != nil {
			quote.Items = []QuoteItem{}
		}
		quotes = append(quotes, quote)
	}
	writeJSON(w, http.StatusOK, quotes)
}

func loadQuoteDocument(ctx context.Context, quoteID int64, userID string) (quoteDocumentData, error) {
	var document quoteDocumentData
	var itemsJSON []byte
	err := db.QueryRow(ctx, `
		SELECT q.id, q.lead_id, q.quote_number, q.title, q.items, q.subtotal_cents, q.tax_rate_bps, q.tax_cents, q.total_cents, q.notes, q.status, q.valid_until, q.sent_at, q.created_at,
		       s.business_name, s.notification_email, s.phone, l.name, l.email, l.phone
		FROM quotes q
		INNER JOIN sites s ON s.id = q.site_id
		INNER JOIN leads l ON l.id = q.lead_id
		WHERE q.id = $1 AND q.user_id = $2::uuid`, quoteID, userID,
	).Scan(&document.ID, &document.LeadID, &document.QuoteNumber, &document.Title, &itemsJSON, &document.SubtotalCents, &document.TaxRateBPS, &document.TaxCents, &document.TotalCents, &document.Notes, &document.Status, &document.ValidUntil, &document.SentAt, &document.CreatedAt, &document.BusinessName, &document.SellerEmail, &document.SellerPhone, &document.ClientName, &document.ClientEmail, &document.ClientPhone)
	if err != nil {
		return document, err
	}
	if err := json.Unmarshal(itemsJSON, &document.Items); err != nil {
		return document, err
	}
	return document, nil
}

func sendQuoteEmail(ctx context.Context, document quoteDocumentData, pdf []byte) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY absente")
	}
	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = "Lumio <onboarding@resend.dev>"
	}
	clientName := html.EscapeString(document.ClientName)
	businessName := html.EscapeString(document.BusinessName)
	htmlBody := fmt.Sprintf(`<!doctype html><html lang="fr"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#0f172a;border-radius:20px;padding:28px;color:#fff"><div style="color:#60a5fa;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">%s</div><h1 style="margin:10px 0 0">Votre devis %s</h1></div><div style="margin-top:18px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:28px"><p>Bonjour %s,</p><p style="line-height:1.7">Veuillez trouver votre devis en pièce jointe.</p><p style="font-size:28px;font-weight:800;color:#2563eb">%s</p><p>Ce devis est valable jusqu'au %s.</p><p style="margin-top:28px">Cordialement,<br><strong>%s</strong></p></div></div></body></html>`, businessName, html.EscapeString(document.QuoteNumber), clientName, formatQuoteMoney(document.TotalCents), document.ValidUntil.Format("02/01/2006"), businessName)
	payload := map[string]any{
		"from":        fromEmail,
		"to":          []string{document.ClientEmail},
		"subject":     fmt.Sprintf("Votre devis %s - %s", document.QuoteNumber, document.BusinessName),
		"html":        htmlBody,
		"attachments": []map[string]string{{"filename": safeQuoteFilename(document.QuoteNumber) + ".pdf", "content": base64.StdEncoding.EncodeToString(pdf)}},
	}
	if strings.TrimSpace(document.SellerEmail) != "" {
		payload["reply_to"] = document.SellerEmail
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", fmt.Sprintf("siteai-quote-%d", document.ID))
	response, err := (&http.Client{Timeout: 15 * time.Second}).Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 8*1024))
		return fmt.Errorf("Resend HTTP %d : %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func generateQuotePDF(document quoteDocumentData) []byte {
	lines := []string{
		"DEVIS " + document.QuoteNumber,
		document.BusinessName,
		"Email : " + document.SellerEmail + "   Telephone : " + document.SellerPhone,
		"",
		"Client : " + document.ClientName,
		"Email : " + document.ClientEmail + "   Telephone : " + document.ClientPhone,
		"Date : " + document.CreatedAt.Format("02/01/2006") + "   Valable jusqu'au : " + document.ValidUntil.Format("02/01/2006"),
		"",
		document.Title,
		"",
	}
	for _, item := range document.Items {
		line := fmt.Sprintf("%d x %s - %s = %s", item.Quantity, item.Description, formatQuoteMoney(item.UnitPriceCents), formatQuoteMoney(item.TotalCents))
		lines = append(lines, wrapQuoteText(line, 82)...)
	}
	lines = append(lines, "", "Sous-total HT : "+formatQuoteMoney(document.SubtotalCents), fmt.Sprintf("TVA %.2f %% : %s", float64(document.TaxRateBPS)/100, formatQuoteMoney(document.TaxCents)), "TOTAL TTC : "+formatQuoteMoney(document.TotalCents))
	if document.Notes != "" {
		lines = append(lines, "", "Conditions :")
		lines = append(lines, wrapQuoteText(document.Notes, 82)...)
	}
	lines = append(lines, "", "Merci pour votre confiance.")
	return simplePDF(lines)
}

func simplePDF(lines []string) []byte {
	const linesPerPage = 38
	pageCount := (len(lines) + linesPerPage - 1) / linesPerPage
	if pageCount == 0 {
		pageCount = 1
	}

	pageReferences := make([]string, 0, pageCount)
	for pageIndex := 0; pageIndex < pageCount; pageIndex++ {
		pageReferences = append(pageReferences, fmt.Sprintf("%d 0 R", 4+pageIndex*2))
	}
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>", strings.Join(pageReferences, " "), pageCount),
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	}

	for pageIndex := 0; pageIndex < pageCount; pageIndex++ {
		start := pageIndex * linesPerPage
		end := min(start+linesPerPage, len(lines))
		var content bytes.Buffer
		y := 795
		for lineIndex := start; lineIndex < end; lineIndex++ {
			rawLine := lines[lineIndex]
			fontSize := 11
			if lineIndex == 0 {
				fontSize = 20
			} else if strings.HasPrefix(rawLine, "TOTAL TTC") {
				fontSize = 15
			}
			line := pdfEscape(asciiQuoteText(rawLine))
			fmt.Fprintf(&content, "BT /F1 %d Tf 50 %d Td (%s) Tj ET\n", fontSize, y, line)
			y -= 19
		}
		if pageCount > 1 {
			fmt.Fprintf(&content, "BT /F1 9 Tf 500 28 Td (Page %d/%d) Tj ET\n", pageIndex+1, pageCount)
		}
		pageObjectID := 4 + pageIndex*2
		contentObjectID := pageObjectID + 1
		objects = append(objects,
			fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>", contentObjectID),
			fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", content.Len(), content.String()),
		)
	}
	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objects)+1)
	for index, object := range objects {
		offsets[index+1] = pdf.Len()
		fmt.Fprintf(&pdf, "%d 0 obj\n%s\nendobj\n", index+1, object)
	}
	xref := pdf.Len()
	fmt.Fprintf(&pdf, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for index := 1; index <= len(objects); index++ {
		fmt.Fprintf(&pdf, "%010d 00000 n \n", offsets[index])
	}
	fmt.Fprintf(&pdf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objects)+1, xref)
	return pdf.Bytes()
}

func asciiQuoteText(value string) string {
	replacer := strings.NewReplacer("é", "e", "è", "e", "ê", "e", "ë", "e", "É", "E", "à", "a", "â", "a", "ä", "a", "À", "A", "ç", "c", "Ç", "C", "î", "i", "ï", "i", "ô", "o", "ö", "o", "ù", "u", "û", "u", "ü", "u", "€", "EUR", "œ", "oe", "’", "'", "–", "-", "—", "-")
	return strings.Map(func(r rune) rune {
		if r >= 32 && r <= 126 {
			return r
		}
		return '?'
	}, replacer.Replace(value))
}

func pdfEscape(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "(", "\\(")
	return strings.ReplaceAll(value, ")", "\\)")
}

func wrapQuoteText(value string, width int) []string {
	words := strings.Fields(value)
	lines := make([]string, 0)
	current := ""
	for _, word := range words {
		if current != "" && len(current)+1+len(word) > width {
			lines = append(lines, current)
			current = word
		} else if current == "" {
			current = word
		} else {
			current += " " + word
		}
	}
	if current != "" {
		lines = append(lines, current)
	}
	return lines
}

func formatQuoteMoney(cents int64) string {
	return strings.Replace(fmt.Sprintf("%.2f EUR", float64(cents)/100), ".", ",", 1)
}

func safeQuoteFilename(value string) string {
	value = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, value)
	return strings.Trim(value, "-")
}
