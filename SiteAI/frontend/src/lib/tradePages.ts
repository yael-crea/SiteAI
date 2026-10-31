/*
 * Pages « Site internet pour {métier} » (/site-internet/[metier]) : une page
 * par métier, rédigée pour les recherches Google des artisans et TPE.
 * `label` reprend exactement un libellé de activityExamples : le bouton de
 * la page pré-remplit ce métier dans /creer.
 * Les textes restent propres à chaque métier pour ne pas produire des pages
 * en double aux yeux des moteurs de recherche.
 */

export type TradePage = {
  slug: string;
  label: string;
  /** « ton entreprise de plomberie », « ta boulangerie »… dans une phrase. */
  business: string;
  /** « pour plombier », « pour restaurant »… dans le titre. */
  forTrade: string;
  description: string;
  intro: string;
  /** Ce que les clients tapent sur Google. */
  searches: string[];
  sections: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  /** Démonstration de /exemples pour ce métier, s'il y en a une. */
  exampleId?: string;
};

export const tradePages: TradePage[] = [
  {
    slug: "plombier",
    label: "Plombier",
    business: "ton entreprise de plomberie",
    forTrade: "pour plombier",
    description:
      "Crée le site de ton entreprise de plomberie avec l’IA : dépannage, devis en ligne, zone d’intervention et référencement local. Gratuit pour commencer.",
    intro:
      "Une fuite ne prévient pas. Quand un particulier cherche un plombier, il compare deux ou trois sites, puis appelle celui qui inspire confiance et répond tout de suite à sa question : intervenez-vous chez moi, et pour quoi ?",
    searches: ["plombier fuite d’eau près de chez moi", "remplacement chauffe-eau devis", "rénovation salle de bain plombier"],
    sections: [
      { title: "Dépannage mis en avant", text: "Ton numéro reste visible sur téléphone, avec tes horaires d’intervention et les urgences que tu prends en charge." },
      { title: "Prestations détaillées", text: "Recherche de fuite, débouchage, chauffe-eau, salle de bain : une section par métier de la plomberie, rédigée pour être comprise par un particulier." },
      { title: "Demande de devis", text: "Le formulaire arrive dans ton espace Prospects. Tu fais le devis en PDF depuis Lumio et tu l’envoies au client en quelques clics." },
      { title: "Zone d’intervention", text: "Les communes où tu te déplaces sont citées sur le site, ce qui aide Google à te montrer aux bonnes personnes." },
    ],
    faq: [
      { question: "Mon site peut-il afficher un numéro d’urgence ?", answer: "Oui. Le bouton d’appel reste accessible sur téléphone, et tu peux préciser dans le texte les plages horaires où tu interviens en urgence." },
      { question: "Puis-je montrer mes chantiers ?", answer: "Oui. Ajoute tes photos avant/après dans la galerie depuis l’éditeur, sur ordinateur ou sur téléphone." },
      { question: "Les demandes de devis arrivent-elles par email ?", answer: "Oui. Chaque demande t’est envoyée par email et rangée dans ton espace Prospects, avec son statut et ses relances." },
    ],
    exampleId: "plombier",
  },
  {
    slug: "electricien",
    label: "Électricien",
    business: "ton entreprise d’électricité",
    forTrade: "pour électricien",
    description:
      "Crée le site de ton entreprise d’électricité avec l’IA : dépannage, mise aux normes, bornes de recharge et devis en ligne. Gratuit pour commencer.",
    intro:
      "Panne de courant, tableau à remplacer, rénovation complète ou borne de recharge : un électricien a des clients très différents. Ton site doit les orienter vite vers la bonne prestation et leur donner envie de te demander un devis.",
    searches: ["électricien dépannage urgent", "mise aux normes tableau électrique", "installation borne de recharge maison"],
    sections: [
      { title: "Dépannage et rénovation séparés", text: "Les urgences d’un côté, les projets de l’autre : chaque client trouve son cas sans lire toute la page." },
      { title: "Prestations techniques expliquées simplement", text: "Mise aux normes, tableau, domotique, bornes : l’IA rédige des textes clairs, que tu peux ajuster avec ton vocabulaire." },
      { title: "Qualifications mises en valeur", text: "Ajoute tes labels, assurances et années d’expérience dans la section « À propos » : ce sont des critères de choix." },
      { title: "Devis suivis", text: "Les demandes arrivent dans Prospects et tu crées des devis PDF numérotés, avec TVA, depuis le même espace." },
    ],
    faq: [
      { question: "Puis-je mentionner mes certifications ?", answer: "Oui. Tu ajoutes tes qualifications, labels et assurances dans les textes du site, où tu veux." },
      { question: "Mon site sera-t-il visible sur Google ?", answer: "Le site publié est référençable : titres, descriptions, ville et services sont préparés pour la recherche locale. Le classement dépend ensuite de Google et de la concurrence." },
      { question: "Puis-je utiliser mon propre nom de domaine ?", answer: "Oui, la connexion d’un domaine personnel est incluse dès la formule Essentiel." },
    ],
    exampleId: "electricien",
  },
  {
    slug: "menuisier",
    label: "Menuisier",
    business: "ta menuiserie",
    forTrade: "pour menuisier",
    description:
      "Crée le site de ta menuiserie avec l’IA : réalisations sur mesure, galerie photo, pose de fenêtres et devis en ligne. Gratuit pour commencer.",
    intro:
      "En menuiserie, ce sont tes réalisations qui vendent. Un client qui cherche un escalier, une cuisine ou des fenêtres veut voir ton travail, comprendre ce que tu fabriques et savoir si tu poses dans sa ville.",
    searches: ["menuisier sur mesure escalier bois", "pose fenêtres menuisier", "dressing sur mesure artisan"],
    sections: [
      { title: "Galerie de réalisations", text: "Tes plus belles pièces en grand, prises sur téléphone et ajoutées directement depuis l’éditeur." },
      { title: "Sur mesure et pose", text: "Fabrication en atelier, agencement, fenêtres et portes : chaque savoir-faire a sa section." },
      { title: "Matériaux et finitions", text: "Explique les essences de bois et les finitions que tu proposes : c’est ce qui te distingue d’un catalogue." },
      { title: "Projets qualifiés", text: "Le formulaire de devis demande le type de projet : tu sais avant de rappeler s’il s’agit d’un dressing ou d’un escalier." },
    ],
    faq: [
      { question: "Combien de photos puis-je mettre ?", answer: "Tu peux compléter la galerie de ton site avec tes propres photos, et les remplacer à tout moment." },
      { question: "Je travaille pour les particuliers et les professionnels, est-ce possible ?", answer: "Oui. Tu peux présenter les deux publics dans des sections différentes, avec les prestations propres à chacun." },
      { question: "Dois-je savoir écrire les textes ?", answer: "Non. L’IA rédige une première version à partir de ton métier et de tes services ; tu la modifies ensuite comme tu veux." },
    ],
  },
  {
    slug: "peintre-en-batiment",
    label: "Peintre en bâtiment",
    business: "ton entreprise de peinture",
    forTrade: "pour peintre en bâtiment",
    description:
      "Crée le site de ton entreprise de peinture avec l’IA : peinture intérieure et extérieure, ravalement, photos avant/après et devis. Gratuit pour commencer.",
    intro:
      "Un chantier de peinture se décide sur la confiance : propreté, délais, qualité des finitions. Ton site doit montrer des pièces transformées et rassurer sur la façon dont tu travailles chez les gens.",
    searches: ["peintre intérieur appartement devis", "ravalement de façade peintre", "peintre en bâtiment pas cher près de chez moi"],
    sections: [
      { title: "Avant / après", text: "La galerie met côte à côte l’état de départ et le résultat : l’argument le plus parlant pour un peintre." },
      { title: "Intérieur, extérieur, décoration", text: "Murs et plafonds, façades, boiseries, revêtements décoratifs : une section claire pour chaque prestation." },
      { title: "Méthode de chantier", text: "Protection des sols, préparation des supports, nettoyage en fin de chantier : l’IA rédige ces engagements, tu les ajustes." },
      { title: "Devis rapides", text: "Le client décrit la pièce et la surface, tu reçois la demande dans Prospects et tu envoies un devis PDF." },
    ],
    faq: [
      { question: "Puis-je indiquer que je travaille avec des peintures écologiques ?", answer: "Oui. Ajoute-le dans tes services ou dans la présentation : c’est un argument recherché." },
      { question: "Mon site s’affiche-t-il bien sur téléphone ?", answer: "Oui. Les sites Lumio sont conçus d’abord pour le téléphone, là où la plupart des clients te cherchent." },
      { question: "Combien coûte la publication ?", answer: "La création est gratuite, sans carte bancaire. Pour publier, les formules commencent à 19,90 € par mois, sans engagement." },
    ],
  },
  {
    slug: "macon",
    label: "Maçon",
    business: "ton entreprise de maçonnerie",
    forTrade: "pour maçon",
    description:
      "Crée le site de ton entreprise de maçonnerie avec l’IA : construction, extension, rénovation, terrasses et devis en ligne. Gratuit pour commencer.",
    intro:
      "Extension, mur de clôture, terrasse ou reprise de façade : les projets de maçonnerie sont importants pour les clients. Avant de t’appeler, ils veulent voir des chantiers terminés et comprendre ce que tu prends en charge.",
    searches: ["maçon extension maison devis", "construction mur de clôture", "maçon rénovation façade"],
    sections: [
      { title: "Chantiers en photos", text: "Tes réalisations par type de travaux : gros œuvre, extensions, terrasses, murets." },
      { title: "Prestations par projet", text: "Construction neuve, extension, rénovation, aménagements extérieurs : le client se reconnaît tout de suite." },
      { title: "Garanties", text: "Assurance décennale, années d’expérience, secteur couvert : les informations qui font la différence entre deux devis." },
      { title: "Prospects organisés", text: "Chaque demande est rangée avec son statut et sa date de relance, pour ne laisser filer aucun projet." },
    ],
    faq: [
      { question: "Puis-je afficher mon assurance décennale ?", answer: "Oui. Mentionne-la dans la présentation ou les garanties : c’est souvent la première question des clients." },
      { question: "Comment les clients me trouvent-ils sur Google ?", answer: "Ton site cite ton métier, tes services et ta zone d’intervention, préparés pour la recherche locale. Ajoute aussi l’adresse de ton site à ta fiche Google." },
      { question: "Puis-je modifier mon site moi-même ?", answer: "Oui, à tout moment : textes, photos, services et coordonnées, sans écrire de code." },
    ],
  },
  {
    slug: "paysagiste",
    label: "Paysagiste / Jardinier",
    business: "ton entreprise de paysage",
    forTrade: "pour paysagiste",
    description:
      "Crée le site de ton entreprise de paysage avec l’IA : création de jardins, entretien, élagage, photos de réalisations et devis. Gratuit pour commencer.",
    intro:
      "Un jardin se vend en images. Les clients d’un paysagiste cherchent l’inspiration autant qu’un prestataire : ton site doit leur montrer ce que leur extérieur pourrait devenir, et comment tu l’entretiens ensuite.",
    searches: ["paysagiste création jardin devis", "entretien jardin régulier", "élagage arbre paysagiste"],
    sections: [
      { title: "Réalisations au fil des saisons", text: "Une galerie qui montre tes jardins, terrasses et massifs, à remplacer au gré de tes chantiers." },
      { title: "Création et entretien", text: "Les projets ponctuels d’un côté, les contrats d’entretien de l’autre : deux besoins, deux sections." },
      { title: "Services à la personne", text: "Si tu y as droit, précise l’avance immédiate de crédit d’impôt pour l’entretien : c’est un argument fort." },
      { title: "Visite sur place", text: "Le formulaire propose une visite pour estimer le projet ; la demande arrive dans tes prospects." },
    ],
    faq: [
      { question: "Puis-je présenter mes contrats d’entretien ?", answer: "Oui. Crée une section dédiée avec la fréquence de passage et les travaux inclus." },
      { question: "Mon site peut-il montrer plusieurs villes ?", answer: "Oui. Indique toutes les communes de ta zone d’intervention dans les textes du site." },
      { question: "Y a-t-il un exemple de site de paysagiste ?", answer: "Oui, un exemple complet est visible dans la page Exemples, et tu peux partir de ce modèle." },
    ],
    exampleId: "paysagiste",
  },
  {
    slug: "coiffeur",
    label: "Coiffeur",
    business: "ton salon de coiffure",
    forTrade: "pour coiffeur",
    description:
      "Crée le site de ton salon de coiffure avec l’IA : prestations, tarifs, prise de rendez-vous, photos et horaires. Gratuit pour commencer.",
    intro:
      "Avant de pousser la porte d’un salon, on regarde les coupes, les tarifs et les horaires. Un site clair, avec un bouton de réservation bien visible, transforme ces visites en rendez-vous.",
    searches: ["coiffeur près de chez moi ouvert samedi", "salon de coiffure balayage prix", "coiffeur homme femme rendez-vous"],
    sections: [
      { title: "Réservation en un clic", text: "Relie ton outil de prise de rendez-vous : le bouton apparaît partout sur le site." },
      { title: "Prestations et tarifs", text: "Coupes, couleurs, soins, coiffures de cérémonie : une carte lisible, que tu mets à jour toi-même." },
      { title: "Ambiance du salon", text: "Photos du salon et de tes réalisations pour donner envie avant même la première visite." },
      { title: "Horaires et accès", text: "Jours d’ouverture, adresse et téléphone toujours visibles, surtout sur téléphone." },
    ],
    faq: [
      { question: "Puis-je ajouter mon lien de réservation en ligne ?", answer: "Oui. Lors de la création, choisis l’objectif « Réserver » et indique le lien de ton outil de réservation." },
      { question: "Puis-je afficher mes tarifs ?", answer: "Oui. Ajoute-les dans tes prestations et modifie-les quand tu changes ta carte." },
      { question: "L’affichette avec QR code peut-elle servir en vitrine ?", answer: "Oui. Une fois le site publié, tu télécharges une affichette A5 avec un QR code qui mène à ton site, à poser en vitrine ou à la caisse." },
    ],
  },
  {
    slug: "estheticienne",
    label: "Institut de beauté / Esthéticienne",
    business: "ton institut de beauté",
    forTrade: "pour esthéticienne et institut de beauté",
    description:
      "Crée le site de ton institut de beauté avec l’IA : soins, épilations, onglerie, tarifs et réservation en ligne. Gratuit pour commencer.",
    intro:
      "Soins du visage, épilation, ongles, maquillage : un institut propose beaucoup de prestations. Ton site doit les présenter avec élégance, rassurer sur l’hygiène et le savoir-faire, et mener à la réservation.",
    searches: ["institut de beauté soin visage", "esthéticienne épilation près de chez moi", "onglerie pose gel rendez-vous"],
    sections: [
      { title: "Carte des soins", text: "Chaque famille de soins avec sa durée et son prix, dans un style élégant adapté à la beauté." },
      { title: "Réservation", text: "Le bouton de rendez-vous renvoie vers ton planning en ligne, depuis chaque section du site." },
      { title: "Marques et produits", text: "Présente les gammes que tu utilises : c’est un vrai critère de choix pour les clientes." },
      { title: "Avis clientes", text: "Ajoute les témoignages de tes clientes pour rassurer les nouvelles personnes qui découvrent l’institut." },
    ],
    faq: [
      { question: "Le design convient-il à un institut de beauté ?", answer: "Oui. Plusieurs styles sont proposés, dont un style élégant pensé pour la beauté et le bien-être." },
      { question: "Puis-je présenter des cartes cadeaux ?", answer: "Oui. Ajoute une section dédiée et invite les clientes à te contacter ou à réserver." },
      { question: "Y a-t-il un exemple ?", answer: "Oui, un exemple de studio beauté est disponible dans la page Exemples." },
    ],
    exampleId: "beaute",
  },
  {
    slug: "restaurant",
    label: "Restaurant",
    business: "ton restaurant",
    forTrade: "pour restaurant",
    description:
      "Crée le site de ton restaurant avec l’IA : menu, horaires, photos des plats, réservation et privatisation. Gratuit pour commencer.",
    intro:
      "Avant de réserver, on veut voir les plats, la carte, l’ambiance et savoir si c’est ouvert ce soir. Un restaurant a besoin d’un site appétissant, rapide sur téléphone, avec le bouton de réservation sous le pouce.",
    searches: ["restaurant ouvert ce soir près de moi", "restaurant menu du jour", "privatiser un restaurant pour un groupe"],
    sections: [
      { title: "Carte et menu du jour", text: "Ta carte présentée simplement, avec les formules du midi et les spécialités de la maison." },
      { title: "Photos qui donnent faim", text: "Plats, salle, terrasse : une grande image d’accueil et une galerie que tu changes avec les saisons." },
      { title: "Réservation et groupes", text: "Réservation en ligne ou par téléphone, et une section pour les groupes et les privatisations." },
      { title: "Horaires et accès", text: "Jours d’ouverture, adresse et itinéraire visibles en un coup d’œil." },
    ],
    faq: [
      { question: "Puis-je mettre à jour mon menu facilement ?", answer: "Oui. Tu modifies les textes depuis l’éditeur, sur ordinateur ou téléphone, et tu republies en un clic." },
      { question: "Puis-je recevoir les demandes de privatisation ?", answer: "Oui. Le formulaire de contact arrive par email et dans ton espace Prospects." },
      { question: "Y a-t-il un exemple de site de restaurant ?", answer: "Oui, un exemple complet est visible dans la page Exemples." },
    ],
    exampleId: "restaurant",
  },
  {
    slug: "boulangerie",
    label: "Boulangerie / Pâtisserie",
    business: "ta boulangerie",
    forTrade: "pour boulangerie et pâtisserie",
    description:
      "Crée le site de ta boulangerie-pâtisserie avec l’IA : produits, horaires, commandes de gâteaux et buffets. Gratuit pour commencer.",
    intro:
      "Les clients d’une boulangerie cherchent surtout trois choses : les horaires, les spécialités et comment commander une pièce montée ou un buffet. Ton site répond à ces questions et fait venir les commandes.",
    searches: ["boulangerie ouverte dimanche", "commander gâteau d’anniversaire boulangerie", "buffet salé sucré entreprise"],
    sections: [
      { title: "Spécialités de la maison", text: "Pains au levain, viennoiseries, pâtisseries : mets en avant ce qui fait ta réputation." },
      { title: "Commandes", text: "Gâteaux, pièces montées, buffets : un formulaire dédié, et les demandes arrivent dans tes prospects." },
      { title: "Horaires", text: "Jours et heures d’ouverture bien visibles, y compris les fermetures et les jours fériés." },
      { title: "Savoir-faire", text: "Farines, fermentation, fabrication maison : l’IA rédige ton histoire, tu ajoutes tes mots." },
    ],
    faq: [
      { question: "Puis-je recevoir des commandes par le site ?", answer: "Oui, sous forme de demandes : le client décrit sa commande, tu la reçois par email et tu le recontactes pour confirmer." },
      { question: "Puis-je changer mes horaires facilement ?", answer: "Oui, en quelques secondes depuis l’éditeur, puis tu republies." },
      { question: "Y a-t-il un exemple ?", answer: "Oui, un exemple de boulangerie est disponible dans la page Exemples." },
    ],
    exampleId: "boulangerie",
  },
  {
    slug: "photographe",
    label: "Photographe / Vidéaste",
    business: "ton activité de photographe",
    forTrade: "pour photographe et vidéaste",
    description:
      "Crée le site de ton activité de photographe ou vidéaste avec l’IA : portfolio, mariages, portraits, entreprises et demande de devis. Gratuit pour commencer.",
    intro:
      "Pour un photographe, le site est le portfolio. Les futurs mariés, les familles ou les entreprises veulent voir ton style, connaître tes prestations et vérifier que tu es disponible à leur date.",
    searches: ["photographe mariage devis", "shooting photo famille", "vidéaste entreprise film promotionnel"],
    sections: [
      { title: "Portfolio en grand", text: "Une mise en page immersive qui laisse toute la place à tes images." },
      { title: "Prestations par type de séance", text: "Mariage, portrait, naissance, entreprise, événement : chaque client trouve sa formule." },
      { title: "Demande de date", text: "Le formulaire demande la date et le lieu de l’événement, pour répondre vite aux bonnes demandes." },
      { title: "Ton approche", text: "Ta façon de travailler et ton univers, racontés dans la section « À propos »." },
    ],
    faq: [
      { question: "Mes photos garderont-elles leur qualité ?", answer: "Les images sont affichées en grand. Pour un site rapide, utilise des fichiers web plutôt que tes originaux en pleine définition." },
      { question: "Puis-je présenter plusieurs types de prestations ?", answer: "Oui. Chaque type de séance peut avoir sa section, avec son texte et ses tarifs indicatifs." },
      { question: "Puis-je utiliser mon nom de domaine ?", answer: "Oui, dès la formule Essentiel, par exemple ton-nom-photographe.fr." },
    ],
  },
  {
    slug: "coach-sportif",
    label: "Coach sportif",
    business: "ton activité de coach sportif",
    forTrade: "pour coach sportif",
    description:
      "Crée le site de ton activité de coach sportif avec l’IA : coaching individuel, cours collectifs, programmes et séance d’essai. Gratuit pour commencer.",
    intro:
      "Les personnes qui cherchent un coach veulent un déclic : un objectif qui leur parle, une méthode claire et une première séance facile à réserver. Ton site doit donner cette envie de commencer.",
    searches: ["coach sportif à domicile", "coach perte de poids séance d’essai", "cours collectifs fitness"],
    sections: [
      { title: "Objectifs clients", text: "Perte de poids, remise en forme, préparation physique : le visiteur se reconnaît dans un objectif." },
      { title: "Formules", text: "Coaching individuel, petits groupes, programmes en ligne : présente tes offres et leur fonctionnement." },
      { title: "Séance d’essai", text: "Un bouton de réservation ou de contact pour la première séance, présent sur tout le site." },
      { title: "Témoignages", text: "Les progrès de tes clients racontés par eux : la preuve la plus convaincante." },
    ],
    faq: [
      { question: "Puis-je proposer une séance d’essai ?", answer: "Oui. Mets-la en avant dans le texte principal et relie le bouton à ton agenda ou au formulaire de contact." },
      { question: "Je me déplace à domicile, est-ce visible ?", answer: "Oui. Indique ta zone de déplacement et les lieux où tu coaches : domicile, parc, salle." },
      { question: "Y a-t-il un exemple ?", answer: "Oui, un exemple de site de coaching est disponible dans la page Exemples." },
    ],
    exampleId: "coach",
  },
];

export function getTradePage(slug: string) {
  return tradePages.find((page) => page.slug === slug) ?? null;
}
