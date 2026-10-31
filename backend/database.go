package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func initDatabase() error {

	ctx, cancel := context.WithTimeout(

		context.Background(),

		15*time.Second,
	)

	defer cancel()

	pool, err := pgxpool.New(

		ctx,

		os.Getenv("DATABASE_URL"),
	)

	if err != nil {

		return err

	}

	err = pool.Ping(ctx)

	if err != nil {

		pool.Close()

		return err

	}

	db = pool

	fmt.Println("Connexion PostgreSQL réussie")

	return createTables(ctx)

}

func createTables(ctx context.Context) error {

	queries := []string{

		`

        CREATE TABLE IF NOT EXISTS sites (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID,

            business_name TEXT NOT NULL,

            activity TEXT NOT NULL DEFAULT '',

            city TEXT NOT NULL DEFAULT '',

            phone TEXT NOT NULL DEFAULT '',

            notification_email TEXT NOT NULL DEFAULT '',

            design_style TEXT NOT NULL DEFAULT 'moderne',

            accent_color TEXT NOT NULL DEFAULT '#2563eb',

            site_data JSONB NOT NULL,

            published BOOLEAN NOT NULL DEFAULT FALSE,

            public_slug TEXT,

            published_at TIMESTAMPTZ,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS user_id UUID;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS notification_email TEXT NOT NULL DEFAULT '';

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS public_slug TEXT;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_sites_user_id

        ON sites(user_id);

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_public_slug

        ON sites(public_slug)

        WHERE public_slug IS NOT NULL;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain TEXT;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE sites

        ADD COLUMN IF NOT EXISTS custom_domain_updated_at TIMESTAMPTZ;

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain

        ON sites(LOWER(custom_domain))

        WHERE custom_domain IS NOT NULL AND custom_domain <> '';

        `,

		`

        CREATE TABLE IF NOT EXISTS user_billing (

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

        );

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_billing_customer

        ON user_billing(stripe_customer_id)

        WHERE stripe_customer_id IS NOT NULL AND stripe_customer_id <> '';

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_billing_subscription

        ON user_billing(stripe_subscription_id)

        WHERE stripe_subscription_id IS NOT NULL AND stripe_subscription_id <> '';

        `,

		`

        CREATE TABLE IF NOT EXISTS legal_acceptances (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID NOT NULL,

            document_type TEXT NOT NULL,

            document_version TEXT NOT NULL,

            plan TEXT NOT NULL,

            accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_acceptances_unique

        ON legal_acceptances(
            user_id,
            document_type,
            document_version,
            plan
        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user

        ON legal_acceptances(user_id, accepted_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS ai_usage (

            id BIGSERIAL PRIMARY KEY,

            user_id UUID NOT NULL,

            action TEXT NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created_at

        ON ai_usage(user_id, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS leads (

            id BIGSERIAL PRIMARY KEY,

            site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

            user_id UUID NOT NULL,

            public_slug TEXT NOT NULL,

            name TEXT NOT NULL,

            email TEXT NOT NULL DEFAULT '',

            phone TEXT NOT NULL DEFAULT '',

            message TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'new',

            consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ NULL;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS quote_amount_cents BIGINT NOT NULL DEFAULT 0;

        `,

		`

        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ NULL;

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_user_created_at

        ON leads(user_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_site_created_at

        ON leads(site_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_leads_user_archived_created_at

        ON leads(user_id, archived, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS quotes (

            id BIGSERIAL PRIMARY KEY,

            lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

            site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

            user_id UUID NOT NULL,

            quote_number TEXT NOT NULL,

            title TEXT NOT NULL DEFAULT 'Devis',

            items JSONB NOT NULL DEFAULT '[]'::jsonb,

            subtotal_cents BIGINT NOT NULL,

            tax_rate_bps INTEGER NOT NULL DEFAULT 0,

            tax_cents BIGINT NOT NULL DEFAULT 0,

            total_cents BIGINT NOT NULL,

            notes TEXT NOT NULL DEFAULT '',

            status TEXT NOT NULL DEFAULT 'draft',

            valid_until DATE NOT NULL,

            sent_at TIMESTAMPTZ,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            UNIQUE(user_id, quote_number)

        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_quotes_user_created_at

        ON quotes(user_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_quotes_lead_created_at

        ON quotes(lead_id, created_at DESC);

        `,

		`

        CREATE TABLE IF NOT EXISTS site_pageviews (

            id BIGSERIAL PRIMARY KEY,

            site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

            user_id UUID NOT NULL,

            public_slug TEXT NOT NULL,

            visitor_id TEXT NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_site_created_at

        ON site_pageviews(site_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_user_created_at

        ON site_pageviews(user_id, created_at DESC);

        `,

		`

        CREATE INDEX IF NOT EXISTS idx_site_pageviews_unique_visitor

        ON site_pageviews(site_id, visitor_id, created_at DESC);

        `,

		// Campaign source of the visit (e.g. "affichette" for the printed poster QR code).
		`ALTER TABLE site_pageviews ADD COLUMN IF NOT EXISTS utm_source TEXT NOT NULL DEFAULT '';`,

		`

        CREATE TABLE IF NOT EXISTS admin_users (

            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );

        `,
	}

	for _, query := range queries {

		_, err := db.Exec(ctx, query)

		if err != nil {

			return err

		}

	}

	if _, err := db.Exec(ctx, versionMigrationSQL); err != nil {
		return err
	}

	if _, err := db.Exec(ctx, siteContactClicksSQL); err != nil {
		return err
	}

	if err := applySupabaseSecurityBaseline(ctx); err != nil {
		return err
	}

	if err := applyStripeWebhookEventsMigration(ctx); err != nil {
		return err
	}

	if err := applyLifecycleEmailsMigration(ctx); err != nil {
		return err
	}

	if err := applyReferralsMigration(ctx); err != nil {
		return err
	}

	if err := applyLandingEventsMigration(ctx); err != nil {
		return err
	}

	fmt.Println("Table sites prête")

	return nil

}
