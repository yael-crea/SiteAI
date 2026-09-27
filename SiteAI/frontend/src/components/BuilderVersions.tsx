"use client";

import { useEffect, useRef, useState } from "react";
import { addVersion, readVersions, type BuilderVersion } from "@/lib/builderVersions";

export function useBuilderVersions<T>(storageKey: string | null, validate: (value: unknown) => value is T) {
  const [state, setState] = useState<{ key: string | null; entries: BuilderVersion<T>[] }>({key: null, entries: []});
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    try { setState({key: storageKey, entries: storageKey ? readVersions(localStorage.getItem(storageKey), validate) : []}); }
    catch { setState({key: storageKey, entries: []}); setError("Les versions locales sont indisponibles sur cet appareil."); }
  }, [storageKey, validate]);

  function checkpoint(value: T, label: string, key = storageKey) {
    if (!key) return false;
    try {
      const previous = readVersions(localStorage.getItem(key), validate);
      const savedAt = new Date().toISOString();
      const next = addVersion(previous, {id: crypto.randomUUID(), savedAt, label, value});
      localStorage.setItem(key, JSON.stringify(next));
      if (key === storageKey) setState({key, entries: next});
      setError("");
      return true;
    } catch {
      setError("Cette version n’a pas pu être conservée sur cet appareil. Vérifie l’espace de stockage de ton navigateur.");
      return false;
    }
  }
  return { entries: state.key === storageKey ? state.entries : [], error, checkpoint };
}

export default function BuilderVersions<T>({ entries, error, disabled, onSave, onRestore }: {
  entries: BuilderVersion<T>[]; error: string; disabled: boolean;
  onSave: () => boolean; onRestore: (value: T) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  return <>
    <button type="button" disabled={disabled} onClick={() => {setMessage(""); dialog.current?.showModal();}}
      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-30">Versions appareil</button>
    <dialog ref={dialog} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white backdrop:bg-black/70" aria-labelledby="versions-title">
      <div className="flex items-center justify-between gap-4"><h2 id="versions-title" className="text-xl font-bold">Versions sur cet appareil</h2><button type="button" onClick={() => dialog.current?.close()} className="rounded-lg border border-slate-700 px-3 py-2">Fermer</button></div>
      <p className="mt-3 text-sm leading-6 text-slate-400">Les 8 dernières versions sont conservées dans ce navigateur. Restaurer modifie uniquement l’éditeur : enregistre le brouillon dans ton compte, puis publie quand tu es prêt.</p>
      <button type="button" disabled={disabled} onClick={() => setMessage(onSave() ? "Version actuelle conservée." : "La version n’a pas été conservée.")} className="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold disabled:opacity-30">Conserver cette version</button>
      <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>
      {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
      {!entries.length && <p className="mt-5 text-sm text-slate-400">Aucune version conservée pour ce site.</p>}
      <ul className="mt-4 space-y-3">{entries.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4">
        <div><p className="text-sm font-bold">{entry.label}</p><time dateTime={entry.savedAt} className="text-xs text-slate-400">{new Date(entry.savedAt).toLocaleString("fr-FR")}</time></div>
        <button type="button" disabled={disabled} onClick={() => {if (onRestore(entry.value)) dialog.current?.close();}} className="rounded-lg border border-blue-700 px-3 py-2 text-sm text-blue-200 disabled:opacity-30">Restaurer</button>
      </li>)}</ul>
    </dialog>
  </>;
}
