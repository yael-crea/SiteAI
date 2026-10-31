package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type StripeCheckoutInput struct {
	Plan         string `json:"plan"`
	ReferralCode string `json:"referralCode"`
}

type StripeCheckoutSession struct {
	ID           string            `json:"id"`
	URL          string            `json:"url"`
	Customer     string            `json:"customer"`
	Subscription string            `json:"subscription"`
	Metadata     map[string]string `json:"metadata"`
}

type StripeCustomer struct {
	ID      string `json:"id"`
	Deleted bool   `json:"deleted"`
}

type StripeAPIError struct {
	StatusCode int
	Code       string
	Param      string
	Message    string
}

func (err *StripeAPIError) Error() string {
	if err == nil {
		return ""
	}

	if strings.TrimSpace(err.Message) != "" {
		return err.Message
	}

	return fmt.Sprintf("Stripe %d", err.StatusCode)
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
	// Subscription is filled by older Stripe API versions only; newer ones
	// expose the same ID under parent.subscription_details.subscription.
	Subscription string `json:"subscription"`
	Parent       struct {
		SubscriptionDetails struct {
			Subscription string `json:"subscription"`
		} `json:"subscription_details"`
	} `json:"parent"`
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
	DetailedAnalytics   bool       `json:"detailedAnalytics"`
	IsAdmin             bool       `json:"isAdmin"`
	IsOwner             bool       `json:"isOwner"`
}

type PlanEntitlements struct {
	MaxPublishedSites   int
	CustomDomainAllowed bool
	// Statistiques détaillées (visiteurs, appels, e-mails, prospects) :
	// réservées aux formules Pro et Agence.
	DetailedAnalytics bool
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
				Code    string `json:"code"`
				Param   string `json:"param"`
			} `json:"error"`
		}

		if json.Unmarshal(data, &stripeError) == nil {
			message := strings.TrimSpace(stripeError.Error.Message)
			if message != "" {
				return &StripeAPIError{
					StatusCode: response.StatusCode,
					Code:       strings.TrimSpace(stripeError.Error.Code),
					Param:      strings.TrimSpace(stripeError.Error.Param),
					Message:    message,
				}
			}
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

func isStripeMissingResource(err error) bool {
	var stripeError *StripeAPIError

	return errors.As(err, &stripeError) &&
		stripeError.StatusCode == http.StatusNotFound &&
		stripeError.Code == "resource_missing"
}

func retrieveStripeCustomer(
	ctx context.Context,
	customerID string,
) (StripeCustomer, error) {
	var customer StripeCustomer

	err := doStripeForm(
		ctx,
		http.MethodGet,
		"/v1/customers/"+url.PathEscape(strings.TrimSpace(customerID)),
		nil,
		&customer,
	)

	return customer, err
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
			IsOwner:         isAdmin,
		}

		if isAdmin {
			billingStatus.Plan = "agence"
			billingStatus.Status = "active"
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
		CanManage:         customerID != "" && hasSubscription,
		IsAdmin:           isAdmin,
		IsOwner:           isAdmin,
	}

	if isAdmin {
		// Un administrateur Lumio garde tous les droits produit,
		// indépendamment de son abonnement Stripe.
		// On expose "agence" + "active" pour que le frontend
		// débloque aussi les fonctions réservées Pro/Agence.
		billingStatus.Plan = "agence"
		billingStatus.Status = "active"
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
			DetailedAnalytics:   true,
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
			MaxPublishedSites:   1,
			CustomDomainAllowed: true,
			DetailedAnalytics:   true,
		}

	case "agence":
		return PlanEntitlements{
			MaxPublishedSites:   10,
			CustomDomainAllowed: true,
			DetailedAnalytics:   true,
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
	status.DetailedAnalytics = entitlements.DetailedAnalytics
}

func publishedSiteLimitMessage(plan string, maxSites int) string {
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "essentiel":
		return "Limite de la formule Essentiel atteinte : 1 site publié maximum. Passe à Agence pour publier jusqu'à 10 sites."

	case "pro":
		return "Limite de la formule Pro atteinte : 1 site publié maximum. Passe à Agence pour publier jusqu'à 10 sites."

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
	_, customerID, subscriptionID, err := getBillingStatus(ctx, user.ID)
	if err != nil {
		return "", err
	}

	if customerID != "" {
		customer, retrieveErr := retrieveStripeCustomer(ctx, customerID)
		if retrieveErr == nil && !customer.Deleted {
			return customerID, nil
		}

		if retrieveErr != nil && !isStripeMissingResource(retrieveErr) {
			return "", retrieveErr
		}

		if subscriptionID != "" {
			return "", errors.New(
				"le compte Stripe enregistré n'existe plus alors qu'un abonnement est encore référencé",
			)
		}

		log.Printf(
			"Customer Stripe obsolète remplacé pour l'utilisateur %s",
			user.ID,
		)
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

	// A referral problem must never block the payment.
	if err := recordReferral(r.Context(), user.ID, input.ReferralCode); err != nil {
		log.Println("Erreur enregistrement parrainage :", err)
	}

	acceptedAt, accepted, err := getCurrentLegalAcceptance(
		r.Context(),
		user.ID,
		legalDocumentCGV,
		plan,
	)
	var professionalUseAt time.Time
	professionalUseDeclared := false
	if err == nil && accepted {
		professionalUseAt, professionalUseDeclared, err = getCurrentLegalAcceptance(
			r.Context(),
			user.ID,
			legalDocumentProfessionalUse,
			plan,
		)
	}
	if err != nil {
		log.Println("Erreur vérification acceptation CGV :", err)
		http.Error(
			w,
			"Impossible de vérifier l'acceptation des CGV",
			http.StatusInternalServerError,
		)
		return
	}

	if !accepted || !professionalUseDeclared {
		http.Error(
			w,
			"Tu dois accepter la version actuelle des CGV et déclarer un usage professionnel avant le paiement.",
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
	configureStripeBillingDetails(values)
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
	values.Set(
		"subscription_data[metadata][professional_use_declared_at]",
		professionalUseAt.UTC().Format(time.RFC3339),
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

func configureStripeBillingDetails(values url.Values) {
	// Lumio relève de la franchise en base de TVA (article 293 B du CGI) :
	// le prix affiché est le prix payé, Stripe ne doit ajouter aucune taxe.
	// L'adresse de facturation reste demandée pour les factures.
	values.Set("billing_address_collection", "required")
	values.Set("customer_update[address]", "auto")
	values.Set("customer_update[name]", "auto")
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

	status, customerID, subscriptionID, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire l'abonnement", http.StatusInternalServerError)
		return
	}

	if customerID == "" || subscriptionID == "" || !status.HasSubscription {
		http.Error(w, "Aucun compte Stripe associé", http.StatusBadRequest)
		return
	}

	customer, err := retrieveStripeCustomer(r.Context(), customerID)
	if err != nil || customer.Deleted {
		if err != nil && !isStripeMissingResource(err) {
			log.Println("Erreur vérification customer Stripe :", err)
			http.Error(w, "Impossible de vérifier le compte Stripe", http.StatusBadGateway)
			return
		}

		http.Error(
			w,
			"Le compte d'abonnement Stripe n'existe plus. Contacte le support Lumio.",
			http.StatusConflict,
		)
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

	status, customerID, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire l'abonnement", http.StatusInternalServerError)
		return
	}

	if status.IsOwner && status.CanManage && customerID != "" {
		customer, retrieveErr := retrieveStripeCustomer(r.Context(), customerID)
		if isStripeMissingResource(retrieveErr) ||
			(retrieveErr == nil && customer.Deleted) {
			// L'accès propriétaire ne dépend pas de Stripe. Une ancienne
			// référence ne doit donc pas être présentée comme un abonnement réel.
			status.HasSubscription = false
			status.CanManage = false
			status.CurrentPeriodEnd = nil
			status.CancelAtPeriodEnd = false
		} else if retrieveErr != nil {
			log.Println("Erreur vérification abonnement propriétaire :", retrieveErr)
		}
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

	if err := handleStripeEventOnce(r.Context(), event); err != nil {
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
