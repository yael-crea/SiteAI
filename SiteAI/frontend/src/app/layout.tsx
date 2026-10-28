import type { Metadata } from "next";
import { DM_Mono, Inter, Manrope, Newsreader, Source_Serif_4 } from "next/font/google";
import { SITE_URL, publicRobots } from "@/lib/seo";
import "./globals.css";

// Police de l'interface Lumio : Inter, la plus proche de SF Pro utilisable sur le web.
const sans = Inter({ subsets: ["latin"], variable: "--font-lumio", display: "swap" });
const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

// Polices des sites créés avec Lumio (non préchargées : elles ne servent
// qu'aux aperçus et aux sites publiés).
const siteSans = Inter({ subsets: ["latin"], variable: "--font-site-sans", display: "swap", preload: false });
const siteModern = Manrope({ subsets: ["latin"], variable: "--font-site-modern", display: "swap", preload: false });
const siteEditorial = Source_Serif_4({ subsets: ["latin"], variable: "--font-site-editorial", style: ["normal", "italic"], display: "swap", preload: false });
const siteMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-site-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Lumio - Crée ton site professionnel avec l'IA", template: "%s | Lumio" },
  description: "Lumio permet aux TPE, PME et indépendants de créer rapidement un site professionnel grâce à l'intelligence artificielle.",
  applicationName: "Lumio", creator: "Lumio", publisher: "Lumio",
  robots: publicRobots,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" className={`${sans.variable} ${serif.variable} ${siteSans.variable} ${siteModern.variable} ${siteEditorial.variable} ${siteMono.variable}`}><body>{children}</body></html>;
}
