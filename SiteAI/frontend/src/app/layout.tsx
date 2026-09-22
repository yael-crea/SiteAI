import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://site-ai-jzjx.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "SiteAI - Crée ton site professionnel avec l'IA",
    template: "%s | SiteAI",
  },

  description:
    "SiteAI permet aux TPE, PME et indépendants de créer rapidement un site professionnel grâce à l'intelligence artificielle.",

  applicationName: "SiteAI",

  keywords: [
    "création site internet",
    "site internet IA",
    "créateur de site",
    "site professionnel",
    "site TPE",
    "site PME",
    "intelligence artificielle",
  ],

  authors: [
    {
      name: "SiteAI",
    },
  ],

  creator: "SiteAI",
  publisher: "SiteAI",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "SiteAI",
    title: "SiteAI - Crée ton site professionnel avec l'IA",
    description:
      "Crée rapidement un site professionnel pour ton entreprise grâce à l'intelligence artificielle.",
  },

  twitter: {
    card: "summary_large_image",
    title: "SiteAI - Crée ton site professionnel avec l'IA",
    description:
      "Crée rapidement un site professionnel grâce à l'intelligence artificielle.",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}