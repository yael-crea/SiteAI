package main

import (
	"bytes"

	"context"

	"encoding/json"

	"errors"

	"fmt"

	"io"

	"log"

	"net/http"

	"os"

	"regexp"

	"strconv"

	"strings"

	"time"

	"github.com/jackc/pgx/v5"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/joho/godotenv"
)

var db *pgxpool.Pool

type SupabaseUser struct {
	ID string `json:"id"`

	Email string `json:"email"`
}

type BusinessInput struct {
	BusinessName string `json:"businessName"`

	Activity string `json:"activity"`

	City string `json:"city"`

	Phone string `json:"phone"`

	Services []string `json:"services"`
}

type SiteSection struct {
	Title string `json:"title"`

	Text string `json:"text"`
}

type GeneratedSite struct {
	BusinessName string `json:"businessName"`

	Slug string `json:"slug"`

	MetaTitle string `json:"metaTitle"`

	MetaDescription string `json:"metaDescription"`

	HeroTitle string `json:"heroTitle"`

	HeroText string `json:"heroText"`

	Phone string `json:"phone"`

	LogoURL string `json:"logoUrl"`

	Sections []SiteSection `json:"sections"`
}

type AIContent struct {
	MetaTitle string `json:"metaTitle"`

	MetaDescription string `json:"metaDescription"`

	HeroTitle string `json:"heroTitle"`

	HeroText string `json:"heroText"`

	Sections []SiteSection `json:"sections"`
}

type ModifySiteInput struct {
	Site GeneratedSite `json:"site"`

	Instruction string `json:"instruction"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`

	Activity string `json:"activity"`

	City string `json:"city"`
}

type ModifySiteOutput struct {
	Site GeneratedSite `json:"site"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`
}

type SaveSiteInput struct {
	Site GeneratedSite `json:"site"`

	Activity string `json:"activity"`

	City string `json:"city"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`
}

type SavedSite struct {
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

type PublicSite struct {
	BusinessName string `json:"businessName"`

	Activity string `json:"activity"`

	City string `json:"city"`

	Phone string `json:"phone"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`

	Site GeneratedSite `json:"site"`

	PublicSlug string `json:"publicSlug"`

	PublishedAt *time.Time `json:"publishedAt"`
}

type OpenAIResponse struct {
	Output []struct {
		Type string `json:"type"`

		Content []struct {
			Type string `json:"type"`

			Text string `json:"text"`
		} `json:"content"`
	} `json:"output"`
}

func main() {

	err := godotenv.Load()

	if err != nil {

		log.Println("Attention : fichier .env introuvable")

	}

	required := []string{

		"OPENAI_API_KEY",

		"DATABASE_URL",

		"SUPABASE_URL",

		"SUPABASE_PUBLISHABLE_KEY",
	}

	for _, variable := range required {

		if os.Getenv(variable) == "" {

			log.Fatalf("%s est manquante dans .env", variable)

		}

	}

	err = initDatabase()

	if err != nil {

		log.Fatal("Erreur PostgreSQL :", err)

	}

	defer db.Close()

	http.HandleFunc("/health", healthHandler)

	http.HandleFunc("/generate", generateHandler)

	http.HandleFunc("/modify", modifyHandler)

	http.HandleFunc("/sites", sitesHandler)

	http.HandleFunc("/sites/", siteByIDHandler)

	http.HandleFunc("/public-sites/", publicSiteHandler)

	port := os.Getenv("PORT")

	if port == "" {

		port = "8080"

	}

	fmt.Println()

	fmt.Println("======================================")

	fmt.Println("SiteAI Backend")

	fmt.Println("Port :", port)

	fmt.Println("IA : activée")

	fmt.Println("Base de données : connectée")

	fmt.Println("Authentification : activée")

	fmt.Println("Publication : activée")

	fmt.Println("======================================")

	fmt.Println()

	log.Fatal(

		http.ListenAndServe(

			":"+port,

			nil,
		),
	)

}

func initDatabase() error {

	ctx, cancel := context.WithTimeout(

		context.Background(),

		15*time.Second,
	)

	defer cancel()

	pool, err := pgxpool.New(

		ctx,

		os.Getenv("DATABASE_URL"),
	)

	if err != nil {

		return err

	}

	err = pool.Ping(ctx)

	if err != nil {

		pool.Close()

		return err

	}

	db = pool

	fmt.Println("Connexion PostgreSQL réussie")

	return createTables(ctx)

}

func createTables(ctx context.Context) error {

	queries := []string{

		`

        CREATE TABLE IF NOT EXISTS sites (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID,

            business_name TEXT NOT NULL,

            activity TEXT NOT NULL DEFAULT '',

            city TEXT NOT NULL DEFAULT '',

            phone TEXT NOT NULL DEFAULT '',

            design_style TEXT NOT NULL DEFAULT 'moderne',

            accent_color TEXT NOT NULL DEFAULT '#2563eb',

            site_data JSONB NOT NULL,

            published BOOLEAN NOT NULL DEFAULT FALSE,

            public_slug TEXT,

            published_at TIMESTAMPTZ,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS user_id UUID;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS public_slug TEXT;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_sites_user_id

        ON sites(user_id);

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_public_slug

        ON sites(public_slug)

        WHERE public_slug IS NOT NULL;

        `,
	}

	for _, query := range queries {

		_, err := db.Exec(ctx, query)

		if err != nil {

			return err

		}

	}

	fmt.Println("Table sites prête")

	return nil

}

func authenticateRequest(r *http.Request) (SupabaseUser, error) {

	authorization := r.Header.Get("Authorization")

	if !strings.HasPrefix(authorization, "Bearer ") {

		return SupabaseUser{}, errors.New("token manquant")

	}

	token := strings.TrimSpace(

		strings.TrimPrefix(

			authorization,

			"Bearer ",
		),
	)

	if token == "" {

		return SupabaseUser{}, errors.New("token vide")

	}

	supabaseURL := strings.TrimRight(

		os.Getenv("SUPABASE_URL"),

		"/",
	)

	request, err := http.NewRequest(

		http.MethodGet,

		supabaseURL+"/auth/v1/user",

		nil,
	)

	if err != nil {

		return SupabaseUser{}, err

	}

	request.Header.Set(

		"Authorization",

		"Bearer "+token,
	)

	request.Header.Set(

		"apikey",

		os.Getenv("SUPABASE_PUBLISHABLE_KEY"),
	)

	client := &http.Client{

		Timeout: 10 * time.Second,
	}

	response, err := client.Do(request)

	if err != nil {

		return SupabaseUser{}, err

	}

	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {

		return SupabaseUser{}, errors.New("token invalide")

	}

	var user SupabaseUser

	err = json.NewDecoder(response.Body).Decode(&user)

	if err != nil {

		return SupabaseUser{}, err

	}

	if user.ID == "" {

		return SupabaseUser{}, errors.New("utilisateur invalide")

	}

	return user, nil

}

func requireUser(

	w http.ResponseWriter,

	r *http.Request,

) (SupabaseUser, bool) {

	user, err := authenticateRequest(r)

	if err != nil {

		http.Error(

			w,

			"Non autorisé",

			http.StatusUnauthorized,
		)

		return SupabaseUser{}, false

	}

	return user, true

}

func healthHandler(

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

	writeJSON(

		w,

		http.StatusOK,

		map[string]string{

			"status": "ok",

			"ai": "enabled",

			"database": "connected",

			"auth": "enabled",

			"publication": "enabled",
		},
	)

}

func generateHandler(

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

	_, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	var input BusinessInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.BusinessName = strings.TrimSpace(input.BusinessName)

	input.Activity = strings.TrimSpace(input.Activity)

	input.City = strings.TrimSpace(input.City)

	input.Phone = strings.TrimSpace(input.Phone)

	if input.BusinessName == "" ||

		input.Activity == "" ||

		input.City == "" {

		http.Error(

			w,

			"Nom, activité et ville obligatoires",

			http.StatusBadRequest,
		)

		return

	}

	site, err := generateSiteWithAI(input)

	if err != nil {

		log.Println("Erreur IA :", err)

		http.Error(

			w,

			"Impossible de générer le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		site,
	)

}

func modifyHandler(

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

	_, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	var input ModifySiteInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.Instruction = strings.TrimSpace(input.Instruction)

	if input.Instruction == "" {

		http.Error(

			w,

			"Instruction vide",

			http.StatusBadRequest,
		)

		return

	}

	result, err := modifySiteWithAI(input)

	if err != nil {

		log.Println("Erreur modification IA :", err)

		http.Error(

			w,

			"Impossible de modifier le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		result,
	)

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

	switch r.Method {

	case http.MethodGet:

		listSitesHandler(

			w,

			r,

			user.ID,
		)

	case http.MethodPost:

		createSiteHandler(

			w,

			r,

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

			publishSiteHandler(

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

		updateSiteHandler(

			w,

			r,

			id,

			user.ID,
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

        public_slug = $1

        AND published = TRUE;

    `

	var publicSite PublicSite

	var siteJSON []byte

	err := db.QueryRow(

		r.Context(),

		query,

		slug,
	).Scan(

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

			"Erreur site public :",

			err,
		)

		http.Error(

			w,

			"Erreur serveur",

			http.StatusInternalServerError,
		)

		return

	}

	err = json.Unmarshal(

		siteJSON,

		&publicSite.Site,
	)

	if err != nil {

		http.Error(

			w,

			"Site invalide",

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

func createSiteHandler(

	w http.ResponseWriter,

	r *http.Request,

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

        $8::jsonb

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

        updated_at

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

        updated_at

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

	return saved, nil

}

func generateSiteWithAI(

	input BusinessInput,

) (GeneratedSite, error) {

	services := strings.Join(

		input.Services,

		", ",
	)

	if services == "" {

		services = "services liés à " + input.Activity

	}

	instructions := `

Tu es le moteur de création de SiteAI.



Crée le contenu professionnel d'un site vitrine pour une TPE ou PME française.



Règles :

- français uniquement

- ton professionnel et naturel

- référencement local naturel

- ne jamais inventer de certifications

- ne jamais inventer d'années d'expérience

- ne jamais inventer de tarifs

- ne jamais inventer d'avis clients

- ne jamais inventer de garanties

- ne jamais inventer de disponibilité 24h/24

- ne jamais inventer d'informations factuelles



Crée entre 3 et 5 sections.

`

	userPrompt := fmt.Sprintf(

		`Entreprise : %s



Activité : %s



Ville : %s



Téléphone : %s



Services : %s`,

		input.BusinessName,

		input.Activity,

		input.City,

		input.Phone,

		services,
	)

	outputText, err := callOpenAI(

		instructions,

		userPrompt,

		"siteai_generated_site",

		generatedContentSchema(),
	)

	if err != nil {

		return GeneratedSite{}, err

	}

	var content AIContent

	err = json.Unmarshal(

		[]byte(outputText),

		&content,
	)

	if err != nil {

		return GeneratedSite{}, err

	}

	return GeneratedSite{

		BusinessName: input.BusinessName,

		Slug: slugify(input.BusinessName),

		MetaTitle: content.MetaTitle,

		MetaDescription: content.MetaDescription,

		HeroTitle: content.HeroTitle,

		HeroText: content.HeroText,

		Phone: input.Phone,

		Sections: content.Sections,
	}, nil

}

func modifySiteWithAI(

	input ModifySiteInput,

) (ModifySiteOutput, error) {

	currentJSON, err := json.MarshalIndent(

		input.Site,

		"",

		"  ",
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	currentDesign := normalizeDesignStyle(

		input.DesignStyle,
	)

	currentColor := normalizeAccentColor(

		input.AccentColor,

		"#2563eb",
	)

	instructions := `

Tu es l'éditeur intelligent de SiteAI.



Modifie uniquement ce que l'utilisateur demande.



Règles :

- français uniquement

- conserver les informations non demandées

- ne pas inventer de faits

- aucun faux avis

- aucune fausse certification

- aucun faux prix

- aucune fausse expérience

- designStyle doit être moderne, elegant ou artisan

- accentColor doit être une couleur hexadécimale

`

	userPrompt := fmt.Sprintf(

		`SITE ACTUEL :



%s



ACTIVITÉ :

%s



VILLE :

%s



STYLE :

%s



COULEUR :

%s



DEMANDE :

%s`,

		string(currentJSON),

		input.Activity,

		input.City,

		currentDesign,

		currentColor,

		input.Instruction,
	)

	outputText, err := callOpenAI(

		instructions,

		userPrompt,

		"siteai_modified_site",

		modifiedSiteSchema(),
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	var result ModifySiteOutput

	err = json.Unmarshal(

		[]byte(outputText),

		&result,
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	if strings.TrimSpace(

		result.Site.BusinessName,
	) == "" {

		result.Site.BusinessName =

			input.Site.BusinessName

	}

	if strings.TrimSpace(

		result.Site.Phone,
	) == "" {

		result.Site.Phone =

			input.Site.Phone

	}

	if strings.TrimSpace(

		result.Site.HeroTitle,
	) == "" {

		result.Site.HeroTitle =

			input.Site.HeroTitle

	}

	if strings.TrimSpace(

		result.Site.HeroText,
	) == "" {

		result.Site.HeroText =

			input.Site.HeroText

	}

	if strings.TrimSpace(

		result.Site.MetaTitle,
	) == "" {

		result.Site.MetaTitle =

			input.Site.MetaTitle

	}

	if strings.TrimSpace(

		result.Site.MetaDescription,
	) == "" {

		result.Site.MetaDescription =

			input.Site.MetaDescription

	}

	if len(

		result.Site.Sections,
	) == 0 {

		result.Site.Sections =

			input.Site.Sections

	}

	// Le logo est géré par l'utilisateur dans Supabase Storage.
	// L'IA ne doit jamais le supprimer ou le remplacer.
	result.Site.LogoURL = input.Site.LogoURL

	result.Site.Slug = slugify(

		result.Site.BusinessName,
	)

	result.DesignStyle = normalizeDesignStyle(

		result.DesignStyle,
	)

	result.AccentColor = normalizeAccentColor(

		result.AccentColor,

		currentColor,
	)

	return result, nil

}

func callOpenAI(

	instructions string,

	input string,

	schemaName string,

	schema map[string]any,

) (string, error) {

	model := os.Getenv("OPENAI_MODEL")

	if model == "" {

		model = "gpt-5.6-luna"

	}

	requestBody := map[string]any{

		"model": model,

		"store": false,

		"instructions": instructions,

		"input": input,

		"text": map[string]any{

			"format": map[string]any{

				"type": "json_schema",

				"name": schemaName,

				"strict": true,

				"schema": schema,
			},
		},
	}

	body, err := json.Marshal(requestBody)

	if err != nil {

		return "", err

	}

	request, err := http.NewRequest(

		http.MethodPost,

		"https://api.openai.com/v1/responses",

		bytes.NewBuffer(body),
	)

	if err != nil {

		return "", err

	}

	request.Header.Set(

		"Content-Type",

		"application/json",
	)

	request.Header.Set(

		"Authorization",

		"Bearer "+os.Getenv("OPENAI_API_KEY"),
	)

	client := &http.Client{

		Timeout: 60 * time.Second,
	}

	response, err := client.Do(request)

	if err != nil {

		return "", err

	}

	defer response.Body.Close()

	responseBody, err := io.ReadAll(

		response.Body,
	)

	if err != nil {

		return "", err

	}

	if response.StatusCode < 200 ||

		response.StatusCode >= 300 {

		return "",

			fmt.Errorf(

				"OpenAI HTTP %d : %s",

				response.StatusCode,

				string(responseBody),
			)

	}

	var parsed OpenAIResponse

	err = json.Unmarshal(

		responseBody,

		&parsed,
	)

	if err != nil {

		return "", err

	}

	for _, output := range parsed.Output {

		for _, content := range output.Content {

			if content.Type == "output_text" {

				return content.Text, nil

			}

		}

	}

	return "", errors.New("aucun texte retourné")

}

func generatedContentSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"metaTitle": map[string]any{

				"type": "string",
			},

			"metaDescription": map[string]any{

				"type": "string",
			},

			"heroTitle": map[string]any{

				"type": "string",
			},

			"heroText": map[string]any{

				"type": "string",
			},

			"sections": sectionsSchema(),
		},

		"required": []string{

			"metaTitle",

			"metaDescription",

			"heroTitle",

			"heroText",

			"sections",
		},
	}

}

func modifiedSiteSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"site": siteSchema(),

			"designStyle": map[string]any{

				"type": "string",

				"enum": []string{

					"moderne",

					"elegant",

					"artisan",
				},
			},

			"accentColor": map[string]any{

				"type": "string",
			},
		},

		"required": []string{

			"site",

			"designStyle",

			"accentColor",
		},
	}

}

func siteSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"businessName": map[string]any{

				"type": "string",
			},

			"slug": map[string]any{

				"type": "string",
			},

			"metaTitle": map[string]any{

				"type": "string",
			},

			"metaDescription": map[string]any{

				"type": "string",
			},

			"heroTitle": map[string]any{

				"type": "string",
			},

			"heroText": map[string]any{

				"type": "string",
			},

			"phone": map[string]any{

				"type": "string",
			},

			"sections": sectionsSchema(),
		},

		"required": []string{

			"businessName",

			"slug",

			"metaTitle",

			"metaDescription",

			"heroTitle",

			"heroText",

			"phone",

			"sections",
		},
	}

}

func sectionsSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"title": map[string]any{

					"type": "string",
				},

				"text": map[string]any{

					"type": "string",
				},
			},

			"required": []string{

				"title",

				"text",
			},
		},
	}

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

func enableCORS(w http.ResponseWriter) {

	w.Header().Set(

		"Access-Control-Allow-Origin",

		"http://localhost:3000",
	)

	w.Header().Set(

		"Access-Control-Allow-Methods",

		"GET, POST, PUT, DELETE, OPTIONS",
	)

	w.Header().Set(

		"Access-Control-Allow-Headers",

		"Content-Type, Authorization",
	)

}

func writeJSON(

	w http.ResponseWriter,

	status int,

	data any,

) {

	w.Header().Set(

		"Content-Type",

		"application/json",
	)

	w.WriteHeader(status)

	err := json.NewEncoder(w).Encode(data)

	if err != nil {

		log.Println("Erreur JSON :", err)

	}

}
