import type { DesignStyle } from "@/lib/designStyles";

// Fictional businesses; local photographs are illustrations, not client work.
export const demoSites: {
  id: string;
  name: string;
  activity: string;
  style: DesignStyle;
  color: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  gallery: string[];
  about: string;
  services: { title: string; text: string }[];
}[] = [
  {
    id: "plombier",
    name: "Atelier du Robinet",
    activity: "Plombier",
    style: "moderne",
    color: "#2563eb",
    title: "Votre salle de bain, entre de bonnes mains.",
    text: "Une fuite à réparer, un équipement à remplacer ou une pièce à rénover ? Nous vous accompagnons du premier diagnostic aux finitions.",
    image: "/images/demos/plomberie.jpg",
    imageAlt: "Salle de bain lumineuse avec baignoire et robinetterie",
    gallery: ["/images/demos/plomberie.jpg", "/images/demos/salle-de-bain.jpg"],
    about:
      "À l’Atelier du Robinet, chaque intervention commence par une écoute de votre besoin. Nous expliquons les travaux envisagés et préparons un devis avant de commencer. Notre attention va autant à la qualité des installations qu’à la propreté du chantier.",
    services: [
      {
        title: "Recherche de fuite",
        text: "Nous recherchons l’origine des écoulements, contrôlons les raccords et proposons une réparation adaptée pour préserver votre logement.",
      },
      {
        title: "Installation sanitaire",
        text: "Lavabo, douche ou robinetterie : nous préparons les raccordements, installons vos équipements et vérifions leur bon fonctionnement.",
      },
      {
        title: "Rénovation de salle de bain",
        text: "De l’agencement au remplacement des équipements, construisons une salle de bain pratique et agréable à vivre.",
      },
    ],
  },
  {
    id: "restaurant",
    name: "La Table du Jardin",
    activity: "Restaurant",
    style: "tradition",
    color: "#92400e",
    title: "Une cuisine de saison, le plaisir de se retrouver.",
    text: "Une table conviviale pour une pause déjeuner, un dîner à deux ou un repas en famille. Découvrez une cuisine généreuse qui évolue au fil des saisons.",
    image: "/images/demos/restaurant.jpg",
    imageAlt: "Salle de restaurant chaleureuse prête à accueillir les convives",
    gallery: ["/images/demos/plat.jpg", "/images/demos/restaurant.jpg"],
    about:
      "La Table du Jardin met à l’honneur le plaisir d’un repas partagé. Notre carte courte laisse toute leur place aux produits et aux recettes de saison. Prévenez-nous de vos allergies ou de vos préférences au moment de réserver.",
    services: [
      {
        title: "À la carte",
        text: "Légumes rôtis, poisson du moment et dessert maison : notre ardoise suit les arrivages pour vous proposer des assiettes simples et soignées.",
      },
      {
        title: "Votre table vous attend",
        text: "Pour un déjeuner ou un dîner, contactez-nous en précisant le nombre de convives et l’horaire souhaité. L’équipe vous confirme les disponibilités.",
      },
      {
        title: "Repas de groupe",
        text: "Anniversaire, retrouvailles ou déjeuner d’équipe : préparons ensemble un menu et une organisation adaptés à votre occasion.",
      },
    ],
  },
  {
    id: "paysagiste",
    name: "Les Jardins Clairs",
    activity: "Paysagiste",
    style: "nature",
    color: "#3f6212",
    title: "Un jardin à vivre, au rythme des saisons.",
    text: "Un coin d’ombre, une terrasse fleurie ou un jardin à repenser : imaginons un extérieur qui correspond à vos envies et à votre terrain.",
    image: "/images/demos/jardin.jpg",
    imageAlt: "Pelouse entretenue dans un jardin contemporain",
    gallery: ["/images/demos/jardin.jpg", "/images/demos/plantations.jpg"],
    about:
      "Les Jardins Clairs conçoivent des espaces où il fait bon passer du temps. Nous prenons en compte l’exposition, le sol et le temps que vous souhaitez consacrer à l’entretien, pour vous proposer des aménagements adaptés.",
    services: [
      {
        title: "Aménagement de jardin",
        text: "Nous organisons les allées, les massifs et les espaces de détente à partir de vos usages, des dimensions du terrain et de son exposition.",
      },
      {
        title: "Entretien au fil des saisons",
        text: "Taille, tonte et soin des massifs : définissons ensemble des interventions ponctuelles ou un rythme de passage adapté à votre jardin.",
      },
      {
        title: "Plantations et massifs",
        text: "Nous sélectionnons des végétaux adaptés à votre sol et à l’ensoleillement, puis vous conseillons pour leur arrosage et leur entretien.",
      },
    ],
  },
  {
    id: "beaute",
    name: "Studio Nacre",
    activity: "Beauté des ongles",
    style: "elegant",
    color: "#9d174d",
    title: "Des ongles soignés, pensés jusque dans les détails.",
    text: "Une manucure naturelle, une pose gel ou une création plus affirmée : chaque rendez-vous commence par un échange sur vos envies.",
    image: "/images/demos/studio-nacre.webp",
    imageAlt: "Manucure professionnelle dans un studio chaleureux",
    gallery: ["/images/demos/studio-nacre.webp"],
    about:
      "Studio Nacre vous reçoit sur rendez-vous dans une atmosphère calme. La technique, la forme et les couleurs sont choisies selon vos goûts, votre quotidien et la nature de vos ongles.",
    services: [
      {
        title: "Manucure naturelle",
        text: "Mise en forme, soin des cuticules et finition nette pour des mains élégantes au quotidien.",
      },
      {
        title: "Pose gel ou capsules",
        text: "Longueur, forme et construction adaptées à vos habitudes pour un résultat confortable et équilibré.",
      },
      {
        title: "Couleur et nail art",
        text: "Teintes sobres, effets délicats ou détail graphique : une finition composée selon votre style.",
      },
    ],
  },
  {
    id: "electricien",
    name: "Volt & Fils",
    activity: "Électricien",
    style: "dynamique",
    color: "#c2410c",
    title: "Une installation sûre, claire et faite pour durer.",
    text: "Panne, rénovation ou nouveau projet : un diagnostic expliqué et un chantier tenu, chez les particuliers comme dans les commerces.",
    image: "/images/demos/electricien.jpg",
    imageAlt: "Électricien en casque de chantier intervenant sur un boîtier électrique",
    gallery: ["/images/demos/electricien.jpg", "/images/demos/tableau-electrique.jpg"],
    about:
      "Chaque intervention commence par un état des lieux de votre installation. Nous expliquons ce qui doit être corrigé, ce qui peut attendre, et laissons un tableau propre et lisible.",
    services: [
      { title: "Dépannage", text: "Recherche de l’origine de la panne, remise en service et explication de ce qui s’est passé." },
      { title: "Tableau électrique", text: "Remplacement ou mise à niveau du tableau, repérage clair des circuits et contrôle des protections." },
      { title: "Rénovation complète", text: "Nouvelle distribution, prises et éclairages pensés avec vous pièce par pièce." },
    ],
  },
  {
    id: "boulangerie",
    name: "Le Fournil des Halles",
    activity: "Boulangerie",
    style: "artisan",
    color: "#b45309",
    title: "Le pain du matin, pétri et cuit sur place.",
    text: "Pains au levain, viennoiseries et gâteaux sortent du four tout au long de la journée, avec des farines choisies et des recettes simples.",
    image: "/images/demos/boulangerie.jpg",
    imageAlt: "Vitrine de boulangerie garnie de pains et de viennoiseries",
    gallery: ["/images/demos/boulangerie.jpg", "/images/demos/pain.jpg"],
    about:
      "Nos pâtes reposent longuement pour développer le goût et la conservation. La gamme évolue avec les saisons, des brioches d’hiver aux tartes aux fruits.",
    services: [
      { title: "Pains au levain", text: "Campagne, seigle, céréales : des pains à la croûte franche, pensés pour durer plusieurs jours." },
      { title: "Viennoiseries", text: "Croissants et pains au chocolat feuilletés chaque matin, au beurre." },
      { title: "Commandes et buffets", text: "Plateaux, gâteaux d’anniversaire et pains pour vos repas de fête ou d’entreprise." },
    ],
  },
  {
    id: "coach",
    name: "Élan Coaching",
    activity: "Coach sportif",
    style: "creatif",
    color: "#7c3aed",
    title: "Un programme qui part de vous, pas d’une routine toute faite.",
    text: "Remise en forme, objectif précis ou reprise en douceur : des séances adaptées à votre rythme et à votre niveau.",
    image: "/images/demos/coach.jpg",
    imageAlt: "Coach sportif présentant un programme d’entraînement à une cliente en salle",
    gallery: ["/images/demos/coach.jpg", "/images/demos/salle-sport.jpg"],
    about:
      "La première séance sert à faire le point sur vos habitudes, vos contraintes et vos envies. Le programme évolue ensuite à chaque bilan.",
    services: [
      { title: "Coaching individuel", text: "Des séances en salle, à domicile ou en extérieur, construites autour de votre objectif." },
      { title: "Petits groupes", text: "Jusqu’à six personnes pour s’entraîner ensemble avec un suivi personnalisé." },
      { title: "Bilan et programme", text: "Un point régulier sur vos progrès et un programme à suivre entre les séances." },
    ],
  },
  {
    id: "avocat",
    name: "Cabinet Ardent",
    activity: "Cabinet d’avocat",
    style: "premium",
    color: "#a16207",
    title: "Un accompagnement juridique clair, à chaque étape.",
    text: "Comprendre la situation, expliquer les options et avancer avec vous : un conseil pour les dirigeants comme pour les particuliers.",
    image: "/images/demos/reunion.jpg",
    imageAlt: "Salle de réunion avec une grande table en bois et des fauteuils",
    gallery: ["/images/demos/reunion.jpg", "/images/demos/avocat.jpg"],
    about:
      "Chaque dossier commence par un premier échange. Les démarches possibles, leurs délais et les honoraires sont présentés avant tout engagement.",
    services: [
      { title: "Droit des affaires", text: "Création de société, contrats commerciaux et accompagnement des dirigeants au quotidien." },
      { title: "Droit du travail", text: "Conseil aux employeurs et aux salariés, rédaction et relecture de documents." },
      { title: "Médiation et contentieux", text: "Recherche d’une solution amiable lorsque c’est possible, défense de vos intérêts sinon." },
    ],
  },
];
