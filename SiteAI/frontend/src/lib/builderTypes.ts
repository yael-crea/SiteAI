import type { DesignExtras } from "@/lib/appearanceSettings";
import type { DesignStyle } from "@/lib/designStyles";
import type { SiteGoal } from "@/lib/siteGoal";
import type { Testimonial } from "@/lib/siteGrowth";

export type IconMode = "auto" | "custom" | "none";

export type ImageMode = "auto" | "custom" | "none";

export type LayoutBlock =
  | "about"
  | "services"
  | "process"
  | "faq"
  | "gallery"
  | "contact";

export type SiteSection = {
  title: string;
  text: string;
  iconMode?: IconMode;
  icon?: string;
  imageMode?: ImageMode;
  imageUrl?: string;
  hidden?: boolean;
};

export type DesignSettings = DesignExtras & {
  font: "system" | "modern" | "classic" | "editorial" | "mono";
  buttonStyle: "square" | "soft" | "pill";
  cardStyle: "simple" | "bordered" | "shadow";
  logoSize: "small" | "medium" | "large";
  heroLayout: "auto" | "left" | "center";
  contentWidth: "normal" | "wide";
  spacing: "compact" | "normal" | "airy";
  background: "auto" | "light" | "dark";
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;
};

export type GeneratedSite = {
  siteGoal?: SiteGoal;
  bookingUrl?: string;
  businessName: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroText: string;
  phone: string;
  logoUrl: string;
  heroImageUrl: string;
  gallery: string[];
  sections: SiteSection[];
  layoutOrder?: LayoutBlock[];
  hiddenBlocks?: LayoutBlock[];
  designSettings?: DesignSettings;
  testimonials?: Testimonial[];
  serviceArea?: string;
  openingHours?: string;
  clientName?: string;
  clientEmail?: string;
  socialLinks?: SocialLinks;
};

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export type ModifyResponse = {
  site: GeneratedSite;
  designStyle: DesignStyle;
  accentColor: string;
};

export type SavedSite = {
  draftRevision: number;
  publishedRevision: number;
  id: number;
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  designStyle: DesignStyle;
  accentColor: string;
  site: GeneratedSite;
  published: boolean;
  publicSlug: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};
