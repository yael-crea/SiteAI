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
  const detail = published
    ? pendingPublication || hasUnsavedChanges
      ? "En ligne · des changements attendent d’être publiés."
      : "En ligne · la dernière version est publiée."
    : "Site privé · publie-le quand tu es prêt.";
  const backup = hasUnsavedChanges
    ? localStatus === "saved"
      ? " Une copie de secours est conservée sur cet appareil."
      : localStatus === "error"
        ? " La copie locale est indisponible."
        : " Sauvegarde locale en cours…"
    : "";
  // Version compacte : tient dans la barre du haut de l'éditeur, le détail passe en infobulle.
  return (
    <section
      aria-label="État de sauvegarde"
      className="flex min-w-0 items-center gap-2"
    >
      <div
        className="flex min-w-0 items-center gap-1.5"
        role="status"
        aria-live="polite"
        title={detail + backup}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${
            saving || publishing
              ? "bg-violet-400 motion-safe:animate-pulse"
              : error || hasUnsavedChanges
                ? "bg-amber-400"
                : "bg-emerald-400"
          }`}
        />
        <p className="truncate text-xs text-slate-400">
          {label}
          <span className="hidden lg:inline">
            {" · "}
            {published ? "En ligne" : "Privé"}
          </span>
          <span className="sr-only">. {detail + backup}</span>
        </p>
      </div>
      {(hasUnsavedChanges || error || saving) && (
        <button
          type="button"
          disabled={busy || (!hasUnsavedChanges && !error)}
          onClick={() => {
            void onSave();
          }}
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-blue-300 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      )}
    </section>
  );
}
