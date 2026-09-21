"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function PublicSitePage() {
  const params = useParams();

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : "";

  const [data, setData] =
    useState<PublicSite | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function loadSite() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api-backend/public-sites/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 404) {
          setError(
            "Ce site n'existe pas ou n'est plus publié.",
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            `Erreur HTTP ${response.status}`,
          );
        }

        const result: PublicSite =
          await response.json();

        setData(result);
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de charger ce site.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSite();
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Chargement du site...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg text-center">
          <div className="text-6xl font-black">
            404
          </div>

          <h1 className="mt-5 text-3xl font-black">
            Site indisponible
          </h1>

          <p className="mt-4 text-slate-400">
            {error ||
              "Ce site est introuvable."}
          </p>
        </div>
      </main>
    );
  }

  const publicSite = data;
  const site = publicSite.site;
  const designStyle =
    publicSite.designStyle;
  const accentColor =
    publicSite.accentColor;

  let heroBackground =
    "bg-slate-950";

  if (designStyle === "elegant") {
    heroBackground =
      "bg-neutral-950";
  }

  if (designStyle === "artisan") {
    heroBackground =
      "bg-stone-900";
  }

  let cardStyle =
    "rounded-3xl";

  if (designStyle === "elegant") {
    cardStyle =
      "rounded-none";
  }

  if (designStyle === "artisan") {
    cardStyle =
      "rounded-xl";
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-xl font-black">
            {publicSite.businessName}
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#accueil">
              Accueil
            </a>

            <a href="#services">
              Services
            </a>

            <a href="#contact">
              Contact
            </a>
          </div>

          {publicSite.phone && (
            <a
              href={`tel:${publicSite.phone}`}
              style={{
                color:
                  accentColor,
              }}
              className="font-bold"
            >
              {publicSite.phone}
            </a>
          )}
        </div>
      </nav>

      <section
        id="accueil"
        className={`${heroBackground} px-6 py-28 text-center text-white`}
      >
        <div className="mx-auto max-w-5xl">
          <p
            style={{
              color:
                accentColor,
            }}
            className="text-sm font-bold uppercase tracking-[0.3em]"
          >
            {publicSite.businessName}
          </p>

          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
            {site.heroTitle}
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            {site.heroText}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {publicSite.phone && (
              <a
                href={`tel:${publicSite.phone}`}
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
                  key={index}
                  className={`border border-slate-200 bg-white p-8 shadow-sm ${cardStyle}`}
                >
                  <div
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                    className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl font-black text-white"
                  >
                    {index + 1}
                  </div>

                  <h3 className="text-2xl font-bold">
                    {section.title}
                  </h3>

                  <p className="mt-4 leading-8 text-slate-600">
                    {section.text}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

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
            Besoin d&apos;un professionnel ?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Contactez{" "}
            {publicSite.businessName} pour
            discuter de votre besoin à{" "}
            {publicSite.city}.
          </p>

          {publicSite.phone && (
            <a
              href={`tel:${publicSite.phone}`}
              style={{
                backgroundColor:
                  accentColor,
              }}
              className="mt-9 inline-block rounded-xl px-9 py-4 font-bold text-white"
            >
              {publicSite.phone}
            </a>
          )}
        </div>
      </section>

      <footer className="bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 md:flex-row">
          <div>
            <p className="text-xl font-black">
              {publicSite.businessName}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {publicSite.activity} à{" "}
              {publicSite.city}
            </p>
          </div>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()}{" "}
            {publicSite.businessName}
          </p>
        </div>
      </footer>
    </main>
  );
}