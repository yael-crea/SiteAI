import type { Metadata } from "next";
import { SITE_URL, publicRobots } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Lumio - Crée ton site professionnel avec l'IA", template: "%s | Lumio" },
  description: "Lumio permet aux TPE, PME et indépendants de créer rapidement un site professionnel grâce à l'intelligence artificielle.",
  applicationName: "Lumio", creator: "Lumio", publisher: "Lumio",
  robots: publicRobots,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
