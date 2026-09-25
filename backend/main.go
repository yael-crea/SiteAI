package main

import (
	"bytes"

	"crypto/hmac"

	"crypto/sha256"

	"encoding/hex"

	"context"

	"encoding/json"

	"errors"

	"fmt"

	"io"

	"log"

	"net/http"

	"net/url"

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

	HeroImageURL string `json:"heroImageUrl"`

	Gallery []string `json:"gallery"`

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

type DomainInput struct {
	Domain string `json:"domain"`
}

type VercelVerification struct {
	Type   string `json:"type,omitempty"`
	Domain string `json:"domain,omitempty"`
	Value  string `json:"value,omitempty"`
	Reason string `json:"reason,omitempty"`
}

type VercelProjectDomain struct {
	Name         string               `json:"name"`
	ApexName     string               `json:"apexName"`
	ProjectID    string               `json:"projectId"`
	Verified     bool                 `json:"verified"`
	Verification []VercelVerification `json:"verification,omitempty"`
}

type VercelRecommendedRecord struct {
	Rank  string      `json:"rank"`
	Value interface{} `json:"value"`
}

type VercelDomainConfig struct {
	AcceptedChallenges []string                  `json:"acceptedChallenges"`
	ConfiguredBy       *string                   `json:"configuredBy"`
	RecommendedCNAME   []VercelRecommendedRecord `json:"recommendedCNAME"`
	RecommendedIPv4    []VercelRecommendedRecord `json:"recommendedIPv4"`
	Misconfigured      bool                      `json:"misconfigured"`
}

type DomainStatus struct {
	Domain           string                    `json:"domain"`
	Verified         bool                      `json:"verified"`
	Configured       bool                      `json:"configured"`
	ConfiguredBy     string                    `json:"configuredBy,omitempty"`
	Verification     []VercelVerification      `json:"verification,omitempty"`
	RecommendedCNAME []VercelRecommendedRecord `json:"recommendedCNAME,omitempty"`
	RecommendedIPv4  []VercelRecommendedRecord `json:"recommendedIPv4,omitempty"`
	Message          string                    `json:"message,omitempty"`
}

type StripeCheckoutInput struct {
	Plan string `json:"plan"`
}

type StripeCheckoutSession struct {
	ID           string            `json:"id"`
	URL          string            `json:"url"`
	Customer     string            `json:"customer"`
	Subscription string            `json:"subscription"`
	Metadata     map[string]string `json:"metadata"`
}

type StripeCustomer struct {
	ID string `json:"id"`
}

type StripePortalSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type StripeSubscription struct {
	ID                string            `json:"id"`
	Customer          string            `json:"customer"`
	Status            string            `json:"status"`
	CancelAtPeriodEnd bool              `json:"cancel_at_period_end"`
	Metadata          map[string]string `json:"metadata"`
	Items             struct {
		Data []struct {
			CurrentPeriodEnd int64 `json:"current_period_end"`
			Price            struct {
				ID string `json:"id"`
			} `json:"price"`
		} `json:"data"`
	} `json:"items"`
}

type StripeInvoice struct {
	Customer string `json:"customer"`
}

type StripeEvent struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

type BillingStatus struct {
	Plan              string     `json:"plan"`
	Status            string     `json:"status"`
	HasSubscription   bool       `json:"hasSubscription"`
	CancelAtPeriodEnd bool       `json:"cancelAtPeriodEnd"`
	CurrentPeriodEnd  *time.Time `json:"currentPeriodEnd,omitempty"`
	CanManage         bool       `json:"canManage"`
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

	http.HandleFunc("/public-domains/", publicDomainHandler)

	http.HandleFunc("/stripe/checkout", stripeCheckoutHandler)

	http.HandleFunc("/stripe/portal", stripePortalHandler)

	http.HandleFunc("/stripe/status", stripeStatusHandler)

	http.HandleFunc("/stripe/webhook", stripeWebhookHandler)

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

	fmt.Println("Stripe :", stripeIntegrationStatus())

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

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain TEXT;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain_updated_at TIMESTAMPTZ;

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain

        ON sites(LOWER(custom_domain))

        WHERE custom_domain IS NOT NULL AND custom_domain <> '';

        `,

		`

        CREATE TABLE IF NOT EXISTS user_billing (

            user_id UUID PRIMARY KEY,

            stripe_customer_id TEXT,

            stripe_subscription_id TEXT,

            stripe_price_id TEXT,

            plan TEXT NOT NULL DEFAULT 'free',

            subscription_status TEXT NOT NULL DEFAULT 'inactive',

            current_period_end TIMESTAMPTZ,

            cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_billing_customer

        ON user_billing(stripe_customer_id)

        WHERE stripe_customer_id IS NOT NULL AND stripe_customer_id <> '';

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_billing_subscription

        ON user_billing(stripe_subscription_id)

        WHERE stripe_subscription_id IS NOT NULL AND stripe_subscription_id <> '';

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

			"customDomains": domainIntegrationStatus(),

			"stripe": stripeIntegrationStatus(),
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
	WHERE LOWER(custom_domain) = LOWER($1)
	  AND published = TRUE
	LIMIT 1;
	`

	var publicSite PublicSite
	var siteJSON []byte

	err := db.QueryRow(r.Context(), query, domain).Scan(
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
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}

		log.Println("Erreur site public par domaine :", err)
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(siteJSON, &publicSite.Site); err != nil {
		http.Error(w, "Site invalide", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, publicSite)
}

func getDomainHandler(
	w http.ResponseWriter,
	r *http.Request,
	id int64,
	userID string,
) {
	domain, localVerified, err := getStoredDomain(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}

		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	if domain == "" {
		writeJSON(w, http.StatusOK, DomainStatus{
			Domain:     "",
			Verified:   false,
			Configured: false,
			Message:    "Aucun domaine personnalisé configuré.",
		})
		return
	}

	projectDomain, err := getVercelProjectDomain(r.Context(), domain)
	if err != nil {
		writeJSON(w, http.StatusOK, DomainStatus{
			Domain:     domain,
			Verified:   localVerified,
			Configured: false,
			Message:    err.Error(),
		})
		return
	}

	config, configErr := getVercelDomainConfig(r.Context(), domain)
	configured := false
	configuredBy := ""
	var recommendedCNAME []VercelRecommendedRecord
	var recommendedIPv4 []VercelRecommendedRecord

	if configErr == nil {
		configured = !config.Misconfigured
		if config.ConfiguredBy != nil {
			configuredBy = *config.ConfiguredBy
		}
		recommendedCNAME = config.RecommendedCNAME
		recommendedIPv4 = config.RecommendedIPv4
	}

	verified := projectDomain.Verified
	if verified != localVerified {
		_ = updateStoredDomainVerification(r.Context(), id, userID, verified)
	}

	status := DomainStatus{
		Domain:           domain,
		Verified:         verified,
		Configured:       configured,
		ConfiguredBy:     configuredBy,
		Verification:     projectDomain.Verification,
		RecommendedCNAME: recommendedCNAME,
		RecommendedIPv4:  recommendedIPv4,
	}

	if configErr != nil {
		status.Message = configErr.Error()
	}

	writeJSON(w, http.StatusOK, status)
}

func addDomainHandler(
	w http.ResponseWriter,
	r *http.Request,
	id int64,
	userID string,
) {
	if !domainIntegrationConfigured() {
		http.Error(w, "Intégration Vercel non configurée", http.StatusServiceUnavailable)
		return
	}

	var input DomainInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	domain := normalizeDomain(input.Domain)
	if !isValidDomain(domain) {
		http.Error(w, "Domaine invalide", http.StatusBadRequest)
		return
	}

	storedDomain, _, err := getStoredDomain(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	if storedDomain != "" && !strings.EqualFold(storedDomain, domain) {
		http.Error(w, "Supprime d'abord le domaine actuel avant d'en ajouter un autre", http.StatusConflict)
		return
	}

	var projectDomain VercelProjectDomain
	projectDomain, err = addVercelProjectDomain(r.Context(), domain)
	if err != nil {
		projectDomain, err = getVercelProjectDomain(r.Context(), domain)
		if err != nil {
			http.Error(w, "Vercel : "+err.Error(), http.StatusBadGateway)
			return
		}
	}

	_, err = db.Exec(
		r.Context(),
		`UPDATE sites
		 SET custom_domain = $1,
		     custom_domain_verified = $2,
		     custom_domain_updated_at = NOW(),
		     updated_at = NOW()
		 WHERE id = $3 AND user_id = $4::uuid`,
		domain,
		projectDomain.Verified,
		id,
		userID,
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "idx_sites_custom_domain") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			http.Error(w, "Ce domaine est déjà utilisé par un autre site", http.StatusConflict)
			return
		}
		http.Error(w, "Impossible d'enregistrer le domaine", http.StatusInternalServerError)
		return
	}

	config, configErr := getVercelDomainConfig(r.Context(), domain)
	status := DomainStatus{
		Domain:       domain,
		Verified:     projectDomain.Verified,
		Verification: projectDomain.Verification,
	}

	if configErr == nil {
		status.Configured = !config.Misconfigured
		if config.ConfiguredBy != nil {
			status.ConfiguredBy = *config.ConfiguredBy
		}
		status.RecommendedCNAME = config.RecommendedCNAME
		status.RecommendedIPv4 = config.RecommendedIPv4
	} else {
		status.Message = configErr.Error()
	}

	writeJSON(w, http.StatusOK, status)
}

func verifyDomainHandler(
	w http.ResponseWriter,
	r *http.Request,
	id int64,
	userID string,
) {
	if !domainIntegrationConfigured() {
		http.Error(w, "Intégration Vercel non configurée", http.StatusServiceUnavailable)
		return
	}

	domain, _, err := getStoredDomain(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	if domain == "" {
		http.Error(w, "Aucun domaine configuré", http.StatusBadRequest)
		return
	}

	projectDomain, err := verifyVercelProjectDomain(r.Context(), domain)
	if err != nil {
		projectDomain, getErr := getVercelProjectDomain(r.Context(), domain)
		if getErr != nil {
			http.Error(w, "Vercel : "+err.Error(), http.StatusBadGateway)
			return
		}
		_ = projectDomain
	}

	_ = updateStoredDomainVerification(r.Context(), id, userID, projectDomain.Verified)

	config, configErr := getVercelDomainConfig(r.Context(), domain)
	status := DomainStatus{
		Domain:       domain,
		Verified:     projectDomain.Verified,
		Verification: projectDomain.Verification,
	}

	if configErr == nil {
		status.Configured = !config.Misconfigured
		if config.ConfiguredBy != nil {
			status.ConfiguredBy = *config.ConfiguredBy
		}
		status.RecommendedCNAME = config.RecommendedCNAME
		status.RecommendedIPv4 = config.RecommendedIPv4
	} else {
		status.Message = configErr.Error()
	}

	writeJSON(w, http.StatusOK, status)
}

func deleteDomainHandler(
	w http.ResponseWriter,
	r *http.Request,
	id int64,
	userID string,
) {
	domain, _, err := getStoredDomain(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Site introuvable", http.StatusNotFound)
			return
		}
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	if domain == "" {
		writeJSON(w, http.StatusOK, DomainStatus{Message: "Aucun domaine à supprimer."})
		return
	}

	if domainIntegrationConfigured() {
		if err := deleteVercelProjectDomain(r.Context(), domain); err != nil && !strings.Contains(strings.ToLower(err.Error()), "404") {
			http.Error(w, "Vercel : "+err.Error(), http.StatusBadGateway)
			return
		}
	}

	_, err = db.Exec(
		r.Context(),
		`UPDATE sites
		 SET custom_domain = NULL,
		     custom_domain_verified = FALSE,
		     custom_domain_updated_at = NOW(),
		     updated_at = NOW()
		 WHERE id = $1 AND user_id = $2::uuid`,
		id,
		userID,
	)
	if err != nil {
		http.Error(w, "Impossible de supprimer le domaine", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, DomainStatus{Message: "Domaine supprimé."})
}

func getStoredDomain(
	ctx context.Context,
	id int64,
	userID string,
) (string, bool, error) {
	var domain string
	var verified bool

	err := db.QueryRow(
		ctx,
		`SELECT COALESCE(custom_domain, ''), custom_domain_verified
		 FROM sites
		 WHERE id = $1 AND user_id = $2::uuid`,
		id,
		userID,
	).Scan(&domain, &verified)

	return domain, verified, err
}

func updateStoredDomainVerification(
	ctx context.Context,
	id int64,
	userID string,
	verified bool,
) error {
	_, err := db.Exec(
		ctx,
		`UPDATE sites
		 SET custom_domain_verified = $1,
		     custom_domain_updated_at = NOW()
		 WHERE id = $2 AND user_id = $3::uuid`,
		verified,
		id,
		userID,
	)
	return err
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
	result.Site.HeroImageURL = input.Site.HeroImageURL
	result.Site.Gallery = input.Site.Gallery

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

func domainIntegrationConfigured() bool {
	return strings.TrimSpace(os.Getenv("VERCEL_ACCESS_TOKEN")) != "" &&
		strings.TrimSpace(os.Getenv("VERCEL_PROJECT_ID")) != ""
}

func domainIntegrationStatus() string {
	if domainIntegrationConfigured() {
		return "enabled"
	}
	return "disabled"
}

func normalizeDomain(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.TrimPrefix(value, "https://")
	value = strings.TrimPrefix(value, "http://")

	if slash := strings.Index(value, "/"); slash >= 0 {
		value = value[:slash]
	}

	if colon := strings.Index(value, ":"); colon >= 0 {
		value = value[:colon]
	}

	return strings.TrimSuffix(value, ".")
}

func isValidDomain(value string) bool {
	if len(value) < 3 || len(value) > 253 || strings.Contains(value, " ") {
		return false
	}

	if value == "localhost" || strings.HasSuffix(value, ".localhost") {
		return false
	}

	labels := strings.Split(value, ".")
	if len(labels) < 2 {
		return false
	}

	labelPattern := regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)
	for _, label := range labels {
		if !labelPattern.MatchString(label) {
			return false
		}
	}

	return true
}

func vercelProjectDomainURL(domain string) (string, error) {
	projectID := strings.TrimSpace(os.Getenv("VERCEL_PROJECT_ID"))
	if projectID == "" {
		return "", errors.New("VERCEL_PROJECT_ID manquant")
	}

	base := "https://api.vercel.com/v9/projects/" + url.PathEscape(projectID) + "/domains"
	if domain != "" {
		base += "/" + url.PathEscape(domain)
	}

	return withVercelTeamID(base), nil
}

func withVercelTeamID(rawURL string) string {
	teamID := strings.TrimSpace(os.Getenv("VERCEL_TEAM_ID"))
	if teamID == "" {
		return rawURL
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}

	query := parsed.Query()
	query.Set("teamId", teamID)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func doVercelRequest(
	ctx context.Context,
	method string,
	rawURL string,
	body any,
	out any,
) error {
	token := strings.TrimSpace(os.Getenv("VERCEL_ACCESS_TOKEN"))
	if token == "" {
		return errors.New("VERCEL_ACCESS_TOKEN manquant")
	}

	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, reader)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := strings.TrimSpace(string(data))
		if message == "" {
			message = response.Status
		}
		return fmt.Errorf("Vercel %d: %s", response.StatusCode, message)
	}

	if out != nil && len(data) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			return err
		}
	}

	return nil
}

func addVercelProjectDomain(
	ctx context.Context,
	domain string,
) (VercelProjectDomain, error) {
	rawURL, err := vercelProjectDomainURL("")
	if err != nil {
		return VercelProjectDomain{}, err
	}

	var result VercelProjectDomain
	err = doVercelRequest(
		ctx,
		http.MethodPost,
		rawURL,
		map[string]string{"name": domain},
		&result,
	)
	return result, err
}

func getVercelProjectDomain(
	ctx context.Context,
	domain string,
) (VercelProjectDomain, error) {
	rawURL, err := vercelProjectDomainURL(domain)
	if err != nil {
		return VercelProjectDomain{}, err
	}

	var result VercelProjectDomain
	err = doVercelRequest(ctx, http.MethodGet, rawURL, nil, &result)
	return result, err
}

func verifyVercelProjectDomain(
	ctx context.Context,
	domain string,
) (VercelProjectDomain, error) {
	rawURL, err := vercelProjectDomainURL(domain)
	if err != nil {
		return VercelProjectDomain{}, err
	}

	if parsed, parseErr := url.Parse(rawURL); parseErr == nil {
		parsed.Path += "/verify"
		rawURL = parsed.String()
	} else {
		rawURL += "/verify"
	}

	var result VercelProjectDomain
	err = doVercelRequest(ctx, http.MethodPost, rawURL, nil, &result)
	return result, err
}

func deleteVercelProjectDomain(
	ctx context.Context,
	domain string,
) error {
	rawURL, err := vercelProjectDomainURL(domain)
	if err != nil {
		return err
	}

	return doVercelRequest(ctx, http.MethodDelete, rawURL, nil, nil)
}

func getVercelDomainConfig(
	ctx context.Context,
	domain string,
) (VercelDomainConfig, error) {
	projectID := strings.TrimSpace(os.Getenv("VERCEL_PROJECT_ID"))
	if projectID == "" {
		return VercelDomainConfig{}, errors.New("VERCEL_PROJECT_ID manquant")
	}

	rawURL := "https://api.vercel.com/v6/domains/" + url.PathEscape(domain) + "/config"
	parsed, err := url.Parse(withVercelTeamID(rawURL))
	if err != nil {
		return VercelDomainConfig{}, err
	}

	query := parsed.Query()
	query.Set("projectIdOrName", projectID)
	parsed.RawQuery = query.Encode()

	var result VercelDomainConfig
	err = doVercelRequest(ctx, http.MethodGet, parsed.String(), nil, &result)
	return result, err
}

func stripeIntegrationConfigured() bool {
	return strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")) != "" &&
		strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET")) != "" &&
		strings.TrimSpace(os.Getenv("STRIPE_PRICE_ESSENTIEL")) != "" &&
		strings.TrimSpace(os.Getenv("STRIPE_PRICE_PRO")) != "" &&
		strings.TrimSpace(os.Getenv("STRIPE_PRICE_AGENCE")) != ""
}

func stripeIntegrationStatus() string {
	if stripeIntegrationConfigured() {
		return "enabled"
	}
	return "disabled"
}

func frontendURL() string {
	value := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/")
	if value == "" {
		return "http://localhost:3000"
	}
	return value
}

func stripePriceForPlan(plan string) (string, string, error) {
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "essentiel":
		price := strings.TrimSpace(os.Getenv("STRIPE_PRICE_ESSENTIEL"))
		if price == "" {
			return "", "", errors.New("STRIPE_PRICE_ESSENTIEL manquant")
		}
		return "essentiel", price, nil
	case "pro":
		price := strings.TrimSpace(os.Getenv("STRIPE_PRICE_PRO"))
		if price == "" {
			return "", "", errors.New("STRIPE_PRICE_PRO manquant")
		}
		return "pro", price, nil
	case "agence":
		price := strings.TrimSpace(os.Getenv("STRIPE_PRICE_AGENCE"))
		if price == "" {
			return "", "", errors.New("STRIPE_PRICE_AGENCE manquant")
		}
		return "agence", price, nil
	default:
		return "", "", errors.New("formule invalide")
	}
}

func planFromStripePrice(priceID string) string {
	switch strings.TrimSpace(priceID) {
	case strings.TrimSpace(os.Getenv("STRIPE_PRICE_ESSENTIEL")):
		return "essentiel"
	case strings.TrimSpace(os.Getenv("STRIPE_PRICE_PRO")):
		return "pro"
	case strings.TrimSpace(os.Getenv("STRIPE_PRICE_AGENCE")):
		return "agence"
	default:
		return ""
	}
}

func doStripeForm(
	ctx context.Context,
	method string,
	path string,
	values url.Values,
	out any,
) error {
	secret := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if secret == "" {
		return errors.New("STRIPE_SECRET_KEY manquant")
	}

	if values == nil {
		values = url.Values{}
	}

	req, err := http.NewRequestWithContext(
		ctx,
		method,
		"https://api.stripe.com"+path,
		strings.NewReader(values.Encode()),
	)
	if err != nil {
		return err
	}

	req.SetBasicAuth(secret, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var stripeError struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}

		if json.Unmarshal(data, &stripeError) == nil &&
			strings.TrimSpace(stripeError.Error.Message) != "" {
			return errors.New(stripeError.Error.Message)
		}

		message := strings.TrimSpace(string(data))
		if message == "" {
			message = response.Status
		}

		return fmt.Errorf("Stripe %d: %s", response.StatusCode, message)
	}

	if out != nil && len(data) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			return err
		}
	}

	return nil
}

func getBillingStatus(
	ctx context.Context,
	userID string,
) (BillingStatus, string, string, error) {
	var customerID string
	var subscriptionID string
	var priceID string
	var plan string
	var status string
	var currentPeriodEnd *time.Time
	var cancelAtPeriodEnd bool

	err := db.QueryRow(
		ctx,
		`
		SELECT
			COALESCE(stripe_customer_id, ''),
			COALESCE(stripe_subscription_id, ''),
			COALESCE(stripe_price_id, ''),
			COALESCE(plan, 'free'),
			COALESCE(subscription_status, 'inactive'),
			current_period_end,
			COALESCE(cancel_at_period_end, FALSE)
		FROM user_billing
		WHERE user_id = $1::uuid;
		`,
		userID,
	).Scan(
		&customerID,
		&subscriptionID,
		&priceID,
		&plan,
		&status,
		&currentPeriodEnd,
		&cancelAtPeriodEnd,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return BillingStatus{
			Plan:            "free",
			Status:          "inactive",
			HasSubscription: false,
			CanManage:       false,
		}, "", "", nil
	}

	if err != nil {
		return BillingStatus{}, "", "", err
	}

	hasSubscription := subscriptionID != "" &&
		status != "canceled" &&
		status != "incomplete_expired"

	return BillingStatus{
		Plan:              plan,
		Status:            status,
		HasSubscription:   hasSubscription,
		CancelAtPeriodEnd: cancelAtPeriodEnd,
		CurrentPeriodEnd:  currentPeriodEnd,
		CanManage:         customerID != "",
	}, customerID, subscriptionID, nil
}

func ensureStripeCustomer(
	ctx context.Context,
	user SupabaseUser,
) (string, error) {
	_, customerID, _, err := getBillingStatus(ctx, user.ID)
	if err != nil {
		return "", err
	}

	if customerID != "" {
		return customerID, nil
	}

	values := url.Values{}
	if strings.TrimSpace(user.Email) != "" {
		values.Set("email", strings.TrimSpace(user.Email))
	}
	values.Set("metadata[user_id]", user.ID)
	values.Set("description", "SiteAI customer")

	var customer StripeCustomer
	if err := doStripeForm(
		ctx,
		http.MethodPost,
		"/v1/customers",
		values,
		&customer,
	); err != nil {
		return "", err
	}

	if customer.ID == "" {
		return "", errors.New("Stripe n'a pas retourné de customer")
	}

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO user_billing (
			user_id,
			stripe_customer_id,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			NOW()
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			updated_at = NOW();
		`,
		user.ID,
		customer.ID,
	)
	if err != nil {
		return "", err
	}

	return customer.ID, nil
}

func stripeCheckoutHandler(
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

	if !stripeIntegrationConfigured() {
		http.Error(w, "Intégration Stripe non configurée", http.StatusServiceUnavailable)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	var input StripeCheckoutInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	plan, priceID, err := stripePriceForPlan(input.Plan)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	status, _, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire l'abonnement", http.StatusInternalServerError)
		return
	}

	if status.Status == "active" ||
		status.Status == "trialing" ||
		status.Status == "past_due" {
		http.Error(
			w,
			"Un abonnement existe déjà. Utilise le portail client pour le gérer.",
			http.StatusConflict,
		)
		return
	}

	customerID, err := ensureStripeCustomer(r.Context(), user)
	if err != nil {
		log.Println("Erreur customer Stripe :", err)
		http.Error(w, "Impossible de préparer le paiement", http.StatusBadGateway)
		return
	}

	baseURL := frontendURL()

	values := url.Values{}
	values.Set("mode", "subscription")
	values.Set("customer", customerID)
	values.Set("client_reference_id", user.ID)
	values.Set("line_items[0][price]", priceID)
	values.Set("line_items[0][quantity]", "1")
	values.Set("success_url", baseURL+"/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}")
	values.Set("cancel_url", baseURL+"/dashboard?checkout=cancel")
	values.Set("locale", "fr")
	values.Set("metadata[user_id]", user.ID)
	values.Set("metadata[plan]", plan)
	values.Set("subscription_data[metadata][user_id]", user.ID)
	values.Set("subscription_data[metadata][plan]", plan)

	var session StripeCheckoutSession
	if err := doStripeForm(
		r.Context(),
		http.MethodPost,
		"/v1/checkout/sessions",
		values,
		&session,
	); err != nil {
		log.Println("Erreur Checkout Stripe :", err)
		http.Error(w, "Impossible de créer la page de paiement : "+err.Error(), http.StatusBadGateway)
		return
	}

	if session.URL == "" {
		http.Error(w, "Stripe n'a pas retourné d'URL de paiement", http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url":       session.URL,
		"sessionId": session.ID,
	})
}

func stripePortalHandler(
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

	if strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")) == "" {
		http.Error(w, "Intégration Stripe non configurée", http.StatusServiceUnavailable)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	_, customerID, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire l'abonnement", http.StatusInternalServerError)
		return
	}

	if customerID == "" {
		http.Error(w, "Aucun compte Stripe associé", http.StatusBadRequest)
		return
	}

	values := url.Values{}
	values.Set("customer", customerID)
	values.Set("return_url", frontendURL()+"/dashboard")

	var session StripePortalSession
	if err := doStripeForm(
		r.Context(),
		http.MethodPost,
		"/v1/billing_portal/sessions",
		values,
		&session,
	); err != nil {
		log.Println("Erreur portail Stripe :", err)
		http.Error(w, "Impossible d'ouvrir le portail Stripe : "+err.Error(), http.StatusBadGateway)
		return
	}

	if session.URL == "" {
		http.Error(w, "Stripe n'a pas retourné d'URL de portail", http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url": session.URL,
	})
}

func stripeStatusHandler(
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

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	status, _, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire l'abonnement", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, status)
}

func stripeWebhookHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	secret := strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if secret == "" {
		http.Error(w, "Webhook Stripe non configuré", http.StatusServiceUnavailable)
		return
	}

	payload, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		http.Error(w, "Payload invalide", http.StatusBadRequest)
		return
	}

	signature := r.Header.Get("Stripe-Signature")
	if err := verifyStripeSignature(payload, signature, secret); err != nil {
		log.Println("Signature Stripe invalide :", err)
		http.Error(w, "Signature Stripe invalide", http.StatusBadRequest)
		return
	}

	var event StripeEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		http.Error(w, "Événement Stripe invalide", http.StatusBadRequest)
		return
	}

	if err := processStripeEvent(r.Context(), event); err != nil {
		log.Println("Erreur traitement webhook Stripe :", event.Type, err)
		http.Error(w, "Erreur traitement webhook", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"received": true})
}

func verifyStripeSignature(
	payload []byte,
	header string,
	secret string,
) error {
	var timestamp string
	signatures := []string{}

	for _, part := range strings.Split(header, ",") {
		pair := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(pair) != 2 {
			continue
		}

		switch pair[0] {
		case "t":
			timestamp = pair[1]
		case "v1":
			signatures = append(signatures, pair[1])
		}
	}

	if timestamp == "" || len(signatures) == 0 {
		return errors.New("en-tête Stripe-Signature incomplet")
	}

	unixTimestamp, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return errors.New("timestamp Stripe invalide")
	}

	eventTime := time.Unix(unixTimestamp, 0)
	delta := time.Since(eventTime)
	if delta < 0 {
		delta = -delta
	}
	if delta > 5*time.Minute {
		return errors.New("timestamp Stripe trop ancien")
	}

	signedPayload := []byte(timestamp + "." + string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(signedPayload)
	expected := mac.Sum(nil)

	for _, candidate := range signatures {
		provided, err := hex.DecodeString(candidate)
		if err != nil {
			continue
		}

		if hmac.Equal(expected, provided) {
			return nil
		}
	}

	return errors.New("aucune signature v1 valide")
}

func processStripeEvent(
	ctx context.Context,
	event StripeEvent,
) error {
	switch event.Type {
	case "checkout.session.completed":
		var session StripeCheckoutSession
		if err := json.Unmarshal(event.Data.Object, &session); err != nil {
			return err
		}
		return syncCheckoutSession(ctx, session)

	case "customer.subscription.created",
		"customer.subscription.updated",
		"customer.subscription.deleted":
		var subscription StripeSubscription
		if err := json.Unmarshal(event.Data.Object, &subscription); err != nil {
			return err
		}
		return syncStripeSubscription(ctx, subscription)

	case "invoice.paid",
		"invoice.payment_failed":
		var invoice StripeInvoice
		if err := json.Unmarshal(event.Data.Object, &invoice); err != nil {
			return err
		}

		if invoice.Customer == "" {
			return nil
		}

		var subscriptionID string
		err := db.QueryRow(
			ctx,
			`
			SELECT COALESCE(stripe_subscription_id, '')
			FROM user_billing
			WHERE stripe_customer_id = $1;
			`,
			invoice.Customer,
		).Scan(&subscriptionID)

		if errors.Is(err, pgx.ErrNoRows) || subscriptionID == "" {
			return nil
		}

		if err != nil {
			return err
		}

		subscription, err := retrieveStripeSubscription(ctx, subscriptionID)
		if err != nil {
			return err
		}

		return syncStripeSubscription(ctx, subscription)

	default:
		return nil
	}
}

func syncCheckoutSession(
	ctx context.Context,
	session StripeCheckoutSession,
) error {
	userID := strings.TrimSpace(session.Metadata["user_id"])
	plan := strings.TrimSpace(session.Metadata["plan"])

	if userID == "" {
		userID = strings.TrimSpace(session.Metadata["userid"])
	}

	if userID == "" || session.Customer == "" {
		return nil
	}

	if plan == "" {
		plan = "free"
	}

	_, err := db.Exec(
		ctx,
		`
		INSERT INTO user_billing (
			user_id,
			stripe_customer_id,
			stripe_subscription_id,
			plan,
			subscription_status,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			NULLIF($3, ''),
			$4,
			CASE WHEN $3 = '' THEN 'inactive' ELSE 'incomplete' END,
			NOW()
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_billing.stripe_subscription_id),
			plan = CASE
				WHEN EXCLUDED.plan = 'free' THEN user_billing.plan
				ELSE EXCLUDED.plan
			END,
			updated_at = NOW();
		`,
		userID,
		session.Customer,
		session.Subscription,
		plan,
	)
	if err != nil {
		return err
	}

	if session.Subscription != "" {
		subscription, err := retrieveStripeSubscription(ctx, session.Subscription)
		if err != nil {
			return err
		}
		return syncStripeSubscription(ctx, subscription)
	}

	return nil
}

func retrieveStripeSubscription(
	ctx context.Context,
	subscriptionID string,
) (StripeSubscription, error) {
	var subscription StripeSubscription

	err := doStripeForm(
		ctx,
		http.MethodGet,
		"/v1/subscriptions/"+url.PathEscape(subscriptionID),
		nil,
		&subscription,
	)

	return subscription, err
}

func syncStripeSubscription(
	ctx context.Context,
	subscription StripeSubscription,
) error {
	if subscription.ID == "" || subscription.Customer == "" {
		return nil
	}

	userID := strings.TrimSpace(subscription.Metadata["user_id"])
	plan := strings.TrimSpace(subscription.Metadata["plan"])

	var priceID string
	var periodEndUnix int64

	if len(subscription.Items.Data) > 0 {
		priceID = strings.TrimSpace(subscription.Items.Data[0].Price.ID)

		for _, item := range subscription.Items.Data {
			if item.CurrentPeriodEnd > periodEndUnix {
				periodEndUnix = item.CurrentPeriodEnd
			}
		}
	}

	if plan == "" {
		plan = planFromStripePrice(priceID)
	}

	if userID == "" {
		err := db.QueryRow(
			ctx,
			`
			SELECT user_id::text
			FROM user_billing
			WHERE
				stripe_customer_id = $1
				OR stripe_subscription_id = $2
			LIMIT 1;
			`,
			subscription.Customer,
			subscription.ID,
		).Scan(&userID)

		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}

		if err != nil {
			return err
		}
	}

	if plan == "" {
		plan = "free"
	}

	var currentPeriodEnd any
	if periodEndUnix > 0 {
		currentPeriodEnd = time.Unix(periodEndUnix, 0).UTC()
	}

	if subscription.Status == "canceled" ||
		subscription.Status == "incomplete_expired" {
		if plan == "" {
			plan = "free"
		}
	}

	_, err := db.Exec(
		ctx,
		`
		INSERT INTO user_billing (
			user_id,
			stripe_customer_id,
			stripe_subscription_id,
			stripe_price_id,
			plan,
			subscription_status,
			current_period_end,
			cancel_at_period_end,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			$3,
			NULLIF($4, ''),
			$5,
			$6,
			$7,
			$8,
			NOW()
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			stripe_subscription_id = EXCLUDED.stripe_subscription_id,
			stripe_price_id = EXCLUDED.stripe_price_id,
			plan = EXCLUDED.plan,
			subscription_status = EXCLUDED.subscription_status,
			current_period_end = EXCLUDED.current_period_end,
			cancel_at_period_end = EXCLUDED.cancel_at_period_end,
			updated_at = NOW();
		`,
		userID,
		subscription.Customer,
		subscription.ID,
		priceID,
		plan,
		subscription.Status,
		currentPeriodEnd,
		subscription.CancelAtPeriodEnd,
	)

	return err
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