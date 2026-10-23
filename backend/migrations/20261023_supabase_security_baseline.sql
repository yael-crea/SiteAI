BEGIN;

-- Lumio serves business data through its authenticated backend. The browser
-- must not access public-schema tables directly, even with a valid Supabase
-- session. RLS remains enabled as a second line of defence.
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_billing ENABLE ROW LEVEL SECURITY;

-- There are intentionally no anon/authenticated policies on these tables.
-- Authentication, ownership and administration checks live in the backend.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Supabase normally grants new public-schema objects to its API roles. Prevent
-- a future table from becoming reachable before its security is reviewed.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
