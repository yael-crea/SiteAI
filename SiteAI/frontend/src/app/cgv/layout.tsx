import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/cgv", "Conditions générales de vente", "Consulte les conditions générales de vente et les modalités des abonnements Lumio.");

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="lumio-night">{children}</div>;
}
