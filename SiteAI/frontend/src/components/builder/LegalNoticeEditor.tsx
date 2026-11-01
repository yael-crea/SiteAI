"use client";

import type { SiteLegal } from "@/lib/builderTypes";
import { legalNoticeMissingFields } from "@/lib/siteLegal";

/*
 * Mentions légales du site dans l'éditeur. Elles s'affichent en bas du site
 * publié (SiteLegalNotice) ; les champs manquants sont signalés ici et dans
 * la vérification avant publication.
 */

const fields: { key: keyof SiteLegal; label: string; placeholder: string; type?: string; maxLength: number }[] = [
  { key: "companyName", label: "Nom ou raison sociale", placeholder: "Ex. : Atelier du Robinet SARL ou Jean Dupont", maxLength: 120 },
  { key: "legalForm", label: "Forme juridique (facultatif)", placeholder: "Ex. : entrepreneur individuel, SARL au capital de 5 000 €", maxLength: 120 },
  { key: "address", label: "Adresse", placeholder: "Ex. : 12 rue des Lilas, 34000 Montpellier", maxLength: 200 },
  { key: "siren", label: "SIREN ou SIRET", placeholder: "Ex. : 123 456 789", maxLength: 30 },
  { key: "vatNumber", label: "N° de TVA intracommunautaire (facultatif)", placeholder: "Ex. : FR12 123456789", maxLength: 30 },
  { key: "publisher", label: "Directeur de la publication (facultatif)", placeholder: "Par défaut : le nom ci-dessus", maxLength: 120 },
  { key: "email", label: "E-mail de contact", placeholder: "contact@exemple.fr", type: "email", maxLength: 160 },
];

type Props = {
  value?: SiteLegal;
  onChange: (value: SiteLegal) => void;
};

export default function LegalNoticeEditor({ value, onChange }: Props) {
  const legal = value ?? {};
  const missing = legalNoticeMissingFields({ legal });

  return (
    <details className="rounded-xl border border-slate-700 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Mentions légales{" "}
        {missing.length > 0 ? (
          <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">à compléter</span>
        ) : (
          <span className="ml-1 text-xs text-emerald-400">✓ complètes</span>
        )}
      </summary>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Obligatoires pour un site professionnel : elles s’affichent en bas de ton site, avec l’hébergeur et
        l’information sur les données des visiteurs, déjà rédigées par Lumio.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map((field, index) => (
          <label key={field.key} className={field.key === "address" || field.key === "legalForm" ? "sm:col-span-2" : undefined}>
            <span className="mb-1.5 block text-xs text-slate-400">{field.label}</span>
            <input
              data-builder-edit={index === 0 ? "legal" : undefined}
              type={field.type ?? "text"}
              value={legal[field.key] ?? ""}
              onChange={(event) => onChange({ ...legal, [field.key]: event.target.value })}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        ))}
      </div>
      {missing.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-amber-300">À compléter : {missing.join(", ")}.</p>
      )}
    </details>
  );
}
