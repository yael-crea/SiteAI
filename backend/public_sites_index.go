package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func init() {
	http.HandleFunc("/public-sites", publicSitesIndexHandler)
}

func publicSitesIndexHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

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

	query := `
		SELECT
			business_name,
			activity,
			city,
			phone,
			design_style,
			accent_color,
			site_data,
			public_slug,
			published_at
		FROM sites
		WHERE
			published = TRUE
			AND public_slug IS NOT NULL
		ORDER BY published_at DESC;
	`

	rows, err := db.Query(
		r.Context(),
		query,
	)

	if err != nil {
		log.Println(
			"Erreur récupération sites publics :",
			err,
		)

		http.Error(
			w,
			"Impossible de récupérer les sites publics",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	publicSites := []PublicSite{}

	for rows.Next() {
		var publicSite PublicSite
		var siteJSON []byte

		err = rows.Scan(
			&publicSite.BusinessName,
			&publicSite.Activity,
			&publicSite.City,
			&publicSite.Phone,
			&publicSite.DesignStyle,
			&publicSite.AccentColor,
			&siteJSON,
			&publicSite.PublicSlug,
			&publicSite.PublishedAt,
		)

		if err != nil {
			log.Println(
				"Erreur lecture site public :",
				err,
			)

			http.Error(
				w,
				"Erreur lecture des sites publics",
				http.StatusInternalServerError,
			)
			return
		}

		err = json.Unmarshal(
			siteJSON,
			&publicSite.Site,
		)

		if err != nil {
			log.Println(
				"Erreur JSON site public :",
				err,
			)

			http.Error(
				w,
				"Site public invalide",
				http.StatusInternalServerError,
			)
			return
		}

		publicSites = append(
			publicSites,
			publicSite,
		)
	}

	if err := rows.Err(); err != nil {
		log.Println(
			"Erreur PostgreSQL sites publics :",
			err,
		)

		http.Error(
			w,
			"Erreur PostgreSQL",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		publicSites,
	)
}