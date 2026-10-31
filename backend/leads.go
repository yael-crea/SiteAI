package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

const leadRateLimit = 5

const leadRateWindow = 15 * time.Minute

type leadRateEntry struct {
	Count   int
	ResetAt time.Time
}

var leadRateLimiter = struct {
	sync.Mutex
	Entries map[string]leadRateEntry
}{
	Entries: make(map[string]leadRateEntry),
}

type LeadInput struct {
	PublicSlug string `json:"publicSlug"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Message    string `json:"message"`
	Consent    bool   `json:"consent"`

	// Champ invisible pour bloquer une partie des robots.
	Website string `json:"website"`
}

type Lead struct {
	ID               int64      `json:"id"`
	SiteID           int64      `json:"siteId"`
	PublicSlug       string     `json:"publicSlug"`
	BusinessName     string     `json:"businessName"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Phone            string     `json:"phone"`
	Message          string     `json:"message"`
	Status           string     `json:"status"`
	Note             string     `json:"note"`
	FollowUpAt       *time.Time `json:"followUpAt"`
	Archived         bool       `json:"archived"`
	QuoteAmountCents int64      `json:"quoteAmountCents"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type LeadUpdateInput struct {
	Status           string  `json:"status"`
	Note             string  `json:"note"`
	FollowUpAt       *string `json:"followUpAt"`
	Archived         bool    `json:"archived"`
	QuoteAmountCents int64   `json:"quoteAmountCents"`
}

func leadsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch r.Method {
	case http.MethodPost:
		createLeadHandler(w, r)
	case http.MethodGet:
		listLeadsHandler(w, r)
	default:
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
	}
}

func leadByIDHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPatch {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	rawID := strings.Trim(
		strings.TrimPrefix(
			r.URL.Path,
			"/leads/",
		),
		"/",
	)

	leadID, err := strconv.ParseInt(
		rawID,
		10,
		64,
	)

	if err != nil || leadID <= 0 {
		http.Error(
			w,
			"Prospect invalide",
			http.StatusBadRequest,
		)
		return
	}

	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		16*1024,
	)

	var input LeadUpdateInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"Données invalides",
			http.StatusBadRequest,
		)
		return
	}

	status := strings.TrimSpace(
		strings.ToLower(input.Status),
	)

	allowedStatuses := map[string]bool{
		"new":        true,
		"contacted":  true,
		"quote_sent": true,
		"won":        true,
		"lost":       true,
	}

	if !allowedStatuses[status] {
		http.Error(
			w,
			"Statut invalide",
			http.StatusBadRequest,
		)
		return
	}

	if input.QuoteAmountCents < 0 ||
		input.QuoteAmountCents > 100000000000 {
		http.Error(
			w,
			"Montant du devis invalide",
			http.StatusBadRequest,
		)
		return
	}

	note := strings.TrimSpace(input.Note)

	if len(note) > 3000 {
		http.Error(
			w,
			"La note est trop longue",
			http.StatusBadRequest,
		)
		return
	}

	var followUpAt *time.Time

	if input.FollowUpAt != nil {
		cleanFollowUp := strings.TrimSpace(*input.FollowUpAt)

		if cleanFollowUp != "" {
			parsed, parseErr := time.Parse(
				time.RFC3339,
				cleanFollowUp,
			)

			if parseErr != nil {
				http.Error(
					w,
					"Date de relance invalide",
					http.StatusBadRequest,
				)
				return
			}

			followUpAt = &parsed
		}
	}

	result, err := db.Exec(
		r.Context(),
		`
		UPDATE leads
		SET
			status = $1,
			note = $2,
			follow_up_at = $3,
			archived = $4,
			quote_amount_cents = $5
		WHERE
			id = $6
			AND user_id = $7::uuid;
		`,
		status,
		note,
		followUpAt,
		input.Archived,
		input.QuoteAmountCents,
		leadID,
		user.ID,
	)

	if err != nil {
		log.Println(
			"Erreur mise à jour prospect :",
			err,
		)

		http.Error(
			w,
			"Impossible de modifier le prospect",
			http.StatusInternalServerError,
		)
		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Prospect introuvable",
			http.StatusNotFound,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"success":          true,
			"status":           status,
			"note":             note,
			"followUpAt":       followUpAt,
			"archived":         input.Archived,
			"quoteAmountCents": input.QuoteAmountCents,
		},
	)
}

func syncNotificationEmail(
	ctx context.Context,
	userID string,
	email string,
) error {
	email = strings.TrimSpace(email)

	if userID == "" || email == "" {
		return nil
	}

	_, err := db.Exec(
		ctx,
		`UPDATE sites
		 SET notification_email = $1
		 WHERE user_id = $2::uuid
		   AND notification_email IS DISTINCT FROM $1`,
		email,
		userID,
	)

	return err
}

func leadEmailStatus() string {
	if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return "désactivées (RESEND_API_KEY absente)"
	}

	return "activées"
}

func sendLeadNotificationEmail(
	ctx context.Context,
	leadID int64,
	toEmail string,
	businessName string,
	input LeadInput,
) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return errors.New("RESEND_API_KEY absente")
	}

	toEmail = strings.TrimSpace(toEmail)
	if toEmail == "" {
		return errors.New("email destinataire absent")
	}

	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = "Lumio <onboarding@resend.dev>"
	}

	appURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SITEAI_APP_URL")), "/")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	safeBusinessName := html.EscapeString(businessName)
	safeName := html.EscapeString(input.Name)
	safeEmail := html.EscapeString(input.Email)
	safePhone := html.EscapeString(input.Phone)
	safeMessage := html.EscapeString(input.Message)

	if safeEmail == "" {
		safeEmail = "Non renseigné"
	}
	if safePhone == "" {
		safePhone = "Non renseigné"
	}

	messageHTML := strings.ReplaceAll(safeMessage, "\n", "<br>")
	prospectsURL := appURL + "/prospects"

	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <div style="background:#0f172a;border-radius:20px;padding:28px;color:#ffffff;">
      <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa;">Lumio</div>
      <h1 style="margin:10px 0 0;font-size:26px;">Nouveau prospect reçu</h1>
      <p style="margin:10px 0 0;color:#cbd5e1;line-height:1.6;">Une nouvelle demande a été envoyée depuis le site de %s.</p>
    </div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
      <p style="margin:0 0 18px;"><strong>Nom :</strong> %s</p>
      <p style="margin:0 0 18px;"><strong>Email :</strong> %s</p>
      <p style="margin:0 0 18px;"><strong>Téléphone :</strong> %s</p>
      <p style="margin:24px 0 8px;font-weight:700;">Message</p>
      <div style="padding:16px;background:#f8fafc;border-radius:12px;line-height:1.7;">%s</div>
      <a href="%s" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">Ouvrir mes prospects</a>
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#64748b;">Notification automatique Lumio</p>
  </div>
</body>
</html>`,
		safeBusinessName,
		safeName,
		safeEmail,
		safePhone,
		messageHTML,
		html.EscapeString(prospectsURL),
	)

	payload := map[string]any{
		"from":    fromEmail,
		"to":      []string{toEmail},
		"subject": fmt.Sprintf("[Lumio] Nouveau prospect pour %s", businessName),
		"html":    htmlBody,
	}

	// Permet au propriétaire du site de répondre directement au visiteur,
	// même si la notification est envoyée depuis l'adresse commune de Lumio.
	if input.Email != "" {
		payload["reply_to"] = input.Email
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.resend.com/emails",
		bytes.NewReader(payloadJSON),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", fmt.Sprintf("siteai-lead-%d", leadID))

	client := &http.Client{Timeout: 12 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 8*1024))
		return fmt.Errorf("Resend HTTP %d : %s", response.StatusCode, strings.TrimSpace(string(body)))
	}

	_, err = db.Exec(
		ctx,
		`UPDATE leads
		 SET notification_sent_at = NOW()
		 WHERE id = $1`,
		leadID,
	)
	return err
}

// getClientIP returns the visitor IP used by the lead rate limit.
//
// Lead forms reach the backend through the Next proxy (/api-backend), so the
// connecting IP is Vercel's: the proxy forwards the visitor IP in
// X-Lumio-Client-IP, trusted only with the LUMIO_PROXY_SECRET shared with
// Vercel. Otherwise the last X-Forwarded-For entry, added by Railway's edge,
// is the connecting IP; earlier entries can be forged by the client.
func getClientIP(r *http.Request) string {
	secret := strings.TrimSpace(os.Getenv("LUMIO_PROXY_SECRET"))
	if secret != "" && hmac.Equal([]byte(r.Header.Get("X-Lumio-Proxy-Secret")), []byte(secret)) {
		if ip := strings.TrimSpace(r.Header.Get("X-Lumio-Client-IP")); net.ParseIP(ip) != nil {
			return ip
		}
	}

	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
			return ip
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && strings.TrimSpace(host) != "" {
		return strings.TrimSpace(host)
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func allowLeadSubmission(
	ip string,
	publicSlug string,
) (bool, time.Duration) {
	now := time.Now()

	ip = strings.TrimSpace(ip)
	publicSlug = strings.TrimSpace(
		publicSlug,
	)

	if ip == "" {
		ip = "unknown"
	}

	key := ip + "|" + publicSlug

	leadRateLimiter.Lock()
	defer leadRateLimiter.Unlock()

	if len(
		leadRateLimiter.Entries,
	) > 2000 {
		for entryKey, entry := range leadRateLimiter.Entries {
			if now.After(
				entry.ResetAt,
			) {
				delete(
					leadRateLimiter.Entries,
					entryKey,
				)
			}
		}
	}

	entry, exists :=
		leadRateLimiter.Entries[key]

	if !exists ||
		now.After(entry.ResetAt) {
		leadRateLimiter.Entries[key] =
			leadRateEntry{
				Count: 1,
				ResetAt: now.Add(
					leadRateWindow,
				),
			}

		return true, 0
	}

	if entry.Count >=
		leadRateLimit {
		remaining :=
			time.Until(
				entry.ResetAt,
			)

		if remaining < 0 {
			remaining = 0
		}

		return false, remaining
	}

	entry.Count++

	leadRateLimiter.Entries[key] =
		entry

	return true, 0
}

func createLeadHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		64*1024,
	)

	var input LeadInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"Formulaire invalide",
			http.StatusBadRequest,
		)
		return
	}

	input.PublicSlug = strings.TrimSpace(input.PublicSlug)
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Message = strings.TrimSpace(input.Message)
	input.Website = strings.TrimSpace(input.Website)

	// Honeypot : un vrai visiteur ne remplit jamais ce champ.
	if input.Website != "" {
		writeJSON(
			w,
			http.StatusCreated,
			map[string]any{
				"success": true,
				"message": "Votre demande a bien été envoyée.",
			},
		)
		return
	}

	if input.PublicSlug == "" ||
		len(input.PublicSlug) > 200 {
		http.Error(
			w,
			"Site invalide",
			http.StatusBadRequest,
		)
		return
	}

	if len(input.Name) < 2 ||
		len(input.Name) > 100 {
		http.Error(
			w,
			"Nom invalide",
			http.StatusBadRequest,
		)
		return
	}

	if input.Email == "" && input.Phone == "" {
		http.Error(
			w,
			"Email ou téléphone obligatoire",
			http.StatusBadRequest,
		)
		return
	}

	if input.Email != "" {
		if len(input.Email) > 254 {
			http.Error(
				w,
				"Email invalide",
				http.StatusBadRequest,
			)
			return
		}

		emailPattern := regexp.MustCompile(
			`^[^@\s]+@[^@\s]+\.[^@\s]+$`,
		)

		if !emailPattern.MatchString(input.Email) {
			http.Error(
				w,
				"Email invalide",
				http.StatusBadRequest,
			)
			return
		}
	}

	if len(input.Phone) > 40 {
		http.Error(
			w,
			"Téléphone invalide",
			http.StatusBadRequest,
		)
		return
	}

	if len(input.Message) < 10 ||
		len(input.Message) > 3000 {
		http.Error(
			w,
			"Le message doit contenir entre 10 et 3000 caractères",
			http.StatusBadRequest,
		)
		return
	}

	if !input.Consent {
		http.Error(
			w,
			"Le consentement est obligatoire",
			http.StatusBadRequest,
		)
		return
	}

	clientIP := getClientIP(r)

	allowed, retryAfter :=
		allowLeadSubmission(
			clientIP,
			input.PublicSlug,
		)

	if !allowed {
		retrySeconds :=
			int(
				retryAfter.Seconds(),
			)

		if retrySeconds < 1 {
			retrySeconds = 1
		}

		w.Header().Set(
			"Retry-After",
			strconv.Itoa(
				retrySeconds,
			),
		)

		http.Error(
			w,
			"Trop de demandes envoyées. Réessayez dans quelques minutes.",
			http.StatusTooManyRequests,
		)
		return
	}

	var siteID int64
	var ownerUserID string
	var businessName string
	var notificationEmail string

	err := db.QueryRow(
		r.Context(),
		`
		SELECT
			id,
			user_id::text,
			business_name,
			COALESCE(notification_email, '')
		FROM sites
		WHERE
			public_slug = $1
			AND published = TRUE
		LIMIT 1;
		`,
		input.PublicSlug,
	).Scan(
		&siteID,
		&ownerUserID,
		&businessName,
		&notificationEmail,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(
				w,
				"Site introuvable ou non publié",
				http.StatusNotFound,
			)
			return
		}

		log.Println("Erreur recherche site pour prospect :", err)

		http.Error(
			w,
			"Erreur serveur",
			http.StatusInternalServerError,
		)
		return
	}

	var leadID int64

	err = db.QueryRow(
		r.Context(),
		`
		INSERT INTO leads (
			site_id,
			user_id,
			public_slug,
			name,
			email,
			phone,
			message,
			status,
			consent_at,
			created_at
		)
		VALUES (
			$1,
			$2::uuid,
			$3,
			$4,
			$5,
			$6,
			$7,
			'new',
			NOW(),
			NOW()
		)
		RETURNING id;
		`,
		siteID,
		ownerUserID,
		input.PublicSlug,
		input.Name,
		input.Email,
		input.Phone,
		input.Message,
	).Scan(&leadID)

	if err != nil {
		log.Println("Erreur enregistrement prospect :", err)

		http.Error(
			w,
			"Impossible d'enregistrer la demande",
			http.StatusInternalServerError,
		)
		return
	}

	if strings.TrimSpace(notificationEmail) != "" && strings.TrimSpace(os.Getenv("RESEND_API_KEY")) != "" {
		go func(leadID int64, toEmail string, businessName string, leadInput LeadInput) {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()

			if err := sendLeadNotificationEmail(
				ctx,
				leadID,
				toEmail,
				businessName,
				leadInput,
			); err != nil {
				log.Println("Notification prospect non envoyée :", err)
			}
		}(leadID, notificationEmail, businessName, input)
	}

	writeJSON(
		w,
		http.StatusCreated,
		map[string]any{
			"success": true,
			"message": "Votre demande a bien été envoyée.",
		},
	)
}

func listLeadsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	includeArchived := strings.EqualFold(
		strings.TrimSpace(
			r.URL.Query().Get("includeArchived"),
		),
		"true",
	)

	rows, err := db.Query(
		r.Context(),
		`
		SELECT
			l.id,
			l.site_id,
			l.public_slug,
			s.business_name,
			l.name,
			l.email,
			l.phone,
			l.message,
			l.status,
			COALESCE(l.note, ''),
			l.follow_up_at,
			COALESCE(l.archived, FALSE),
			COALESCE(l.quote_amount_cents, 0),
			l.created_at
		FROM leads l
		INNER JOIN sites s
			ON s.id = l.site_id
		WHERE
			l.user_id = $1::uuid
			AND ($2::boolean = TRUE OR l.archived = FALSE)
		ORDER BY l.created_at DESC
		LIMIT 500;
		`,
		user.ID,
		includeArchived,
	)

	if err != nil {
		log.Println("Erreur liste prospects :", err)

		http.Error(
			w,
			"Impossible de charger les prospects",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	leads := make([]Lead, 0)

	for rows.Next() {
		var lead Lead

		err = rows.Scan(
			&lead.ID,
			&lead.SiteID,
			&lead.PublicSlug,
			&lead.BusinessName,
			&lead.Name,
			&lead.Email,
			&lead.Phone,
			&lead.Message,
			&lead.Status,
			&lead.Note,
			&lead.FollowUpAt,
			&lead.Archived,
			&lead.QuoteAmountCents,
			&lead.CreatedAt,
		)

		if err != nil {
			log.Println("Erreur lecture prospect :", err)

			http.Error(
				w,
				"Impossible de charger les prospects",
				http.StatusInternalServerError,
			)
			return
		}

		leads = append(leads, lead)
	}

	if err = rows.Err(); err != nil {
		log.Println("Erreur parcours prospects :", err)

		http.Error(
			w,
			"Impossible de charger les prospects",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		leads,
	)
}
