"use client";

import Link from "next/link";
import { useState } from "react";
import SitePreview from "@/components/SitePreview";
import { demoSites as examples } from "@/lib/demoSites";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function ExamplesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          Chargement des exemples…
        </main>
      }
    >
      <ExamplesContent />
    </Suspense>
  );
}

function ExamplesContent() {
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get("metier") ?? "plombier");
  const requestedColor = params.get("couleur");
  const initialColor =
    requestedColor && /^#[0-9a-f]{6}$/i.test(requestedColor)
      ? requestedColor
      : null;
  const example = examples.find((item) => item.id === selected) ?? examples[0];
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="text-xl font-black">
            Lu<span className="text-blue-500">mio</span>
          </Link>
          <Link
            href="/auth"
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold"
          >
            Créer mon aperçu gratuit
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black sm:text-4xl">
          Imagine ton activité en ligne
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          Trois démonstrations réalisées avec les modèles de Lumio. Ces
          entreprises sont fictives et les photos sont des illustrations ; les
          formulaires n’envoient aucun message. Tes textes, tes couleurs et tes
          photos restent personnalisables.
        </p>
        <div
          className="my-6 flex flex-wrap gap-3"
          aria-label="Choisir une démonstration"
        >
          {examples.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected === item.id}
              onClick={() => setSelected(item.id)}
              className={`rounded-xl border px-5 py-3 text-sm font-bold ${selected === item.id ? "border-blue-500 bg-blue-600" : "border-slate-700 hover:bg-slate-800"}`}
            >
              {item.activity}
            </button>
          ))}
        </div>
        <div
          className="overflow-hidden rounded-2xl border border-slate-700 bg-white text-slate-950"
          onClickCapture={(event) => {
            const anchor = (event.target as HTMLElement).closest(
              'a[href^="tel:"], a[href^="mailto:"]',
            );
            if (anchor) event.preventDefault();
          }}
        >
          <SitePreview
            key={example.id}
            previewOnly
            designStyle={example.style}
            accentColor={
              selected === params.get("metier") && initialColor
                ? initialColor
                : example.color
            }
            activity={example.activity}
            city="Montpellier"
            site={{
              businessName: example.name,
              slug: "",
              metaTitle: example.name,
              metaDescription: example.text,
              heroEyebrow: "Démonstration Lumio",
              heroTitle: example.title,
              heroText: example.text,
              siteGoal: example.id === "restaurant" ? "booking" : "quote",
              primaryCta:
                example.id === "restaurant"
                  ? "Demander une réservation"
                  : "Demander un devis",
              secondaryCta: "Nous contacter",
              phone: "",
              logoUrl: "",
              heroImageUrl: example.image,
              gallery: example.gallery,
              sections: example.services,
              aboutTitle:
                example.id === "restaurant"
                  ? "Le goût des moments partagés"
                  : example.id === "paysagiste"
                    ? "Pensons votre prochain jardin"
                    : "Un interlocuteur pour vos travaux",
              aboutText: example.about,
              hiddenBlocks: ["faq", "process"],
              contactTitle: "Un besoin, une question ?",
              contactText:
                "Ce formulaire est une démonstration. Aucun message ne sera envoyé.",
            }}
          />
        </div>
        <div className="mt-8 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold">À toi de créer le tien</h2>
          <p className="mt-2 text-slate-400">
            Commence par ton activité et ta ville. Tu peux essayer avant de
            choisir un abonnement pour publier.
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold"
          >
            Essayer gratuitement
          </Link>
        </div>
      </section>
    </main>
  );
}
