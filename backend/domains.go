package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

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
				"Un abonnement actif est nécessaire pour utiliser un domaine personnalisé.",
				http.StatusForbidden,
			)
			return
		}

		http.Error(
			w,
			"Ta formule ne permet pas de connecter un domaine personnalisé.",
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
				"Un abonnement actif est nécessaire pour vérifier un domaine personnalisé.",
				http.StatusForbidden,
			)
			return
		}

		http.Error(
			w,
			"Ta formule ne permet pas de connecter un domaine personnalisé.",
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
