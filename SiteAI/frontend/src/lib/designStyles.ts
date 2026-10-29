export type DesignStyle = "moderne" | "elegant" | "artisan" | "minimaliste" | "nature" | "premium" | "dynamique" | "tradition" | "creatif";

export type StyleSettings = {
  font: "system" | "modern" | "classic" | "editorial" | "mono";
  buttonStyle: "square" | "soft" | "pill";
  cardStyle: "simple" | "bordered" | "shadow";
  logoSize: "small" | "medium" | "large";
  heroLayout: "auto" | "left" | "center" | "split" | "immersive";
  contentWidth: "normal" | "wide";
  spacing: "compact" | "normal" | "airy";
  background: "auto" | "light" | "dark";
};

const defaults: StyleSettings = {font:"system", buttonStyle:"soft", cardStyle:"bordered", logoSize:"medium", heroLayout:"auto", contentWidth:"normal", spacing:"normal", background:"auto"};

type StyleDefinition = {
  id: DesignStyle;
  label: string;
  description: string;
  family: "moderne" | "elegant" | "artisan";
  accent: string;
  surface: string;
  ink: string;
  settings: StyleSettings;
};

export const designStyles: readonly StyleDefinition[] = [
  {id:"moderne", label:"Moderne", description:"Clair et structuré", family:"moderne", accent:"#2563eb", surface:"#f8fafc", ink:"#0f172a", settings:{...defaults}},
  {id:"elegant", label:"Élégant", description:"Éditorial et raffiné", family:"elegant", accent:"#a16207", surface:"#fafaf9", ink:"#171717", settings:{...defaults}},
  {id:"artisan", label:"Artisan", description:"Chaleureux et concret", family:"artisan", accent:"#b45309", surface:"#fafaf9", ink:"#292524", settings:{...defaults}},
  {id:"minimaliste", label:"Minimaliste", description:"Épuré, spacieux, centré", family:"moderne", accent:"#334155", surface:"#ffffff", ink:"#0f172a", settings:{...defaults, buttonStyle:"square", cardStyle:"simple", heroLayout:"center", spacing:"airy"}},
  {id:"nature", label:"Nature", description:"Vert doux et formes arrondies", family:"artisan", accent:"#3f6212", surface:"#f4f5eb", ink:"#26331d", settings:{...defaults, font:"classic", buttonStyle:"pill", cardStyle:"simple", spacing:"airy"}},
  {id:"premium", label:"Premium", description:"Sombre, ample et sophistiqué", family:"elegant", accent:"#a16207", surface:"#171717", ink:"#fafaf9", settings:{...defaults, font:"classic", buttonStyle:"square", cardStyle:"simple", heroLayout:"center", spacing:"airy"}},
  {id:"dynamique", label:"Dynamique", description:"Vif, dense et affirmé", family:"moderne", accent:"#c2410c", surface:"#fff7ed", ink:"#431407", settings:{...defaults, font:"modern", buttonStyle:"pill", cardStyle:"shadow", heroLayout:"left", contentWidth:"wide", spacing:"compact"}},
  {id:"tradition", label:"Tradition", description:"Crème, sérif et authenticité", family:"artisan", accent:"#92400e", surface:"#fff8ed", ink:"#422d1c", settings:{...defaults, font:"editorial", buttonStyle:"square", cardStyle:"bordered", heroLayout:"left"}},
  {id:"creatif", label:"Créatif", description:"Violet, contrastes et relief", family:"moderne", accent:"#7c3aed", surface:"#f5f3ff", ink:"#2e1065", settings:{...defaults, font:"modern", buttonStyle:"soft", cardStyle:"shadow", heroLayout:"center", contentWidth:"wide", spacing:"airy"}},
];

export function getDesignStyle(value: unknown): StyleDefinition {
  return designStyles.find(style => style.id === value) ?? designStyles[0];
}

export function normalizeDesignStyle(value: unknown): DesignStyle {
  return getDesignStyle(value).id;
}
