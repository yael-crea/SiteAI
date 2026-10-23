# Supabase security migrations

The backend embeds and applies the SQL files required for its current schema.
Every migration must remain idempotent because Railway can restart the service
more than once for the same release.

## 20261023 security baseline

`20261023_supabase_security_baseline.sql` makes the `public` schema backend-only:

- RLS is enabled on every Lumio business table that exists.
- `anon` and `authenticated` lose direct table and sequence privileges.
- public execution of current and future `public`-schema functions is removed.
- new tables and sequences created by the backend database role do not inherit
  Supabase API access automatically.

Supabase Auth and the `storage.site-images` policies are not changed.

Before applying this migration manually, verify that the web application does
not query a `public` table with `supabase.from(...)`. The Lumio frontend only
uses Supabase Auth and Storage at the time of this migration.

## Legacy site without an owner

Production currently contains one unpublished site whose `user_id` is null. It
has no published snapshot, lead, page view or event, but it has one saved site
version. This migration deliberately preserves it.

Do not assign that site to an arbitrary account and do not rebuild a published
snapshot from its draft. Identify its legitimate owner from an external,
trusted record first. Once ownership is confirmed, update the site and its
version in one transaction, validate the result, and only then consider making
`sites.user_id` non-null.
