"use client";

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
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          {site.logoUrl && (
            <img
              src={site.logoUrl}
              alt={`Logo ${site.businessName}`}
              className="h-12 w-12 rounded-xl object-contain"
            />
          )}

          <div>
            <p className="text-lg font-black">
              {site.businessName}
            </p>

            <p className="text-xs text-slate-500">
              {activity} · {city}
            </p>
          </div>
        </div>

        {site.phone && (
          <a
            href={`tel:${site.phone}`}
            style={{
              backgroundColor:
                accentColor,
            }}
            className="rounded-xl px-5 py-3 text-sm font-bold text-white"
          >
            {site.phone}
          </a>
        )}
      </nav>

      <section
        className="relative overflow-hidden bg-slate-950 px-8 py-28 text-center text-white"
        style={
          site.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.78)), url("${site.heroImageUrl}")`,
                backgroundSize:
                  "cover",
                backgroundPosition:
                  "center",
              }
            : undefined
        }
      >
        <div className="relative z-10 mx-auto max-w-4xl">
          <span
            style={{
              color: accentColor,
            }}
            className="text-sm font-black uppercase tracking-[0.3em]"
          >
            {activity} à {city}
          </span>

          <h1 className="mt-6 text-5xl font-black leading-tight md:text-6xl">
            {site.heroTitle}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {site.heroText}
          </p>

          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              style={{
                backgroundColor:
                  accentColor,
              }}
              className="mt-8 inline-block rounded-xl px-7 py-4 font-bold text-white shadow-lg"
            >
              Nous contacter
            </a>
          )}
        </div>
      </section>

      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p
              style={{
                color: accentColor,
              }}
              className="text-sm font-black uppercase tracking-[0.25em]"
            >
              Nos services
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Comment pouvons-nous vous aider ?
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {site.sections.map(
              (
                section,
                index,
              ) => (
                <article
                  key={index}
                  className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white"
                  >
                    {index + 1}
                  </div>

                  <h3 className="mt-6 text-xl font-black">
                    {section.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {section.text}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {(site.gallery ?? [])
        .length > 0 && (
        <section className="bg-slate-50 px-8 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p
                style={{
                  color:
                    accentColor,
                }}
                className="text-sm font-black uppercase tracking-[0.25em]"
              >
                Galerie
              </p>

              <h2 className="mt-4 text-4xl font-black">
                Nos réalisations
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                site.gallery ??
                []
              ).map(
                (
                  imageUrl,
                  index,
                ) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt={`Réalisation ${index + 1}`}
                    className="h-64 w-full rounded-3xl object-cover"
                  />
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

      <footer className="bg-slate-950 px-8 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 md:flex-row">
          <div>
            <p className="font-black">
              {site.businessName}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {activity} à {city}
            </p>
          </div>

          <p className="text-sm text-slate-600">
            Site créé avec SiteAI
          </p>
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
      <nav className="flex items-center justify-between border-b border-neutral-300 px-8 py-7">
        <div className="flex items-center gap-4">
          {site.logoUrl && (
            <img
              src={site.logoUrl}
              alt={`Logo ${site.businessName}`}
              className="h-12 w-12 object-contain"
            />
          )}

          <p className="text-xl font-light uppercase tracking-[0.15em]">
            {site.businessName}
          </p>
        </div>

        {site.phone && (
          <a
            href={`tel:${site.phone}`}
            className="border-b border-neutral-900 pb-1 text-sm uppercase tracking-widest"
          >
            Contact
          </a>
        )}
      </nav>

      <section
        className="relative flex min-h-[580px] items-center overflow-hidden bg-neutral-950 px-8 py-24 text-white"
        style={
          site.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.9), rgba(10,10,10,0.42)), url("${site.heroImageUrl}")`,
                backgroundSize:
                  "cover",
                backgroundPosition:
                  "center",
              }
            : undefined
        }
      >
        <div className="relative z-10 max-w-3xl">
          <p
            style={{
              color: accentColor,
            }}
            className="text-xs font-semibold uppercase tracking-[0.45em]"
          >
            {activity} · {city}
          </p>

          <h1 className="mt-8 text-5xl font-light leading-[1.1] md:text-7xl">
            {site.heroTitle}
          </h1>

          <div
            style={{
              backgroundColor:
                accentColor,
            }}
            className="mt-8 h-px w-28"
          />

          <p className="mt-8 max-w-xl text-lg font-light leading-8 text-neutral-300">
            {site.heroText}
          </p>

          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              style={{
                borderColor:
                  accentColor,
              }}
              className="mt-10 inline-block border px-8 py-4 text-sm uppercase tracking-[0.2em] transition hover:bg-white hover:text-black"
            >
              Prendre contact
            </a>
          )}
        </div>
      </section>

      <section className="px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p
                style={{
                  color:
                    accentColor,
                }}
                className="text-xs font-bold uppercase tracking-[0.4em]"
              >
                Expertise
              </p>

              <h2 className="mt-5 text-4xl font-light leading-tight">
                Un service pensé dans les moindres détails.
              </h2>
            </div>

            <div className="border-t border-neutral-300">
              {site.sections.map(
                (
                  section,
                  index,
                ) => (
                  <article
                    key={index}
                    className="grid gap-5 border-b border-neutral-300 py-8 md:grid-cols-[70px_1fr]"
                  >
                    <p
                      style={{
                        color:
                          accentColor,
                      }}
                      className="text-sm font-semibold"
                    >
                      0{index + 1}
                    </p>

                    <div>
                      <h3 className="text-2xl font-light">
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
                  </article>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {(site.gallery ?? [])
        .length > 0 && (
        <section className="bg-neutral-950 px-8 py-24 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-8">
              <div>
                <p
                  style={{
                    color:
                      accentColor,
                  }}
                  className="text-xs font-bold uppercase tracking-[0.4em]"
                >
                  Galerie
                </p>

                <h2 className="mt-5 text-4xl font-light">
                  Nos réalisations
                </h2>
              </div>

              <p className="hidden max-w-sm text-right text-sm leading-6 text-neutral-500 md:block">
                Découvrez quelques exemples de notre savoir-faire.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {(
                site.gallery ??
                []
              ).map(
                (
                  imageUrl,
                  index,
                ) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt={`Réalisation ${index + 1}`}
                    className={`w-full object-cover ${
                      index %
                        3 ===
                      0
                        ? "h-80 md:h-[430px]"
                        : "h-80"
                    }`}
                  />
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

      <footer className="border-t border-neutral-300 px-8 py-12">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 md:flex-row">
          <p className="text-sm uppercase tracking-[0.18em]">
            {site.businessName}
          </p>

          <p className="text-sm text-neutral-500">
            {activity} · {city}
          </p>
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
      <nav className="flex items-center justify-between border-b border-stone-300 bg-[#fffaf0] px-8 py-5">
        <div className="flex items-center gap-4">
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={`Logo ${site.businessName}`}
              className="h-14 w-14 rounded-full border border-stone-300 bg-white object-contain p-1"
            />
          ) : (
            <div
              style={{
                backgroundColor:
                  accentColor,
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full font-black text-white"
            >
              {site.businessName
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-xl font-black">
              {site.businessName}
            </p>

            <p className="text-xs uppercase tracking-widest text-stone-500">
              {activity}
            </p>
          </div>
        </div>

        <p className="hidden text-sm font-semibold text-stone-600 sm:block">
          {city}
        </p>
      </nav>

      <section className="grid bg-stone-900 text-white lg:grid-cols-2">
        <div className="flex items-center px-8 py-20 lg:px-14">
          <div>
            <span
              style={{
                backgroundColor:
                  accentColor,
              }}
              className="inline-block rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
            >
              Artisan local
            </span>

            <h1 className="mt-7 text-5xl font-black leading-tight">
              {site.heroTitle}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300">
              {site.heroText}
            </p>

            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                style={{
                  backgroundColor:
                    accentColor,
                }}
                className="mt-8 inline-block rounded-xl px-7 py-4 font-black text-white shadow-xl"
              >
                ☎ {site.phone}
              </a>
            )}
          </div>
        </div>

        <div className="min-h-[430px]">
          {site.heroImageUrl ? (
            <img
              src={
                site.heroImageUrl
              }
              alt={
                site.businessName
              }
              className="h-full min-h-[430px] w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[430px] items-center justify-center bg-stone-800">
              <div className="text-center">
                <p className="text-6xl">
                  🛠️
                </p>

                <p className="mt-4 text-sm uppercase tracking-widest text-stone-500">
                  {activity}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p
              style={{
                color: accentColor,
              }}
              className="text-sm font-black uppercase tracking-[0.25em]"
            >
              Notre savoir-faire
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Un travail sérieux, proche de nos clients.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {site.sections.map(
              (
                section,
                index,
              ) => (
                <article
                  key={index}
                  className="rounded-2xl border border-stone-300 bg-[#fffaf0] p-7 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div
                      style={{
                        backgroundColor:
                          accentColor,
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-white"
                    >
                      {index + 1}
                    </div>

                    <h3 className="text-xl font-black">
                      {
                        section.title
                      }
                    </h3>
                  </div>

                  <p className="mt-5 leading-7 text-stone-600">
                    {section.text}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {(site.gallery ?? [])
        .length > 0 && (
        <section className="bg-[#fffaf0] px-8 py-20">
          <div className="mx-auto max-w-6xl">
            <p
              style={{
                color:
                  accentColor,
              }}
              className="text-sm font-black uppercase tracking-[0.25em]"
            >
              Nos réalisations
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Le résultat en images
            </h2>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(
                site.gallery ??
                []
              ).map(
                (
                  imageUrl,
                  index,
                ) => (
                  <div
                    key={`${imageUrl}-${index}`}
                    className="overflow-hidden rounded-2xl border-4 border-white shadow-lg"
                  >
                    <img
                      src={imageUrl}
                      alt={`Réalisation ${index + 1}`}
                      className="h-64 w-full object-cover"
                    />
                  </div>
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

      <footer className="bg-stone-950 px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xl font-black">
            {site.businessName}
          </p>

          <p className="mt-2 text-sm text-stone-400">
            {activity} à {city}
          </p>

          {site.phone && (
            <p
              style={{
                color:
                  accentColor,
              }}
              className="mt-3 font-black"
            >
              {site.phone}
            </p>
          )}
        </div>
      </footer>
    </div>
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
  return (
    <section
      className={`px-8 py-20 text-center ${
        dark
          ? "bg-stone-900 text-white"
          : elegant
            ? "bg-[#f8f6f1] text-neutral-950"
            : "bg-slate-50 text-slate-950"
      }`}
    >
      <div className="mx-auto max-w-2xl">
        <p
          style={{
            color: accentColor,
          }}
          className={`font-bold uppercase ${
            elegant
              ? "text-xs tracking-[0.4em]"
              : "text-sm tracking-[0.25em]"
          }`}
        >
          Contact
        </p>

        <h2
          className={`mt-5 ${
            elegant
              ? "text-4xl font-light"
              : "text-4xl font-black"
          }`}
        >
          Besoin d&apos;un professionnel ?
        </h2>

        <p
          className={`mt-5 leading-8 ${
            dark
              ? "text-stone-300"
              : "text-slate-600"
          }`}
        >
          Contactez{" "}
          {site.businessName} pour
          discuter de votre besoin en{" "}
          {activity.toLowerCase()} à{" "}
          {city}.
        </p>

        {site.phone && (
          <a
            href={`tel:${site.phone}`}
            style={
              elegant
                ? {
                    borderColor:
                      accentColor,
                    color:
                      accentColor,
                  }
                : {
                    backgroundColor:
                      accentColor,
                  }
            }
            className={`mt-8 inline-block px-8 py-4 font-bold ${
              elegant
                ? "border uppercase tracking-widest"
                : "rounded-xl text-white"
            }`}
          >
            {site.phone}
          </a>
        )}
      </div>
    </section>
  );
}