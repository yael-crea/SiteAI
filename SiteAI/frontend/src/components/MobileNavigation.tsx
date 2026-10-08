"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/home.module.css";

const navigationItems = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/exemples", label: "Exemples" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#faq", label: "Questions" },
  { href: "/auth", label: "Connexion" },
];

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={styles.mobileMenu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.currentTarget.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(!open)}
        className={styles.menuButton}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <span className={`${styles.menuIcon} ${open ? styles.menuIconOpen : ""}`} aria-hidden="true">
          <i /><i /><i />
        </span>
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navigation mobile"
          className={styles.mobileMenuPanel}
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
