import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import Icon from "@/components/ui/Icon";
import { SITE_URL, publicMetadata } from "@/lib/seo";
import { getTradePage, tradePages } from "@/lib/tradePages";
import { tradePhotosFor } from "@/lib/tradePhotos";
import examples from "../../exemples/examples.module.css";
import home from "../../home.module.css";
import styles from "../trades.module.css";

type Props = { params: Promise<{ metier: string }> };

// Seuls les métiers rédigés existent : toute autre adresse renvoie une 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return tradePages.map((page) => ({ metier: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getTradePage((await params).metier);
  if (!page) return {};
  return publicMetadata(`/site-internet/${page.slug}`, `Site internet ${page.forTrade}`, page.description);
}

function Arrow() {
  return <Icon name="arrowUpRight" size={15} className={home.arrow} />;
}

const steps = [
  { title: "Décris ton activité", text: "Ton métier, ta ville et tes services : quelques réponses suffisent, sans compte au départ." },
  { title: "L’IA prépare ton site", text: "Textes, mise en page, design et référencement local sont générés pour ton métier. Tu modifies tout ce que tu veux." },
  { title: "Publie quand tu es prêt", text: "Tu choisis une formule uniquement pour mettre le site en ligne, avec ton adresse Lumio ou ton propre domaine." },
];

export default async function TradePage({ params }: Props) {
  const page = getTradePage((await params).metier);
  if (!page) notFound();

  const url = `${SITE_URL}/site-internet/${page.slug}`;
  const createHref = `/creer?metier=${encodeURIComponent(page.label)}`;
  const [photo] = tradePhotosFor(page.label);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Lumio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Site internet par métier", item: `${SITE_URL}/site-internet` },
          { "@type": "ListItem", position: 3, name: `Site internet ${page.forTrade}`, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className={home.home}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a href="#contenu" className={home.skip}>Aller au contenu</a>
      <SiteHeader />

      <main id="contenu">
        <section className={`${examples.wrap} ${styles.hero}`} aria-labelledby="trade-title">
          <div>
            <p className={examples.eyebrow}>Site internet {page.forTrade}</p>
            <h1 id="trade-title">
              Le site internet de {page.business}, <em>prêt en quelques minutes.</em>
            </h1>
            <p className={styles.lead}>{page.intro}</p>
            <div className={styles.actions}>
              <Link href={createHref} className={styles.primary}>Créer mon site <Arrow /></Link>
              {page.exampleId && (
                <Link href={`/exemples?metier=${page.exampleId}`} className={styles.secondary}>Voir un exemple</Link>
              )}
            </div>
            <p className={styles.note}>Gratuit pour commencer · Sans carte bancaire · Tu paies uniquement pour publier</p>
          </div>
          <div className={styles.photo}>
            <Image src={photo} alt="" fill priority sizes="(max-width: 900px) 100vw, 45vw" />
          </div>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-labelledby="searches-title">
          <div className={styles.heading}>
            <p className={examples.eyebrow}>Être trouvé</p>
            <h2 id="searches-title">Tes futurs clients <em>te cherchent déjà.</em></h2>
            <p>Ils tapent ce genre de recherche sur Google. Ton site Lumio est rédigé et structuré pour y répondre, avec ta ville et tes services.</p>
          </div>
          <ul className={styles.searches}>
            {page.searches.map((search) => <li key={search}>{search}</li>)}
          </ul>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-labelledby="content-title">
          <div className={styles.heading}>
            <p className={examples.eyebrow}>Ce que contient ton site</p>
            <h2 id="content-title">Pensé pour ton métier, <em>pas pour tout le monde.</em></h2>
          </div>
          <div className={styles.grid}>
            {page.sections.map((section) => (
              <article key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-labelledby="steps-title">
          <div className={styles.heading}>
            <p className={examples.eyebrow}>Comment ça marche</p>
            <h2 id="steps-title">Trois étapes, <em>aucune ligne de code.</em></h2>
          </div>
          <div className={styles.steps}>
            {steps.map((step, index) => (
              <article key={step.title}>
                <strong>0{index + 1}</strong>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-labelledby="faq-title">
          <div className={styles.heading}>
            <p className={examples.eyebrow}>Questions fréquentes</p>
            <h2 id="faq-title">Avant de <em>te lancer.</em></h2>
          </div>
          <div className={styles.faq}>
            {page.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-labelledby="trades-title">
          <div className={styles.heading}>
            <p className={examples.eyebrow}>Autres métiers</p>
            <h2 id="trades-title">Lumio s’adapte <em>à ton métier.</em></h2>
          </div>
          <ul className={styles.trades}>
            {tradePages.filter((item) => item.slug !== page.slug).map((item) => (
              <li key={item.slug}>
                <Link href={`/site-internet/${item.slug}`}>Site {item.forTrade} <Arrow /></Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={home.finalCta}>
          <span className={home.orbit} aria-hidden="true"><Icon name="sparkle" size={24} /></span>
          <p>À ton tour</p>
          <h2>Le site de {page.business},<br />dès aujourd’hui.</h2>
          <Link href={createHref}>Créer mon aperçu gratuit <Arrow /></Link>
          <small>Sans carte bancaire · Tu publies uniquement quand tu es prêt</small>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
