"use client";
import Link from "next/link";
import { useState } from "react";
export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="md:hidden"
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
        className="rounded-xl border border-slate-600 px-3 py-3 text-sm font-bold"
      >
        {open ? "Fermer" : "Menu"}
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navigation mobile"
          className="absolute inset-x-0 top-full max-h-[75dvh] overflow-y-auto border-b border-slate-700 bg-slate-950 p-5 shadow-2xl"
        >
          {[
            { href: "/#fonctionnalites", label: "Fonctionnalités" },
            { href: "/exemples", label: "Exemples" },
            { href: "/#comment-ca-marche", label: "Comment ça marche" },
            { href: "/#tarifs", label: "Tarifs" },
            { href: "/#faq", label: "FAQ" },
            { href: "/auth", label: "Se connecter" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 font-semibold text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
