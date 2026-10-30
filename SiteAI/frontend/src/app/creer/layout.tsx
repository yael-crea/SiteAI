import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

export const metadata: Metadata = { robots: privateRobots };
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <div className="lumio-night">{children}</div>;
}
