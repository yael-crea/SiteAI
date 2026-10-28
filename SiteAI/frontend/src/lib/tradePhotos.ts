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

type TradePhotoFamily = {
  keywords: string[];
  photos: [string, string];
};

const families: TradePhotoFamily[] = [
  { keywords: ["plomb", "sanitaire", "chauffe-eau"], photos: ["/images/demos/plomberie.jpg", "/images/demos/salle-de-bain.jpg"] },
  { keywords: ["chauffag", "climatis", "pompe a chaleur", "frigorist"], photos: ["/images/metiers/chauffage-1.jpg", "/images/metiers/chauffage-2.jpg"] },
  { keywords: ["electric"], photos: ["/images/demos/electricien.jpg", "/images/demos/tableau-electrique.jpg"] },
  { keywords: ["menuis", "ebenist", "charpent"], photos: ["/images/metiers/menuiserie-1.jpg", "/images/metiers/menuiserie-2.jpg"] },
  {
    keywords: ["macon", "couvreur", "zingu", "carrel", "peintre", "plaquist", "serrur", "renovation", "batiment", "facade"],
    photos: ["/images/metiers/renovation-1.jpg", "/images/metiers/renovation-2.jpg"],
  },
  { keywords: ["piscin"], photos: ["/images/metiers/piscine-1.jpg", "/images/metiers/piscine-2.jpg"] },
  { keywords: ["paysag", "jardin", "elagage"], photos: ["/images/demos/jardin.jpg", "/images/demos/plantations.jpg"] },
  { keywords: ["nettoy", "menage", "proprete"], photos: ["/images/metiers/nettoyage-1.jpg", "/images/metiers/nettoyage-2.jpg"] },
  { keywords: ["demenag"], photos: ["/images/metiers/demenagement-1.jpg", "/images/metiers/demenagement-2.jpg"] },
  { keywords: ["garage", "mecani", "carross", "lavage", "detailing", "automobile"], photos: ["/images/metiers/auto-1.jpg", "/images/metiers/auto-2.jpg"] },
  { keywords: ["coiff", "barb"], photos: ["/images/metiers/coiffure-1.jpg", "/images/metiers/coiffure-2.jpg"] },
  { keywords: ["tatou", "piercing"], photos: ["/images/metiers/tatouage-1.jpg", "/images/metiers/tatouage-2.jpg"] },
  { keywords: ["beaute", "esthetic", "ongl", "ongul", "manucur", "maquill"], photos: ["/images/demos/studio-nacre.webp", "/images/metiers/beaute-2.jpg"] },
  { keywords: ["massage", "bien-etre", "bien etre", "spa", "sophro", "naturo"], photos: ["/images/metiers/bien-etre-1.jpg", "/images/metiers/bien-etre-2.jpg"] },
  { keywords: ["yoga", "pilates", "meditation"], photos: ["/images/metiers/yoga-1.jpg", "/images/metiers/yoga-2.jpg"] },
  { keywords: ["coach sportif", "sport", "fitness", "muscu"], photos: ["/images/demos/coach.jpg", "/images/demos/salle-sport.jpg"] },
  { keywords: ["pizz"], photos: ["/images/metiers/pizza-1.jpg", "/images/metiers/pizza-2.jpg"] },
  { keywords: ["boulang", "patiss"], photos: ["/images/demos/boulangerie.jpg", "/images/demos/pain.jpg"] },
  { keywords: ["restaura", "traiteur", "bistro", "brasserie", "cuisin", "cafe"], photos: ["/images/demos/restaurant.jpg", "/images/demos/plat.jpg"] },
  { keywords: ["photo", "video", "videas", "dj", "evenement", "mariage"], photos: ["/images/metiers/evenementiel-1.jpg", "/images/metiers/evenementiel-2.jpg"] },
  { keywords: ["fleur"], photos: ["/images/metiers/fleuriste-1.jpg", "/images/metiers/fleuriste-2.jpg"] },
  { keywords: ["immobil", "architect", "decorat", "interieur"], photos: ["/images/metiers/immobilier-1.jpg", "/images/metiers/immobilier-2.jpg"] },
  { keywords: ["avocat", "juridique", "notaire"], photos: ["/images/demos/reunion.jpg", "/images/demos/avocat.jpg"] },
  { keywords: ["web", "developpe", "marketing", "communication", "digital", "graphis"], photos: ["/images/metiers/web-1.jpg", "/images/metiers/web-2.jpg"] },
  { keywords: ["comptab", "consult", "format", "conseil"], photos: ["/images/demos/reunion.jpg", "/images/metiers/web-2.jpg"] },
  { keywords: ["toilett", "animal", "chien", "veterin"], photos: ["/images/metiers/animaux-1.jpg", "/images/metiers/animaux-2.jpg"] },
  { keywords: ["taxi", "vtc", "chauffeur", "transport"], photos: ["/images/metiers/transport-1.jpg", "/images/metiers/transport-2.jpg"] },
  { keywords: ["hotel", "gite", "chambre", "hebergement"], photos: ["/images/metiers/hebergement-1.jpg", "/images/metiers/hebergement-2.jpg"] },
];

const fallback: [string, string] = ["/images/metiers/commerce-1.jpg", "/images/metiers/commerce-2.jpg"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function tradePhotosFor(activity: string): [string, string] {
  const text = normalize(activity);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  const matches = (keyword: string) =>
    /[ -]/.test(keyword) ? text.includes(keyword) : words.some((word) => word.startsWith(keyword));
  return families.find((family) => family.keywords.some(matches))?.photos ?? fallback;
}

/** Ajoute des photos de métier à un site qui n'en a aucune ; sinon le renvoie tel quel. */
export function withTradePhotos(site: GeneratedSite, activity: string): GeneratedSite {
  const hasPhotos = Boolean(site.heroImageUrl?.trim()) || (site.gallery ?? []).some((url) => url?.trim());
  if (hasPhotos) return site;
  const photos = tradePhotosFor(activity);
  return { ...site, heroImageUrl: photos[0], gallery: [...photos] };
}
