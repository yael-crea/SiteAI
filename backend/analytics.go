package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type PageViewInput struct {
	PublicSlug string `json:"publicSlug"`
	VisitorID  string `json:"visitorId"`
	UTMSource  string `json:"utmSource"`
}

type SiteAnalyticsSummary struct {
	SiteID         int64   `json:"siteId"`
	PublicSlug     string  `json:"publicSlug"`
	BusinessName   string  `json:"businessName"`
	Views30d       int64   `json:"views30d"`
	Visitors30d    int64   `json:"visitors30d"`
	Leads30d       int64   `json:"leads30d"`
	PhoneClicks30d int64   `json:"phoneClicks30d"`
	EmailClicks30d int64   `json:"emailClicks30d"`
	PosterViews30d int64   `json:"posterViews30d"`
	ConversionRate float64 `json:"conversionRate"`
}

type AnalyticsSummary struct {
	Views30d       int64                  `json:"views30d"`
	Visitors30d    int64                  `json:"visitors30d"`
	Leads30d       int64                  `json:"leads30d"`
	PhoneClicks30d int64                  `json:"phoneClicks30d"`
	EmailClicks30d int64                  `json:"emailClicks30d"`
	PosterViews30d int64                  `json:"posterViews30d"`
	ConversionRate float64                `json:"conversionRate"`
	Sites          []SiteAnalyticsSummary `json:"sites"`
}

func analyticsPageViewHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		8*1024,
	)

	var input PageViewInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"Données invalides",
			http.StatusBadRequest,
		)
		return
	}

	input.PublicSlug = strings.TrimSpace(
		input.PublicSlug,
	)

	input.VisitorID = strings.TrimSpace(
		input.VisitorID,
	)

	if input.PublicSlug == "" ||
		len(input.PublicSlug) > 200 {
		http.Error(
			w,
			"Site invalide",
			http.StatusBadRequest,
		)
		return
	}

	if input.VisitorID == "" ||
		len(input.VisitorID) > 120 {
		http.Error(
			w,
			"Visiteur invalide",
			http.StatusBadRequest,
		)
		return
	}

	var siteID int64
	var ownerUserID string

	err := db.QueryRow(
		r.Context(),
		`
		SELECT
			id,
			user_id::text
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
	)

	if err != nil {
		if errors.Is(
			err,
			pgx.ErrNoRows,
		) {
			http.Error(
				w,
				"Site introuvable",
				http.StatusNotFound,
			)
			return
		}

		log.Println(
			"Erreur analytics site :",
			err,
		)

		http.Error(
			w,
			"Erreur serveur",
			http.StatusInternalServerError,
		)
		return
	}

	_, err = db.Exec(
		r.Context(),
		`
		INSERT INTO site_pageviews (
			site_id,
			user_id,
			public_slug,
			visitor_id,
			utm_source,
			created_at
		)
		VALUES (
			$1,
			$2::uuid,
			$3,
			$4,
			$5,
			NOW()
		);
		`,
		siteID,
		ownerUserID,
		input.PublicSlug,
		input.VisitorID,
		normalizeUTMSource(input.UTMSource),
	)

	if err != nil {
		log.Println(
			"Erreur enregistrement visite :",
			err,
		)

		http.Error(
			w,
			"Impossible d'enregistrer la visite",
			http.StatusInternalServerError,
		)
		return
	}

	maybePurgeOldPageviews(r.Context(), time.Now())

	writeJSON(
		w,
		http.StatusCreated,
		map[string]bool{
			"success": true,
		},
	)
}

func analyticsSummaryHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	user, authenticated :=
		requireUser(w, r)

	if !authenticated {
		return
	}

	billing, _, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		log.Println("Erreur abonnement analytics :", err)
		http.Error(w, "Impossible de vérifier l'abonnement", http.StatusInternalServerError)
		return
	}

	if !billing.DetailedAnalytics {
		http.Error(
			w,
			"Les statistiques détaillées sont incluses dans les formules Pro et Agence.",
			http.StatusForbidden,
		)
		return
	}

	rows, err := db.Query(
		r.Context(),
		`
		SELECT
			s.id,
			COALESCE(s.public_slug, ''),
			s.business_name,
			COALESCE((
				SELECT COUNT(*)
				FROM site_pageviews v
				WHERE
					v.site_id = s.id
					AND v.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS views_30d,
			COALESCE((
				SELECT COUNT(DISTINCT v.visitor_id)
				FROM site_pageviews v
				WHERE
					v.site_id = s.id
					AND v.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS visitors_30d,
			COALESCE((
				SELECT COUNT(*)
				FROM leads l
				WHERE
					l.site_id = s.id
					AND l.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS leads_30d,
			COALESCE((
				SELECT COUNT(*)
				FROM site_contact_clicks c
				WHERE
					c.site_id = s.id
					AND c.event_type = 'phone_click'
					AND c.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS phone_clicks_30d,
			COALESCE((
				SELECT COUNT(*)
				FROM site_contact_clicks c
				WHERE
					c.site_id = s.id
					AND c.event_type = 'email_click'
					AND c.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS email_clicks_30d,
			COALESCE((
				SELECT COUNT(*)
				FROM site_pageviews v
				WHERE
					v.site_id = s.id
					AND v.utm_source = 'affichette'
					AND v.created_at >= NOW() - INTERVAL '30 days'
			), 0) AS poster_views_30d
		FROM sites s
		WHERE s.user_id = $1::uuid
		ORDER BY s.updated_at DESC;
		`,
		user.ID,
	)

	if err != nil {
		log.Println(
			"Erreur analytics résumé :",
			err,
		)

		http.Error(
			w,
			"Impossible de charger les statistiques",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	summary := AnalyticsSummary{
		Sites: make(
			[]SiteAnalyticsSummary,
			0,
		),
	}

	for rows.Next() {
		var site SiteAnalyticsSummary

		if err := rows.Scan(
			&site.SiteID,
			&site.PublicSlug,
			&site.BusinessName,
			&site.Views30d,
			&site.Visitors30d,
			&site.Leads30d,
			&site.PhoneClicks30d,
			&site.EmailClicks30d,
			&site.PosterViews30d,
		); err != nil {
			log.Println(
				"Erreur lecture analytics :",
				err,
			)

			http.Error(
				w,
				"Impossible de charger les statistiques",
				http.StatusInternalServerError,
			)
			return
		}

		if site.Visitors30d > 0 {
			site.ConversionRate =
				float64(site.Leads30d) /
					float64(site.Visitors30d) *
					100
		}

		summary.Views30d +=
			site.Views30d

		summary.Visitors30d +=
			site.Visitors30d

		summary.Leads30d +=
			site.Leads30d
		summary.PhoneClicks30d +=
			site.PhoneClicks30d
		summary.EmailClicks30d +=
			site.EmailClicks30d

		summary.PosterViews30d +=
			site.PosterViews30d

		summary.Sites = append(
			summary.Sites,
			site,
		)
	}

	if err := rows.Err(); err != nil {
		log.Println(
			"Erreur analytics rows :",
			err,
		)

		http.Error(
			w,
			"Impossible de charger les statistiques",
			http.StatusInternalServerError,
		)
		return
	}

	if summary.Visitors30d > 0 {
		summary.ConversionRate =
			float64(summary.Leads30d) /
				float64(summary.Visitors30d) *
				100
	}

	writeJSON(
		w,
		http.StatusOK,
		summary,
	)
}
