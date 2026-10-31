import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "site-ai-jzjx.vercel.app" }],
        destination: "https://lumio.business/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Fichiers de la landing qui ne changent jamais sous le même nom
    // (Three.js versionné dans le nom, polices) : cache navigateur d'un an.
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    // En-têtes de sécurité sur toutes les pages. Pas de CSP complète (scripts
    // inline, Three.js, Supabase, Stripe) : seulement frame-ancestors contre
    // le clickjacking de /auth ou /dashboard. Accéléromètre et gyroscope
    // restent permis pour l'inclinaison de la landing.
    const security = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/vendor/:path*", headers: immutable },
      { source: "/fonts/:path*", headers: immutable },
      // Toujours chargé avec ?v=N, changé à chaque version.
      { source: "/landing/:path*", headers: immutable },
      { source: "/images/landing/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/decouvrir",
        destination: "/decouvrir.html",
      },
    ];
  },
};

export default nextConfig;