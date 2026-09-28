package main

import (
	"net/http"
	"time"
)

type PublicSiteIndexItem struct {
	PublicSlug string    `json:"publicSlug"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func init() {
	http.HandleFunc("/public-sites", publicSitesIndexHandler)
	http.HandleFunc("/public-sites-index", publicSitesIndexHandler)
}

func publicSitesIndexHandler(
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

	rows, err := db.Query(
		r.Context(),
		`
		SELECT
			public_slug,
			COALESCE(published_at, updated_at)
		FROM sites
		WHERE
			published = TRUE
			AND public_slug IS NOT NULL
			AND public_slug <> ''
		ORDER BY COALESCE(published_at, updated_at) DESC;
		`,
	)

	if err != nil {
		http.Error(
			w,
			"Impossible de récupérer les sites publics",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	sites := make(
		[]PublicSiteIndexItem,
		0,
	)

	for rows.Next() {
		var site PublicSiteIndexItem

		err = rows.Scan(
			&site.PublicSlug,
			&site.UpdatedAt,
		)

		if err != nil {
			http.Error(
				w,
				"Erreur lecture site public",
				http.StatusInternalServerError,
			)
			return
		}

		sites = append(
			sites,
			site,
		)
	}

	if err := rows.Err(); err != nil {
		http.Error(
			w,
			"Erreur lecture PostgreSQL",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		sites,
	)
}
