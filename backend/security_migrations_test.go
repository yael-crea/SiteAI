package main

import (
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
