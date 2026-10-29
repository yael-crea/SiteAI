package main

import (
	"context"
	"log"
	"sync/atomic"
	"time"
)

// The CNIL exempts audience measurement from consent only if, among other
// conditions, the collected data is kept at most 25 months. The visitor
// identifier itself is renewed after 13 months by SiteAnalyticsTracker.
const (
	pageviewRetentionMonths = 25
	pageviewPurgeInterval   = time.Hour
)

// lastPageviewPurge holds the UnixNano time of the last purge attempt.
var lastPageviewPurge atomic.Int64

func pageviewRetentionCutoff(now time.Time) time.Time {
	return now.AddDate(0, -pageviewRetentionMonths, 0)
}

// maybePurgeOldPageviews removes expired page views at most once per
// interval and per process. A failure is only logged: the visit itself has
// already been recorded.
func maybePurgeOldPageviews(ctx context.Context, now time.Time) {
	last := lastPageviewPurge.Load()
	if now.Sub(time.Unix(0, last)) < pageviewPurgeInterval {
		return
	}

	if !lastPageviewPurge.CompareAndSwap(last, now.UnixNano()) {
		return
	}

	if _, err := db.Exec(
		ctx,
		"DELETE FROM site_pageviews WHERE created_at < $1;",
		pageviewRetentionCutoff(now),
	); err != nil {
		log.Println("Purge des visites expirées impossible :", err)
	}
}
