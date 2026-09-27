// All values come from fixed choices; no user input is interpolated into CSS.
export const designExtrasCSS = `
.siteai-design-root[data-title-scale="small"] h1 { font-size: clamp(1.85rem, 4vw, 3.25rem) !important; }
.siteai-design-root[data-title-scale="small"] h2 { font-size: clamp(1.4rem, 3vw, 2.15rem) !important; }
.siteai-design-root[data-title-scale="large"] h1 { font-size: clamp(2.5rem, 6vw, 5rem) !important; }
.siteai-design-root[data-title-scale="large"] h2 { font-size: clamp(1.9rem, 4vw, 3.5rem) !important; }
.siteai-design-root h1, .siteai-design-root h2, .siteai-design-root h3 { overflow-wrap: anywhere; }
.siteai-design-root[data-title-weight="regular"] :is(h1,h2,h3) { font-weight: 400 !important; }
.siteai-design-root[data-title-weight="bold"] :is(h1,h2,h3) { font-weight: 800 !important; }
.siteai-design-root[data-title-case="normal"] :is(h1,h2,h3) { text-transform: none !important; }
.siteai-design-root[data-title-case="uppercase"] :is(h1,h2,h3) { text-transform: uppercase !important; }
.siteai-design-root[data-text-scale="comfortable"] section p { font-size: 1.0625rem !important; }
.siteai-design-root[data-text-scale="large"] section p { font-size: 1.1875rem !important; }
.siteai-design-root[data-line-height="normal"] section p { line-height: 1.55 !important; }
.siteai-design-root[data-line-height="relaxed"] section p { line-height: 1.9 !important; }
.siteai-design-root[data-card-radius="square"] article { border-radius: 0 !important; }
.siteai-design-root[data-card-radius="soft"] article { border-radius: .875rem !important; }
.siteai-design-root[data-card-radius="round"] article { border-radius: 2rem !important; }
.siteai-design-root[data-shadow-strength="none"][data-theme][data-card-style][data-background] section article { box-shadow: none !important; }
.siteai-design-root[data-shadow-strength="soft"][data-theme][data-card-style][data-background] section article { box-shadow: 0 5px 18px rgba(15,23,42,.12) !important; }
.siteai-design-root[data-shadow-strength="strong"][data-theme][data-card-style][data-background] section article { box-shadow: 0 18px 40px rgba(15,23,42,.25) !important; }
.siteai-design-root[data-image-radius="square"] section:not([data-siteai-hero]) :is(img, figure, div:has(> img)) { border-radius: 0 !important; }
.siteai-design-root[data-image-radius="soft"] section:not([data-siteai-hero]) :is(img, figure, div:has(> img)) { border-radius: .875rem !important; }
.siteai-design-root[data-image-radius="round"] section:not([data-siteai-hero]) :is(img, figure, div:has(> img)) { border-radius: 2rem !important; }
.siteai-design-root:not([data-image-ratio="auto"]) section:not([data-siteai-hero]) figure:has(img) { min-height: 0 !important; grid-row: auto !important; align-self: start; }
.siteai-design-root[data-image-ratio="landscape"] section:not([data-siteai-hero]) img { width: 100% !important; height: auto !important; aspect-ratio: 16 / 9 !important; }
.siteai-design-root[data-image-ratio="square"] section:not([data-siteai-hero]) img { width: 100% !important; height: auto !important; aspect-ratio: 1 !important; }
.siteai-design-root[data-image-ratio="portrait"] section:not([data-siteai-hero]) img { width: 100% !important; height: auto !important; aspect-ratio: 4 / 5 !important; }
.siteai-design-root[data-image-fit="cover"] section:not([data-siteai-hero]) img { object-fit: cover !important; }
.siteai-design-root[data-image-fit="contain"] section:not([data-siteai-hero]) img { object-fit: contain !important; }
.siteai-design-root[data-button-size="compact"] [data-siteai-hero-actions] a,
.siteai-design-root[data-button-size="compact"] [data-siteai-lead-form] button[type="submit"] { min-height: 44px; padding: .65rem 1rem !important; font-size: .875rem !important; }
.siteai-design-root[data-button-size="large"] [data-siteai-hero-actions] a,
.siteai-design-root[data-button-size="large"] [data-siteai-lead-form] button[type="submit"] { min-height: 52px; padding: 1rem 1.6rem !important; font-size: 1.0625rem !important; }
`;
