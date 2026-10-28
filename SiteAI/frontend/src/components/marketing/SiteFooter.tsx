import Link from "next/link";
import styles from "@/app/home.module.css";

/*
 * Pied de page des pages publiques, organisé en colonnes.
 * « Tarifs » pointe vers la section de l'accueil : /pricing est réservé aux
 * comptes connectés et renvoyait les visiteurs vers la connexion.
 */

const columns = [
  {
    title: "Produit",
    links: [
      { href: "/#comment-ca-marche", label: "Comment ça marche" },
      { href: "/exemples", label: "Exemples" },
      { href: "/#tarifs", label: "Tarifs" },
      { href: "/#faq", label: "Questions fréquentes" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/auth", label: "Se connecter" },
      { href: "/auth", label: "Créer mon site" },
      { href: "mailto:support@lumio.business", label: "Support" },
    ],
  },
  {
    title: "Informations légales",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/cgu", label: "CGU" },
      { href: "/cgv", label: "CGV" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Link href="/" className={styles.logo} aria-label="Lumio, accueil">lumio<span>.</span></Link>
        <p>Ton activité. Ton style. Ton site.</p>
      </div>
      <nav className={styles.footerColumns} aria-label="Liens de bas de page">
        {columns.map((column) => (
          <div key={column.title}>
            <p>{column.title}</p>
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? <a href={link.href}>{link.label}</a> : <Link href={link.href}>{link.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.footerBottom}>
        <span>© 2026 Lumio</span>
        <span>Prix affichés hors taxes · Paiement sécurisé par Stripe</span>
      </div>
    </footer>
  );
}
