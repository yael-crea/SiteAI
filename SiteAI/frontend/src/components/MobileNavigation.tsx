"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/app/home.module.css";

const navigationItems = [
  { href: "/#s1", label: "Comment ça marche" },
  { href: "/exemples", label: "Exemples" },
  { href: "/#s4", label: "Tarifs" },
  { href: "/#faq", label: "Questions" },
  { href: "/auth", label: "Connexion" },
];

/*
 * Menu mobile basé sur <details> : il reste utilisable sans JavaScript.
 * Une fois le script chargé, il se referme aussi au choix d'un lien, avec la
 * touche Échap (le focus revient sur le bouton) et au toucher hors du menu.
 */
export default function MobileNavigation() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const close = (restoreFocus: boolean) => {
      if (!menu.open) return;
      menu.open = false;
      if (restoreFocus) menu.querySelector("summary")?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) close(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <details ref={menuRef} className={styles.mobileMenu}>
      <summary className={styles.menuButton} aria-label="Ouvrir ou fermer le menu">
        <span className={styles.menuIcon} aria-hidden="true">
          <i /><i /><i />
        </span>
      </summary>
      <nav aria-label="Navigation mobile" className={styles.mobileMenuPanel}>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => { if (menuRef.current) menuRef.current.open = false; }}>
            {item.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
