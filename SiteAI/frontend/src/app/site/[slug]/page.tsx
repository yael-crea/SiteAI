import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

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
};

type PublicSite = {
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  designStyle: "moderne" | "elegant" | "artisan";
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://site-ai-jzjx.vercel.app";

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

      return {
        ...result,
        site: {
          ...result.site,
          logoUrl:
            result.site.logoUrl ?? "",
          heroImageUrl:
            result.site.heroImageUrl ?? "",
          gallery:
            result.site.gallery ?? [],
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
        "Site indisponible | SiteAI",
      description:
        "Ce site n'existe pas ou n'est plus publié.",
      robots: {
        index: false,
        follow: false,
      },
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
    title,
    description,

    alternates: {
      canonical:
        canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview":
          "large",
        "max-snippet": -1,
        "max-video-preview":
          -1,
      },
    },

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

  const designStyle =
    publicSite.designStyle;

  const accentColor =
    publicSite.accentColor ||
    "#2563eb";

  const canonicalUrl =
    `${SITE_URL}/site/${encodeURIComponent(
      publicSite.publicSlug,
    )}`;

  let heroBackground =
    "bg-slate-950";

  if (
    designStyle === "elegant"
  ) {
    heroBackground =
      "bg-neutral-950";
  }

  if (
    designStyle === "artisan"
  ) {
    heroBackground =
      "bg-stone-900";
  }

  let cardStyle =
    "rounded-3xl";

  if (
    designStyle === "elegant"
  ) {
    cardStyle =
      "rounded-none";
  }

  if (
    designStyle === "artisan"
  ) {
    cardStyle =
      "rounded-xl";
  }

  const cleanPhone =
    publicSite.phone
      ? publicSite.phone.replace(
          /[^\d+]/g,
          "",
        )
      : "";

  const description =
    site.metaDescription?.trim() ||
    createFallbackDescription(
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
      canonicalUrl,
    description,
    ...(site.logoUrl
      ? {
          logo: site.logoUrl,
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

      <main className="min-h-screen bg-white text-slate-950">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={`Logo ${publicSite.businessName}`}
                  className="h-12 w-12 shrink-0 rounded-xl object-contain"
                />
              )}

              <div className="truncate text-xl font-black">
                {
                  publicSite.businessName
                }
              </div>
            </div>

            <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
              <a href="#accueil">
                Accueil
              </a>

              <a href="#services">
                Services
              </a>

              {(site.gallery ?? []).length > 0 && (
                <a href="#galerie">
                  Galerie
                </a>
              )}

              <a href="#contact">
                Contact
              </a>
            </div>

            {publicSite.phone && (
              <a
                href={`tel:${cleanPhone}`}
                style={{
                  color:
                    accentColor,
                }}
                className="shrink-0 font-bold"
              >
                {
                  publicSite.phone
                }
              </a>
            )}
          </div>
        </nav>

        <section
          id="accueil"
          className={`${heroBackground} relative overflow-hidden px-6 py-28 text-center text-white`}
          style={
            site.heroImageUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.72)), url("${site.heroImageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="mx-auto max-w-5xl">
            {site.logoUrl && (
              <img
                src={site.logoUrl}
                alt={`Logo ${publicSite.businessName}`}
                className="mx-auto mb-8 h-24 w-24 rounded-2xl bg-white/95 object-contain p-2"
              />
            )}

            <p
              style={{
                color:
                  accentColor,
              }}
              className="text-sm font-bold uppercase tracking-[0.3em]"
            >
              {
                publicSite.businessName
              }
            </p>

            <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
              {
                site.heroTitle
              }
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {
                site.heroText
              }
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {publicSite.phone && (
                <a
                  href={`tel:${cleanPhone}`}
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                  className="rounded-xl px-8 py-4 font-bold text-white"
                >
                  Appeler maintenant
                </a>
              )}

              <a
                href="#services"
                className="rounded-xl border border-white/30 px-8 py-4 font-bold"
              >
                Découvrir les services
              </a>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="px-6 py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p
                style={{
                  color:
                    accentColor,
                }}
                className="text-sm font-bold uppercase tracking-[0.2em]"
              >
                Nos services
              </p>

              <h2 className="mt-4 text-4xl font-black md:text-5xl">
                Comment pouvons-nous
                vous aider ?
              </h2>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {site.sections.map(
                (
                  section,
                  index,
                ) => (
                  <article
                    key={`${section.title}-${index}`}
                    className={`border border-slate-200 bg-white p-8 shadow-sm ${cardStyle}`}
                  >
                    <div
                      style={{
                        backgroundColor:
                          accentColor,
                      }}
                      className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl font-black text-white"
                    >
                      {
                        index +
                        1
                      }
                    </div>

                    <h3 className="text-2xl font-bold">
                      {
                        section.title
                      }
                    </h3>

                    <p className="mt-4 leading-8 text-slate-600">
                      {
                        section.text
                      }
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        {(site.gallery ?? []).length > 0 && (
          <section
            id="galerie"
            className="bg-slate-50 px-6 py-24"
          >
            <div className="mx-auto max-w-6xl">
              <div className="text-center">
                <p
                  style={{
                    color:
                      accentColor,
                  }}
                  className="text-sm font-bold uppercase tracking-[0.2em]"
                >
                  Galerie
                </p>

                <h2 className="mt-4 text-4xl font-black md:text-5xl">
                  Découvrez notre univers
                </h2>

                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Quelques images de{" "}
                  {publicSite.businessName}.
                </p>
              </div>

              <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(site.gallery ?? []).map(
                  (
                    imageUrl,
                    index,
                  ) => (
                    <img
                      key={`${imageUrl}-${index}`}
                      src={imageUrl}
                      alt={`Photo ${index + 1} de ${publicSite.businessName}`}
                      loading="lazy"
                      className="h-72 w-full rounded-2xl object-cover shadow-sm"
                    />
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        <section
          id="contact"
          className="bg-slate-50 px-6 py-24"
        >
          <div className="mx-auto max-w-4xl text-center">
            <p
              style={{
                color:
                  accentColor,
              }}
              className="text-sm font-bold uppercase tracking-[0.2em]"
            >
              Contact
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Besoin
              d&apos;un
              professionnel ?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Contactez{" "}
              {
                publicSite.businessName
              }{" "}
              pour discuter de
              votre besoin à{" "}
              {
                publicSite.city
              }
              .
            </p>

            {publicSite.phone && (
              <a
                href={`tel:${cleanPhone}`}
                style={{
                  backgroundColor:
                    accentColor,
                }}
                className="mt-9 inline-block rounded-xl px-9 py-4 font-bold text-white"
              >
                {
                  publicSite.phone
                }
              </a>
            )}
          </div>
        </section>

        <footer className="bg-slate-950 px-6 py-12 text-white">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 md:flex-row">
            <div className="flex items-center gap-3">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt=""
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                />
              )}

              <div>
                <p className="text-xl font-black">
                  {
                    publicSite.businessName
                  }
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {
                    publicSite.activity
                  }{" "}
                  à{" "}
                  {
                    publicSite.city
                  }
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              ©{" "}
              {
                new Date().getFullYear()
              }{" "}
              {
                publicSite.businessName
              }
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
