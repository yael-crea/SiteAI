"use client";

import { useEffect, useRef, type ReactNode } from "react";

type BuilderToolsMenuProps = {
  advancedMode: boolean;
  hasSite: boolean;
  previewEditing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  onToggleAdvanced: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreviewEditing: () => void;
  align?: "left" | "right";
  label?: string;
  children?: ReactNode;
};

export default function BuilderToolsMenu({
  advancedMode,
  hasSite,
  previewEditing,
  canUndo,
  canRedo,
  busy,
  onToggleAdvanced,
  onUndo,
  onRedo,
  onTogglePreviewEditing,
  align = "right",
  label = "Outils",
  children,
}: BuilderToolsMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary")?.focus();
      }
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, []);

  function closeMenu() {
    const details = detailsRef.current;
    if (!details) return;
    details.open = false;
    details.querySelector("summary")?.focus();
  }

  return (
    <details ref={detailsRef} className="group">
      <summary className="cursor-pointer list-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-blue-500">
        {label} <span aria-hidden="true">▾</span>
      </summary>
      <div
        className={`fixed top-28 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-black/50 ${align === "right" ? "right-4" : "left-4"}`}
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Outils d&apos;édition
          </p>
          <button
            type="button"
            onClick={closeMenu}
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-white"
            aria-label="Fermer les outils d’édition"
          >
            × Fermer
          </button>
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            aria-pressed={advancedMode}
            onClick={onToggleAdvanced}
            className="rounded-lg border border-slate-700 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-blue-500"
          >
            {advancedMode ? "✓ Réglages avancés actifs" : "Réglages avancés"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canUndo || busy}
              onClick={onUndo}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-30"
            >
              ↶ Annuler
            </button>
            <button
              type="button"
              disabled={!canRedo || busy}
              onClick={onRedo}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-30"
            >
              ↷ Rétablir
            </button>
          </div>
          {hasSite && (
            <button
              type="button"
              aria-pressed={previewEditing}
              onClick={onTogglePreviewEditing}
              className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${previewEditing ? "border-blue-400 bg-blue-500/10 text-blue-200" : "border-slate-700 text-slate-200"}`}
            >
              {previewEditing ? "✓ Édition directe active" : "Édition directe"}
            </button>
          )}
          {children && (
            <div className="grid gap-2 border-t border-slate-800 pt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

