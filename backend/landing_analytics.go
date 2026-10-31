package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Landing audience and conversion funnel shown in /admin.
// Table: migrations/20261031_landing_events.sql.

const adminFunnelDays = 30

var landingSourcePattern = regexp.MustCompile(`^[a-z0-9._-]{1,100}$`)

type LandingEventInput struct {
	Event     string `json:"event"`
	Placement string `json:"placement"`
	Source    string `json:"source"`
}

// normalizeLandingEvent validates an event sent by decouvrir.html. The source
// is the utm_source of the page or the referrer host; anything else is
// recorded as a direct visit rather than rejected.
func normalizeLandingEvent(input LandingEventInput) (LandingEventInput, bool) {
	event := LandingEventInput{
		Event:     strings.TrimSpace(input.Event),
		Placement: strings.TrimSpace(input.Placement),
		Source:    strings.ToLower(strings.TrimSpace(input.Source)),
	}

	switch event.Event {
	case "view":
		event.Placement = ""
	case "cta_click":
		switch event.Placement {
		case "header", "hero", "pricing":
		default:
			return LandingEventInput{}, false
		}
	default:
		return LandingEventInput{}, false
	}

	if !landingSourcePattern.MatchString(event.Source) {
		event.Source = ""
	}

	return event, true
}

func landingEventHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 2*1024)

	var input LandingEventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	event, ok := normalizeLandingEvent(input)
	if !ok {
		http.Error(w, "Événement invalide", http.StatusBadRequest)
		return
	}

	if _, err := db.Exec(
		r.Context(),
		`INSERT INTO landing_events (event_type, placement, source) VALUES ($1, $2, $3)`,
		event.Event,
		event.Placement,
		event.Source,
	); err != nil {
		log.Println("Erreur enregistrement événement landing :", err)
		http.Error(w, "Impossible d'enregistrer l'événement", http.StatusInternalServerError)
		return
	}

	maybePurgeOldPageviews(r.Context(), time.Now())

	w.WriteHeader(http.StatusNoContent)
}

type AdminFunnelCount struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type AdminFunnel struct {
	Days             int                `json:"days"`
	LandingViews     int64              `json:"landingViews"`
	CTAClicks        int64              `json:"ctaClicks"`
	SignUps          int64              `json:"signUps"`
	FirstSites       int64              `json:"firstSites"`
	Publishers       int64              `json:"publishers"`
	NewSubscriptions int64              `json:"newSubscriptions"`
	ClicksByButton   []AdminFunnelCount `json:"clicksByButton"`
	ViewsBySource    []AdminFunnelCount `json:"viewsBySource"`
	ReminderEmails   []AdminFunnelCount `json:"reminderEmails"`
	// Accounts that received a reminder in the period and are subscribed now.
	RemindedSubscribers int64 `json:"remindedSubscribers"`
}

// loadAdminFunnel counts each step over the same period. Steps are not a
// cohort: someone who signed up 40 days ago and subscribed yesterday counts
// only as a new subscription.
func loadAdminFunnel(ctx context.Context, since time.Time) (AdminFunnel, error) {
	funnel := AdminFunnel{Days: adminFunnelDays}

	err := db.QueryRow(
		ctx,
		`SELECT
			(SELECT COUNT(*) FROM landing_events WHERE event_type = 'view' AND created_at >= $1),
			(SELECT COUNT(*) FROM landing_events WHERE event_type = 'cta_click' AND created_at >= $1),
			(SELECT COUNT(*) FROM auth.users WHERE created_at >= $1),
			(SELECT COUNT(*) FROM (
				SELECT user_id FROM sites WHERE user_id IS NOT NULL
				GROUP BY user_id HAVING MIN(created_at) >= $1) first_sites),
			(SELECT COUNT(DISTINCT user_id) FROM sites WHERE published_at >= $1),
			(SELECT COUNT(*) FROM stripe_webhook_events
				WHERE event_type = 'customer.subscription.created' AND processed_at >= $1),
			(SELECT COUNT(DISTINCT e.user_id) FROM lifecycle_emails e
				JOIN user_billing b ON b.user_id = e.user_id
				WHERE e.sent_at >= $1
				  AND LOWER(COALESCE(b.subscription_status, '')) IN ('active', 'trialing'))`,
		since,
	).Scan(
		&funnel.LandingViews,
		&funnel.CTAClicks,
		&funnel.SignUps,
		&funnel.FirstSites,
		&funnel.Publishers,
		&funnel.NewSubscriptions,
		&funnel.RemindedSubscribers,
	)
	if err != nil {
		return funnel, err
	}

	breakdowns := []struct {
		target *[]AdminFunnelCount
		query  string
	}{
		{&funnel.ClicksByButton, `SELECT placement, COUNT(*) FROM landing_events
			WHERE event_type = 'cta_click' AND created_at >= $1
			GROUP BY placement ORDER BY COUNT(*) DESC, placement`},
		{&funnel.ViewsBySource, `SELECT source, COUNT(*) FROM landing_events
			WHERE event_type = 'view' AND created_at >= $1
			GROUP BY source ORDER BY COUNT(*) DESC, source LIMIT 10`},
		{&funnel.ReminderEmails, `SELECT kind, COUNT(*) FROM lifecycle_emails
			WHERE sent_at >= $1
			GROUP BY kind ORDER BY MIN(sent_at), kind`},
	}

	for _, breakdown := range breakdowns {
		counts, err := queryFunnelCounts(ctx, breakdown.query, since)
		if err != nil {
			return funnel, err
		}
		*breakdown.target = counts
	}

	return funnel, nil
}

func queryFunnelCounts(ctx context.Context, query string, since time.Time) ([]AdminFunnelCount, error) {
	rows, err := db.Query(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make([]AdminFunnelCount, 0)
	for rows.Next() {
		var count AdminFunnelCount
		if err := rows.Scan(&count.Label, &count.Count); err != nil {
			return nil, err
		}
		counts = append(counts, count)
	}

	return counts, rows.Err()
}
