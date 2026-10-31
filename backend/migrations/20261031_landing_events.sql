BEGIN;

-- Audience of the Lumio landing page (lumio.business): one row per page view
-- and per click on a "Créer mon site" button. No cookie, visitor identifier,
-- IP address or user agent is stored. Rows are purged after 25 months
-- together with the site page views (see analytics_retention.go).
CREATE TABLE IF NOT EXISTS public.landing_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'cta_click')),
    placement TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_events_created_at
    ON public.landing_events(created_at);

-- Backend-only, like every other Lumio business table.
ALTER TABLE IF EXISTS public.landing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.landing_events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.landing_events_id_seq FROM anon, authenticated;

COMMIT;
