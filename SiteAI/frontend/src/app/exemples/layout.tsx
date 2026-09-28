import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/exemples", "Exemples de sites professionnels", "Découvre les démonstrations Lumio pour les artisans, restaurants et paysagistes et imagine le site de ton entreprise.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
