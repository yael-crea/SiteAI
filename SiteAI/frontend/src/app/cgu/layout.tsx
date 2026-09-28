import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/cgu", "Conditions générales d’utilisation", "Consulte les conditions générales d’utilisation de Lumio.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
