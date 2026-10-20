import Image from "next/image";
import Link from "next/link";
import MobileNavigation from "@/components/MobileNavigation";
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
  ["01", "Ton activité", "Décris ton métier, tes services et ta ville. Quelques réponses suffisent pour poser une base solide."],
  ["02", "Ton premier site", "Lumio écrit, structure et met en page une première version cohérente avec ton activité."],
  ["03", "Tes ajustements", "Tu gardes la main sur les textes, les photos, les couleurs et chaque détail avant de publier."],
];

const editorBenefits = [
  ["Textes", "Écris toi-même ou demande à l’IA de reformuler."],
  ["Apparence", "Choisis le style et les couleurs qui te ressemblent."],
  ["Publication", "Connecte ton domaine dès que ton site est prêt."],
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
            lumio<span>.</span>
          </Link>
          <nav className={styles.desktopNav} aria-label="Navigation principale">
            <a href="#comment-ca-marche">Comment ça marche</a>
            <Link href="/exemples">Exemples</Link>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/auth" className={styles.login}>Se connecter</Link>
            <Link href="/auth" className={styles.headerButton}>
              <span className={styles.headerCtaDesktop}>Créer mon site</span>
              <span className={styles.headerCtaMobile}>Créer</span>
              <Arrow />
            </Link>
          </div>
          <MobileNavigation />
        </div>
      </header>

      <main id="contenu">
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><i /> Le site qui part de ton métier</p>
              <h1>Ton activité,<br />bien présentée.<br /><em>Enfin.</em></h1>
              <p className={styles.heroLead}>
                Décris ce que tu fais. Lumio crée une première version de ton site,
                puis te laisse tout modifier avant de publier.
              </p>
              <Link href="/auth" className={styles.promptCta}>
                <span>
                  <small>Commence ici</small>
                  <strong>Ex. Plombier à Montpellier</strong>
                </span>
                <b>Créer mon aperçu <Arrow /></b>
              </Link>
              <div className={styles.heroNotes}>
                <span>Sans carte bancaire</span>
                <span>Sans coder</span>
                <span>Tu publies quand tu veux</span>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.glow} />
              <div className={`${styles.siteCard} ${styles.siteCardBack}`}>
                <div className={styles.siteCardBar}><span>Studio Nacre</span><i /></div>
                <div className={styles.backArt}><b>Des gestes précis.<br />Un style à toi.</b></div>
              </div>
              <figure className={styles.siteCard}>
                <div className={styles.siteCardBar}>
                  <span>Atelier du Robinet</span>
                  <div><i /><i /><i /></div>
                </div>
                <div className={styles.sitePreview}>
                  <p>ARTISAN PLOMBIER · MONTPELLIER</p>
                  <h2>Votre maison.<br /><em>Notre attention</em><br />au détail.</h2>
                  <span>Dépannage, installation et rénovation.</span>
                  <b>Parler de mon projet <Arrow /></b>
                </div>
                <figcaption><i /> Aperçu généré par Lumio · Exemple fictif</figcaption>
              </figure>
              <div className={styles.aiBadge}>
                <span>✦</span>
                <div><small>Assistant Lumio</small><strong>Première version prête</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.audience} aria-label="Public concerné">
          <div className={styles.audienceInner}>
            <span>Conçu pour les petites entreprises</span>
            <p>Artisans</p><i>✦</i><p>Commerçants</p><i>✦</i>
            <p>Indépendants</p><i>✦</i><p>Agences</p>
          </div>
        </section>

        <section id="comment-ca-marche" className={styles.paperSection}>
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>Comment ça marche</p>
            <h2>De quelques réponses<br />à un site qui tient debout.</h2>
            <p>Pas de page blanche ni de modèle vide. Lumio transforme les informations de ton entreprise en une vitrine prête à personnaliser.</p>
          </div>

          <div className={styles.process}>
            <div className={styles.stepList}>
              {steps.map(([number, title, text], index) => (
                <article key={number} className={index === 1 ? styles.activeStep : ""}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </article>
              ))}
            </div>

            <div className={styles.briefCard}>
              <div className={styles.briefTop}>
                <span>Ce que Lumio a compris</span>
                <b>Prêt à générer</b>
              </div>
              <dl>
                <div><dt>Entreprise</dt><dd>Atelier du Robinet</dd></div>
                <div><dt>Métier</dt><dd>Plomberie & rénovation</dd></div>
                <div><dt>Zone</dt><dd>Montpellier et alentours</dd></div>
                <div><dt>Ton</dt><dd>Clair, rassurant, local</dd></div>
              </dl>
              <div className={styles.palette}>
                <span>Direction visuelle</span>
                <i /><i /><i /><i />
              </div>
              <div className={styles.briefFooter}><span>6 réponses</span><b>Générer mon site <Arrow /></b></div>
            </div>
          </div>
        </section>

        <section className={styles.productSection}>
          <div className={styles.productHeading}>
            <p className={styles.eyebrow}><i /> Un éditeur, pas une boîte noire</p>
            <h2>Créé avec l’IA.<br /><em>Dirigé par toi.</em></h2>
            <p>La première version te fait gagner du temps. Ensuite, chaque texte, image et couleur reste sous ton contrôle.</p>
          </div>

          <div className={styles.editorShell}>
            <div className={styles.editorHeader}>
              <Link href="/" className={styles.editorLogo}>lumio.</Link>
              <span><i /> Enregistré automatiquement</span>
              <b>Aperçu en direct</b>
            </div>
            <div className={styles.editorWorkspace}>
              <aside>
                <small>Ton site</small>
                <strong>Atelier du Robinet</strong>
                <nav>
                  <span className={styles.editorActive}>✦ Assistant IA</span>
                  <span>Informations</span>
                  <span>Contenu</span>
                  <span>Apparence</span>
                  <span>Publier</span>
                </nav>
                <div className={styles.assistantBox}>
                  <small>Modifier avec l’IA</small>
                  <p>« Rends le titre plus chaleureux »</p>
                  <b>Appliquer ✦</b>
                </div>
              </aside>
              <div className={styles.editorCanvas}>
                <div className={styles.canvasToolbar}><span>Ordinateur</span><span>Tablette</span><span>Téléphone</span></div>
                <div className={styles.canvasSite}>
                  <div className={styles.canvasNav}><strong>Atelier du Robinet</strong><span>Services &nbsp; À propos &nbsp; Contact</span></div>
                  <div className={styles.canvasHero}>
                    <small>VOTRE ARTISAN DE PROXIMITÉ</small>
                    <h3>Une maison saine,<br />un travail bien fait.</h3>
                    <p>Dépannage, installation et rénovation à Montpellier.</p>
                    <b>Demander un devis</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.editorBenefits}>
            {editorBenefits.map(([title, text], index) => (
              <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section id="exemples" className={styles.examplesSection}>
          <div className={styles.examplesHead}>
            <div><p className={styles.kicker}>Exemples fictifs</p><h2>Un métier différent.<br />Une présence différente.</h2></div>
            <Link href="/exemples">Voir tous les exemples <span>→</span></Link>
          </div>
          <div className={styles.examples}>
            {demoSites.slice(0, 3).map((site, index) => (
              <Link key={site.id} href={`/exemples?metier=${site.id}`} className={styles.exampleCard}>
                <div className={styles.exampleImage}>
                  <Image src={site.image} alt={site.imageAlt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                  <span>0{index + 1}</span>
                </div>
                <div><small>{site.activity}</small><h3>{site.title}</h3><span>Explorer ce site <Arrow /></span></div>
              </Link>
            ))}
          </div>
          <p className={styles.disclaimer}>Entreprises fictives · Photographies d’illustration · Tous les contenus sont personnalisables</p>
        </section>

        <section id="tarifs" className={styles.pricingSection}>
          <div className={styles.pricingIntro}>
            <p className={styles.kicker}>Des tarifs sans surprise</p>
            <h2>Commence gratuitement.<br />Publie quand tu es convaincu.</h2>
            <p>{freePreviewText}</p>
          </div>
          <div className={styles.plans}>
            {plans.map((plan) => (
              <article key={plan.name} className={plan.highlighted ? styles.planFeatured : ""}>
                <div className={styles.planTop}>
                  <span>{plan.highlighted ? "Le plus choisi" : "Formule"}</span>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                <p className={styles.price}>{plan.price}<small>{priceSuffix}</small></p>
                <Link href="/auth">Choisir {plan.name} <Arrow /></Link>
                <ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
              </article>
            ))}
          </div>
          <p className={styles.tax}>{priceTaxText}</p>
          <p className={styles.domainNote}>{domainText}</p>
        </section>

        <section id="faq" className={styles.faqSection}>
          <div className={styles.faqIntro}>
            <p className={styles.eyebrow}><i /> Questions fréquentes</p>
            <h2>Avant de te lancer.</h2>
            <p>Le premier aperçu est gratuit. Tu décides avec un résultat concret devant les yeux.</p>
          </div>
          <div className={styles.faqList}>
            {faqs.map(([question, answer], index) => (
              <details key={question}>
                <summary><span>0{index + 1}</span>{question}<b aria-hidden="true">+</b></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <span className={styles.orbit} aria-hidden="true">✦</span>
          <p>Ton site peut commencer ici</p>
          <h2>Donne à ton activité<br />la vitrine qu’elle mérite.</h2>
          <Link href="/auth">Créer mon aperçu gratuit <Arrow /></Link>
          <small>Sans carte bancaire · Sans coder · Sans engagement</small>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><Link href="/" className={styles.logo}>lumio<span>.</span></Link><p>Ton activité. Ton style. Ton site.</p></div>
        <nav aria-label="Liens de bas de page">
          <Link href="/exemples">Exemples</Link><Link href="/pricing">Tarifs</Link><Link href="/auth">Connexion</Link>
          <Link href="/mentions-legales">Mentions légales</Link><Link href="/confidentialite">Confidentialité</Link>
          <Link href="/cgu">CGU</Link><Link href="/cgv">CGV</Link>
        </nav>
        <span>© 2026 Lumio</span>
      </footer>
    </div>
  );
}


