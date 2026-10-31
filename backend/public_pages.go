package main

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type PublicSite struct {
	BusinessName string `json:"businessName"`

	Activity string `json:"activity"`

	City string `json:"city"`

	Phone string `json:"phone"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`

	Site PublicGeneratedSite `json:"site"`

	PublicSlug string `json:"publicSlug"`

	PublishedAt *time.Time `json:"publishedAt"`
}

type PublicSitemapSite struct {
	PublicSlug string    `json:"publicSlug"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func publicSitemapSitesHandler(
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
			updated_at
		FROM sites
		WHERE
			published = TRUE
			AND public_slug IS NOT NULL
			AND public_slug <> ''
		ORDER BY updated_at DESC;
		`,
	)

	if err != nil {
		log.Println(
			"Erreur sitemap public :",
			err,
		)

		http.Error(
			w,
			"Impossible de charger le sitemap",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	sites := make(
		[]PublicSitemapSite,
		0,
	)

	for rows.Next() {
		var site PublicSitemapSite

		if err := rows.Scan(
			&site.PublicSlug,
			&site.UpdatedAt,
		); err != nil {
			log.Println(
				"Erreur lecture sitemap public :",
				err,
			)

			http.Error(
				w,
				"Impossible de charger le sitemap",
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
		log.Println(
			"Erreur rows sitemap public :",
			err,
		)

		http.Error(
			w,
			"Impossible de charger le sitemap",
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

func publicSiteHandler(

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

	slug := strings.Trim(

		strings.TrimPrefix(

			r.URL.Path,

			"/public-sites/",
		),

		"/",
	)

	if slug == "" {

		http.Error(

			w,

			"Slug manquant",

			http.StatusBadRequest,
		)

		return

	}

	publicSite, err := loadPublicSiteBySlug(r.Context(), slug)

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

		if errors.Is(err, errPublishedSnapshotUnavailable) {
			log.Printf("Snapshot publié indisponible pour le slug %q", slug)
			http.Error(w, "Version publiée temporairement indisponible", http.StatusServiceUnavailable)
			return
		}

		log.Println("Erreur site public :", err)

		http.Error(

			w,

			"Erreur serveur",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		publicSite,
	)

}

func publicDomainHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	domain := normalizeDomain(strings.Trim(strings.TrimPrefix(r.URL.Path, "/public-domains/"), "/"))

	if domain == "" {
		http.Error(w, "Domaine manquant", http.StatusBadRequest)
		return
	}

	publicSite, err := loadPublicSiteByDomain(r.Context(), domain)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}

		if errors.Is(err, errPublishedSnapshotUnavailable) {
			log.Printf("Snapshot publié indisponible pour le domaine %q", domain)
			http.Error(w, "Version publiée temporairement indisponible", http.StatusServiceUnavailable)
			return
		}

		log.Println("Erreur site public par domaine :", err)
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, publicSite)
}
