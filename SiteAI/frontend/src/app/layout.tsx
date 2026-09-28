import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://lumio-creation.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Lumio - Crée ton site professionnel avec l'IA",
    template: "%s | Lumio",
  },

  description:
    "Lumio permet aux TPE, PME et indépendants de créer rapidement un site professionnel grâce à l'intelligence artificielle.",

  applicationName: "Lumio",

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
      name: "Lumio",
    },
  ],

  creator: "Lumio",
  publisher: "Lumio",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Lumio",
    title: "Lumio - Crée ton site professionnel avec l'IA",
    description:
      "Crée rapidement un site professionnel pour ton entreprise grâce à l'intelligence artificielle.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Lumio - Crée ton site professionnel avec l'IA",
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