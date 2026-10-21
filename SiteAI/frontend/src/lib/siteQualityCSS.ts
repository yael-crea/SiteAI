// Couche « qualité » commune à tous les sites générés : typographie plus fine,
// rythme plus aéré, détails plus nets. Elle s'applique avant les réglages
// d'apparence choisis par l'utilisateur (designExtrasCSS), qui gardent la main.
// Aucune donnée utilisateur n'est interpolée dans ce CSS.
export const siteQualityCSS = `
.siteai-design-root {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern", "liga", "calt";
}

.siteai-design-root :is(h1, h2, h3) { text-wrap: balance; }
.siteai-design-root p { text-wrap: pretty; }

/* Titres : moins massifs, plus éditoriaux (sauf si l'utilisateur a choisi une graisse). */
.siteai-design-root[data-title-weight="auto"] h1 {
  font-weight: 650 !important;
  letter-spacing: -0.035em !important;
  line-height: 1.04 !important;
}
.siteai-design-root[data-title-weight="auto"] h2 {
  font-weight: 620 !important;
  letter-spacing: -0.028em !important;
  line-height: 1.1 !important;
}
.siteai-design-root[data-title-weight="auto"] h3 {
  font-weight: 600 !important;
  letter-spacing: -0.012em;
}

/* Familles serif : titres fins et élégants. */
.siteai-design-root[data-title-weight="auto"]:is([data-font="classic"], [data-font="editorial"]) :is(h1, h2) {
  font-weight: 460 !important;
  letter-spacing: -0.022em !important;
}
.siteai-design-root[data-title-weight="auto"]:is([data-font="classic"], [data-font="editorial"]) h3 {
  font-weight: 560 !important;
}
.siteai-design-root[data-title-weight="auto"]:is([data-theme="elegant"], [data-theme="premium"]) :is(h1, h2) {
  font-family: var(--font-serif), Georgia, "Times New Roman", serif;
  font-weight: 420 !important;
  letter-spacing: -0.03em !important;
}

/* Boutons et étiquettes : graisse affirmée sans être lourde. */
.siteai-design-root :is(a, button).font-black { font-weight: 650; letter-spacing: 0.005em; }
.siteai-design-root :is(span, p).font-black.uppercase { font-weight: 700; }

/* Paragraphes : lecture confortable. */
.siteai-design-root section p { line-height: 1.7; }
.siteai-design-root [data-siteai-hero] p { max-width: 40rem; }
.siteai-design-root [data-siteai-hero-content].text-center p { margin-inline: auto; }

/* Boutons : transitions et focus soignés. */
.siteai-design-root :is(a, button) {
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}
.siteai-design-root :is(a, button):focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

/* Images : rendu net et doux. */
.siteai-design-root img { image-rendering: auto; }
.siteai-design-root section:not([data-siteai-hero]) img { backface-visibility: hidden; }

/* Cartes : bordures plus fines et ombres plus diffuses. */
.siteai-design-root[data-shadow-strength="auto"] section article.shadow-sm,
.siteai-design-root[data-shadow-strength="auto"] section article.shadow-md {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px -12px rgba(15, 23, 42, 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .siteai-design-root :is(a, button) { transition: none; }
}
`;
