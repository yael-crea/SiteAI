"use client";

import { useState } from "react";
import { designStyles, type DesignStyle } from "@/lib/designStyles";

export default function StylePicker({value, onChange, disabled = false, compact = false}: {
  value: DesignStyle;
  onChange: (value: DesignStyle) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const shortList = designStyles.slice(0, 3);
  const selected = designStyles.find(style => style.id === value);
  if (selected && !shortList.some(style => style.id === value)) shortList[2] = selected;
  const visibleStyles = compact && !showAll ? shortList : designStyles;
  return <div>
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Style du site">
      {visibleStyles.map(style => <button key={style.id} type="button" disabled={disabled}
        aria-pressed={value === style.id} onClick={() => onChange(style.id)}
        className={`min-w-0 overflow-hidden rounded-xl border p-2 text-left transition disabled:opacity-50 ${value === style.id ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400" : "border-slate-700 hover:border-slate-400"}`}>
        <span aria-hidden="true" className="relative mb-2 flex h-20 flex-col overflow-hidden rounded-lg p-2"
          style={{background:style.surface, color:style.ink, fontFamily:style.settings.font === "classic" || style.settings.font === "editorial" ? "Georgia, serif" : "sans-serif"}}>
          <span className="flex items-center justify-between"><span style={{background:style.accent}} className="h-2 w-2 rounded-full"/><span className="h-1 w-6 rounded bg-current opacity-20"/></span>
          <span className={`mt-2 text-[10px] font-bold ${style.settings.heroLayout === "center" ? "text-center" : ""}`}>Votre entreprise</span>
          <span className="mt-1 h-1 w-3/4 rounded bg-current opacity-20"/>
          <span className="mt-2 h-2 w-8" style={{background:style.accent, borderRadius:style.settings.buttonStyle === "pill" ? 20 : style.settings.buttonStyle === "square" ? 0 : 3}}/>
          <span className="mt-auto grid grid-cols-3 gap-1">{[0,1,2].map(i=><span key={i} className="h-2 border border-current opacity-25" style={{borderRadius:style.settings.cardStyle === "simple" ? 0 : 3}}/>)}</span>
        </span>
        <span className="block text-sm font-semibold">{style.label}{value === style.id ? " ✓" : ""}</span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{style.description}</span>
      </button>)}
    </div>
    {compact && <button type="button" onClick={() => setShowAll(value => !value)} className="mt-3 rounded-lg border border-slate-600 px-3 py-2 text-sm">{showAll ? "Réduire les styles" : "Voir les 9 styles"}</button>}
    <p className="mt-3 text-xs leading-5 text-slate-400">Choisir un style applique sa couleur et ses réglages visuels. Tes textes et tes photos sont conservés ; tu peux ensuite personnaliser chaque réglage.</p>
  </div>;
}
