import type { StyleSettings } from "@/lib/designStyles";

export const extraChoices = {
  titleScale: ["auto", "small", "large"],
  textScale: ["auto", "comfortable", "large"],
  titleWeight: ["auto", "regular", "bold"],
  titleCase: ["auto", "normal", "uppercase"],
  lineHeight: ["auto", "normal", "relaxed"],
  cardRadius: ["auto", "square", "soft", "round"],
  shadowStrength: ["auto", "none", "soft", "strong"],
  imageRadius: ["auto", "square", "soft", "round"],
  imageRatio: ["auto", "landscape", "square", "portrait"],
  imageFit: ["auto", "cover", "contain"],
  buttonSize: ["auto", "compact", "large"],
  // « auto » = aucune animation, fond fixe : les sites créés avant ce réglage ne changent pas.
  motion: ["auto", "subtle", "dynamic"],
  heroBackground: ["auto", "zoom", "gradient", "aurora"],
} as const;

export type DesignExtras = { [K in keyof typeof extraChoices]?: (typeof extraChoices)[K][number] };
export type AppearanceSettings = StyleSettings & DesignExtras;

export function normalizeDesignExtras(value?: DesignExtras | null): Required<DesignExtras> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(extraChoices) as (keyof DesignExtras)[]) {
    const candidate = value?.[key];
    result[key] = typeof candidate === "string" && (extraChoices[key] as readonly string[]).includes(candidate) ? candidate : "auto";
  }
  return result as Required<DesignExtras>;
}
