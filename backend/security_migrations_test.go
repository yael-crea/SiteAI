package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestSupabaseSecurityBaselineProtectsEveryBusinessTable(t *testing.T) {
	lower := strings.ToLower(supabaseSecurityBaselineSQL)

	for _, table := range []string{
		"admin_users",
		"ai_usage",
		"leads",
		"legal_acceptances",
		"quotes",
		"site_contact_clicks",
		"site_events",
		"site_pageviews",
		"site_versions",
		"sites",
		"user_billing",
	} {
		expected := "alter table if exists public." + table + " enable row level security"
		if !strings.Contains(lower, expected) {
			t.Fatalf("la migration n'active pas RLS sur %s", table)
		}
	}
}

func TestSupabaseSecurityBaselineRevokesDirectAPIPrivileges(t *testing.T) {
	lower := strings.ToLower(supabaseSecurityBaselineSQL)

	required := []string{
		"revoke all privileges on all tables in schema public from anon, authenticated",
		"revoke all privileges on all sequences in schema public from anon, authenticated",
		"revoke execute on all functions in schema public from public, anon, authenticated",
		"alter default privileges in schema public",
		"revoke all privileges on tables from anon, authenticated",
		"revoke all privileges on sequences from anon, authenticated",
		"revoke execute on functions from public, anon, authenticated",
	}

	for _, statement := range required {
		if !strings.Contains(lower, statement) {
			t.Fatalf("protection Supabase absente : %q", statement)
		}
	}
}

// Every table the backend creates, now or in the future, must be covered by
// an embedded migration that enables RLS. A new CREATE TABLE without it fails
// here instead of silently becoming reachable through the Supabase API.
func TestEveryCreatedTableHasRowLevelSecurity(t *testing.T) {
	sources, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	migrations, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		t.Fatal(err)
	}

	createTable := regexp.MustCompile(`(?i)create\s+table\s+if\s+not\s+exists\s+(?:public\.)?([a-z_][a-z0-9_]*)`)
	tables := map[string]string{}

	for _, path := range append(sources, migrations...) {
		if strings.HasSuffix(path, "_test.go") {
			continue
		}

		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}

		for _, match := range createTable.FindAllStringSubmatch(string(content), -1) {
			tables[strings.ToLower(match[1])] = path
		}
	}

	if len(tables) == 0 {
		t.Fatal("aucune table trouvée : l'analyse du code est cassée")
	}

	embedded := strings.ToLower(supabaseSecurityBaselineSQL + "\n" + stripeWebhookEventsSQL + "\n" + lifecycleEmailsSQL)

	for table, path := range tables {
		expected := "alter table if exists public." + table + " enable row level security"
		if !strings.Contains(embedded, expected) {
			t.Errorf("%s (créée dans %s) n'a pas de RLS dans une migration appliquée au démarrage", table, path)
		}
	}
}

func TestStripeWebhookEventsMigrationIsBackendOnly(t *testing.T) {
	lower := strings.ToLower(stripeWebhookEventsSQL)

	for _, statement := range []string{
		"create table if not exists public.stripe_webhook_events",
		"event_id text primary key",
		"alter table if exists public.stripe_webhook_events enable row level security",
		"revoke all privileges on table public.stripe_webhook_events from anon, authenticated",
	} {
		if !strings.Contains(lower, statement) {
			t.Fatalf("migration Stripe incomplète : %q", statement)
		}
	}

	if strings.Contains(lower, "create policy") || strings.Contains(lower, "grant ") {
		t.Fatal("la table des événements Stripe ne doit être accessible qu'au backend")
	}
}

// The baseline revokes privileges on tables that exist when it runs; the
// Stripe table is created afterwards, so its migration must run after it and
// carry its own REVOKE.
func TestStripeWebhookMigrationRunsAfterBaseline(t *testing.T) {
	content, err := os.ReadFile("main.go")
	if err != nil {
		t.Fatal(err)
	}

	source := string(content)
	baseline := strings.Index(source, "applySupabaseSecurityBaseline(ctx)")
	stripe := strings.Index(source, "applyStripeWebhookEventsMigration(ctx)")

	if baseline < 0 || stripe < 0 || stripe < baseline {
		t.Fatal("createTables doit appliquer la migration Stripe après la base de sécurité")
	}
}
