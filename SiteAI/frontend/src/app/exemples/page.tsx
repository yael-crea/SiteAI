"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SitePreview from "@/components/SitePreview";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import Icon from "@/components/ui/Icon";
import type { DesignStyle } from "@/lib/designStyles";
import { rememberExampleTemplate } from "@/lib/exampleTemplates";
import home from "../home.module.css";
import styles from "./examples.module.css";

type Example = {
  id: string;
  name: string;
  activity: string;
  city: string;
  style: DesignStyle;
  color: string;
  eyebrow: string;
  title: string;
  text: string;
  primaryCta: string;
  secondaryCta: string;
  aboutTitle: string;
  aboutText: string;
  contactTitle: string;
  contactText: string;
  services: { title: string; text: string }[];
  benefits: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  testimonial: { name: string; role: string; text: string };
  image: string;
  imageAlt: string;
  gallery: string[];
};

const examples: Example[] = [
  {
    id: "plombier", name: "Atelier du Robinet", activity: "Plombier", city: "Montpellier", style: "moderne", color: "#1d4ed8",
    eyebrow: "PLOMBERIE SOIGNÉE · INTERVENTION LOCALE", title: "Votre maison mérite un travail net, fiable et durable.",
    text: "Dépannage, installation ou rénovation : nous prenons le temps de comprendre votre besoin et de vous proposer une solution claire, sans mauvaise surprise.",
    primaryCta: "Demander un devis", secondaryCta: "Voir nos interventions", aboutTitle: "Le bon diagnostic avant le premier coup de clé.",
    aboutText: "Atelier du Robinet accompagne les particuliers autour de Montpellier avec une approche simple : écouter, expliquer et intervenir proprement. Chaque chantier commence par un échange précis sur votre installation.",
    contactTitle: "Un projet ou une urgence à nous présenter ?", contactText: "Décrivez votre besoin en quelques lignes. Nous revenons vers vous avec les premières informations utiles et la prochaine étape.",
    services: [
      { title: "Recherche de fuite", text: "Localisation méthodique de l’origine du problème, explication du diagnostic et proposition d’intervention adaptée." },
      { title: "Installation sanitaire", text: "Pose et remplacement de robinetterie, vasques, WC et équipements avec des finitions propres et durables." },
      { title: "Rénovation de salle de bain", text: "Un accompagnement clair pour repenser les arrivées d’eau, les évacuations et les équipements de votre pièce." },
    ],
    benefits: [
      { title: "Un échange clair", text: "Vous savez ce qui est prévu avant le début de l’intervention." },
      { title: "Un chantier respecté", text: "Protection des lieux, travail organisé et finitions vérifiées." },
      { title: "Un artisan joignable", text: "Un interlocuteur unique du premier contact à la fin du chantier." },
    ],
    faq: [
      { question: "Intervenez-vous pour une fuite urgente ?", answer: "Oui, selon les disponibilités. Décrivez la situation dans votre demande afin que nous puissions évaluer la priorité." },
      { question: "Le devis est-il expliqué avant les travaux ?", answer: "Oui. Les prestations envisagées et les principales étapes sont présentées avant votre décision." },
    ],
    testimonial: { name: "Claire M.", role: "Rénovation de salle de bain", text: "Des explications simples, un chantier propre et un résultat exactement comme prévu." },
    image: "/images/demos/plomberie.jpg",
    imageAlt: "Salle de bain lumineuse avec baignoire et robinetterie",
    gallery: ["/images/demos/plomberie.jpg", "/images/demos/salle-de-bain.jpg"],
  },
  {
    id: "restaurant", name: "Maison Sève", activity: "Restaurant", city: "Nîmes", style: "tradition", color: "#7c2d12",
    eyebrow: "CUISINE DE SAISON · TABLE DE QUARTIER", title: "Une cuisine sincère, guidée par le marché et l’envie.",
    text: "À midi comme le soir, Maison Sève compose une carte courte autour des produits du moment, servie dans une atmosphère chaleureuse et sans cérémonie.",
    primaryCta: "Réserver une table", secondaryCta: "Découvrir la carte", aboutTitle: "Une maison vivante, une carte qui suit les saisons.",
    aboutText: "Notre cuisine célèbre les producteurs proches, les cuissons justes et les assiettes généreuses. La carte évolue régulièrement pour garder le plaisir de la découverte.",
    contactTitle: "Une table, un déjeuner d’équipe ou un dîner à organiser ?", contactText: "Indiquez votre date, le nombre de personnes et vos éventuelles contraintes. Notre équipe vous répond rapidement.",
    services: [
      { title: "Déjeuner du marché", text: "Une formule courte et renouvelée, pensée pour bien déjeuner sans perdre son après-midi." },
      { title: "Dîner à la carte", text: "Des assiettes de saison, une sélection de vins vivants et le temps de profiter de la soirée." },
      { title: "Tables de groupe", text: "Un menu préparé avec vous pour les repas d’équipe, anniversaires et moments à célébrer." },
    ],
    benefits: [
      { title: "Produits choisis", text: "Une carte construite autour des arrivages et des producteurs partenaires." },
      { title: "Cuisine sur place", text: "Des préparations réalisées dans notre cuisine, avec précision et simplicité." },
      { title: "Accueil attentif", text: "Régimes et allergies pris en compte lorsque vous nous prévenez à l’avance." },
    ],
    faq: [
      { question: "Proposez-vous des options végétariennes ?", answer: "Oui, la carte comporte toujours une proposition végétarienne pensée comme un plat à part entière." },
      { question: "Peut-on réserver pour un groupe ?", answer: "Oui. Contactez-nous avec la date et le nombre de personnes pour recevoir une proposition adaptée." },
    ],
    testimonial: { name: "Julien R.", role: "Client du quartier", text: "Une carte courte, des assiettes précises et une équipe qui donne envie de revenir." },
    image: "/images/demos/restaurant.jpg",
    imageAlt: "Salle de restaurant chaleureuse prête à accueillir les convives",
    gallery: ["/images/demos/restaurant.jpg", "/images/demos/plat.jpg"],
  },
  {
    id: "beaute", name: "Studio Nacre", activity: "Beauté des ongles", city: "Montpellier", style: "elegant", color: "#9d174d",
    eyebrow: "MANUCURE · SOIN · FINITIONS PERSONNALISÉES", title: "Des ongles soignés, pensés jusque dans les détails.",
    text: "Studio Nacre vous reçoit sur rendez-vous pour des prestations délicates et personnalisées, du naturel impeccable aux créations plus affirmées.",
    primaryCta: "Prendre rendez-vous", secondaryCta: "Voir les prestations", aboutTitle: "Un moment pour vous, un résultat qui vous ressemble.",
    aboutText: "Chaque rendez-vous commence par un échange sur vos envies, votre quotidien et l’état de vos ongles. Les produits et la technique sont ensuite choisis pour obtenir un résultat harmonieux.",
    contactTitle: "Quelle prestation vous ferait plaisir ?", contactText: "Indiquez vos envies, la longueur souhaitée et, si vous le savez déjà, le style ou les couleurs que vous aimez.",
    services: [
      { title: "Manucure naturelle", text: "Mise en forme, soin des cuticules et finition nette pour des mains élégantes au quotidien." },
      { title: "Pose gel ou capsules", text: "Longueur, forme et construction adaptées à vos habitudes pour un résultat confortable et équilibré." },
      { title: "Couleur & nail art", text: "Teintes sobres, effets délicats ou détail graphique : une finition composée selon votre style." },
    ],
    benefits: [
      { title: "Conseil personnalisé", text: "La prestation est choisie selon vos envies et la nature de vos ongles." },
      { title: "Gestes précis", text: "Chaque étape est réalisée avec attention, de la préparation à la finition." },
      { title: "Rendez-vous serein", text: "Un créneau réservé pour vous, dans une atmosphère calme et accueillante." },
    ],
    faq: [
      { question: "Combien de temps tient une pose ?", answer: "La tenue dépend de la technique, de la repousse et de votre quotidien. Un remplissage est généralement conseillé après quelques semaines." },
      { question: "Puis-je venir avec une idée de couleur ?", answer: "Bien sûr. Une photo d’inspiration aide à choisir ensemble la teinte, la forme et le niveau de détail." },
    ],
    testimonial: { name: "Inès D.", role: "Cliente régulière", text: "Toujours de bons conseils, un travail très fin et une tenue impeccable." },
    image: "/images/demos/studio-nacre.webp",
    imageAlt: "Manucure professionnelle dans un studio chaleureux",
    gallery: ["/images/demos/studio-nacre.webp"],
  },
  {
    id: "paysagiste", name: "Les Jardins Clairs", activity: "Paysagiste", city: "Montpellier", style: "nature", color: "#3f6212",
    eyebrow: "CONCEPTION · PLANTATIONS · ENTRETIEN", title: "Un jardin à vivre, au rythme des saisons.",
    text: "Un coin d’ombre, une terrasse fleurie ou un jardin à repenser : imaginons un extérieur adapté à vos envies, à votre terrain et au temps que vous souhaitez y consacrer.",
    primaryCta: "Demander une visite", secondaryCta: "Voir nos jardins", aboutTitle: "Des extérieurs pensés pour durer et évoluer.",
    aboutText: "Les Jardins Clairs conçoivent des espaces où il fait bon passer du temps. Nous observons l’exposition, le sol et les usages avant de proposer un aménagement équilibré et facile à entretenir.",
    contactTitle: "Quel extérieur aimeriez-vous transformer ?", contactText: "Présentez votre terrain, vos envies et votre commune. Nous vous recontactons pour organiser une première visite.",
    services: [
      { title: "Aménagement de jardin", text: "Organisation des allées, massifs et espaces de détente en fonction de vos usages et de votre terrain." },
      { title: "Entretien saisonnier", text: "Taille, tonte et soin des massifs avec un rythme de passage adapté aux besoins du jardin." },
      { title: "Plantations et massifs", text: "Choix de végétaux adaptés au sol et à l’exposition, puis conseils pour leur arrosage et leur entretien." },
    ],
    benefits: [
      { title: "Projet sur mesure", text: "Les choix sont guidés par votre terrain, vos usages et votre budget." },
      { title: "Végétaux adaptés", text: "Des plantations choisies pour leur exposition et leur développement futur." },
      { title: "Suivi clair", text: "Un interlocuteur du premier croquis jusqu’aux conseils d’entretien." },
    ],
    faq: [
      { question: "Pouvez-vous intervenir sur un petit jardin ?", answer: "Oui. Une petite surface peut être structurée pour gagner en confort, en intimité et en facilité d’entretien." },
      { question: "Proposez-vous aussi l’entretien ?", answer: "Oui, ponctuellement ou selon un calendrier défini ensemble en fonction des saisons." },
    ],
    testimonial: { name: "Sophie L.", role: "Aménagement d’un jardin de ville", text: "Le projet respecte vraiment notre façon de vivre dehors et reste simple à entretenir." },
    image: "/images/demos/jardin.jpg",
    imageAlt: "Jardin contemporain avec pelouse et plantations",
    gallery: ["/images/demos/jardin.jpg", "/images/demos/plantations.jpg"],
  },
  {
    id: "electricien", name: "Volt & Fils", activity: "Électricien", city: "Toulouse", style: "dynamique", color: "#c2410c",
    eyebrow: "ÉLECTRICITÉ GÉNÉRALE · MISE EN SÉCURITÉ", title: "Une installation sûre, claire et faite pour durer.",
    text: "Panne, rénovation ou nouveau projet : Volt & Fils intervient chez les particuliers et les commerces avec un diagnostic expliqué et un chantier tenu.",
    primaryCta: "Demander un devis", secondaryCta: "Voir nos services", aboutTitle: "Comprendre avant de brancher.",
    aboutText: "Chaque intervention commence par un état des lieux de votre installation. Nous vous expliquons ce qui doit être corrigé, ce qui peut attendre, et nous laissons un tableau propre et lisible après notre passage.",
    contactTitle: "Une panne ou un projet électrique ?", contactText: "Décrivez la situation ou les travaux envisagés. Nous revenons vers vous pour fixer un rendez-vous ou préparer un devis.",
    services: [
      { title: "Dépannage", text: "Recherche de l’origine de la panne, remise en service et explication de ce qui s’est passé." },
      { title: "Tableau électrique", text: "Remplacement ou mise à niveau du tableau, repérage clair des circuits et contrôle des protections." },
      { title: "Rénovation complète", text: "Nouvelle distribution, prises et éclairages pensés avec vous pièce par pièce." },
    ],
    benefits: [
      { title: "Diagnostic expliqué", text: "Vous savez ce qui est fait et pourquoi, avant le début des travaux." },
      { title: "Chantier propre", text: "Protection des sols, saignées refermées et pièces rendues en ordre." },
      { title: "Un seul interlocuteur", text: "La même équipe du premier appel à la mise en service." },
    ],
    faq: [
      { question: "Intervenez-vous en urgence ?", answer: "Oui, selon les disponibilités. Indiquez dans votre demande si l’électricité est coupée pour que nous puissions vous répondre en priorité." },
      { question: "Faut-il refaire toute l’installation ?", answer: "Pas forcément. Le diagnostic permet de distinguer les corrections nécessaires des améliorations possibles." },
    ],
    testimonial: { name: "Nadia K.", role: "Rénovation d’appartement", text: "Des explications claires, un tableau enfin lisible et une équipe ponctuelle." },
    image: "/images/demos/electricien.jpg",
    imageAlt: "Électricien en casque de chantier intervenant sur un boîtier électrique",
    gallery: ["/images/demos/electricien.jpg", "/images/demos/tableau-electrique.jpg"],
  },
  {
    id: "boulangerie", name: "Le Fournil des Halles", activity: "Boulangerie", city: "Lyon", style: "artisan", color: "#b45309",
    eyebrow: "PAINS AU LEVAIN · VIENNOISERIES · DEPUIS LE QUARTIER", title: "Le pain du matin, pétri et cuit sur place.",
    text: "Au Fournil des Halles, les pains au levain, viennoiseries et gâteaux sortent du four tout au long de la journée, avec des farines choisies et des recettes simples.",
    primaryCta: "Commander pour un événement", secondaryCta: "Découvrir nos pains", aboutTitle: "Du temps, de la farine et un four qui ne s’arrête pas.",
    aboutText: "Nos pâtes reposent longuement pour développer le goût et la conservation. La gamme évolue avec les saisons : brioches en hiver, tartes aux fruits dès les beaux jours.",
    contactTitle: "Un buffet, une commande ou une question ?", contactText: "Indiquez la date, le nombre de personnes et vos envies. Nous vous confirmons la commande et l’heure de retrait.",
    services: [
      { title: "Pains au levain", text: "Campagne, seigle, céréales : des pains à la croûte franche, pensés pour durer plusieurs jours." },
      { title: "Viennoiseries", text: "Croissants et pains au chocolat feuilletés chaque matin, au beurre." },
      { title: "Commandes et buffets", text: "Plateaux, gâteaux d’anniversaire et pains pour vos repas de fête ou d’entreprise." },
    ],
    benefits: [
      { title: "Fait sur place", text: "Pétrissage, façonnage et cuisson au fournil, à la vue des clients." },
      { title: "Farines choisies", text: "Des meuniers sélectionnés et des recettes courtes." },
      { title: "Commande simple", text: "Une demande en ligne, une confirmation, un retrait à l’heure prévue." },
    ],
    faq: [
      { question: "Peut-on réserver du pain ?", answer: "Oui. Passez votre commande la veille pour un retrait le lendemain matin." },
      { question: "Proposez-vous des produits sans lactose ?", answer: "Une partie de nos pains n’en contient pas. Demandez-nous la liste des ingrédients en boutique ou dans votre message." },
    ],
    testimonial: { name: "Marc T.", role: "Client du quartier", text: "Un pain au levain qui tient toute la semaine et un accueil toujours souriant." },
    image: "/images/demos/boulangerie.jpg",
    imageAlt: "Vitrine de boulangerie garnie de pains et de viennoiseries",
    gallery: ["/images/demos/boulangerie.jpg", "/images/demos/pain.jpg"],
  },
  {
    id: "coach", name: "Élan Coaching", activity: "Coach sportif", city: "Bordeaux", style: "creatif", color: "#7c3aed",
    eyebrow: "COACHING INDIVIDUEL · PETITS GROUPES · REPRISE DU SPORT", title: "Un programme qui part de vous, pas d’une routine toute faite.",
    text: "Remise en forme, préparation d’un objectif ou reprise en douceur : Élan Coaching construit avec vous des séances adaptées à votre rythme et à votre niveau.",
    primaryCta: "Réserver une séance découverte", secondaryCta: "Voir les formules", aboutTitle: "Progresser sans se blesser, et avec plaisir.",
    aboutText: "La première séance sert à faire le point sur vos habitudes, vos contraintes et vos envies. Le programme évolue ensuite à chaque bilan, pour que les progrès restent visibles et motivants.",
    contactTitle: "Envie de vous y remettre ?", contactText: "Présentez votre objectif et vos disponibilités. Nous vous proposons un créneau pour une séance découverte.",
    services: [
      { title: "Coaching individuel", text: "Des séances en salle, à domicile ou en extérieur, construites autour de votre objectif." },
      { title: "Petits groupes", text: "Jusqu’à six personnes pour s’entraîner ensemble avec un suivi personnalisé." },
      { title: "Bilan et programme", text: "Un point régulier sur vos progrès et un programme à suivre entre les séances." },
    ],
    benefits: [
      { title: "Séances adaptées", text: "Exercices choisis selon votre niveau, votre corps et votre emploi du temps." },
      { title: "Suivi régulier", text: "Des bilans pour mesurer les progrès et ajuster le programme." },
      { title: "Motivation durable", text: "Des objectifs concrets et atteignables, étape par étape." },
    ],
    faq: [
      { question: "Faut-il déjà être sportif ?", answer: "Non. Les séances sont adaptées à tous les niveaux, y compris pour une reprise après une longue pause." },
      { question: "Où se déroulent les séances ?", answer: "En salle partenaire, à domicile ou en extérieur, selon la formule choisie ensemble." },
    ],
    testimonial: { name: "Laura B.", role: "Reprise du sport", text: "Des séances variées, un vrai suivi et enfin l’envie de continuer." },
    image: "/images/demos/coach.jpg",
    imageAlt: "Coach sportif présentant un programme d’entraînement à une cliente en salle",
    gallery: ["/images/demos/coach.jpg", "/images/demos/salle-sport.jpg"],
  },
  {
    id: "avocat", name: "Cabinet Ardent", activity: "Cabinet d’avocat", city: "Paris", style: "premium", color: "#a16207",
    eyebrow: "CONSEIL · ACCOMPAGNEMENT · DROIT DES ENTREPRISES ET DES PARTICULIERS", title: "Un accompagnement juridique clair, à chaque étape.",
    text: "Le Cabinet Ardent conseille les dirigeants et les particuliers avec une méthode simple : comprendre la situation, expliquer les options et avancer avec vous.",
    primaryCta: "Demander un rendez-vous", secondaryCta: "Nos domaines d’intervention", aboutTitle: "Des réponses compréhensibles, sans jargon inutile.",
    aboutText: "Chaque dossier commence par un premier échange pour cerner votre situation. Nous vous présentons ensuite les démarches possibles, leurs délais et leurs honoraires avant tout engagement.",
    contactTitle: "Une question juridique à nous soumettre ?", contactText: "Décrivez brièvement votre situation. Nous vous recontactons pour convenir d’un premier rendez-vous.",
    services: [
      { title: "Droit des affaires", text: "Création de société, contrats commerciaux et accompagnement des dirigeants au quotidien." },
      { title: "Droit du travail", text: "Conseil aux employeurs et aux salariés, rédaction et relecture de documents." },
      { title: "Médiation et contentieux", text: "Recherche d’une solution amiable lorsque c’est possible, défense de vos intérêts sinon." },
    ],
    benefits: [
      { title: "Honoraires annoncés", text: "Une convention d’honoraires claire avant le début de la mission." },
      { title: "Interlocuteur dédié", text: "Un avocat qui suit votre dossier du début à la fin." },
      { title: "Explications claires", text: "Chaque étape est expliquée en langage simple." },
    ],
    faq: [
      { question: "Comment se passe le premier rendez-vous ?", answer: "Il permet de comprendre votre situation et de vous présenter les options possibles. Ses conditions vous sont indiquées lors de la prise de rendez-vous." },
      { question: "Recevez-vous en visioconférence ?", answer: "Oui, les rendez-vous peuvent avoir lieu au cabinet ou à distance, selon votre préférence." },
    ],
    testimonial: { name: "Thomas G.", role: "Dirigeant d’entreprise", text: "Des conseils précis et une vraie disponibilité, même pour les questions du quotidien." },
    image: "/images/demos/reunion.jpg",
    imageAlt: "Salle de réunion avec une grande table en bois et des fauteuils",
    gallery: ["/images/demos/reunion.jpg", "/images/demos/avocat.jpg"],
  },
];

function Arrow() {
  return <Icon name="arrowUpRight" size={15} className={home.arrow} />;
}

export default function ExamplesPage() {
  const [selected, setSelected] = useState("plombier");
  const example = examples.find((item) => item.id === selected) ?? examples[0];
  const demoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("metier");
    if (!requested || !examples.some((item) => item.id === requested)) return;
    // Arrivée depuis un lien « Voir ce site » : on amène directement à l'aperçu demandé.
    const frame = window.requestAnimationFrame(() => {
      setSelected(requested);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      demoRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function selectExample(id: string) {
    setSelected(id);
    window.history.replaceState(null, "", `/exemples?metier=${id}`);
  }

  return (
    <div className={home.home}>
      <a href="#contenu" className={home.skip}>Aller au contenu</a>
      <SiteHeader current="exemples" />

      <main id="contenu">
        <section className={`${styles.wrap} ${styles.intro}`} aria-labelledby="examples-title">
          <div>
            <p className={styles.eyebrow}>Une idée du résultat</p>
            <h1 id="examples-title">Des exemples concrets.<br /><em>Ton activité ensuite.</em></h1>
          </div>
          <div className={styles.introCopy}>
            <p>Explore huit démonstrations créées avec Lumio. Change de métier, observe le rendu et imagine ton propre contenu à la place.</p>
            <span>Entreprises fictives · Aperçus interactifs</span>
          </div>
        </section>

        <div className={styles.audience}>
          <div className={styles.wrap} role="tablist" aria-label="Choisir une démonstration">
            {examples.map((item, index) => (
              <button key={item.id} type="button" role="tab" aria-selected={selected === item.id} onClick={() => selectExample(item.id)} className={selected === item.id ? styles.activeTab : undefined}>
                <span>0{index + 1}</span>{item.activity}<Arrow />
              </button>
            ))}
          </div>
        </div>

        <section ref={demoRef} id="apercu" className={`${styles.wrap} ${styles.demoSection}`} aria-live="polite">
          <div className={styles.demoHeading}>
            <div><p className={styles.eyebrow}>Aperçu interactif</p><h2>{example.name}</h2></div>
            <div className={styles.demoActions}>
              <p>{example.activity} · {example.city}<br /><span>Fais défiler le site dans la fenêtre.</span></p>
              <Link
                href={`/auth?modele=${example.id}`}
                className={styles.templateButton}
                onClick={() => rememberExampleTemplate(example.id)}
              >
                Utiliser ce modèle <Arrow />
              </Link>
            </div>
          </div>

          <div className={styles.browserFrame}>
            <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span><strong>{example.name.toLowerCase().replaceAll(" ", "-")}.lumio.site</strong><span aria-hidden="true">↗</span></div>
            <div className={styles.previewWindow} onClickCapture={(event) => { const anchor = (event.target as HTMLElement).closest('a[href^="tel:"], a[href^="mailto:"]'); if (anchor) event.preventDefault(); }}>
              <SitePreview key={example.id} previewOnly designStyle={example.style} accentColor={example.color} activity={example.activity} city={example.city} site={{
                businessName: example.name, slug: "", metaTitle: example.name, metaDescription: example.text,
                heroEyebrow: example.eyebrow, heroTitle: example.title, heroText: example.text,
                primaryCta: example.primaryCta, secondaryCta: example.secondaryCta, phone: "", logoUrl: "", heroImageUrl: example.image, gallery: example.gallery,
                sections: example.services,
                benefits: example.benefits,
                faq: example.faq,
                testimonials: [example.testimonial],
                aboutTitle: example.aboutTitle, aboutText: example.aboutText,
                hiddenBlocks: [], contactTitle: example.contactTitle, contactText: example.contactText,
                serviceArea: example.city,
                openingHours: "Sur rendez-vous",
              }} />
            </div>
            <p className={styles.demoCaption}>Démonstration Lumio · Aucun message ne sera envoyé</p>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.trustSection}`} aria-labelledby="trust-title">
          <div>
            <p className={styles.eyebrow}>Des exemples, pas des promesses floues</p>
            <h2 id="trust-title">Tu vois le rendu <em>avant de commencer.</em></h2>
          </div>
          <div className={styles.trustGrid}>
            <article><strong>01</strong><h3>Contenu modifiable</h3><p>Textes, couleurs, services et photos restent entièrement personnalisables.</p></article>
            <article><strong>02</strong><h3>Aperçu gratuit</h3><p>Tu construis et vérifies ton site avant de choisir une formule de publication.</p></article>
            <article><strong>03</strong><h3>Départ accéléré</h3><p>Choisis un modèle et retrouve son métier, son style et ses services déjà préparés.</p></article>
          </div>
          <p className={styles.disclaimer}>Les entreprises, avis et coordonnées présentés ici sont fictifs. Les photographies servent uniquement à illustrer le rendu possible.</p>
        </section>

        <section className={home.finalCta}>
          <span className={home.orbit} aria-hidden="true"><Icon name="sparkle" size={24} /></span>
          <p>À ton tour</p>
          <h2>Maintenant, imagine<br />ton activité ici.</h2>
          <Link href="/creer">Créer mon aperçu gratuit <Arrow /></Link>
          <small>Sans carte bancaire · Tu publies uniquement quand tu es prêt</small>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
