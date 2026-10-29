"use client";

import { useId } from "react";
import { normalizeDesignExtras, type AppearanceSettings } from "@/lib/appearanceSettings";

type Control = { key: keyof AppearanceSettings; label: string; choices: readonly (readonly [string, string])[]; hint?: string };
const auto = ["auto", "Selon le style"] as const;
const groups: {title: string; description: string; controls: Control[]}[] = [
  {title: "Textes", description: "Ajuste la lisibilité et le caractère des titres.", controls: [
    {key:"font",label:"Police",choices:[["system","Système"],["modern","Moderne"],["classic","Classique"],["editorial","Éditoriale"],["mono","Monospace"]]},
    {key:"titleScale",label:"Taille des titres",choices:[auto,["small","Discrète"],["large","Grande"]]},
    {key:"textScale",label:"Taille des paragraphes",choices:[auto,["comfortable","Confortable"],["large","Grande"]]},
    {key:"titleWeight",label:"Épaisseur des titres",choices:[auto,["regular","Légère"],["bold","Grasse"]]},
    {key:"titleCase",label:"Casse des titres",choices:[auto,["normal","Respecter mon texte"],["uppercase","Majuscules"]]},
    {key:"lineHeight",label:"Espace entre les lignes",choices:[auto,["normal","Normal"],["relaxed","Aéré"]]},
  ]},
  {title: "Mise en page et boutons", description: "Organise l’espace et donne de la visibilité aux actions.", controls: [
    {key:"contentWidth",label:"Largeur",choices:[["normal","Normale"],["wide","Large"]]},
    {key:"heroLayout",label:"Mise en page de l’accueil",choices:[auto,["left","À gauche"],["center","Centré"],["split","Photo à côté"],["immersive","Photo en fond"]]},
    {key:"spacing",label:"Espace entre les sections",choices:[["compact","Compact"],["normal","Normal"],["airy","Aéré"]]},
    {key:"background",label:"Fond général",choices:[auto,["light","Clair"],["dark","Sombre"]]},
    {key:"logoSize",label:"Taille du logo",choices:[["small","Petit"],["medium","Moyen"],["large","Grand"]]},
    {key:"buttonStyle",label:"Forme des boutons",choices:[["square","Carrés"],["soft","Arrondis"],["pill","Pilule"]]},
    {key:"buttonSize",label:"Taille des boutons principaux",choices:[auto,["compact","Compacte"],["large","Grande"]]},
  ]},
  {title: "Cartes et relief", description: "Personnalise les cartes de services et les autres cartes du site.", controls: [
    {key:"cardStyle",label:"Style des cartes",choices:[["simple","Simple"],["bordered","Bordure"],["shadow","Ombre"]]},
    {key:"cardRadius",label:"Arrondis des cartes",choices:[auto,["square","Aucun"],["soft","Doux"],["round","Prononcés"]]},
    {key:"shadowStrength",label:"Intensité des ombres",choices:[auto,["none","Aucune"],["soft","Légère"],["strong","Prononcée"]],hint:"Ce réglage prend le dessus sur l’ombre du style de carte."},
  ]},
  {title: "Photos", description: "Ces réglages concernent les photos de services et de réalisations, sans modifier le logo ni la grande image d’accueil.", controls: [
    {key:"imageRadius",label:"Arrondis des photos",choices:[auto,["square","Aucun"],["soft","Doux"],["round","Prononcés"]]},
    {key:"imageRatio",label:"Format des photos",choices:[auto,["landscape","Paysage · 16:9"],["square","Carré · 1:1"],["portrait","Portrait · 4:5"]]},
    {key:"imageFit",label:"Affichage des photos",choices:[auto,["cover","Remplir et recadrer"],["contain","Afficher l’image entière"]],hint:"Afficher l’image entière peut laisser des marges autour de la photo."},
  ]},
];

const presets: {label: string; values: Partial<AppearanceSettings>}[] = [
  {label:"Sobre",values:{titleScale:"small",titleWeight:"regular",titleCase:"normal",textScale:"comfortable",lineHeight:"normal",cardRadius:"soft",shadowStrength:"none",buttonStyle:"soft",buttonSize:"auto",imageRadius:"soft",imageRatio:"landscape",imageFit:"cover"}},
  {label:"Impact",values:{titleScale:"large",titleWeight:"bold",titleCase:"uppercase",textScale:"comfortable",lineHeight:"normal",cardRadius:"soft",shadowStrength:"strong",buttonStyle:"square",buttonSize:"large",imageRadius:"square",imageRatio:"landscape",imageFit:"cover"}},
  {label:"Doux",values:{titleScale:"auto",titleWeight:"regular",titleCase:"normal",textScale:"comfortable",lineHeight:"relaxed",cardRadius:"round",shadowStrength:"soft",buttonStyle:"pill",buttonSize:"large",imageRadius:"round",imageRatio:"square",imageFit:"cover"}},
];

export default function AppearanceOptions({value, onChange, onReset}: {value: AppearanceSettings; onChange: (value: AppearanceSettings) => void; onReset: () => void}) {
  const id=useId();
  const settings={...value,...normalizeDesignExtras(value)};
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Personnaliser le design</h3><p className="mt-1 text-xs leading-5 text-slate-400">Le résultat apparaît dans l’aperçu. Tes textes restent inchangés.</p></div><button type="button" onClick={onReset} className="rounded-lg border border-slate-600 px-3 py-2 text-xs hover:border-blue-400">Revenir au style choisi</button></div>
    <div><p className="mb-2 text-xs font-semibold text-slate-300">Combinaisons rapides</p><div className="grid grid-cols-3 gap-2">{presets.map(preset=><button key={preset.label} type="button" onClick={()=>onChange({...settings,...preset.values})} className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-2 py-3 text-xs font-bold hover:border-blue-400">{preset.label}</button>)}</div></div>
    {groups.map((group,index)=><details key={group.title} open={index===0} className="rounded-xl border border-slate-700 bg-slate-950/30 p-3">
      <summary className="cursor-pointer text-sm font-bold">{group.title}</summary>
      <p className="mt-2 text-xs leading-5 text-slate-400">{group.description}</p>
      <div className="mt-4 space-y-4">{group.controls.map(control=><div key={control.key}>
        <label htmlFor={`${id}-${control.key}`} className="mb-2 block text-sm text-slate-300">{control.label}</label>
        <select id={`${id}-${control.key}`} value={settings[control.key]} onChange={event=>onChange({...settings,[control.key]:event.target.value} as AppearanceSettings)} className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-400">
          {control.choices.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select>
        {control.hint && <p className="mt-2 text-xs leading-5 text-slate-400">{control.hint}</p>}
      </div>)}</div>
    </details>)}
    <p className="text-xs leading-5 text-slate-400">Vérifie aussi l’aperçu téléphone avant d’enregistrer.</p>
  </div>;
}
