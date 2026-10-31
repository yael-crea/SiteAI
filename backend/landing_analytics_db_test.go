package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.
// auth.users belongs to Supabase: it is only read, and the funnel test is
// skipped where it does not exist (the CI creates an empty one).

func setupLandingTestDB(t *testing.T) {
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

	tables := []string{"landing_events", "sites", "user_billing", "stripe_webhook_events", "lifecycle_emails"}
	for _, statement := range []string{
		`CREATE TEMPORARY TABLE landing_events (
			id BIGSERIAL PRIMARY KEY,
			event_type TEXT NOT NULL CHECK (event_type IN ('view', 'cta_click')),
			placement TEXT NOT NULL DEFAULT '',
			source TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE sites (
			id BIGSERIAL PRIMARY KEY,
			user_id UUID,
			published_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE user_billing (
			user_id UUID PRIMARY KEY,
			subscription_status TEXT NOT NULL DEFAULT 'inactive'
		);`,
		`CREATE TEMPORARY TABLE stripe_webhook_events (
			event_id TEXT PRIMARY KEY,
			event_type TEXT NOT NULL,
			processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE lifecycle_emails (
			user_id UUID NOT NULL,
			kind TEXT NOT NULL,
			sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, kind)
		);`,
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	for _, table := range tables {
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

	previous := db
	db = pool
	t.Cleanup(func() {
		db = previous
		pool.Close()
	})
}

func postLandingEvent(t *testing.T, body string) {
	t.Helper()

	request := httptest.NewRequest(http.MethodPost, "/analytics/landing", strings.NewReader(body))
	recorder := httptest.NewRecorder()
	landingEventHandler(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("%s : code %d (%s)", body, recorder.Code, recorder.Body.String())
	}
}

func TestLandingEventsFeedAdminFunnel(t *testing.T) {
	setupLandingTestDB(t)
	ctx := context.Background()

	var hasAuthUsers bool
	if err := db.QueryRow(ctx, `SELECT to_regclass('auth.users') IS NOT NULL`).Scan(&hasAuthUsers); err != nil {
		t.Fatal(err)
	}
	if !hasAuthUsers {
		t.Skip("auth.users absente : entonnoir non testable sur cette base")
	}

	for _, body := range []string{
		`{"event":"view","source":"affichette"}`,
		`{"event":"view","source":"affichette"}`,
		`{"event":"view","source":"www.google.com"}`,
		`{"event":"view"}`,
		`{"event":"cta_click","placement":"hero","source":"affichette"}`,
		`{"event":"cta_click","placement":"hero"}`,
		`{"event":"cta_click","placement":"pricing"}`,
	} {
		postLandingEvent(t, body)
	}

	old := time.Now().AddDate(0, 0, -45)
	recent := time.Now().Add(-time.Hour)
	userA := "b0000000-0000-0000-0000-000000000001"
	userB := "b0000000-0000-0000-0000-000000000002"
	userC := "b0000000-0000-0000-0000-000000000003"

	for _, statement := range []struct {
		sql  string
		args []any
	}{
		// An old view, outside the period.
		{`INSERT INTO landing_events (event_type, created_at) VALUES ('view', $1)`, []any{old}},
		// A: first site in the period, published. B: first site before the
		// period, a new one in it. C: first site in the period, not published.
		{`INSERT INTO sites (user_id, created_at, published_at) VALUES
			($1::uuid, $4, $4), ($2::uuid, $5, NULL), ($2::uuid, $4, NULL), ($3::uuid, $4, NULL)`,
			[]any{userA, userB, userC, recent, old}},
		{`INSERT INTO stripe_webhook_events (event_id, event_type, processed_at) VALUES
			('evt_1', 'customer.subscription.created', $1),
			('evt_2', 'customer.subscription.created', $2),
			('evt_3', 'customer.subscription.updated', $1)`, []any{recent, old}},
		{`INSERT INTO user_billing (user_id, subscription_status) VALUES ($1::uuid, 'active'), ($2::uuid, 'canceled')`, []any{userA, userC}},
		{`INSERT INTO lifecycle_emails (user_id, kind, sent_at) VALUES
			($1::uuid, 'bienvenue', $3), ($1::uuid, 'publier', $3), ($2::uuid, 'bienvenue', $3)`,
			[]any{userA, userC, recent}},
	} {
		if _, err := db.Exec(ctx, statement.sql, statement.args...); err != nil {
			t.Fatal(err)
		}
	}

	funnel, err := loadAdminFunnel(ctx, time.Now().AddDate(0, 0, -adminFunnelDays))
	if err != nil {
		t.Fatal(err)
	}

	checks := []struct {
		name      string
		got, want int64
	}{
		{"vues", funnel.LandingViews, 4},
		{"clics", funnel.CTAClicks, 3},
		{"premiers sites", funnel.FirstSites, 2},
		{"comptes ayant publié", funnel.Publishers, 1},
		{"nouveaux abonnements", funnel.NewSubscriptions, 1},
		{"abonnés après relance", funnel.RemindedSubscribers, 1},
	}
	for _, check := range checks {
		if check.got != check.want {
			t.Errorf("%s : %d, attendu %d", check.name, check.got, check.want)
		}
	}

	if len(funnel.ClicksByButton) != 2 || funnel.ClicksByButton[0] != (AdminFunnelCount{Label: "hero", Count: 2}) {
		t.Errorf("clics par bouton : %+v", funnel.ClicksByButton)
	}
	if len(funnel.ViewsBySource) == 0 || funnel.ViewsBySource[0] != (AdminFunnelCount{Label: "affichette", Count: 2}) {
		t.Errorf("vues par source : %+v", funnel.ViewsBySource)
	}
	if len(funnel.ReminderEmails) != 2 || funnel.ReminderEmails[0].Label != "bienvenue" || funnel.ReminderEmails[0].Count != 2 {
		t.Errorf("emails de relance : %+v", funnel.ReminderEmails)
	}
}
