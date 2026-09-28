import type { Metadata } from "next";

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
const rawUrl = configuredUrl || (productionDomain ? `https://${productionDomain}` : "http://localhost:3000");
const parsedUrl = new URL(rawUrl);
if (!/^https?:$/.test(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
  throw new Error("NEXT_PUBLIC_SITE_URL doit être une origine complète sans chemin (https://votre-domaine.fr).");
}
if (process.env.VERCEL_ENV === "production" && ((!configuredUrl && !productionDomain) || parsedUrl.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(parsedUrl.hostname))) {
  throw new Error("Configurez NEXT_PUBLIC_SITE_URL avec le domaine HTTPS public de production.");
}
export const SITE_URL = parsedUrl.origin;
export const IS_INDEXABLE = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production" && Boolean(configuredUrl);
export const privateRobots: Metadata["robots"] = {
  index: false, follow: false, googleBot: { index: false, follow: false },
};
export const publicRobots: Metadata["robots"] = IS_INDEXABLE
  ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
  : privateRobots;
export function publicMetadata(path: string, title: string, description: string): Metadata {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  return {
    title: { absolute: `${title} | Lumio` }, description,
    alternates: { canonical: url }, robots: publicRobots,
    openGraph: { type: "website", locale: "fr_FR", siteName: "Lumio", url, title: `${title} | Lumio`, description },
    twitter: { card: "summary", title: `${title} | Lumio`, description },
  };
}
