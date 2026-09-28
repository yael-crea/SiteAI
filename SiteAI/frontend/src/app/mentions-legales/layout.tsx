import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/mentions-legales", "Mentions légales", "Consulte les mentions légales de Lumio.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
