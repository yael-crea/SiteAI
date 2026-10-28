import type { DesignStyle } from "@/lib/designStyles";

export type ExampleTemplate = {
  id: string;
  businessName: string;
  activity: string;
  city: string;
  services: string[];
  designStyle: DesignStyle;
  accentColor: string;
};

export const EXAMPLE_TEMPLATE_STORAGE_KEY = "lumio_selected_example_template";

export const exampleTemplates: ExampleTemplate[] = [
  {
    id: "plombier",
    businessName: "Mon entreprise de plomberie",
    activity: "Plombier",
    city: "Montpellier",
    services: [
      "Recherche de fuite",
      "Installation sanitaire",
      "Rénovation de salle de bain",
    ],
    designStyle: "moderne",
    accentColor: "#1d4ed8",
  },
  {
    id: "restaurant",
    businessName: "Mon restaurant",
    activity: "Restaurant",
    city: "Nîmes",
    services: ["Déjeuner du marché", "Dîner à la carte", "Tables de groupe"],
    designStyle: "tradition",
    accentColor: "#7c2d12",
  },
  {
    id: "beaute",
    businessName: "Mon studio beauté",
    activity: "Beauté des ongles",
    city: "Montpellier",
    services: ["Manucure naturelle", "Pose gel ou capsules", "Couleur et nail art"],
    designStyle: "elegant",
    accentColor: "#9d174d",
  },
  {
    id: "paysagiste",
    businessName: "Mon entreprise paysagiste",
    activity: "Paysagiste",
    city: "Montpellier",
    services: ["Aménagement de jardin", "Entretien saisonnier", "Plantations et massifs"],
    designStyle: "nature",
    accentColor: "#3f6212",
  },
  {
    id: "electricien",
    businessName: "Mon entreprise d’électricité",
    activity: "Électricien",
    city: "Toulouse",
    services: ["Dépannage", "Tableau électrique", "Rénovation complète"],
    designStyle: "dynamique",
    accentColor: "#c2410c",
  },
  {
    id: "boulangerie",
    businessName: "Ma boulangerie",
    activity: "Boulangerie",
    city: "Lyon",
    services: ["Pains au levain", "Viennoiseries", "Commandes et buffets"],
    designStyle: "artisan",
    accentColor: "#b45309",
  },
  {
    id: "coach",
    businessName: "Mon activité de coaching",
    activity: "Coach sportif",
    city: "Bordeaux",
    services: ["Coaching individuel", "Petits groupes", "Bilan et programme"],
    designStyle: "creatif",
    accentColor: "#7c3aed",
  },
  {
    id: "avocat",
    businessName: "Mon cabinet",
    activity: "Cabinet d’avocat",
    city: "Paris",
    services: ["Droit des affaires", "Droit du travail", "Médiation et contentieux"],
    designStyle: "premium",
    accentColor: "#a16207",
  },
];

export function getExampleTemplate(id: string | null | undefined) {
  return exampleTemplates.find((template) => template.id === id) ?? null;
}

export function rememberExampleTemplate(id: string) {
  if (typeof window === "undefined" || !getExampleTemplate(id)) return;
  window.sessionStorage.setItem(EXAMPLE_TEMPLATE_STORAGE_KEY, id);
}

export function readExampleTemplate() {
  if (typeof window === "undefined") return null;
  return getExampleTemplate(
    window.sessionStorage.getItem(EXAMPLE_TEMPLATE_STORAGE_KEY),
  );
}

export function clearExampleTemplate() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(EXAMPLE_TEMPLATE_STORAGE_KEY);
}
