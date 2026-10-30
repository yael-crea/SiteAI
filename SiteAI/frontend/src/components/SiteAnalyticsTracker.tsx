"use client";

import { useEffect } from "react";

// The CNIL exempts audience measurement from consent only if the visitor
// identifier lives at most 13 months; it is then replaced by a new one.
const VISITOR_ID_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000;

type SiteAnalyticsTrackerProps = {
  publicSlug: string;
};

// Campaign source (e.g. ?utm_source=affichette on the printed poster QR code).
function readUTMSource() {
  try {
    const value = new URLSearchParams(window.location.search).get("utm_source") || "";
    return /^[a-zA-Z0-9_-]{1,40}$/.test(value) ? value.toLowerCase() : "";
  } catch {
    return "";
  }
}

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
    const visitorCreatedKey = `siteai_visitor_created_${publicSlug}`;
    const recentViewKey = `siteai_recent_view_${publicSlug}`;
    let visitorID = "";
    try {
      const now = Date.now();
      const createdAt = Number(localStorage.getItem(visitorCreatedKey) || "0");
      visitorID = localStorage.getItem(visitorKey) || "";
      if (!visitorID || (createdAt && now - createdAt >= VISITOR_ID_MAX_AGE_MS)) {
        visitorID = createVisitorID();
        localStorage.setItem(visitorCreatedKey, String(now));
      } else if (!createdAt) {
        localStorage.setItem(visitorCreatedKey, String(now));
      }
      localStorage.setItem(visitorKey, visitorID);
      const recentView = Number(sessionStorage.getItem(recentViewKey) || "0");
      if (!recentView || Date.now() - recentView >= 5000) {
        sessionStorage.setItem(recentViewKey, String(Date.now()));
        void fetch("/api-backend/analytics/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicSlug, visitorId: visitorID, utmSource: readUTMSource() }),
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
