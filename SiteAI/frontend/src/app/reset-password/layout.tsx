import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: privateRobots };
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
