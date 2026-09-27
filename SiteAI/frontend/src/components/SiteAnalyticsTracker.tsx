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
    if (!publicSlug) return;
    const visitorKey = `siteai_visitor_${publicSlug}`;
    const recentViewKey = `siteai_recent_view_${publicSlug}`;
    let visitorID = "";
    try {
      visitorID = localStorage.getItem(visitorKey) || createVisitorID();
      localStorage.setItem(visitorKey, visitorID);
      const recentView = Number(sessionStorage.getItem(recentViewKey) || "0");
      if (!recentView || Date.now() - recentView >= 5000) {
        sessionStorage.setItem(recentViewKey, String(Date.now()));
        void fetch("/api-backend/analytics/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicSlug, visitorId: visitorID }),
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch { visitorID = createVisitorID(); }

    const sendEvent = (eventType: "phone_click" | "email_click" | "form_submit") => {
      void fetch("/api-backend/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSlug, visitorId: visitorID, eventType }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (link?.href.startsWith("tel:")) sendEvent("phone_click");
      if (link?.href.startsWith("mailto:")) sendEvent("email_click");
    };
    const handleConversion = () => sendEvent("form_submit");
    document.addEventListener("click", handleClick, true);
    window.addEventListener("siteai:conversion", handleConversion);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("siteai:conversion", handleConversion);
    };
  }, [publicSlug]);

  return null;
}
