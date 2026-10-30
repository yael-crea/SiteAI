package main

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.

const posterOtherUserID = "22222222-2222-2222-2222-222222222222"

type posterTestSites struct {
	published, draft, otherUser, withDomain int64
}

func setupPosterTestDB(t *testing.T) posterTestSites {
	t.Helper()

	databaseURL := os.Getenv("LUMIO_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("LUMIO_TEST_DATABASE_URL non défini")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	config.MaxConns = 1
	config.MinConns = 1

	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := pool.Exec(ctx, `
		CREATE TEMPORARY TABLE sites (
			id BIGSERIAL PRIMARY KEY,
			user_id UUID,
			business_name TEXT NOT NULL,
			activity TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL DEFAULT '',
			notification_email TEXT NOT NULL DEFAULT '',
			design_style TEXT NOT NULL DEFAULT 'moderne',
			accent_color TEXT NOT NULL DEFAULT '#2563eb',
			published BOOLEAN NOT NULL DEFAULT FALSE,
			public_slug TEXT,
			published_snapshot JSONB,
			custom_domain TEXT,
			custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE
		);`); err != nil {
		pool.Close()
		t.Fatal(err)
	}

	if _, err := pool.Exec(ctx, `
		CREATE TEMPORARY TABLE site_pageviews (
			id BIGSERIAL PRIMARY KEY,
			site_id BIGINT NOT NULL,
			user_id UUID NOT NULL,
			public_slug TEXT NOT NULL,
			visitor_id TEXT NOT NULL,
			utm_source TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`); err != nil {
		pool.Close()
		t.Fatal(err)
	}

	for _, table := range []string{"sites", "site_pageviews"} {
		var temporary bool
		if err := pool.QueryRow(ctx,
			`SELECT c.relnamespace = pg_my_temp_schema() FROM pg_class c WHERE c.oid = to_regclass($1);`, table,
		).Scan(&temporary); err != nil || !temporary {
			pool.Close()
			t.Fatalf("%s ne pointe pas vers une table temporaire (err=%v) : test arrêté", table, err)
		}
	}

	snapshot := `{"site":{"businessName":"Plomberie Éclair","phone":"06 12 34 56 78"},"activity":"Plombier","designStyle":"elegant","accentColor":"#0f766e"}`
	var sites posterTestSites
	for _, insert := range []struct {
		target *int64
		sql    string
		args   []any
	}{
		{&sites.published, `INSERT INTO sites (user_id, business_name, published, public_slug, published_snapshot) VALUES ($1::uuid, 'Brouillon renommé', TRUE, 'plomberie-eclair', $2::jsonb) RETURNING id`, []any{testUserID, snapshot}},
		{&sites.draft, `INSERT INTO sites (user_id, business_name, published) VALUES ($1::uuid, 'Pas encore en ligne', FALSE) RETURNING id`, []any{testUserID}},
		{&sites.otherUser, `INSERT INTO sites (user_id, business_name, published, public_slug, published_snapshot) VALUES ($1::uuid, 'Site d''un autre', TRUE, 'autre', $2::jsonb) RETURNING id`, []any{posterOtherUserID, snapshot}},
		{&sites.withDomain, `INSERT INTO sites (user_id, business_name, published, public_slug, published_snapshot, custom_domain, custom_domain_verified) VALUES ($1::uuid, 'Avec domaine', TRUE, 'avec-domaine', $2::jsonb, 'plomberie-eclair.fr', TRUE) RETURNING id`, []any{testUserID, snapshot}},
	} {
		if err := pool.QueryRow(ctx, insert.sql, insert.args...).Scan(insert.target); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	previous := db
	db = pool
	t.Cleanup(func() {
		db = previous
		pool.Close()
	})

	// Fake Supabase Auth: the token is the user ID.
	auth := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token != testUserID && token != posterOtherUserID {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"id": token, "email": "artisan@example.test"})
	}))
	t.Cleanup(auth.Close)
	t.Setenv("SUPABASE_URL", auth.URL)

	return sites
}

func requestPoster(method string, siteID int64, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "/sites/"+strconv.FormatInt(siteID, 10)+"/poster", nil)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	recorder := httptest.NewRecorder()
	siteByIDHandler(recorder, request)
	return recorder
}

func TestSitePosterRouteOwnerDownloadsPDF(t *testing.T) {
	sites := setupPosterTestDB(t)

	response := requestPoster(http.MethodGet, sites.published, testUserID)
	if response.Code != http.StatusOK {
		t.Fatalf("got HTTP %d (%s), want 200", response.Code, response.Body.String())
	}
	if got := response.Header().Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("Content-Type = %q", got)
	}
	if got := response.Header().Get("Content-Disposition"); got != `attachment; filename="affichette-plomberie-eclair.pdf"` {
		t.Fatalf("Content-Disposition = %q", got)
	}
	pdf := response.Body.Bytes()
	for _, want := range [][]byte{
		[]byte("%PDF-1.4"),
		[]byte("(Plomberie \xC9clair)"), // name from the published snapshot, not the draft
		[]byte("(06 12 34 56 78)"),
		[]byte("(lumio.business/site/plomberie-eclair)"),
		[]byte("/Times-Bold"), // published style: elegant
	} {
		if !bytes.Contains(pdf, want) {
			t.Errorf("contenu absent du PDF : %q", want)
		}
	}
	if bytes.Contains(pdf, []byte("Brouillon renomm")) {
		t.Fatal("l'affichette ne doit pas utiliser le brouillon non publié")
	}

	withDomain := requestPoster(http.MethodGet, sites.withDomain, testUserID)
	if withDomain.Code != http.StatusOK || !bytes.Contains(withDomain.Body.Bytes(), []byte("(plomberie-eclair.fr)")) {
		t.Fatalf("le domaine personnalisé vérifié doit être utilisé (HTTP %d)", withDomain.Code)
	}
}

func TestSitePosterRouteChecksOwnershipAndState(t *testing.T) {
	sites := setupPosterTestDB(t)

	tests := []struct {
		name   string
		method string
		siteID int64
		token  string
		want   int
	}{
		{"sans authentification", http.MethodGet, sites.published, "", http.StatusUnauthorized},
		{"jeton invalide", http.MethodGet, sites.published, "inconnu", http.StatusUnauthorized},
		{"site d'un autre utilisateur", http.MethodGet, sites.otherUser, testUserID, http.StatusNotFound},
		{"autre utilisateur sur mon site", http.MethodGet, sites.published, posterOtherUserID, http.StatusNotFound},
		{"site inexistant", http.MethodGet, 999999, testUserID, http.StatusNotFound},
		{"site non publié", http.MethodGet, sites.draft, testUserID, http.StatusConflict},
		{"méthode POST", http.MethodPost, sites.published, testUserID, http.StatusMethodNotAllowed},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := requestPoster(test.method, test.siteID, test.token)
			if response.Code != test.want {
				t.Fatalf("got HTTP %d (%s), want %d", response.Code, strings.TrimSpace(response.Body.String()), test.want)
			}
			if test.want != http.StatusOK && response.Header().Get("Content-Type") == "application/pdf" {
				t.Fatal("aucun PDF ne doit être renvoyé en cas de refus")
			}
		})
	}
}

func TestPageviewRecordsPosterUTMSource(t *testing.T) {
	setupPosterTestDB(t)

	for _, body := range []string{
		`{"publicSlug":"plomberie-eclair","visitorId":"v1","utmSource":"affichette"}`,
		`{"publicSlug":"plomberie-eclair","visitorId":"v2","utmSource":"<script>"}`,
		`{"publicSlug":"plomberie-eclair","visitorId":"v3"}`,
	} {
		request := httptest.NewRequest(http.MethodPost, "/analytics/pageview", strings.NewReader(body))
		recorder := httptest.NewRecorder()
		analyticsPageViewHandler(recorder, request)
		if recorder.Code != http.StatusCreated {
			t.Fatalf("%s: got HTTP %d, want 201", body, recorder.Code)
		}
	}

	var poster, other int64
	if err := db.QueryRow(context.Background(), `
		SELECT
			COUNT(*) FILTER (WHERE utm_source = 'affichette'),
			COUNT(*) FILTER (WHERE utm_source = '')
		FROM site_pageviews;`,
	).Scan(&poster, &other); err != nil {
		t.Fatal(err)
	}
	if poster != 1 || other != 2 {
		t.Fatalf("got %d visites affichette et %d autres, want 1 et 2", poster, other)
	}
}
