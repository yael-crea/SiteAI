// Animations des sites clients (réglages designSettings.motion et
// heroBackground), en CSS pur : aucun JavaScript ajouté au site publié.
//
// - Tout est dans prefers-reduced-motion: no-preference : un visiteur qui a
//   demandé moins d'animations voit un site fixe.
// - Les apparitions au défilement utilisent animation-timeline: view()
//   (Chrome, Edge, Safari récents) ; ailleurs, le contenu s'affiche
//   simplement, sans effet.
// - Les keyframes n'ont qu'un état de départ et un fill-mode « backwards » :
//   une fois l'animation finie, les styles habituels (survols, ombres)
//   reprennent la main.
// - Les fonds animés du haut de site sont un pseudo-élément placé sous le
//   contenu (z-index -1 dans le contexte isolé de la section).
// Toutes les valeurs viennent de choix fixes ; aucune saisie n'est injectée.
export const siteMotionCSS = `
@keyframes siteai-rise { from { opacity: 0; transform: translateY(var(--siteai-rise, 24px)); } }
@keyframes siteai-reveal { from { opacity: 0; transform: translateY(var(--siteai-rise, 24px)) scale(var(--siteai-reveal-scale, 1)); } }
@keyframes siteai-zoom { from { transform: scale(1); } to { transform: scale(1.1); } }
@keyframes siteai-pan { from { background-position: 50% 50%; } to { background-position: 58% 42%; } }
@keyframes siteai-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes siteai-aurora {
  0% { transform: translate3d(-6%, -4%, 0) rotate(0deg) scale(1); }
  50% { transform: translate3d(5%, 6%, 0) rotate(8deg) scale(1.12); }
  100% { transform: translate3d(-6%, -4%, 0) rotate(0deg) scale(1); }
}
@keyframes siteai-shine { 0%, 70% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(230%) skewX(-20deg); } }

@media (prefers-reduced-motion: no-preference) {
  .siteai-design-root[data-motion="dynamic"] { --siteai-rise: 48px; --siteai-reveal-scale: .96; }

  /* Haut de site : titre, texte puis boutons apparaissent à l'ouverture
     (sélecteurs communs aux deux gabarits, classique et signature). */
  .siteai-design-root:is([data-motion="subtle"], [data-motion="dynamic"]) [data-siteai-hero] :is(h1, p, [data-siteai-hero-actions]) {
    animation: siteai-rise .9s cubic-bezier(.2, .8, .2, 1) backwards;
  }
  .siteai-design-root:is([data-motion="subtle"], [data-motion="dynamic"]) [data-siteai-hero] p { animation-delay: .15s; }
  .siteai-design-root:is([data-motion="subtle"], [data-motion="dynamic"]) [data-siteai-hero] [data-siteai-hero-actions] { animation-delay: .3s; }

  /* Titres, cartes, services, photos et questions apparaissent au défilement. */
  @supports (animation-timeline: view()) {
    .siteai-design-root:is([data-motion="subtle"], [data-motion="dynamic"]) section:not([data-siteai-hero]) :is(h2, article, figure, li, details) {
      animation: siteai-reveal linear backwards;
      animation-timeline: view();
      animation-range: entry 0% entry 40%;
    }
  }

  /* Cartes qui se soulèvent au survol. */
  @media (hover: hover) {
    .siteai-design-root:is([data-motion="subtle"], [data-motion="dynamic"]) section:not([data-siteai-hero]) article {
      transition: transform .3s ease, box-shadow .3s ease;
    }
    .siteai-design-root[data-motion="subtle"] section:not([data-siteai-hero]) article:hover { transform: translateY(-3px); }
    .siteai-design-root[data-motion="dynamic"] section:not([data-siteai-hero]) article:hover { transform: translateY(-6px) scale(1.01); }
  }

  /* Bouton principal avec un reflet (dynamique). */
  .siteai-design-root[data-motion="dynamic"] [data-siteai-hero-actions] > a:first-child { position: relative; overflow: hidden; }
  .siteai-design-root[data-motion="dynamic"] [data-siteai-hero-actions] > a:first-child::after {
    content: ""; position: absolute; inset: 0; width: 40%; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .35), transparent);
    animation: siteai-shine 4.5s ease-in-out 1.2s infinite;
  }

  /* Fond du haut : zoom lent sur la photo. */
  .siteai-design-root[data-hero-background="zoom"] [data-siteai-hero] img {
    animation: siteai-zoom 22s ease-in-out infinite alternate;
  }
  .siteai-design-root[data-hero-background="zoom"] [data-siteai-hero][style*="background-image"] {
    background-size: cover; animation: siteai-pan 24s ease-in-out infinite alternate;
  }

  /* Fond du haut : dégradé qui ondule, aux couleurs du site. */
  .siteai-design-root:is([data-hero-background="gradient"], [data-hero-background="aurora"]) [data-siteai-hero] { position: relative; overflow: hidden; isolation: isolate; }
  .siteai-design-root[data-hero-background="gradient"] [data-siteai-hero]::before {
    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .55;
    background: linear-gradient(120deg,
      color-mix(in srgb, var(--siteai-accent) 70%, transparent),
      transparent 40%,
      color-mix(in srgb, var(--siteai-accent) 45%, transparent) 70%,
      transparent);
    background-size: 300% 300%;
    animation: siteai-gradient 16s ease-in-out infinite;
  }

  /* Fond du haut : formes lumineuses floues qui flottent. */
  .siteai-design-root[data-hero-background="aurora"] [data-siteai-hero]::before {
    content: ""; position: absolute; inset: -20%; z-index: -1; pointer-events: none; opacity: .6;
    background:
      radial-gradient(35% 45% at 25% 30%, color-mix(in srgb, var(--siteai-accent) 75%, transparent), transparent 70%),
      radial-gradient(30% 40% at 75% 65%, color-mix(in srgb, var(--siteai-accent) 55%, #ffffff 15%), transparent 70%),
      radial-gradient(25% 35% at 60% 20%, color-mix(in srgb, var(--siteai-accent) 40%, transparent), transparent 70%);
    filter: blur(30px);
    animation: siteai-aurora 18s ease-in-out infinite;
  }
}
`;
