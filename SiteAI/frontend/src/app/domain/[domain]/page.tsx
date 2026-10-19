import type {
  Metadata,
} from "next";

import {
  notFound,
} from "next/navigation";

import {
  cache,
} from "react";

import SitePreview from "@/components/SitePreview";

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
  socialLinks?: Record<string, string>;
};

type DesignStyle =
  | "moderne"
  | "elegant"
  | "artisan";

type PublicSite = {
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  designStyle: DesignStyle;
  accentColor: string;
  site: GeneratedSite;
  publicSlug: string;
  publishedAt:
    | string
    | null;
};

type PageProps = {
  params: Promise<{
    domain: string;
  }>;
};

const BACKEND_URL =
  process.env
    .NEXT_PUBLIC_API_URL ||
  "https://siteai-production-aa03.up.railway.app";

function normalizeDomain(
  domain: string,
) {
  return decodeURIComponent(
    domain,
  )
    .toLowerCase()
    .replace(
      /^https?:\/\//,
      "",
    )
    .replace(
      /^www\./,
      "",
    )
    .split("/")[0]
    .split(":")[0]
    .trim();
}

const getPublicSiteByDomain =
  cache(
    async (
      domain: string,
    ): Promise<PublicSite | null> => {
      const cleanDomain =
        normalizeDomain(
          domain,
        );

      if (!cleanDomain) {
        return null;
      }

      try {
        const response =
          await fetch(
            `${BACKEND_URL}/public-domains/${encodeURIComponent(
              cleanDomain,
            )}`,
            {
              cache:
                "no-store",
            },
          );

        if (
          response.status ===
          404
        ) {
          return null;
        }

        if (
          !response.ok
        ) {
          console.error(
            "Erreur domaine public :",
            response.status,
          );

          return null;
        }

        const result =
          (await response.json()) as PublicSite;

        if (
          !result ||
          !result.site
        ) {
          return null;
        }

        const designStyle: DesignStyle =
          result.designStyle ===
            "elegant" ||
          result.designStyle ===
            "artisan"
            ? result.designStyle
            : "moderne";

        return {
          ...result,

          designStyle,

          accentColor:
            result.accentColor ||
            "#2563eb",

          site: {
            ...result.site,

            businessName:
              result.site
                .businessName ||
              result.businessName ||
              "",

            phone:
              result.site
                .phone ||
              result.phone ||
              "",

            logoUrl:
              result.site
                .logoUrl ??
              "",

            heroImageUrl:
              result.site
                .heroImageUrl ??
              "",

            gallery:
              result.site
                .gallery ??
              [],

            sections:
              result.site
                .sections ??
              [],
          },
        };
      } catch (
        error
      ) {
        console.error(
          "Impossible de charger le domaine :",
          error,
        );

        return null;
      }
    },
  );

function fallbackTitle(
  publicSite: PublicSite,
) {
  const businessName =
    publicSite.businessName
      ?.trim();

  const activity =
    publicSite.activity
      ?.trim();

  const city =
    publicSite.city
      ?.trim();

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

function fallbackDescription(
  publicSite: PublicSite,
) {
  const businessName =
    publicSite.businessName
      ?.trim();

  const activity =
    publicSite.activity
      ?.trim();

  const city =
    publicSite.city
      ?.trim();

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

  return `Découvrez les services de ${
    businessName ||
    "cette entreprise"
  }.`;
}

export async function generateMetadata(
  {
    params,
  }: PageProps,
): Promise<Metadata> {
  const {
    domain,
  } = await params;

  const cleanDomain =
    normalizeDomain(
      domain,
    );

  const publicSite =
    await getPublicSiteByDomain(
      cleanDomain,
    );

  if (!publicSite) {
    return {
      title:
        "Site indisponible | Lumio",

      description:
        "Ce domaine n'est associé à aucun site publié.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const site =
    publicSite.site;

  const title =
    site.metaTitle
      ?.trim() ||
    fallbackTitle(
      publicSite,
    );

  const description =
    site.metaDescription
      ?.trim() ||
    fallbackDescription(
      publicSite,
    );

  const canonicalURL =
    `https://${cleanDomain}`;

  return {
    title,

    description,

    alternates: {
      canonical:
        canonicalURL,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type:
        "website",

      locale:
        "fr_FR",

      url:
        canonicalURL,

      title,

      description,

      siteName:
        publicSite.businessName,

      ...(site.heroImageUrl
        ? {
            images: [
              {
                url:
                  site.heroImageUrl,

                alt:
                  publicSite.businessName,
              },
            ],
          }
        : site.logoUrl
          ? {
              images: [
                {
                  url:
                    site.logoUrl,

                  alt:
                    `Logo ${publicSite.businessName}`,
                },
              ],
            }
          : {}),
    },

    twitter: {
      card:
        site.heroImageUrl ||
        site.logoUrl
          ? "summary_large_image"
          : "summary",

      title,

      description,

      ...(site.heroImageUrl
        ? {
            images: [
              site.heroImageUrl,
            ],
          }
        : site.logoUrl
          ? {
              images: [
                site.logoUrl,
              ],
            }
          : {}),
    },
  };
}

export default async function DomainPage(
  {
    params,
  }: PageProps,
) {
  const {
    domain,
  } = await params;

  const cleanDomain =
    normalizeDomain(
      domain,
    );

  const publicSite =
    await getPublicSiteByDomain(
      cleanDomain,
    );

  if (!publicSite) {
    notFound();
  }

  const site =
    publicSite.site;

  const description =
    site.metaDescription
      ?.trim() ||
    fallbackDescription(
      publicSite,
    );

  const structuredData = {
    "@context":
      "https://schema.org",

    "@type":
      "LocalBusiness",

    name:
      publicSite.businessName,

    url:
      `https://${cleanDomain}`,

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
