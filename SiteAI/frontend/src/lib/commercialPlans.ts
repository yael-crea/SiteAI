export type PlanName = "essentiel" | "pro" | "agence";

export const CGV_VERSION = "2026-10-31";
export const priceSuffix = "/ mois";
export const priceTaxText =
  "Prix mensuels. TVA non applicable, article 293 B du Code général des impôts : le prix affiché est le prix payé.";

export const plans: {
  id: PlanName;
  name: string;
  price: string;
  description: string;
  highlighted: boolean;
  features: string[];
}[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "19,90 €",
    description: "Un site professionnel complet pour ton entreprise.",
    highlighted: true,
    features: [
      "1 site publié et hébergé",
      "Connexion de ton domaine personnel",
      "9 styles personnalisables",
      "Galerie photos et coordonnées de contact",
      "Référencement de base : titre et description Google",
      "50 demandes IA par mois",
      "Édition manuelle et sauvegarde",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "39,90 €",
    description: "Pour faire évoluer plus souvent le site principal de ton entreprise.",
    highlighted: false,
    features: [
      "Tout Essentiel, avec davantage d’IA et de suivi",
      "1 site publié et hébergé",
      "200 demandes IA par mois",
      "Statistiques détaillées : visiteurs, appels, e-mails et prospects",
    ],
  },
  {
    id: "agence",
    name: "Agence",
    price: "79,90 €",
    description: "Pour les freelances et agences qui gèrent les sites de plusieurs clients.",
    highlighted: false,
    features: [
      "Tout Pro, avec un espace multi-clients",
      "Jusqu’à 10 sites publiés et hébergés",
      "1 000 demandes IA par mois pour le compte",
      "Bilan et statistiques par site client",
      "Connexion d’un domaine personnel par site",
      "Gestion des sites depuis un seul compte",
    ],
  },
];

export const freePreviewText =
  "Crée ton compte et prépare ton site gratuitement, sans carte bancaire : aperçu, édition manuelle et sauvegarde inclus, avec 15 demandes IA par mois. Choisis un abonnement uniquement pour publier.";

export const aiUsageText =
  "Les demandes IA incluent la création et la modification. Le quota est partagé entre tous les sites du compte et renouvelé le 1er de chaque mois à 00 h UTC, sans report. Une demande lancée est comptée, même si la génération échoue. Maximum : 20 demandes par heure. Une fois le quota atteint, l’édition manuelle reste disponible.";

export const domainText =
  "La connexion d’un domaine personnel est incluse dès Essentiel. Son achat et son renouvellement auprès d’un fournisseur de domaines restent à ta charge. Une adresse publique Lumio est également fournie.";

export const cancellationText =
  "Abonnement mensuel renouvelé automatiquement, résiliable depuis ton espace client. Si tu programmes la résiliation à l’échéance, le site reste en ligne jusqu’à la fin de la période payée. À la fin effective de l’abonnement, il est retiré du public ; son contenu reste dans ton compte en brouillon. Après réabonnement, tu peux le republier.";
