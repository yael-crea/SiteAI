package main

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.

func setupSiteLiveTestDB(t *testing.T) {
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
			business_name TEXT NOT NULL,
			notification_email TEXT NOT NULL DEFAULT '',
			public_slug TEXT,
			custom_domain TEXT,
			custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
			published BOOLEAN NOT NULL DEFAULT FALSE
		);`,
		`CREATE TEMPORARY TABLE lifecycle_emails (
			user_id UUID NOT NULL,
			kind TEXT NOT NULL,
			sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, kind)
		);`,
		`INSERT INTO sites (user_id, business_name, notification_email, public_slug, published)
		 VALUES ('c0000000-0000-0000-0000-000000000001', 'Garage Martin', 'martin@example.com', 'garage-martin-1', TRUE);`,
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	for _, table := range []string{"sites", "lifecycle_emails"} {
		var temporary bool
		err := pool.QueryRow(
			ctx,
			`SELECT c.relnamespace = pg_my_temp_schema() FROM pg_class c WHERE c.oid = to_regclass($1);`,
			table,
		).Scan(&temporary)
		if err != nil || !temporary {
			pool.Close()
			t.Fatalf("%s ne pointe pas vers une table temporaire (err=%v) : test arrêté", table, err)
		}
	}

	previousDB := db
	previousSend := sendLifecycleMessage
	db = pool
	t.Cleanup(func() {
		db = previousDB
		sendLifecycleMessage = previousSend
		pool.Close()
	})
}

func TestSiteLiveEmailIsSentOncePerSite(t *testing.T) {
	setupSiteLiveTestDB(t)
	ctx := context.Background()

	var sent []lifecycleMessage
	sendLifecycleMessage = func(_ context.Context, message lifecycleMessage) error {
		sent = append(sent, message)
		return nil
	}

	// Publish, unpublish and publish again: one email only.
	for range 2 {
		if err := sendSiteLiveEmail(ctx, 1); err != nil {
			t.Fatal(err)
		}
	}

	if len(sent) != 1 || sent[0].To != "martin@example.com" {
		t.Fatalf("1 email attendu pour martin@example.com, reçu %+v", sent)
	}
}

func TestSiteLiveEmailFailureIsRetried(t *testing.T) {
	setupSiteLiveTestDB(t)
	ctx := context.Background()

	sendLifecycleMessage = func(context.Context, lifecycleMessage) error {
		return errors.New("Resend indisponible")
	}
	if err := sendSiteLiveEmail(ctx, 1); err == nil {
		t.Fatal("l'échec d'envoi doit être remonté")
	}

	calls := 0
	sendLifecycleMessage = func(context.Context, lifecycleMessage) error {
		calls++
		return nil
	}
	if err := sendSiteLiveEmail(ctx, 1); err != nil || calls != 1 {
		t.Fatalf("l'email doit repartir après un échec (err=%v, envois=%d)", err, calls)
	}
}
