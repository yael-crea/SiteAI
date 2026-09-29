"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SitePreview from "@/components/SitePreview";
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
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function ExamplesPage() {
  const [selected, setSelected] = useState("plombier");
  const example = examples.find((item) => item.id === selected) ?? examples[0];

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("metier");
    if (!requested || !examples.some((item) => item.id === requested)) return;
    const frame = window.requestAnimationFrame(() => setSelected(requested));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function selectExample(id: string) {
    setSelected(id);
    window.history.replaceState(null, "", `/exemples?metier=${id}`);
  }

  return (
    <div className={home.home}>
      <a href="#contenu" className={home.skip}>Aller au contenu</a>
      <header className={home.header}>
        <div className={home.navbar}>
          <Link className={home.logo} href="/" aria-label="Lumio, accueil"><span className={home.logoMark} aria-hidden="true">✳</span> lumio<span className={home.logoDot}>.</span></Link>
          <nav className={home.desktopNav} aria-label="Navigation principale"><Link href="/#comment-ca-marche">Comment ça marche</Link><Link href="/exemples" aria-current="page">Exemples</Link><Link href="/#tarifs">Tarifs</Link><Link href="/#faq">Questions</Link></nav>
          <div className={home.navActions}><Link className={home.login} href="/auth">Connexion</Link><Link className={home.smallButton} href="/auth">Créer mon site <Arrow /></Link></div>
        </div>
        <nav className={home.mobileNav} aria-label="Navigation mobile"><Link href="/">Accueil</Link><Link href="/exemples" aria-current="page">Exemples</Link><Link href="/#tarifs">Tarifs</Link><Link href="/auth">Connexion</Link></nav>
      </header>

      <main id="contenu">
        <section className={`${home.wrap} ${styles.intro}`} aria-labelledby="examples-title">
          <div>
            <p className={home.eyebrow}><span className={home.statusDot} /> UNE IDÉE DU RÉSULTAT</p>
            <h1 id="examples-title">Des exemples concrets.<br /><span>Ton activité ensuite.</span></h1>
          </div>
          <div className={styles.introCopy}>
            <p>Explore quatre démonstrations créées avec Lumio. Change de métier, observe le rendu et imagine ton propre contenu à la place.</p>
            <span>Entreprises fictives · Aperçus interactifs</span>
          </div>
        </section>

        <div className={styles.audience}>
          <div className={home.wrap} role="tablist" aria-label="Choisir une démonstration">
            {examples.map((item, index) => (
              <button key={item.id} type="button" role="tab" aria-selected={selected === item.id} onClick={() => selectExample(item.id)} className={selected === item.id ? styles.activeTab : undefined}>
                <span>0{index + 1}</span>{item.activity}<Arrow />
              </button>
            ))}
          </div>
        </div>

        <section className={`${home.wrap} ${styles.demoSection}`} aria-live="polite">
          <div className={styles.demoHeading}>
            <div><p className={home.eyebrow}>APERÇU INTERACTIF</p><h2>{example.name}</h2></div>
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
            <p className={styles.demoCaption}><span className={home.statusDot} /> Démonstration Lumio · Aucun message ne sera envoyé</p>
          </div>
        </section>

        <section className={`${home.wrap} ${styles.trustSection}`} aria-labelledby="trust-title">
          <div>
            <p className={home.eyebrow}>DES EXEMPLES, PAS DES PROMESSES FLOUES</p>
            <h2 id="trust-title">Tu vois le rendu avant de commencer.</h2>
          </div>
          <div className={styles.trustGrid}>
            <article><strong>01</strong><h3>Contenu modifiable</h3><p>Textes, couleurs, services et photos restent entièrement personnalisables.</p></article>
            <article><strong>02</strong><h3>Aperçu gratuit</h3><p>Tu construis et vérifies ton site avant de choisir une formule de publication.</p></article>
            <article><strong>03</strong><h3>Départ accéléré</h3><p>Choisis un modèle et retrouve son métier, son style et ses services déjà préparés.</p></article>
          </div>
          <p className={styles.disclaimer}>Les entreprises, avis et coordonnées présentés ici sont fictifs. Les photographies servent uniquement à illustrer le rendu possible.</p>
        </section>

        <section className={home.finalCta}>
          <div className={home.wrap}>
            <span className={home.eyebrow}>À TON TOUR</span>
            <h2>Maintenant, imagine<br />ton activité ici.</h2>
            <p>Donne quelques informations à Lumio et obtiens ta première version.</p>
            <Link href="/auth" className={home.primary}>Créer mon aperçu gratuit <Arrow /></Link>
            <small>Sans carte bancaire. Tu publies uniquement quand tu es prêt.</small>
          </div>
        </section>
      </main>

      <footer className={`${home.wrap} ${home.footer}`}>
        <div><Link href="/" className={home.logo}>lumio<span className={home.logoDot}>.</span></Link><p>Ton activité. Ton style. Ton site.</p></div>
        <nav aria-label="Liens de bas de page"><Link href="/exemples">Exemples</Link><Link href="/pricing">Tarifs</Link><Link href="/auth">Connexion</Link><Link href="/mentions-legales">Mentions légales</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/cgu">CGU</Link><Link href="/cgv">CGV</Link></nav>
      </footer>
    </div>
  );
}
