package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.

const (
	lifecycleFreeUser       = "a0000000-0000-0000-0000-000000000001"
	lifecycleSubscribedUser = "a0000000-0000-0000-0000-000000000002"
	lifecyclePublishedUser  = "a0000000-0000-0000-0000-000000000003"
	lifecycleOptedOutUser   = "a0000000-0000-0000-0000-000000000004"
	lifecycleNoEmailUser    = "a0000000-0000-0000-0000-000000000005"
)

func setupLifecycleTestDB(t *testing.T) {
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

	tables := []string{"sites", "user_billing", "lifecycle_emails", "email_preferences"}
	for _, statement := range []string{
		`CREATE TEMPORARY TABLE sites (
			id BIGSERIAL PRIMARY KEY,
			user_id UUID,
			business_name TEXT NOT NULL,
			notification_email TEXT NOT NULL DEFAULT '',
			published BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE user_billing (
			user_id UUID PRIMARY KEY,
			subscription_status TEXT NOT NULL DEFAULT 'inactive'
		);`,
		`CREATE TEMPORARY TABLE lifecycle_emails (
			user_id UUID NOT NULL,
			kind TEXT NOT NULL,
			sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, kind)
		);`,
		`CREATE TEMPORARY TABLE email_preferences (
			user_id UUID PRIMARY KEY,
			unsubscribe_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
			unsubscribed_at TIMESTAMPTZ
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

	twoHoursAgo := time.Now().Add(-2 * time.Hour)
	for _, statement := range []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO sites (user_id, business_name, notification_email, created_at) VALUES
			($1::uuid, 'Ancien nom', 'ancien@example.com', $5),
			($1::uuid, 'Boulangerie Martin', 'martin@example.com', $5),
			($2::uuid, 'Abonné', 'abonne@example.com', $5),
			($3::uuid, 'Désinscrit', 'desinscrit@example.com', $5),
			($4::uuid, 'Sans email', '', $5)`,
			[]any{lifecycleFreeUser, lifecycleSubscribedUser, lifecycleOptedOutUser, lifecycleNoEmailUser, twoHoursAgo}},
		{`INSERT INTO sites (user_id, business_name, notification_email, published, created_at)
		  VALUES ($1, 'Publié', 'publie@example.com', TRUE, $2)`,
			[]any{lifecyclePublishedUser, twoHoursAgo}},
		{`UPDATE sites SET updated_at = NOW() + INTERVAL '1 minute' WHERE business_name = 'Boulangerie Martin'`, nil},
		{`INSERT INTO user_billing (user_id, subscription_status) VALUES ($1, 'active')`, []any{lifecycleSubscribedUser}},
		{`INSERT INTO email_preferences (user_id, unsubscribed_at) VALUES ($1, NOW())`, []any{lifecycleOptedOutUser}},
	} {
		if _, err := pool.Exec(ctx, statement.sql, statement.args...); err != nil {
			pool.Close()
			t.Fatal(err)
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

func TestLifecycleEmailsTargetOnlyFreeUnpublishedAccounts(t *testing.T) {
	setupLifecycleTestDB(t)
	ctx := context.Background()

	var messages []lifecycleMessage
	sendLifecycleMessage = func(_ context.Context, message lifecycleMessage) error {
		messages = append(messages, message)
		return nil
	}

	sent, err := runLifecycleEmails(ctx, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if sent != 1 || len(messages) != 1 {
		t.Fatalf("1 email attendu, %d envoyés : %+v", sent, messages)
	}
	if messages[0].To != "martin@example.com" || messages[0].Subject != "Ton site Boulangerie Martin est prêt" {
		t.Fatalf("email inattendu : %s / %s", messages[0].To, messages[0].Subject)
	}

	sent, err = runLifecycleEmails(ctx, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if sent != 0 {
		t.Fatalf("le même email ne doit pas repartir, %d envoyés", sent)
	}

	// Four days later, the next step goes out.
	sent, err = runLifecycleEmails(ctx, time.Now().Add(4*24*time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if sent != 1 || messages[1].Subject != "Boulangerie Martin n'est pas encore en ligne" {
		t.Fatalf("relance « publier » attendue, %d envoyés", sent)
	}
}

func TestLifecycleEmailFailureIsRetried(t *testing.T) {
	setupLifecycleTestDB(t)
	ctx := context.Background()

	sendLifecycleMessage = func(context.Context, lifecycleMessage) error {
		return errors.New("Resend indisponible")
	}
	if sent, err := runLifecycleEmails(ctx, time.Now()); err != nil || sent != 0 {
		t.Fatalf("aucun envoi attendu, sent=%d err=%v", sent, err)
	}

	sendLifecycleMessage = func(context.Context, lifecycleMessage) error { return nil }
	if sent, err := runLifecycleEmails(ctx, time.Now()); err != nil || sent != 1 {
		t.Fatalf("l'email doit repartir après un échec, sent=%d err=%v", sent, err)
	}
}

func TestEmailUnsubscribeStopsReminders(t *testing.T) {
	setupLifecycleTestDB(t)
	ctx := context.Background()

	var unsubscribeURL string
	sendLifecycleMessage = func(_ context.Context, message lifecycleMessage) error {
		unsubscribeURL = message.UnsubscribeURL
		return nil
	}
	if _, err := runLifecycleEmails(ctx, time.Now()); err != nil {
		t.Fatal(err)
	}

	var token string
	if err := db.QueryRow(ctx, `SELECT unsubscribe_token::text FROM email_preferences WHERE user_id = $1`, lifecycleFreeUser).Scan(&token); err != nil {
		t.Fatal(err)
	}
	if unsubscribeURL == "" || unsubscribeURL[len(unsubscribeURL)-len(token):] != token {
		t.Fatalf("lien de désinscription %q sans le jeton %q", unsubscribeURL, token)
	}

	request := httptest.NewRequest(http.MethodPost, "/emails/unsubscribe?token="+token, nil)
	recorder := httptest.NewRecorder()
	emailUnsubscribeHandler(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("désinscription : code %d", recorder.Code)
	}

	sendLifecycleMessage = func(context.Context, lifecycleMessage) error {
		t.Fatal("aucun email ne doit partir après la désinscription")
		return nil
	}
	if sent, err := runLifecycleEmails(ctx, time.Now().Add(4*24*time.Hour)); err != nil || sent != 0 {
		t.Fatalf("aucun envoi attendu, sent=%d err=%v", sent, err)
	}
}
