import type { MetadataRoute } from "next";

export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://lumio-creation.vercel.app"
).replace(/\/$/, "");

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://siteai-production-aa03.up.railway.app"
).replace(/\/$/, "");

type PublicSitemapSite = {
  publicSlug: string;
  updatedAt: string;
};

async function getPublishedSites() {
  try {
    const response = await fetch(
      `${BACKEND_URL}/public-sitemap-sites`,
      {
        next: {
          revalidate: 3600,
        },
      },
    );

    if (!response.ok) {
      return [] as PublicSitemapSite[];
    }

    return (await response.json()) as PublicSitemapSite[];
  } catch (error) {
    console.error(
      "Impossible de charger les sites du sitemap :",
      error,
    );

    return [] as PublicSitemapSite[];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedSites =
    await getPublishedSites();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cgv`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cgu`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const sitePages: MetadataRoute.Sitemap =
    publishedSites
      .filter(
        (site) =>
          site.publicSlug.trim() !== "",
      )
      .map((site) => ({
        url: `${SITE_URL}/site/${encodeURIComponent(
          site.publicSlug,
        )}`,
        lastModified:
          site.updatedAt || new Date(),
        changeFrequency:
          "weekly" as const,
        priority: 0.7,
      }));

  return [
    ...staticPages,
    ...sitePages,
  ];
}
