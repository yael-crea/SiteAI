import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Logos et photos importés par les clients (Supabase Storage ou adresse externe),
    // affichés tels quels dans l'éditeur et les sites publiés : next/image passerait
    // chaque image par l'optimiseur payant de Vercel et exigerait de lister les domaines.
    files: [
      "src/components/SitePreview.tsx",
      "src/components/builder/ContentMediaPanel.tsx",
      "src/app/builder/page.tsx",
      "src/app/sites/page.tsx",
    ],
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bibliothèques tierces déjà minifiées, servies telles quelles.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;

