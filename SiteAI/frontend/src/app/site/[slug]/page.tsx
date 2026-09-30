import { SITE_URL, publicRobots, privateRobots } from "@/lib/seo";
import { normalizeDesignStyle, type DesignStyle } from "@/lib/designStyles";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import SitePreview from "@/components/SitePreview";
import SiteAnalyticsTracker from "@/components/SiteAnalyticsTracker";
import type { Testimonial } from "@/lib/siteGrowth";

type SiteSection = {
  title: string;
  text: string;
};

type GeneratedSite = {
  businessName: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroText: string;
  phone: string;
  logoUrl: string;
  heroImageUrl: string;
  gallery: string[];
  sections: SiteSection[];
  testimonials?: Testimonial[];
  serviceArea?: string;
  openingHours?: string;
  socialLinks?: Record<string, string>;
};



type PublicSite = {
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  designStyle: DesignStyle;
  accentColor: string;
  site: GeneratedSite;
  publicSlug: string;
  publishedAt: string | null;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://siteai-production-aa03.up.railway.app";

const getPublicSite = cache(
  async (
    slug: string,
  ): Promise<PublicSite | null> => {
    if (!slug) {
      return null;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/public-sites/${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(
          "Erreur chargement site public :",
          response.status,
        );
        return null;
      }

      const result =
        (await response.json()) as PublicSite;

      if (
        !result ||
        !result.publicSlug ||
        !result.site
      ) {
        return null;
      }

      const safeDesignStyle = normalizeDesignStyle(result.designStyle);

      return {
        ...result,
        designStyle: safeDesignStyle,
        accentColor:
          result.accentColor || "#2563eb",
        site: {
          ...result.site,
          businessName:
            result.site.businessName ||
            result.businessName ||
            "",
          phone:
            result.site.phone ||
            result.phone ||
            "",
          logoUrl:
            result.site.logoUrl ?? "",
          heroImageUrl:
            result.site.heroImageUrl ?? "",
          gallery:
            result.site.gallery ?? [],
          sections:
            result.site.sections ?? [],
        },
      };
    } catch (error) {
      console.error(
        "Impossible de charger le site public :",
        error,
      );

      return null;
    }
  },
);

function createFallbackTitle(
  site: PublicSite,
) {
  const businessName =
    site.businessName?.trim();

  const activity =
    site.activity?.trim();

  const city =
    site.city?.trim();

  if (
    businessName &&
    activity &&
    city
  ) {
    return `${businessName} | ${activity} à ${city}`;
  }

  if (
    businessName &&
    city
  ) {
    return `${businessName} à ${city}`;
  }

  return (
    businessName ||
    "Site professionnel"
  );
}

function createFallbackDescription(
  site: PublicSite,
) {
  const businessName =
    site.businessName?.trim();

  const activity =
    site.activity?.trim();

  const city =
    site.city?.trim();

  if (
    businessName &&
    activity &&
    city
  ) {
    return `Découvrez ${businessName}, ${activity} à ${city}. Consultez les services proposés et contactez directement l'entreprise.`;
  }

  if (
    businessName &&
    city
  ) {
    return `Découvrez ${businessName} à ${city}, ses services et ses informations de contact.`;
  }

  return `Découvrez les services de ${businessName || "cette entreprise"}.`;
}

export async function generateMetadata(
  {
    params,
  }: PageProps,
): Promise<Metadata> {
  const { slug } =
    await params;

  const publicSite =
    await getPublicSite(slug);

  if (!publicSite) {
    return {
      title:
        "Site indisponible | Lumio",
      description:
        "Ce site n'existe pas ou n'est plus publié.",
      robots: privateRobots,
    };
  }

  const generatedSite =
    publicSite.site;

  const title =
    generatedSite.metaTitle?.trim() ||
    createFallbackTitle(
      publicSite,
    );

  const description =
    generatedSite.metaDescription?.trim() ||
    createFallbackDescription(
      publicSite,
    );

  const canonicalUrl =
    `${SITE_URL}/site/${encodeURIComponent(
      publicSite.publicSlug,
    )}`;

  return {
    title: { absolute: title },
    description,

    alternates: {
      canonical:
        canonicalUrl,
    },

    robots: publicRobots,

    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: canonicalUrl,
      title,
      description,
      siteName:
        publicSite.businessName,
      ...(generatedSite.heroImageUrl
        ? {
            images: [
              {
                url:
                  generatedSite.heroImageUrl,
                alt:
                  publicSite.businessName,
              },
            ],
          }
        : generatedSite.logoUrl
          ? {
              images: [
                {
                  url:
                    generatedSite.logoUrl,
                  alt:
                    `Logo ${publicSite.businessName}`,
                },
              ],
            }
          : {}),
    },

    twitter: {
      card:
        generatedSite.heroImageUrl ||
        generatedSite.logoUrl
          ? "summary_large_image"
          : "summary",
      title,
      description,
      ...(generatedSite.heroImageUrl
        ? {
            images: [
              generatedSite.heroImageUrl,
            ],
          }
        : generatedSite.logoUrl
          ? {
              images: [
                generatedSite.logoUrl,
              ],
            }
          : {}),
    },
  };
}

export default async function PublicSitePage(
  {
    params,
  }: PageProps,
) {
  const { slug } =
    await params;

  const publicSite =
    await getPublicSite(slug);

  if (!publicSite) {
    notFound();
  }

  const site =
    publicSite.site;

  const description =
    site.metaDescription?.trim() ||
    createFallbackDescription(
      publicSite,
    );

  const canonicalUrl =
    `${SITE_URL}/site/${encodeURIComponent(
      publicSite.publicSlug,
    )}`;

  const structuredData = {
    "@context":
      "https://schema.org",
    "@type":
      "LocalBusiness",
    name:
      publicSite.businessName,
    url:
      canonicalUrl,
    description,
    ...(site.logoUrl
      ? {
          logo:
            site.logoUrl,
        }
      : {}),
    ...(site.heroImageUrl ||
    site.logoUrl
      ? {
          image:
            site.heroImageUrl ||
            site.logoUrl,
        }
      : {}),
    ...(publicSite.phone
      ? {
          telephone:
            publicSite.phone,
        }
      : {}),
    ...(publicSite.city
      ? {
          address: {
            "@type":
              "PostalAddress",
            addressLocality:
              publicSite.city,
            addressCountry:
              "FR",
          },
        }
      : {}),
    ...(site.serviceArea?.trim() ? { areaServed: { "@type": "Place", name: site.serviceArea.trim() } } : {}),
    ...(site.openingHours?.trim() ? { openingHours: site.openingHours.trim() } : {}),
    ...((site.testimonials?.length ?? 0) > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: ((site.testimonials ?? []).reduce((total, item) => total + (item.rating ?? 5), 0) / (site.testimonials?.length ?? 1)).toFixed(1),
        reviewCount: site.testimonials?.length ?? 0,
      },
      review: (site.testimonials ?? []).map((item) => ({
        "@type": "Review",
        author: { "@type": "Person", name: item.name },
        reviewBody: item.text,
        reviewRating: { "@type": "Rating", ratingValue: item.rating ?? 5, bestRating: 5 },
      })),
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              structuredData,
            ).replace(
              /</g,
              "\\u003c",
            ),
        }}
      />

      <SiteAnalyticsTracker
        publicSlug={
          publicSite.publicSlug
        }
      />

      <main className="min-h-screen">
        <SitePreview
          site={site}
          designStyle={
            publicSite.designStyle
          }
          accentColor={
            publicSite.accentColor
          }
          activity={
            publicSite.activity
          }
          city={
            publicSite.city
          }
        />
      </main>
    </>
  );
}
