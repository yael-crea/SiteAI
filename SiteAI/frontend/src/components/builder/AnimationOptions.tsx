"use client";

import { normalizeDesignExtras } from "@/lib/appearanceSettings";
import type { DesignSettings } from "@/lib/builderTypes";

/*
 * Réglage des animations du site, toujours visible dans « Apparence »
 * (et non dans les options avancées) : intensité et fond du haut du site.
 */

const motions = [
  ["auto", "Aucune"],
  ["subtle", "Discrètes"],
  ["dynamic", "Dynamiques"],
] as const;

const backgrounds = [
  ["auto", "Fixe"],
  ["zoom", "Zoom sur la photo"],
  ["gradient", "Dégradé"],
  ["aurora", "Lumières"],
] as const;

type Props = {
  value: DesignSettings;
  onChange: (value: DesignSettings) => void;
  disabled?: boolean;
};

function Choices<T extends string>({
  label,
  options,
  current,
  onSelect,
  disabled,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  current: string;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={current === key}
            disabled={disabled}
            onClick={() => onSelect(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              current === key
                ? "border-violet-400 bg-violet-500/20 text-violet-100"
                : "border-slate-700 text-slate-300 hover:border-violet-400"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnimationOptions({ value, onChange, disabled }: Props) {
  const { motion, heroBackground } = normalizeDesignExtras(value);

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/30 p-4">
      <div>
        <p className="font-bold">Animations</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Le résultat apparaît dans l’aperçu. Les visiteurs qui ont demandé moins d’animations sur leur
          appareil voient un site fixe.
        </p>
      </div>
      <Choices
        label="Au défilement"
        options={motions}
        current={motion}
        disabled={disabled}
        onSelect={(key) => onChange({ ...value, motion: key })}
      />
      <Choices
        label="Fond du haut du site"
        options={backgrounds}
        current={heroBackground}
        disabled={disabled}
        onSelect={(key) => onChange({ ...value, heroBackground: key })}
      />
    </div>
  );
}
