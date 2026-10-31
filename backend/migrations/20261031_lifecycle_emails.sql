BEGIN;

-- One row per reminder email (bienvenue, publier, dernier_rappel) sent to an
-- account that created a site without publishing it. The primary key is the
-- claim that keeps two backend instances from sending the same email.
CREATE TABLE IF NOT EXISTS public.lifecycle_emails (
    user_id UUID NOT NULL,
    kind TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, kind)
);

-- Unsubscribe token used in the emails, and the opt-out date.
CREATE TABLE IF NOT EXISTS public.email_preferences (
    user_id UUID PRIMARY KEY,
    unsubscribe_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    unsubscribed_at TIMESTAMPTZ
);

-- Backend-only, like every other Lumio business table.
ALTER TABLE IF EXISTS public.lifecycle_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.lifecycle_emails FROM anon, authenticated;
ALTER TABLE IF EXISTS public.email_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.email_preferences FROM anon, authenticated;

COMMIT;
