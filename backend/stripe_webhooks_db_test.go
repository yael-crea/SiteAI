package main

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// These tests run against a real PostgreSQL only when
// LUMIO_TEST_DATABASE_URL is set. Every table they touch is a TEMPORARY table
// on a single connection: PostgreSQL resolves pg_temp before public, so
// nothing is written to the real tables and everything disappears with the
// connection. The setup aborts if any name does not resolve to pg_temp.

const testUserID = "11111111-1111-1111-1111-111111111111"

func setupStripeWebhookTestDB(t *testing.T) {
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
		`CREATE TEMPORARY TABLE stripe_webhook_events (
			event_id TEXT PRIMARY KEY,
			event_type TEXT NOT NULL,
			processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE user_billing (
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
		);`,
		`CREATE TEMPORARY TABLE admin_users (user_id UUID PRIMARY KEY);`,
		`CREATE TEMPORARY TABLE sites (
			id BIGSERIAL PRIMARY KEY,
			user_id UUID,
			published BOOLEAN NOT NULL DEFAULT FALSE,
			published_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ
		);`,
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	for _, table := range []string{"stripe_webhook_events", "user_billing", "admin_users", "sites"} {
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

func subscriptionEvent(t *testing.T, eventID, eventType, status string) StripeEvent {
	t.Helper()

	object, err := json.Marshal(map[string]any{
		"id":       "sub_1",
		"customer": "cus_1",
		"status":   status,
		"metadata": map[string]string{"user_id": testUserID, "plan": "pro"},
	})
	if err != nil {
		t.Fatal(err)
	}

	event := StripeEvent{ID: eventID, Type: eventType}
	event.Data.Object = object
	return event
}

func stripeSubscriptionState(status string) StripeSubscription {
	return StripeSubscription{
		ID:       "sub_1",
		Customer: "cus_1",
		Status:   status,
		Metadata: map[string]string{"user_id": testUserID, "plan": "pro"},
	}
}

func billingStatus(t *testing.T) string {
	t.Helper()

	var status string
	err := db.QueryRow(
		context.Background(),
		"SELECT subscription_status FROM user_billing WHERE user_id = $1::uuid;",
		testUserID,
	).Scan(&status)
	if err != nil {
		t.Fatal(err)
	}
	return status
}

func processedEvents(t *testing.T) int {
	t.Helper()

	var count int
	if err := db.QueryRow(
		context.Background(),
		"SELECT COUNT(*) FROM stripe_webhook_events;",
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestStripeWebhookDuplicateIsAppliedOnce(t *testing.T) {
	setupStripeWebhookTestDB(t)

	var calls atomic.Int32
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		calls.Add(1)
		return stripeSubscriptionState("active"), nil
	})

	event := subscriptionEvent(t, "evt_dup", "customer.subscription.updated", "active")
	ctx := context.Background()

	for range 3 {
		if err := handleStripeEventOnce(ctx, event); err != nil {
			t.Fatal(err)
		}
	}

	if got := calls.Load(); got != 1 {
		t.Fatalf("the event was processed %d times, want 1", got)
	}

	if got := processedEvents(t); got != 1 {
		t.Fatalf("%d recorded events, want 1", got)
	}
}

func TestStripeWebhookLateEventDoesNotReactivate(t *testing.T) {
	setupStripeWebhookTestDB(t)

	// Stripe's current state: the subscription has been canceled.
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		return stripeSubscriptionState("canceled"), nil
	})

	ctx := context.Background()
	if _, err := db.Exec(ctx,
		"INSERT INTO sites (user_id, published) VALUES ($1::uuid, TRUE);",
		testUserID,
	); err != nil {
		t.Fatal(err)
	}

	deleted := subscriptionEvent(t, "evt_new", "customer.subscription.deleted", "canceled")
	if err := handleStripeEventOnce(ctx, deleted); err != nil {
		t.Fatal(err)
	}

	// An older "active" update is delivered afterwards.
	late := subscriptionEvent(t, "evt_old", "customer.subscription.updated", "active")
	if err := handleStripeEventOnce(ctx, late); err != nil {
		t.Fatal(err)
	}

	if got := billingStatus(t); got != "canceled" {
		t.Fatalf("a late webhook reactivated the subscription: %q", got)
	}

	var published bool
	if err := db.QueryRow(ctx,
		"SELECT published FROM sites WHERE user_id = $1::uuid;",
		testUserID,
	).Scan(&published); err != nil {
		t.Fatal(err)
	}
	if published {
		t.Fatal("the site of a canceled subscription is still published")
	}
}

func TestStripeWebhookFailureRollsBackAndAllowsRetry(t *testing.T) {
	setupStripeWebhookTestDB(t)

	failure := errors.New("Stripe unavailable")
	fail := true
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		if fail {
			return StripeSubscription{}, failure
		}
		return stripeSubscriptionState("active"), nil
	})

	ctx := context.Background()
	event := subscriptionEvent(t, "evt_retry", "customer.subscription.created", "active")

	if err := handleStripeEventOnce(ctx, event); !errors.Is(err, failure) {
		t.Fatalf("got %v, want the Stripe error", err)
	}

	if got := processedEvents(t); got != 0 {
		t.Fatal("a failed event was recorded as processed; Stripe's retry would be ignored")
	}

	fail = false
	if err := handleStripeEventOnce(ctx, event); err != nil {
		t.Fatal(err)
	}

	if got := billingStatus(t); got != "active" {
		t.Fatalf("got %q after retry, want active", got)
	}
}

func TestStripeWebhookEndedOldSubscriptionKeepsNewOne(t *testing.T) {
	setupStripeWebhookTestDB(t)

	ctx := context.Background()
	if _, err := db.Exec(ctx, `
		INSERT INTO user_billing (user_id, stripe_customer_id, stripe_subscription_id, plan, subscription_status)
		VALUES ($1::uuid, 'cus_1', 'sub_new', 'pro', 'active');`,
		testUserID,
	); err != nil {
		t.Fatal(err)
	}

	replaceStripeFetch(t, func(_ context.Context, id string) (StripeSubscription, error) {
		state := stripeSubscriptionState("canceled")
		state.ID = id
		return state, nil
	})

	old := subscriptionEvent(t, "evt_old_sub", "customer.subscription.deleted", "canceled")
	if err := handleStripeEventOnce(ctx, old); err != nil {
		t.Fatal(err)
	}

	if got := billingStatus(t); got != "active" {
		t.Fatalf("ending the old subscription overwrote the new one: %q", got)
	}
}

func TestStripeWebhookPurgeKeepsRecentEvents(t *testing.T) {
	setupStripeWebhookTestDB(t)

	ctx := context.Background()
	now := time.Now()

	if _, err := db.Exec(ctx, `
		INSERT INTO stripe_webhook_events (event_id, event_type, processed_at)
		VALUES
			('evt_old', 'invoice.paid', $1),
			('evt_recent', 'invoice.paid', $2);`,
		now.Add(-stripeWebhookEventRetention-time.Hour),
		now.Add(-stripeWebhookEventRetention+time.Hour),
	); err != nil {
		t.Fatal(err)
	}

	deleted, err := purgeStripeWebhookEvents(ctx, db, now)
	if err != nil {
		t.Fatal(err)
	}

	if deleted != 1 || processedEvents(t) != 1 {
		t.Fatalf("deleted %d, %d left; want only evt_old removed", deleted, processedEvents(t))
	}

	var remaining string
	if err := db.QueryRow(ctx, "SELECT event_id FROM stripe_webhook_events;").Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining != "evt_recent" {
		t.Fatalf("got %q, want evt_recent", remaining)
	}
}

func publishedSiteIDs(t *testing.T) []int64 {
	t.Helper()

	rows, err := db.Query(
		context.Background(),
		"SELECT id FROM sites WHERE user_id = $1::uuid AND published ORDER BY id;",
		testUserID,
	)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
	}
	return ids
}

func insertPublishedSites(t *testing.T, ages ...string) {
	t.Helper()

	for _, age := range ages {
		if _, err := db.Exec(
			context.Background(),
			"INSERT INTO sites (user_id, published, published_at) VALUES ($1::uuid, TRUE, NOW() - $2::interval);",
			testUserID,
			age,
		); err != nil {
			t.Fatal(err)
		}
	}
}

func TestStripeWebhookDowngradeKeepsOnlyIncludedSites(t *testing.T) {
	setupStripeWebhookTestDB(t)

	// Three sites published under Agence; the second one is the oldest.
	insertPublishedSites(t, "2 days", "30 days", "1 day")

	// The subscription is now Pro (metadata plan "pro"), which includes one site.
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		return stripeSubscriptionState("active"), nil
	})
	event := subscriptionEvent(t, "evt_downgrade", "customer.subscription.updated", "active")
	if err := handleStripeEventOnce(context.Background(), event); err != nil {
		t.Fatal(err)
	}

	if got := publishedSiteIDs(t); len(got) != 1 || got[0] != 2 {
		t.Fatalf("published sites after downgrade: %v, want only the oldest [2]", got)
	}
}

func TestStripeWebhookPastDueKeepsSitesOnline(t *testing.T) {
	setupStripeWebhookTestDB(t)

	insertPublishedSites(t, "2 days", "1 day")

	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		return stripeSubscriptionState("past_due"), nil
	})
	event := subscriptionEvent(t, "evt_past_due", "customer.subscription.updated", "past_due")
	if err := handleStripeEventOnce(context.Background(), event); err != nil {
		t.Fatal(err)
	}

	if got := publishedSiteIDs(t); len(got) != 2 {
		t.Fatalf("a payment issue unpublished sites: %v still published, want 2", got)
	}
}

func TestBillingEntitlementsMatchCommercialPlans(t *testing.T) {
	cases := []struct {
		plan          string
		sites         int
		domain, stats bool
		ai            int
	}{
		{"essentiel", 1, true, false, 50},
		{"pro", 1, true, true, 200},
		{"agence", 10, true, true, 1000},
	}
	for _, tc := range cases {
		status := BillingStatus{Plan: tc.plan, Status: "active"}
		got := billingEntitlements(status)
		if got.MaxPublishedSites != tc.sites || got.CustomDomainAllowed != tc.domain || got.DetailedAnalytics != tc.stats {
			t.Errorf("%s : %+v", tc.plan, got)
		}
		if limit := aiMonthlyLimit(status); limit != tc.ai {
			t.Errorf("%s : %d demandes IA, attendu %d", tc.plan, limit, tc.ai)
		}
	}

	free := BillingStatus{Plan: "free", Status: "inactive"}
	if got := billingEntitlements(free); got != (PlanEntitlements{}) {
		t.Errorf("gratuit : %+v, aucun droit attendu", got)
	}
	if limit := aiMonthlyLimit(free); limit != 15 {
		t.Errorf("gratuit : %d demandes IA, attendu 15", limit)
	}
}
