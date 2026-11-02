import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Mes sites", robots: privateRobots };
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
