"use client";

import { useState } from "react";



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



type DesignStyle =

  | "moderne"

  | "elegant"

  | "artisan";



type SitePreviewProps = {

  site: GeneratedSite;

  designStyle: DesignStyle;

  accentColor: string;

  activity: string;

  city: string;

};




function getProjectTitle(activity: string, index: number) {
  const value = activity.toLowerCase();

  const titleGroups: Array<{ keywords: string[]; titles: string[] }> = [
    {
      keywords: ["plomb", "chauff", "sanitaire"],
      titles: ["Dépannage", "Installation", "Rénovation", "Entretien", "Remplacement", "Intervention urgente"],
    },
    {
      keywords: ["élect", "electric", "domotique"],
      titles: ["Installation électrique", "Mise aux normes", "Éclairage", "Tableau électrique", "Dépannage", "Domotique"],
    },
    {
      keywords: ["peint", "rénov", "renov", "bâtiment", "batiment"],
      titles: ["Rénovation intérieure", "Finitions", "Remise à neuf", "Transformation", "Chantier terminé", "Projet sur mesure"],
    },
    {
      keywords: ["menuis", "bois", "ébén", "eben"],
      titles: ["Fabrication sur mesure", "Pose", "Aménagement", "Finitions", "Rénovation", "Création artisanale"],
    },
    {
      keywords: ["maçon", "macon", "construction"],
      titles: ["Construction", "Maçonnerie", "Rénovation", "Aménagement extérieur", "Finitions", "Chantier terminé"],
    },
    {
      keywords: ["jardin", "paysag", "espace vert"],
      titles: ["Aménagement paysager", "Entretien", "Création de jardin", "Taille et soin", "Plantation", "Extérieur sur mesure"],
    },
    {
      keywords: ["coiff", "barber", "barbier"],
      titles: ["Coupe & style", "Transformation", "Soin", "Coloration", "Finition", "Création personnalisée"],
    },
    {
      keywords: ["restaurant", "traiteur", "cuisine", "boulanger", "pâtiss", "patiss"],
      titles: ["Création maison", "Spécialité", "Préparation du jour", "Savoir-faire", "Sélection gourmande", "Réalisation maison"],
    },
    {
      keywords: ["photo", "vidéo", "video", "photographe"],
      titles: ["Reportage", "Portrait", "Événement", "Séance photo", "Création visuelle", "Projet client"],
    },
    {
      keywords: ["garage", "auto", "mécan", "mecan"],
      titles: ["Entretien", "Réparation", "Diagnostic", "Remise en état", "Intervention atelier", "Projet terminé"],
    },
  ];

  const matched = titleGroups.find((group) =>
    group.keywords.some((keyword) => value.includes(keyword)),
  );

  const genericTitles = [
    "Réalisation sur mesure",
    "Intervention client",
    "Projet terminé",
    "Savoir-faire",
    "Accompagnement personnalisé",
    "Résultat final",
  ];

  const titles = matched?.titles ?? genericTitles;
  return titles[index % titles.length];
}

export default function SitePreview({

  site,

  designStyle,

  accentColor,

  activity,

  city,

}: SitePreviewProps) {

  if (designStyle === "elegant") {

    return (

      <ElegantTemplate

        site={site}

        accentColor={accentColor}

        activity={activity}

        city={city}

      />

    );

  }



  if (designStyle === "artisan") {

    return (

      <ArtisanTemplate

        site={site}

        accentColor={accentColor}

        activity={activity}

        city={city}

      />

    );

  }



  return (

    <ModernTemplate

      site={site}

      accentColor={accentColor}

      activity={activity}

      city={city}

    />

  );

}



function ModernTemplate({

  site,

  accentColor,

  activity,

  city,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {

  return (

    <div className="overflow-hidden bg-white text-slate-950">

      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-3">
            {site.logoUrl ? (
              <img
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-11 w-11 shrink-0 rounded-xl object-contain"
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {site.businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-base font-black sm:text-lg">
                {site.businessName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="#services" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              Services
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              Contact
            </a>

            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                style={{ backgroundColor: accentColor }}
                className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                Demander un devis
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900">
              Menu
              <span aria-hidden="true">☰</span>
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              <a href="#services" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Services
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Contact
              </a>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  style={{ backgroundColor: accentColor }}
                  className="mt-2 block rounded-xl px-4 py-3 text-center text-sm font-black text-white"
                >
                  Demander un devis
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${accentColor}55 0, transparent 34%), radial-gradient(circle at 85% 80%, ${accentColor}33 0, transparent 30%)`,
          }}
        />

        <div
          className={`relative mx-auto grid min-h-[520px] max-w-7xl sm:min-h-[620px] ${
            site.heroImageUrl
              ? "lg:grid-cols-[1.05fr_0.95fr]"
              : ""
          }`}
        >
          <div className="flex items-center px-5 py-14 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <div className={site.heroImageUrl ? "max-w-2xl" : "mx-auto max-w-4xl text-center"}>
              <div className={`flex flex-wrap gap-2 ${site.heroImageUrl ? "" : "justify-center"}`}>
                <span
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: accentColor }}
                >
                  {activity}
                </span>

                {city && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
                    📍 {city}
                  </span>
                )}
              </div>

              <h1 className="mt-6 text-[2.35rem] font-black leading-[1.04] tracking-tight sm:mt-7 sm:text-5xl lg:text-6xl">
                {site.heroTitle}
              </h1>

              <p
                className={`mt-6 text-base leading-8 text-slate-300 sm:text-lg ${
                  site.heroImageUrl
                    ? "max-w-xl"
                    : "mx-auto max-w-2xl"
                }`}
              >
                {site.heroText}
              </p>

              <div className={`mt-9 flex flex-wrap gap-3 ${site.heroImageUrl ? "" : "justify-center"}`}>
                {site.phone && (
                  <a
                    href={`tel:${site.phone}`}
                    style={{ backgroundColor: accentColor }}
                    className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 sm:w-auto"
                  >
                    Appeler maintenant
                  </a>
                )}

                <a
                  href="#contact"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10 sm:w-auto"
                >
                  Demander un devis
                </a>
              </div>

              <div
                className={`mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400 ${
                  site.heroImageUrl ? "" : "justify-center"
                }`}
              >
                <span>✓ Contact direct</span>
                <span>✓ Service local</span>
                <span>✓ Réponse adaptée à votre besoin</span>
              </div>
            </div>
          </div>

          {site.heroImageUrl && (
            <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[620px]">
              <img
                src={site.heroImageUrl}
                alt={site.businessName}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-slate-950/35 lg:via-transparent lg:to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/15 bg-slate-950/65 p-4 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {activity}
                </p>
                <p className="mt-1 font-black text-white">
                  {site.businessName}
                  {city ? ` · ${city}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-7 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            {
              title: "Contact direct",
              text: "Un échange simple pour présenter votre besoin.",
              icon: "01",
            },
            {
              title: "Projet sur mesure",
              text: "Une présentation adaptée à votre activité et à vos clients.",
              icon: "02",
            },
            {
              title: "Présence locale",
              text: `Une entreprise mise en valeur à ${city}.`,
              icon: "03",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {item.icon}
              </div>

              <div>
                <p className="font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

<section id="services" className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:py-24">

        <div className="mx-auto max-w-6xl">

          <div className="mx-auto max-w-3xl text-center">

            <p

              style={{

                color: accentColor,

              }}

              className="text-sm font-black uppercase tracking-[0.25em]"

            >

              Nos services

            </p>



            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">

              Des solutions pensées pour votre besoin

            </h2>



            <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-500">

              Découvrez les principaux services proposés par {site.businessName} à {city}.

            </p>

          </div>



          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {site.sections.map(

              (

                section,

                index,

              ) => (

                <article

                  key={index}

                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"

                >

                  <div

                    className="absolute inset-x-0 top-0 h-1"

                    style={{

                      backgroundColor: accentColor,

                    }}

                  />



                  <div className="flex items-center justify-between gap-4">

                    <div

                      style={{

                        backgroundColor: `${accentColor}14`,

                        color: accentColor,

                      }}

                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black"

                    >

                      {String(index + 1).padStart(2, "0")}

                    </div>



                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">

                      Service

                    </span>

                  </div>



                  <h3 className="mt-7 text-xl font-black leading-snug sm:text-2xl">

                    {section.title}

                  </h3>



                  <p className="mt-4 leading-7 text-slate-600">

                    {section.text}

                  </p>



                  <a
                    href="#contact"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: accentColor }}
                  >
                    Demander un devis
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>

                </article>

              ),

            )}

          </div>

        </div>

      </section>



      <section className="bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                Votre projet
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Besoin d&apos;échanger avec {site.businessName} ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Présentez votre besoin et obtenez les informations utiles pour avancer.
              </p>
            </div>

            <a
              href="#contact"
              className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
              style={{ backgroundColor: accentColor }}
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="modern"
      />

      <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="modern"
      />

      {(site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" className="bg-slate-50 px-6 py-20 sm:px-8 lg:py-24">

          <div className="mx-auto max-w-6xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-sm font-black uppercase tracking-[0.25em]"

                >

                  Réalisations

                </p>



                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">

                  Des projets qui parlent d&apos;eux-mêmes

                </h2>

              </div>



              <p className="max-w-md leading-7 text-slate-500">

                Quelques exemples du travail réalisé par {site.businessName}.

              </p>

            </div>



            <div className="mt-10 grid auto-rows-[180px] gap-4 sm:auto-rows-[220px] sm:grid-cols-2 lg:grid-cols-3">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure

                    key={`${imageUrl}-${index}`}

                    className={`group relative overflow-hidden rounded-3xl bg-slate-200 shadow-sm ${

                      index === 0

                        ? "sm:col-span-2 sm:row-span-2"

                        : index === 3

                          ? "lg:row-span-2"

                          : ""

                    }`}

                  >

                    <img

                      src={imageUrl}

                      alt={`Réalisation ${index + 1} de ${site.businessName}`}

                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"

                    />



                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent opacity-70 transition group-hover:opacity-90" />



                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">

                          {getProjectTitle(activity, index)}

                        </p>



                        <p className="mt-1 font-black">

                          {site.businessName}

                        </p>

                      </div>



                      <span

                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"

                        style={{ backgroundColor: accentColor }}

                      >

                        ↗

                      </span>

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark={false}

      />



      <footer className="bg-slate-950 px-6 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <div className="flex items-center gap-3">
                {site.logoUrl ? (
                  <img
                    src={site.logoUrl}
                    alt={`Logo ${site.businessName}`}
                    className="h-11 w-11 rounded-xl bg-white object-contain p-1"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {site.businessName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-lg font-black">{site.businessName}</p>
                  <p className="text-sm text-slate-400">
                    {activity} · {city}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                Une présentation claire de l&apos;activité, des services et des réalisations de {site.businessName}.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Navigation
              </p>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-300">
                <a href="#services" className="block transition hover:text-white">
                  Services
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-white">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-white">
                  FAQ
                </a>
                <a href="#contact" className="block transition hover:text-white">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Contact
              </p>

              <p className="mt-4 text-sm text-slate-400">{city}</p>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="mt-3 block text-sm font-black"
                  style={{ color: accentColor }}
                >
                  {site.phone}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec SiteAI</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function ElegantTemplate({

  site,

  accentColor,

  activity,

  city,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {

  return (

    <div className="overflow-hidden bg-[#f8f6f1] text-neutral-950">

      <nav className="sticky top-0 z-50 border-b border-neutral-300 bg-[#f8f6f1]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-4">
            {site.logoUrl && (
              <img
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-11 w-11 shrink-0 object-contain"
              />
            )}

            <div className="min-w-0">
              <p className="truncate text-base font-light uppercase tracking-[0.14em] sm:text-lg">
                {site.businessName}
              </p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            <a href="#services" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
              Expertise
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
              Contact
            </a>

            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                style={{ borderColor: accentColor, color: accentColor }}
                className="border px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
              >
                Demander un devis
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none border border-neutral-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em]">
              Menu
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] border border-neutral-300 bg-[#f8f6f1] p-3 shadow-2xl">
              <a href="#services" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                Expertise
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                Contact
              </a>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  style={{ borderColor: accentColor, color: accentColor }}
                  className="mt-2 block border px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em]"
                >
                  Demander un devis
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section
        className="relative flex min-h-[560px] items-center overflow-hidden bg-neutral-950 text-white sm:min-h-[650px]"
        style={
          site.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.78) 44%, rgba(10,10,10,0.28) 100%), url("${site.heroImageUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-16 sm:px-10 sm:py-24 lg:px-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <div
                className="h-px w-14"
                style={{ backgroundColor: accentColor }}
              />
              <p
                style={{ color: accentColor }}
                className="text-xs font-semibold uppercase tracking-[0.4em]"
              >
                {activity} · {city}
              </p>
            </div>

            <h1 className="mt-7 text-[2.65rem] font-light leading-[1.02] tracking-tight sm:mt-9 sm:text-6xl lg:text-7xl">
              {site.heroTitle}
            </h1>

            <p className="mt-8 max-w-2xl text-base font-light leading-8 text-neutral-300 sm:text-lg">
              {site.heroText}
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#contact"
                style={{ borderColor: accentColor, color: accentColor }}
                className="w-full border px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-white hover:text-black sm:w-auto sm:px-7 sm:tracking-[0.2em]"
              >
                Nous contacter
              </a>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="w-full border border-white/25 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white sm:w-auto sm:px-7 sm:tracking-[0.2em]"
                >
                  {site.phone}
                </a>
              )}
            </div>

            <div className="mt-14 grid max-w-2xl gap-5 border-t border-white/15 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Activité
                </p>
                <p className="mt-2 text-sm text-neutral-200">{activity}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Localisation
                </p>
                <p className="mt-2 text-sm text-neutral-200">{city}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Contact
                </p>
                <p className="mt-2 text-sm text-neutral-200">
                  {site.phone || "Sur demande"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-300 bg-[#f8f6f1] px-6 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl divide-y divide-neutral-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              title: "Écoute",
              text: "Comprendre votre besoin avant de vous accompagner.",
            },
            {
              title: "Exigence",
              text: "Une présentation claire, soignée et cohérente.",
            },
            {
              title: "Proximité",
              text: `Une activité ancrée à ${city}.`,
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="px-0 py-6 sm:px-8 sm:py-2 first:sm:pl-0 last:sm:pr-0"
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.32em]"
                style={{ color: accentColor }}
              >
                0{index + 1}
              </p>

              <p className="mt-3 text-xl font-light">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

<section id="services" className="px-5 py-16 sm:px-8 sm:py-24 lg:py-28">

        <div className="mx-auto max-w-6xl">

          <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">

            <div className="lg:sticky lg:top-10 lg:self-start">

              <p

                style={{

                  color:

                    accentColor,

                }}

                className="text-xs font-bold uppercase tracking-[0.4em]"

              >

                Expertise

              </p>



              <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">

                Une approche soignée, pensée dans chaque détail.

              </h2>



              <p className="mt-6 max-w-md leading-8 text-neutral-500">

                {site.businessName} vous accompagne à {city} avec une prestation claire, attentive et adaptée à votre projet.

              </p>

            </div>



            <div className="border-t border-neutral-300">

              {site.sections.map(

                (

                  section,

                  index,

                ) => (

                  <article

                    key={index}

                    className="group grid gap-5 border-b border-neutral-300 py-9 transition-colors duration-300 md:grid-cols-[80px_1fr_auto] md:items-start"

                  >

                    <p

                      style={{

                        color:

                          accentColor,

                      }}

                      className="pt-1 text-sm font-semibold tracking-[0.18em]"

                    >

                      {String(index + 1).padStart(2, "0")}

                    </p>



                    <div>

                      <h3 className="text-2xl font-light leading-snug sm:text-3xl">

                        {

                          section.title

                        }

                      </h3>



                      <p className="mt-4 max-w-2xl leading-8 text-neutral-600">

                        {

                          section.text

                        }

                      </p>

                    </div>



                    <a
                      href="#contact"
                      aria-label={`Demander un devis pour ${section.title}`}
                      className="hidden h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-lg transition duration-300 group-hover:translate-x-1 md:flex"
                      style={{ color: accentColor }}
                    >
                      →
                    </a>

                  </article>

                ),

              )}

            </div>

          </div>

        </div>

      </section>



      <section className="bg-[#f8f6f1] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl border-y border-neutral-300 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em]" style={{ color: accentColor }}>
                Votre projet
              </p>
              <h2 className="mt-4 text-3xl font-light sm:text-4xl">
                Échangeons autour de votre besoin.
              </h2>
            </div>

            <a
              href="#contact"
              className="w-full border px-7 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] transition hover:-translate-y-0.5 sm:w-auto"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="elegant"
      />

      <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="elegant"
      />

      {(site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" className="bg-neutral-950 px-6 py-24 text-white sm:px-8 lg:py-28">

          <div className="mx-auto max-w-6xl">

            <div className="grid gap-8 border-b border-neutral-800 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-xs font-bold uppercase tracking-[0.4em]"

                >

                  Sélection

                </p>



                <h2 className="mt-5 max-w-3xl text-4xl font-light leading-tight sm:text-5xl">

                  Une sélection de réalisations choisies avec soin.

                </h2>

              </div>



              <p className="max-w-sm text-sm leading-7 text-neutral-500 lg:text-right">

                Une présentation sobre pour mettre le travail de {site.businessName} au premier plan.

              </p>

            </div>



            <div className="mt-12 grid gap-6 md:grid-cols-2">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure

                    key={`${imageUrl}-${index}`}

                    className={`${

                      index % 4 === 0

                        ? "md:col-span-2"

                        : ""

                    } group`}

                  >

                    <div className="overflow-hidden bg-neutral-900">

                      <img

                        src={imageUrl}

                        alt={`Réalisation ${index + 1} de ${site.businessName}`}

                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${

                          index % 4 === 0

                            ? "h-64 sm:h-80 md:h-[520px]"

                            : "h-64 sm:h-80 md:h-[380px]"

                        }`}

                      />

                    </div>



                    <figcaption className="flex items-center justify-between gap-4 border-b border-neutral-800 py-4">

                      <div>

                        <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">

                          {getProjectTitle(activity, index)}

                        </p>

                      </div>



                      <span

                        className="text-sm"

                        style={{ color: accentColor }}

                      >

                        {city}

                      </span>

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark={false}

        elegant

      />



      <footer className="border-t border-neutral-300 bg-[#f8f6f1] px-6 py-14 text-neutral-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 border-b border-neutral-300 pb-12 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <p className="text-xl font-light uppercase tracking-[0.16em]">
                {site.businessName}
              </p>

              <p className="mt-4 max-w-md text-sm leading-7 text-neutral-500">
                {activity} à {city}. Une présentation sobre et soignée de notre savoir-faire.
              </p>
            </div>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
              >
                Découvrir
              </p>

              <div className="mt-5 space-y-3 text-xs font-bold uppercase tracking-[0.14em] text-neutral-600">
                <a href="#services" className="block transition hover:text-neutral-950">
                  Expertise
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-neutral-950">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-neutral-950">
                  Questions
                </a>
                <a href="#contact" className="block transition hover:text-neutral-950">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
              >
                Nous joindre
              </p>

              <p className="mt-5 text-sm text-neutral-500">{city}</p>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="mt-3 inline-block border-b pb-1 text-sm"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {site.phone}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs uppercase tracking-[0.14em] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec SiteAI</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function ArtisanTemplate({

  site,

  accentColor,

  activity,

  city,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {

  return (

    <div className="overflow-hidden bg-[#f3eee4] text-stone-900">

      <nav className="sticky top-0 z-50 border-b border-stone-300 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-4">
            {site.logoUrl ? (
              <img
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-12 w-12 shrink-0 rounded-full border border-stone-300 bg-white object-contain p-1"
              />
            ) : (
              <div
                style={{ backgroundColor: accentColor }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-white"
              >
                {site.businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-lg font-black">
                {site.businessName}
              </p>
              <p className="truncate text-xs font-bold uppercase tracking-widest text-stone-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="#services" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
              Services
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
              Contact
            </a>

            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                style={{ backgroundColor: accentColor }}
                className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                Demander un devis
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-black text-stone-900">
              Menu
              <span aria-hidden="true">☰</span>
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-300 bg-[#fffaf0] p-3 shadow-2xl">
              <a href="#services" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                Services
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                Contact
              </a>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  style={{ backgroundColor: accentColor }}
                  className="mt-2 block rounded-xl px-4 py-3 text-center text-sm font-black text-white"
                >
                  Demander un devis
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section className="relative overflow-hidden bg-stone-900 text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex items-center px-5 py-14 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <div className="max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <span
                  style={{ backgroundColor: accentColor }}
                  className="inline-block rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                >
                  Artisan local
                </span>

                {city && (
                  <span className="rounded-full border border-stone-600 px-4 py-2 text-xs font-bold text-stone-300">
                    📍 {city}
                  </span>
                )}
              </div>

              <h1 className="mt-6 text-[2.35rem] font-black leading-[1.04] tracking-tight sm:mt-7 sm:text-5xl lg:text-6xl">
                {site.heroTitle}
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-stone-300 sm:text-lg">
                {site.heroText}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                {site.phone && (
                  <a
                    href={`tel:${site.phone}`}
                    style={{ backgroundColor: accentColor }}
                    className="rounded-xl px-6 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5"
                  >
                    ☎ {site.phone}
                  </a>
                )}

                <a
                  href="#contact"
                  className="w-full rounded-xl border border-stone-600 bg-stone-800 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-stone-700 sm:w-auto"
                >
                  Demander un devis
                </a>
              </div>

              <div className="mt-10 grid max-w-xl gap-3 text-sm text-stone-400 sm:grid-cols-3">
                <span>✓ Proximité</span>
                <span>✓ Contact direct</span>
                <span>✓ Besoin personnalisé</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[380px] lg:min-h-[620px]">
            {site.heroImageUrl ? (
              <>
                <img
                  src={site.heroImageUrl}
                  alt={site.businessName}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center bg-stone-800 sm:min-h-[380px] lg:min-h-[620px]">
                <div className="text-center">
                  <p className="text-6xl">🛠️</p>
                  <p className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
                    {activity}
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-stone-950/70 p-5 backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                {activity}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {site.businessName}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-300 bg-[#fffaf0] px-6 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            {
              title: "Proche de vous",
              text: `Une activité locale mise en avant à ${city}.`,
              symbol: "✓",
            },
            {
              title: "Conseil personnalisé",
              text: "Un contact simple pour expliquer votre projet.",
              symbol: "✓",
            },
            {
              title: "Suivi du projet",
              text: "Une présentation claire de vos besoins et services.",
              symbol: "✓",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-stone-300 bg-white/70 p-5 shadow-sm"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {item.symbol}
              </div>

              <div>
                <p className="font-black text-stone-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

<section id="services" className="px-5 py-16 sm:px-8 sm:py-20 lg:py-24">

        <div className="mx-auto max-w-6xl">

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

            <div className="max-w-2xl">

              <p

                style={{

                  color: accentColor,

                }}

                className="text-sm font-black uppercase tracking-[0.25em]"

              >

                Notre savoir-faire

              </p>



              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

                Un service concret, local et proche de vos besoins.

              </h2>

            </div>



            <p className="max-w-md leading-7 text-stone-600">

              Des prestations présentées simplement, avec un contact direct avec {site.businessName} à {city}.

            </p>

          </div>



          <div className="mt-12 grid gap-5 md:grid-cols-2">

            {site.sections.map(

              (

                section,

                index,

              ) => (

                <article

                  key={index}

                  className="group relative overflow-hidden rounded-2xl border border-stone-300 bg-[#fffaf0] p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"

                >

                  <div className="flex items-start gap-4">

                    <div

                      style={{

                        backgroundColor:

                          accentColor,

                      }}

                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-white shadow-sm"

                    >

                      {index + 1}

                    </div>



                    <div className="min-w-0">

                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">

                        Service {String(index + 1).padStart(2, "0")}

                      </p>



                      <h3 className="mt-2 text-xl font-black leading-snug sm:text-2xl">

                        {

                          section.title

                        }

                      </h3>

                    </div>

                  </div>



                  <p className="mt-5 leading-7 text-stone-600">

                    {section.text}

                  </p>



                  <div className="mt-6 h-px w-full bg-stone-200" />



                  <div className="mt-5 flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-stone-500">
                      Intervention et accompagnement adaptés à votre besoin.
                    </p>

                    <a
                      href="#contact"
                      className="shrink-0 text-sm font-black"
                      style={{ color: accentColor }}
                    >
                      Devis →
                    </a>
                  </div>

                </article>

              ),

            )}

          </div>

        </div>

      </section>



      <section className="bg-[#f3eee4] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-2xl border border-stone-300 bg-[#fffaf0] p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                Parlons de votre besoin
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Un projet à {city} ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Contactez directement {site.businessName} pour en discuter.
              </p>
            </div>

            <a
              href="#contact"
              className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
              style={{ backgroundColor: accentColor }}
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="artisan"
      />

      <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="artisan"
      />

      {(site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" className="bg-[#fffaf0] px-6 py-20 sm:px-8 lg:py-24">

          <div className="mx-auto max-w-6xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-sm font-black uppercase tracking-[0.25em]"

                >

                  Nos réalisations

                </p>



                <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

                  Du travail concret, visible en images

                </h2>

              </div>



              <p className="max-w-md leading-7 text-stone-600">

                Découvrez quelques interventions et réalisations de {site.businessName} à {city}.

              </p>

            </div>



            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure

                    key={`${imageUrl}-${index}`}

                    className={`group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${

                      index === 0

                        ? "sm:col-span-2"

                        : ""

                    }`}

                  >

                    <div className="overflow-hidden">

                      <img

                        src={imageUrl}

                        alt={`Réalisation ${index + 1} de ${site.businessName}`}

                        className={`w-full object-cover transition duration-500 group-hover:scale-105 ${

                          index === 0

                            ? "h-72 md:h-[400px]"

                            : "h-64"

                        }`}

                      />

                    </div>



                    <figcaption className="flex items-center justify-between gap-4 px-5 py-4">

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">

                          {getProjectTitle(activity, index)}

                        </p>



                        <p className="mt-1 font-black text-stone-900">

                          {site.businessName}

                        </p>

                      </div>



                      <span

                        className="h-3 w-3 rounded-full"

                        style={{ backgroundColor: accentColor }}

                      />

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark

      />



      <footer className="bg-stone-950 px-6 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 border-b border-stone-800 pb-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3">
                {site.logoUrl ? (
                  <img
                    src={site.logoUrl}
                    alt={`Logo ${site.businessName}`}
                    className="h-12 w-12 rounded-full border border-stone-700 bg-white object-contain p-1"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full font-black text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {site.businessName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-xl font-black">{site.businessName}</p>
                  <p className="text-sm text-stone-400">
                    {activity} · {city}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-stone-400">
                Un service de proximité présenté simplement, avec les informations essentielles pour prendre contact.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">
                Navigation
              </p>

              <div className="mt-4 space-y-3 text-sm font-bold text-stone-300">
                <a href="#services" className="block transition hover:text-white">
                  Services
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-white">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-white">
                  Questions fréquentes
                </a>
                <a href="#contact" className="block transition hover:text-white">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">
                Nous contacter
              </p>

              <p className="mt-4 text-sm text-stone-400">{city}</p>

              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="mt-3 block font-black"
                  style={{ color: accentColor }}
                >
                  {site.phone}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec SiteAI</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function ProcessSection({
  site,
  activity,
  city,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  activity: string;
  city: string;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const steps = [
    {
      title: "Présentez votre besoin",
      text: `Expliquez simplement votre projet de ${activity.toLowerCase()} et ce que vous recherchez.`,
    },
    {
      title: "Échangez sur le projet",
      text: `${site.businessName} peut ensuite préciser avec vous les attentes, les contraintes et les prochaines étapes.`,
    },
    {
      title: "Passez à l'action",
      text: `Une fois le besoin clarifié, vous pouvez avancer sur votre projet à ${city}.`,
    },
  ];

  if (variant === "elegant") {
    return (
      <section className="bg-neutral-950 px-6 py-24 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.4em]"
                style={{ color: accentColor }}
              >
                Notre approche
              </p>

              <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">
                Une démarche simple, du premier échange au projet.
              </h2>
            </div>

            <div className="border-t border-neutral-800">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="grid gap-5 border-b border-neutral-800 py-8 md:grid-cols-[80px_1fr]"
                >
                  <span
                    className="text-sm tracking-[0.22em]"
                    style={{ color: accentColor }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="text-2xl font-light">{step.title}</h3>
                    <p className="mt-4 max-w-2xl leading-8 text-neutral-400">
                      {step.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "artisan") {
    return (
      <section className="bg-[#fffaf0] px-6 py-20 text-stone-950 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              Comment ça se passe ?
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Trois étapes simples pour avancer.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-stone-300 bg-[#f3eee4] p-6 shadow-sm"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full font-black text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {index + 1}
                </div>

                <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                <p className="mt-3 leading-7 text-stone-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-950 px-6 py-20 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p
            className="text-sm font-black uppercase tracking-[0.24em]"
            style={{ color: accentColor }}
          >
            Comment ça marche ?
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Un parcours simple pour passer de l'idée au projet.
          </h2>

          <p className="mt-5 max-w-2xl leading-8 text-slate-400">
            Trois étapes claires pour faciliter le premier contact avec {site.businessName}.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: accentColor }}
              />

              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <h3 className="mt-6 text-xl font-black">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


function FaqSection({
  site,
  activity,
  city,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  activity: string;
  city: string;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const questions = [
    {
      question: `Comment demander un devis pour un projet de ${activity.toLowerCase()} ?`,
      answer: site.phone
        ? `Vous pouvez contacter directement ${site.businessName} au ${site.phone} pour présenter votre besoin et échanger sur votre projet.`
        : `Vous pouvez contacter ${site.businessName} pour présenter votre besoin et obtenir davantage d'informations sur votre projet.`,
    },
    {
      question: `Où se situe ${site.businessName} ?`,
      answer: `${site.businessName} présente son activité à ${city}. Pour connaître précisément les zones couvertes, le plus simple est de prendre contact directement avec l'entreprise.`,
    },
    {
      question: "Comment expliquer mon besoin ?",
      answer: `Indiquez simplement le type de projet, vos attentes principales et les informations utiles. ${site.businessName} pourra ensuite échanger avec vous sur les possibilités adaptées à votre demande.`,
    },
    {
      question: "Puis-je poser une question avant de me décider ?",
      answer: site.phone
        ? `Oui. Vous pouvez appeler ${site.businessName} au ${site.phone} pour poser vos questions avant d'aller plus loin.`
        : `Oui. Prenez contact avec ${site.businessName} pour poser vos questions avant d'aller plus loin.`,
    },
  ];

  if (variant === "elegant") {
    return (
      <section id="faq" className="bg-[#f8f6f1] px-6 py-24 text-neutral-950 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.4em]"
              style={{ color: accentColor }}
            >
              Questions fréquentes
            </p>

            <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">
              Quelques réponses avant de nous contacter.
            </h2>

            <p className="mt-6 max-w-md leading-8 text-neutral-500">
              Les informations essentielles pour préparer votre demande auprès de {site.businessName}.
            </p>
          </div>

          <div className="border-t border-neutral-300">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-neutral-300 py-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <div className="flex gap-5">
                    <span
                      className="pt-1 text-xs font-bold tracking-[0.2em]"
                      style={{ color: accentColor }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="text-lg font-light leading-7 sm:text-xl">
                      {item.question}
                    </span>
                  </div>

                  <span
                    className="text-xl transition-transform duration-300 group-open:rotate-45"
                    style={{ color: accentColor }}
                  >
                    +
                  </span>
                </summary>

                <p className="ml-11 mt-5 max-w-2xl leading-8 text-neutral-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "artisan") {
    return (
      <section id="faq" className="bg-[#f3eee4] px-6 py-20 text-stone-950 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              Bon à savoir
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Vos questions, simplement.
            </h2>

            <p className="mt-5 leading-8 text-stone-600">
              Retrouvez les informations utiles avant de contacter {site.businessName}.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-stone-300 bg-[#fffaf0] p-6 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {index + 1}
                    </div>

                    <span className="font-black leading-6">
                      {item.question}
                    </span>
                  </div>

                  <span className="text-lg font-black text-stone-400 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-5 pl-0 leading-7 text-stone-600 sm:pl-13">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="bg-white px-6 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              FAQ
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Les réponses aux questions courantes.
            </h2>

            <p className="mt-5 max-w-md leading-8 text-slate-500">
              De quoi préparer votre demande avant de contacter {site.businessName}.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span
                      className="text-xs font-black"
                      style={{ color: accentColor }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="font-black">
                      {item.question}
                    </span>
                  </div>

                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black text-white transition-transform duration-300 group-open:rotate-45"
                    style={{ backgroundColor: accentColor }}
                  >
                    +
                  </span>
                </summary>

                <p className="border-t border-slate-200 px-6 py-5 leading-7 text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


function LeadForm({
  site,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const isElegant = variant === "elegant";
  const isArtisan = variant === "artisan";

  const fieldClass = isElegant
    ? "w-full border-b border-neutral-300 bg-transparent px-0 py-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
    : isArtisan
      ? "w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-white"
      : "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30";

  const mutedClass = isElegant
    ? "text-neutral-500"
    : isArtisan
      ? "text-white/75"
      : "text-slate-400";

  async function resolvePublicSlug() {
    if (typeof window === "undefined") {
      return "";
    }

    const pathname = window.location.pathname;
    const siteMatch = pathname.match(/^\/site\/([^/?#]+)/);

    if (siteMatch?.[1]) {
      return decodeURIComponent(siteMatch[1]);
    }

    if (pathname.startsWith("/builder")) {
      return "";
    }

    const hostname = window.location.hostname.toLowerCase();

    if (
      hostname &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1"
    ) {
      try {
        const response = await fetch(
          `/api-backend/public-domains/${encodeURIComponent(hostname)}`,
          {
            cache: "no-store",
          },
        );

        if (response.ok) {
          const result = (await response.json()) as {
            publicSlug?: string;
          };

          if (result.publicSlug) {
            return result.publicSlug;
          }
        }
      } catch {
        // Le fallback ci-dessous suffit si le domaine ne peut pas être résolu.
      }
    }

    return site.slug || "";
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!name.trim()) {
      setFormError("Indiquez votre nom.");
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setFormError("Indiquez un email ou un numéro de téléphone.");
      return;
    }

    if (message.trim().length < 10) {
      setFormError("Décrivez votre besoin en quelques mots.");
      return;
    }

    if (!consent) {
      setFormError("Vous devez accepter l'utilisation de vos informations pour être recontacté.");
      return;
    }

    setSending(true);

    try {
      const publicSlug = await resolvePublicSlug();

      if (!publicSlug) {
        throw new Error(
          "Le formulaire est visible dans l'aperçu, mais l'envoi fonctionne sur le site publié.",
        );
      }

      const response = await fetch("/api-backend/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicSlug,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
          consent,
          website,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText.trim() || "Impossible d'envoyer la demande.",
        );
      }

      setFormSuccess("Votre demande a bien été envoyée.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setConsent(false);
      setWebsite("");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la demande.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submitLead}>
      <p
        className={
          isElegant
            ? "text-xs font-bold uppercase tracking-[0.3em] text-neutral-500"
            : isArtisan
              ? "text-sm font-black uppercase tracking-[0.22em] text-white/75"
              : "text-sm font-black uppercase tracking-[0.2em] text-slate-400"
        }
      >
        Demande de devis
      </p>

      <p
        className={
          isElegant
            ? "mt-4 text-2xl font-light"
            : "mt-4 text-2xl font-black"
        }
      >
        Parlez-nous de votre projet
      </p>

      <div className="mt-6 grid gap-4">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Votre nom *"
          autoComplete="name"
          maxLength={100}
          required
          className={fieldClass}
        />

        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Votre email"
          autoComplete="email"
          maxLength={254}
          className={fieldClass}
        />

        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Votre téléphone"
          autoComplete="tel"
          maxLength={40}
          className={fieldClass}
        />

        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Décrivez votre besoin *"
          rows={5}
          minLength={10}
          maxLength={3000}
          required
          className={`${fieldClass} resize-y sm:col-span-2`}
        />
      </div>

      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Site web
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <label className={`mt-5 flex cursor-pointer items-start gap-3 text-xs leading-5 ${mutedClass}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
          required
        />
        <span>
          J&apos;accepte que mes informations soient utilisées pour répondre à ma demande.
        </span>
      </label>

      <button
        type="submit"
        disabled={sending}
        style={
          isElegant
            ? {
                borderColor: accentColor,
                color: accentColor,
              }
            : isArtisan
              ? undefined
              : {
                  backgroundColor: accentColor,
                }
        }
        className={
          isElegant
            ? "mt-6 w-full border px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            : isArtisan
              ? "mt-6 w-full rounded-xl bg-white px-6 py-4 text-sm font-black text-stone-950 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              : "mt-6 w-full rounded-xl px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {sending ? "Envoi..." : "Envoyer ma demande"}
      </button>

      {site.phone && (
        <a
          href={`tel:${site.phone}`}
          className={
            isElegant
              ? "mt-4 block text-center text-sm text-neutral-500 underline underline-offset-4"
              : isArtisan
                ? "mt-4 block text-center text-sm font-bold text-white/80"
                : "mt-4 block text-center text-sm font-bold text-slate-400"
          }
        >
          Ou appeler directement {site.phone}
        </a>
      )}

      {formSuccess && (
        <p
          className={
            isElegant
              ? "mt-4 text-sm text-emerald-700"
              : isArtisan
                ? "mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white"
                : "mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300"
          }
        >
          ✓ {formSuccess}
        </p>
      )}

      {formError && (
        <p
          className={
            isElegant
              ? "mt-4 text-sm text-red-700"
              : isArtisan
                ? "mt-4 rounded-xl bg-black/15 px-4 py-3 text-sm font-bold text-white"
                : "mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
          }
        >
          {formError}
        </p>
      )}
    </form>
  );
}


function ContactSection({

  site,

  activity,

  city,

  accentColor,

  dark,

  elegant = false,

}: {

  site: GeneratedSite;

  activity: string;

  city: string;

  accentColor: string;

  dark: boolean;

  elegant?: boolean;

}) {

  if (elegant) {
    return (
      <section id="contact" className="bg-[#f8f6f1] px-6 py-24 text-neutral-950 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 border-y border-neutral-300 py-12 lg:gap-16" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
            <div>
              <p
                style={{ color: accentColor }}
                className="text-xs font-bold uppercase tracking-[0.4em]"
              >
                Contact
              </p>

              <h2 className="mt-6 max-w-3xl text-4xl font-light leading-[1.08] sm:text-5xl">
                Parlons de votre projet.
              </h2>

              <p className="mt-6 max-w-2xl leading-8 text-neutral-600">
                Contactez {site.businessName} pour échanger sur votre besoin en{" "}
                {activity.toLowerCase()} à {city}.
              </p>
            </div>

            <div className="border-t border-neutral-300 pt-10 lg:border-t-0 lg:pt-0">
              <LeadForm
                site={site}
                accentColor={accentColor}
                variant="elegant"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (dark) {
    return (
      <section id="contact" className="bg-stone-900 px-6 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-3xl border border-stone-700 bg-stone-950">
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
              <div className="p-8 sm:p-10 lg:p-12">
                <p
                  style={{ color: accentColor }}
                  className="text-sm font-black uppercase tracking-[0.24em]"
                >
                  Un projet en tête ?
                </p>

                <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Échangeons simplement sur votre besoin.
                </h2>

                <p className="mt-6 max-w-2xl leading-8 text-stone-300">
                  {site.businessName} intervient pour vos projets de{" "}
                  {activity.toLowerCase()} à {city}.
                </p>

                <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-stone-300">
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Contact direct
                  </span>
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Projet sur mesure
                  </span>
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Intervention locale
                  </span>
                </div>
              </div>

              <div
                className="p-8 text-white sm:p-10 lg:p-12"
                style={{ backgroundColor: accentColor }}
              >
                <LeadForm
                  site={site}
                  accentColor={accentColor}
                  variant="artisan"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="bg-slate-50 px-6 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-7 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 15% 20%, ${accentColor}66 0, transparent 32%), radial-gradient(circle at 90% 85%, ${accentColor}33 0, transparent 28%)`,
            }}
          />

          <div className="relative grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
            <div>
              <p
                style={{ color: accentColor }}
                className="text-sm font-black uppercase tracking-[0.24em]"
              >
                Contact
              </p>

              <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Un projet ? Parlons-en.
              </h2>

              <p className="mt-6 max-w-2xl leading-8 text-slate-300">
                Contactez {site.businessName} pour discuter de votre besoin en{" "}
                {activity.toLowerCase()} à {city}.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ Échange direct
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ Besoin étudié
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ {city}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-8">
              <LeadForm
                site={site}
                accentColor={accentColor}
                variant="modern"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

}
