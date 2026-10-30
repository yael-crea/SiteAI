import type { GeneratedSite } from "@/lib/builderTypes";

/*
 * Photos d'illustration par famille de métiers, attribuées aux sites qui
 * viennent d'être générés et n'ont encore aucune image. Photos Unsplash
 * servies en local (voir public/images/metiers/SOURCES.md) ; le client peut
 * les remplacer ou les retirer dans l'éditeur.
 *
 * Les familles sont testées dans l'ordre : les plus précises d'abord.
 * Un mot-clé simple doit commencer un mot (« spa » ne correspond pas à
 * « espace ») ; un mot-clé composé est cherché tel quel.
 */

export type TradeHeroLayout = "split" | "immersive";

type TradePhotoFamily = {
  keywords: string[];
  photos: [string, string];
  /** Haut de site proposé aux nouveaux sites du métier ; absent = mise en page du style. */
  hero?: TradeHeroLayout;
};

const families: TradePhotoFamily[] = [
  { keywords: ["plomb", "sanitaire", "chauffe-eau"], photos: ["/images/demos/plomberie.jpg", "/images/demos/salle-de-bain.jpg"], hero: "split" },
  { keywords: ["chauffag", "climatis", "pompe a chaleur", "frigorist"], photos: ["/images/metiers/chauffage-1.jpg", "/images/metiers/chauffage-2.jpg"], hero: "split" },
  { keywords: ["electric"], photos: ["/images/demos/electricien.jpg", "/images/demos/tableau-electrique.jpg"], hero: "split" },
  { keywords: ["menuis", "ebenist", "charpent"], photos: ["/images/metiers/menuiserie-1.jpg", "/images/metiers/menuiserie-2.jpg"], hero: "split" },
  // Métiers du bâtiment : une paire de photos chacun (ils partageaient auparavant les photos « rénovation »).
  { keywords: ["serrur"], photos: ["/images/metiers/serrurier-1.jpg", "/images/metiers/serrurier-2.jpg"], hero: "split" },
  { keywords: ["couvreur", "zingu", "toitur"], photos: ["/images/metiers/couvreur-1.jpg", "/images/metiers/couvreur-2.jpg"], hero: "split" },
  { keywords: ["carrel", "faience"], photos: ["/images/metiers/carreleur-1.jpg", "/images/metiers/carreleur-2.jpg"], hero: "split" },
  { keywords: ["plaquist", "placo", "platr"], photos: ["/images/metiers/plaquiste-1.jpg", "/images/metiers/plaquiste-2.jpg"], hero: "split" },
  { keywords: ["peintre", "peinture"], photos: ["/images/metiers/peintre-1.jpg", "/images/metiers/peintre-2.jpg"], hero: "split" },
  { keywords: ["macon", "beton", "facade"], photos: ["/images/metiers/macon-1.jpg", "/images/metiers/macon-2.jpg"], hero: "split" },
  { keywords: ["renovation", "batiment"], photos: ["/images/metiers/renovation-1.jpg", "/images/metiers/renovation-2.jpg"], hero: "split" },
  { keywords: ["piscin"], photos: ["/images/metiers/piscine-1.jpg", "/images/metiers/piscine-2.jpg"], hero: "immersive" },
  { keywords: ["paysag", "jardin", "elagage"], photos: ["/images/demos/jardin.jpg", "/images/demos/plantations.jpg"], hero: "immersive" },
  // Avant « nettoyage » et « garage » : « Lavage / Detailing automobile » contient aussi « automobile ».
  { keywords: ["lavage", "detailing"], photos: ["/images/metiers/lavage-1.jpg", "/images/metiers/lavage-2.jpg"], hero: "split" },
  { keywords: ["carross"], photos: ["/images/metiers/carrosserie-1.jpg", "/images/metiers/carrosserie-2.jpg"], hero: "split" },
  { keywords: ["nettoy", "menage", "proprete"], photos: ["/images/metiers/nettoyage-1.jpg", "/images/metiers/nettoyage-2.jpg"], hero: "split" },
  { keywords: ["demenag"], photos: ["/images/metiers/demenagement-1.jpg", "/images/metiers/demenagement-2.jpg"], hero: "split" },
  { keywords: ["garage", "mecani", "automobile"], photos: ["/images/metiers/auto-1.jpg", "/images/metiers/auto-2.jpg"], hero: "split" },
  { keywords: ["barb"], photos: ["/images/metiers/barbier-1.jpg", "/images/metiers/barbier-2.jpg"], hero: "immersive" },
  { keywords: ["coiff"], photos: ["/images/metiers/coiffure-1.jpg", "/images/metiers/coiffure-2.jpg"], hero: "immersive" },
  { keywords: ["tatou", "piercing"], photos: ["/images/metiers/tatouage-1.jpg", "/images/metiers/tatouage-2.jpg"], hero: "immersive" },
  { keywords: ["ongl", "ongul", "manucur"], photos: ["/images/metiers/ongles-1.jpg", "/images/metiers/ongles-2.jpg"], hero: "immersive" },
  { keywords: ["beaute", "esthetic", "maquill", "institut"], photos: ["/images/metiers/esthetique-1.jpg", "/images/metiers/esthetique-2.jpg"], hero: "immersive" },
  { keywords: ["massage", "bien-etre", "bien etre", "spa", "sophro", "naturo"], photos: ["/images/metiers/bien-etre-1.jpg", "/images/metiers/bien-etre-2.jpg"], hero: "immersive" },
  { keywords: ["yoga", "pilates", "meditation"], photos: ["/images/metiers/yoga-1.jpg", "/images/metiers/yoga-2.jpg"], hero: "immersive" },
  { keywords: ["coach sportif", "sport", "fitness", "muscu"], photos: ["/images/demos/coach.jpg", "/images/demos/salle-sport.jpg"], hero: "split" },
  { keywords: ["pizz"], photos: ["/images/metiers/pizza-1.jpg", "/images/metiers/pizza-2.jpg"], hero: "immersive" },
  { keywords: ["boulang", "patiss"], photos: ["/images/demos/boulangerie.jpg", "/images/demos/pain.jpg"], hero: "immersive" },
  { keywords: ["traiteur", "buffet", "reception"], photos: ["/images/metiers/traiteur-1.jpg", "/images/metiers/traiteur-2.jpg"], hero: "immersive" },
  { keywords: ["restaura", "bistro", "brasserie", "cuisin", "cafe"], photos: ["/images/demos/restaurant.jpg", "/images/demos/plat.jpg"], hero: "immersive" },
  { keywords: ["dj", "sono", "animat"], photos: ["/images/metiers/dj-1.jpg", "/images/metiers/dj-2.jpg"], hero: "immersive" },
  { keywords: ["photo", "video", "videas"], photos: ["/images/metiers/photographe-1.jpg", "/images/metiers/photographe-2.jpg"], hero: "immersive" },
  { keywords: ["evenement", "mariage"], photos: ["/images/metiers/evenementiel-1.jpg", "/images/metiers/evenementiel-2.jpg"], hero: "immersive" },
  { keywords: ["fleur"], photos: ["/images/metiers/fleuriste-1.jpg", "/images/metiers/fleuriste-2.jpg"], hero: "immersive" },
  { keywords: ["architect", "decorat", "interieur"], photos: ["/images/metiers/architecte-1.jpg", "/images/metiers/architecte-2.jpg"], hero: "immersive" },
  { keywords: ["immobil"], photos: ["/images/metiers/immobilier-1.jpg", "/images/metiers/immobilier-2.jpg"], hero: "immersive" },
  { keywords: ["avocat", "juridique", "notaire"], photos: ["/images/demos/reunion.jpg", "/images/demos/avocat.jpg"] },
  { keywords: ["marketing", "communication", "graphis"], photos: ["/images/metiers/marketing-1.jpg", "/images/metiers/marketing-2.jpg"] },
  { keywords: ["web", "developpe", "digital"], photos: ["/images/metiers/web-1.jpg", "/images/metiers/web-2.jpg"] },
  { keywords: ["comptab", "fiscal"], photos: ["/images/metiers/comptable-1.jpg", "/images/metiers/comptable-2.jpg"] },
  { keywords: ["format", "enseign"], photos: ["/images/metiers/formateur-1.jpg", "/images/metiers/formateur-2.jpg"] },
  { keywords: ["consult", "conseil"], photos: ["/images/metiers/consultant-1.jpg", "/images/metiers/consultant-2.jpg"] },
  { keywords: ["toilett", "animal", "chien", "veterin"], photos: ["/images/metiers/animaux-1.jpg", "/images/metiers/animaux-2.jpg"], hero: "split" },
  { keywords: ["taxi", "vtc", "chauffeur", "transport"], photos: ["/images/metiers/transport-1.jpg", "/images/metiers/transport-2.jpg"], hero: "split" },
  { keywords: ["hotel", "gite", "chambre", "hebergement"], photos: ["/images/metiers/hebergement-1.jpg", "/images/metiers/hebergement-2.jpg"], hero: "immersive" },
];

const fallback: [string, string] = ["/images/metiers/commerce-1.jpg", "/images/metiers/commerce-2.jpg"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function familyFor(activity: string) {
  const text = normalize(activity);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  const matches = (keyword: string) =>
    /[ -]/.test(keyword) ? text.includes(keyword) : words.some((word) => word.startsWith(keyword));
  return families.find((family) => family.keywords.some(matches));
}

export function tradePhotosFor(activity: string): [string, string] {
  return familyFor(activity)?.photos ?? fallback;
}

/** Haut de site proposé pour le métier (seulement utile si le site a une photo principale). */
export function tradeHeroLayout(activity: string): TradeHeroLayout | undefined {
  return familyFor(activity)?.hero;
}

/** Ajoute des photos de métier à un site qui n'en a aucune ; sinon le renvoie tel quel. */
export function withTradePhotos(site: GeneratedSite, activity: string): GeneratedSite {
  const hasPhotos = Boolean(site.heroImageUrl?.trim()) || (site.gallery ?? []).some((url) => url?.trim());
  if (hasPhotos) return site;
  const photos = tradePhotosFor(activity);
  const hero = tradeHeroLayout(activity);
  return {
    ...site,
    heroImageUrl: photos[0],
    gallery: [...photos],
    ...(hero && site.designSettings ? { designSettings: { ...site.designSettings, heroLayout: hero } } : {}),
  };
}
