package main

import (
	"context"
	"testing"
	"time"
)

func TestPageviewRetentionMatchesCNILLimit(t *testing.T) {
	now := time.Date(2026, 10, 29, 12, 0, 0, 0, time.UTC)
	want := time.Date(2024, 9, 29, 12, 0, 0, 0, time.UTC)

	if got := pageviewRetentionCutoff(now); !got.Equal(want) {
		t.Fatalf("got %s, want %s (25 mois)", got, want)
	}
}

func TestMaybePurgeOldPageviewsIsThrottled(t *testing.T) {
	now := time.Now()
	previous := lastPageviewPurge.Load()
	lastPageviewPurge.Store(now.UnixNano())
	t.Cleanup(func() { lastPageviewPurge.Store(previous) })

	// db is nil here: reaching the purge would panic.
	maybePurgeOldPageviews(context.Background(), now.Add(pageviewPurgeInterval-time.Second))
}

func TestDetailedAnalyticsReservedToProAndAgence(t *testing.T) {
	for _, tc := range []struct {
		status BillingStatus
		want   bool
	}{
		{BillingStatus{Plan: "free", Status: "inactive"}, false},
		{BillingStatus{Plan: "essentiel", Status: "active"}, false},
		{BillingStatus{Plan: "pro", Status: "active"}, true},
		{BillingStatus{Plan: "agence", Status: "active"}, true},
		{BillingStatus{Plan: "pro", Status: "canceled"}, false},
		{BillingStatus{Plan: "free", Status: "inactive", IsAdmin: true}, true},
	} {
		if got := billingEntitlements(tc.status).DetailedAnalytics; got != tc.want {
			t.Errorf("%s/%s admin=%v: got %v, want %v", tc.status.Plan, tc.status.Status, tc.status.IsAdmin, got, tc.want)
		}
	}
}
