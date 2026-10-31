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
    return [
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