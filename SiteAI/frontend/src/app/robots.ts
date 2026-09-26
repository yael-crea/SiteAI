import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://site-ai-izjx.vercel.app"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/auth/",
          "/builder/",
          "/dashboard/",
          "/onboarding/",
          "/prospects/",
          "/reset-password/",
          "/api-backend/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
