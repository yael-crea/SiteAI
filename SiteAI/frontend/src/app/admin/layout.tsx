import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = { title: "Administration", robots: privateRobots };
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
