import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/seo";
import { tradePages } from "@/lib/tradePages";

export const revalidate = 3600;
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://siteai-production-aa03.up.railway.app").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!IS_INDEXABLE) return [];
  const pages: MetadataRoute.Sitemap = [
    "", "/exemples", "/site-internet", ...tradePages.map(page => `/site-internet/${page.slug}`),
    "/cgv", "/cgu", "/mentions-legales", "/confidentialite",
  ].map(path => ({ url: `${SITE_URL}${path}` }));
  try {
    const response = await fetch(`${BACKEND_URL}/public-sitemap-sites`, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`API sitemap : HTTP ${response.status}`);
    const sites: unknown = await response.json();
    if (!Array.isArray(sites)) throw new Error("Réponse sitemap invalide");
    const seen = new Set<string>();
    for (const site of sites) {
      if (!site || typeof site.publicSlug !== "string" || !site.publicSlug.trim()) continue;
      const slug = site.publicSlug.trim();
      if (seen.has(slug)) continue;
      seen.add(slug);
      const date = typeof site.updatedAt === "string" ? new Date(site.updatedAt) : null;
      pages.push({
        url: `${SITE_URL}/site/${encodeURIComponent(slug)}`,
        ...(date && !Number.isNaN(date.getTime()) ? { lastModified: date } : {}),
      });
    }
  } catch (error) {
    console.error("Sitemap : sites clients indisponibles, seules les pages Lumio sont incluses.", error);
  }
  return pages;
}
