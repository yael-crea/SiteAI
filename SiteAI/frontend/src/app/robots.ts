import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // Google doit pouvoir explorer les pages pour lire leur balise noindex.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/api-backend/"] },
    ...(IS_INDEXABLE ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
