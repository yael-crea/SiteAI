"use client";

/*
 * Visite en trois temps du hero de l'accueil : le brief, le site généré,
 * puis les demandes reçues. Données d'illustration (entreprise fictive).
 *
 * - Onglets accessibles (flèches gauche/droite, Début, Fin).
 * - Avance seule toutes les 5 s, sauf : animations réduites, survol ou
 *   focus dans la visite, ou case « pause » du hero cochée (WCAG 2.2.2).
 * - Les écrans inactifs restent dans la page pour le fondu, mais sont
 *   inertes et masqués aux lecteurs d'écran.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/ui/Icon";
import styles from "@/app/home.module.css";

export type TourLead = { name: string; request: string; status: string; tone: string };

const STEP_MS = 5000;
const steps = ["Tu décris", "Lumio crée", "Les demandes arrivent"];

export default function HeroTour({ leads, pauseInputId }: { leads: TourLead[]; pauseInputId: string }) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();

  // Préférence « animations réduites » et case pause du hero (gérée en CSS ailleurs).
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const input = document.getElementById(pauseInputId) as HTMLInputElement | null;
    const sync = () => {
      setReducedMotion(query.matches);
      setPaused(Boolean(input?.checked));
    };
    sync();
    query.addEventListener("change", sync);
    input?.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      input?.removeEventListener("change", sync);
    };
  }, [pauseInputId]);

  const running = !reducedMotion && !paused && !hovered;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % steps.length), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [running, active]);

  function select(index: number, focus = false) {
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = steps.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      select(keys[event.key], true);
    }
  }

  const panelProps = (index: number) => ({
    id: `${baseId}-panel-${index}`,
    role: "tabpanel",
    "aria-labelledby": `${baseId}-tab-${index}`,
    "aria-hidden": index !== active,
    inert: index !== active,
    "data-active": index === active || undefined,
    className: styles.tourPanel,
  });

  return (
    <div
      className={styles.tour}
      data-running={running || undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <div className={styles.tourTabs} role="tablist" aria-label="Lumio en trois étapes">
        {steps.map((label, index) => (
          <button
            key={label}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${baseId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls={`${baseId}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={onTabKeyDown}
          >
            <span aria-hidden="true">{index + 1}</span>
            <span className={styles.tourLabel}>{label}</span>
            {/* Barre de progression de l'étape en cours (décorative) */}
            <i key={index === active ? `run-${active}` : "idle"} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className={styles.tourStage}>
        <div {...panelProps(0)}>
          <div className={`${styles.briefCard} ${styles.tourBrief}`}>
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
          </div>
        </div>

        <div {...panelProps(1)}>
          <figure className={styles.siteCard}>
            <div className={styles.siteCardBar}>
              <span>Atelier du Robinet</span>
              <div><i /><i /><i /></div>
            </div>
            <div className={styles.sitePreview}>
              <p>ARTISAN PLOMBIER · MONTPELLIER</p>
              <h2>Votre maison.<br /><em>Notre attention</em><br />au détail.</h2>
              <span>Dépannage, installation et rénovation.</span>
              <b>Parler de mon projet <Icon name="arrowUpRight" size={15} className={styles.arrow} /></b>
            </div>
          </figure>
        </div>

        <div {...panelProps(2)}>
          <div className={styles.tourLeads}>
            <div className={styles.briefTop}>
              <span>Demandes reçues cette semaine</span>
              <b>3 demandes</b>
            </div>
            <ul className={styles.leadList}>
              {leads.map((lead) => (
                <li key={lead.name}>
                  <span className={styles.leadAvatar} aria-hidden="true">{lead.name.charAt(0)}</span>
                  <span className={styles.leadText}><strong>{lead.name}</strong><small>{lead.request}</small></span>
                  <span className={styles.leadStatus} data-tone={lead.tone}>{lead.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className={styles.tourCaption}><i aria-hidden="true" /> Exemple fictif · Aperçu de l&apos;interface Lumio</p>
    </div>
  );
}
