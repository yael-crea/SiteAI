"use client";

import { useEffect, useState } from "react";

/*
 * Parrainage dans le tableau de bord : lien personnel à partager et mois
 * gagnés. Un mois de la formule du parrain est crédité sur son compte Stripe
 * quand un filleul paie son premier mois (12 au plus par an).
 */

type ReferralSummary = {
  link: string;
  referred: number;
  paid: number;
  monthsEarned: number;
  pending: number;
  maxPerYear: number;
};

type Props = {
  authenticatedFetch: (path: string, options?: RequestInit) => Promise<Response>;
};

export default function ReferralCard({ authenticatedFetch }: Props) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    authenticatedFetch("/referrals")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: ReferralSummary) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // Chargé une fois à l'ouverture du tableau de bord.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLink() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (failed) return null;

  return (
    <section className="mt-8">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-400">Parrainage</p>
      <h2 className="mt-2 text-2xl font-black">Parraine un professionnel, gagne un mois</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Partage ton lien. Quand un professionnel s’abonne grâce à toi et paie son premier mois,
        un mois de ta formule est déduit de ta prochaine facture (jusqu’à {summary?.maxPerYear ?? 12} mois par an).
      </p>

      <div className="mt-5 grid gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">Ton lien personnel</p>
          <p className="mt-1 truncate font-mono text-sm text-slate-200">
            {summary ? summary.link : "Chargement…"}
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          disabled={!summary}
          className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:opacity-50"
        >
          {copied ? "Lien copié ✓" : "Copier le lien"}
        </button>

        {summary && (
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <Stat label="Filleuls" value={summary.referred} />
            <Stat label="Abonnés payants" value={summary.paid} />
            <Stat
              label="Mois offerts"
              value={summary.monthsEarned}
              hint={summary.pending > 0 ? `${summary.pending} en attente` : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
