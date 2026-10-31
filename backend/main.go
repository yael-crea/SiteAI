package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

const currentCGVVersion = "2026-10-31-parrainage"

// Types de documents enregistrés dans legal_acceptances.
const (
	legalDocumentCGV = "cgv"
	// Déclaration du client qu'il souscrit pour son activité professionnelle :
	// les offres Lumio sont réservées aux professionnels.
	legalDocumentProfessionalUse = "professional_use"
)

func main() {

	err := godotenv.Load()

	if err != nil {

		log.Println("Attention : fichier .env introuvable")

	}

	flushMonitoring := initMonitoring()
	defer flushMonitoring()

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
	http.HandleFunc("/quotes", quotesHandler)
	http.HandleFunc("/quotes/", quoteByIDHandler)

	http.HandleFunc("/analytics/pageview", analyticsPageViewHandler)
	http.HandleFunc("/analytics/event", analyticsEventHandler)
	http.HandleFunc("/analytics/summary", analyticsSummaryHandler)
	http.HandleFunc("/analytics/landing", landingEventHandler)

	http.HandleFunc("/stripe/checkout", stripeCheckoutHandler)

	http.HandleFunc("/stripe/portal", stripePortalHandler)

	http.HandleFunc("/stripe/status", stripeStatusHandler)

	http.HandleFunc("/stripe/webhook", stripeWebhookHandler)

	http.HandleFunc("/emails/unsubscribe", emailUnsubscribeHandler)

	http.HandleFunc("/referrals", referralsHandler)

	startLifecycleEmails()

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

	fmt.Println("Emails de relance :", lifecycleEmailStatus())

	fmt.Println("Suivi des erreurs :", monitoringStatus())

	fmt.Println("======================================")

	fmt.Println()

	log.Fatal(

		http.ListenAndServe(

			":"+port,

			withMonitoring(http.DefaultServeMux),
		),
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

	statusCode := http.StatusOK
	status := "ok"
	databaseStatus := "connected"

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if db == nil || db.Ping(ctx) != nil {
		statusCode = http.StatusServiceUnavailable
		status = "degraded"
		databaseStatus = "unavailable"
	}

	writeJSON(w, statusCode, map[string]string{
		"status":        status,
		"ai":            "enabled",
		"database":      databaseStatus,
		"auth":          "enabled",
		"publication":   "enabled",
		"customDomains": domainIntegrationStatus(),
		"stripe":        stripeIntegrationStatus(),
	})

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
