package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.
func setupAnalyticsEventsTestDB(t *testing.T) {
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

	for _, statement := range []string{
		`CREATE TEMPORARY TABLE sites (
			id BIGSERIAL PRIMARY KEY,
			user_id UUID,
			public_slug TEXT,
			business_name TEXT NOT NULL DEFAULT '',
			published BOOLEAN NOT NULL DEFAULT FALSE,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE site_pageviews (
			site_id BIGINT, visitor_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE leads (
			site_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		strings.Replace(
			strings.Replace(siteContactClicksSQL, "CREATE TABLE IF NOT EXISTS", "CREATE TEMPORARY TABLE", 1),
			"REFERENCES sites(id) ON DELETE CASCADE", "", 1,
		),
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	for _, table := range []string{"sites", "site_pageviews", "leads", "site_contact_clicks"} {
		var temporary bool
		err := pool.QueryRow(
			ctx,
			`SELECT c.relnamespace = pg_my_temp_schema()
			 FROM pg_class c
			 WHERE c.oid = to_regclass($1);`,
			table,
		).Scan(&temporary)
		if err != nil || !temporary {
			pool.Close()
			t.Fatalf("%s ne pointe pas vers une table temporaire (err=%v) : test arrêté", table, err)
		}
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO sites (user_id, public_slug, business_name, published)
		VALUES ($1::uuid, 'plombier-test', 'Plombier test', TRUE),
		       ($1::uuid, 'brouillon-test', 'Brouillon', FALSE);`,
		testUserID,
	); err != nil {
		pool.Close()
		t.Fatal(err)
	}

	previous := db
	db = pool
	t.Cleanup(func() {
		db = previous
		pool.Close()
	})
}

func postSiteEvent(body string) int {
	request := httptest.NewRequest(http.MethodPost, "/analytics/event", strings.NewReader(body))
	recorder := httptest.NewRecorder()
	analyticsEventHandler(recorder, request)
	return recorder.Code
}

func TestAnalyticsEventRecordsContactClicks(t *testing.T) {
	setupAnalyticsEventsTestDB(t)

	for _, eventType := range []string{"phone_click", "phone_click", "email_click", "form_submit"} {
		code := postSiteEvent(`{"publicSlug":"plombier-test","visitorId":"v1","eventType":"` + eventType + `"}`)
		if code != http.StatusCreated {
			t.Fatalf("%s: got HTTP %d, want 201", eventType, code)
		}
	}

	for body, want := range map[string]int{
		`{"publicSlug":"brouillon-test","visitorId":"v1","eventType":"phone_click"}`: http.StatusNotFound,
		`{"publicSlug":"inconnu","visitorId":"v1","eventType":"phone_click"}`:        http.StatusNotFound,
		`{"publicSlug":"plombier-test","visitorId":"v1","eventType":"publicite"}`:    http.StatusBadRequest,
		`{"publicSlug":"plombier-test","visitorId":"","eventType":"phone_click"}`:    http.StatusBadRequest,
	} {
		if got := postSiteEvent(body); got != want {
			t.Errorf("%s: got HTTP %d, want %d", body, got, want)
		}
	}

	var phone, email int64
	if err := db.QueryRow(context.Background(), `
		SELECT
			COUNT(*) FILTER (WHERE event_type = 'phone_click'),
			COUNT(*) FILTER (WHERE event_type = 'email_click')
		FROM site_contact_clicks;`,
	).Scan(&phone, &email); err != nil {
		t.Fatal(err)
	}

	if phone != 2 || email != 1 {
		t.Fatalf("got %d appels et %d e-mails, want 2 et 1", phone, email)
	}
}
