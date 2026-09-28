import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/confidentialite", "Politique de confidentialité", "Consulte la politique de confidentialité de Lumio et les informations sur le traitement des données personnelles.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
