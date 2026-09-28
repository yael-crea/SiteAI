"use client";

import Link from "next/link";
import { useState } from "react";
import SitePreview from "@/components/SitePreview";
import type { DesignStyle } from "@/lib/designStyles";

const examples: {id: string; name: string; activity: string; style: DesignStyle; color: string; title: string; text: string; services: string[]}[] = [
  {id: "plombier", name: "Atelier du Robinet", activity: "Plombier", style: "moderne", color: "#2563eb", title: "Une plomberie soignée, du diagnostic à la réparation.", text: "Présentez votre besoin : fuite, installation sanitaire ou rénovation de salle de bain. Nous étudions votre projet avant de proposer une intervention adaptée.", services: ["Recherche de fuite", "Installation sanitaire", "Rénovation de salle de bain"]},
  {id: "restaurant", name: "La Table du Jardin", activity: "Restaurant", style: "tradition", color: "#92400e", title: "Une table conviviale, une cuisine de saison.", text: "Découvrez notre cuisine et préparez votre prochaine visite. Contactez notre équipe pour une réservation ou un repas de groupe.", services: ["Repas sur place", "Réservation de table", "Repas de groupe"]},
  {id: "paysagiste", name: "Les Jardins Clairs", activity: "Paysagiste", style: "nature", color: "#3f6212", title: "Un jardin qui vous ressemble, au fil des saisons.", text: "Aménagement, plantations et entretien : parlons de votre extérieur pour construire un projet adapté à vos envies et à votre terrain.", services: ["Aménagement de jardin", "Entretien des espaces verts", "Plantations"]},
];

export default function ExamplesPage() {
  const [selected, setSelected] = useState("plombier");
  const example = examples.find(item => item.id === selected) ?? examples[0];
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="border-b border-slate-800"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
      <Link href="/" className="text-xl font-black">Lu<span className="text-blue-500">mio</span></Link>
      <Link href="/auth" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold">Créer mon aperçu gratuit</Link>
    </div></header>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-black sm:text-4xl">Imagine ton activité en ligne</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-400">Trois démonstrations réalisées avec les modèles de Lumio. Ces entreprises sont fictives ; les formulaires n’envoient aucun message. Tes textes, tes couleurs et tes photos restent personnalisables.</p>
      <div className="my-6 flex flex-wrap gap-3" aria-label="Choisir une démonstration">{examples.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} className={`rounded-xl border px-5 py-3 text-sm font-bold ${selected === item.id ? "border-blue-500 bg-blue-600" : "border-slate-700 hover:bg-slate-800"}`}>{item.activity}</button>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-white text-slate-950" onClickCapture={event => {
        const anchor = (event.target as HTMLElement).closest('a[href^="tel:"], a[href^="mailto:"]');
        if (anchor) event.preventDefault();
      }}>
        <SitePreview key={example.id} previewOnly designStyle={example.style} accentColor={example.color} activity={example.activity} city="Votre ville" site={{
          businessName: example.name, slug: "", metaTitle: example.name, metaDescription: example.text,
          heroEyebrow: "Démonstration Lumio", heroTitle: example.title, heroText: example.text,
          primaryCta: "Nous contacter", secondaryCta: "Découvrir nos services", phone: "", logoUrl: "", heroImageUrl: "", gallery: [],
          sections: example.services.map(title => ({title, text: "Présentez ici cette prestation, son déroulement et les informations utiles pour vos clients."})),
          aboutTitle: "Parlons de votre projet", aboutText: example.text,
          hiddenBlocks: ["gallery", "faq", "process"], contactTitle: "Un besoin, une question ?", contactText: "Ce formulaire est une démonstration. Aucun message ne sera envoyé.",
        }} />
      </div>
      <div className="mt-8 rounded-2xl border border-slate-800 p-6"><h2 className="text-xl font-bold">À toi de créer le tien</h2><p className="mt-2 text-slate-400">Commence par ton activité et ta ville. Tu peux essayer avant de choisir un abonnement pour publier.</p><Link href="/auth" className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold">Essayer gratuitement</Link></div>
    </section>
  </main>;
}
