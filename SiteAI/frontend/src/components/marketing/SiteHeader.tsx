import Link from "next/link";
import MobileNavigation from "@/components/MobileNavigation";
import Icon from "@/components/ui/Icon";
import styles from "@/app/home.module.css";

/*
 * En-tête des pages publiques (accueil, exemples). Auparavant dupliqué dans
 * chaque page : le balisage, les liens et les classes sont repris à l'identique.
 */

type SiteHeaderProps = { current?: "exemples" };

export default function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.navbar}>
        <Link href="/" className={styles.logo} aria-label="Lumio, accueil">
          lumio<span>.</span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Navigation principale">
          <Link href="/#comment-ca-marche">Comment ça marche</Link>
          <Link href="/exemples" aria-current={current === "exemples" ? "page" : undefined}>Exemples</Link>
          <Link href="/#tarifs">Tarifs</Link>
          <Link href="/#faq">Questions</Link>
        </nav>
        <div className={styles.navActions}>
          <Link href="/auth" className={styles.login}>Se connecter</Link>
          <Link href="/creer" className={styles.headerButton}>
            <span className={styles.headerCtaDesktop}>Créer mon site</span>
            <span className={styles.headerCtaMobile}>Créer</span>
            <Icon name="arrowUpRight" size={15} className={styles.arrow} />
          </Link>
        </div>
        <MobileNavigation />
      </div>
    </header>
  );
}
