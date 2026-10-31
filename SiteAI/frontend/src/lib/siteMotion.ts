import type { DesignExtras } from "@/lib/appearanceSettings";

/*
 * Animations proposées à la création d'un site, selon le métier : sobres pour
 * les professions de conseil et de droit, plus vivantes pour le sport, la
 * fête et le digital, zoom lent sur la photo pour les métiers qui se vendent
 * en images. Le client peut tout changer dans l'éditeur (« Animations »).
 */

type MotionChoice = Required<Pick<DesignExtras, "motion" | "heroBackground">>;

type MotionFamily = { keywords: string[]; motion: MotionChoice["motion"]; background: MotionChoice["heroBackground"] };

// Testées dans l'ordre ; un mot-clé simple doit commencer un mot.
const families: MotionFamily[] = [
  { keywords: ["avocat", "juridique", "notaire", "comptab", "fiscal", "assuran", "medec", "sante", "infirm"], motion: "subtle", background: "auto" },
  { keywords: ["coach sportif", "sport", "fitness", "muscu", "dj", "sono", "animat", "evenement", "mariage", "tatou", "barb"], motion: "dynamic", background: "aurora" },
  { keywords: ["web", "developpe", "digital", "marketing", "communication", "graphis", "photo", "video"], motion: "dynamic", background: "gradient" },
  { keywords: ["restaura", "pizz", "boulang", "patiss", "traiteur", "cafe", "coiff", "beaute", "esthetic", "ongl", "fleur", "paysag", "jardin", "piscin", "hotel", "gite", "yoga", "massage"], motion: "subtle", background: "zoom" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function tradeMotion(activity: string, hasHeroImage: boolean): MotionChoice {
  const text = normalize(activity);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  const matches = (keyword: string) =>
    /[ -]/.test(keyword) ? text.includes(keyword) : words.some((word) => word.startsWith(keyword));
  const family = families.find((item) => item.keywords.some(matches));

  if (!family) return { motion: "subtle", heroBackground: hasHeroImage ? "zoom" : "gradient" };
  // Le zoom n'a de sens qu'avec une photo d'accueil.
  if (family.background === "zoom" && !hasHeroImage) return { motion: family.motion, heroBackground: "gradient" };
  return { motion: family.motion, heroBackground: family.background };
}
