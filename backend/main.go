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

	"html"

	"io"

	"log"

	"net"

	"net/http"

	"net/url"

	"os"

	"regexp"

	"strconv"

	"strings"

	"sync"

	"time"

	"github.com/jackc/pgx/v5"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/joho/godotenv"
)

var db *pgxpool.Pool

const currentCGVVersion = "2026-09-25"
const aiHourlyLimit = 20

const leadRateLimit = 5
const leadRateWindow = 15 * time.Minute

type leadRateEntry struct {
	Count   int
	ResetAt time.Time
}

var leadRateLimiter = struct {
	sync.Mutex
	Entries map[string]leadRateEntry
}{
	Entries: make(map[string]leadRateEntry),
}

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

	Goal string `json:"goal"`

	TargetAudience string `json:"targetAudience"`

	Tone string `json:"tone"`

	CommunicationStyle string `json:"communicationStyle"`

	PrimaryAction string `json:"primaryAction"`
}

type SiteSection struct {
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

type AIContent struct {
	MetaTitle string `json:"metaTitle"`

	MetaDescription string `json:"metaDescription"`

	HeroEyebrow string `json:"heroEyebrow"`

	HeroTitle string `json:"heroTitle"`

	HeroText string `json:"heroText"`

	PrimaryCTA string `json:"primaryCta"`

	SecondaryCTA string `json:"secondaryCta"`

	AboutTitle string `json:"aboutTitle"`

	AboutText string `json:"aboutText"`

	Sections []SiteSection `json:"sections"`

	Benefits []SiteBenefit `json:"benefits"`

	FAQ []FAQItem `json:"faq"`

	ContactTitle string `json:"contactTitle"`

	ContactText string `json:"contactText"`
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

type CGVAcceptanceInput struct {
	Plan    string `json:"plan"`
	Version string `json:"version"`
}

type CGVAcceptanceResponse struct {
	DocumentType    string    `json:"documentType"`
	DocumentVersion string    `json:"documentVersion"`
	Plan            string    `json:"plan"`
	AcceptedAt      time.Time `json:"acceptedAt"`
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
	Plan                string     `json:"plan"`
	Status              string     `json:"status"`
	HasSubscription     bool       `json:"hasSubscription"`
	CancelAtPeriodEnd   bool       `json:"cancelAtPeriodEnd"`
	CurrentPeriodEnd    *time.Time `json:"currentPeriodEnd,omitempty"`
	CanManage           bool       `json:"canManage"`
	MaxPublishedSites   int        `json:"maxPublishedSites"`
	CustomDomainAllowed bool       `json:"customDomainAllowed"`
	IsAdmin             bool       `json:"isAdmin"`
}

type PlanEntitlements struct {
	MaxPublishedSites   int
	CustomDomainAllowed bool
}

type AdminStatsSummary struct {
	TotalUsers             int64   `json:"totalUsers"`
	TotalSites             int64   `json:"totalSites"`
	PublishedSites         int64   `json:"publishedSites"`
	AICallsToday           int64   `json:"aiCallsToday"`
	AICallsMonth           int64   `json:"aiCallsMonth"`
	GenerationsMonth       int64   `json:"generationsMonth"`
	ModificationsMonth     int64   `json:"modificationsMonth"`
	TokensToday            int64   `json:"tokensToday"`
	TokensMonth            int64   `json:"tokensMonth"`
	CostTodayUSD           float64 `json:"costTodayUsd"`
	CostMonthUSD           float64 `json:"costMonthUsd"`
	ActiveSubscriptions    int64   `json:"activeSubscriptions"`
	EssentielSubscriptions int64   `json:"essentielSubscriptions"`
	ProSubscriptions       int64   `json:"proSubscriptions"`
	AgenceSubscriptions    int64   `json:"agenceSubscriptions"`
	ScheduledCancellations int64   `json:"scheduledCancellations"`
	CanceledSubscriptions  int64   `json:"canceledSubscriptions"`
	MRREUR                 float64 `json:"mrrEur"`
}

type AdminUserUsage struct {
	UserID             string     `json:"userId"`
	Email              string     `json:"email"`
	AICalls            int64      `json:"aiCalls"`
	Generations        int64      `json:"generations"`
	Modifications      int64      `json:"modifications"`
	TotalTokens        int64      `json:"totalTokens"`
	EstimatedCostUSD   float64    `json:"estimatedCostUsd"`
	LastAIUseAt        *time.Time `json:"lastAiUseAt,omitempty"`
	Plan               string     `json:"plan"`
	SubscriptionStatus string     `json:"subscriptionStatus"`
	CancelAtPeriodEnd  bool       `json:"cancelAtPeriodEnd"`
	CurrentPeriodEnd   *time.Time `json:"currentPeriodEnd,omitempty"`
	MonthlyRevenueEUR  float64    `json:"monthlyRevenueEur"`
}

type AdminStatsResponse struct {
	Summary AdminStatsSummary `json:"summary"`
	Users   []AdminUserUsage  `json:"users"`
}

type LeadInput struct {
	PublicSlug string `json:"publicSlug"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Message    string `json:"message"`
	Consent    bool   `json:"consent"`

	// Champ invisible pour bloquer une partie des robots.
	Website string `json:"website"`
}

type Lead struct {
	ID               int64      `json:"id"`
	SiteID           int64      `json:"siteId"`
	PublicSlug       string     `json:"publicSlug"`
	BusinessName     string     `json:"businessName"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Phone            string     `json:"phone"`
	Message          string     `json:"message"`
	Status           string     `json:"status"`
	Note             string     `json:"note"`
	FollowUpAt       *time.Time `json:"followUpAt"`
	Archived         bool       `json:"archived"`
	QuoteAmountCents int64      `json:"quoteAmountCents"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type LeadUpdateInput struct {
	Status           string  `json:"status"`
	Note             string  `json:"note"`
	FollowUpAt       *string `json:"followUpAt"`
	Archived         bool    `json:"archived"`
	QuoteAmountCents int64   `json:"quoteAmountCents"`
}

type PageViewInput struct {
	PublicSlug string `json:"publicSlug"`
	VisitorID  string `json:"visitorId"`
}

type SiteAnalyticsSummary struct {
	SiteID         int64   `json:"siteId"`
	PublicSlug     string  `json:"publicSlug"`
	BusinessName   string  `json:"businessName"`
	Views30d       int64   `json:"views30d"`
	Visitors30d    int64   `json:"visitors30d"`
	Leads30d       int64   `json:"leads30d"`
	ConversionRate float64 `json:"conversionRate"`
}

type AnalyticsSummary struct {
	Views30d       int64                  `json:"views30d"`
	Visitors30d    int64                  `json:"visitors30d"`
	Leads30d       int64                  `json:"leads30d"`
	ConversionRate float64                `json:"conversionRate"`
	Sites          []SiteAnalyticsSummary `json:"sites"`
}

type PublicSitemapSite struct {
	PublicSlug string    `json:"publicSlug"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type OpenAIResponse struct {
	ID    string `json:"id"`
	Model string `json:"model"`

	Usage struct {
		InputTokens int64 `json:"input_tokens"`

		InputTokensDetails struct {
			CachedTokens     int64 `json:"cached_tokens"`
			CacheWriteTokens int64 `json:"cache_write_tokens"`
		} `json:"input_tokens_details"`

		OutputTokens int64 `json:"output_tokens"`

		TotalTokens int64 `json:"total_tokens"`
	} `json:"usage"`

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
	http.HandleFunc("/ai/usage", aiUsageHandler)

	http.HandleFunc("/generate", generateHandler)

	http.HandleFunc("/modify", modifyHandler)

	http.HandleFunc("/assistant", assistantHandler)

	http.HandleFunc("/sites", sitesHandler)

	http.HandleFunc("/sites/", siteByIDHandler)

	http.HandleFunc("/public-sites/", publicSiteHandler)

	http.HandleFunc("/public-sitemap-sites", publicSitemapSitesHandler)

	http.HandleFunc("/public-domains/", publicDomainHandler)

	http.HandleFunc("/legal/cgv/accept", cgvAcceptanceHandler)

	http.HandleFunc("/admin/stats", adminStatsHandler)

	http.HandleFunc("/leads", leadsHandler)
	http.HandleFunc("/leads/", leadByIDHandler)

	http.HandleFunc("/analytics/pageview", analyticsPageViewHandler)
	http.HandleFunc("/analytics/summary", analyticsSummaryHandler)

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

	fmt.Println("Lumio Backend")

	fmt.Println("Port :", port)

	fmt.Println("IA : activée")

	fmt.Println("Base de données : connectée")

	fmt.Println("Authentification : activée")

	fmt.Println("Publication : activée")

	fmt.Println("Stripe :", stripeIntegrationStatus())

	fmt.Println("Notifications email :", leadEmailStatus())

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

            notification_email TEXT NOT NULL DEFAULT '',

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

        ADD COLUMN IF NOT EXISTS notification_email TEXT NOT NULL DEFAULT '';

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

		`

        CREATE TABLE IF NOT EXISTS legal_acceptances (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID NOT NULL,

            document_type TEXT NOT NULL,

            document_version TEXT NOT NULL,

            plan TEXT NOT NULL,

            accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_acceptances_unique

        ON legal_acceptances(
            user_id,
            document_type,
            document_version,
            plan
        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user

        ON legal_acceptances(user_id, accepted_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS ai_usage (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID NOT NULL,

            action TEXT NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created_at

        ON ai_usage(user_id, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS leads (

            id BIGSERIAL PRIMARY KEY,

            site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

            user_id UUID NOT NULL,

            public_slug TEXT NOT NULL,

            name TEXT NOT NULL,

            email TEXT NOT NULL DEFAULT '',

            phone TEXT NOT NULL DEFAULT '',

            message TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'new',

            consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ NULL;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS quote_amount_cents BIGINT NOT NULL DEFAULT 0;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ NULL;

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_user_created_at

        ON leads(user_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_site_created_at

        ON leads(site_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_user_archived_created_at

        ON leads(user_id, archived, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS site_pageviews (

            id BIGSERIAL PRIMARY KEY,

            site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

            user_id UUID NOT NULL,

            public_slug TEXT NOT NULL,

            visitor_id TEXT NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_site_created_at

        ON site_pageviews(site_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_user_created_at

        ON site_pageviews(user_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_unique_visitor

        ON site_pageviews(site_id, visitor_id, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS admin_users (

            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,
	}

	for _, query := range queries {

		_, err := db.Exec(ctx, query)

		if err != nil {

			return err

		}

	}

	if _, err := db.Exec(ctx, versionMigrationSQL); err != nil {
		return err
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

func isAdminUser(
	ctx context.Context,
	userID string,
) (bool, error) {
	var isAdmin bool

	err := db.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM admin_users
			WHERE user_id = $1::uuid
		);
		`,
		userID,
	).Scan(&isAdmin)

	if err != nil {
		return false, err
	}

	return isAdmin, nil
}

func requireAdmin(
	w http.ResponseWriter,
	r *http.Request,
) (SupabaseUser, bool) {
	user, authenticated := requireUser(w, r)
	if !authenticated {
		return SupabaseUser{}, false
	}

	isAdmin, err := isAdminUser(
		r.Context(),
		user.ID,
	)

	if err != nil {
		log.Println("Erreur vérification admin :", err)

		http.Error(
			w,
			"Impossible de vérifier les droits administrateur",
			http.StatusInternalServerError,
		)

		return SupabaseUser{}, false
	}

	if !isAdmin {
		http.Error(
			w,
			"Accès administrateur requis",
			http.StatusForbidden,
		)

		return SupabaseUser{}, false
	}

	return user, true
}

func adminStatsHandler(
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

	_, authorized := requireAdmin(w, r)
	if !authorized {
		return
	}

	ctx := r.Context()

	var summary AdminStatsSummary

	err := db.QueryRow(
		ctx,
		`
		SELECT
			(SELECT COUNT(*) FROM auth.users)::bigint,
			(SELECT COUNT(*) FROM sites)::bigint,
			(SELECT COUNT(*) FROM sites WHERE published = TRUE)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE created_at >= date_trunc('day', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE created_at >= date_trunc('month', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE action = 'generate'
				  AND created_at >= date_trunc('month', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE action = 'modify'
				  AND created_at >= date_trunc('month', NOW())
			)::bigint,
			COALESCE(
				(
					SELECT SUM(total_tokens)
					FROM ai_usage
					WHERE created_at >= date_trunc('day', NOW())
				),
				0
			)::bigint,
			COALESCE(
				(
					SELECT SUM(total_tokens)
					FROM ai_usage
					WHERE created_at >= date_trunc('month', NOW())
				),
				0
			)::bigint,
			COALESCE(
				(
					SELECT SUM(estimated_cost_usd)
					FROM ai_usage
					WHERE created_at >= date_trunc('day', NOW())
				),
				0
			)::double precision,
			COALESCE(
				(
					SELECT SUM(estimated_cost_usd)
					FROM ai_usage
					WHERE created_at >= date_trunc('month', NOW())
				),
				0
			)::double precision,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'essentiel'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'pro'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'agence'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE COALESCE(cancel_at_period_end, FALSE) = TRUE
				  AND LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) = 'canceled'
			)::bigint,
			COALESCE(
				(
					SELECT SUM(
						CASE LOWER(COALESCE(plan, ''))
							WHEN 'essentiel' THEN 19.90
							WHEN 'pro' THEN 39.90
							WHEN 'agence' THEN 79.90
							ELSE 0
						END
					)
					FROM user_billing
					WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				),
				0
			)::double precision;
		`,
	).Scan(
		&summary.TotalUsers,
		&summary.TotalSites,
		&summary.PublishedSites,
		&summary.AICallsToday,
		&summary.AICallsMonth,
		&summary.GenerationsMonth,
		&summary.ModificationsMonth,
		&summary.TokensToday,
		&summary.TokensMonth,
		&summary.CostTodayUSD,
		&summary.CostMonthUSD,
		&summary.ActiveSubscriptions,
		&summary.EssentielSubscriptions,
		&summary.ProSubscriptions,
		&summary.AgenceSubscriptions,
		&summary.ScheduledCancellations,
		&summary.CanceledSubscriptions,
		&summary.MRREUR,
	)
	if err != nil {
		log.Println("Erreur statistiques admin :", err)

		http.Error(
			w,
			"Impossible de charger les statistiques",
			http.StatusInternalServerError,
		)
		return
	}

	rows, err := db.Query(
		ctx,
		`
		SELECT
			u.id::text,
			COALESCE(u.email, ''),
			COUNT(a.id)::bigint,
			COUNT(a.id) FILTER (
				WHERE a.action = 'generate'
			)::bigint,
			COUNT(a.id) FILTER (
				WHERE a.action = 'modify'
			)::bigint,
			COALESCE(SUM(a.total_tokens), 0)::bigint,
			COALESCE(
				SUM(a.estimated_cost_usd),
				0
			)::double precision,
			MAX(a.created_at),
			COALESCE(MAX(b.plan), 'free'),
			COALESCE(MAX(b.subscription_status), 'inactive'),
			COALESCE(BOOL_OR(b.cancel_at_period_end), FALSE),
			MAX(b.current_period_end),
			CASE
				WHEN LOWER(COALESCE(MAX(b.subscription_status), '')) IN ('active', 'trialing')
				THEN CASE LOWER(COALESCE(MAX(b.plan), ''))
					WHEN 'essentiel' THEN 19.90
					WHEN 'pro' THEN 39.90
					WHEN 'agence' THEN 79.90
					ELSE 0
				END
				ELSE 0
			END::double precision
		FROM auth.users u
		LEFT JOIN ai_usage a
			ON a.user_id = u.id
		LEFT JOIN user_billing b
			ON b.user_id = u.id
		GROUP BY
			u.id,
			u.email
		ORDER BY
			CASE
				WHEN LOWER(COALESCE(MAX(b.subscription_status), '')) IN ('active', 'trialing')
				THEN 0
				ELSE 1
			END,
			COALESCE(
				SUM(a.estimated_cost_usd),
				0
			) DESC,
			u.created_at DESC;
		`,
	)
	if err != nil {
		log.Println("Erreur utilisateurs admin :", err)

		http.Error(
			w,
			"Impossible de charger les utilisateurs",
			http.StatusInternalServerError,
		)
		return
	}
	defer rows.Close()

	users := make([]AdminUserUsage, 0)

	for rows.Next() {
		var item AdminUserUsage

		err := rows.Scan(
			&item.UserID,
			&item.Email,
			&item.AICalls,
			&item.Generations,
			&item.Modifications,
			&item.TotalTokens,
			&item.EstimatedCostUSD,
			&item.LastAIUseAt,
			&item.Plan,
			&item.SubscriptionStatus,
			&item.CancelAtPeriodEnd,
			&item.CurrentPeriodEnd,
			&item.MonthlyRevenueEUR,
		)
		if err != nil {
			log.Println("Erreur lecture utilisateur admin :", err)

			http.Error(
				w,
				"Impossible de lire les statistiques utilisateurs",
				http.StatusInternalServerError,
			)
			return
		}

		users = append(users, item)
	}

	if err := rows.Err(); err != nil {
		log.Println("Erreur parcours utilisateurs admin :", err)

		http.Error(
			w,
			"Impossible de terminer le chargement des utilisateurs",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		AdminStatsResponse{
			Summary: summary,
			Users:   users,
		},
	)
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
			created_at
		)
		VALUES (
			$1,
			$2::uuid,
			$3,
			$4,
			NOW()
		);
		`,
		siteID,
		ownerUserID,
		input.PublicSlug,
		input.VisitorID,
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
			), 0) AS leads_30d
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

func leadsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch r.Method {
	case http.MethodPost:
		createLeadHandler(w, r)
	case http.MethodGet:
		listLeadsHandler(w, r)
	default:
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
	}
}

func leadByIDHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPatch {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	rawID := strings.Trim(
		strings.TrimPrefix(
			r.URL.Path,
			"/leads/",
		),
		"/",
	)

	leadID, err := strconv.ParseInt(
		rawID,
		10,
		64,
	)

	if err != nil || leadID <= 0 {
		http.Error(
			w,
			"Prospect invalide",
			http.StatusBadRequest,
		)
		return
	}

	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		16*1024,
	)

	var input LeadUpdateInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"Données invalides",
			http.StatusBadRequest,
		)
		return
	}

	status := strings.TrimSpace(
		strings.ToLower(input.Status),
	)

	allowedStatuses := map[string]bool{
		"new":        true,
		"contacted":  true,
		"quote_sent": true,
		"won":        true,
		"lost":       true,
	}

	if !allowedStatuses[status] {
		http.Error(
			w,
			"Statut invalide",
			http.StatusBadRequest,
		)
		return
	}

	if input.QuoteAmountCents < 0 ||
		input.QuoteAmountCents > 100000000000 {
		http.Error(
			w,
			"Montant du devis invalide",
			http.StatusBadRequest,
		)
		return
	}

	note := strings.TrimSpace(input.Note)

	if len(note) > 3000 {
		http.Error(
			w,
			"La note est trop longue",
			http.StatusBadRequest,
		)
		return
	}

	var followUpAt *time.Time

	if input.FollowUpAt != nil {
		cleanFollowUp := strings.TrimSpace(*input.FollowUpAt)

		if cleanFollowUp != "" {
			parsed, parseErr := time.Parse(
				time.RFC3339,
				cleanFollowUp,
			)

			if parseErr != nil {
				http.Error(
					w,
					"Date de relance invalide",
					http.StatusBadRequest,
				)
				return
			}

			followUpAt = &parsed
		}
	}

	result, err := db.Exec(
		r.Context(),
		`
		UPDATE leads
		SET
			status = $1,
			note = $2,
			follow_up_at = $3,
			archived = $4,
			quote_amount_cents = $5
		WHERE
			id = $6
			AND user_id = $7::uuid;
		`,
		status,
		note,
		followUpAt,
		input.Archived,
		input.QuoteAmountCents,
		leadID,
		user.ID,
	)

	if err != nil {
		log.Println(
			"Erreur mise à jour prospect :",
			err,
		)

		http.Error(
			w,
			"Impossible de modifier le prospect",
			http.StatusInternalServerError,
		)
		return
	}

	if result.RowsAffected() == 0 {
		http.Error(
			w,
			"Prospect introuvable",
			http.StatusNotFound,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"success":          true,
			"status":           status,
			"note":             note,
			"followUpAt":       followUpAt,
			"archived":         input.Archived,
			"quoteAmountCents": input.QuoteAmountCents,
		},
	)
}

func syncNotificationEmail(
	ctx context.Context,
	userID string,
	email string,
) error {
	email = strings.TrimSpace(email)

	if userID == "" || email == "" {
		return nil
	}

	_, err := db.Exec(
		ctx,
		`UPDATE sites
		 SET notification_email = $1
		 WHERE user_id = $2::uuid
		   AND notification_email IS DISTINCT FROM $1`,
		email,
		userID,
	)

	return err
}

func leadEmailStatus() string {
	if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return "désactivées (RESEND_API_KEY absente)"
	}

	return "activées"
}

func sendLeadNotificationEmail(
	ctx context.Context,
	leadID int64,
	toEmail string,
	businessName string,
	input LeadInput,
) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return errors.New("RESEND_API_KEY absente")
	}

	toEmail = strings.TrimSpace(toEmail)
	if toEmail == "" {
		return errors.New("email destinataire absent")
	}

	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = "Lumio <onboarding@resend.dev>"
	}

	appURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SITEAI_APP_URL")), "/")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	safeBusinessName := html.EscapeString(businessName)
	safeName := html.EscapeString(input.Name)
	safeEmail := html.EscapeString(input.Email)
	safePhone := html.EscapeString(input.Phone)
	safeMessage := html.EscapeString(input.Message)

	if safeEmail == "" {
		safeEmail = "Non renseigné"
	}
	if safePhone == "" {
		safePhone = "Non renseigné"
	}

	messageHTML := strings.ReplaceAll(safeMessage, "\n", "<br>")
	prospectsURL := appURL + "/prospects"

	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <div style="background:#0f172a;border-radius:20px;padding:28px;color:#ffffff;">
      <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa;">Lumio</div>
      <h1 style="margin:10px 0 0;font-size:26px;">Nouveau prospect reçu</h1>
      <p style="margin:10px 0 0;color:#cbd5e1;line-height:1.6;">Une nouvelle demande a été envoyée depuis le site de %s.</p>
    </div>
    <div style="margin-top:18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
      <p style="margin:0 0 18px;"><strong>Nom :</strong> %s</p>
      <p style="margin:0 0 18px;"><strong>Email :</strong> %s</p>
      <p style="margin:0 0 18px;"><strong>Téléphone :</strong> %s</p>
      <p style="margin:24px 0 8px;font-weight:700;">Message</p>
      <div style="padding:16px;background:#f8fafc;border-radius:12px;line-height:1.7;">%s</div>
      <a href="%s" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">Ouvrir mes prospects</a>
    </div>
    <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#64748b;">Notification automatique Lumio</p>
  </div>
</body>
</html>`,
		safeBusinessName,
		safeName,
		safeEmail,
		safePhone,
		messageHTML,
		html.EscapeString(prospectsURL),
	)

	payload := map[string]any{
		"from":    fromEmail,
		"to":      []string{toEmail},
		"subject": fmt.Sprintf("[Lumio] Nouveau prospect pour %s", businessName),
		"html":    htmlBody,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.resend.com/emails",
		bytes.NewReader(payloadJSON),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", fmt.Sprintf("siteai-lead-%d", leadID))

	client := &http.Client{Timeout: 12 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 8*1024))
		return fmt.Errorf("Resend HTTP %d : %s", response.StatusCode, strings.TrimSpace(string(body)))
	}

	_, err = db.Exec(
		ctx,
		`UPDATE leads
		 SET notification_sent_at = NOW()
		 WHERE id = $1`,
		leadID,
	)
	return err
}

func getClientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(
		r.Header.Get("X-Forwarded-For"),
	); forwarded != "" {
		parts := strings.Split(
			forwarded,
			",",
		)

		if len(parts) > 0 {
			ip := strings.TrimSpace(
				parts[0],
			)

			if ip != "" {
				return ip
			}
		}
	}

	if realIP := strings.TrimSpace(
		r.Header.Get("X-Real-IP"),
	); realIP != "" {
		return realIP
	}

	host, _, err := net.SplitHostPort(
		strings.TrimSpace(
			r.RemoteAddr,
		),
	)

	if err == nil &&
		strings.TrimSpace(host) != "" {
		return strings.TrimSpace(host)
	}

	return strings.TrimSpace(
		r.RemoteAddr,
	)
}

func allowLeadSubmission(
	ip string,
	publicSlug string,
) (bool, time.Duration) {
	now := time.Now()

	ip = strings.TrimSpace(ip)
	publicSlug = strings.TrimSpace(
		publicSlug,
	)

	if ip == "" {
		ip = "unknown"
	}

	key := ip + "|" + publicSlug

	leadRateLimiter.Lock()
	defer leadRateLimiter.Unlock()

	if len(
		leadRateLimiter.Entries,
	) > 2000 {
		for entryKey, entry := range leadRateLimiter.Entries {
			if now.After(
				entry.ResetAt,
			) {
				delete(
					leadRateLimiter.Entries,
					entryKey,
				)
			}
		}
	}

	entry, exists :=
		leadRateLimiter.Entries[key]

	if !exists ||
		now.After(entry.ResetAt) {
		leadRateLimiter.Entries[key] =
			leadRateEntry{
				Count: 1,
				ResetAt: now.Add(
					leadRateWindow,
				),
			}

		return true, 0
	}

	if entry.Count >=
		leadRateLimit {
		remaining :=
			time.Until(
				entry.ResetAt,
			)

		if remaining < 0 {
			remaining = 0
		}

		return false, remaining
	}

	entry.Count++

	leadRateLimiter.Entries[key] =
		entry

	return true, 0
}

func createLeadHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		64*1024,
	)

	var input LeadInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"Formulaire invalide",
			http.StatusBadRequest,
		)
		return
	}

	input.PublicSlug = strings.TrimSpace(input.PublicSlug)
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Message = strings.TrimSpace(input.Message)
	input.Website = strings.TrimSpace(input.Website)

	// Honeypot : un vrai visiteur ne remplit jamais ce champ.
	if input.Website != "" {
		writeJSON(
			w,
			http.StatusCreated,
			map[string]any{
				"success": true,
				"message": "Votre demande a bien été envoyée.",
			},
		)
		return
	}

	if input.PublicSlug == "" ||
		len(input.PublicSlug) > 200 {
		http.Error(
			w,
			"Site invalide",
			http.StatusBadRequest,
		)
		return
	}

	if len(input.Name) < 2 ||
		len(input.Name) > 100 {
		http.Error(
			w,
			"Nom invalide",
			http.StatusBadRequest,
		)
		return
	}

	if input.Email == "" && input.Phone == "" {
		http.Error(
			w,
			"Email ou téléphone obligatoire",
			http.StatusBadRequest,
		)
		return
	}

	if input.Email != "" {
		if len(input.Email) > 254 {
			http.Error(
				w,
				"Email invalide",
				http.StatusBadRequest,
			)
			return
		}

		emailPattern := regexp.MustCompile(
			`^[^@\s]+@[^@\s]+\.[^@\s]+$`,
		)

		if !emailPattern.MatchString(input.Email) {
			http.Error(
				w,
				"Email invalide",
				http.StatusBadRequest,
			)
			return
		}
	}

	if len(input.Phone) > 40 {
		http.Error(
			w,
			"Téléphone invalide",
			http.StatusBadRequest,
		)
		return
	}

	if len(input.Message) < 10 ||
		len(input.Message) > 3000 {
		http.Error(
			w,
			"Le message doit contenir entre 10 et 3000 caractères",
			http.StatusBadRequest,
		)
		return
	}

	if !input.Consent {
		http.Error(
			w,
			"Le consentement est obligatoire",
			http.StatusBadRequest,
		)
		return
	}

	clientIP := getClientIP(r)

	allowed, retryAfter :=
		allowLeadSubmission(
			clientIP,
			input.PublicSlug,
		)

	if !allowed {
		retrySeconds :=
			int(
				retryAfter.Seconds(),
			)

		if retrySeconds < 1 {
			retrySeconds = 1
		}

		w.Header().Set(
			"Retry-After",
			strconv.Itoa(
				retrySeconds,
			),
		)

		http.Error(
			w,
			"Trop de demandes envoyées. Réessayez dans quelques minutes.",
			http.StatusTooManyRequests,
		)
		return
	}

	var siteID int64
	var ownerUserID string
	var businessName string
	var notificationEmail string

	err := db.QueryRow(
		r.Context(),
		`
		SELECT
			id,
			user_id::text,
			business_name,
			COALESCE(notification_email, '')
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
		&businessName,
		&notificationEmail,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(
				w,
				"Site introuvable ou non publié",
				http.StatusNotFound,
			)
			return
		}

		log.Println("Erreur recherche site pour prospect :", err)

		http.Error(
			w,
			"Erreur serveur",
			http.StatusInternalServerError,
		)
		return
	}

	var leadID int64

	err = db.QueryRow(
		r.Context(),
		`
		INSERT INTO leads (
			site_id,
			user_id,
			public_slug,
			name,
			email,
			phone,
			message,
			status,
			consent_at,
			created_at
		)
		VALUES (
			$1,
			$2::uuid,
			$3,
			$4,
			$5,
			$6,
			$7,
			'new',
			NOW(),
			NOW()
		)
		RETURNING id;
		`,
		siteID,
		ownerUserID,
		input.PublicSlug,
		input.Name,
		input.Email,
		input.Phone,
		input.Message,
	).Scan(&leadID)

	if err != nil {
		log.Println("Erreur enregistrement prospect :", err)

		http.Error(
			w,
			"Impossible d'enregistrer la demande",
			http.StatusInternalServerError,
		)
		return
	}

	if strings.TrimSpace(notificationEmail) != "" && strings.TrimSpace(os.Getenv("RESEND_API_KEY")) != "" {
		go func(leadID int64, toEmail string, businessName string, leadInput LeadInput) {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()

			if err := sendLeadNotificationEmail(
				ctx,
				leadID,
				toEmail,
				businessName,
				leadInput,
			); err != nil {
				log.Println("Notification prospect non envoyée :", err)
			}
		}(leadID, notificationEmail, businessName, input)
	}

	writeJSON(
		w,
		http.StatusCreated,
		map[string]any{
			"success": true,
			"message": "Votre demande a bien été envoyée.",
		},
	)
}

func listLeadsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	includeArchived := strings.EqualFold(
		strings.TrimSpace(
			r.URL.Query().Get("includeArchived"),
		),
		"true",
	)

	rows, err := db.Query(
		r.Context(),
		`
		SELECT
			l.id,
			l.site_id,
			l.public_slug,
			s.business_name,
			l.name,
			l.email,
			l.phone,
			l.message,
			l.status,
			COALESCE(l.note, ''),
			l.follow_up_at,
			COALESCE(l.archived, FALSE),
			COALESCE(l.quote_amount_cents, 0),
			l.created_at
		FROM leads l
		INNER JOIN sites s
			ON s.id = l.site_id
		WHERE
			l.user_id = $1::uuid
			AND ($2::boolean = TRUE OR l.archived = FALSE)
		ORDER BY l.created_at DESC
		LIMIT 500;
		`,
		user.ID,
		includeArchived,
	)

	if err != nil {
		log.Println("Erreur liste prospects :", err)

		http.Error(
			w,
			"Impossible de charger les prospects",
			http.StatusInternalServerError,
		)
		return
	}

	defer rows.Close()

	leads := make([]Lead, 0)

	for rows.Next() {
		var lead Lead

		err = rows.Scan(
			&lead.ID,
			&lead.SiteID,
			&lead.PublicSlug,
			&lead.BusinessName,
			&lead.Name,
			&lead.Email,
			&lead.Phone,
			&lead.Message,
			&lead.Status,
			&lead.Note,
			&lead.FollowUpAt,
			&lead.Archived,
			&lead.QuoteAmountCents,
			&lead.CreatedAt,
		)

		if err != nil {
			log.Println("Erreur lecture prospect :", err)

			http.Error(
				w,
				"Impossible de charger les prospects",
				http.StatusInternalServerError,
			)
			return
		}

		leads = append(leads, lead)
	}

	if err = rows.Err(); err != nil {
		log.Println("Erreur parcours prospects :", err)

		http.Error(
			w,
			"Impossible de charger les prospects",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		leads,
	)
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

var errMonthlyAIQuota = errors.New("monthly AI quota reached")

func aiMonthlyLimit(status BillingStatus) int {
	if status.IsAdmin {
		return -1
	}
	if !isActiveBillingStatus(status.Status) {
		return 15
	}
	switch strings.ToLower(strings.TrimSpace(status.Plan)) {
	case "essentiel":
		return 50
	case "pro":
		return 200
	case "agence":
		return 1000
	default:
		return 15
	}
}

func consumeAIUsage(
	ctx context.Context,
	userID string,
	action string,
) (int64, int, bool, error) {
	billing, _, _, err := getBillingStatus(ctx, userID)
	if err != nil {
		return 0, 0, false, err
	}
	monthlyLimit := aiMonthlyLimit(billing)
	tx, err := db.Begin(ctx)
	if err != nil {
		return 0, 0, false, err
	}

	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`,
		userID,
	)
	if err != nil {
		return 0, 0, false, err
	}

	var used, monthlyUsed int

	err = tx.QueryRow(
		ctx,
		`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour'),
          COUNT(*) FILTER (WHERE action <> 'assistant' AND created_at >= (date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))
        FROM ai_usage
        WHERE user_id = $1::uuid
          AND created_at >= LEAST(NOW() - INTERVAL '1 hour', (date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'));
		`,
		userID,
	).Scan(&used, &monthlyUsed)
	if err != nil {
		return 0, 0, false, err
	}

	// Les questions posées à l'assistant ne consomment pas le quota mensuel :
	// elles restent seulement soumises à la limite horaire.
	if action != "assistant" && monthlyLimit >= 0 && monthlyUsed >= monthlyLimit {
		return 0, 0, false, errMonthlyAIQuota
	}

	if used >= aiHourlyLimit {
		return 0, 0, false, nil
	}

	var usageID int64

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO ai_usage (
			user_id,
			action,
			created_at
		)
		VALUES (
			$1::uuid,
			$2,
			NOW()
		)
		RETURNING id;
		`,
		userID,
		action,
	).Scan(&usageID)
	if err != nil {
		return 0, 0, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, false, err
	}

	return usageID, aiHourlyLimit - used - 1, true, nil
}

func enforceAIRateLimit(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	action string,
) (int64, bool) {
	usageID, remaining, allowed, err := consumeAIUsage(
		r.Context(),
		userID,
		action,
	)

	if errors.Is(err, errMonthlyAIQuota) {
		http.Error(w, "Quota IA mensuel atteint. Les demandes de création et de modification sont comptées ensemble. Le quota revient au début du prochain mois UTC ; consulte les formules pour augmenter ta limite.", http.StatusTooManyRequests)
		return 0, false
	}
	if err != nil {
		log.Println("Erreur rate limit IA :", err)

		http.Error(
			w,
			"Impossible de vérifier la limite IA",
			http.StatusInternalServerError,
		)

		return 0, false
	}

	w.Header().Set(
		"X-RateLimit-Limit",
		strconv.Itoa(aiHourlyLimit),
	)

	w.Header().Set(
		"X-RateLimit-Remaining",
		strconv.Itoa(remaining),
	)

	if !allowed {
		w.Header().Set("Retry-After", "3600")

		http.Error(
			w,
			"Limite temporaire atteinte : 20 utilisations de l'IA maximum par heure. Réessaie un peu plus tard.",
			http.StatusTooManyRequests,
		)

		return 0, false
	}

	return usageID, true
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

	user, authenticated := requireUser(w, r)

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

	input.Goal = strings.TrimSpace(input.Goal)

	input.TargetAudience = strings.TrimSpace(input.TargetAudience)

	input.Tone = strings.TrimSpace(input.Tone)

	input.CommunicationStyle = strings.TrimSpace(input.CommunicationStyle)

	input.PrimaryAction = strings.TrimSpace(input.PrimaryAction)

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

	usageID, allowed := enforceAIRateLimit(
		w,
		r,
		user.ID,
		"generate",
	)
	if !allowed {
		return
	}

	site, err := generateSiteWithAI(
		r.Context(),
		usageID,
		input,
	)

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

	user, authenticated := requireUser(w, r)

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

	usageID, allowed := enforceAIRateLimit(
		w,
		r,
		user.ID,
		"modify",
	)
	if !allowed {
		return
	}

	result, err := modifySiteWithAI(
		r.Context(),
		usageID,
		input,
	)

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

	billingStatus, _, _, err := getBillingStatus(r.Context(), userID)
	if err != nil {
		http.Error(w, "Impossible de vérifier l'abonnement", http.StatusInternalServerError)
		return
	}

	entitlements := billingEntitlements(billingStatus)
	if !entitlements.CustomDomainAllowed {
		if !isActiveBillingStatus(billingStatus.Status) {
			http.Error(
				w,
				"Un abonnement Pro ou Agence actif est nécessaire pour utiliser un domaine personnalisé.",
				http.StatusForbidden,
			)
			return
		}

		http.Error(
			w,
			"Les domaines personnalisés sont disponibles avec les formules Pro ou Agence.",
			http.StatusForbidden,
		)
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

	billingStatus, _, _, err := getBillingStatus(r.Context(), userID)
	if err != nil {
		http.Error(w, "Impossible de vérifier l'abonnement", http.StatusInternalServerError)
		return
	}

	entitlements := billingEntitlements(billingStatus)
	if !entitlements.CustomDomainAllowed {
		if !isActiveBillingStatus(billingStatus.Status) {
			http.Error(
				w,
				"Un abonnement Pro ou Agence actif est nécessaire pour vérifier un domaine personnalisé.",
				http.StatusForbidden,
			)
			return
		}

		http.Error(
			w,
			"Les domaines personnalisés sont disponibles avec les formules Pro ou Agence.",
			http.StatusForbidden,
		)
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

func generateSiteWithAI(

	ctx context.Context,

	usageID int64,

	input BusinessInput,

) (GeneratedSite, error) {

	services := strings.Join(

		input.Services,

		", ",
	)

	if services == "" {

		services = "Aucun service détaillé fourni. Déduire uniquement des catégories de services générales et plausibles à partir de l'activité, sans inventer de spécialité, certification, tarif ou promesse."

	}

	goal := input.Goal
	if goal == "" {
		goal = "générer des prises de contact qualifiées"
	}

	targetAudience := input.TargetAudience
	if targetAudience == "" {
		targetAudience = "clientèle locale générale adaptée à l'activité"
	}

	tone := input.Tone
	if tone == "" {
		tone = "professionnel et chaleureux"
	}

	communicationStyle := input.CommunicationStyle
	if communicationStyle == "" {
		communicationStyle = "clair et concis"
	}

	primaryAction := input.PrimaryAction
	if primaryAction == "" {
		primaryAction = "nous contacter"
	}

	instructions := `
Tu es le moteur de création de Lumio, un outil qui crée des sites vitrines professionnels pour des TPE et PME françaises.

Ta mission est de produire un contenu réellement adapté au métier, à la ville et aux services fournis. Deux entreprises de métiers différents ne doivent pas recevoir le même site avec seulement quelques mots remplacés.

MÉTHODE DE TRAVAIL :
- commence par identifier silencieusement le besoin client principal, les services réellement fournis et les informations factuelles disponibles
- construis ensuite un angle éditorial propre à cette entreprise ; n'affiche jamais cette analyse
- écris chaque bloc avec une fonction distincte : comprendre, choisir, être rassuré ou agir
- termine par une relecture silencieuse de cohérence, de précision et de non-invention avant de produire le JSON

OBJECTIFS :
- donner immédiatement au visiteur une compréhension claire de l'activité
- mettre en avant les services de façon concrète
- rassurer sans inventer de faits
- encourager une prise de contact naturelle
- produire un contenu utile au référencement local
- garder un style professionnel, humain et crédible

RÈGLES ABSOLUES :
- français uniquement
- ne jamais inventer de certification, label ou qualification
- ne jamais inventer d'années d'expérience
- ne jamais inventer de nombre de clients
- ne jamais inventer de tarif, remise ou prix
- ne jamais inventer d'avis client
- ne jamais inventer de garantie
- ne jamais inventer de disponibilité 24h/24 ou 7j/7
- ne jamais inventer de délai d'intervention
- ne jamais inventer d'adresse, d'email ou d'information de contact absente
- ne jamais présenter comme un fait une information que l'utilisateur n'a pas fournie
- éviter les superlatifs non prouvés comme "le meilleur", "numéro 1", "leader"
- éviter le remplissage générique et les phrases vagues
- ne pas répéter la même idée dans plusieurs blocs
- bannir les clichés interchangeables comme "à votre écoute", "solutions sur mesure", "savoir-faire reconnu", "qualité, réactivité et proximité" lorsqu'aucun élément concret ne les justifie
- ne pas créer de rubrique "Avis clients" si aucun témoignage réel n'est fourni
- ne pas transformer une rubrique éditoriale comme "Pourquoi nous choisir" en service commercial
- chaque affirmation factuelle doit être directement issue des informations fournies ; sinon, la formuler comme une possibilité ou l'omettre

PERSONNALISATION :
- adapte le vocabulaire au secteur d'activité
- adapte les besoins clients évoqués au métier
- utilise la ville de manière naturelle, sans bourrage de mots-clés
- si des services sont fournis, donne-leur la priorité
- si aucun service détaillé n'est fourni, reste sur des catégories générales cohérentes avec l'activité
- prends réellement en compte l'objectif du site, la clientèle cible, le ton et le style de communication fournis
- le hero doit parler en priorité au public cible et soutenir l'objectif principal
- les sections doivent être ordonnées selon ce qui aide le mieux à atteindre l'objectif
- le CTA principal doit suivre l'action souhaitée quand elle est compatible avec les fonctionnalités réelles du site
- si l'action souhaitée suppose une fonctionnalité non disponible, reformule vers une prise de contact cohérente au lieu de promettre cette fonctionnalité
- les CTA doivent rester courts, naturels et spécifiques au métier
- privilégier des verbes d'action concrets et un vocabulaire que les clients de ce métier utilisent réellement
- varier la structure des titres et des phrases ; ne pas commencer plusieurs blocs de la même manière

STRUCTURE À PRODUIRE :
- metaTitle : titre SEO naturel, idéalement autour de 50 à 60 caractères
- metaDescription : description SEO claire, idéalement autour de 140 à 160 caractères
- heroEyebrow : courte ligne de contexte, par exemple activité + ville
- heroTitle : titre principal spécifique et orienté bénéfice client
- heroText : 1 à 2 phrases qui expliquent clairement la proposition de valeur
- primaryCta : CTA principal court et adapté au métier
- secondaryCta : CTA secondaire court
- aboutTitle : titre de présentation de l'entreprise
- aboutText : 2 à 3 phrases de présentation sans inventer d'historique
- sections : entre 4 et 6 blocs de services ou besoins clients, chacun avec un titre précis et un texte utile
- benefits : exactement 3 avantages formulés comme bénéfices, méthode de travail ou simplicité pour le client, sans fausse preuve
- faq : 4 questions-réponses utiles et spécifiques au secteur ; les réponses doivent rester prudentes lorsqu'une information dépend de l'entreprise
- contactTitle : titre de prise de contact
- contactText : 1 à 2 phrases pour encourager le contact sans fausse promesse

STYLE ÉDITORIAL HAUT DE GAMME :
- aucun emoji, aucun symbole décoratif et aucun point d'exclamation
- heroTitle court et mémorable : 4 à 9 mots, sans deux-points ni énumération
- heroEyebrow très court : 2 à 5 mots, sans ponctuation finale
- titres de sections en 2 à 6 mots, précis plutôt que génériques
- phrases nettes, rythme varié, un seul message par phrase ; préférer le concret au promotionnel
- ton sobre et assuré, comme une marque premium du secteur : ni familier, ni publicitaire

Le résultat doit être directement publiable sur un site professionnel.

BARRE DE QUALITÉ AVANT RETOUR :
- le hero doit être impossible à réutiliser tel quel pour une entreprise d'un autre secteur
- chaque section doit apporter une information nouvelle
- aucun avantage ne doit ressembler à une preuve inventée
- aucun texte ne doit mentionner une disponibilité, un délai, un tarif, une garantie ou une qualification absents du brief
- le ton doit sembler écrit par un bon rédacteur humain, pas par un générateur de texte
`

	userPrompt := fmt.Sprintf(
		`Entreprise : %s

Activité : %s

Ville : %s

Téléphone : %s

Services fournis : %s

Objectif principal du site : %s

Clientèle cible : %s

Ton souhaité : %s

Style de communication : %s

Action principale souhaitée : %s

Crée une version complète et réellement personnalisée du contenu du site en utilisant ces préférences sans inventer de faits.`,
		input.BusinessName,
		input.Activity,
		input.City,
		input.Phone,
		services,
		goal,
		targetAudience,
		tone,
		communicationStyle,
		primaryAction,
	)

	outputText, err := callOpenAI(

		ctx,

		usageID,

		instructions,

		userPrompt,

		"siteai_generated_site_v3",

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

		HeroEyebrow: content.HeroEyebrow,

		HeroTitle: content.HeroTitle,

		HeroText: content.HeroText,

		PrimaryCTA: content.PrimaryCTA,

		SecondaryCTA: content.SecondaryCTA,

		Phone: input.Phone,

		AboutTitle: content.AboutTitle,

		AboutText: content.AboutText,

		Sections: content.Sections,

		Benefits: content.Benefits,

		FAQ: content.FAQ,

		ContactTitle: content.ContactTitle,

		ContactText: content.ContactText,
	}, nil

}

func modifySiteWithAI(

	ctx context.Context,

	usageID int64,

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
Tu es l'éditeur intelligent de Lumio.

Tu reçois le contenu complet d'un site vitrine existant et une demande de modification de l'utilisateur.

PRINCIPE :
- modifie uniquement ce qui est nécessaire pour répondre à la demande
- conserve toutes les informations et tous les blocs non concernés
- retourne toujours l'objet complet du site, même si une seule phrase change
- si la demande est ambiguë, applique la modification la plus petite, la plus sûre et la plus facilement réversible
- relis silencieusement le résultat complet avant de retourner le JSON afin d'éviter contradictions et répétitions

QUALITÉ :
- français uniquement
- ton professionnel, naturel et adapté au métier
- vocabulaire spécifique à l'activité lorsque c'est pertinent
- référencement local naturel lorsque la demande concerne le contenu
- éviter les répétitions, le jargon inutile et les formulations génériques
- bannir les clichés interchangeables comme "à votre écoute", "solutions sur mesure" ou "savoir-faire reconnu" sans preuve concrète
- si l'utilisateur demande une réécriture globale, harmonise hero, à propos, services, avantages, FAQ et contact
- si l'utilisateur demande un texte plus professionnel, rends-le plus précis et plus crédible, sans le rendre plus long par défaut

SÉCURITÉ DU CONTENU :
- ne jamais inventer de certification, label ou qualification
- ne jamais inventer d'années d'expérience
- ne jamais inventer de nombre de clients
- ne jamais inventer de tarif ou de remise
- ne jamais inventer d'avis client
- ne jamais inventer de garantie
- ne jamais inventer de disponibilité 24h/24 ou 7j/7
- ne jamais inventer de délai d'intervention
- ne jamais inventer d'adresse, d'email ou d'information factuelle absente
- éviter les superlatifs non prouvés
- ne pas créer de rubrique "Avis clients" sans témoignages réels fournis
- chaque nouvelle affirmation factuelle doit être traçable à la demande ou au site actuel

DESIGN :
- designStyle doit être exactement moderne, elegant ou artisan
- accentColor doit être une couleur hexadécimale valide
- ne change le style ou la couleur que si la demande le justifie

MÉDIAS :
- le logo, l'image principale et la galerie sont gérés séparément par l'utilisateur
- ne tente jamais de remplacer, supprimer ou inventer leurs URL

CTA :
- primaryCta et secondaryCta doivent être courts et cohérents avec le métier
- ne promets pas une réservation en ligne, un devis instantané ou une autre fonctionnalité absente

FAQ :
- conserve des réponses prudentes lorsque la réponse dépend de l'entreprise
- n'invente jamais une politique commerciale ou un engagement non fourni
`

	userPrompt := fmt.Sprintf(
		`SITE ACTUEL :

%s

ACTIVITÉ :
%s

VILLE :
%s

STYLE ACTUEL :
%s

COULEUR ACTUELLE :
%s

DEMANDE DE L'UTILISATEUR :
%s

Retourne le site complet après modification.`,
		string(currentJSON),
		input.Activity,
		input.City,
		currentDesign,
		currentColor,
		input.Instruction,
	)

	outputText, err := callOpenAI(

		ctx,

		usageID,

		instructions,

		userPrompt,

		"siteai_modified_site_v3",

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

		result.Site.BusinessName = input.Site.BusinessName

	}

	if strings.TrimSpace(

		result.Site.Phone,
	) == "" {

		result.Site.Phone = input.Site.Phone

	}

	if strings.TrimSpace(

		result.Site.MetaTitle,
	) == "" {

		result.Site.MetaTitle = input.Site.MetaTitle

	}

	if strings.TrimSpace(

		result.Site.MetaDescription,
	) == "" {

		result.Site.MetaDescription = input.Site.MetaDescription

	}

	if strings.TrimSpace(

		result.Site.HeroEyebrow,
	) == "" {

		result.Site.HeroEyebrow = input.Site.HeroEyebrow

	}

	if strings.TrimSpace(

		result.Site.HeroTitle,
	) == "" {

		result.Site.HeroTitle = input.Site.HeroTitle

	}

	if strings.TrimSpace(

		result.Site.HeroText,
	) == "" {

		result.Site.HeroText = input.Site.HeroText

	}

	if strings.TrimSpace(

		result.Site.PrimaryCTA,
	) == "" {

		result.Site.PrimaryCTA = input.Site.PrimaryCTA

	}

	if strings.TrimSpace(

		result.Site.SecondaryCTA,
	) == "" {

		result.Site.SecondaryCTA = input.Site.SecondaryCTA

	}

	if strings.TrimSpace(

		result.Site.AboutTitle,
	) == "" {

		result.Site.AboutTitle = input.Site.AboutTitle

	}

	if strings.TrimSpace(

		result.Site.AboutText,
	) == "" {

		result.Site.AboutText = input.Site.AboutText

	}

	if len(

		result.Site.Sections,
	) == 0 {

		result.Site.Sections = input.Site.Sections

	}

	if len(

		result.Site.Benefits,
	) == 0 {

		result.Site.Benefits = input.Site.Benefits

	}

	if len(

		result.Site.FAQ,
	) == 0 {

		result.Site.FAQ = input.Site.FAQ

	}

	if strings.TrimSpace(

		result.Site.ContactTitle,
	) == "" {

		result.Site.ContactTitle = input.Site.ContactTitle

	}

	if strings.TrimSpace(

		result.Site.ContactText,
	) == "" {

		result.Site.ContactText = input.Site.ContactText

	}

	// Les médias sont gérés par l'utilisateur dans Supabase Storage.
	// L'IA ne doit jamais les supprimer ou les remplacer.
	result.Site.SiteGoal = input.Site.SiteGoal
	result.Site.BookingURL = input.Site.BookingURL
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

func calculateOpenAICostUSD(
	model string,
	inputTokens int64,
	cachedTokens int64,
	cacheWriteTokens int64,
	outputTokens int64,
) (float64, bool) {
	var inputPrice float64
	var cachedInputPrice float64
	var cacheWritePrice float64
	var outputPrice float64

	normalizedModel := strings.ToLower(strings.TrimSpace(model))
	switch {
	case strings.HasPrefix(normalizedModel, "gpt-5.6-luna"):
		inputPrice = 0.20
		cachedInputPrice = 0.02
		cacheWritePrice = 0.25
		outputPrice = 1.20
	case strings.HasPrefix(normalizedModel, "gpt-6-luna"):
		inputPrice = 0.10
		cachedInputPrice = 0.01
		cacheWritePrice = 0.125
		outputPrice = 0.50
	case strings.HasPrefix(normalizedModel, "gpt-6.1-sol"):
		inputPrice = 2.00
		cachedInputPrice = 0.10
		cacheWritePrice = 2.50
		outputPrice = 10.00
	default:
		return 0, false
	}

	ordinaryInputTokens :=
		inputTokens -
			cachedTokens -
			cacheWriteTokens

	if ordinaryInputTokens < 0 {
		ordinaryInputTokens = 0
	}

	cost :=
		(float64(ordinaryInputTokens)*inputPrice +
			float64(cachedTokens)*cachedInputPrice +
			float64(cacheWriteTokens)*cacheWritePrice +
			float64(outputTokens)*outputPrice) /
			1_000_000

	return cost, true
}

func saveAIUsageMetrics(
	ctx context.Context,
	usageID int64,
	response OpenAIResponse,
	requestedModel string,
) error {
	model := strings.TrimSpace(response.Model)

	if model == "" {
		model = strings.TrimSpace(requestedModel)
	}

	inputTokens := response.Usage.InputTokens
	cachedTokens :=
		response.Usage.InputTokensDetails.CachedTokens
	cacheWriteTokens :=
		response.Usage.InputTokensDetails.CacheWriteTokens
	outputTokens := response.Usage.OutputTokens
	totalTokens := response.Usage.TotalTokens

	if totalTokens == 0 {
		totalTokens = inputTokens + outputTokens
	}

	costUSD, hasPrice := calculateOpenAICostUSD(
		model,
		inputTokens,
		cachedTokens,
		cacheWriteTokens,
		outputTokens,
	)

	var estimatedCost any
	if hasPrice {
		estimatedCost = costUSD
	}

	_, err := db.Exec(
		ctx,
		`
		UPDATE ai_usage
		SET
			model = $2,
			input_tokens = $3,
			cached_input_tokens = $4,
			cache_write_tokens = $5,
			output_tokens = $6,
			total_tokens = $7,
			estimated_cost_usd = $8,
			openai_response_id = $9
		WHERE id = $1;
		`,
		usageID,
		model,
		inputTokens,
		cachedTokens,
		cacheWriteTokens,
		outputTokens,
		totalTokens,
		estimatedCost,
		response.ID,
	)

	return err
}

func callOpenAI(

	ctx context.Context,

	usageID int64,

	instructions string,

	input string,

	schemaName string,

	schema map[string]any,

) (string, error) {

	model := selectOpenAIModel(schemaName)

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

	if strings.HasPrefix(model, "gpt-5.6-") || strings.HasPrefix(model, "gpt-6") {
		requestBody["reasoning"] = map[string]any{
			"effort": "medium",
		}
	}

	body, err := json.Marshal(requestBody)

	if err != nil {

		return "", err

	}

	request, err := http.NewRequestWithContext(

		ctx,

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

	if err := saveAIUsageMetrics(
		ctx,
		usageID,
		parsed,
		model,
	); err != nil {
		log.Println(
			"Erreur enregistrement coût IA :",
			err,
		)
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

func selectOpenAIModel(schemaName string) string {
	if strings.Contains(schemaName, "generated_site") {
		if model := strings.TrimSpace(os.Getenv("OPENAI_GENERATION_MODEL")); model != "" {
			return model
		}
	} else if model := strings.TrimSpace(os.Getenv("OPENAI_MODIFICATION_MODEL")); model != "" {
		return model
	}

	if model := strings.TrimSpace(os.Getenv("OPENAI_MODEL")); model != "" {
		return model
	}

	if strings.Contains(schemaName, "generated_site") {
		return "gpt-6.1-sol"
	}

	return "gpt-6-luna"
}

func aiStringSchema(description string) map[string]any {
	return map[string]any{
		"type":        "string",
		"description": description,
	}
}

func generatedContentSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"metaTitle": aiStringSchema("Titre SEO naturel contenant l'activité ou l'entreprise et la ville, sans slogan générique."),

			"metaDescription": aiStringSchema("Résumé SEO précis de la proposition de valeur et de la zone géographique, sans promesse inventée."),

			"heroEyebrow": aiStringSchema("Repère très court combinant naturellement activité et localisation."),

			"heroTitle": aiStringSchema("Titre principal distinctif, concret et orienté vers le besoin prioritaire du client."),

			"heroText": aiStringSchema("Une ou deux phrases expliquant clairement l'offre, le public et l'intérêt de contacter l'entreprise."),

			"primaryCta": aiStringSchema("Action principale courte, concrète et compatible avec les fonctions réelles du site."),

			"secondaryCta": aiStringSchema("Action secondaire courte et différente de l'action principale."),

			"aboutTitle": aiStringSchema("Titre de présentation spécifique à l'entreprise, sans cliché publicitaire."),

			"aboutText": aiStringSchema("Deux ou trois phrases factuelles présentant l'activité et l'approche sans inventer d'historique."),

			"sections": sectionsSchema(),

			"benefits": benefitsSchema(),

			"faq": faqSchema(),

			"contactTitle": aiStringSchema("Titre de prise de contact naturel et spécifique au projet du visiteur."),

			"contactText": aiStringSchema("Une ou deux phrases indiquant clairement quoi communiquer et ce qui se passera ensuite, sans délai inventé."),
		},

		"required": []string{

			"metaTitle",

			"metaDescription",

			"heroEyebrow",

			"heroTitle",

			"heroText",

			"primaryCta",

			"secondaryCta",

			"aboutTitle",

			"aboutText",

			"sections",

			"benefits",

			"faq",

			"contactTitle",

			"contactText",
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

			"businessName": aiStringSchema("Nom de l'entreprise, à conserver sauf demande explicite."),

			"slug": aiStringSchema("Identifiant d'URL existant, à conserver sauf renommage explicite."),

			"metaTitle": aiStringSchema("Titre SEO naturel, précis et localisé."),

			"metaDescription": aiStringSchema("Résumé SEO clair sans affirmation factuelle nouvelle."),

			"heroEyebrow": aiStringSchema("Repère très court combinant activité et localisation."),

			"heroTitle": aiStringSchema("Titre principal concret et distinctif."),

			"heroText": aiStringSchema("Proposition de valeur claire en une ou deux phrases."),

			"primaryCta": aiStringSchema("Action principale courte et réalisable sur le site."),

			"secondaryCta": aiStringSchema("Action secondaire courte et complémentaire."),

			"phone": aiStringSchema("Téléphone existant, à conserver sauf demande explicite."),

			"aboutTitle": aiStringSchema("Titre de présentation spécifique et sans cliché."),

			"aboutText": aiStringSchema("Présentation factuelle de l'activité et de l'approche."),

			"sections": sectionsSchema(),

			"benefits": benefitsSchema(),

			"faq": faqSchema(),

			"contactTitle": aiStringSchema("Titre de contact adapté au besoin du visiteur."),

			"contactText": aiStringSchema("Texte de contact clair, utile et sans promesse inventée."),
		},

		"required": []string{

			"businessName",

			"slug",

			"metaTitle",

			"metaDescription",

			"heroEyebrow",

			"heroTitle",

			"heroText",

			"primaryCta",

			"secondaryCta",

			"phone",

			"aboutTitle",

			"aboutText",

			"sections",

			"benefits",

			"faq",

			"contactTitle",

			"contactText",
		},
	}

}

func sectionsSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Quatre à six services ou besoins clients distincts, ordonnés par importance commerciale.",

		"minItems": 4,

		"maxItems": 6,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"title": aiStringSchema("Nom précis d'un service ou d'un besoin client ; jamais un titre générique comme Pourquoi nous choisir."),

				"text": aiStringSchema("Explication concrète, utile et distincte des autres sections, sans modalité inventée."),
			},

			"required": []string{

				"title",

				"text",
			},
		},
	}

}

func benefitsSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Exactement trois bénéfices crédibles portant sur la méthode, la clarté ou la simplicité du parcours client.",

		"minItems": 3,

		"maxItems": 3,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"title": aiStringSchema("Bénéfice court, précis et non présenté comme une preuve non fournie."),

				"text": aiStringSchema("Explication concrète de ce bénéfice pour le client."),
			},

			"required": []string{

				"title",

				"text",
			},
		},
	}

}

func faqSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Exactement quatre questions fréquentes réellement utiles avant une prise de contact.",

		"minItems": 4,

		"maxItems": 4,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"question": aiStringSchema("Question naturelle et spécifique qu'un prospect de ce métier peut réellement se poser."),

				"answer": aiStringSchema("Réponse utile et prudente ; inviter au contact lorsque la réponse dépend de l'entreprise ou du projet."),
			},

			"required": []string{

				"question",

				"answer",
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
	isAdmin, adminErr := isAdminUser(
		ctx,
		userID,
	)

	if adminErr != nil {
		return BillingStatus{}, "", "", adminErr
	}

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
		billingStatus := BillingStatus{
			Plan:            "free",
			Status:          "inactive",
			HasSubscription: false,
			CanManage:       false,
			IsAdmin:         isAdmin,
		}

		if isAdmin {
			billingStatus.Plan = "agence"
			billingStatus.Status = "active"
			billingStatus.HasSubscription = true
		}

		applyBillingEntitlements(&billingStatus)

		return billingStatus, "", "", nil
	}

	if err != nil {
		return BillingStatus{}, "", "", err
	}

	hasSubscription := subscriptionID != "" &&
		status != "canceled" &&
		status != "incomplete_expired"

	billingStatus := BillingStatus{
		Plan:              plan,
		Status:            status,
		HasSubscription:   hasSubscription,
		CancelAtPeriodEnd: cancelAtPeriodEnd,
		CurrentPeriodEnd:  currentPeriodEnd,
		CanManage:         customerID != "",
		IsAdmin:           isAdmin,
	}

	if isAdmin {
		// Un administrateur Lumio garde tous les droits produit,
		// indépendamment de son abonnement Stripe.
		// On expose "agence" + "active" pour que le frontend
		// débloque aussi les fonctions réservées Pro/Agence.
		billingStatus.Plan = "agence"
		billingStatus.Status = "active"
		billingStatus.HasSubscription = true
		billingStatus.CancelAtPeriodEnd = false
	}

	applyBillingEntitlements(&billingStatus)

	return billingStatus, customerID, subscriptionID, nil
}

func isActiveBillingStatus(status string) bool {
	status = strings.ToLower(strings.TrimSpace(status))

	return status == "active" || status == "trialing"
}

func billingEntitlements(status BillingStatus) PlanEntitlements {
	if status.IsAdmin {
		return PlanEntitlements{
			MaxPublishedSites:   1000000,
			CustomDomainAllowed: true,
		}
	}

	if !isActiveBillingStatus(status.Status) {
		return PlanEntitlements{}
	}

	switch strings.ToLower(strings.TrimSpace(status.Plan)) {
	case "essentiel":
		return PlanEntitlements{
			MaxPublishedSites:   1,
			CustomDomainAllowed: true,
		}

	case "pro":
		return PlanEntitlements{
			MaxPublishedSites:   3,
			CustomDomainAllowed: true,
		}

	case "agence":
		return PlanEntitlements{
			MaxPublishedSites:   10,
			CustomDomainAllowed: true,
		}

	default:
		return PlanEntitlements{}
	}
}

func applyBillingEntitlements(status *BillingStatus) {
	if status == nil {
		return
	}

	entitlements := billingEntitlements(*status)
	status.MaxPublishedSites = entitlements.MaxPublishedSites
	status.CustomDomainAllowed = entitlements.CustomDomainAllowed
}

func publishedSiteLimitMessage(plan string, maxSites int) string {
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "essentiel":
		return "Limite de la formule Essentiel atteinte : 1 site publié maximum. Passe à Pro pour publier jusqu'à 3 sites."

	case "pro":
		return "Limite de la formule Pro atteinte : 3 sites publiés maximum. Passe à Agence pour publier jusqu'à 10 sites."

	case "agence":
		return "Limite de la formule Agence atteinte : 10 sites publiés maximum."

	default:
		return fmt.Sprintf("Limite de publication atteinte : %d site(s) publié(s) maximum.", maxSites)
	}
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
	values.Set("description", "Lumio customer")

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

func normalizePaidPlan(plan string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "essentiel":
		return "essentiel", nil
	case "pro":
		return "pro", nil
	case "agence":
		return "agence", nil
	default:
		return "", errors.New("formule invalide")
	}
}

func recordCGVAcceptance(
	ctx context.Context,
	userID string,
	plan string,
) (time.Time, error) {
	var acceptedAt time.Time

	err := db.QueryRow(
		ctx,
		`
		INSERT INTO legal_acceptances (
			user_id,
			document_type,
			document_version,
			plan,
			accepted_at
		)
		VALUES (
			$1::uuid,
			'cgv',
			$2,
			$3,
			NOW()
		)
		ON CONFLICT (
			user_id,
			document_type,
			document_version,
			plan
		)
		DO UPDATE SET
			accepted_at = legal_acceptances.accepted_at
		RETURNING accepted_at;
		`,
		userID,
		currentCGVVersion,
		plan,
	).Scan(&acceptedAt)

	if err != nil {
		return time.Time{}, err
	}

	return acceptedAt, nil
}

func getCurrentCGVAcceptance(
	ctx context.Context,
	userID string,
	plan string,
) (time.Time, bool, error) {
	var acceptedAt time.Time

	err := db.QueryRow(
		ctx,
		`
		SELECT accepted_at
		FROM legal_acceptances
		WHERE user_id = $1::uuid
		  AND document_type = 'cgv'
		  AND document_version = $2
		  AND plan = $3
		LIMIT 1;
		`,
		userID,
		currentCGVVersion,
		plan,
	).Scan(&acceptedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, false, nil
		}

		return time.Time{}, false, err
	}

	return acceptedAt, true, nil
}

func cgvAcceptanceHandler(
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

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	var input CGVAcceptanceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"JSON invalide",
			http.StatusBadRequest,
		)
		return
	}

	plan, err := normalizePaidPlan(input.Plan)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	if strings.TrimSpace(input.Version) != currentCGVVersion {
		http.Error(
			w,
			"La version des CGV n'est plus à jour. Recharge la page avant de continuer.",
			http.StatusConflict,
		)
		return
	}

	acceptedAt, err := recordCGVAcceptance(
		r.Context(),
		user.ID,
		plan,
	)
	if err != nil {
		log.Println(
			"Erreur enregistrement acceptation CGV :",
			err,
		)

		http.Error(
			w,
			"Impossible d'enregistrer l'acceptation des CGV",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		CGVAcceptanceResponse{
			DocumentType:    "cgv",
			DocumentVersion: currentCGVVersion,
			Plan:            plan,
			AcceptedAt:      acceptedAt,
		},
	)
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

	acceptedAt, accepted, err := getCurrentCGVAcceptance(
		r.Context(),
		user.ID,
		plan,
	)
	if err != nil {
		log.Println("Erreur vérification acceptation CGV :", err)
		http.Error(
			w,
			"Impossible de vérifier l'acceptation des CGV",
			http.StatusInternalServerError,
		)
		return
	}

	if !accepted {
		http.Error(
			w,
			"Tu dois accepter la version actuelle des CGV avant le paiement.",
			http.StatusPreconditionRequired,
		)
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
	values.Set("metadata[cgv_version]", currentCGVVersion)
	values.Set("metadata[cgv_accepted_at]", acceptedAt.UTC().Format(time.RFC3339))
	values.Set("subscription_data[metadata][user_id]", user.ID)
	values.Set("subscription_data[metadata][plan]", plan)
	values.Set("subscription_data[metadata][cgv_version]", currentCGVVersion)
	values.Set(
		"subscription_data[metadata][cgv_accepted_at]",
		acceptedAt.UTC().Format(time.RFC3339),
	)

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

	if err != nil {
		return err
	}

	subscriptionStatus := strings.ToLower(strings.TrimSpace(subscription.Status))
	shouldUnpublish := subscriptionStatus == "canceled" ||
		subscriptionStatus == "incomplete_expired" ||
		subscriptionStatus == "unpaid"

	if shouldUnpublish {
		isAdmin, adminErr := isAdminUser(ctx, userID)
		if adminErr != nil {
			return adminErr
		}

		if !isAdmin {
			_, err = db.Exec(
				ctx,
				`UPDATE sites
				 SET published = FALSE,
				     published_at = NULL,
				     updated_at = NOW()
				 WHERE user_id = $1::uuid
				   AND published = TRUE;`,
				userID,
			)
			if err != nil {
				return err
			}
		}
	}

	return nil
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

func enableCORS(w http.ResponseWriter) {

	w.Header().Set(

		"Access-Control-Allow-Origin",

		"http://localhost:3000",
	)

	w.Header().Set(

		"Access-Control-Allow-Methods",

		"GET, POST, PUT, PATCH, DELETE, OPTIONS",
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

