package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// Free accounts can create and edit a site, but publishing requires a
// subscription. These emails remind owners who created a site and never
// published it, then stop as soon as they subscribe, publish or unsubscribe.
// Tables: migrations/20261031_lifecycle_emails.sql.

const (
	lifecycleEmailInterval  = 30 * time.Minute
	lifecycleEmailBatchSize = 200
	lifecycleSupportEmail   = "support@lumio.business"
)

// lifecycleStep is sent once when the first site of the account is between
// After and Before old. The upper bound keeps old accounts from receiving the
// whole sequence at once when the feature is deployed.
type lifecycleStep struct {
	Kind   string
	After  time.Duration
	Before time.Duration
}

var lifecycleSteps = []lifecycleStep{
	{Kind: "bienvenue", After: time.Hour, Before: 3 * 24 * time.Hour},
	{Kind: "publier", After: 3 * 24 * time.Hour, Before: 10 * 24 * time.Hour},
	{Kind: "dernier_rappel", After: 10 * 24 * time.Hour, Before: 30 * 24 * time.Hour},
}

// nextLifecycleStep returns the step matching the account age, unless it or
// a later step has already been sent.
func nextLifecycleStep(age time.Duration, sent []string) (lifecycleStep, bool) {
	for index, step := range lifecycleSteps {
		if age < step.After || age >= step.Before {
			continue
		}

		for _, later := range lifecycleSteps[index:] {
			for _, kind := range sent {
				if kind == later.Kind {
					return lifecycleStep{}, false
				}
			}
		}

		return step, true
	}

	return lifecycleStep{}, false
}

type lifecycleRecipient struct {
	UserID       string
	Email        string
	BusinessName string
	Age          time.Duration
	Sent         []string
}

type lifecycleMessage struct {
	To             string
	Subject        string
	HTML           string
	UnsubscribeURL string
	IdempotencyKey string
}

// sendLifecycleMessage is replaced in tests.
var sendLifecycleMessage = sendLifecycleMessageWithResend

func startLifecycleEmails() {
	if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return
	}

	go func() {
		time.Sleep(time.Minute)

		for {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			sent, err := runLifecycleEmails(ctx, time.Now())
			cancel()

			if err != nil {
				log.Println("Emails de relance impossibles :", err)
			} else if sent > 0 {
				log.Printf("Emails de relance envoyés : %d", sent)
			}

			time.Sleep(lifecycleEmailInterval)
		}
	}()
}

func lifecycleEmailStatus() string {
	if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return "désactivées (RESEND_API_KEY absente)"
	}

	return "activées"
}

func runLifecycleEmails(ctx context.Context, now time.Time) (int, error) {
	recipients, err := lifecycleRecipients(ctx, now)
	if err != nil {
		return 0, err
	}

	sent := 0
	for _, recipient := range recipients {
		step, ok := nextLifecycleStep(recipient.Age, recipient.Sent)
		if !ok {
			continue
		}

		delivered, err := deliverLifecycleEmail(ctx, recipient, step)
		if err != nil {
			log.Printf("Email de relance %s impossible pour %s : %v", step.Kind, recipient.UserID, err)
			continue
		}
		if delivered {
			sent++
		}
	}

	return sent, nil
}

func lifecycleRecipients(ctx context.Context, now time.Time) ([]lifecycleRecipient, error) {
	oldest := now.Add(-lifecycleSteps[len(lifecycleSteps)-1].Before)
	newest := now.Add(-lifecycleSteps[0].After)

	rows, err := db.Query(
		ctx,
		`SELECT s.user_id::text,
		        MIN(s.created_at),
		        (ARRAY_AGG(s.notification_email ORDER BY s.updated_at DESC)
		            FILTER (WHERE s.notification_email <> ''))[1],
		        (ARRAY_AGG(s.business_name ORDER BY s.created_at DESC))[1],
		        ARRAY(SELECT e.kind FROM lifecycle_emails e WHERE e.user_id = s.user_id)
		 FROM sites s
		 WHERE s.user_id IS NOT NULL
		 GROUP BY s.user_id
		 HAVING NOT BOOL_OR(s.published)
		    AND MIN(s.created_at) > $1
		    AND MIN(s.created_at) <= $2
		    AND NOT EXISTS (
		        SELECT 1 FROM user_billing b
		        WHERE b.user_id = s.user_id
		          AND LOWER(COALESCE(b.subscription_status, '')) IN ('active', 'trialing'))
		    AND NOT EXISTS (
		        SELECT 1 FROM email_preferences p
		        WHERE p.user_id = s.user_id AND p.unsubscribed_at IS NOT NULL)
		 ORDER BY MIN(s.created_at)
		 LIMIT $3`,
		oldest,
		newest,
		lifecycleEmailBatchSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipients []lifecycleRecipient
	for rows.Next() {
		var recipient lifecycleRecipient
		var createdAt time.Time
		var email *string

		if err := rows.Scan(&recipient.UserID, &createdAt, &email, &recipient.BusinessName, &recipient.Sent); err != nil {
			return nil, err
		}
		if email == nil || strings.TrimSpace(*email) == "" {
			continue
		}

		recipient.Email = strings.TrimSpace(*email)
		recipient.Age = now.Sub(createdAt)
		recipients = append(recipients, recipient)
	}

	return recipients, rows.Err()
}

// deliverLifecycleEmail claims the (user, kind) row before sending, so two
// backend instances never send the same email. The claim is released when
// the send fails, and retried on the next run.
func deliverLifecycleEmail(ctx context.Context, recipient lifecycleRecipient, step lifecycleStep) (bool, error) {
	tag, err := db.Exec(
		ctx,
		`INSERT INTO lifecycle_emails (user_id, kind)
		 VALUES ($1::uuid, $2)
		 ON CONFLICT DO NOTHING`,
		recipient.UserID,
		step.Kind,
	)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() == 0 {
		return false, nil
	}

	var token string
	err = db.QueryRow(
		ctx,
		`INSERT INTO email_preferences (user_id)
		 VALUES ($1::uuid)
		 ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		 RETURNING unsubscribe_token::text`,
		recipient.UserID,
	).Scan(&token)

	if err == nil {
		err = sendLifecycleMessage(ctx, buildLifecycleMessage(recipient, step, frontendURL(), token))
	}

	if err != nil {
		if _, releaseErr := db.Exec(
			ctx,
			`DELETE FROM lifecycle_emails WHERE user_id = $1::uuid AND kind = $2`,
			recipient.UserID,
			step.Kind,
		); releaseErr != nil {
			log.Println("Libération de l'email de relance impossible :", releaseErr)
		}
		return false, err
	}

	return true, nil
}

func buildLifecycleMessage(recipient lifecycleRecipient, step lifecycleStep, appURL, token string) lifecycleMessage {
	businessName := strings.TrimSpace(recipient.BusinessName)
	if businessName == "" {
		businessName = "ton entreprise"
	}

	unsubscribeURL := appURL + "/api-backend/emails/unsubscribe?token=" + url.QueryEscape(token)

	var subject, title, buttonLabel, buttonURL string
	var paragraphs []string

	switch step.Kind {
	case "bienvenue":
		subject = fmt.Sprintf("Ton site %s est prêt", businessName)
		title = "Ton site est prêt"
		paragraphs = []string{
			fmt.Sprintf("Bienvenue sur Lumio ! Le site de %s a bien été créé.", businessName),
			"Tu peux encore tout ajuster : textes, photos, couleurs, ou demander une modification à l'assistant IA.",
			"Quand il te plaît, publie-le : il sera en ligne, visible sur Google, et les demandes de contact et de devis arriveront dans ton espace Prospects.",
		}
		buttonLabel = "Reprendre mon site"
		buttonURL = appURL + "/sites"
	case "publier":
		subject = fmt.Sprintf("%s n'est pas encore en ligne", businessName)
		title = "Ton site attend d'être publié"
		paragraphs = []string{
			fmt.Sprintf("Le site de %s est prêt, mais personne ne peut encore le voir.", businessName),
			"Une fois publié, tu as une adresse à partager, un site référencé sur Google, un formulaire qui t'envoie les demandes de devis, et une affichette avec QR code à imprimer pour ta vitrine ou ton véhicule.",
			"Les formules commencent à 19,90 € par mois.",
		}
		buttonLabel = "Voir les formules"
		buttonURL = appURL + "/pricing"
	default:
		subject = fmt.Sprintf("Dernier rappel pour le site de %s", businessName)
		title = "On t'aide à le mettre en ligne ?"
		paragraphs = []string{
			fmt.Sprintf("Le site de %s t'attend toujours dans ton espace Lumio.", businessName),
			"Si quelque chose te bloque, réponds simplement à cet email : on t'aide à le terminer et à le publier.",
		}
		buttonLabel = "Publier mon site"
		buttonURL = appURL + "/pricing"
	}

	var body strings.Builder
	for _, paragraph := range paragraphs {
		fmt.Fprintf(&body, `<p style="margin:0 0 16px;line-height:1.7;">%s</p>`, html.EscapeString(paragraph))
	}

	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <div style="background:#0f172a;border-radius:20px;padding:28px;color:#ffffff;">
      <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa;">Lumio</div>
      <h1 style="margin:10px 0 0;font-size:26px;">%s</h1>
    </div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
      %s
      <a href="%s" style="display:inline-block;margin-top:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">%s</a>
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#64748b;">Tu reçois cet email car tu as créé un site avec Lumio.<br><a href="%s" style="color:#64748b;">Ne plus recevoir ces rappels</a></p>
  </div>
</body>
</html>`,
		html.EscapeString(title),
		body.String(),
		html.EscapeString(buttonURL),
		html.EscapeString(buttonLabel),
		html.EscapeString(unsubscribeURL),
	)

	return lifecycleMessage{
		To:             recipient.Email,
		Subject:        subject,
		HTML:           htmlBody,
		UnsubscribeURL: unsubscribeURL,
		IdempotencyKey: fmt.Sprintf("lumio-lifecycle-%s-%s", recipient.UserID, step.Kind),
	}
}

func sendLifecycleMessageWithResend(ctx context.Context, message lifecycleMessage) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY absente")
	}

	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = "Lumio <onboarding@resend.dev>"
	}

	payload, err := json.Marshal(map[string]any{
		"from":     fromEmail,
		"to":       []string{message.To},
		"reply_to": lifecycleSupportEmail,
		"subject":  message.Subject,
		"html":     message.HTML,
		"headers": map[string]string{
			"List-Unsubscribe":      "<" + message.UnsubscribeURL + ">",
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
	})
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", message.IdempotencyKey)

	response, err := (&http.Client{Timeout: 15 * time.Second}).Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 8*1024))
		return fmt.Errorf("Resend HTTP %d : %s", response.StatusCode, strings.TrimSpace(string(body)))
	}

	return nil
}

var unsubscribeTokenPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// emailUnsubscribeHandler serves the link of the emails (GET shows a
// confirmation button, so link scanners do not unsubscribe anyone) and the
// one-click POST sent by mail clients (RFC 8058).
func emailUnsubscribeHandler(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if !unsubscribeTokenPattern.MatchString(token) {
		writeUnsubscribePage(w, http.StatusBadRequest, "Lien invalide", "Ce lien de désinscription n'est pas valide.", "")
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeUnsubscribePage(
			w,
			http.StatusOK,
			"Ne plus recevoir les rappels",
			"Tu ne recevras plus les emails de rappel de Lumio. Les notifications de prospects et de devis continueront d'arriver.",
			`<form method="post"><button type="submit" style="margin-top:8px;background:#2563eb;color:#ffffff;border:0;font-weight:700;font-size:15px;padding:13px 18px;border-radius:10px;cursor:pointer;">Confirmer</button></form>`,
		)
	case http.MethodPost:
		_, err := db.Exec(
			r.Context(),
			`UPDATE email_preferences
			 SET unsubscribed_at = COALESCE(unsubscribed_at, NOW())
			 WHERE unsubscribe_token = $1::uuid`,
			token,
		)
		if err != nil {
			log.Println("Désinscription impossible :", err)
			writeUnsubscribePage(w, http.StatusInternalServerError, "Erreur", "La désinscription n'a pas pu être enregistrée. Réessaie dans un instant.", "")
			return
		}
		writeUnsubscribePage(w, http.StatusOK, "C'est noté", "Tu ne recevras plus les emails de rappel de Lumio.", "")
	default:
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
	}
}

func writeUnsubscribePage(w http.ResponseWriter, status int, title, text, action string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Robots-Tag", "noindex")
	w.WriteHeader(status)
	fmt.Fprintf(w, `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s · Lumio</title></head>
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:48px 16px;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">Lumio</div>
      <h1 style="margin:10px 0 12px;font-size:24px;">%s</h1>
      <p style="margin:0 0 16px;line-height:1.7;">%s</p>
      %s
    </div>
  </div>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(title),
		html.EscapeString(text),
		action,
	)
}
