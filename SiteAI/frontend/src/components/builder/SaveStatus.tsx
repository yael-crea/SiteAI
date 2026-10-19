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
          ? "Modifications non enregistrées"
          : "Enregistré";
  return (
    <section
      aria-label="État de sauvegarde"
      className="flex min-w-0 flex-1 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/75 px-4 py-2.5 md:border-b-0 md:border-r"
    >
      <div className="flex min-w-0 items-center gap-3" role="status" aria-live="polite">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            error || hasUnsavedChanges
              ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
              : "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-100 sm:text-sm">
            {label}
          </p>
          <p className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">
            {published
              ? pendingPublication || hasUnsavedChanges
                ? "En ligne · des changements attendent d’être publiés."
                : "En ligne · la dernière version est publiée."
              : "Site privé · publie-le quand tu es prêt."}
          </p>
          {hasUnsavedChanges && (
            <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 xl:block">
            {localStatus === "saved"
              ? "Une copie de secours est conservée sur cet appareil."
              : localStatus === "error"
                ? "La copie locale est indisponible."
                : "Sauvegarde locale en cours…"}
            </p>
          )}
        </div>
      </div>
      {(hasUnsavedChanges || error || saving) && (
        <button
          type="button"
          disabled={busy || (!hasUnsavedChanges && !error)}
          onClick={() => {
            void onSave();
          }}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      )}
    </section>
  );
}


