package main

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Printable A5 poster ("affichette") for a published site: business name,
// trade, a call to action, a large QR code to the site and the phone number.
// The PDF is written by hand, like the quotes in quotes.go.

const (
	lumioPublicBaseURL = "https://lumio.business"
	posterUTMSource    = "affichette"
	posterPageWidth    = 420.0 // A5 portrait, in PostScript points
	posterPageHeight   = 595.0
	posterTagline      = "Demandez votre devis en ligne"
)

var errSiteNotPublished = errors.New("site non publié")

type posterDocument struct {
	BusinessName string
	Activity     string
	Phone        string
	DesignStyle  string
	AccentColor  string
	TargetURL    string // URL encoded in the QR code, with the UTM source
	DisplayURL   string // short URL printed under the QR code
	PublicSlug   string
}

const sitePosterQuery = `
SELECT published, COALESCE(public_slug, ''), published_snapshot,
       COALESCE(custom_domain, ''), custom_domain_verified,
       business_name, activity, phone, design_style, accent_color
FROM sites
WHERE id = $1 AND user_id = $2::uuid;
`

func sitePosterHandler(w http.ResponseWriter, r *http.Request, siteID int64, userID string) {
	document, err := loadPosterDocument(r, siteID, userID)
	if err != nil {
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			http.Error(w, "Site introuvable", http.StatusNotFound)
		case errors.Is(err, errSiteNotPublished):
			http.Error(w, "Publie ton site pour télécharger son affichette", http.StatusConflict)
		default:
			log.Println("Erreur chargement affichette :", err)
			http.Error(w, "Impossible de préparer l'affichette", http.StatusInternalServerError)
		}
		return
	}

	pdf, err := generatePosterPDF(document)
	if err != nil {
		log.Println("Erreur génération affichette :", err)
		http.Error(w, "Impossible de générer l'affichette", http.StatusUnprocessableEntity)
		return
	}

	filename := "affichette-" + safeQuoteFilename(document.PublicSlug) + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", strconv.Itoa(len(pdf)))
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdf)
}

func loadPosterDocument(r *http.Request, siteID int64, userID string) (posterDocument, error) {
	var (
		published, domainVerified                          bool
		publicSlug, customDomain                           string
		snapshot                                           []byte
		businessName, activity, phone, designStyle, accent string
	)
	err := db.QueryRow(r.Context(), sitePosterQuery, siteID, userID).Scan(
		&published, &publicSlug, &snapshot, &customDomain, &domainVerified,
		&businessName, &activity, &phone, &designStyle, &accent,
	)
	if err != nil {
		return posterDocument{}, err
	}
	if !published || strings.TrimSpace(publicSlug) == "" {
		return posterDocument{}, errSiteNotPublished
	}

	// Prefer what visitors actually see: the published snapshot.
	if publicSite, err := decodePublishedSite(snapshot, publicSlug, nil); err == nil {
		businessName = firstNonEmpty(publicSite.BusinessName, businessName)
		activity = firstNonEmpty(publicSite.Activity, activity)
		phone = firstNonEmpty(publicSite.Phone, phone)
		designStyle = firstNonEmpty(publicSite.DesignStyle, designStyle)
		accent = firstNonEmpty(publicSite.AccentColor, accent)
	}

	targetURL, displayURL := posterSiteURL(publicSlug, customDomain, domainVerified)
	return posterDocument{
		BusinessName: strings.TrimSpace(businessName),
		Activity:     strings.TrimSpace(activity),
		Phone:        strings.TrimSpace(phone),
		DesignStyle:  normalizeDesignStyle(designStyle),
		AccentColor:  normalizeAccentColor(accent, "#2563eb"),
		TargetURL:    targetURL,
		DisplayURL:   displayURL,
		PublicSlug:   publicSlug,
	}, nil
}

// posterSiteURL returns the address encoded in the QR code (custom domain when
// it is connected and verified, Lumio URL otherwise) and its printable form.
func posterSiteURL(publicSlug, customDomain string, domainVerified bool) (string, string) {
	domain := strings.ToLower(strings.TrimSpace(customDomain))
	domain = strings.TrimPrefix(strings.TrimPrefix(domain, "https://"), "http://")
	domain = strings.TrimRight(domain, "/")
	query := "?utm_source=" + posterUTMSource
	if domainVerified && domain != "" && !strings.ContainsAny(domain, "/?#@ ") {
		return "https://" + domain + "/" + query, domain
	}
	path := "/site/" + url.PathEscape(publicSlug)
	return lumioPublicBaseURL + path + query, strings.TrimPrefix(lumioPublicBaseURL, "https://") + path
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

type pdfColor struct{ R, G, B float64 }

func parseHexColor(value string, fallback pdfColor) pdfColor {
	value = strings.TrimPrefix(strings.TrimSpace(value), "#")
	if len(value) != 6 {
		return fallback
	}
	parsed, err := strconv.ParseUint(value, 16, 32)
	if err != nil {
		return fallback
	}
	return pdfColor{float64(parsed>>16&0xFF) / 255, float64(parsed>>8&0xFF) / 255, float64(parsed&0xFF) / 255}
}

func (c pdfColor) luminance() float64 {
	channel := func(v float64) float64 {
		if v <= 0.03928 {
			return v / 12.92
		}
		return math.Pow((v+0.055)/1.055, 2.4)
	}
	return 0.2126*channel(c.R) + 0.7152*channel(c.G) + 0.0722*channel(c.B)
}

func (c pdfColor) fill() string   { return fmt.Sprintf("%.3f %.3f %.3f rg", c.R, c.G, c.B) }
func (c pdfColor) stroke() string { return fmt.Sprintf("%.3f %.3f %.3f RG", c.R, c.G, c.B) }

type posterTheme struct {
	surface, ink, muted pdfColor
	regular, bold       string // PDF base fonts
	band                bool   // coloured header band
	frame               string // "", "double" or "dashed"
}

func posterThemeFor(style string) posterTheme {
	switch style {
	case "elegant":
		return posterTheme{
			surface: parseHexColor("#fafaf9", pdfColor{}), ink: parseHexColor("#171717", pdfColor{}), muted: parseHexColor("#57534e", pdfColor{}),
			regular: "Times-Roman", bold: "Times-Bold", frame: "double",
		}
	case "artisan":
		return posterTheme{
			surface: parseHexColor("#fbf7f0", pdfColor{}), ink: parseHexColor("#292524", pdfColor{}), muted: parseHexColor("#57534e", pdfColor{}),
			regular: "Helvetica", bold: "Helvetica-Bold", band: true, frame: "dashed",
		}
	default:
		return posterTheme{
			surface: parseHexColor("#f8fafc", pdfColor{}), ink: parseHexColor("#0f172a", pdfColor{}), muted: parseHexColor("#475569", pdfColor{}),
			regular: "Helvetica", bold: "Helvetica-Bold", band: true,
		}
	}
}

type posterCanvas struct {
	content bytes.Buffer
	theme   posterTheme
}

// text draws a single line; align is "left", "center" or "right" (x is the anchor).
func (p *posterCanvas) text(value string, bold bool, size, x, y float64, color pdfColor, align string) {
	font, name := "F1", p.theme.regular
	if bold {
		font, name = "F2", p.theme.bold
	}
	encoded := winAnsiText(value)
	width := pdfTextWidth(encoded, name, size)
	switch align {
	case "center":
		x -= width / 2
	case "right":
		x -= width
	}
	fmt.Fprintf(&p.content, "%s BT /%s %.1f Tf %.2f %.2f Td (%s) Tj ET\n", color.fill(), font, size, x, y, pdfEscape(encoded))
}

func (p *posterCanvas) width(value string, bold bool, size float64) float64 {
	name := p.theme.regular
	if bold {
		name = p.theme.bold
	}
	return pdfTextWidth(winAnsiText(value), name, size)
}

func (p *posterCanvas) rect(x, y, w, h float64, color pdfColor) {
	fmt.Fprintf(&p.content, "%s %.2f %.2f %.2f %.2f re f\n", color.fill(), x, y, w, h)
}

// fitText returns the font size (and lines) needed to fit value in maxWidth,
// shrinking from maxSize to minSize, then wrapping on two lines.
func (p *posterCanvas) fitText(value string, bold bool, maxSize, minSize, maxWidth float64) (float64, []string) {
	for size := maxSize; size >= minSize; size -= 1 {
		if p.width(value, bold, size) <= maxWidth {
			return size, []string{value}
		}
	}
	words := strings.Fields(value)
	for size := maxSize; size >= minSize; size -= 1 {
		for split := len(words) - 1; split >= 1; split-- {
			first, second := strings.Join(words[:split], " "), strings.Join(words[split:], " ")
			if p.width(first, bold, size) <= maxWidth && p.width(second, bold, size) <= maxWidth {
				return size, []string{first, second}
			}
		}
	}
	// Very long single word: truncate.
	runes := []rune(value)
	for len(runes) > 1 && p.width(string(runes)+"…", bold, minSize) > maxWidth {
		runes = runes[:len(runes)-1]
	}
	return minSize, []string{string(runes) + "…"}
}

func generatePosterPDF(document posterDocument) ([]byte, error) {
	qr, err := encodeQR([]byte(document.TargetURL))
	if err != nil {
		return nil, err
	}

	theme := posterThemeFor(document.DesignStyle)
	accent := parseHexColor(document.AccentColor, parseHexColor("#2563eb", pdfColor{}))
	white := pdfColor{1, 1, 1}
	onAccent := white
	if accent.luminance() > 0.45 {
		onAccent = theme.ink
	}
	// QR modules in the brand colour only when it stays dark enough to scan.
	qrColor := theme.ink
	if accent.luminance() <= 0.18 {
		qrColor = accent
	}

	p := &posterCanvas{theme: theme}
	center := posterPageWidth / 2
	p.rect(0, 0, posterPageWidth, posterPageHeight, theme.surface)

	// Header: business name and trade.
	nameColor, activityColor := theme.ink, accent
	headerTop := 528.0
	if theme.band {
		p.rect(0, 455, posterPageWidth, 140, accent)
		nameColor, activityColor = onAccent, onAccent
		headerTop = 540
	}
	size, lines := p.fitText(document.BusinessName, true, 30, 18, posterPageWidth-60)
	y := headerTop
	if len(lines) == 2 {
		y += size * 0.55
	}
	for _, line := range lines {
		p.text(line, true, size, center, y, nameColor, "center")
		y -= size * 1.12
	}
	if document.Activity != "" {
		activitySize, activityLines := p.fitText(document.Activity, false, 14, 10, posterPageWidth-80)
		p.text(activityLines[0], false, activitySize, center, y-4, activityColor, "center")
	}
	if !theme.band {
		p.rect(center-30, 468, 60, 1.5, accent)
	}

	// Call to action.
	p.text(posterTagline, true, 21, center, 414, theme.ink, "center")
	p.text("Scannez le QR code avec l’appareil photo de votre téléphone", false, 10, center, 395, theme.muted, "center")

	// QR code on a white panel with a coloured outline.
	const panelSize, qrSize = 220.0, 180.0
	panelX, panelY := center-panelSize/2, 150.0
	p.rect(panelX-2, panelY-2, panelSize+4, panelSize+4, accent)
	p.rect(panelX, panelY, panelSize, panelSize, white)
	module := qrSize / float64(qr.Size)
	qrX := panelX + (panelSize-qrSize)/2
	qrY := panelY + (panelSize-qrSize)/2
	fmt.Fprintf(&p.content, "%s\n", qrColor.fill())
	for row := 0; row < qr.Size; row++ {
		for col := 0; col < qr.Size; {
			if !qr.Modules[row][col] {
				col++
				continue
			}
			start := col
			for col < qr.Size && qr.Modules[row][col] {
				col++
			}
			// Slight overlap avoids hairline gaps between modules in some viewers.
			fmt.Fprintf(&p.content, "%.3f %.3f %.3f %.3f re\n", qrX+float64(start)*module, qrY+float64(qr.Size-1-row)*module, float64(col-start)*module+0.05, module+0.05)
		}
	}
	p.content.WriteString("f\n")

	urlSize, urlLines := p.fitText(document.DisplayURL, false, 11, 7, posterPageWidth-60)
	p.text(urlLines[0], false, urlSize, center, 128, theme.muted, "center")

	// Phone number.
	if document.Phone != "" {
		label := "Tél. "
		labelWidth := p.width(label, false, 14)
		phoneWidth := p.width(document.Phone, true, 22)
		start := center - (labelWidth+phoneWidth)/2
		p.text(label, false, 14, start, 86, theme.muted, "left")
		p.text(document.Phone, true, 22, start+labelWidth, 86, theme.ink, "left")
	}

	// Frame and footer.
	switch theme.frame {
	case "double":
		fmt.Fprintf(&p.content, "%s 1 w 16 16 %.1f %.1f re S 0.5 w 21 21 %.1f %.1f re S\n", accent.stroke(), posterPageWidth-32, posterPageHeight-32, posterPageWidth-42, posterPageHeight-42)
	case "dashed":
		fmt.Fprintf(&p.content, "%s 1.2 w [6 4] 0 d 14 14 %.1f %.1f re S [] 0 d\n", accent.stroke(), posterPageWidth-28, posterPageHeight-28)
	}
	p.text("Site créé avec Lumio", false, 7.5, center, 30, theme.muted, "center")

	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
		fmt.Sprintf("<< /Type /Font /Subtype /Type1 /BaseFont /%s /Encoding /WinAnsiEncoding >>", theme.regular),
		fmt.Sprintf("<< /Type /Font /Subtype /Type1 /BaseFont /%s /Encoding /WinAnsiEncoding >>", theme.bold),
		fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.0f %.0f] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>", posterPageWidth, posterPageHeight),
		fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", p.content.Len(), p.content.String()),
	}
	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
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
	return pdf.Bytes(), nil
}

// winAnsiText converts UTF-8 text to WinAnsiEncoding bytes so French accents
// render with the standard PDF fonts. Unsupported characters become '?'.
func winAnsiText(value string) string {
	special := map[rune]byte{
		'€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, 'Œ': 0x8C, '‘': 0x91, '’': 0x92,
		'“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, 'œ': 0x9C, 'Ÿ': 0x9F,
		' ': ' ', ' ': ' ',
	}
	out := make([]byte, 0, len(value))
	for _, r := range value {
		switch {
		case r == '\n' || r == '\r' || r == '\t':
			out = append(out, ' ')
		case r >= 32 && r <= 126:
			out = append(out, byte(r))
		case special[r] != 0:
			out = append(out, special[r])
		case r >= 0xA0 && r <= 0xFF:
			out = append(out, byte(r))
		default:
			out = append(out, '?')
		}
	}
	return string(out)
}

// pdfTextWidth measures WinAnsi text with the standard font metrics (AFM).
// Accented letters use the width of their base letter.
func pdfTextWidth(encoded, font string, size float64) float64 {
	widths := pdfFontWidths[font]
	if widths == nil {
		widths = pdfFontWidths["Helvetica"]
	}
	total := 0
	for i := 0; i < len(encoded); i++ {
		c := encoded[i]
		if c >= 0x80 {
			c = winAnsiBaseLetter(c)
		}
		if c >= 32 && c <= 126 {
			total += widths[c-32]
		} else {
			total += widths['o'-32]
		}
	}
	return float64(total) * size / 1000
}

func winAnsiBaseLetter(c byte) byte {
	switch {
	case c >= 0xC0 && c <= 0xC5:
		return 'A'
	case c == 0xC7:
		return 'C'
	case c >= 0xC8 && c <= 0xCB:
		return 'E'
	case c >= 0xCC && c <= 0xCF:
		return 'I'
	case c >= 0xD2 && c <= 0xD6:
		return 'O'
	case c >= 0xD9 && c <= 0xDC:
		return 'U'
	case c >= 0xE0 && c <= 0xE5:
		return 'a'
	case c == 0xE7:
		return 'c'
	case c >= 0xE8 && c <= 0xEB:
		return 'e'
	case c >= 0xEC && c <= 0xEF:
		return 'i'
	case c >= 0xF2 && c <= 0xF6:
		return 'o'
	case c >= 0xF9 && c <= 0xFC:
		return 'u'
	case c == 0x92 || c == 0x91:
		return '\''
	case c == 0x96:
		return '-'
	case c == 0x97 || c == 0x9C || c == 0x8C || c == 0x80 || c == 0x85:
		return 'M'
	case c == 0xAB || c == 0xBB:
		return '<'
	}
	return 'o'
}

// Advance widths for characters 32..126 (Adobe standard 14 fonts metrics).
var pdfFontWidths = map[string][]int{
	"Helvetica": {
		278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
		556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
		1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
		667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
		333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
		556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
	},
	"Helvetica-Bold": {
		278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
		556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
		975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
		667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
		333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
		611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
	},
	"Times-Roman": {
		250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
		500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
		921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
		556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
		333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
		500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541,
	},
	"Times-Bold": {
		250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278,
		500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500,
		930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778,
		611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500,
		333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500,
		556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520,
	},
}

// normalizeUTMSource keeps a short, lowercase campaign name sent by the public
// site tracker; anything unexpected is stored as an empty source.
func normalizeUTMSource(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" || len(value) > 40 {
		return ""
	}
	for _, r := range value {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return ""
		}
	}
	return value
}
