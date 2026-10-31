BEGIN;

-- Referral programme: one personal code per account, shared as
-- https://lumio.business/?parrain=<code>.
CREATE TABLE IF NOT EXISTS public.referral_codes (
    user_id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per referred account, recorded at its first checkout. paid_at is
-- set when it pays its first month; rewarded_at when the referrer's Stripe
-- balance has been credited with one month (at most 12 per rolling year).
CREATE TABLE IF NOT EXISTS public.referrals (
    referred_user_id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    reward_cents INTEGER,
    CHECK (referred_user_id <> referrer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
    ON public.referrals(referrer_user_id, rewarded_at);

-- Backend-only, like every other Lumio business table.
ALTER TABLE IF EXISTS public.referral_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.referral_codes FROM anon, authenticated;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.referrals FROM anon, authenticated;

COMMIT;
