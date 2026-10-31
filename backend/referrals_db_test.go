package main

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Same safety rules as stripe_webhooks_db_test.go: TEMPORARY tables on a
// single connection, verified to resolve to pg_temp before any write.

const (
	referrerID = "d0000000-0000-0000-0000-000000000001"
	referredID = "d0000000-0000-0000-0000-000000000002"
)

type stripeCredit struct {
	customer string
	amount   int
	key      string
}

func setupReferralTestDB(t *testing.T) *[]stripeCredit {
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
		`CREATE TEMPORARY TABLE referral_codes (
			user_id UUID PRIMARY KEY,
			code TEXT NOT NULL UNIQUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE TEMPORARY TABLE referrals (
			referred_user_id UUID PRIMARY KEY,
			referrer_user_id UUID NOT NULL,
			code TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			paid_at TIMESTAMPTZ,
			rewarded_at TIMESTAMPTZ,
			reward_cents INTEGER,
			CHECK (referred_user_id <> referrer_user_id)
		);`,
		`CREATE TEMPORARY TABLE user_billing (
			user_id UUID PRIMARY KEY,
			stripe_customer_id TEXT,
			stripe_subscription_id TEXT,
			plan TEXT NOT NULL DEFAULT 'free',
			subscription_status TEXT NOT NULL DEFAULT 'inactive'
		);`,
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			pool.Close()
			t.Fatal(err)
		}
	}

	for _, table := range []string{"referral_codes", "referrals", "user_billing"} {
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

	credits := &[]stripeCredit{}
	previousDB := db
	previousCredit := creditStripeCustomer
	db = pool
	creditStripeCustomer = func(_ context.Context, customer string, amount int, key string) error {
		*credits = append(*credits, stripeCredit{customer, amount, key})
		return nil
	}
	t.Cleanup(func() {
		db = previousDB
		creditStripeCustomer = previousCredit
		pool.Close()
	})
	return credits
}

func exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(err)
	}
}

func payCheckout(t *testing.T, userID string) {
	t.Helper()
	ctx := context.Background()
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if err := onReferralCheckoutPaid(ctx, tx, userID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestReferralRewardsReferrerOnceWithItsPlanPrice(t *testing.T) {
	credits := setupReferralTestDB(t)
	ctx := context.Background()

	code, err := referralCodeFor(ctx, referrerID)
	if err != nil {
		t.Fatal(err)
	}
	if again, _ := referralCodeFor(ctx, referrerID); again != code {
		t.Fatalf("le code doit rester le même : %q puis %q", code, again)
	}
	exec(t, `INSERT INTO user_billing VALUES ($1::uuid, 'cus_parrain', 'sub_p', 'pro', 'active')`, referrerID)

	if err := recordReferral(ctx, referredID, " "+code+" "); err != nil {
		t.Fatal(err)
	}
	exec(t, `INSERT INTO user_billing VALUES ($1::uuid, 'cus_filleul', 'sub_f', 'essentiel', 'active')`, referredID)

	// The webhook may be delivered more than once.
	payCheckout(t, referredID)
	payCheckout(t, referredID)

	if len(*credits) != 1 {
		t.Fatalf("1 crédit attendu, %d : %+v", len(*credits), *credits)
	}
	got := (*credits)[0]
	if got.customer != "cus_parrain" || got.amount != 3990 || got.key != "lumio-referral-"+referredID {
		t.Fatalf("crédit inattendu : %+v (attendu cus_parrain, 3990 centimes Pro)", got)
	}
}

func TestReferralSelfAndExistingCustomersAreIgnored(t *testing.T) {
	setupReferralTestDB(t)
	ctx := context.Background()

	code, err := referralCodeFor(ctx, referrerID)
	if err != nil {
		t.Fatal(err)
	}
	if err := recordReferral(ctx, referrerID, code); err != nil {
		t.Fatal(err)
	}

	exec(t, `INSERT INTO user_billing VALUES ($1::uuid, 'cus_old', 'sub_old', 'essentiel', 'canceled')`, referredID)
	if err := recordReferral(ctx, referredID, code); err != nil {
		t.Fatal(err)
	}

	var count int
	if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM referrals`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("auto-parrainage ou ancien client enregistré : %d parrainage(s)", count)
	}
}

func TestReferralCreditWaitsForReferrerFirstCheckout(t *testing.T) {
	credits := setupReferralTestDB(t)
	ctx := context.Background()

	code, err := referralCodeFor(ctx, referrerID)
	if err != nil {
		t.Fatal(err)
	}
	if err := recordReferral(ctx, referredID, code); err != nil {
		t.Fatal(err)
	}
	payCheckout(t, referredID)
	if len(*credits) != 0 {
		t.Fatal("aucun crédit possible tant que le parrain n'a pas de compte Stripe")
	}

	// The referrer subscribes to Essentiel: the pending month is credited.
	exec(t, `INSERT INTO user_billing VALUES ($1::uuid, 'cus_parrain', 'sub_p', 'essentiel', 'active')`, referrerID)
	payCheckout(t, referrerID)

	if len(*credits) != 1 || (*credits)[0].amount != 1990 {
		t.Fatalf("1 crédit Essentiel attendu au premier paiement du parrain : %+v", *credits)
	}
}

func TestReferralRewardsAreCappedPerYear(t *testing.T) {
	credits := setupReferralTestDB(t)

	exec(t, `INSERT INTO user_billing VALUES ($1::uuid, 'cus_parrain', 'sub_p', 'agence', 'active')`, referrerID)
	for i := 1; i <= referralMaxRewardsPerYear; i++ {
		exec(t, `INSERT INTO referrals (referred_user_id, referrer_user_id, code, paid_at, rewarded_at, reward_cents)
		         VALUES ($1::uuid, $2::uuid, 'abcd2345', NOW(), NOW() - INTERVAL '1 month', 7990)`,
			fmt.Sprintf("e0000000-0000-0000-0000-%012d", i), referrerID)
	}
	exec(t, `INSERT INTO referrals (referred_user_id, referrer_user_id, code) VALUES ($1::uuid, $2::uuid, 'abcd2345')`, referredID, referrerID)

	payCheckout(t, referredID)

	if len(*credits) != 0 {
		t.Fatalf("plafond de %d mois dépassé : %+v", referralMaxRewardsPerYear, *credits)
	}
	var paid bool
	if err := db.QueryRow(context.Background(), `SELECT paid_at IS NOT NULL FROM referrals WHERE referred_user_id = $1::uuid`, referredID).Scan(&paid); err != nil {
		t.Fatal(err)
	}
	if !paid {
		t.Fatal("le paiement du filleul doit rester enregistré, en attente de crédit")
	}
}
