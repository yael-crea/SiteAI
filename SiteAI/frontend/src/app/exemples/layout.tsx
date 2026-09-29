import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata(
  "/exemples",
  "Exemples de sites professionnels créés avec Lumio",
  "Explore des exemples de sites pour plombier, restaurant, studio beauté et paysagiste, puis utilise le modèle de ton choix dans Lumio.",
);

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Exemples de sites professionnels Lumio",
  itemListElement: [
    "Site de plombier",
    "Site de restaurant",
    "Site de studio beauté",
    "Site de paysagiste",
  ].map((name, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
  })),
};

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}
