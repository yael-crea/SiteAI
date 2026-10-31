import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

// Page de gestion d'abonnement, réservée aux comptes connectés (redirection
// vers /auth sinon) : rien à indexer. Les tarifs publics sont sur l'accueil (/#s4).
export const metadata: Metadata = { title: "Abonnement", robots: privateRobots };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="lumio-night">{children}</div>;
}
