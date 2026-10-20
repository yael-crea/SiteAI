import Link from "next/link";
import styles from "@/app/home.module.css";

const navigationItems = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/exemples", label: "Exemples" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#faq", label: "Questions" },
  { href: "/auth", label: "Connexion" },
];

export default function MobileNavigation() {
  return (
    <details className={styles.mobileMenu}>
      <summary className={styles.menuButton} aria-label="Ouvrir ou fermer le menu">
        <span className={styles.menuIcon} aria-hidden="true">
          <i /><i /><i />
        </span>
      </summary>
      <nav aria-label="Navigation mobile" className={styles.mobileMenuPanel}>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>{item.label}</Link>
        ))}
      </nav>
    </details>
  );
}

