import { safeBookingUrl } from "@/lib/siteGoal";

export type Testimonial = {
  name: string;
  role?: string;
  text: string;
  rating?: number;
};

export type GrowthSite = {
  siteGoal?: string;
  bookingUrl?: string;
  hiddenBlocks?: string[];
  businessName?: string;
  phone?: string;
  heroTitle?: string;
  heroText?: string;
  heroImageUrl?: string;
  gallery?: string[];
  sections?: { title?: string; text?: string; hidden?: boolean }[];
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
  priority?: boolean;
};

export function getSiteHealth(site: GrowthSite) {
  const hidden = site.hiddenBlocks ?? [];
  const visibleServices = (site.sections ?? []).filter(section => !section.hidden);
  const phone = site.phone?.trim() ?? "";
  const digits = phone.replace(/\D/g, "");
  const phoneReady = /^[+\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15;
  const completeText = (value?: string) => Boolean(value?.trim()) && !/lorem ipsum|à compléter|a completer|votre texte ici|texte à remplacer/i.test(value ?? "");
  const checks: HealthCheck[] = [
    {id: "identity", label: "Nom de l’entreprise", ready: completeText(site.businessName), priority: true, advice: "Renseigne le vrai nom de ton entreprise."},
    {id: "phone", label: "Téléphone de contact", ready: phoneReady, priority: site.siteGoal === "calls", advice: phone ? "Vérifie le format : entre 7 et 15 chiffres, avec éventuellement +, espaces, points ou tirets. La disponibilité du numéro n’est pas vérifiée." : "Ajoute ton téléphone pour permettre aux visiteurs de t’appeler."},
    {id: "intro", label: "Présentation du site", ready: completeText(site.heroTitle) && completeText(site.heroText), priority: true, advice: "Complète le titre et la présentation ; remplace les textes provisoires."},
    ...(!hidden.includes("services") ? [{id: "services", label: "Prestations renseignées", ready: visibleServices.length > 0 && visibleServices.every(section => completeText(section.title) && completeText(section.text)), priority: true, advice: "Ajoute un titre et une description à chaque prestation visible."}] : []),
    {id: "photos", label: "Photos de l’entreprise", ready: Boolean(site.heroImageUrl?.trim() || (!hidden.includes("gallery") && site.gallery?.some(url => url.trim()))), advice: "Ajoute une photo principale ou une réalisation pour illustrer ton activité."},
    {id: "seo", label: "Titre et description Google", ready: completeText(site.metaTitle) && completeText(site.metaDescription) && (site.metaDescription?.trim().length ?? 0) >= 80, advice: "Complète le titre et une description Google d’au moins 80 caractères."},
    {id: "local", label: "Zone et horaires", ready: Boolean(site.serviceArea?.trim() && site.openingHours?.trim()), advice: "Précise ta zone d’intervention et tes horaires."},
    {id: "reviews", label: "Avis client", ready: (site.testimonials ?? []).some(item => item.name.trim() && item.text.trim()), advice: "Si tu en disposes, ajoute un avis réel avec l’accord du client. C’est facultatif."},
  ];
  if (site.siteGoal === "booking" && site.bookingUrl?.trim()) {
    checks.unshift({id: "booking", label: "Lien de réservation", ready: Boolean(safeBookingUrl(site.bookingUrl)), priority: true, advice: "Utilise une adresse complète https:// vers ton outil de réservation. Sans lien valide, le bouton mène au formulaire. L’accessibilité du lien n’est pas vérifiée."});
  }
  const needsContact = site.siteGoal === "quote" || (site.siteGoal === "booking" && !safeBookingUrl(site.bookingUrl)) || (site.siteGoal === "calls" && !phone);
  if (needsContact) checks.unshift({id: "contact", label: "Formulaire de contact visible", ready: !hidden.includes("contact"), priority: true, advice: "Ton bouton principal mène au formulaire. Réactive la section contact pour que les visiteurs puissent envoyer leur demande."});
  const completed = checks.filter(check => check.ready).length;
  const pending = checks.filter(check => !check.ready);
  checks.sort((a, b) => Number(a.ready) - Number(b.ready) || Number(Boolean(b.priority)) - Number(Boolean(a.priority)));
  return {score: Math.round(completed / checks.length * 100), checks, completed, pending: pending.length, priorities: pending.filter(check => check.priority).length};
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
