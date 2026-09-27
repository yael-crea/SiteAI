"use client";
import { useRef, useState } from "react";

export type AccountVersion = {id: number; revision: number; reason: string; createdAt: string; published: boolean};

export default function AccountVersions({siteId, disabled, load, restore}: {
 siteId: number | null; disabled: boolean;
 load: () => Promise<AccountVersion[]>;
 restore: (id: number) => Promise<void>;
}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [items,setItems]=useState<AccountVersion[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<AccountVersion|null>(null);
 async function open() {
  setError("");setItems([]);setSelected(null);dialog.current?.showModal();setBusy(true);
  try {setItems(await load())}catch(e){setError(e instanceof Error?e.message:"Versions indisponibles. Ferme puis réessaie.")}
  finally{setBusy(false)}
 }
 return <>
  <button type="button" disabled={disabled||siteId===null} onClick={open} title={siteId===null?"Enregistre d’abord ton site dans ton compte":undefined} className="rounded-lg border border-blue-700 px-3 py-2 text-xs font-semibold text-blue-200 disabled:opacity-40">Versions du compte</button>
  <dialog ref={dialog} onCancel={event=>{if(busy||disabled)event.preventDefault()}} aria-labelledby="account-versions-title" className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white backdrop:bg-black/70">
   <div className="flex items-center justify-between gap-4"><h2 id="account-versions-title" className="text-xl font-bold">Versions du compte</h2><button type="button" disabled={busy||disabled} onClick={()=>dialog.current?.close()} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Fermer</button></div>
   <p className="mt-3 text-sm leading-6 text-slate-400">Les 20 derniers enregistrements sont disponibles sur tes appareils. La version actuellement publique est conservée également. Restaurer crée un nouveau brouillon ; le site public reste inchangé.</p>
   {busy&&<p role="status" className="mt-4 text-sm">Chargement…</p>}
   {error&&<p role="alert" className="mt-4 rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
   {selected&&<div className="mt-4 rounded-xl border border-blue-700 p-4"><p className="text-sm">Restaurer la version du {new Date(selected.createdAt).toLocaleString("fr-FR")} ? Le contenu actuel sera d’abord enregistré pour pouvoir le retrouver.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy||disabled} onClick={async()=>{setBusy(true);setError("");try{await restore(selected.id);dialog.current?.close()}catch(e){setError(e instanceof Error?e.message:"Restauration impossible.")}finally{setBusy(false)}}} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold disabled:opacity-40">Restaurer dans le brouillon</button><button type="button" disabled={busy||disabled} onClick={()=>setSelected(null)} className="px-3 py-2 text-sm">Annuler</button></div></div>}
   {!busy&&!items.length&&!error&&<p className="mt-4 text-sm text-slate-400">Aucune version disponible.</p>}
   <ul className="mt-5 space-y-3">{items.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div><p className="text-sm font-bold">{item.reason} · {item.revision}</p><time dateTime={item.createdAt} className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("fr-FR")}</time>{item.published&&<p className="mt-1 text-xs text-emerald-300">Version publique actuelle</p>}</div><button type="button" disabled={busy||disabled} onClick={()=>setSelected(item)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">Choisir</button></li>)}</ul>
  </dialog>
 </>;
}
