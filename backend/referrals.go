package main

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// Referral programme (« parrainage »). Tables:
// migrations/20261031_referrals.sql.
//
//  1. Every account gets a personal link: lumio.business/?parrain=<code>.
//  2. The landing page keeps the code; the first checkout of the visitor
//     records the referral (recordReferral).
//  3. When the referred account pays its first month (checkout completed,
//     subscription active), the referrer's Stripe balance is credited with
//     one month of its plan, deducted from its next invoice. A referrer
//     without a Stripe customer yet gets the credit at its own first
//     checkout. At most 12 months credited per rolling year.

const (
	referralMaxRewardsPerYear = 12
	referralCodeLength        = 8
	referralCodeAlphabet      = "abcdefghjkmnpqrstuvwxyz23456789"
)

var referralCodePattern = regexp.MustCompile(`^[a-z0-9]{6,16}$`)

// Monthly prices in cents, as on the pricing page and in the CGV.
var planPriceCents = map[string]int{
	"essentiel": 1990,
	"pro":       3990,
	"agence":    7990,
}

// creditStripeCustomer is a variable so tests can replace the Stripe API.
var creditStripeCustomer = createStripeBalanceCredit

func normalizeReferralCode(code string) (string, bool) {
	code = strings.ToLower(strings.TrimSpace(code))
	return code, referralCodePattern.MatchString(code)
}

func newReferralCode() (string, error) {
	buffer := make([]byte, referralCodeLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	code := make([]byte, referralCodeLength)
	for index, value := range buffer {
		code[index] = referralCodeAlphabet[int(value)%len(referralCodeAlphabet)]
	}
	return string(code), nil
}

// referralCodeFor returns the user's code, creating it on first use.
func referralCodeFor(ctx context.Context, userID string) (string, error) {
	for attempt := 0; attempt < 5; attempt++ {
		candidate, err := newReferralCode()
		if err != nil {
			return "", err
		}
		var code string
		err = db.QueryRow(
			ctx,
			`WITH inserted AS (
			     INSERT INTO referral_codes (user_id, code) VALUES ($1::uuid, $2)
			     ON CONFLICT DO NOTHING
			     RETURNING code
			 )
			 SELECT code FROM inserted
			 UNION ALL
			 SELECT code FROM referral_codes WHERE user_id = $1::uuid
			 LIMIT 1`,
			userID,
			candidate,
		).Scan(&code)
		if err == nil {
			return code, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", err
		}
		// The candidate code belongs to another account: try another one.
	}
	return "", errors.New("code de parrainage impossible à générer")
}

// recordReferral links a new customer to its referrer at checkout. Ignored
// when the code is unknown, is the user's own, or the user already has (or
// had) a subscription or a referrer.
func recordReferral(ctx context.Context, userID, rawCode string) error {
	code, ok := normalizeReferralCode(rawCode)
	if !ok {
		return nil
	}
	_, err := db.Exec(
		ctx,
		`INSERT INTO referrals (referred_user_id, referrer_user_id, code)
		 SELECT $1::uuid, c.user_id, c.code
		 FROM referral_codes c
		 WHERE c.code = $2
		   AND c.user_id <> $1::uuid
		   AND NOT EXISTS (
		       SELECT 1 FROM user_billing b
		       WHERE b.user_id = $1::uuid AND b.stripe_subscription_id IS NOT NULL)
		 ON CONFLICT (referred_user_id) DO NOTHING`,
		userID,
		code,
	)
	return err
}

// onReferralCheckoutPaid runs in the Stripe webhook transaction once a
// checkout is paid: it marks the user's own referral as paid, then credits
// what is owed to the user's referrer and to the user as a referrer.
func onReferralCheckoutPaid(ctx context.Context, q stripeDB, userID string) error {
	var referrerID string
	err := q.QueryRow(
		ctx,
		`UPDATE referrals SET paid_at = NOW()
		 WHERE referred_user_id = $1::uuid AND paid_at IS NULL
		 RETURNING referrer_user_id::text`,
		userID,
	).Scan(&referrerID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	if referrerID != "" {
		if err := applyReferralRewards(ctx, q, referrerID); err != nil {
			return err
		}
	}
	return applyReferralRewards(ctx, q, userID)
}

// applyReferralRewards credits the referrer for every paid referral not yet
// rewarded, within the yearly limit. The Stripe idempotency key is the
// referred account, so a retried webhook never credits twice.
func applyReferralRewards(ctx context.Context, q stripeDB, referrerID string) error {
	var customerID, plan, status string
	err := q.QueryRow(
		ctx,
		`SELECT COALESCE(stripe_customer_id, ''), COALESCE(plan, ''), COALESCE(subscription_status, '')
		 FROM user_billing WHERE user_id = $1::uuid`,
		referrerID,
	).Scan(&customerID, &plan, &status)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && customerID == "") {
		return nil // Credited at the referrer's own first checkout.
	}
	if err != nil {
		return err
	}

	amount := planPriceCents["essentiel"]
	if price, ok := planPriceCents[strings.ToLower(plan)]; ok && isActiveBillingStatus(status) {
		amount = price
	}

	for {
		var rewardedThisYear int
		if err := q.QueryRow(
			ctx,
			`SELECT COUNT(*) FROM referrals
			 WHERE referrer_user_id = $1::uuid AND rewarded_at > NOW() - INTERVAL '1 year'`,
			referrerID,
		).Scan(&rewardedThisYear); err != nil {
			return err
		}
		if rewardedThisYear >= referralMaxRewardsPerYear {
			return nil // Kept pending: credited once the yearly count goes down.
		}

		var referredID string
		err := q.QueryRow(
			ctx,
			`SELECT referred_user_id::text FROM referrals
			 WHERE referrer_user_id = $1::uuid AND paid_at IS NOT NULL AND rewarded_at IS NULL
			 ORDER BY paid_at
			 LIMIT 1
			 FOR UPDATE`,
			referrerID,
		).Scan(&referredID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}

		if err := creditStripeCustomer(ctx, customerID, amount, "lumio-referral-"+referredID); err != nil {
			return err
		}

		if _, err := q.Exec(
			ctx,
			`UPDATE referrals SET rewarded_at = NOW(), reward_cents = $2 WHERE referred_user_id = $1::uuid`,
			referredID,
			amount,
		); err != nil {
			return err
		}
	}
}

// createStripeBalanceCredit adds a credit to the customer's Stripe balance,
// applied automatically to its next invoices.
func createStripeBalanceCredit(ctx context.Context, customerID string, amountCents int, idempotencyKey string) error {
	secret := strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
	if secret == "" {
		return errors.New("STRIPE_SECRET_KEY manquant")
	}

	values := url.Values{}
	values.Set("amount", fmt.Sprintf("-%d", amountCents))
	values.Set("currency", "eur")
	values.Set("description", "Parrainage Lumio : 1 mois offert")

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.stripe.com/v1/customers/"+url.PathEscape(customerID)+"/balance_transactions",
		strings.NewReader(values.Encode()),
	)
	if err != nil {
		return err
	}
	request.SetBasicAuth(secret, "")
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Idempotency-Key", idempotencyKey)

	response, err := (&http.Client{Timeout: 10 * time.Second}).Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("crédit Stripe refusé : HTTP %d", response.StatusCode)
	}
	return nil
}

type ReferralSummary struct {
	Code         string `json:"code"`
	Link         string `json:"link"`
	Referred     int    `json:"referred"`
	Paid         int    `json:"paid"`
	MonthsEarned int    `json:"monthsEarned"`
	Pending      int    `json:"pending"`
	MaxPerYear   int    `json:"maxPerYear"`
}

func referralsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	code, err := referralCodeFor(r.Context(), user.ID)
	if err != nil {
		log.Println("Erreur code de parrainage :", err)
		http.Error(w, "Impossible de charger le parrainage", http.StatusInternalServerError)
		return
	}

	summary := ReferralSummary{
		Code:       code,
		Link:       strings.TrimRight(lumioPublicBaseURL, "/") + "/?parrain=" + code,
		MaxPerYear: referralMaxRewardsPerYear,
	}
	if err := db.QueryRow(
		r.Context(),
		`SELECT COUNT(*),
		        COUNT(*) FILTER (WHERE paid_at IS NOT NULL),
		        COUNT(*) FILTER (WHERE rewarded_at IS NOT NULL),
		        COUNT(*) FILTER (WHERE paid_at IS NOT NULL AND rewarded_at IS NULL)
		 FROM referrals WHERE referrer_user_id = $1::uuid`,
		user.ID,
	).Scan(&summary.Referred, &summary.Paid, &summary.MonthsEarned, &summary.Pending); err != nil {
		log.Println("Erreur statistiques de parrainage :", err)
		http.Error(w, "Impossible de charger le parrainage", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, summary)
}
