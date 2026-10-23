package main

import (
	"context"
	_ "embed"
	"fmt"
)

// supabaseSecurityBaselineSQL is also kept as a standalone, reviewable
// migration for controlled execution from the Supabase SQL editor.
//
//go:embed migrations/20261023_supabase_security_baseline.sql
var supabaseSecurityBaselineSQL string

func applySupabaseSecurityBaseline(ctx context.Context) error {
	_, err := db.Exec(ctx, supabaseSecurityBaselineSQL)
	if err != nil {
		return fmt.Errorf("apply Supabase security baseline: %w", err)
	}
	return nil
}
