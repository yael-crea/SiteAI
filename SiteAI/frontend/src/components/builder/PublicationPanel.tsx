"use client";
import Link from "next/link";
import PublicationSuccess from "@/components/PublicationSuccess";
import type { SavedSite } from "@/lib/builderTypes";
import type { getSiteHealth } from "@/lib/siteGrowth";

type Props = {
  openedSite: SavedSite | null;
  publishedResult: { publicSlug: string; businessName: string } | null;
  businessName: string;
  siteHealth: ReturnType<typeof getSiteHealth> | null;
  completeCheck: (id: string) => void;
  navigateMobileStep: (step: number) => void;
  setDesktopPanel: (panel: "apercu") => void;
  saveCurrentSite: () => Promise<SavedSite | null>;
  publishCurrentSite: () => Promise<void>;
  unpublishCurrentSite: () => Promise<void>;
  saving: boolean;
  publishing: boolean;
  editLoading: boolean;
  loading: boolean;
  saveMessage: string;
  saveError: string;
};

export default function PublicationPanel({
  openedSite,
  publishedResult,
  businessName,
  siteHealth,
  completeCheck,
  navigateMobileStep,
  setDesktopPanel,
  saveCurrentSite,
  publishCurrentSite,
  unpublishCurrentSite,
  saving,
  publishing,
  editLoading,
  loading,
  saveMessage,
  saveError,
}: Props) {
  return (
    <div
      data-mobile-panel="publication"
      className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
    >
      <h2 className="text-xl font-bold">Sauvegarde et publication</h2>
      {(publishedResult || openedSite?.published) && (
        <PublicationSuccess
          key={publishedResult?.publicSlug ?? openedSite?.publicSlug}
          publicSlug={
            publishedResult?.publicSlug ?? openedSite?.publicSlug ?? ""
          }
          businessName={
            publishedResult?.businessName ??
            openedSite?.businessName ??
            businessName
          }
        />
      )}

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {openedSite?.published
          ? "Ton site reste en ligne avec sa version publiée. Enregistrer conserve un brouillon dans ton compte ; seul Publier les modifications change le site public."
          : "Ton aperçu reste privé. Publier mon site enregistre tes modifications et le met en ligne en une seule action."}
      </p>
      <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Vérification avant publication</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Vérification locale du contenu, sans demande IA. Ces conseils ne
              bloquent pas la publication.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-2 text-sm font-black ${(siteHealth?.score ?? 0) >= 75 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
          >
            {siteHealth?.score ?? 0}/100
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
            style={{ width: `${siteHealth?.score ?? 0}%` }}
          />
        </div>
        <p role="status" className="mt-3 text-sm text-slate-300">
          {siteHealth?.pending
            ? `${siteHealth.pending} point${siteHealth.pending > 1 ? "s" : ""} à vérifier, dont ${siteHealth.priorities} prioritaire${siteHealth.priorities > 1 ? "s" : ""}.`
            : "Les points contrôlés sont renseignés. Vérifie aussi le rendu dans l’aperçu."}
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {(siteHealth?.checks ?? []).map((item) => (
            <li
              key={item.label}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <span
                  aria-hidden="true"
                  className={item.ready ? "text-emerald-400" : "text-amber-300"}
                >
                  {item.ready ? "✓ " : "○ "}
                </span>
                {item.label}
                <span className="sr-only">
                  {item.ready ? " : renseigné" : " : à compléter"}
                </span>
                {!item.ready && (
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {item.priority && (
                      <strong className="text-amber-300">
                        À vérifier en priorité.{" "}
                      </strong>
                    )}
                    {item.advice}
                  </p>
                )}
              </div>
              {!item.ready && (
                <button
                  type="button"
                  onClick={() => completeCheck(item.id)}
                  className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-blue-300 hover:bg-slate-800"
                >
                  {item.id === "contact" ? "Réactiver" : "Corriger"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            navigateMobileStep(3);
            setDesktopPanel("apercu");
          }}
          className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold hover:border-blue-500"
        >
          Vérifier l’aperçu
        </button>
      </div>

      <button
        type="button"
        onClick={saveCurrentSite}
        disabled={saving || publishing}
        className="mt-5 w-full rounded-xl border border-slate-700 px-6 py-4 font-bold hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Sauvegarde..." : "Enregistrer dans mon compte"}
      </button>

      {
        <button
          type="button"
          onClick={publishCurrentSite}
          disabled={publishing || saving || editLoading || loading}
          className="mt-3 w-full rounded-xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-500 disabled:opacity-50"
        >
          {publishing
            ? "Enregistrement et publication..."
            : openedSite?.published
              ? "Publier les modifications"
              : "Publier mon site"}
        </button>
      }

      {openedSite?.published && (
        <div className="mt-5 rounded-xl border border-slate-700 p-4 text-sm">
          <h3 className="font-bold">Dernière vérification après publication</h3>
          <p className="mt-2 leading-6 text-slate-400">
            Envoie une demande depuis le formulaire public, puis vérifie sa
            présence dans Prospects et la réception de l’email. L’aperçu
            n’envoie aucun message.
          </p>
          {openedSite.publicSlug && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`/site/${encodeURIComponent(openedSite.publicSlug)}#contact`}
              className="mt-3 block font-semibold text-blue-300 underline"
            >
              Ouvrir le formulaire public ↗
            </a>
          )}
          <a href="/dashboard" className="mt-3 block text-blue-300 underline">
            Ouvrir mon tableau de bord et mes prospects
          </a>
          <p className="mt-3 text-xs text-slate-400">
            Domaine personnel facultatif : connecte-le depuis la fiche du site
            dans ton tableau de bord.
          </p>
        </div>
      )}

      {openedSite?.published && (
        <>
          <button
            type="button"
            onClick={unpublishCurrentSite}
            disabled={publishing}
            className="mt-3 w-full rounded-xl border border-red-800 px-6 py-4 font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
          >
            Retirer de la publication
          </button>
        </>
      )}

      {saveMessage && (
        <p className="mt-4 text-sm text-green-400">{saveMessage}</p>
      )}

      {saveError && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4">
          <p className="text-sm leading-6 text-red-300">{saveError}</p>

          {["abonnement", "formule", "limite", "pro", "agence"].some((word) =>
            saveError.toLowerCase().includes(word),
          ) && (
            <Link
              href="/pricing"
              className="mt-3 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500"
            >
              💳 Voir les formules
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
