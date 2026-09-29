"use client";
type Props = {
  hasUnsavedChanges: boolean;
  saving: boolean;
  publishing: boolean;
  busy: boolean;
  published: boolean;
  pendingPublication: boolean;
  error: boolean;
  localStatus: string;
  onSave: () => Promise<unknown>;
};
export default function SaveStatus({
  hasUnsavedChanges,
  saving,
  publishing,
  busy,
  published,
  pendingPublication,
  error,
  localStatus,
  onSave,
}: Props) {
  const label = publishing
    ? "Publication en cours…"
    : saving
      ? "Enregistrement dans ton compte…"
      : error
        ? "Enregistrement à vérifier"
        : hasUnsavedChanges
          ? "Modifications à enregistrer"
          : "Enregistré dans ton compte";
  return (
    <section
      aria-label="État de sauvegarde"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-4 py-4 sm:px-5"
    >
      <div role="status" aria-live="polite">
        <p
          className={
            "text-sm font-bold " +
            (error || hasUnsavedChanges ? "text-amber-300" : "text-emerald-300")
          }
        >
          {label}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          {published
            ? pendingPublication || hasUnsavedChanges
              ? "En ligne · la version publique attend tes nouvelles modifications."
              : "En ligne · la dernière version enregistrée est publiée."
            : "Site privé · publie-le quand tu es prêt."}
        </p>
        {hasUnsavedChanges && (
          <p className="mt-1 text-xs text-slate-400">
            {localStatus === "saved"
              ? "Copie de secours sur cet appareil. Enregistre dans ton compte pour la retrouver ailleurs."
              : localStatus === "error"
                ? "La copie de secours locale est indisponible. Enregistre dans ton compte avant de quitter."
                : "La copie locale ne remplace pas l’enregistrement dans ton compte."}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={busy || (!hasUnsavedChanges && !error)}
        onClick={() => {
          void onSave();
        }}
        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer dans mon compte"}
      </button>
    </section>
  );
}
