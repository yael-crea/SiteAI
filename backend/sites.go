package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type SiteSection struct {
	// SourceIndex refers to an existing section in the AI edit request only.
	// New sections use null. It is never required for saved legacy sites.
	SourceIndex *int `json:"sourceIndex,omitempty"`

	Title string `json:"title"`

	Text string `json:"text"`

	IconMode string `json:"iconMode"`

	Icon string `json:"icon"`

	ImageMode string `json:"imageMode"`

	ImageURL string `json:"imageUrl"`

	Hidden bool `json:"hidden"`
}

type SiteBenefit struct {
	Title string `json:"title"`

	Text string `json:"text"`
}

type FAQItem struct {
	Question string `json:"question"`

	Answer string `json:"answer"`
}

type DesignSettings struct {
	Font string `json:"font"`

	ButtonStyle string `json:"buttonStyle"`

	CardStyle string `json:"cardStyle"`

	LogoSize string `json:"logoSize"`

	HeroLayout string `json:"heroLayout"`

	ContentWidth string `json:"contentWidth"`

	Spacing string `json:"spacing"`

	Background string `json:"background"`

	TitleScale string `json:"titleScale"`

	TextScale string `json:"textScale"`

	TitleWeight string `json:"titleWeight"`

	TitleCase string `json:"titleCase"`

	LineHeight string `json:"lineHeight"`

	CardRadius string `json:"cardRadius"`

	ShadowStrength string `json:"shadowStrength"`

	ImageRadius string `json:"imageRadius"`

	ImageRatio string `json:"imageRatio"`

	ImageFit string `json:"imageFit"`

	ButtonSize string `json:"buttonSize"`
}

type GeneratedSite struct {
	SiteGoal     string `json:"siteGoal,omitempty"`
	BookingURL   string `json:"bookingUrl,omitempty"`
	BusinessName string `json:"businessName"`

	Slug string `json:"slug"`

	MetaTitle string `json:"metaTitle"`

	MetaDescription string `json:"metaDescription"`

	HeroEyebrow string `json:"heroEyebrow"`

	HeroTitle string `json:"heroTitle"`

	HeroText string `json:"heroText"`

	PrimaryCTA string `json:"primaryCta"`

	SecondaryCTA string `json:"secondaryCta"`

	Phone string `json:"phone"`

	LogoURL string `json:"logoUrl"`

	HeroImageURL string `json:"heroImageUrl"`

	Gallery []string `json:"gallery"`

	AboutTitle string `json:"aboutTitle"`

	AboutText string `json:"aboutText"`

	Sections []SiteSection `json:"sections"`

	Benefits []SiteBenefit `json:"benefits"`

	FAQ []FAQItem `json:"faq"`

	ContactTitle string `json:"contactTitle"`

	ContactText string `json:"contactText"`

	LayoutOrder []string `json:"layoutOrder"`

	HiddenBlocks []string `json:"hiddenBlocks"`

	DesignSettings DesignSettings `json:"designSettings"`

	Testimonials []map[string]any `json:"testimonials"`

	ServiceArea string `json:"serviceArea"`

	OpeningHours string `json:"openingHours"`

	ClientName string `json:"clientName"`

	ClientEmail string `json:"clientEmail"`

	SocialLinks map[string]string `json:"socialLinks,omitempty"`
}

type SaveSiteInput struct {
	ExpectedRevision *int64 `json:"expectedRevision,omitempty"`

	Site GeneratedSite `json:"site"`

	Activity string `json:"activity"`

	City string `json:"city"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`
}

type SavedSite struct {
	DraftRevision int64 `json:"draftRevision"`

	PublishedRevision int64 `json:"publishedRevision"`

	ID int64 `json:"id"`

	BusinessName string `json:"businessName"`

	Activity string `json:"activity"`

	City string `json:"city"`

	Phone string `json:"phone"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`

	Site GeneratedSite `json:"site"`

	Published bool `json:"published"`

	PublicSlug string `json:"publicSlug"`

	PublishedAt *time.Time `json:"publishedAt"`

	CreatedAt time.Time `json:"createdAt"`

	UpdatedAt time.Time `json:"updatedAt"`
}

func sitesHandler(

	w http.ResponseWriter,

	r *http.Request,

) {

	enableCORS(w)

	if r.Method == http.MethodOptions {

		w.WriteHeader(http.StatusNoContent)

		return

	}

	user, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	if err := syncNotificationEmail(
		r.Context(),
		user.ID,
		user.Email,
	); err != nil {
		log.Println("Impossible de synchroniser l'email de notification :", err)
	}

	switch r.Method {

	case http.MethodGet:

		listSitesHandler(

			w,

			r,

			user.ID,
		)

	case http.MethodPost:

		saveDraftHandler(

			w,

			r,

			0,

			user.ID,

			user.Email,
		)

	default:

		http.Error(

			w,

			"Méthode non autorisée",

			http.StatusMethodNotAllowed,
		)

	}

}

func siteByIDHandler(

	w http.ResponseWriter,

	r *http.Request,

) {

	enableCORS(w)

	if r.Method == http.MethodOptions {

		w.WriteHeader(http.StatusNoContent)

		return

	}

	user, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	if err := syncNotificationEmail(
		r.Context(),
		user.ID,
		user.Email,
	); err != nil {
		log.Println("Impossible de synchroniser l'email de notification :", err)
	}

	path := strings.Trim(

		strings.TrimPrefix(

			r.URL.Path,

			"/sites/",
		),

		"/",
	)

	if path == "" {

		http.Error(

			w,

			"ID manquant",

			http.StatusBadRequest,
		)

		return

	}

	parts := strings.Split(path, "/")

	id, err := strconv.ParseInt(

		parts[0],

		10,

		64,
	)

	if err != nil || id <= 0 {

		http.Error(

			w,

			"ID invalide",

			http.StatusBadRequest,
		)

		return

	}

	if len(parts) >= 2 && parts[1] == "domain" {

		if len(parts) == 2 {

			switch r.Method {

			case http.MethodGet:

				getDomainHandler(w, r, id, user.ID)

			case http.MethodPost:

				addDomainHandler(w, r, id, user.ID)

			case http.MethodDelete:

				deleteDomainHandler(w, r, id, user.ID)

			default:

				http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)

			}

			return

		}

		if len(parts) == 3 && parts[2] == "verify" {

			if r.Method != http.MethodPost {

				http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)

				return

			}

			verifyDomainHandler(w, r, id, user.ID)

			return

		}

		http.Error(w, "URL domaine invalide", http.StatusBadRequest)

		return

	}

	if len(parts) == 2 {

		action := parts[1]

		switch action {

		case "publish":

			if r.Method != http.MethodPost {

				http.Error(

					w,

					"Méthode non autorisée",

					http.StatusMethodNotAllowed,
				)

				return

			}

			publishDraftHandler(

				w,

				r,

				id,

				user.ID,
			)

			return

		case "unpublish":

			if r.Method != http.MethodPost {

				http.Error(

					w,

					"Méthode non autorisée",

					http.StatusMethodNotAllowed,
				)

				return

			}

			unpublishSiteHandler(

				w,

				r,

				id,

				user.ID,
			)

			return

		case "versions":

			siteVersionsHandler(w, r, id, user.ID)

			return

		case "restore-version":

			restoreSiteVersionHandler(w, r, id, user.ID)

			return

		case "poster":
			if r.Method != http.MethodGet {
				http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
				return
			}
			sitePosterHandler(w, r, id, user.ID)
			return

		case "duplicate":

			if r.Method != http.MethodPost {

				http.Error(

					w,

					"Méthode non autorisée",

					http.StatusMethodNotAllowed,
				)

				return

			}

			duplicateSiteHandler(

				w,

				r,

				id,

				user.ID,
			)

			return

		default:

			http.Error(

				w,

				"Action inconnue",

				http.StatusNotFound,
			)

			return

		}

	}

	if len(parts) > 2 {

		http.Error(

			w,

			"URL invalide",

			http.StatusBadRequest,
		)

		return

	}

	switch r.Method {

	case http.MethodGet:

		getSiteHandler(

			w,

			r,

			id,

			user.ID,
		)

	case http.MethodPut:

		saveDraftHandler(

			w,

			r,

			id,

			user.ID,

			user.Email,
		)

	case http.MethodDelete:

		deleteSiteHandler(

			w,

			r,

			id,

			user.ID,
		)

	default:

		http.Error(

			w,

			"Méthode non autorisée",

			http.StatusMethodNotAllowed,
		)

	}

}

func createSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	userID string,

	userEmail string,

) {

	var input SaveSiteInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	if strings.TrimSpace(

		input.Site.BusinessName,
	) == "" {

		http.Error(

			w,

			"Site invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.DesignStyle = normalizeDesignStyle(

		input.DesignStyle,
	)

	input.AccentColor = normalizeAccentColor(

		input.AccentColor,

		"#2563eb",
	)

	siteJSON, err := json.Marshal(input.Site)

	if err != nil {

		http.Error(

			w,

			"Site invalide",

			http.StatusInternalServerError,
		)

		return

	}

	query := `

    INSERT INTO sites (

        user_id,

        business_name,

        activity,

        city,

        phone,

        notification_email,

        design_style,

        accent_color,

        site_data

    )

    VALUES (

        $1::uuid,

        $2,

        $3,

        $4,

        $5,

        $6,

        $7,

        $8,

        $9::jsonb

    )

    RETURNING

        id,

        created_at,

        updated_at;

    `

	var saved SavedSite

	err = db.QueryRow(

		r.Context(),

		query,

		userID,

		input.Site.BusinessName,

		input.Activity,

		input.City,

		input.Site.Phone,

		strings.TrimSpace(userEmail),

		input.DesignStyle,

		input.AccentColor,

		string(siteJSON),
	).Scan(

		&saved.ID,

		&saved.CreatedAt,

		&saved.UpdatedAt,
	)

	if err != nil {

		log.Println(

			"Erreur sauvegarde :",

			err,
		)

		http.Error(

			w,

			"Impossible de sauvegarder",

			http.StatusInternalServerError,
		)

		return

	}

	saved.BusinessName = input.Site.BusinessName

	saved.Activity = input.Activity

	saved.City = input.City

	saved.Phone = input.Site.Phone

	saved.DesignStyle = input.DesignStyle

	saved.AccentColor = input.AccentColor

	saved.Site = input.Site

	saved.Published = false

	saved.PublicSlug = ""

	saved.PublishedAt = nil

	writeJSON(

		w,

		http.StatusCreated,

		saved,
	)

}

func listSitesHandler(

	w http.ResponseWriter,

	r *http.Request,

	userID string,

) {

	query := `

    SELECT

        id,

        business_name,

        activity,

        city,

        phone,

        design_style,

        accent_color,

        site_data,

        published,

        COALESCE(public_slug, ''),

        published_at,

        created_at,

        updated_at,

        draft_revision,

        published_revision

    FROM sites

    WHERE user_id = $1::uuid

    ORDER BY updated_at DESC;

    `

	rows, err := db.Query(

		r.Context(),

		query,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de récupérer les sites",

			http.StatusInternalServerError,
		)

		return

	}

	defer rows.Close()

	sites := []SavedSite{}

	for rows.Next() {

		var saved SavedSite

		var siteJSON []byte

		err = rows.Scan(

			&saved.ID,

			&saved.BusinessName,

			&saved.Activity,

			&saved.City,

			&saved.Phone,

			&saved.DesignStyle,

			&saved.AccentColor,

			&siteJSON,

			&saved.Published,

			&saved.PublicSlug,

			&saved.PublishedAt,

			&saved.CreatedAt,

			&saved.UpdatedAt,

			&saved.DraftRevision,

			&saved.PublishedRevision,
		)

		if err != nil {

			http.Error(

				w,

				"Erreur lecture site",

				http.StatusInternalServerError,
			)

			return

		}

		err = json.Unmarshal(

			siteJSON,

			&saved.Site,
		)

		if err != nil {

			http.Error(

				w,

				"Site invalide",

				http.StatusInternalServerError,
			)

			return

		}

		normalizeGrowthFields(&saved.Site)

		sites = append(

			sites,

			saved,
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

func getSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	saved, err := getSavedSiteByID(

		r.Context(),

		id,

		userID,
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

		saved,
	)

}

func updateSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	var input SaveSiteInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.DesignStyle = normalizeDesignStyle(

		input.DesignStyle,
	)

	input.AccentColor = normalizeAccentColor(

		input.AccentColor,

		"#2563eb",
	)

	siteJSON, err := json.Marshal(input.Site)

	if err != nil {

		http.Error(

			w,

			"Site invalide",

			http.StatusInternalServerError,
		)

		return

	}

	query := `

    UPDATE sites

    SET

        business_name = $1,

        activity = $2,

        city = $3,

        phone = $4,

        design_style = $5,

        accent_color = $6,

        site_data = $7::jsonb,

        updated_at = NOW()

    WHERE

        id = $8

        AND user_id = $9::uuid;

    `

	result, err := db.Exec(

		r.Context(),

		query,

		input.Site.BusinessName,

		input.Activity,

		input.City,

		input.Site.Phone,

		input.DesignStyle,

		input.AccentColor,

		string(siteJSON),

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de modifier le site",

			http.StatusInternalServerError,
		)

		return

	}

	if result.RowsAffected() == 0 {

		http.Error(

			w,

			"Site introuvable",

			http.StatusNotFound,
		)

		return

	}

	saved, err := getSavedSiteByID(

		r.Context(),

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de relire le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		saved,
	)

}

func deleteSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	result, err := db.Exec(

		r.Context(),

		`

        DELETE FROM sites

        WHERE

            id = $1

            AND user_id = $2::uuid;

        `,

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de supprimer",

			http.StatusInternalServerError,
		)

		return

	}

	if result.RowsAffected() == 0 {

		http.Error(

			w,

			"Site introuvable",

			http.StatusNotFound,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		map[string]any{

			"success": true,
		},
	)

}

func duplicateSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	ctx := r.Context()

	var originalName string

	err := db.QueryRow(
		ctx,
		`
        SELECT business_name
        FROM sites
        WHERE
            id = $1
            AND user_id = $2::uuid;
        `,
		id,
		userID,
	).Scan(&originalName)

	if err != nil {

		if errors.Is(err, pgx.ErrNoRows) {

			http.Error(
				w,
				"Site introuvable",
				http.StatusNotFound,
			)

			return
		}

		log.Println("Erreur lecture du site à dupliquer :", err)

		http.Error(
			w,
			"Impossible de dupliquer le site",
			http.StatusInternalServerError,
		)

		return
	}

	baseName := strings.TrimSpace(originalName)

	if baseName == "" {
		baseName = "Site"
	}

	baseName += " - Copie"
	duplicateName := baseName

	for attempt := 1; attempt <= 99; attempt++ {

		var exists bool

		err = db.QueryRow(
			ctx,
			`
            SELECT EXISTS(
                SELECT 1
                FROM sites
                WHERE
                    user_id = $1::uuid
                    AND LOWER(business_name) = LOWER($2)
            );
            `,
			userID,
			duplicateName,
		).Scan(&exists)

		if err != nil {

			log.Println("Erreur vérification nom de copie :", err)

			http.Error(
				w,
				"Impossible de dupliquer le site",
				http.StatusInternalServerError,
			)

			return
		}

		if !exists {
			break
		}

		if attempt == 99 {

			http.Error(
				w,
				"Trop de copies de ce site existent déjà",
				http.StatusConflict,
			)

			return
		}

		duplicateName = fmt.Sprintf(
			"%s %d",
			baseName,
			attempt+1,
		)
	}

	duplicateSlug := slugify(duplicateName)

	var duplicateID int64

	err = db.QueryRow(
		ctx,
		`
        INSERT INTO sites (
            user_id,
            business_name,
            activity,
            city,
            phone,
            notification_email,
            design_style,
            accent_color,
            site_data,
            published,
            public_slug,
            published_at,
            custom_domain,
            custom_domain_verified,
            custom_domain_updated_at
        )
        SELECT
            user_id,
            $3,
            activity,
            city,
            phone,
            notification_email,
            design_style,
            accent_color,
            jsonb_set(
                jsonb_set(
                    site_data,
                    '{businessName}',
                    to_jsonb($3::text),
                    true
                ),
                '{slug}',
                to_jsonb($4::text),
                true
            ),
            FALSE,
            NULL,
            NULL,
            NULL,
            FALSE,
            NULL
        FROM sites
        WHERE
            id = $1
            AND user_id = $2::uuid
        RETURNING id;
        `,
		id,
		userID,
		duplicateName,
		duplicateSlug,
	).Scan(&duplicateID)

	if err != nil {

		log.Println("Erreur duplication site :", err)

		http.Error(
			w,
			"Impossible de dupliquer le site",
			http.StatusInternalServerError,
		)

		return
	}

	duplicated, err := getSavedSiteByID(
		ctx,
		duplicateID,
		userID,
	)

	if err != nil {

		log.Println("Site dupliqué mais impossible à relire :", err)

		http.Error(
			w,
			"Site dupliqué mais impossible à relire",
			http.StatusInternalServerError,
		)

		return
	}

	writeJSON(
		w,
		http.StatusCreated,
		duplicated,
	)
}

func publishSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	saved, err := getSavedSiteByID(

		r.Context(),

		id,

		userID,
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

		http.Error(

			w,

			"Erreur serveur",

			http.StatusInternalServerError,
		)

		return

	}

	if !saved.Published {
		billingStatus, _, _, billingErr := getBillingStatus(r.Context(), userID)
		if billingErr != nil {
			http.Error(
				w,
				"Impossible de vérifier l'abonnement",
				http.StatusInternalServerError,
			)
			return
		}

		entitlements := billingEntitlements(billingStatus)
		if entitlements.MaxPublishedSites == 0 {
			http.Error(
				w,
				"Un abonnement actif est nécessaire pour publier un site.",
				http.StatusForbidden,
			)
			return
		}

		var publishedCount int
		countErr := db.QueryRow(
			r.Context(),
			`
			SELECT COUNT(*)
			FROM sites
			WHERE
				user_id = $1::uuid
				AND published = TRUE
				AND id <> $2;
			`,
			userID,
			id,
		).Scan(&publishedCount)
		if countErr != nil {
			http.Error(
				w,
				"Impossible de vérifier la limite de publication",
				http.StatusInternalServerError,
			)
			return
		}

		if publishedCount >= entitlements.MaxPublishedSites {
			http.Error(
				w,
				publishedSiteLimitMessage(billingStatus.Plan, entitlements.MaxPublishedSites),
				http.StatusForbidden,
			)
			return
		}
	}

	publicSlug := saved.PublicSlug

	if publicSlug == "" {

		baseSlug := slugify(

			saved.BusinessName,
		)

		if baseSlug == "" {

			baseSlug = "site"

		}

		publicSlug, err = createUniquePublicSlug(

			r.Context(),

			baseSlug,

			id,
		)

		if err != nil {

			http.Error(

				w,

				"Impossible de créer l'adresse publique",

				http.StatusInternalServerError,
			)

			return

		}

	}

	query := `

    UPDATE sites

    SET

        published = TRUE,

        public_slug = $1,

        published_at = NOW(),

        updated_at = NOW()

    WHERE

        id = $2

        AND user_id = $3::uuid;

    `

	result, err := db.Exec(

		r.Context(),

		query,

		publicSlug,

		id,

		userID,
	)

	if err != nil {

		log.Println(

			"Erreur publication :",

			err,
		)

		http.Error(

			w,

			"Impossible de publier le site",

			http.StatusInternalServerError,
		)

		return

	}

	if result.RowsAffected() == 0 {

		http.Error(

			w,

			"Site introuvable",

			http.StatusNotFound,
		)

		return

	}

	publishedSite, err := getSavedSiteByID(

		r.Context(),

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Site publié mais impossible à relire",

			http.StatusInternalServerError,
		)

		return

	}

	fmt.Println(

		"Site publié :",

		publishedSite.BusinessName,
	)

	writeJSON(

		w,

		http.StatusOK,

		publishedSite,
	)

}

func unpublishSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

	id int64,

	userID string,

) {

	query := `

    UPDATE sites

    SET

        published = FALSE,

        published_at = NULL,

        updated_at = NOW()

    WHERE

        id = $1

        AND user_id = $2::uuid;

    `

	result, err := db.Exec(

		r.Context(),

		query,

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de retirer le site de la publication",

			http.StatusInternalServerError,
		)

		return

	}

	if result.RowsAffected() == 0 {

		http.Error(

			w,

			"Site introuvable",

			http.StatusNotFound,
		)

		return

	}

	saved, err := getSavedSiteByID(

		r.Context(),

		id,

		userID,
	)

	if err != nil {

		http.Error(

			w,

			"Impossible de relire le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		saved,
	)

}

func createUniquePublicSlug(

	ctx context.Context,

	baseSlug string,

	siteID int64,

) (string, error) {

	candidate := baseSlug

	for attempt := 0; attempt < 100; attempt++ {

		var existingID int64

		err := db.QueryRow(

			ctx,

			`

            SELECT id

            FROM sites

            WHERE public_slug = $1

            LIMIT 1;

            `,

			candidate,
		).Scan(&existingID)

		if errors.Is(

			err,

			pgx.ErrNoRows,
		) {

			return candidate, nil

		}

		if err != nil {

			return "", err

		}

		if existingID == siteID {

			return candidate, nil

		}

		if attempt == 0 {

			candidate = fmt.Sprintf(

				"%s-%d",

				baseSlug,

				siteID,
			)

		} else {

			candidate = fmt.Sprintf(

				"%s-%d-%d",

				baseSlug,

				siteID,

				attempt+1,
			)

		}

	}

	return "", errors.New(

		"impossible de générer un slug public unique",
	)

}

func getSavedSiteByID(

	ctx context.Context,

	id int64,

	userID string,

) (SavedSite, error) {

	query := `

    SELECT

        id,

        business_name,

        activity,

        city,

        phone,

        design_style,

        accent_color,

        site_data,

        published,

        COALESCE(public_slug, ''),

        published_at,

        created_at,

        updated_at,

        draft_revision,

        published_revision

    FROM sites

    WHERE

        id = $1

        AND user_id = $2::uuid;

    `

	var saved SavedSite

	var siteJSON []byte

	err := db.QueryRow(

		ctx,

		query,

		id,

		userID,
	).Scan(

		&saved.ID,

		&saved.BusinessName,

		&saved.Activity,

		&saved.City,

		&saved.Phone,

		&saved.DesignStyle,

		&saved.AccentColor,

		&siteJSON,

		&saved.Published,

		&saved.PublicSlug,

		&saved.PublishedAt,

		&saved.CreatedAt,

		&saved.UpdatedAt,

		&saved.DraftRevision,

		&saved.PublishedRevision,
	)

	if err != nil {

		return SavedSite{}, err

	}

	err = json.Unmarshal(

		siteJSON,

		&saved.Site,
	)

	if err != nil {

		return SavedSite{}, err

	}

	normalizeGrowthFields(&saved.Site)

	return saved, nil

}

func slugify(value string) string {

	value = strings.TrimSpace(value)

	value = strings.ToLower(value)

	replacements := map[string]string{

		"à": "a",

		"â": "a",

		"ä": "a",

		"á": "a",

		"ã": "a",

		"å": "a",

		"ç": "c",

		"é": "e",

		"è": "e",

		"ê": "e",

		"ë": "e",

		"í": "i",

		"ì": "i",

		"î": "i",

		"ï": "i",

		"ñ": "n",

		"ó": "o",

		"ò": "o",

		"ô": "o",

		"ö": "o",

		"õ": "o",

		"ú": "u",

		"ù": "u",

		"û": "u",

		"ü": "u",

		"ý": "y",

		"ÿ": "y",

		"œ": "oe",

		"æ": "ae",
	}

	for oldValue, newValue := range replacements {

		value = strings.ReplaceAll(

			value,

			oldValue,

			newValue,
		)

	}

	value = strings.ReplaceAll(

		value,

		" ",

		"-",
	)

	reg := regexp.MustCompile(

		`[^a-z0-9-]+`,
	)

	value = reg.ReplaceAllString(

		value,

		"",
	)

	regDash := regexp.MustCompile(

		`-+`,
	)

	value = regDash.ReplaceAllString(

		value,

		"-",
	)

	return strings.Trim(

		value,

		"-",
	)

}

func normalizeGrowthFields(site *GeneratedSite) {
	if site == nil {
		return
	}

	if site.Gallery == nil {
		site.Gallery = []string{}
	}

	if site.Sections == nil {
		site.Sections = []SiteSection{}
	}

	for index := range site.Sections {
		section := &site.Sections[index]

		switch section.IconMode {
		case "auto", "custom", "none":
		default:
			section.IconMode = "auto"
		}

		switch section.ImageMode {
		case "auto", "custom", "none":
		default:
			section.ImageMode = "auto"
		}
	}

	validBlocks := map[string]bool{
		"about":    true,
		"services": true,
		"process":  true,
		"faq":      true,
		"gallery":  true,
		"contact":  true,
	}

	defaultOrder := []string{
		"about",
		"services",
		"process",
		"faq",
		"gallery",
		"contact",
	}

	order := make([]string, 0, len(defaultOrder))
	seen := make(map[string]bool)

	for _, block := range site.LayoutOrder {
		if validBlocks[block] && !seen[block] {
			order = append(order, block)
			seen[block] = true
		}
	}

	for _, block := range defaultOrder {
		if !seen[block] {
			order = append(order, block)
			seen[block] = true
		}
	}

	site.LayoutOrder = order

	hidden := make([]string, 0, len(site.HiddenBlocks))
	seenHidden := make(map[string]bool)

	for _, block := range site.HiddenBlocks {
		if validBlocks[block] && !seenHidden[block] {
			hidden = append(hidden, block)
			seenHidden[block] = true
		}
	}

	site.HiddenBlocks = hidden

	if site.Testimonials == nil {
		site.Testimonials = []map[string]any{}
	}
}

func normalizeDesignStyle(value string) string {

	switch value {

	case "elegant":

		return "elegant"

	case "artisan":

		return "artisan"

	default:

		return "moderne"

	}

}

func normalizeAccentColor(

	value string,

	fallback string,

) string {

	reg := regexp.MustCompile(

		`^#[0-9a-fA-F]{6}$`,
	)

	if reg.MatchString(value) {

		return value

	}

	return fallback

}
