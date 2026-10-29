package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

// siteContactClicksSQL stores the contact intents sent by
// SiteAnalyticsTracker on published sites. Rows are purged after 25 months
// together with page views (see analytics_retention.go).
const siteContactClicksSQL = `
CREATE TABLE IF NOT EXISTS site_contact_clicks (
    id BIGSERIAL PRIMARY KEY,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    visitor_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('phone_click', 'email_click', 'form_submit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_contact_clicks_site_created
ON site_contact_clicks(site_id, created_at DESC);
`

type SiteEventInput struct {
	PublicSlug string `json:"publicSlug"`
	VisitorID  string `json:"visitorId"`
	EventType  string `json:"eventType"`
}

func isSiteContactEventType(eventType string) bool {
	switch eventType {
	case "phone_click", "email_click", "form_submit":
		return true
	default:
		return false
	}
}

func analyticsEventHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)

	var input SiteEventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	input.PublicSlug = strings.TrimSpace(input.PublicSlug)
	input.VisitorID = strings.TrimSpace(input.VisitorID)
	input.EventType = strings.TrimSpace(input.EventType)

	if input.PublicSlug == "" || len(input.PublicSlug) > 200 {
		http.Error(w, "Site invalide", http.StatusBadRequest)
		return
	}

	if input.VisitorID == "" || len(input.VisitorID) > 120 {
		http.Error(w, "Visiteur invalide", http.StatusBadRequest)
		return
	}

	if !isSiteContactEventType(input.EventType) {
		http.Error(w, "Événement invalide", http.StatusBadRequest)
		return
	}

	tag, err := db.Exec(
		r.Context(),
		`
		INSERT INTO site_contact_clicks (site_id, user_id, visitor_id, event_type)
		SELECT id, user_id, $2, $3
		FROM sites
		WHERE public_slug = $1
		  AND published = TRUE
		  AND user_id IS NOT NULL
		LIMIT 1;
		`,
		input.PublicSlug,
		input.VisitorID,
		input.EventType,
	)
	if err != nil {
		log.Println("Erreur enregistrement événement :", err)
		http.Error(w, "Impossible d'enregistrer l'événement", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		http.Error(w, "Site introuvable", http.StatusNotFound)
		return
	}

	maybePurgeOldPageviews(r.Context(), time.Now())

	writeJSON(w, http.StatusCreated, map[string]bool{"success": true})
}
