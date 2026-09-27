"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

type Feedback = {
  url: string;
  tone: "success" | "error";
  message: string;
};

export default function PublicationSuccess({
  publicSlug,
  businessName,
}: {
  publicSlug: string;
  businessName: string;
}) {
  const origin = useSyncExternalStore(subscribeToOrigin, getOrigin, getServerOrigin);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState<"copy" | "share" | null>(null);
  const busyRef = useRef(false);
  const addressRef = useRef<HTMLInputElement>(null);
  const publicPath = `/site/${encodeURIComponent(publicSlug)}`;
  const publicUrl = origin ? `${origin}${publicPath}` : "";

  async function copyAddress(fromShare = false) {
    if (!navigator.clipboard?.writeText) {
      throw new Error("clipboard-unavailable");
    }
    await navigator.clipboard.writeText(publicUrl);
    setFeedback({
      url: publicUrl,
      tone: "success",
      message: fromShare
        ? "Lien copié. Colle-le dans le message de ton choix."
        : "Lien copié ! Tu peux maintenant le partager.",
    });
  }

  async function handleAction(action: "copy" | "share") {
    if (!publicUrl || busyRef.current) return;
    busyRef.current = true;
    setPending(action);
    setFeedback(null);

    try {
      if (action === "share" && typeof navigator.share === "function") {
        await navigator.share({
          title: businessName.trim() || "Mon site professionnel",
          text: "Découvre mon site professionnel.",
          url: publicUrl,
        });
        // Some platforms resolve when the share sheet opens, so do not claim delivery.
        setFeedback({ url: publicUrl, tone: "success", message: "Options de partage ouvertes." });
      } else {
        await copyAddress(action === "share");
      }
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
        return;
      }
      addressRef.current?.focus();
      addressRef.current?.select();
      setFeedback({
        url: publicUrl,
        tone: "error",
        message: action === "share" && typeof navigator.share === "function"
          ? "Le partage n’a pas pu s’ouvrir. Utilise « Copier le lien » ou copie l’adresse ci-dessus."
          : "La copie automatique n’est pas disponible. Copie l’adresse sélectionnée ci-dessus.",
      });
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }

  if (!publicSlug.trim()) return null;

  return (
    <section aria-label="Site publié" className="mt-5 rounded-2xl border border-emerald-500/30 bg-slate-950 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300">✓</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-white">Ton site est en ligne</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">Partage cette adresse avec tes clients.</p>
        </div>
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-400">
        Adresse publique
        <input
          ref={addressRef}
          type="text"
          readOnly
          value={publicUrl || publicPath}
          onFocus={(event) => event.currentTarget.select()}
          spellCheck={false}
          className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-blue-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        />
      </label>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <a
          href={publicUrl || publicPath}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvrir le site public dans un nouvel onglet"
          className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >Ouvrir le site <span aria-hidden="true" className="ml-1">↗</span></a>
        <button
          type="button"
          onClick={() => void handleAction("copy")}
          disabled={!publicUrl || pending !== null}
          className="min-h-11 rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50"
        >{pending === "copy" ? "Copie…" : "Copier le lien"}</button>
        <button
          type="button"
          onClick={() => void handleAction("share")}
          disabled={!publicUrl || pending !== null}
          className="min-h-11 rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50"
        >{pending === "share" ? "Partage…" : "Partager"}</button>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className={`mt-3 min-h-5 text-xs leading-5 ${feedback?.tone === "error" ? "text-amber-300" : "text-emerald-300"}`}>
        {feedback?.url === publicUrl ? feedback.message : ""}
      </p>
    </section>
  );
}
