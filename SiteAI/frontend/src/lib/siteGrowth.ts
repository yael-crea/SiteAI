export type Testimonial = {
  name: string;
  role?: string;
  text: string;
  rating?: number;
};

export type GrowthSite = {
  businessName?: string;
  phone?: string;
  heroTitle?: string;
  heroText?: string;
  heroImageUrl?: string;
  gallery?: string[];
  sections?: { title?: string; hidden?: boolean }[];
  metaTitle?: string;
  metaDescription?: string;
  testimonials?: Testimonial[];
  serviceArea?: string;
  openingHours?: string;
  clientName?: string;
  clientEmail?: string;
};

export type HealthCheck = {
  id: string;
  label: string;
  ready: boolean;
  advice: string;
};

export function getSiteHealth(site: GrowthSite) {
  const visibleServices = (site.sections ?? []).filter(
    (section) => !section.hidden && Boolean(section.title?.trim()),
  );
  const testimonials = (site.testimonials ?? []).filter(
    (item) => item.name.trim() && item.text.trim(),
  );
  const checks: HealthCheck[] = [
    { id: "identity", label: "Nom de l’entreprise", ready: Boolean(site.businessName?.trim()), advice: "Ajoute le nom affiché de l’entreprise." },
    { id: "phone", label: "Téléphone de contact", ready: Boolean(site.phone?.trim()), advice: "Ajoute un numéro pour recevoir des appels." },
    { id: "intro", label: "Présentation claire", ready: Boolean(site.heroTitle?.trim() && site.heroText?.trim()), advice: "Explique clairement le service principal." },
    { id: "services", label: "Prestations visibles", ready: visibleServices.length > 0, advice: "Ajoute au moins une prestation visible." },
    { id: "photos", label: "Photos de l’entreprise", ready: Boolean(site.heroImageUrl || site.gallery?.length), advice: "Ajoute une photo principale ou une réalisation." },
    { id: "seo", label: "Titre et description Google", ready: Boolean(site.metaTitle?.trim() && (site.metaDescription?.trim().length ?? 0) >= 80), advice: "Complète le titre et une description Google d’au moins 80 caractères." },
    { id: "local", label: "Zone et horaires", ready: Boolean(site.serviceArea?.trim() && site.openingHours?.trim()), advice: "Précise la zone d’intervention et les horaires." },
    { id: "reviews", label: "Avis client", ready: testimonials.length > 0, advice: "Ajoute un avis réel avec l’accord du client." },
  ];
  const completed = checks.filter((check) => check.ready).length;
  return { score: Math.round((completed / checks.length) * 100), checks };
}

export const smartPalettes = [
  { name: "Confiance", colors: ["#2563eb", "#0f766e", "#0f172a"] },
  { name: "Artisan", colors: ["#c2410c", "#92400e", "#292524"] },
  { name: "Nature", colors: ["#15803d", "#4d7c0f", "#14532d"] },
  { name: "Élégance", colors: ["#7c3aed", "#be123c", "#111827"] },
  { name: "Énergie", colors: ["#dc2626", "#ea580c", "#ca8a04"] },
];

export function getQuoteOptions(activity: string) {
  const value = activity.toLocaleLowerCase("fr-FR");
  if (/plomb|chauff|sanit/.test(value)) return ["Urgence ou fuite", "Installation", "Rénovation", "Entretien", "Autre besoin"];
  if (/peint|rénov|renov|maçon|macon|menuis|élect/.test(value)) return ["Demande de devis", "Dépannage", "Rénovation", "Projet neuf", "Autre besoin"];
  if (/restaurant|traiteur|boulanger/.test(value)) return ["Réservation", "Commande", "Événement", "Demande d’information"];
  if (/coiff|barber|beauté|beaute/.test(value)) return ["Prendre rendez-vous", "Demander un tarif", "Conseil", "Autre besoin"];
  if (/photo|vidéo|video/.test(value)) return ["Portrait", "Événement", "Entreprise", "Projet créatif", "Autre besoin"];
  return ["Demande de devis", "Rendez-vous", "Question", "Autre besoin"];
}
