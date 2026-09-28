import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/pricing", "Tarifs et abonnements", "Compare les offres Lumio pour créer, personnaliser et publier le site professionnel de ton entreprise.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
