package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// stripeDB is satisfied by both *pgxpool.Pool and pgx.Tx, so the webhook
// processing can run entirely inside the transaction that records the event.
type stripeDB interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// fetchStripeSubscription is a variable so tests can replace the Stripe API.
var fetchStripeSubscription = retrieveStripeSubscription

// Stripe gives up on a delivery after a few seconds; failing fast lets it
// retry instead of piling up blocked requests behind a stuck lock.
const stripeWebhookLockTimeout = 15 * time.Second

// Stripe stops retrying a delivery after three days; past that, an evt_ row
// no longer protects against anything.
const (
	stripeWebhookEventRetention = 30 * 24 * time.Hour
	stripeWebhookPurgeInterval  = time.Hour
)

// lastStripeWebhookPurge holds the UnixNano time of the last purge attempt.
var lastStripeWebhookPurge atomic.Int64

// handleStripeEventOnce applies a Stripe event at most once.
//
// The evt_* row is inserted in the same transaction as the billing update:
// either both are committed, or neither is and Stripe's retry processes the
// event again. A concurrent delivery of the same event blocks on the primary
// key until the first one finishes, then sees it as already processed.
func handleStripeEventOnce(
	ctx context.Context,
	event StripeEvent,
) error {
	if strings.TrimSpace(event.ID) == "" {
		return errors.New("événement Stripe sans identifiant")
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(context.WithoutCancel(ctx))
	}()

	if _, err := tx.Exec(
		ctx,
		"SELECT set_config('lock_timeout', $1, true);",
		stripeWebhookLockTimeout.String(),
	); err != nil {
		return err
	}

	claimed, err := claimStripeEvent(ctx, tx, event)
	if err != nil {
		return err
	}

	if !claimed {
		return nil
	}

	if err := processStripeEvent(ctx, tx, event); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	maybePurgeStripeWebhookEvents(ctx, time.Now())
	return nil
}

// maybePurgeStripeWebhookEvents removes old evt_ rows at most once per
// interval and per process. A failure is only logged: the event itself has
// already been committed and must not be reported to Stripe as failed.
func maybePurgeStripeWebhookEvents(ctx context.Context, now time.Time) {
	last := lastStripeWebhookPurge.Load()
	if now.Sub(time.Unix(0, last)) < stripeWebhookPurgeInterval {
		return
	}

	if !lastStripeWebhookPurge.CompareAndSwap(last, now.UnixNano()) {
		return
	}

	if _, err := purgeStripeWebhookEvents(ctx, db, now); err != nil {
		log.Println("Purge des événements Stripe impossible :", err)
	}
}

func purgeStripeWebhookEvents(
	ctx context.Context,
	q stripeDB,
	now time.Time,
) (int64, error) {
	tag, err := q.Exec(
		ctx,
		"DELETE FROM stripe_webhook_events WHERE processed_at < $1;",
		now.Add(-stripeWebhookEventRetention),
	)
	if err != nil {
		return 0, err
	}

	return tag.RowsAffected(), nil
}

func claimStripeEvent(
	ctx context.Context,
	q stripeDB,
	event StripeEvent,
) (bool, error) {
	tag, err := q.Exec(
		ctx,
		`
		INSERT INTO stripe_webhook_events (event_id, event_type)
		VALUES ($1, $2)
		ON CONFLICT (event_id) DO NOTHING;
		`,
		event.ID,
		event.Type,
	)
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() == 1, nil
}

func processStripeEvent(
	ctx context.Context,
	q stripeDB,
	event StripeEvent,
) error {
	switch event.Type {
	case "checkout.session.completed":
		var session StripeCheckoutSession
		if err := json.Unmarshal(event.Data.Object, &session); err != nil {
			return err
		}
		return syncCheckoutSession(ctx, q, session)

	case "customer.subscription.created",
		"customer.subscription.updated",
		"customer.subscription.deleted":
		var subscription StripeSubscription
		if err := json.Unmarshal(event.Data.Object, &subscription); err != nil {
			return err
		}

		if subscription.ID == "" || subscription.Customer == "" {
			return nil
		}

		if err := lockStripeCustomer(ctx, q, subscription.Customer); err != nil {
			return err
		}

		current, err := currentStripeSubscription(ctx, subscription)
		if err != nil {
			return err
		}

		return syncStripeSubscription(ctx, q, current)

	case "invoice.paid",
		"invoice.payment_failed":
		var invoice StripeInvoice
		if err := json.Unmarshal(event.Data.Object, &invoice); err != nil {
			return err
		}

		if invoice.Customer == "" {
			return nil
		}

		if err := lockStripeCustomer(ctx, q, invoice.Customer); err != nil {
			return err
		}

		subscriptionID := invoiceSubscriptionID(invoice)
		if subscriptionID == "" {
			err := q.QueryRow(
				ctx,
				`
				SELECT COALESCE(stripe_subscription_id, '')
				FROM user_billing
				WHERE stripe_customer_id = $1;
				`,
				invoice.Customer,
			).Scan(&subscriptionID)

			if errors.Is(err, pgx.ErrNoRows) {
				return nil
			}

			if err != nil {
				return err
			}
		}

		if subscriptionID == "" {
			return nil
		}

		current, err := currentStripeSubscription(ctx, StripeSubscription{
			ID:       subscriptionID,
			Customer: invoice.Customer,
		})
		if err != nil {
			return err
		}

		return syncStripeSubscription(ctx, q, current)

	default:
		return nil
	}
}

func invoiceSubscriptionID(invoice StripeInvoice) string {
	if id := strings.TrimSpace(invoice.Parent.SubscriptionDetails.Subscription); id != "" {
		return id
	}

	return strings.TrimSpace(invoice.Subscription)
}

// lockStripeCustomer serialises every webhook touching the same customer
// until the end of the transaction. Combined with currentStripeSubscription,
// the last transaction to write always holds the most recent Stripe state.
//
// It must be taken before any user_billing write so that all webhook
// transactions acquire their locks in the same order.
func lockStripeCustomer(
	ctx context.Context,
	q stripeDB,
	customerID string,
) error {
	_, err := q.Exec(
		ctx,
		"SELECT pg_advisory_xact_lock(hashtextextended($1, 0));",
		"stripe_customer:"+customerID,
	)
	return err
}

// currentStripeSubscription returns the subscription as Stripe knows it now.
//
// Webhooks can arrive late and out of order, so the payload is only used to
// identify the subscription: applying an old "active" snapshot after a newer
// cancellation would otherwise reactivate the account.
func currentStripeSubscription(
	ctx context.Context,
	fromEvent StripeSubscription,
) (StripeSubscription, error) {
	if fromEvent.ID == "" {
		return fromEvent, nil
	}

	current, err := fetchStripeSubscription(ctx, fromEvent.ID)
	if isStripeMissingResource(err) {
		// The subscription no longer exists: never trust a payload that may
		// still describe it as active.
		fromEvent.Status = "canceled"
		return fromEvent, nil
	}

	if err != nil {
		return StripeSubscription{}, err
	}

	return current, nil
}

func isStripeSubscriptionEnded(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "canceled", "incomplete_expired", "unpaid":
		return true
	default:
		return false
	}
}

func syncCheckoutSession(
	ctx context.Context,
	q stripeDB,
	session StripeCheckoutSession,
) error {
	userID := strings.TrimSpace(session.Metadata["user_id"])
	plan := strings.TrimSpace(session.Metadata["plan"])

	if userID == "" {
		userID = strings.TrimSpace(session.Metadata["userid"])
	}

	if userID == "" || session.Customer == "" {
		return nil
	}

	if plan == "" {
		plan = "free"
	}

	if err := lockStripeCustomer(ctx, q, session.Customer); err != nil {
		return err
	}

	_, err := q.Exec(
		ctx,
		`
		INSERT INTO user_billing (
			user_id,
			stripe_customer_id,
			stripe_subscription_id,
			plan,
			subscription_status,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			NULLIF($3, ''),
			$4,
			CASE WHEN $3 = '' THEN 'inactive' ELSE 'incomplete' END,
			NOW()
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_billing.stripe_subscription_id),
			plan = CASE
				WHEN EXCLUDED.plan = 'free' THEN user_billing.plan
				ELSE EXCLUDED.plan
			END,
			updated_at = NOW();
		`,
		userID,
		session.Customer,
		session.Subscription,
		plan,
	)
	if err != nil {
		return err
	}

	if session.Subscription == "" {
		return nil
	}

	current, err := currentStripeSubscription(ctx, StripeSubscription{
		ID:       session.Subscription,
		Customer: session.Customer,
	})
	if err != nil {
		return err
	}

	return syncStripeSubscription(ctx, q, current)
}

func syncStripeSubscription(
	ctx context.Context,
	q stripeDB,
	subscription StripeSubscription,
) error {
	if subscription.ID == "" || subscription.Customer == "" {
		return nil
	}

	userID := strings.TrimSpace(subscription.Metadata["user_id"])
	plan := strings.TrimSpace(subscription.Metadata["plan"])

	var priceID string
	var periodEndUnix int64

	if len(subscription.Items.Data) > 0 {
		priceID = strings.TrimSpace(subscription.Items.Data[0].Price.ID)

		for _, item := range subscription.Items.Data {
			if item.CurrentPeriodEnd > periodEndUnix {
				periodEndUnix = item.CurrentPeriodEnd
			}
		}
	}

	if plan == "" {
		plan = planFromStripePrice(priceID)
	}

	if userID == "" {
		err := q.QueryRow(
			ctx,
			`
			SELECT user_id::text
			FROM user_billing
			WHERE
				stripe_customer_id = $1
				OR stripe_subscription_id = $2
			LIMIT 1;
			`,
			subscription.Customer,
			subscription.ID,
		).Scan(&userID)

		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}

		if err != nil {
			return err
		}
	}

	if plan == "" {
		plan = "free"
	}

	var currentPeriodEnd any
	if periodEndUnix > 0 {
		currentPeriodEnd = time.Unix(periodEndUnix, 0).UTC()
	}

	ended := isStripeSubscriptionEnded(subscription.Status)

	// An ended subscription must not overwrite the row of a customer who has
	// since moved to another subscription (for example after a new checkout).
	tag, err := q.Exec(
		ctx,
		`
		INSERT INTO user_billing (
			user_id,
			stripe_customer_id,
			stripe_subscription_id,
			stripe_price_id,
			plan,
			subscription_status,
			current_period_end,
			cancel_at_period_end,
			updated_at
		)
		VALUES (
			$1::uuid,
			$2,
			$3,
			NULLIF($4, ''),
			$5,
			$6,
			$7,
			$8,
			NOW()
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			stripe_subscription_id = EXCLUDED.stripe_subscription_id,
			stripe_price_id = EXCLUDED.stripe_price_id,
			plan = EXCLUDED.plan,
			subscription_status = EXCLUDED.subscription_status,
			current_period_end = EXCLUDED.current_period_end,
			cancel_at_period_end = EXCLUDED.cancel_at_period_end,
			updated_at = NOW()
		WHERE
			NOT $9::boolean
			OR user_billing.stripe_subscription_id IS NULL
			OR user_billing.stripe_subscription_id = EXCLUDED.stripe_subscription_id;
		`,
		userID,
		subscription.Customer,
		subscription.ID,
		priceID,
		plan,
		subscription.Status,
		currentPeriodEnd,
		subscription.CancelAtPeriodEnd,
		ended,
	)

	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 || !ended {
		return nil
	}

	var isAdmin bool
	err = q.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM admin_users
			WHERE user_id = $1::uuid
		);
		`,
		userID,
	).Scan(&isAdmin)
	if err != nil {
		return err
	}

	if isAdmin {
		return nil
	}

	_, err = q.Exec(
		ctx,
		`UPDATE sites
		 SET published = FALSE,
		     published_at = NULL,
		     updated_at = NOW()
		 WHERE user_id = $1::uuid
		   AND published = TRUE;`,
		userID,
	)
	return err
}
