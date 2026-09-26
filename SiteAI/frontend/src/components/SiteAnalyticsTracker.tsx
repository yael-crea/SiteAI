"use client";

import { useEffect } from "react";

type SiteAnalyticsTrackerProps = {
  publicSlug: string;
};

function createVisitorID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function SiteAnalyticsTracker({
  publicSlug,
}: SiteAnalyticsTrackerProps) {
  useEffect(() => {
    if (!publicSlug) {
      return;
    }

    const visitorKey =
      `siteai_visitor_${publicSlug}`;

    const recentViewKey =
      `siteai_recent_view_${publicSlug}`;

    try {
      const recentView =
        Number(
          sessionStorage.getItem(
            recentViewKey,
          ) || "0",
        );

      if (
        recentView > 0 &&
        Date.now() - recentView <
          5000
      ) {
        return;
      }

      let visitorID =
        localStorage.getItem(
          visitorKey,
        );

      if (!visitorID) {
        visitorID =
          createVisitorID();

        localStorage.setItem(
          visitorKey,
          visitorID,
        );
      }

      sessionStorage.setItem(
        recentViewKey,
        String(Date.now()),
      );

      void fetch(
        "/api-backend/analytics/pageview",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            publicSlug,
            visitorId:
              visitorID,
          }),
          keepalive: true,
        },
      ).catch((error) => {
        console.error(
          "Analytics SiteAI :",
          error,
        );
      });
    } catch (error) {
      console.error(
        "Analytics SiteAI :",
        error,
      );
    }
  }, [publicSlug]);

  return null;
}
