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
