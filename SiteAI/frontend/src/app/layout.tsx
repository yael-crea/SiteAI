import type { Metadata } from "next";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";
import { SITE_URL, publicRobots } from "@/lib/seo";
import "./globals.css";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-lumio", display: "swap" });
const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Lumio - Crée ton site professionnel avec l'IA", template: "%s | Lumio" },
  description: "Lumio permet aux TPE, PME et indépendants de créer rapidement un site professionnel grâce à l'intelligence artificielle.",
  applicationName: "Lumio", creator: "Lumio", publisher: "Lumio",
  robots: publicRobots,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>;
}
