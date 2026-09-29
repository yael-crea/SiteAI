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
];
