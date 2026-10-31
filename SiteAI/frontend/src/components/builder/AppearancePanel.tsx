"use client";
import StylePicker from "@/components/StylePicker";
import AppearanceOptions from "@/components/AppearanceOptions";
import AnimationOptions from "@/components/builder/AnimationOptions";
import { smartPalettes } from "@/lib/siteGrowth";
import { getDesignStyle, type DesignStyle } from "@/lib/designStyles";
import type { GeneratedSite, DesignSettings } from "@/lib/builderTypes";

type Props = {
  site: GeneratedSite;
  advancedMode: boolean;
  designStyle: DesignStyle;
  selectDesignStyle: (style: DesignStyle) => void;
  loading: boolean;
  editLoading: boolean;
  saving: boolean;
  publishing: boolean;
  colors: { name: string; value: string }[];
  accentColor: string;
  setAccentColor: (value: string) => void;
  setSaveMessage: (value: string) => void;
  suggestAccentFromLogo: () => void;
  normalizeDesignSettings: (
    value?: Partial<DesignSettings> | null,
  ) => DesignSettings;
  updateSiteField: <K extends keyof GeneratedSite>(
    field: K,
    value: GeneratedSite[K],
  ) => void;
};

export default function AppearancePanel({
  site,
  advancedMode,
  designStyle,
  selectDesignStyle,
  loading,
  editLoading,
  saving,
  publishing,
  colors,
  accentColor,
  setAccentColor,
  setSaveMessage,
  suggestAccentFromLogo,
  normalizeDesignSettings,
  updateSiteField,
}: Props) {
  return (
    <div data-mobile-appearance className="border-t border-slate-800 pt-6">
      <p className="mb-3 font-bold">Apparence</p>

      <StylePicker
        compact={!advancedMode}
        value={designStyle}
        onChange={selectDesignStyle}
        disabled={loading || editLoading || saving || publishing}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.name}
            onClick={() => {
              setAccentColor(color.value);
              setSaveMessage("");
            }}
            style={{
              backgroundColor: color.value,
            }}
            className={`h-9 w-9 rounded-full border-2 ${
              accentColor === color.value
                ? "border-white"
                : "border-transparent"
            }`}
          />
        ))}

        <input
          type="color"
          aria-label="Couleur personnalisée"
          value={accentColor}
          onChange={(event) => {
            setAccentColor(event.target.value);
            setSaveMessage("");
          }}
          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
        />
      </div>
      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Couleurs conseillées</p>
            <p className="mt-1 text-xs text-slate-500">
              Choisis une couleur cohérente ou laisse Lumio lire ton logo.
            </p>
          </div>
          <button
            type="button"
            onClick={suggestAccentFromLogo}
            disabled={!site.logoUrl}
            className="rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-40"
          >
            ✨ Depuis mon logo
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {smartPalettes.map((palette) => (
            <div
              key={palette.name}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-xs text-slate-400">{palette.name}</span>
              <div className="flex gap-2">
                {palette.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={`${palette.name} : ${color}`}
                    onClick={() => {
                      setAccentColor(color);
                      setSaveMessage("");
                    }}
                    style={{ backgroundColor: color }}
                    className={`h-7 w-7 rounded-full border-2 ${accentColor === color ? "border-white" : "border-transparent"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimationOptions
        value={normalizeDesignSettings(site.designSettings)}
        onChange={(value) => updateSiteField("designSettings", value)}
        disabled={loading || editLoading || saving || publishing}
      />

      {advancedMode ? (
        <AppearanceOptions
          value={normalizeDesignSettings(site.designSettings)}
          onChange={(value) => updateSiteField("designSettings", value)}
          onReset={() => {
            // Revenir au style garde les animations choisies.
            const current = normalizeDesignSettings(site.designSettings);
            updateSiteField(
              "designSettings",
              normalizeDesignSettings({
                ...getDesignStyle(designStyle).settings,
                motion: current.motion,
                heroBackground: current.heroBackground,
              }),
            );
          }}
        />
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          Le style règle automatiquement les polices, boutons et espacements.
          Pour les ajuster, ouvre Options avancées.
        </p>
      )}
    </div>
  );
}
