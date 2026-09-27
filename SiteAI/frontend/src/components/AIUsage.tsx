"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Usage = {used: number; limit: number; remaining: number; resetsAt: string};

export default function AIUsage({ready, busy}: {ready: boolean; busy: boolean}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready || busy) return;
    const controller = new AbortController();
    let request = 0;
    async function refresh() {
      const current = ++request;
      try {
        const {data} = await supabase.auth.getSession();
        if (!data.session) throw new Error("Session absente");
        const response = await fetch("/api-backend/ai/usage", {headers: {Authorization: `Bearer ${data.session.access_token}`}, cache: "no-store", signal: controller.signal});
        if (!response.ok) throw new Error("Quota indisponible");
        const result: Usage = await response.json();
        if (!Number.isSafeInteger(result.used) || !Number.isSafeInteger(result.limit) || !Number.isSafeInteger(result.remaining) || !Number.isFinite(Date.parse(result.resetsAt))) throw new Error("Quota invalide");
        if (!controller.signal.aborted && current === request) {setUsage(result); setError(false);}
      } catch {
        if (!controller.signal.aborted && current === request) {setError(true); setUsage(null);}
      }
    }
    void refresh();
    const focus = () => {void refresh();};
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 60000);
    return () => {controller.abort(); window.removeEventListener("focus", focus); window.clearInterval(timer);};
  }, [ready, busy, retry]);
  if (!ready) return null;
  return <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-xs" aria-live="polite">
    {error ? <><span className="text-slate-400">Compteur IA momentanément indisponible</span><button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)} className="rounded border border-slate-600 px-2 py-1">Actualiser</button></> : usage ? <>
      <span className={usage.remaining === 0 ? "font-semibold text-amber-300" : "font-semibold text-blue-200"}>{usage.limit < 0 ? "IA : sans quota mensuel · administrateur" : `IA : ${usage.remaining} demande${usage.remaining > 1 ? "s" : ""} restante${usage.remaining > 1 ? "s" : ""} sur ${usage.limit}`}</span>
      {usage.limit >= 0 && <span className="text-slate-400">Renouvellement le {new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}).format(new Date(usage.resetsAt))} à 00 h UTC.</span>}
      {usage.limit >= 0 && usage.remaining === 0 && <span className="text-slate-300">Tu peux continuer à modifier manuellement ton site.</span>}
      <span className="text-slate-500">Créations et modifications IA comptées ensemble · 20 demandes maximum par heure.</span>
      {busy && <span className="text-slate-400">Actualisation après l’opération…</span>}
    </> : <span className="text-slate-400">Chargement du quota IA…</span>}
  </div>;
}
