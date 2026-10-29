BEGIN;

-- One row per Stripe event (evt_...) whose business effects were committed.
-- The row is inserted in the same transaction as those effects, so an event
-- is either fully applied and recorded, or neither.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
    ON public.stripe_webhook_events(processed_at);

-- Backend-only, like every other Lumio business table.
ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.stripe_webhook_events FROM anon, authenticated;

COMMIT;
