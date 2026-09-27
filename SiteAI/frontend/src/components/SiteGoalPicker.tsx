"use client";

import { useId } from "react";
import { safeBookingUrl, type SiteGoal } from "@/lib/siteGoal";

export default function SiteGoalPicker({value, bookingUrl, disabled, onChange, onBookingUrlChange}: {
  value: SiteGoal; bookingUrl: string; disabled: boolean;
  onChange: (value: SiteGoal) => void; onBookingUrlChange: (value: string) => void;
}) {
  const id = useId();
  return <fieldset data-builder-edit="goal" tabIndex={-1} disabled={disabled} className="mb-6 min-w-0 rounded-xl border border-blue-900 bg-blue-950/20 p-4">
    <legend className="px-1 text-sm font-bold">Que souhaites-tu recevoir ?</legend>
    <label htmlFor={id} className="sr-only">Objectif du site</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value as SiteGoal)} className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-sm">
      {value === "legacy" && <option value="legacy">Conserver mes boutons actuels</option>}
      <option value="calls">Des appels</option><option value="quote">Des demandes de devis</option><option value="booking">Des réservations</option>
    </select>
    <p className="mt-2 text-xs leading-5 text-slate-400">Ce choix adapte le bouton principal. Tu peux le changer ici à tout moment.</p>
    {value === "calls" && <p className="mt-2 text-xs text-slate-300">Renseigne ton téléphone. Sans numéro, le bouton ouvre la section contact.</p>}
    {value === "booking" && <div className="mt-3">
      <label htmlFor={`${id}-url`} className="mb-2 block text-sm">Lien de réservation (facultatif)</label>
      <input id={`${id}-url`} type="text" inputMode="url" value={bookingUrl} onChange={event => onBookingUrlChange(event.target.value)} placeholder="https://…" maxLength={2048} className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-sm" />
      {bookingUrl.trim() && !safeBookingUrl(bookingUrl) && <p role="alert" className="mt-2 text-xs text-amber-300">Utilise une adresse complète commençant par https://. En attendant, le bouton mène au formulaire de contact.</p>}
      <p className="mt-2 text-xs leading-5 text-slate-400">Ajoute le lien de ton outil de réservation. Sans lien valide, tes visiteurs envoient une demande via le formulaire ; aucun créneau n’est confirmé automatiquement.</p>
    </div>}
  </fieldset>;
}
