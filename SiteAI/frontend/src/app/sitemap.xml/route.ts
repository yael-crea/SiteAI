type PublicSiteIndexItem = {
  publicSlug: string;
  updatedAt: string;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://site-ai-jzjx.vercel.app";

const BACKEND_URL =
  "https://siteai-production-aa03.up.railway.app";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createUrlEntry(
  url: string,
  lastModified: string,
  changeFrequency: string,
  priority: string,
) {
  return `
  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml(lastModified)}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  let publicSites: PublicSiteIndexItem[] = [];

  try {
    const response = await fetch(
      `${BACKEND_URL}/public-sites`,
      {
        cache: "no-store",
      },
    );

    if (response.ok) {
      publicSites =
        (await response.json()) as PublicSiteIndexItem[];
    } else {
      console.error(
        "Erreur backend :",
        response.status,
      );
    }
  } catch (error) {
    console.error(
      "Impossible de récupérer les sites publics :",
      error,
    );
  }

  const now = new Date().toISOString();

  const home = createUrlEntry(
    `${SITE_URL}/`,
    now,
    "weekly",
    "1.0",
  );

  const sites = publicSites
    .filter(
      (site) =>
        site.publicSlug &&
        site.publicSlug.trim() !== "",
    )
    .map((site) => {
      let lastModified = now;

      const date = new Date(site.updatedAt);

      if (!Number.isNaN(date.getTime())) {
        lastModified = date.toISOString();
      }

      return createUrlEntry(
        `${SITE_URL}/site/${encodeURIComponent(
          site.publicSlug,
        )}`,
        lastModified,
        "weekly",
        "0.8",
      );
    })
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${home}
${sites}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type":
        "application/xml; charset=utf-8",

      "Cache-Control":
        "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}