import Image from "next/image";
import Link from "next/link";
import { demoSites } from "@/lib/demoSites";
import {
  aiUsageText,
  cancellationText,
  domainText,
  freePreviewText,
  plans,
  priceSuffix,
  priceTaxText,
} from "@/lib/commercialPlans";
import { publicMetadata } from "@/lib/seo";
import styles from "./home.module.css";

export const metadata = publicMetadata(
  "/",
  "Crée ton site professionnel avec l'IA",
  "Crée et personnalise ton site professionnel avec Lumio : génération par IA, éditeur simple et publication en ligne.",
);

const Arrow = () => <span aria-hidden="true">↗</span>;

const steps = [
  ["01", "Parle-nous de ton métier", "Ton activité, tes services, ta ville et ce qui te rend différent."],
  ["02", "Découvre ta première version", "Lumio transforme tes réponses en un site clair, structuré et crédible."],
  ["03", "Ajuste puis publie", "Change les textes, les couleurs et les photos, puis partage ton adresse."],
];

const benefits = [
  ["01", "Une base vraiment adaptée", "Le contenu part de ton activité, pas d’un modèle vide à remplir."],
  ["02", "Tout reste modifiable", "Textes, images, services, couleurs et appels à l’action évoluent avec toi."],
  ["03", "Une publication simple", "Ton aperçu reste gratuit. Tu choisis une formule seulement quand il te convient."],
];

const faqs = [
  ["Puis-je essayer avant de payer ?", freePreviewText],
  ["Est-ce que je dois savoir coder ?", "Non. Lumio est conçu pour être utilisé sans écrire une seule ligne de code."],
  ["Puis-je modifier le site après sa création ?", "Oui. Tu peux reprendre les textes, les couleurs, les photos, les services et les coordonnées à tout moment."],
  ["Puis-je utiliser mon propre domaine ?", domainText],
  ["Quelles sont les limites de l’IA ?", aiUsageText],
  ["Que devient mon site après résiliation ?", cancellationText],
];

export default function HomePage() {
  return (
    <div className={styles.home}>
      <a className={styles.skip} href="#contenu">Aller au contenu</a>

      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" className={styles.logo} aria-label="Lumio, accueil">
            <span className={styles.logoMark} aria-hidden="true">✳︎</span>
            lumio<span className={styles.logoDot}>.</span>
          </Link>
          <nav className={styles.desktopNav} aria-label="Navigation principale">
            <a href="#comment-ca-marche">Comment ça marche</a>
            <Link href="/exemples">Exemples</Link>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/auth" className={styles.login}>Connexion</Link>
            <Link href="/auth" className={styles.smallButton}>Créer mon site <Arrow /></Link>
          </div>
        </div>
        <nav className={styles.mobileNav} aria-label="Navigation mobile">
          <Link href="/exemples">Exemples</Link><a href="#tarifs">Tarifs</a><Link href="/auth">Connexion</Link>
        </nav>
      </header>

      <main id="contenu">
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}><span className={styles.statusDot} /> POUR LES INDÉPENDANTS ET PETITES ENTREPRISES</p>
            <h1>Ton métier mérite<br />un <span>vrai beau site.</span></h1>
            <p className={styles.lead}>Tu connais ton activité. Lumio t’aide à la présenter en ligne : crée ton site avec l’IA, personnalise-le et publie quand tu es prêt.</p>
            <div className={styles.actions}>
              <Link href="/auth" className={styles.primary}>Créer mon aperçu gratuit <Arrow /></Link>
              <Link href="/exemples" className={styles.secondary}>Voir les exemples <span aria-hidden="true">→</span></Link>
            </div>
            <p className={styles.reassurance}>Sans carte bancaire · Sans code · Abonnement uniquement pour publier</p>
            <div className={styles.heroFoot}><span className={styles.squiggle} aria-hidden="true">⌞</span><p><strong>Commence par voir ce que ça donne.</strong><br />Tes textes, tes couleurs, ton entreprise.</p></div>
          </div>

          <figure className={styles.showcase}>
            <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span><span>TON FUTUR SITE COMMENCE ICI</span><span aria-hidden="true">↗</span></div>
            <div className={styles.preview}>
              <div className={styles.previewNav}><strong>Atelier du Robinet<span>Plomberie · Montpellier</span></strong><span className={styles.previewPill}>Votre artisan de proximité</span></div>
              <div className={styles.previewHero}>
                <span className={styles.miniLabel}>UN SAVOIR-FAIRE, À VOTRE SERVICE</span>
                <h3>Votre maison.<br />Notre attention<br /><em>au détail.</em></h3>
                <p>Dépannage, installation et rénovation : parlons de votre projet.</p>
                <span className={styles.mockButton}>Parlons de votre projet <Arrow /></span>
              </div>
              <div className={styles.previewServices}><div><span>01</span><strong>Dépannage</strong></div><div><span>02</span><strong>Installation</strong></div><div><span>03</span><strong>Rénovation</strong></div></div>
            </div>
            <figcaption><span className={styles.statusDot} /> Exemple illustratif · Entreprise fictive</figcaption>
          </figure>
        </section>

        <section className={styles.audience} aria-label="Public concerné">
          <div className={styles.wrap}><span>PENSÉ POUR TON QUOTIDIEN</span><p>Artisans</p><span>✳</span><p>Commerçants</p><span>✳</span><p>Indépendants</p><span>✳</span><p>Petites entreprises</p></div>
        </section>

        <section id="comment-ca-marche" className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DE TON IDÉE À TON SITE</p><h2>Tu apportes le savoir-faire.<br /><span>Lumio construit la vitrine.</span></h2></div><p>Trois étapes simples pour passer d’une activité réelle à une présence en ligne qui inspire confiance.</p></div>
          <div className={styles.steps}>{steps.map(([number, title, text]) => <article key={number}><span className={styles.stepNumber}>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className={`${styles.wrap} ${styles.featureSection}`}>
          <div className={styles.editorArt} aria-hidden="true">
            <div className={styles.editorTop}><span>✳</span><strong>Ton style, simplement.</strong><span>APERÇU EN DIRECT</span></div>
            <div className={styles.editorBody}><div className={styles.colorRow}><span>Couleur principale</span><i /><i /><i /><i /></div><div className={styles.textSample}><span>TITRE PRINCIPAL</span><p>Un site qui ressemble<br /><strong>vraiment à ton métier.</strong></p></div><div className={styles.editorBottom}><span>Textes</span><span>Photos</span><span>Services</span><span>Coordonnées</span></div></div>
            <p>Chaque modification est visible immédiatement.</p>
          </div>
          <div><p className={styles.eyebrow}>FAIT POUR RESTER SIMPLE</p><h2>Professionnel devant.<br /><span>Facile à gérer derrière.</span></h2><p className={styles.featureLead}>Un éditeur clair, sans jargon technique, pensé pour t’aider à avancer sans dépendre d’un développeur.</p><ul className={styles.benefits}>{benefits.map(([number, title, text]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ul><Link href="/exemples" className={styles.textLink}>Découvrir les possibilités <span>→</span></Link></div>
        </section>

        <section id="exemples" className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DES EXEMPLES CONCRETS</p><h2>Projette-toi dans<br /><span>un vrai résultat.</span></h2></div><Link href="/exemples" className={styles.textLink}>Voir tous les exemples <span>→</span></Link></div>
          <div className={styles.examples}>{demoSites.slice(0, 3).map((site) => <Link key={site.id} href={`/exemples?metier=${site.id}`} className={styles.exampleCard}><div className={styles.examplePhoto}><Image src={site.image} alt={site.imageAlt} fill sizes="(max-width: 760px) 100vw, 33vw" /></div><div className={styles.exampleInfo}><span>DÉMONSTRATION <Arrow /></span><h3>{site.activity}</h3><p>{site.title}</p></div></Link>)}</div>
          <p className={styles.caption}>Entreprises fictives · Photographies d’illustration · Contenus entièrement personnalisables</p>
        </section>

        <section id="tarifs" className={`${styles.section} ${styles.pricing}`}>
          <div className={styles.wrap}>
            <div className={styles.centerHeading}><p className={styles.eyebrow}>DES TARIFS CLAIRS</p><h2>Commence gratuitement.<br /><span>Publie quand tu es convaincu.</span></h2><p>{freePreviewText}</p></div>
            <div className={styles.plans}>{plans.map((plan) => <article key={plan.name} className={`${styles.plan} ${plan.highlighted ? styles.highlighted : ""}`}>{plan.highlighted && <span className={styles.planBadge}>LE PLUS CHOISI</span>}<h3>{plan.name}</h3><p className={styles.planDescription}>{plan.description}</p><p className={styles.price}>{plan.price}<span>{priceSuffix}</span></p><Link href="/auth" className={styles.primary}>Choisir {plan.name} <Arrow /></Link><ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul></article>)}</div>
            <p className={styles.tax}>{priceTaxText}</p><div className={styles.pricingLinks}><span>{domainText}</span></div>
          </div>
        </section>

        <section id="faq" className={`${styles.wrap} ${styles.faq}`}>
          <div><p className={styles.eyebrow}>QUESTIONS FRÉQUENTES</p><h2>Tout ce qu’il faut savoir avant de commencer.</h2><p>Tu peux créer ton aperçu sans carte bancaire et prendre ta décision sur un résultat concret.</p></div>
          <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta}><div className={styles.wrap}><span className={styles.eyebrow}>À TON TOUR</span><h2>Ton activité mérite<br />d’être bien présentée.</h2><p>Réponds à quelques questions et découvre ta première version.</p><Link href="/auth" className={styles.primary}>Créer mon aperçu gratuit <Arrow /></Link><small>Sans carte bancaire. Tu publies uniquement quand tu es prêt.</small></div></section>
      </main>

      <footer className={`${styles.wrap} ${styles.footer}`}><div><Link href="/" className={styles.logo}>lumio<span className={styles.logoDot}>.</span></Link><p>Ton activité. Ton style. Ton site.</p></div><nav aria-label="Liens de bas de page"><Link href="/exemples">Exemples</Link><Link href="/pricing">Tarifs</Link><Link href="/auth">Connexion</Link><Link href="/mentions-legales">Mentions légales</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/cgu">CGU</Link><Link href="/cgv">CGV</Link></nav></footer>
    </div>
  );
}
