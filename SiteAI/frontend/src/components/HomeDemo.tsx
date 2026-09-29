"use client";
import Link from "next/link";
import { useState } from "react";
import { demoSites } from "@/lib/demoSites";

export default function HomeDemo() {
  const [selected, setSelected] = useState(demoSites[0]);
  const [color, setColor] = useState(demoSites[0].color);
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="border-b border-slate-700 p-4 sm:p-5">
        <p className="text-sm font-bold">Essaie Lumio, sans créer de compte</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Change le métier et la couleur pour découvrir le résultat.
        </p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Métier de la démonstration"
        >
          {demoSites.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected.id === item.id}
              onClick={() => {
                setSelected(item);
                setColor(item.color);
              }}
              className={
                "rounded-lg border px-3 py-2 text-xs font-semibold " +
                (selected.id === item.id
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-600 hover:bg-slate-800")
              }
            >
              {item.activity}
            </button>
          ))}
        </div>
        <fieldset className="mt-4 flex items-center gap-3">
          <legend className="mb-2 text-xs text-slate-300">
            Couleur principale
          </legend>
          {[
            { name: "Bleu", value: "#2563eb" },
            { name: "Terre", value: "#92400e" },
            { name: "Vert", value: "#3f6212" },
            { name: "Violet", value: "#7c3aed" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              aria-label={item.name}
              aria-pressed={color === item.value}
              onClick={() => setColor(item.value)}
              style={{ backgroundColor: item.value }}
              className={
                "h-10 w-10 rounded-full border-2 " +
                (color === item.value
                  ? "border-white ring-2 ring-slate-500"
                  : "border-transparent")
              }
            />
          ))}
        </fieldset>
      </div>
      <div className="bg-white text-slate-950">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="font-bold" style={{ color }}>
            {selected.name}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Démonstration
          </span>
        </div>
        {/* Local illustrative images keep the demo independent of an external image service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected.image}
          alt={selected.imageAlt}
          width={960}
          height={640}
          className="h-48 w-full object-cover sm:h-56"
        />
        <div className="p-5 sm:p-7">
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">
            {selected.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {selected.text}
          </p>
          <Link
            href={
              "/exemples?metier=" +
              selected.id +
              "&couleur=" +
              encodeURIComponent(color)
            }
            style={{ backgroundColor: color }}
            className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-bold text-white"
          >
            Explorer ce site →
          </Link>
        </div>
      </div>
      <p className="px-5 py-3 text-xs leading-5 text-slate-400">
        Entreprise fictive · Photos d’illustration · Aucun changement à
        enregistrer.
      </p>
    </div>
  );
}
