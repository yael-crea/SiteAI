import Link from "next/link";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import Icon from "@/components/ui/Icon";
import { publicMetadata } from "@/lib/seo";
import { tradePages } from "@/lib/tradePages";
import examples from "../exemples/examples.module.css";
import home from "../home.module.css";
import styles from "./trades.module.css";

export const metadata = publicMetadata(
  "/site-internet",
  "Site internet par métier : artisans, commerces et indépendants",
  "Plombier, électricien, coiffeur, restaurant, photographe… Découvre comment Lumio crée avec l’IA un site internet adapté à ton métier.",
);

function Arrow() {
  return <Icon name="arrowUpRight" size={15} className={home.arrow} />;
}

export default function TradePagesIndex() {
  return (
    <div className={home.home}>
      <a href="#contenu" className={home.skip}>Aller au contenu</a>
      <SiteHeader />

      <main id="contenu">
        <section className={`${examples.wrap} ${examples.intro}`} aria-labelledby="index-title">
          <div>
            <p className={examples.eyebrow}>Site internet par métier</p>
            <h1 id="index-title">Un site pensé <em>pour ton métier.</em></h1>
          </div>
          <div className={examples.introCopy}>
            <p>Textes, sections et référencement changent d’un métier à l’autre. Choisis le tien pour voir ce que Lumio prépare pour toi.</p>
            <span>Ton métier n’est pas dans la liste ? Lumio en connaît des centaines : décris-le simplement à la création.</span>
          </div>
        </section>

        <section className={`${examples.wrap} ${styles.section}`} aria-label="Métiers">
          <ul className={styles.trades}>
            {tradePages.map((page) => (
              <li key={page.slug}>
                <Link href={`/site-internet/${page.slug}`}>Site {page.forTrade} <Arrow /></Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={home.finalCta}>
          <span className={home.orbit} aria-hidden="true"><Icon name="sparkle" size={24} /></span>
          <p>Tous les métiers</p>
          <h2>Décris ton activité,<br />Lumio fait le reste.</h2>
          <Link href="/creer">Créer mon aperçu gratuit <Arrow /></Link>
          <small>Sans carte bancaire · Tu publies uniquement quand tu es prêt</small>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
