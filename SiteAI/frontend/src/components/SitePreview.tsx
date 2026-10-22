"use client";
import { goalAction } from "@/lib/siteGoal";

import { createContext, useContext, useState } from "react";
import { normalizeDesignExtras, type DesignExtras } from "@/lib/appearanceSettings";
import { designExtrasCSS } from "@/lib/designExtrasCSS";
import { siteQualityCSS } from "@/lib/siteQualityCSS";
import { getDesignStyle, type DesignStyle } from "@/lib/designStyles";
import { getQuoteOptions, type Testimonial } from "@/lib/siteGrowth";
import signature from "./signature/Signature.module.css";



type IconMode = "auto" | "custom" | "none";

type ImageMode = "auto" | "custom" | "none";

type LayoutBlock =
  | "about"
  | "services"
  | "process"
  | "faq"
  | "gallery"
  | "contact";

type SiteSection = {

  title: string;

  text: string;

  iconMode?: IconMode;

  icon?: string;

  imageMode?: ImageMode;

  imageUrl?: string;

  hidden?: boolean;

};


type SiteBenefit = {
  title: string;
  text: string;
};


type FAQItem = {
  question: string;
  answer: string;
};

type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;
};


type DesignSettings = DesignExtras & {
  font?: "system" | "modern" | "classic" | "editorial" | "mono";
  buttonStyle?: "square" | "soft" | "pill";
  cardStyle?: "simple" | "bordered" | "shadow";
  logoSize?: "small" | "medium" | "large";
  heroLayout?: "auto" | "left" | "center";
  contentWidth?: "normal" | "wide";
  spacing?: "compact" | "normal" | "airy";
  background?: "auto" | "light" | "dark";
  /** Rendu des sites : « signature » par défaut, « classic » pour l'ancien rendu. */
  template?: "signature" | "classic";
};

type GeneratedSite = {
  siteGoal?: string;
  bookingUrl?: string;

  businessName: string;

  slug: string;

  metaTitle: string;

  metaDescription: string;

  heroEyebrow?: string;

  heroTitle: string;

  heroText: string;

  primaryCta?: string;

  secondaryCta?: string;

  phone: string;

  logoUrl: string;

  heroImageUrl: string;

  gallery: string[];

  aboutTitle?: string;

  aboutText?: string;

  sections: SiteSection[];

  benefits?: SiteBenefit[];

  faq?: FAQItem[];

  contactTitle?: string;

  contactText?: string;

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







export type PreviewEditTarget =
  | {
      kind: "field";
      field:
        | "businessName"
        | "heroTitle"
        | "heroText"
        | "phone"
        | "logoUrl"
        | "heroImageUrl";
    }
  | { kind: "section"; index: number }
  | { kind: "gallery" };

type SitePreviewProps = {

  site: GeneratedSite;

  designStyle: DesignStyle;

  accentColor: string;

  activity: string;

  city: string;

  previewOnly?: boolean;
  onEdit?: (target: PreviewEditTarget) => void;

};

function getContrastTextColor(backgroundColor: string) {
  const normalized = backgroundColor.trim().replace(/^#/, "");
  const hex = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized.slice(0, 6);

  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);

  return darkContrast >= lightContrast ? "#0f172a" : "#ffffff";
}

function previewEditProps(target: PreviewEditTarget, enabled: boolean) {
  if (!enabled) return {};

  const fieldLabels = {
    businessName: "le nom de l’entreprise",
    heroTitle: "le titre principal",
    heroText: "la présentation",
    phone: "le téléphone",
    logoUrl: "le logo",
    heroImageUrl: "la photo principale",
  };
  const label = target.kind === "field"
    ? fieldLabels[target.field]
    : target.kind === "section"
      ? `la prestation ${target.index + 1}`
      : "les photos de la galerie";

  return {
    "data-siteai-edit": JSON.stringify(target),
    tabIndex: 0,
    role: "button" as const,
    "aria-label": `Modifier ${label}`,
    title: `Modifier ${label}`,
  };
}

function getPreviewEditTarget(
  root: HTMLElement,
  eventTarget: EventTarget | null,
): PreviewEditTarget | null {
  // The preview can be rendered in an iframe: do not use the parent window's
  // Element constructor to identify nodes from another document.
  const candidate = eventTarget as HTMLElement | null;
  if (!candidate || typeof candidate.closest !== "function") return null;
  const editable = candidate.closest<HTMLElement>("[data-siteai-edit]");
  if (!editable || !root.contains(editable)) return null;

  try {
    const target = JSON.parse(editable.dataset.siteaiEdit ?? "null") as PreviewEditTarget;
    if (target?.kind === "gallery") return { kind: "gallery" };
    if (target?.kind === "section" && Number.isInteger(target.index) && target.index >= 0) {
      return { kind: "section", index: target.index };
    }
    if (target?.kind === "field" && [
      "businessName", "heroTitle", "heroText", "phone", "logoUrl", "heroImageUrl",
    ].includes(target.field)) {
      return { kind: "field", field: target.field };
    }
  } catch {
    // A stale or invalid marker must never intercept an ordinary preview click.
  }
  return null;
}



function normalizeDesignSettings(
  value?: DesignSettings,
) {
  return {
    ...normalizeDesignExtras(value),
    font:
      value?.font === "modern" ||
      value?.font === "classic" ||
      value?.font === "editorial" ||
      value?.font === "mono"
        ? value.font
        : "system",
    buttonStyle:
      value?.buttonStyle === "square" ||
      value?.buttonStyle === "pill"
        ? value.buttonStyle
        : "soft",
    cardStyle:
      value?.cardStyle === "simple" ||
      value?.cardStyle === "shadow"
        ? value.cardStyle
        : "bordered",
    logoSize:
      value?.logoSize === "small" ||
      value?.logoSize === "large"
        ? value.logoSize
        : "medium",
    heroLayout:
      value?.heroLayout === "left" ||
      value?.heroLayout === "center"
        ? value.heroLayout
        : "auto",
    contentWidth:
      value?.contentWidth === "wide"
        ? "wide"
        : "normal",
    spacing:
      value?.spacing === "compact" ||
      value?.spacing === "airy"
        ? value.spacing
        : "normal",
    background:
      value?.background === "light" ||
      value?.background === "dark"
        ? value.background
        : "auto",
  } as const;
}

function DesignShell({
  settings,
  children,
  theme,
  hasHeroImage,
  accentColor,
  onEdit,
}: {
  settings: ReturnType<typeof normalizeDesignSettings>;
  theme: DesignStyle;
  hasHeroImage: boolean;
  accentColor: string;
  children: React.ReactNode;
  onEdit?: SitePreviewProps["onEdit"];
}) {
  const fontFamily = {
    system:
      'var(--font-site-sans), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    modern:
      'var(--font-site-modern), "Trebuchet MS", "Segoe UI", Arial, sans-serif',
    classic:
      'var(--font-serif), Georgia, "Times New Roman", serif',
    editorial:
      'var(--font-site-editorial), Georgia, "Times New Roman", serif',
    mono:
      'var(--font-site-mono), "Courier New", Courier, monospace',
  }[settings.font];

  const buttonRadius = {
    square: "0px",
    soft: "12px",
    pill: "9999px",
  }[settings.buttonStyle];

  const logoSize = {
    small: "34px",
    medium: "48px",
    large: "64px",
  }[settings.logoSize];

  const contentWidth =
    settings.contentWidth === "wide"
      ? "1500px"
      : "1280px";

  const spacingMultiplier = {
    compact: "0.78",
    normal: "1",
    airy: "1.22",
  }[settings.spacing];

  const background =
    settings.background === "dark"
      ? "#0b1120"
      : settings.background === "light"
        ? "#ffffff"
        : "transparent";

  return (
    <div
      className="siteai-design-root"
      data-editable-preview={onEdit ? "true" : undefined}
      onClickCapture={onEdit ? (event) => {
        const target = getPreviewEditTarget(event.currentTarget, event.target);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit(target);
      } : undefined}
      onKeyDownCapture={onEdit ? (event) => {
        if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
        const target = getPreviewEditTarget(event.currentTarget, event.target);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit(target);
      } : undefined}
      data-title-scale={settings.titleScale}
      data-text-scale={settings.textScale}
      data-title-weight={settings.titleWeight}
      data-font={settings.font}
      data-title-case={settings.titleCase}
      data-line-height={settings.lineHeight}
      data-card-radius={settings.cardRadius}
      data-shadow-strength={settings.shadowStrength}
      data-image-radius={settings.imageRadius}
      data-image-ratio={settings.imageRatio}
      data-image-fit={settings.imageFit}
      data-button-size={settings.buttonSize}
      data-theme={theme}
      data-has-hero-image={hasHeroImage}
      data-card-style={settings.cardStyle}
      data-hero-layout={settings.heroLayout}
      data-background={settings.background}
      data-siteai-spacing={settings.spacing}
      style={
        {
          fontFamily,
          background,
          "--siteai-button-radius":
            buttonRadius,
          "--siteai-logo-size":
            logoSize,
          "--siteai-content-width":
            contentWidth,
          "--siteai-spacing":
            spacingMultiplier,
          "--siteai-accent-contrast":
            getContrastTextColor(accentColor),
        } as React.CSSProperties
      }
    >
      <style>{`
        .siteai-design-root[data-editable-preview="true"] [data-siteai-edit] { cursor: pointer; }
        .siteai-design-root[data-editable-preview="true"] [data-siteai-edit]:hover,
        .siteai-design-root[data-editable-preview="true"] [data-siteai-edit]:focus-visible {
          outline: 2px solid #2563eb !important;
          outline-offset: -2px;
          box-shadow: inset 0 0 0 4px rgb(255 255 255 / 0.75);
        }
        .siteai-design-root[data-theme="minimaliste"][data-has-hero-image="false"] [data-siteai-hero] { background: #fff; color: #0f172a; }
        .siteai-design-root[data-theme="minimaliste"][data-has-hero-image="false"] [data-siteai-hero-content] p,
        .siteai-design-root[data-theme="minimaliste"][data-has-hero-image="false"] [data-siteai-hero-content] h1 { color: #0f172a; }
        .siteai-design-root[data-theme="minimaliste"] [data-siteai-hero-badges] { display: none; }
        .siteai-design-root[data-theme="nature"] [data-siteai-hero] { background-color: #243524; }
        .siteai-design-root[data-theme="nature"] article { border-radius: 2rem; }
        .siteai-design-root[data-theme="nature"][data-background="auto"] [class~="bg-white"] { background-color: #f4f5eb; }
        .siteai-design-root[data-theme="tradition"] [data-siteai-hero] { background-color: #422d1c; }
        .siteai-design-root[data-theme="tradition"][data-background="auto"] [class~="bg-white"] { background-color: #fff8ed; }
        .siteai-design-root[data-theme="tradition"] h2 { font-style: italic; }
        .siteai-design-root[data-theme="premium"] [data-siteai-hero] { background-color: #171717; }
        .siteai-design-root[data-theme="premium"] h1 { font-weight: 400; letter-spacing: -.035em; }
        .siteai-design-root[data-theme="premium"] [data-siteai-hero-actions] a { letter-spacing: .16em; }
        .siteai-design-root[data-theme="dynamique"] [data-siteai-hero] { background-color: #431407; }
        .siteai-design-root[data-theme="dynamique"] h1 { text-transform: uppercase; letter-spacing: -.04em; }
        .siteai-design-root[data-theme="dynamique"] article { border-radius: 1.5rem; }
        .siteai-design-root[data-theme="creatif"] [data-siteai-hero] { background-color: #2e1065; }
        .siteai-design-root[data-theme="creatif"] article { border-radius: 2rem .5rem 2rem .5rem; }
        .siteai-design-root[data-theme="creatif"] h1 { letter-spacing: -.055em; }
        .siteai-design-root[data-theme="creatif"][data-background="auto"] [class~="bg-white"] { background-color: #f5f3ff; }
        .siteai-design-root {
          min-height: 100%;
        }

        .siteai-design-root [data-siteai-accent-background] {
          color: var(--siteai-accent-contrast) !important;
        }

        .siteai-design-root [data-siteai-hero-actions] a,
        .siteai-design-root [data-siteai-lead-form] button[type="submit"],
        .siteai-design-root a[class*="rounded"],
        .siteai-design-root button[class*="rounded"] {
          border-radius: var(--siteai-button-radius) !important;
        }

        .siteai-design-root img[alt^="Logo "] {
          width: var(--siteai-logo-size) !important;
          height: var(--siteai-logo-size) !important;
        }

        .siteai-design-root .max-w-7xl {
          max-width: var(--siteai-content-width) !important;
        }

        .siteai-design-root[data-card-style="shadow"]
          section [class*="rounded"][class*="border"][class*=" p-"] {
          box-shadow:
            0 16px 35px rgba(15, 23, 42, 0.12) !important;
        }

        .siteai-design-root[data-card-style="simple"]
          section [class*="rounded"][class*="border"][class*=" p-"] {
          box-shadow: none !important;
          border-color: transparent !important;
        }

        .siteai-design-root[data-card-style="bordered"]
          section [class*="rounded"][class*="border"][class*=" p-"] {
          box-shadow: none !important;
        }

        .siteai-design-root[data-hero-layout="center"]
          [data-siteai-hero-content] {
          margin-left: auto !important;
          margin-right: auto !important;
          text-align: center !important;
          align-items: center !important;
        }

        .siteai-design-root[data-hero-layout="center"]
          [data-siteai-hero-content] > div,
        .siteai-design-root[data-hero-layout="center"]
          [data-siteai-hero-content] p {
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .siteai-design-root[data-hero-layout="center"]
          [data-siteai-hero-actions],
        .siteai-design-root[data-hero-layout="center"]
          [data-siteai-hero-badges] {
          justify-content: center !important;
        }

        .siteai-design-root[data-hero-layout="left"]
          [data-siteai-hero-content] {
          text-align: left !important;
          margin-left: 0 !important;
          margin-right: auto !important;
          align-items: flex-start !important;
        }

        .siteai-design-root[data-hero-layout="left"]
          [data-siteai-hero-actions],
        .siteai-design-root[data-hero-layout="left"]
          [data-siteai-hero-badges] {
          justify-content: flex-start !important;
        }

        .siteai-design-root[data-background="dark"] {
          color-scheme: dark;
        }

        .siteai-design-root[data-background="dark"]
          section:not([data-siteai-hero]) {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border-color: #334155 !important;
        }

        .siteai-design-root[data-background="dark"]
          section:not([data-siteai-hero])
          [class*="text-slate-"],
        .siteai-design-root[data-background="dark"]
          section:not([data-siteai-hero])
          [class*="text-neutral-"],
        .siteai-design-root[data-background="dark"]
          section:not([data-siteai-hero])
          [class*="text-stone-"] {
          color: #cbd5e1 !important;
        }

        .siteai-design-root[data-background="light"]
          section:not([data-siteai-hero]) {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }

        .siteai-design-root[data-background="light"]
          section:not([data-siteai-hero])
          [class*="text-neutral-"],
        .siteai-design-root[data-background="light"]
          section:not([data-siteai-hero])
          [class*="text-stone-"] {
          color: #334155 !important;
        }

        .siteai-design-root[data-siteai-spacing="compact"]
          section:not([data-siteai-hero]) {
          padding-top: 2.75rem !important;
          padding-bottom: 2.75rem !important;
        }

        .siteai-design-root[data-siteai-spacing="airy"]
          section:not([data-siteai-hero]) {
          padding-top: 7rem !important;
          padding-bottom: 7rem !important;
        }

        /*
         * MOBILE ONLY
         * Everything below is scoped to phones, so desktop rendering stays unchanged.
         */
        @media (max-width: 47.999rem) {
          .siteai-design-root {
            width: 100%;
            overflow-x: clip;
            padding-bottom: calc(4.9rem + env(safe-area-inset-bottom));
            -webkit-text-size-adjust: 100%;
          }

          .siteai-design-root * {
            min-width: 0;
          }

          .siteai-design-root section[id],
          .siteai-design-root [id="services"],
          .siteai-design-root [id="realisations"],
          .siteai-design-root [id="faq"],
          .siteai-design-root [id="contact"] {
            scroll-margin-top: 5rem;
          }

          /* Navigation: shorter, clearer and easier to use with one hand. */
          .siteai-design-root nav > div {
            min-height: 4rem;
            padding: 0.65rem 1rem !important;
            gap: 0.65rem !important;
          }

          .siteai-design-root nav img[alt^="Logo "] {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }

          .siteai-design-root nav a > div:last-child p:first-child {
            max-width: 52vw;
            font-size: 0.9rem !important;
            line-height: 1.15rem !important;
          }

          .siteai-design-root nav a > div:last-child p:last-child {
            max-width: 52vw;
            font-size: 0.66rem !important;
            line-height: 1rem !important;
          }

          .siteai-design-root nav details summary {
            min-height: 2.7rem;
            padding: 0.55rem 0.75rem !important;
            font-size: 0.72rem !important;
          }

          .siteai-design-root nav details > div {
            width: min(17rem, calc(100vw - 1.25rem)) !important;
            margin-top: 0.5rem !important;
            max-height: calc(100dvh - 5rem);
            overflow-y: auto;
            overscroll-behavior: contain;
          }

          /* Hero: less empty space, stronger hierarchy and full-width actions. */
          .siteai-design-root [data-siteai-hero] {
            min-height: 0 !important;
          }

          .siteai-design-root [data-siteai-hero] [data-siteai-hero-content] {
            width: 100%;
            max-width: none !important;
            text-align: left;
          }

          .siteai-design-root [data-siteai-hero] [data-siteai-hero-badges] {
            gap: 0.45rem !important;
            justify-content: flex-start !important;
          }

          .siteai-design-root [data-siteai-hero] [data-siteai-hero-badges] > * {
            max-width: 100%;
            padding: 0.45rem 0.7rem !important;
            font-size: 0.66rem !important;
            line-height: 1rem !important;
            letter-spacing: 0.08em !important;
            overflow-wrap: anywhere;
          }

          .siteai-design-root [data-siteai-hero] h1 {
            margin-top: 1.25rem !important;
            max-width: 100% !important;
            font-size: clamp(2rem, 10vw, 2.55rem) !important;
            line-height: 1.06 !important;
            letter-spacing: -0.035em !important;
            overflow-wrap: anywhere;
          }

          .siteai-design-root [data-siteai-hero] [data-siteai-hero-content] > p {
            margin-top: 1rem !important;
            max-width: 100% !important;
            font-size: 0.98rem !important;
            line-height: 1.7 !important;
          }

          .siteai-design-root [data-siteai-hero-actions] {
            margin-top: 1.55rem !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0.65rem !important;
            width: 100%;
          }

          .siteai-design-root [data-siteai-hero-actions] a {
            width: 100% !important;
            min-height: 3.2rem;
            display: flex !important;
            align-items: center;
            justify-content: center;
            padding: 0.8rem 1rem !important;
            font-size: 0.82rem !important;
            line-height: 1.15rem !important;
            letter-spacing: 0.04em !important;
          }

          /* Modern and artisan split heroes: text first, image second, both compact. */
          .siteai-design-root [data-siteai-hero] > .mx-auto.grid {
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .siteai-design-root [data-siteai-hero] > .mx-auto.grid > div:first-child {
            padding: 2.5rem 1.1rem 2rem !important;
          }

          .siteai-design-root [data-siteai-hero] > .mx-auto.grid > div:last-child {
            min-height: 14.5rem !important;
          }

          .siteai-design-root [data-siteai-hero] > .mx-auto.grid > div:last-child > div.absolute {
            left: 1rem !important;
            right: 1rem !important;
            bottom: 1rem !important;
            padding: 0.85rem !important;
          }

          /* Elegant hero has its image as a background: make the overlay stronger on phones. */
          .siteai-design-root [data-theme="premium"] [data-siteai-hero],
          .siteai-design-root [data-theme="minimaliste"] [data-siteai-hero] {
            background-position: center !important;
          }

          .siteai-design-root [data-siteai-hero] > .relative.z-10 {
            padding: 3rem 1.1rem !important;
          }

          .siteai-design-root [data-siteai-hero] .mt-14.grid {
            margin-top: 2rem !important;
            gap: 0.8rem !important;
            padding-top: 1rem !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .siteai-design-root [data-siteai-hero] .mt-14.grid p:first-child {
            font-size: 0.6rem !important;
            letter-spacing: 0.08em !important;
          }

          .siteai-design-root [data-siteai-hero] .mt-14.grid p:last-child {
            margin-top: 0.3rem !important;
            font-size: 0.72rem !important;
            line-height: 1.1rem !important;
            overflow-wrap: anywhere;
          }

          /* Trust/benefit rows become compact cards instead of long stacked blocks. */
          .siteai-design-root [data-siteai-hero] .mt-10.flex,
          .siteai-design-root [data-siteai-hero] .mt-10.grid {
            margin-top: 1.6rem !important;
            gap: 0.55rem !important;
          }

          .siteai-design-root [data-siteai-hero] .mt-10.flex > span,
          .siteai-design-root [data-siteai-hero] .mt-10.grid > span {
            width: 100%;
            font-size: 0.76rem !important;
            line-height: 1.15rem !important;
          }

          /* Global section rhythm: much less scrolling without feeling cramped. */
          .siteai-design-root section:not([data-siteai-hero]) {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 3.25rem !important;
            padding-bottom: 3.25rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) h2 {
            font-size: clamp(1.8rem, 8vw, 2.15rem) !important;
            line-height: 1.12 !important;
            letter-spacing: -0.025em !important;
            overflow-wrap: anywhere;
          }

          .siteai-design-root section:not([data-siteai-hero]) h3 {
            line-height: 1.25 !important;
            overflow-wrap: anywhere;
          }

          .siteai-design-root section:not([data-siteai-hero]) p {
            overflow-wrap: anywhere;
          }

          .siteai-design-root section:not([data-siteai-hero]) article {
            padding: 1.15rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) article img {
            max-height: 11rem;
          }

          /* Service cards: clearer, denser and easier to scan. */
          .siteai-design-root #services > div > div:first-child {
            text-align: left !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .siteai-design-root #services > div > div:first-child > p {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .siteai-design-root #services [class*="mt-12"],
          .siteai-design-root #services [class*="mt-10"] {
            margin-top: 1.75rem !important;
          }

          .siteai-design-root #services article {
            border-radius: 1rem !important;
          }

          .siteai-design-root #services article > div[class*="mb-"] {
            margin-bottom: 1rem !important;
            border-radius: 0.8rem !important;
          }

          .siteai-design-root #services article h3 {
            margin-top: 1rem !important;
            font-size: 1.18rem !important;
          }

          .siteai-design-root #services article h3 + p {
            margin-top: 0.65rem !important;
            font-size: 0.92rem !important;
            line-height: 1.55rem !important;
          }

          .siteai-design-root #services article a[href="#contact"] {
            margin-top: 1rem !important;
          }

          /* FAQ: bigger touch targets, less visual noise. */
          .siteai-design-root #faq details {
            border-radius: 0.9rem;
          }

          .siteai-design-root #faq summary {
            gap: 0.75rem !important;
            padding: 1rem !important;
          }

          .siteai-design-root #faq summary > div {
            gap: 0.7rem !important;
          }

          .siteai-design-root #faq summary span {
            font-size: 0.92rem !important;
            line-height: 1.35rem !important;
          }

          .siteai-design-root #faq details > p {
            margin-left: 0 !important;
            padding: 0.9rem 1rem 1.1rem !important;
            font-size: 0.9rem !important;
            line-height: 1.55rem !important;
          }

          /* Gallery: larger first image and compact following images. */
          .siteai-design-root #realisations {
            padding-top: 3.25rem !important;
            padding-bottom: 3.25rem !important;
          }

          .siteai-design-root #realisations [class*="auto-rows"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            grid-auto-rows: 9rem !important;
            gap: 0.65rem !important;
          }

          .siteai-design-root #realisations [class*="auto-rows"] > figure:first-child {
            grid-column: 1 / -1 !important;
            grid-row: span 2 !important;
          }

          .siteai-design-root #realisations figure {
            border-radius: 1rem !important;
          }

          .siteai-design-root #realisations figcaption {
            padding: 0.75rem !important;
            gap: 0.5rem !important;
          }

          .siteai-design-root #realisations figcaption p:first-child {
            font-size: 0.58rem !important;
            letter-spacing: 0.08em !important;
          }

          .siteai-design-root #realisations figcaption p:last-child {
            font-size: 0.78rem !important;
          }

          .siteai-design-root #realisations figcaption > span {
            width: 2rem !important;
            height: 2rem !important;
            font-size: 0.85rem !important;
          }

          /* Contact: one clear card, comfortable form fields, no oversized padding. */
          .siteai-design-root #contact {
            padding-top: 3.25rem !important;
            padding-bottom: 3.25rem !important;
          }

          .siteai-design-root #contact > div > div {
            border-radius: 1.25rem !important;
          }

          .siteai-design-root #contact [class*="p-8"],
          .siteai-design-root #contact [class*="p-7"],
          .siteai-design-root #contact [class*="px-7"] {
            padding: 1.15rem !important;
          }

          .siteai-design-root #contact h2 {
            font-size: 1.9rem !important;
            line-height: 1.12 !important;
          }

          .siteai-design-root #contact h2 + p {
            margin-top: 0.9rem !important;
            font-size: 0.92rem !important;
            line-height: 1.55rem !important;
          }

          .siteai-design-root [data-siteai-lead-form] input:not([type="checkbox"]):not([type="radio"]),
          .siteai-design-root [data-siteai-lead-form] select,
          .siteai-design-root [data-siteai-lead-form] textarea {
            width: 100%;
            min-height: 3rem;
            font-size: 1rem !important;
          }

          .siteai-design-root [data-siteai-lead-form] textarea {
            min-height: 7rem;
          }

          .siteai-design-root [data-siteai-lead-form] button[type="submit"] {
            min-height: 3.25rem;
          }

          /* Footers stay informative without adding another full screen of content. */
          .siteai-design-root footer {
            padding: 2.5rem 1rem 2rem !important;
          }

          .siteai-design-root footer > div > div:first-child {
            gap: 1.75rem !important;
            padding-bottom: 1.75rem !important;
          }

          .siteai-design-root footer p {
            line-height: 1.5rem;
          }

          /* Fixed conversion bar: visible only on phones. */
          .siteai-design-root [data-siteai-mobile-action-bar] {
            display: block;
          }
        }


        /* SITEAI MOBILE V2 — compact, lisible et résistant aux textes longs */
        @media (max-width: 47.999rem) {
          .siteai-design-root {
            --mobile-gutter: 1rem;
          }

          .siteai-design-root,
          .siteai-design-root main,
          .siteai-design-root section,
          .siteai-design-root nav,
          .siteai-design-root footer {
            max-width: 100vw;
          }

          .siteai-design-root h1,
          .siteai-design-root h2,
          .siteai-design-root h3,
          .siteai-design-root p,
          .siteai-design-root a,
          .siteai-design-root span {
            overflow-wrap: anywhere;
            word-break: normal;
          }

          /* Navigation et menu déroulant */
          .siteai-design-root nav {
            position: sticky;
            top: 0;
            z-index: 60;
          }

          .siteai-design-root nav > div {
            min-height: 3.75rem !important;
            padding: 0.55rem var(--mobile-gutter) !important;
          }

          .siteai-design-root nav details {
            position: relative !important;
          }

          .siteai-design-root nav details summary {
            min-height: 2.55rem !important;
            padding: 0.5rem 0.7rem !important;
            border-radius: 0.8rem !important;
          }

          .siteai-design-root nav details > div {
            position: absolute !important;
            top: calc(100% + 0.45rem) !important;
            right: 0 !important;
            left: auto !important;
            width: min(15.5rem, calc(100vw - 2rem)) !important;
            max-height: min(20rem, calc(100dvh - 5rem)) !important;
            padding: 0.55rem !important;
            border-radius: 1rem !important;
            overflow-y: auto !important;
          }

          .siteai-design-root nav details > div a {
            min-height: 2.75rem !important;
            padding: 0.7rem 0.85rem !important;
            font-size: 0.9rem !important;
            line-height: 1.2rem !important;
          }

          /* Hero */
          .siteai-design-root [data-siteai-hero] {
            min-height: auto !important;
          }

          .siteai-design-root [data-siteai-hero] > .relative.z-10,
          .siteai-design-root [data-siteai-hero] > div {
            min-height: auto !important;
          }

          .siteai-design-root [data-siteai-hero] h1 {
            font-size: clamp(2rem, 9.2vw, 2.45rem) !important;
            line-height: 1.04 !important;
            letter-spacing: -0.04em !important;
          }

          .siteai-design-root [data-siteai-hero] p {
            font-size: 0.96rem !important;
            line-height: 1.65 !important;
          }

          /* Toutes les sections deviennent nettement moins hautes */
          .siteai-design-root section:not([data-siteai-hero]) {
            padding: 2.75rem var(--mobile-gutter) !important;
          }

          .siteai-design-root[data-siteai-spacing="airy"]
            section:not([data-siteai-hero]),
          .siteai-design-root[data-siteai-spacing="normal"]
            section:not([data-siteai-hero]),
          .siteai-design-root[data-siteai-spacing="compact"]
            section:not([data-siteai-hero]) {
            padding-top: 2.75rem !important;
            padding-bottom: 2.75rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) h2 {
            margin-top: 0.8rem !important;
            max-width: 100% !important;
            font-size: clamp(1.75rem, 7.8vw, 2.08rem) !important;
            line-height: 1.08 !important;
            letter-spacing: -0.03em !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) h3 {
            font-size: clamp(1.05rem, 5.1vw, 1.3rem) !important;
            line-height: 1.2 !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) p {
            font-size: 0.94rem !important;
            line-height: 1.6 !important;
          }

          /* Réduit les grands espacements Tailwind présents dans les templates */
          .siteai-design-root section:not([data-siteai-hero]) .mt-16,
          .siteai-design-root section:not([data-siteai-hero]) .mt-14,
          .siteai-design-root section:not([data-siteai-hero]) .mt-12,
          .siteai-design-root section:not([data-siteai-hero]) .mt-10 {
            margin-top: 1.6rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) .gap-12,
          .siteai-design-root section:not([data-siteai-hero]) .gap-10,
          .siteai-design-root section:not([data-siteai-hero]) .gap-8 {
            gap: 1.15rem !important;
          }

          /* Cartes services / étapes */
          .siteai-design-root section:not([data-siteai-hero]) article {
            min-height: 0 !important;
            padding: 1rem !important;
            border-radius: 1.1rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) article h3 {
            margin-top: 0.85rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) article h3 + p {
            margin-top: 0.55rem !important;
          }

          .siteai-design-root section:not([data-siteai-hero]) article
            [class*="h-11"][class*="w-11"] {
            width: 2.55rem !important;
            height: 2.55rem !important;
          }

          /* Images : jamais gigantesques ou déformées */
          .siteai-design-root section:not([data-siteai-hero]) img {
            width: 100%;
            max-width: 100%;
            max-height: 15rem;
            object-fit: cover;
          }

          .siteai-design-root #services article img {
            max-height: 10.5rem !important;
          }

          /* FAQ */
          .siteai-design-root #faq {
            padding-top: 2.75rem !important;
            padding-bottom: 2.75rem !important;
          }

          .siteai-design-root #faq details {
            border-radius: 0.9rem !important;
          }

          .siteai-design-root #faq summary {
            min-height: 4rem !important;
            padding: 0.9rem !important;
          }

          .siteai-design-root #faq summary span {
            font-size: 0.9rem !important;
            line-height: 1.3rem !important;
          }

          .siteai-design-root #faq details > p {
            padding: 0.15rem 0.9rem 1rem !important;
            font-size: 0.88rem !important;
            line-height: 1.5rem !important;
          }

          /* Boutons */
          .siteai-design-root [data-siteai-hero-actions] a,
          .siteai-design-root a[href="#contact"][class*="rounded"] {
            min-height: 3rem !important;
            padding: 0.75rem 1rem !important;
          }

          /* CONTACT MOBILE : une seule colonne, aucune colonne écrasée */
          .siteai-design-root #contact .grid,
          .siteai-design-root #contact > div > .grid,
          .siteai-design-root #contact > div > div.grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 1.25rem !important;
          }

          .siteai-design-root #contact .grid > *,
          .siteai-design-root #contact > div > *,
          .siteai-design-root #contact form,
          .siteai-design-root #contact [data-siteai-lead-form] {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .siteai-design-root #contact h1,
          .siteai-design-root #contact h2,
          .siteai-design-root #contact h3,
          .siteai-design-root #contact p,
          .siteai-design-root #contact span,
          .siteai-design-root #contact label,
          .siteai-design-root #contact a {
            width: auto !important;
            min-width: 0 !important;
            max-width: 100% !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }

          .siteai-design-root #contact [data-siteai-lead-form] input:not([type="checkbox"]):not([type="radio"]),
          .siteai-design-root #contact [data-siteai-lead-form] select,
          .siteai-design-root #contact [data-siteai-lead-form] textarea,
          .siteai-design-root #contact [data-siteai-lead-form] button {
            display: block;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Contact */
          .siteai-design-root #contact {
            padding-top: 2.75rem !important;
            padding-bottom: 2.75rem !important;
          }

          /* Barre mobile : ne masque plus le bas du contenu */
          .siteai-design-root [data-siteai-mobile-action-bar] {
            z-index: 70;
          }
        }

        /* Consent: fixed checkbox and flexible text on phone, tablet and desktop. */
        .siteai-design-root #contact [data-siteai-lead-form] [data-siteai-consent] {
          display: grid !important;
          grid-template-columns: 20px minmax(0, 1fr) !important;
          align-items: start;
          gap: 0.75rem;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100%;
          box-sizing: border-box;
        }

        .siteai-design-root #contact [data-siteai-lead-form] [data-siteai-consent] > input[type="checkbox"] {
          width: 20px !important;
          min-width: 20px !important;
          max-width: 20px !important;
          height: 20px !important;
          min-height: 20px !important;
          max-height: 20px !important;
          margin: 2px 0 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
          align-self: start;
        }

        .siteai-design-root #contact [data-siteai-lead-form] [data-siteai-consent] > span {
          display: block;
          width: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }
        @media (min-width: 48rem) {
          .siteai-design-root [data-siteai-mobile-action-bar] {
            display: none !important;
          }
        }
      `}</style>

      <style>{siteQualityCSS}</style>
      <style>{designExtrasCSS}</style>
      {children}
    </div>
  );
}

function formatBusinessName(value: string) {
  const clean = value.trim().replace(/\s+/g, " ");

  if (!clean) {
    return value;
  }

  // Si l'utilisateur a déjà choisi une casse précise (ex. SARL DUPONT, eTech),
  // on la respecte. On corrige surtout les noms entièrement saisis en minuscules.
  if (/[A-ZÀ-Ÿ]/.test(clean)) {
    return clean;
  }

  return clean.replace(
    /(^|[\s'’-])([a-zà-ÿ])/g,
    (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase("fr-FR")}`,
  );
}


function formatPhoneNumber(value: string) {
  const clean = value.trim();

  if (!clean) {
    return "";
  }

  const compact = clean.replace(/[\s.()-]/g, "");

  if (/^\+33\d{9}$/.test(compact)) {
    const local = compact.slice(3);
    return `+33 ${local[0]} ${local.slice(1).match(/.{1,2}/g)?.join(" ") ?? local.slice(1)}`;
  }

  const digits = compact.replace(/\D/g, "");

  if (/^0\d{9}$/.test(digits)) {
    return digits.match(/.{1,2}/g)?.join(" ") ?? clean;
  }

  if (digits.length >= 6) {
    return digits.match(/.{1,2}/g)?.join(" ") ?? clean;
  }

  return clean;
}

function phoneHref(value: string) {
  const clean = value.trim();
  if (!clean) {
    return "";
  }

  const prefix = clean.startsWith("+") ? "+" : "";
  return prefix + clean.replace(/\D/g, "");
}

const socialNetworks: Array<{ key: keyof SocialLinks; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "whatsapp", label: "WhatsApp" },
];

function safeSocialUrl(value: string | undefined, network: keyof SocialLinks) {
  const clean = value?.trim();
  if (!clean) return "";

  if (network === "whatsapp" && /^\+?[\d\s().-]+$/.test(clean)) {
    const digits = clean.replace(/\D/g, "");
    return digits.length >= 8 ? `https://wa.me/${digits}` : "";
  }

  try {
    const url = new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.includes(".")
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function SocialLinksList({
  links,
  accentColor,
  light = false,
}: {
  links?: SocialLinks;
  accentColor: string;
  light?: boolean;
}) {
  const visibleLinks = socialNetworks.flatMap(({ key, label }) => {
    const href = safeSocialUrl(links?.[key], key);
    return href ? [{ key, label, href }] : [];
  });

  if (!visibleLinks.length) return null;

  return (
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Réseaux sociaux">
      {visibleLinks.map(({ key, label, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} de l’entreprise (nouvel onglet)`}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${
            light ? "border-neutral-300 text-neutral-700" : "border-white/15 text-white"
          }`}
          style={{ borderColor: accentColor }}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeGeneratedText(
  value: string | undefined,
  rawBusinessName: string,
  displayBusinessName: string,
  rawPhone: string,
) {
  if (!value) {
    return value;
  }

  let result = value;

  if (rawBusinessName.trim()) {
    result = result.replace(
      new RegExp(escapeRegExp(rawBusinessName.trim()), "gi"),
      displayBusinessName,
    );
  }

  const formattedPhone = formatPhoneNumber(rawPhone);
  if (rawPhone.trim() && formattedPhone) {
    result = result.split(rawPhone.trim()).join(formattedPhone);

    const rawDigits = rawPhone.replace(/\D/g, "");
    if (rawDigits.length >= 6) {
      result = result.split(rawDigits).join(formattedPhone);
    }
  }

  return result;
}

function normalizeSiteForDisplay(site: GeneratedSite): GeneratedSite {
  const rawBusinessName = site.businessName;
  const displayBusinessName = formatBusinessName(rawBusinessName);
  const normalize = (value: string | undefined) =>
    normalizeGeneratedText(
      value,
      rawBusinessName,
      displayBusinessName,
      site.phone,
    );

  return {
    ...site,
    hiddenBlocks: goalAction(site)?.href === "#contact" ? (site.hiddenBlocks ?? []).filter(block => block !== "contact") : site.hiddenBlocks,
    businessName: displayBusinessName,
    metaTitle: normalize(site.metaTitle) ?? site.metaTitle,
    metaDescription: normalize(site.metaDescription) ?? site.metaDescription,
    heroEyebrow: normalize(site.heroEyebrow),
    heroTitle: normalize(site.heroTitle) ?? site.heroTitle,
    heroText: normalize(site.heroText) ?? site.heroText,
    primaryCta: normalize(site.primaryCta),
    secondaryCta: normalize(site.secondaryCta),
    aboutTitle: normalize(site.aboutTitle),
    aboutText: normalize(site.aboutText),
    contactTitle: normalize(site.contactTitle),
    contactText: normalize(site.contactText),
    sections: (site.sections ?? []).map((section) => ({
      ...section,
      title: normalize(section.title) ?? section.title,
      text: normalize(section.text) ?? section.text,
      hidden: section.hidden ?? false,
    })),
    benefits: (site.benefits ?? []).map((benefit) => ({
      title: normalize(benefit.title) ?? benefit.title,
      text: normalize(benefit.text) ?? benefit.text,
    })),
    faq: (site.faq ?? []).map((item) => ({
      question: normalize(item.question) ?? item.question,
      answer: normalize(item.answer) ?? item.answer,
    })),
    testimonials: (site.testimonials ?? []).map((item) => ({
      ...item,
      name: normalize(item.name) ?? item.name,
      role: normalize(item.role),
      text: normalize(item.text) ?? item.text,
      rating: Math.min(5, Math.max(3, Number(item.rating) || 5)),
    })),
    serviceArea: normalize(site.serviceArea),
    openingHours: normalize(site.openingHours),
    designSettings:
      normalizeDesignSettings(
        site.designSettings,
      ),
  };
}

function getActivityTheme(activity: string) {
  const value = activity.trim().toLowerCase();

  const themes = [
    { keywords: ["plomb", "sanitaire", "chauff"], noun: "plomberie", icon: "🔧" },
    { keywords: ["élect", "electric", "domotique"], noun: "électricité", icon: "⚡" },
    { keywords: ["coiff", "barber", "barbier"], noun: "coiffure", icon: "✂️" },
    { keywords: ["restaurant", "restaur", "traiteur", "cuisine"], noun: "restauration", icon: "🍽️" },
    { keywords: ["boulanger", "pâtiss", "patiss"], noun: "boulangerie-pâtisserie", icon: "🥐" },
    { keywords: ["jardin", "paysag", "espace vert"], noun: "aménagement paysager", icon: "🌿" },
    { keywords: ["photo", "vidéo", "video", "photographe"], noun: "photographie", icon: "📷" },
    { keywords: ["garage", "auto", "mécan", "mecan"], noun: "mécanique automobile", icon: "🚗" },
    { keywords: ["peint"], noun: "peinture", icon: "🎨" },
    { keywords: ["menuis", "bois", "ébén", "eben"], noun: "menuiserie", icon: "🪚" },
    { keywords: ["maçon", "macon", "construction"], noun: "maçonnerie", icon: "🧱" },
    { keywords: ["avocat", "jurid"], noun: "accompagnement juridique", icon: "⚖️" },
  ];

  return (
    themes.find((theme) =>
      theme.keywords.some((keyword) => value.includes(keyword)),
    ) ?? {
      noun: value || "votre activité",
      icon: "✦",
    }
  );
}


type SectorVisualTheme = {
  key: string;
  icon: string;
  heroFallback: string;
  serviceLabel: string;
  serviceHeading: string;
  serviceIntro: string;
  trustItems: [string, string, string];
  serviceIcons: string[];
  processEyebrow: string;
  processHeading: string;
  contactBadge: string;
  ctaLabel: string;
  aboutLabel: string;
  galleryLabel: string;
  heroPattern: (accentColor: string) => string;
  modernServiceCardClass: string;
  artisanServiceCardClass: string;
};

function getSectorVisualTheme(
  activity: string,
  city: string,
): SectorVisualTheme {
  const value = activity.trim().toLowerCase();

  const base = {
    processEyebrow: "Comment ça marche ?",
    ctaLabel: "Demander un devis",
    modernServiceCardClass:
      "rounded-3xl border border-slate-200 bg-white shadow-sm",
    artisanServiceCardClass:
      "rounded-2xl border border-stone-300 bg-[#fffaf0] shadow-sm",
  };

  if (
    ["plomb", "sanitaire", "chauff"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "plomberie",
      icon: "🔧",
      heroFallback: "Plomberie & installations sanitaires",
      serviceLabel: "Plomberie",
      serviceHeading: "Des solutions fiables pour vos installations",
      serviceIntro: `Dépannage, installation et rénovation : des prestations de plomberie adaptées à votre besoin à ${city}.`,
      trustItems: [
        "Diagnostic ciblé",
        "Intervention adaptée",
        `Service à ${city}`,
      ],
      serviceIcons: ["💧", "🔎", "🚿", "🛁", "🔥", "🔧"],
      processEyebrow: "Votre intervention",
      processHeading: "Votre projet de plomberie, étape par étape.",
      contactBadge: "Besoin d’un plombier ?",
      ctaLabel: "Présenter mon besoin",
      aboutLabel: "Votre plombier",
      galleryLabel: "Interventions & réalisations",
      heroPattern: (accentColor) =>
        `linear-gradient(135deg, ${accentColor}22 0%, transparent 44%), radial-gradient(circle at 78% 22%, ${accentColor}44 0, transparent 26%)`,
      modernServiceCardClass:
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-2xl border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["élect", "electric", "domotique"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "electricite",
      icon: "⚡",
      heroFallback: "Électricité & équipements",
      serviceLabel: "Électricité",
      serviceHeading: "Des installations pensées pour votre sécurité",
      serviceIntro: `Installation, dépannage et équipements électriques présentés clairement pour vos projets à ${city}.`,
      trustItems: [
        "Besoin identifié",
        "Solution adaptée",
        `Intervention à ${city}`,
      ],
      serviceIcons: ["⚡", "💡", "🔌", "🧰", "🏠", "📡"],
      processEyebrow: "Votre installation",
      processHeading: "Un parcours clair pour votre projet électrique.",
      contactBadge: "Parlons de votre installation",
      ctaLabel: "Décrire mon besoin",
      aboutLabel: "Votre électricien",
      galleryLabel: "Installations & projets",
      heroPattern: (accentColor) =>
        `linear-gradient(115deg, ${accentColor}2f 0%, transparent 46%), repeating-linear-gradient(90deg, transparent 0 54px, ${accentColor}12 55px 56px)`,
      modernServiceCardClass:
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-xl border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["coiff", "barber", "barbier"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "coiffure",
      icon: "✂️",
      heroFallback: "Coiffure & style",
      serviceLabel: "Prestations",
      serviceHeading: "Des prestations pensées pour votre style",
      serviceIntro: `Coupe, soin et mise en beauté : découvrez l’univers de ${activity} proposé à ${city}.`,
      trustItems: [
        "Conseil personnalisé",
        "Soin & précision",
        "Style sur mesure",
      ],
      serviceIcons: ["✂️", "✨", "💇", "🎨", "🪞", "🧴"],
      processEyebrow: "Votre rendez-vous",
      processHeading: "Votre style, de l’idée au résultat.",
      contactBadge: "Envie de changer de style ?",
      ctaLabel: "Prendre contact",
      aboutLabel: "Le salon",
      galleryLabel: "Styles & réalisations",
      heroPattern: (accentColor) =>
        `radial-gradient(circle at 18% 18%, ${accentColor}44 0, transparent 30%), linear-gradient(135deg, transparent 30%, ${accentColor}1f 100%)`,
      modernServiceCardClass:
        "rounded-[2rem] border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-[2rem] border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["restaurant", "restaur", "traiteur", "cuisine"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "restauration",
      icon: "🍽️",
      heroFallback: "Cuisine & savoir-faire",
      serviceLabel: "À découvrir",
      serviceHeading: "Une expérience gourmande à découvrir",
      serviceIntro: `Découvrez les spécialités, services et savoir-faire de ${siteSafeActivity(activity)} à ${city}.`,
      trustItems: [
        "Savoir-faire maison",
        "Expérience conviviale",
        `À découvrir à ${city}`,
      ],
      serviceIcons: ["🍽️", "🥘", "🥗", "🍰", "🥂", "👨‍🍳"],
      processEyebrow: "Votre expérience",
      processHeading: "Découvrez, choisissez, puis profitez.",
      contactBadge: "Une table, un événement, une question ?",
      ctaLabel: "Nous contacter",
      aboutLabel: "Notre cuisine",
      galleryLabel: "Assiettes & ambiance",
      heroPattern: (accentColor) =>
        `radial-gradient(circle at 22% 18%, ${accentColor}50 0, transparent 28%), radial-gradient(circle at 78% 82%, ${accentColor}28 0, transparent 30%)`,
      modernServiceCardClass:
        "rounded-[2rem] border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-3xl border border-stone-300 bg-[#fffaf0] shadow-md",
    };
  }

  if (
    ["boulanger", "pâtiss", "patiss"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "boulangerie",
      icon: "🥐",
      heroFallback: "Créations artisanales",
      serviceLabel: "Nos créations",
      serviceHeading: "Des créations préparées avec savoir-faire",
      serviceIntro: `Découvrez les produits, spécialités et créations proposées à ${city}.`,
      trustItems: [
        "Créations maison",
        "Savoir-faire artisanal",
        `À retrouver à ${city}`,
      ],
      serviceIcons: ["🥐", "🥖", "🍰", "🧁", "🍫", "☕"],
      processEyebrow: "Notre savoir-faire",
      processHeading: "Du savoir-faire à la dégustation.",
      contactBadge: "Une commande ou une question ?",
      ctaLabel: "Nous contacter",
      aboutLabel: "La maison",
      galleryLabel: "Créations & spécialités",
      heroPattern: (accentColor) =>
        `linear-gradient(135deg, ${accentColor}33 0%, transparent 48%), radial-gradient(circle at 80% 25%, ${accentColor}2a 0, transparent 25%)`,
      modernServiceCardClass:
        "rounded-[2rem] border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-3xl border border-stone-300 bg-[#fffaf0] shadow-md",
    };
  }

  if (
    ["jardin", "paysag", "espace vert"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "paysage",
      icon: "🌿",
      heroFallback: "Jardins & espaces extérieurs",
      serviceLabel: "Espaces verts",
      serviceHeading: "Des extérieurs pensés pour votre quotidien",
      serviceIntro: `Aménagement, entretien et création paysagère pour vos espaces extérieurs à ${city}.`,
      trustItems: [
        "Conseil adapté",
        "Projet extérieur",
        `Présence locale à ${city}`,
      ],
      serviceIcons: ["🌿", "🌱", "🌳", "✂️", "🪴", "🏡"],
      processEyebrow: "Votre extérieur",
      processHeading: "De l’idée à un extérieur qui vous ressemble.",
      contactBadge: "Un projet pour votre jardin ?",
      ctaLabel: "Présenter mon projet",
      aboutLabel: "Votre paysagiste",
      galleryLabel: "Jardins & aménagements",
      heroPattern: (accentColor) =>
        `radial-gradient(circle at 15% 20%, ${accentColor}42 0, transparent 34%), linear-gradient(160deg, transparent 55%, ${accentColor}20 100%)`,
      modernServiceCardClass:
        "rounded-[2rem] border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-3xl border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["garage", "auto", "mécan", "mecan"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "automobile",
      icon: "🚗",
      heroFallback: "Entretien & mécanique automobile",
      serviceLabel: "Atelier",
      serviceHeading: "Des solutions claires pour votre véhicule",
      serviceIntro: `Entretien, diagnostic et réparation : découvrez les prestations proposées à ${city}.`,
      trustItems: [
        "Diagnostic",
        "Entretien adapté",
        "Contact atelier",
      ],
      serviceIcons: ["🔧", "🚗", "🛞", "🧰", "⚙️", "🔍"],
      processEyebrow: "Votre véhicule",
      processHeading: "Du diagnostic à la remise en route.",
      contactBadge: "Un souci avec votre véhicule ?",
      ctaLabel: "Décrire le problème",
      aboutLabel: "L’atelier",
      galleryLabel: "Atelier & interventions",
      heroPattern: (accentColor) =>
        `repeating-linear-gradient(135deg, transparent 0 42px, ${accentColor}12 43px 44px), radial-gradient(circle at 80% 20%, ${accentColor}40 0, transparent 28%)`,
      modernServiceCardClass:
        "rounded-xl border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-xl border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["photo", "vidéo", "video", "photographe"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "photo",
      icon: "📷",
      heroFallback: "Image & création",
      serviceLabel: "Créations",
      serviceHeading: "Des images pensées pour raconter votre histoire",
      serviceIntro: `Portraits, reportages et créations visuelles réalisés autour de vos projets à ${city}.`,
      trustItems: [
        "Regard créatif",
        "Projet personnalisé",
        "Images soignées",
      ],
      serviceIcons: ["📷", "🎞️", "✨", "🖼️", "🎥", "🌅"],
      processEyebrow: "Votre projet visuel",
      processHeading: "De votre idée à des images qui vous ressemblent.",
      contactBadge: "Un projet à mettre en image ?",
      ctaLabel: "Parler de mon projet",
      aboutLabel: "Le studio",
      galleryLabel: "Portfolio",
      heroPattern: (accentColor) =>
        `linear-gradient(120deg, ${accentColor}28 0%, transparent 40%), radial-gradient(circle at 82% 18%, ${accentColor}44 0, transparent 24%)`,
      modernServiceCardClass:
        "rounded-none border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-2xl border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  if (
    ["avocat", "jurid", "notaire", "conseil"].some((keyword) =>
      value.includes(keyword),
    )
  ) {
    return {
      ...base,
      key: "juridique",
      icon: "⚖️",
      heroFallback: "Conseil & accompagnement",
      serviceLabel: "Expertise",
      serviceHeading: "Un accompagnement clair pour vos démarches",
      serviceIntro: `Découvrez les domaines d’accompagnement et les services proposés à ${city}.`,
      trustItems: [
        "Écoute du besoin",
        "Échange confidentiel",
        "Accompagnement clair",
      ],
      serviceIcons: ["⚖️", "📄", "🖋️", "🏛️", "📚", "🤝"],
      processEyebrow: "Votre démarche",
      processHeading: "Un accompagnement structuré, étape par étape.",
      contactBadge: "Besoin d’un premier échange ?",
      ctaLabel: "Prendre contact",
      aboutLabel: "Le cabinet",
      galleryLabel: "Le cabinet",
      heroPattern: (accentColor) =>
        `linear-gradient(90deg, ${accentColor}24 0%, transparent 38%), repeating-linear-gradient(0deg, transparent 0 70px, ${accentColor}0c 71px 72px)`,
      modernServiceCardClass:
        "rounded-lg border border-slate-200 bg-white shadow-sm",
      artisanServiceCardClass:
        "rounded-lg border border-stone-300 bg-[#fffaf0] shadow-sm",
    };
  }

  return {
    ...base,
    key: "general",
    icon: getActivityTheme(activity).icon,
    heroFallback: activity || "Activité professionnelle",
    serviceLabel: "Services",
    serviceHeading: "Des solutions pensées pour votre besoin",
    serviceIntro: `Découvrez les principaux services proposés à ${city}.`,
    trustItems: [
      "Contact direct",
      "Service personnalisé",
      `Présence locale à ${city}`,
    ],
    serviceIcons: ["✦", "◆", "●", "■", "▲", "○"],
    processEyebrow: "Votre projet",
    processHeading: `Votre projet ${activityProjectPhrase(activity)}, étape par étape.`,
    contactBadge: "Parlons de votre besoin",
    ctaLabel: "Présenter mon besoin",
    aboutLabel: "L’entreprise",
    galleryLabel: "Réalisations",
    heroPattern: (accentColor) =>
      `radial-gradient(circle at 20% 20%, ${accentColor}44 0, transparent 32%), radial-gradient(circle at 82% 78%, ${accentColor}28 0, transparent 28%)`,
  };
}

function cleanActivityLabel(activity: string) {
  const clean = activity
    .replace(/[;,]+/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  return clean || "activité professionnelle";
}

function siteSafeActivity(activity: string) {
  const clean = cleanActivityLabel(activity);
  return clean || "l’entreprise";
}

function getSectionIcon(
  section: SiteSection,
  _activity: string,
  index: number,
) {
  const mode = section.iconMode?.trim().toLowerCase();

  if (mode === "none") {
    return "";
  }

  if (mode === "custom") {
    return section.icon?.trim() || "✨";
  }

  // Par défaut, une numérotation sobre plutôt qu'un emoji : rendu plus haut de gamme.
  return String(index + 1).padStart(2, "0");
}


function getSectionImage(
  site: GeneratedSite,
  section: SiteSection,
  index: number,
) {
  const mode = section.imageMode?.trim().toLowerCase();

  if (mode === "none") {
    return "";
  }

  if (mode === "custom") {
    return section.imageUrl?.trim() || "";
  }

  if (section.imageUrl?.trim() && !section.imageMode) {
    return section.imageUrl.trim();
  }

  const gallery = (site.gallery ?? []).filter(
    (url) => url?.trim(),
  );

  if (gallery.length === 0) {
    return "";
  }

  return gallery[index % gallery.length];
}


function activityProjectPhrase(activity: string) {
  const noun = getActivityTheme(activity).noun;
  const startsWithVowel = /^[aeiouyhàâäéèêëîïôöùûü]/i.test(noun);
  return startsWithVowel ? `d’${noun}` : `de ${noun}`;
}

function textOr(value: string | undefined, fallback: string) {
  const clean = value?.trim();
  return clean ? clean : fallback;
}

function getBenefits(
  site: GeneratedSite,
  city: string,
  activity: string,
): SiteBenefit[] {
  const generated = (site.benefits ?? []).filter(
    (item) => item?.title?.trim() && item?.text?.trim(),
  );

  if (generated.length > 0) {
    return generated.slice(0, 3);
  }

  const sector = getSectorVisualTheme(activity, city);

  return sector.trustItems.map((title, index) => ({
    title,
    text:
      index === 0
        ? `Une première approche adaptée à votre besoin en ${getActivityTheme(activity).noun}.`
        : index === 1
          ? "Des informations claires pour avancer selon votre situation."
          : `Un contact ancré localement autour de ${city}.`,
  }));
}

const defaultLayoutOrder: LayoutBlock[] = [
  "about",
  "services",
  "process",
  "faq",
  "gallery",
  "contact",
];

function normalizeLayoutOrder(
  value: LayoutBlock[] | undefined,
): LayoutBlock[] {
  const valid = new Set<LayoutBlock>(
    defaultLayoutOrder,
  );

  const result: LayoutBlock[] = [];

  for (const block of value ?? []) {
    if (
      valid.has(block) &&
      !result.includes(block)
    ) {
      result.push(block);
    }
  }

  for (const block of defaultLayoutOrder) {
    if (!result.includes(block)) {
      result.push(block);
    }
  }

  return result;
}

function getLayoutOrder(
  site: GeneratedSite,
  block: LayoutBlock,
) {
  const order =
    normalizeLayoutOrder(
      site.layoutOrder,
    );

  const index =
    order.indexOf(block);

  return 10 + Math.max(index, 0);
}

function isLayoutBlockVisible(
  site: GeneratedSite,
  block: LayoutBlock,
) {
  return !(
    site.hiddenBlocks ?? []
  ).includes(block);
}

function OrderedBlock({
  site,
  block,
  children,
}: {
  site: GeneratedSite;
  block: LayoutBlock;
  children: React.ReactNode;
}) {
  if (
    !isLayoutBlockVisible(
      site,
      block,
    )
  ) {
    return null;
  }

  return (
    <div
      style={{
        order:
          getLayoutOrder(
            site,
            block,
          ),
      }}
    >
      {children}
    </div>
  );
}


function getProjectTitle(activity: string, index: number) {
  const value = activity.toLowerCase();

  const titleGroups: Array<{ keywords: string[]; titles: string[] }> = [
    {
      keywords: ["plomb", "chauff", "sanitaire"],
      titles: ["Dépannage", "Installation", "Rénovation", "Entretien", "Remplacement", "Intervention urgente"],
    },
    {
      keywords: ["élect", "electric", "domotique"],
      titles: ["Installation électrique", "Mise aux normes", "Éclairage", "Tableau électrique", "Dépannage", "Domotique"],
    },
    {
      keywords: ["peint", "rénov", "renov", "bâtiment", "batiment"],
      titles: ["Rénovation intérieure", "Finitions", "Remise à neuf", "Transformation", "Chantier terminé", "Projet sur mesure"],
    },
    {
      keywords: ["menuis", "bois", "ébén", "eben"],
      titles: ["Fabrication sur mesure", "Pose", "Aménagement", "Finitions", "Rénovation", "Création artisanale"],
    },
    {
      keywords: ["maçon", "macon", "construction"],
      titles: ["Construction", "Maçonnerie", "Rénovation", "Aménagement extérieur", "Finitions", "Chantier terminé"],
    },
    {
      keywords: ["jardin", "paysag", "espace vert"],
      titles: ["Aménagement paysager", "Entretien", "Création de jardin", "Taille et soin", "Plantation", "Extérieur sur mesure"],
    },
    {
      keywords: ["coiff", "barber", "barbier"],
      titles: ["Coupe & style", "Transformation", "Soin", "Coloration", "Finition", "Création personnalisée"],
    },
    {
      keywords: ["restaurant", "traiteur", "cuisine", "boulanger", "pâtiss", "patiss"],
      titles: ["Création maison", "Spécialité", "Préparation du jour", "Savoir-faire", "Sélection gourmande", "Réalisation maison"],
    },
    {
      keywords: ["photo", "vidéo", "video", "photographe"],
      titles: ["Reportage", "Portrait", "Événement", "Séance photo", "Création visuelle", "Projet client"],
    },
    {
      keywords: ["garage", "auto", "mécan", "mecan"],
      titles: ["Entretien", "Réparation", "Diagnostic", "Remise en état", "Intervention atelier", "Projet terminé"],
    },
  ];

  const matched = titleGroups.find((group) =>
    group.keywords.some((keyword) => value.includes(keyword)),
  );

  const genericTitles = [
    "Réalisation sur mesure",
    "Intervention client",
    "Projet terminé",
    "Savoir-faire",
    "Accompagnement personnalisé",
    "Résultat final",
  ];

  const titles = matched?.titles ?? genericTitles;
  return titles[index % titles.length];
}


const PreviewOnlyContext = createContext(false);

function MobileContactBar({
  site,
  accentColor,
}: {
  site: GeneratedSite;
  accentColor: string;
}) {
  const previewOnly = useContext(PreviewOnlyContext);
  const hasPhone = Boolean(site.phone?.trim());

  return (
    <div
      data-siteai-mobile-action-bar
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/90 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
    >
      <div
        className={`mx-auto grid max-w-md gap-2 ${
          hasPhone ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {hasPhone && (
          <a
            href={
              previewOnly
                ? "#contact"
                : `tel:${phoneHref(site.phone)}`
            }
            className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-900"
          >
            ☎ Appeler
          </a>
        )}

        <a
          href="#contact"
          data-siteai-accent-background
          className="flex min-h-12 items-center justify-center rounded-xl px-3 text-center text-sm font-black text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          Demander un devis
        </a>
      </div>
    </div>
  );
}

export default function SitePreview(props: SitePreviewProps) {
  return <PreviewOnlyContext.Provider value={props.previewOnly ?? false}><SitePreviewContent {...props} /></PreviewOnlyContext.Provider>;
}

function SitePreviewContent({

  site,

  designStyle,

  accentColor,

  activity: rawActivity,

  city,

  onEdit,

}: SitePreviewProps) {
  const activity = cleanActivityLabel(rawActivity);
  const style = getDesignStyle(designStyle);
  const normalizedSite = normalizeSiteForDisplay(site);
  const designSettings = normalizeDesignSettings(
    {...style.settings, ...normalizedSite.designSettings},
  );

  if (site.designSettings?.template !== "classic") {
    // La police des titres suit le style, sauf si l'utilisateur en a choisi une autre.
    const chosenFont = site.designSettings?.font;
    const displayFont = chosenFont && chosenFont !== style.settings.font ? designSettings.font : "theme";
    return (
      <SignatureShell
        onEdit={onEdit}
        settings={designSettings}
        theme={style.id}
        displayFont={displayFont}
        accentColor={accentColor}
      >
        <SignatureTemplate
          onEdit={onEdit}
          site={normalizedSite}
          accentColor={accentColor}
          activity={activity}
          city={city}
          heroLayout={designSettings.heroLayout}
        />
      </SignatureShell>
    );
  }

  if (style.family === "elegant") {

    return (
      <DesignShell onEdit={onEdit} settings={designSettings} theme={style.id} hasHeroImage={Boolean(normalizedSite.heroImageUrl)} accentColor={accentColor}>
        <ElegantTemplate

        onEdit={onEdit}

site={normalizedSite}

        accentColor={accentColor}

        activity={activity}

        city={city}

      />
      </DesignShell>
    );

  }



  if (style.family === "artisan") {

    return (
      <DesignShell onEdit={onEdit} settings={designSettings} theme={style.id} hasHeroImage={Boolean(normalizedSite.heroImageUrl)} accentColor={accentColor}>
        <ArtisanTemplate

        onEdit={onEdit}

site={normalizedSite}

        accentColor={accentColor}

        activity={activity}

        city={city}

      />
      </DesignShell>
    );

  }



  return (
      <DesignShell onEdit={onEdit} settings={designSettings} theme={style.id} hasHeroImage={Boolean(normalizedSite.heroImageUrl)} accentColor={accentColor}>
        <ModernTemplate

      onEdit={onEdit}

site={normalizedSite}

      accentColor={accentColor}

      activity={activity}

      city={city}

    />
      </DesignShell>
    );

}



function ModernTemplate({

  site,

  accentColor,

  activity,

  city,

  onEdit,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {
  const edit = (target: PreviewEditTarget) => previewEditProps(target, Boolean(onEdit));
  const sector = getSectorVisualTheme(activity, city);

  return (

    <div className="flex flex-col overflow-hidden bg-white text-slate-950">

      <MobileContactBar site={site} accentColor={accentColor} />

      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href={onEdit ? undefined : "#"} className="flex min-w-0 items-center gap-3">
            {site.logoUrl ? (
              <img {...edit({ kind: "field", field: "logoUrl" })}
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-11 w-11 shrink-0 rounded-xl object-contain"
              />
            ) : (
              <div {...edit({ kind: "field", field: "logoUrl" })}
                data-siteai-accent-background
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {site.businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p {...edit({ kind: "field", field: "businessName" })} className="truncate text-base font-black sm:text-lg">
                {site.businessName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="#services" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              {sector.serviceLabel}
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              Contact
            </a>

            {(site.phone || goalAction(site)) && (
              <a {...edit({ kind: "field", field: "phone" })}
                data-siteai-accent-background
                href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                style={{ backgroundColor: accentColor }}
                className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900">
              Menu
              <span aria-hidden="true">☰</span>
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              <a href="#services" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                {sector.serviceLabel}
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Contact
              </a>

              {(site.phone || goalAction(site)) && (
                <a {...edit({ kind: "field", field: "phone" })}
                  data-siteai-accent-background
                  href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                  style={{ backgroundColor: accentColor }}
                  className="mt-2 block rounded-xl px-4 py-3 text-center text-sm font-black text-white"
                >
                  {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section data-siteai-hero className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: sector.heroPattern(accentColor),
          }}
        />

        <div
          className={`relative mx-auto grid min-h-[520px] max-w-7xl sm:min-h-[620px] ${
            site.heroImageUrl
              ? "lg:grid-cols-[1.05fr_0.95fr]"
              : ""
          }`}
        >
          <div className="flex items-center px-5 py-14 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <div data-siteai-hero-content className={site.heroImageUrl ? "max-w-2xl" : "mx-auto max-w-4xl text-center"}>
              <div data-siteai-hero-badges className={`flex flex-wrap gap-2 ${site.heroImageUrl ? "" : "justify-center"}`}>
                <span
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: accentColor }}
                >
                                    {textOr(site.heroEyebrow, sector.heroFallback)}
                </span>

                {city && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
                    {city}
                  </span>
                )}
              </div>

              <h1 {...edit({ kind: "field", field: "heroTitle" })} className="mt-6 text-[2.35rem] font-black leading-[1.04] tracking-tight sm:mt-7 sm:text-5xl lg:text-6xl">
                {site.heroTitle}
              </h1>

              <p {...edit({ kind: "field", field: "heroText" })}
                className={`mt-6 text-base leading-8 text-slate-300 sm:text-lg ${
                  site.heroImageUrl
                    ? "max-w-xl"
                    : "mx-auto max-w-2xl"
                }`}
              >
                {site.heroText}
              </p>

              <div data-siteai-hero-actions className={`mt-9 flex flex-wrap gap-3 ${site.heroImageUrl ? "" : "justify-center"}`}>
                {(site.phone || goalAction(site)) && (
                  <a {...edit({ kind: "field", field: "phone" })}
                    data-siteai-accent-background
                    href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                    style={{ backgroundColor: accentColor }}
                    className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 sm:w-auto"
                  >
                    {goalAction(site)?.label ?? textOr(site.primaryCta, "Appeler maintenant")}
                  </a>
                )}

                <a
                  href="#contact"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10 sm:w-auto"
                >
                  {textOr(site.secondaryCta, "Demander un devis")}
                </a>
              </div>

              <div
                className={`mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400 ${
                  site.heroImageUrl ? "" : "justify-center"
                }`}
              >
                {sector.trustItems.map((item) => (
                  <span key={item}>✓ {item}</span>
                ))}
              </div>
            </div>
          </div>

          {site.heroImageUrl && (
            <div {...edit({ kind: "field", field: "heroImageUrl" })} className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[620px]">
              <img
                src={site.heroImageUrl}
                alt={site.businessName}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-slate-950/35 lg:via-transparent lg:to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/15 bg-slate-950/65 p-4 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {activity}
                </p>
                <p className="mt-1 font-black text-white">
                  {site.businessName}
                  {city ? ` · ${city}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-7 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {getBenefits(site, city, activity).map((item, index) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
            >
              <div
                data-siteai-accent-background
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <div>
                <p className="font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <OrderedBlock site={site} block="about">


        <AboutSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="modern"
      />


      </OrderedBlock>

<OrderedBlock site={site} block="services">
      <section id="services" className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:py-24">

        <div className="mx-auto max-w-6xl">

          <div className="mx-auto max-w-3xl text-center">

            <p

              style={{

                color: accentColor,

              }}

              className="text-sm font-black uppercase tracking-[0.25em]"

            >

              {sector.serviceLabel}

            </p>



            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">

              {sector.serviceHeading}

            </h2>



            <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-500">

              {sector.serviceIntro}

            </p>

          </div>



          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {site.sections.filter((section) => !section.hidden).map(

              (

                section,

                index,

              ) => (

                <article

                  key={index}

                  className={`group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl ${sector.modernServiceCardClass}`}

                >

                  <div

                    className="absolute inset-x-0 top-0 h-1"

                    style={{

                      backgroundColor: accentColor,

                    }}

                  />



                  {getSectionImage(
                    site,
                    section,
                    index,
                  ) && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                      <img {...edit({ kind: "section", index: site.sections.indexOf(section) })}
                        src={getSectionImage(
                          site,
                          section,
                          index,
                        )}
                        alt={`Illustration ${section.title}`}
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                  )}



                  <div className="flex items-center justify-between gap-4">

                    {getSectionIcon(
                      section,
                      activity,
                      index,
                    ) && (
                      <div

                        style={{

                          backgroundColor: `${accentColor}14`,

                          color: accentColor,

                        }}

                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black"

                      >

                        <span aria-hidden="true">
                          {getSectionIcon(
                            section,
                            activity,
                            index,
                          )}
                        </span>

                      </div>
                    )}



                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">

                      {sector.serviceLabel}

                    </span>

                  </div>



                  <h3 {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="mt-7 text-xl font-black leading-snug sm:text-2xl">

                    {section.title}

                  </h3>



                  <p {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="mt-4 leading-7 text-slate-600">

                    {section.text}

                  </p>



                  <a
                    href="#contact"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: accentColor }}
                  >
                    {sector.ctaLabel}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </a>

                </article>

              ),

            )}

          </div>

        </div>

      </section>



      <section className="bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                Votre projet
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Besoin d&apos;échanger avec {site.businessName} ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Présentez votre besoin et obtenez les informations utiles pour avancer.
              </p>
            </div>

            <a
              href={goalAction(site)?.href ?? "#contact"}
              data-siteai-accent-background
              className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
              style={{ backgroundColor: accentColor }}
            >
              {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
            </a>
          </div>
        </div>
      </section>

      </OrderedBlock>

      <OrderedBlock site={site} block="process">


        <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="modern"
      />


      </OrderedBlock>

      <OrderedBlock site={site} block="faq">


        <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="modern"
      />


      </OrderedBlock>

      {isLayoutBlockVisible(site, "gallery") && (site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" style={{ order: getLayoutOrder(site, "gallery") }} className="bg-slate-50 px-6 py-20 sm:px-8 lg:py-24">

          <div className="mx-auto max-w-6xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-sm font-black uppercase tracking-[0.25em]"

                >

                  {sector.galleryLabel}

                </p>



                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">

                  Des projets qui parlent d&apos;eux-mêmes

                </h2>

              </div>



              <p className="max-w-md leading-7 text-slate-500">

                Quelques exemples du travail réalisé par {site.businessName}.

              </p>

            </div>



            <div className="mt-10 grid auto-rows-[180px] gap-4 sm:auto-rows-[220px] sm:grid-cols-2 lg:grid-cols-3">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure key={`${imageUrl}-${index}`} {...edit({ kind: "gallery" })}

                    className={`group relative overflow-hidden rounded-3xl bg-slate-200 shadow-sm ${

                      index === 0

                        ? "sm:col-span-2 sm:row-span-2"

                        : index === 3

                          ? "lg:row-span-2"

                          : ""

                    }`}

                  >

                    <img

                      src={imageUrl}

                      alt={`Réalisation ${index + 1} de ${site.businessName}`}

                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"

                    />



                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent opacity-70 transition group-hover:opacity-90" />



                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">

                          {getProjectTitle(activity, index)}

                        </p>



                        <p className="mt-1 font-black">

                          {site.businessName}

                        </p>

                      </div>



                      <span

                        data-siteai-accent-background
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white"

                        style={{ backgroundColor: accentColor }}

                      >

                        ↗

                      </span>

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <TestimonialsSection site={site} accentColor={accentColor} variant="modern" />

      <OrderedBlock site={site} block="contact">




        <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark={false}

      />




      </OrderedBlock>



      <footer style={{ order: 1000 }} className="bg-slate-950 px-6 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <div className="flex items-center gap-3">
                {site.logoUrl ? (
                  <img {...edit({ kind: "field", field: "logoUrl" })}
                    src={site.logoUrl}
                    alt={`Logo ${site.businessName}`}
                    className="h-11 w-11 rounded-xl bg-white object-contain p-1"
                  />
                ) : (
                  <div {...edit({ kind: "field", field: "logoUrl" })}
                    data-siteai-accent-background
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {site.businessName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p {...edit({ kind: "field", field: "businessName" })} className="text-lg font-black">{site.businessName}</p>
                  <p className="text-sm text-slate-400">
                    {activity} · {city}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                Une présentation claire de l&apos;activité, des services et des réalisations de {site.businessName}.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Navigation
              </p>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-300">
                <a href="#services" className="block transition hover:text-white">
                  Services
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-white">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-white">
                  FAQ
                </a>
                <a href="#contact" className="block transition hover:text-white">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Contact
              </p>

              <p className="mt-4 text-sm text-slate-400">{city}</p>

              {site.phone && (
                <a {...edit({ kind: "field", field: "phone" })}
                  href={`tel:${phoneHref(site.phone)}`}
                  className="mt-3 block text-sm font-black"
                  style={{ color: accentColor }}
                >
                  {formatPhoneNumber(site.phone)}
                </a>
              )}
              <SocialLinksList links={site.socialLinks} accentColor={accentColor} />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec Lumio</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function ElegantTemplate({

  site,

  accentColor,

  activity,

  city,

  onEdit,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {
  const edit = (target: PreviewEditTarget) => previewEditProps(target, Boolean(onEdit));
  const sector = getSectorVisualTheme(activity, city);

  return (

    <div className="flex flex-col overflow-hidden bg-[#f8f6f1] text-neutral-950">

      <MobileContactBar site={site} accentColor={accentColor} />

      <nav className="sticky top-0 z-50 border-b border-neutral-300 bg-[#f8f6f1]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <a href={onEdit ? undefined : "#"} className="flex min-w-0 items-center gap-4">
            {site.logoUrl && (
              <img {...edit({ kind: "field", field: "logoUrl" })}
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-11 w-11 shrink-0 object-contain"
              />
            )}

            <div className="min-w-0">
              <p {...edit({ kind: "field", field: "businessName" })} className="truncate text-base font-light uppercase tracking-[0.14em] sm:text-lg">
                {site.businessName}
              </p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            <a href="#services" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
              {sector.serviceLabel}
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:text-neutral-950">
              Contact
            </a>

            {(site.phone || goalAction(site)) && (
              <a {...edit({ kind: "field", field: "phone" })}
                href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                style={{ borderColor: accentColor, color: accentColor }}
                className="border px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
              >
                {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none border border-neutral-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em]">
              Menu
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] border border-neutral-300 bg-[#f8f6f1] p-3 shadow-2xl">
              <a href="#services" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                {sector.serviceLabel}
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                Contact
              </a>

              {(site.phone || goalAction(site)) && (
                <a {...edit({ kind: "field", field: "phone" })}
                  href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                  style={{ borderColor: accentColor, color: accentColor }}
                  className="mt-2 block border px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em]"
                >
                  {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section
        data-siteai-hero
        className="relative flex min-h-[560px] items-center overflow-hidden bg-neutral-950 text-white sm:min-h-[650px]"
        style={
          site.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.78) 44%, rgba(10,10,10,0.28) 100%), url("${site.heroImageUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-16 sm:px-10 sm:py-24 lg:px-14">
          <div data-siteai-hero-content className="max-w-3xl">
            <div data-siteai-hero-badges className="flex items-center gap-4">
              <div
                className="h-px w-14"
                style={{ backgroundColor: accentColor }}
              />
              <p
                style={{ color: accentColor }}
                className="text-xs font-semibold uppercase tracking-[0.4em]"
              >
                                {textOr(site.heroEyebrow, sector.heroFallback)} · {city}
              </p>
            </div>

            <h1 {...edit({ kind: "field", field: "heroTitle" })} className="mt-7 text-[2.65rem] font-light leading-[1.02] tracking-tight sm:mt-9 sm:text-6xl lg:text-7xl">
              {site.heroTitle}
            </h1>

            <p {...edit({ kind: "field", field: "heroText" })} className="mt-8 max-w-2xl text-base font-light leading-8 text-neutral-300 sm:text-lg">
              {site.heroText}
            </p>

            <div data-siteai-hero-actions className="mt-10 flex flex-wrap gap-4">
              <a
                href={goalAction(site)?.href ?? "#contact"}
                style={{ borderColor: accentColor, color: accentColor }}
                className="w-full border px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-white hover:text-black sm:w-auto sm:px-7 sm:tracking-[0.2em]"
              >
                {goalAction(site)?.label ?? textOr(site.primaryCta, "Nous contacter")}
              </a>

              {site.phone && (
                <a {...edit({ kind: "field", field: "phone" })}
                  href={`tel:${phoneHref(site.phone)}`}
                  className="w-full border border-white/25 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white sm:w-auto sm:px-7 sm:tracking-[0.2em]"
                >
                  {formatPhoneNumber(site.phone)}
                </a>
              )}
            </div>

            <div className="mt-14 grid max-w-2xl gap-5 border-t border-white/15 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Activité
                </p>
                <p className="mt-2 text-sm text-neutral-200">{activity}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Localisation
                </p>
                <p className="mt-2 text-sm text-neutral-200">{city}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Contact
                </p>
                <p {...edit({ kind: "field", field: "phone" })} className="mt-2 text-sm text-neutral-200">
                  {site.phone ? formatPhoneNumber(site.phone) : "Sur demande"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            {...edit({ kind: "field", field: "heroImageUrl" })}
            className="absolute bottom-4 right-4 z-20 rounded-full border border-white/40 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur"
          >
            {site.heroImageUrl ? "Modifier la photo" : "Ajouter une photo"}
          </button>
        )}
      </section>

      <section className="border-y border-neutral-300 bg-[#f8f6f1] px-6 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl divide-y divide-neutral-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {getBenefits(site, city, activity).map((item, index) => (
            <div
              key={item.title}
              className="px-0 py-6 sm:px-8 sm:py-2 first:sm:pl-0 last:sm:pr-0"
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.32em]"
                style={{ color: accentColor }}
              >
                0{index + 1}
              </p>

              <p className="mt-3 text-xl font-light">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <OrderedBlock site={site} block="about">


        <AboutSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="elegant"
      />


      </OrderedBlock>

<OrderedBlock site={site} block="services">
      <section id="services" className="px-5 py-16 sm:px-8 sm:py-24 lg:py-28">

        <div className="mx-auto max-w-6xl">

          <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">

            <div className="lg:sticky lg:top-10 lg:self-start">

              <p

                style={{

                  color:

                    accentColor,

                }}

                className="text-xs font-bold uppercase tracking-[0.4em]"

              >

                {sector.serviceLabel}

              </p>



              <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">

                {sector.serviceHeading}

              </h2>



              <p className="mt-6 max-w-md leading-8 text-neutral-500">

                {sector.serviceIntro}

              </p>

            </div>



            <div className="border-t border-neutral-300">

              {site.sections.filter((section) => !section.hidden).map(

                (

                  section,

                  index,

                ) => (

                  <article

                    key={index}

                    className={`group grid gap-5 border-b border-neutral-300 py-9 transition-colors duration-300 md:items-start ${
                      getSectionIcon(
                        section,
                        activity,
                        index,
                      )
                        ? "md:grid-cols-[80px_1fr_auto]"
                        : "md:grid-cols-[1fr_auto]"
                    }`}

                  >

                    {getSectionImage(
                      site,
                      section,
                      index,
                    ) && (
                      <div className="overflow-hidden rounded-sm bg-neutral-100 md:col-span-full">
                        <img {...edit({ kind: "section", index: site.sections.indexOf(section) })}
                          src={getSectionImage(
                            site,
                            section,
                            index,
                          )}
                          alt={`Illustration ${section.title}`}
                          className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {getSectionIcon(
                      section,
                      activity,
                      index,
                    ) && (
                      <p

                        style={{

                          color:

                            accentColor,

                        }}

                        className="pt-1 text-2xl font-semibold tracking-[0.18em]"

                      >

                        {getSectionIcon(
                          section,
                          activity,
                          index,
                        )}

                      </p>
                    )}



                    <div>

                      <h3 {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="text-2xl font-light leading-snug sm:text-3xl">

                        {

                          section.title

                        }

                      </h3>



                      <p {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="mt-4 max-w-2xl leading-8 text-neutral-600">

                        {

                          section.text

                        }

                      </p>

                    </div>



                    <a
                      href="#contact"
                      aria-label={`Demander un devis pour ${section.title}`}
                      className="hidden h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-lg transition duration-300 group-hover:translate-x-1 md:flex"
                      style={{ color: accentColor }}
                    >
                      →
                    </a>

                  </article>

                ),

              )}

            </div>

          </div>

        </div>

      </section>



      <section className="bg-[#f8f6f1] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl border-y border-neutral-300 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em]" style={{ color: accentColor }}>
                Votre projet
              </p>
              <h2 className="mt-4 text-3xl font-light sm:text-4xl">
                Échangeons autour de votre besoin.
              </h2>
            </div>

            <a
              href={goalAction(site)?.href ?? "#contact"}
              className="w-full border px-7 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] transition hover:-translate-y-0.5 sm:w-auto"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
            </a>
          </div>
        </div>
      </section>

      </OrderedBlock>

      <OrderedBlock site={site} block="process">


        <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="elegant"
      />


      </OrderedBlock>

      <OrderedBlock site={site} block="faq">


        <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="elegant"
      />


      </OrderedBlock>

      {isLayoutBlockVisible(site, "gallery") && (site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" style={{ order: getLayoutOrder(site, "gallery") }} className="bg-neutral-950 px-6 py-24 text-white sm:px-8 lg:py-28">

          <div className="mx-auto max-w-6xl">

            <div className="grid gap-8 border-b border-neutral-800 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-xs font-bold uppercase tracking-[0.4em]"

                >

                  {sector.galleryLabel}

                </p>



                <h2 className="mt-5 max-w-3xl text-4xl font-light leading-tight sm:text-5xl">

                  Une sélection de réalisations choisies avec soin.

                </h2>

              </div>



              <p className="max-w-sm text-sm leading-7 text-neutral-500 lg:text-right">

                Une présentation sobre pour mettre le travail de {site.businessName} au premier plan.

              </p>

            </div>



            <div className="mt-12 grid gap-6 md:grid-cols-2">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure key={`${imageUrl}-${index}`} {...edit({ kind: "gallery" })}

                    className={`${

                      index % 4 === 0

                        ? "md:col-span-2"

                        : ""

                    } group`}

                  >

                    <div className="overflow-hidden bg-neutral-900">

                      <img

                        src={imageUrl}

                        alt={`Réalisation ${index + 1} de ${site.businessName}`}

                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${

                          index % 4 === 0

                            ? "h-64 sm:h-80 md:h-[520px]"

                            : "h-64 sm:h-80 md:h-[380px]"

                        }`}

                      />

                    </div>



                    <figcaption className="flex items-center justify-between gap-4 border-b border-neutral-800 py-4">

                      <div>

                        <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">

                          {getProjectTitle(activity, index)}

                        </p>

                      </div>



                      <span

                        className="text-sm"

                        style={{ color: accentColor }}

                      >

                        {city}

                      </span>

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <TestimonialsSection site={site} accentColor={accentColor} variant="elegant" />

      <OrderedBlock site={site} block="contact">




        <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark={false}

        elegant

      />




      </OrderedBlock>



      <footer style={{ order: 1000 }} className="border-t border-neutral-300 bg-[#f8f6f1] px-6 py-14 text-neutral-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 border-b border-neutral-300 pb-12 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <p {...edit({ kind: "field", field: "businessName" })} className="text-xl font-light uppercase tracking-[0.16em]">
                {site.businessName}
              </p>

              <p className="mt-4 max-w-md text-sm leading-7 text-neutral-500">
                {activity} à {city}. Une présentation sobre et soignée de notre savoir-faire.
              </p>
            </div>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
              >
                Découvrir
              </p>

              <div className="mt-5 space-y-3 text-xs font-bold uppercase tracking-[0.14em] text-neutral-600">
                <a href="#services" className="block transition hover:text-neutral-950">
                  Expertise
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-neutral-950">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-neutral-950">
                  Questions
                </a>
                <a href="#contact" className="block transition hover:text-neutral-950">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
              >
                Nous joindre
              </p>

              <p className="mt-5 text-sm text-neutral-500">{city}</p>

              {site.phone && (
                <a {...edit({ kind: "field", field: "phone" })}
                  href={`tel:${phoneHref(site.phone)}`}
                  className="mt-3 inline-block border-b pb-1 text-sm"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {formatPhoneNumber(site.phone)}
                </a>
              )}
              <SocialLinksList links={site.socialLinks} accentColor={accentColor} light />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs uppercase tracking-[0.14em] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec Lumio</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function ArtisanTemplate({

  site,

  accentColor,

  activity,

  city,

  onEdit,

}: Omit<

  SitePreviewProps,

  "designStyle"

>) {
  const edit = (target: PreviewEditTarget) => previewEditProps(target, Boolean(onEdit));
  const sector = getSectorVisualTheme(activity, city);

  return (

    <div className="flex flex-col overflow-hidden bg-[#f3eee4] text-stone-900">

      <MobileContactBar site={site} accentColor={accentColor} />

      <nav className="sticky top-0 z-50 border-b border-stone-300 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href={onEdit ? undefined : "#"} className="flex min-w-0 items-center gap-4">
            {site.logoUrl ? (
              <img {...edit({ kind: "field", field: "logoUrl" })}
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-12 w-12 shrink-0 rounded-full border border-stone-300 bg-white object-contain p-1"
              />
            ) : (
              <div {...edit({ kind: "field", field: "logoUrl" })}
                data-siteai-accent-background
                style={{ backgroundColor: accentColor }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-white"
              >
                {site.businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p {...edit({ kind: "field", field: "businessName" })} className="truncate text-lg font-black">
                {site.businessName}
              </p>
              <p className="truncate text-xs font-bold uppercase tracking-widest text-stone-500">
                {activity} · {city}
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="#services" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
              {sector.serviceLabel}
            </a>
            {(site.gallery ?? []).length > 0 && (
              <a href="#realisations" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
                Réalisations
              </a>
            )}
            <a href="#contact" className="text-sm font-black text-stone-600 transition hover:text-stone-950">
              Contact
            </a>

            {(site.phone || goalAction(site)) && (
              <a {...edit({ kind: "field", field: "phone" })}
                data-siteai-accent-background
                href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                style={{ backgroundColor: accentColor }}
                className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
              </a>
            )}
          </div>

          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-black text-stone-900">
              Menu
              <span aria-hidden="true">☰</span>
            </summary>

            <div className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-300 bg-[#fffaf0] p-3 shadow-2xl">
              <a href="#services" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                {sector.serviceLabel}
              </a>
              {(site.gallery ?? []).length > 0 && (
                <a href="#realisations" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                  Réalisations
                </a>
              )}
              <a href="#contact" className="block rounded-xl px-4 py-3 text-sm font-black text-stone-700 hover:bg-white">
                Contact
              </a>

              {(site.phone || goalAction(site)) && (
                <a {...edit({ kind: "field", field: "phone" })}
                  data-siteai-accent-background
                  href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                  style={{ backgroundColor: accentColor }}
                  className="mt-2 block rounded-xl px-4 py-3 text-center text-sm font-black text-white"
                >
                  {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
                </a>
              )}
            </div>
          </details>
        </div>
      </nav>



            <section data-siteai-hero className="relative overflow-hidden bg-stone-900 text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex items-center px-5 py-14 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <div data-siteai-hero-content className="max-w-2xl">
              <div data-siteai-hero-badges className="flex flex-wrap gap-2">
                <span
                  data-siteai-accent-background
                  style={{ backgroundColor: accentColor }}
                  className="inline-block rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                >
                                    {textOr(site.heroEyebrow, sector.heroFallback)}
                </span>

                {city && (
                  <span className="rounded-full border border-stone-600 px-4 py-2 text-xs font-bold text-stone-300">
                    {city}
                  </span>
                )}
              </div>

              <h1 {...edit({ kind: "field", field: "heroTitle" })} className="mt-6 text-[2.35rem] font-black leading-[1.04] tracking-tight sm:mt-7 sm:text-5xl lg:text-6xl">
                {site.heroTitle}
              </h1>

              <p {...edit({ kind: "field", field: "heroText" })} className="mt-6 max-w-xl text-base leading-8 text-stone-300 sm:text-lg">
                {site.heroText}
              </p>

              <div data-siteai-hero-actions className="mt-9 flex flex-wrap gap-3">
                {(site.phone || goalAction(site)) && (
                  <a {...edit({ kind: "field", field: "phone" })}
                    data-siteai-accent-background
                    href={goalAction(site)?.href ?? `tel:${phoneHref(site.phone)}`}
                    style={{ backgroundColor: accentColor }}
                    className="rounded-xl px-6 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5"
                  >
                    {goalAction(site)?.label ?? `☎ ${formatPhoneNumber(site.phone)}`}
                  </a>
                )}

                <a
                  href="#contact"
                  className="w-full rounded-xl border border-stone-600 bg-stone-800 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-stone-700 sm:w-auto"
                >
                  {textOr(site.secondaryCta, "Demander un devis")}
                </a>
              </div>

              <div className="mt-10 grid max-w-xl gap-3 text-sm text-stone-400 sm:grid-cols-3">
                {sector.trustItems.map((item) => (
                  <span key={item}>✓ {item}</span>
                ))}
              </div>
            </div>
          </div>

          <div {...edit({ kind: "field", field: "heroImageUrl" })} className="relative min-h-[280px] overflow-hidden sm:min-h-[380px] lg:min-h-[620px]">
            {site.heroImageUrl ? (
              <>
                <img
                  src={site.heroImageUrl}
                  alt={site.businessName}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent" />
              </>
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center bg-stone-800 sm:min-h-[380px] lg:min-h-[620px]">
                <div className="text-center">
                  <p className="font-serif text-7xl font-normal text-stone-400" aria-hidden="true">{cleanActivityLabel(activity).charAt(0).toUpperCase()}</p>
                  <p className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
                    {activity}
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-stone-950/70 p-5 backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                {activity}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {site.businessName}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-300 bg-[#fffaf0] px-6 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {getBenefits(site, city, activity).map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-stone-300 bg-white/70 p-5 shadow-sm"
            >
              <div
                data-siteai-accent-background
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                ✓
              </div>

              <div>
                <p className="font-black text-stone-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <OrderedBlock site={site} block="about">


        <AboutSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="artisan"
      />


      </OrderedBlock>

<OrderedBlock site={site} block="services">
      <section id="services" className="px-5 py-16 sm:px-8 sm:py-20 lg:py-24">

        <div className="mx-auto max-w-6xl">

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

            <div className="max-w-2xl">

              <p

                style={{

                  color: accentColor,

                }}

                className="text-sm font-black uppercase tracking-[0.25em]"

              >

                {sector.serviceLabel}

              </p>



              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

                {sector.serviceHeading}

              </h2>

            </div>



            <p className="max-w-md leading-7 text-stone-600">

              {sector.serviceIntro}

            </p>

          </div>



          <div className="mt-12 grid gap-5 md:grid-cols-2">

            {site.sections.filter((section) => !section.hidden).map(

              (

                section,

                index,

              ) => (

                <article

                  key={index}

                  className={`group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg ${sector.artisanServiceCardClass}`}

                >

                  {getSectionImage(
                    site,
                    section,
                    index,
                  ) && (
                    <div className="mb-6 overflow-hidden rounded-xl bg-stone-100">
                      <img {...edit({ kind: "section", index: site.sections.indexOf(section) })}
                        src={getSectionImage(
                          site,
                          section,
                          index,
                        )}
                        alt={`Illustration ${section.title}`}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-4">

                    {getSectionIcon(
                      section,
                      activity,
                      index,
                    ) && (
                      <div

                        style={{

                          backgroundColor:

                            accentColor,

                        }}

                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white shadow-sm"

                      >

                        {getSectionIcon(
                          section,
                          activity,
                          index,
                        )}

                      </div>
                    )}



                    <div className="min-w-0">

                      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">

                        {sector.serviceLabel} {String(index + 1).padStart(2, "0")}

                      </p>



                      <h3 {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="mt-2 text-xl font-black leading-snug sm:text-2xl">

                        {

                          section.title

                        }

                      </h3>

                    </div>

                  </div>



                  <p {...edit({ kind: "section", index: site.sections.indexOf(section) })} className="mt-5 leading-7 text-stone-600">

                    {section.text}

                  </p>



                  <div className="mt-6 h-px w-full bg-stone-200" />



                  <div className="mt-5 flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-stone-500">
                      Intervention et accompagnement adaptés à votre besoin.
                    </p>

                    <a
                      href="#contact"
                      className="shrink-0 text-sm font-black"
                      style={{ color: accentColor }}
                    >
                      {sector.ctaLabel} →
                    </a>
                  </div>

                </article>

              ),

            )}

          </div>

        </div>

      </section>



      <section className="bg-[#f3eee4] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 rounded-2xl border border-stone-300 bg-[#fffaf0] p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                Parlons de votre besoin
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Un projet à {city} ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Contactez directement {site.businessName} pour en discuter.
              </p>
            </div>

            <a
              href={goalAction(site)?.href ?? "#contact"}
              data-siteai-accent-background
              className="w-full rounded-xl px-6 py-4 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
              style={{ backgroundColor: accentColor }}
            >
              {goalAction(site)?.label ?? textOr(site.primaryCta, "Demander un devis")}
            </a>
          </div>
        </div>
      </section>

      </OrderedBlock>

      <OrderedBlock site={site} block="process">


        <ProcessSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="artisan"
      />


      </OrderedBlock>

      <OrderedBlock site={site} block="faq">


        <FaqSection
        site={site}
        activity={activity}
        city={city}
        accentColor={accentColor}
        variant="artisan"
      />


      </OrderedBlock>

      {isLayoutBlockVisible(site, "gallery") && (site.gallery ?? [])

        .length > 0 && (

        <section id="realisations" style={{ order: getLayoutOrder(site, "gallery") }} className="bg-[#fffaf0] px-6 py-20 sm:px-8 lg:py-24">

          <div className="mx-auto max-w-6xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p

                  style={{

                    color:

                      accentColor,

                  }}

                  className="text-sm font-black uppercase tracking-[0.25em]"

                >

                  {sector.galleryLabel}

                </p>



                <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

                  Du travail concret, visible en images

                </h2>

              </div>



              <p className="max-w-md leading-7 text-stone-600">

                Découvrez quelques interventions et réalisations de {site.businessName} à {city}.

              </p>

            </div>



            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {(

                site.gallery ??

                []

              ).map(

                (

                  imageUrl,

                  index,

                ) => (

                  <figure key={`${imageUrl}-${index}`} {...edit({ kind: "gallery" })}

                    className={`group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${

                      index === 0

                        ? "sm:col-span-2"

                        : ""

                    }`}

                  >

                    <div className="overflow-hidden">

                      <img

                        src={imageUrl}

                        alt={`Réalisation ${index + 1} de ${site.businessName}`}

                        className={`w-full object-cover transition duration-500 group-hover:scale-105 ${

                          index === 0

                            ? "h-72 md:h-[400px]"

                            : "h-64"

                        }`}

                      />

                    </div>



                    <figcaption className="flex items-center justify-between gap-4 px-5 py-4">

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">

                          {getProjectTitle(activity, index)}

                        </p>



                        <p className="mt-1 font-black text-stone-900">

                          {site.businessName}

                        </p>

                      </div>



                      <span

                        className="h-3 w-3 rounded-full"

                        style={{ backgroundColor: accentColor }}

                      />

                    </figcaption>

                  </figure>

                ),

              )}

            </div>

          </div>

        </section>

      )}



      <TestimonialsSection site={site} accentColor={accentColor} variant="artisan" />

      <OrderedBlock site={site} block="contact">




        <ContactSection

        site={site}

        activity={activity}

        city={city}

        accentColor={accentColor}

        dark

      />




      </OrderedBlock>



      <footer style={{ order: 1000 }} className="bg-stone-950 px-6 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 border-b border-stone-800 pb-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3">
                {site.logoUrl ? (
                  <img {...edit({ kind: "field", field: "logoUrl" })}
                    src={site.logoUrl}
                    alt={`Logo ${site.businessName}`}
                    className="h-12 w-12 rounded-full border border-stone-700 bg-white object-contain p-1"
                  />
                ) : (
                  <div {...edit({ kind: "field", field: "logoUrl" })}
                    data-siteai-accent-background
                    className="flex h-11 w-11 items-center justify-center rounded-full font-black text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {site.businessName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <p {...edit({ kind: "field", field: "businessName" })} className="text-xl font-black">{site.businessName}</p>
                  <p className="text-sm text-stone-400">
                    {activity} · {city}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-7 text-stone-400">
                Un service de proximité présenté simplement, avec les informations essentielles pour prendre contact.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">
                Navigation
              </p>

              <div className="mt-4 space-y-3 text-sm font-bold text-stone-300">
                <a href="#services" className="block transition hover:text-white">
                  Services
                </a>
                {(site.gallery ?? []).length > 0 && (
                  <a href="#realisations" className="block transition hover:text-white">
                    Réalisations
                  </a>
                )}
                <a href="#faq" className="block transition hover:text-white">
                  Questions fréquentes
                </a>
                <a href="#contact" className="block transition hover:text-white">
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">
                Nous contacter
              </p>

              <p className="mt-4 text-sm text-stone-400">{city}</p>

              {site.phone && (
                <a {...edit({ kind: "field", field: "phone" })}
                  href={`tel:${phoneHref(site.phone)}`}
                  className="mt-3 block font-black"
                  style={{ color: accentColor }}
                >
                  {formatPhoneNumber(site.phone)}
                </a>
              )}
              <SocialLinksList links={site.socialLinks} accentColor={accentColor} />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {site.businessName}</p>
            <p>Site créé avec Lumio</p>
          </div>
        </div>
      </footer>

    </div>

  );

}



function AboutSection({
  site,
  activity,
  city,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  activity: string;
  city: string;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const sector = getSectorVisualTheme(activity, city);
  const title = textOr(
    site.aboutTitle,
    `À propos de ${site.businessName}`,
  );

  const text = textOr(
    site.aboutText,
    `${site.businessName} présente son savoir-faire en ${getActivityTheme(activity).noun} à ${city}, avec une approche claire et adaptée à chaque besoin.`,
  );

  if (variant === "elegant") {
    return (
      <section id="a-propos" className="bg-neutral-950 px-6 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.4em]"
              style={{ color: accentColor }}
            >
              À propos
            </p>
            <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">
              {title}
            </h2>
          </div>
          <div className="border-t border-neutral-800 pt-8 lg:pt-10">
            <p className="max-w-3xl text-lg font-light leading-9 text-neutral-300">
              {text}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-neutral-400">
              <span className="border border-neutral-800 px-4 py-3">{activity}</span>
              <span className="border border-neutral-800 px-4 py-3">{city}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "artisan") {
    return (
      <section id="a-propos" className="bg-[#f3eee4] px-6 py-20 text-stone-950 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 rounded-3xl border border-stone-300 bg-[#fffaf0] p-7 shadow-sm sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            <div>
              <p
                className="text-sm font-black uppercase tracking-[0.24em]"
                style={{ color: accentColor }}
              >
                {sector.aboutLabel}
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                {title}
              </h2>
            </div>
            <div>
              <p className="text-base leading-8 text-stone-600 sm:text-lg">{text}</p>
              <p className="mt-6 text-sm font-bold text-stone-500">
                {activity} · {city}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="a-propos" className="bg-slate-50 px-6 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: `${accentColor}18` }}
              aria-hidden="true"
            >
              <span className="block h-[2px] w-6 rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
            <p
              className="mt-6 text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              {sector.aboutLabel}
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h2>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <p className="text-base leading-8 text-slate-600 sm:text-lg">{text}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span
                data-siteai-accent-background
                className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white"
                style={{ backgroundColor: accentColor }}
              >
                {activity}
              </span>
              <span className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
                {city}
              </span>
            </div>
            <a
              href="#contact"
              data-siteai-accent-background
              className="mt-7 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
              style={{ backgroundColor: accentColor }}
            >
              Présenter mon besoin
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}


function getProcessSteps(site: GeneratedSite, activity: string, city: string) {
  const mainService = textOr(
    site.sections?.[0]?.title,
    getActivityTheme(activity).noun,
  );
  const activityNoun = getActivityTheme(activity).noun;

  return [
    {
      title: "Présentez votre besoin",
      text: `Expliquez simplement votre besoin en ${activityNoun}, par exemple autour de « ${mainService} ».`,
    },
    {
      title: `Échangez avec ${site.businessName}`,
      text: "Précisez ensemble la situation, vos attentes et les éléments utiles pour préparer la suite du projet.",
    },
    {
      title: "Définissez les prochaines étapes",
      text: `Une fois le besoin clarifié, convenez de la suite adaptée à votre projet à ${city}.`,
    },
  ];
}

function ProcessSection({
  site,
  activity,
  city,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  activity: string;
  city: string;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const sector = getSectorVisualTheme(activity, city);
  const steps = getProcessSteps(site, activity, city);

  if (variant === "elegant") {
    return (
      <section className="bg-neutral-950 px-6 py-24 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.4em]"
                style={{ color: accentColor }}
              >
                {sector.processEyebrow}
              </p>

              <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">
                {sector.processHeading}
              </h2>
            </div>

            <div className="border-t border-neutral-800">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="grid gap-5 border-b border-neutral-800 py-8 md:grid-cols-[80px_1fr]"
                >
                  <span
                    className="text-sm tracking-[0.22em]"
                    style={{ color: accentColor }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="text-2xl font-light">{step.title}</h3>
                    <p className="mt-4 max-w-2xl leading-8 text-neutral-400">
                      {step.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "artisan") {
    return (
      <section className="bg-[#fffaf0] px-6 py-20 text-stone-950 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              {sector.processEyebrow}
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              {sector.processHeading}
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-stone-300 bg-[#f3eee4] p-6 shadow-sm"
              >
                <div
                data-siteai-accent-background
                className="flex h-11 w-11 items-center justify-center rounded-full font-black text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {index + 1}
                </div>

                <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                <p className="mt-3 leading-7 text-stone-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-950 px-6 py-20 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p
            className="text-sm font-black uppercase tracking-[0.24em]"
            style={{ color: accentColor }}
          >
            {sector.processEyebrow}
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            {sector.processHeading}
          </h2>

          <p className="mt-5 max-w-2xl leading-8 text-slate-400">
            Trois étapes simples pour transformer votre besoin en échange concret avec {site.businessName}.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: accentColor }}
              />

              <div
                data-siteai-accent-background
                className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <h3 className="mt-6 text-xl font-black">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


function getFaqItems(site: GeneratedSite, activity: string, city: string): FAQItem[] {
  const generatedQuestions = (site.faq ?? []).filter(
    (item) => item?.question?.trim() && item?.answer?.trim(),
  );

  const fallbackQuestions: FAQItem[] = [
    {
      question: `Comment demander un devis pour un projet ${activityProjectPhrase(activity)} ?`,
      answer: site.phone
        ? `Vous pouvez contacter directement ${site.businessName} au ${formatPhoneNumber(site.phone)} pour présenter votre besoin et échanger sur votre projet.`
        : `Vous pouvez contacter ${site.businessName} pour présenter votre besoin et obtenir davantage d'informations sur votre projet.`,
    },
    {
      question: `Où se situe ${site.businessName} ?`,
      answer: `${site.businessName} présente son activité à ${city}. Pour connaître précisément les zones couvertes, le plus simple est de prendre contact directement avec l'entreprise.`,
    },
    {
      question: "Comment expliquer mon besoin ?",
      answer: `Indiquez simplement le type de projet, vos attentes principales et les informations utiles. ${site.businessName} pourra ensuite échanger avec vous sur les possibilités adaptées à votre demande.`,
    },
    {
      question: "Puis-je poser une question avant de me décider ?",
      answer: site.phone
        ? `Oui. Vous pouvez appeler ${site.businessName} au ${formatPhoneNumber(site.phone)} pour poser vos questions avant d'aller plus loin.`
        : `Oui. Prenez contact avec ${site.businessName} pour poser vos questions avant d'aller plus loin.`,
    },
  ];

  return generatedQuestions.length > 0
      ? generatedQuestions.slice(0, 6)
      : fallbackQuestions;
}

function FaqSection({
  site,
  activity,
  city,
  accentColor,
  variant,
}: {
  site: GeneratedSite;
  activity: string;
  city: string;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
}) {
  const questions = getFaqItems(site, activity, city);

  if (variant === "elegant") {
    return (
      <section id="faq" className="bg-[#f8f6f1] px-6 py-24 text-neutral-950 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.4em]"
              style={{ color: accentColor }}
            >
              Questions fréquentes
            </p>

            <h2 className="mt-6 text-4xl font-light leading-[1.1] sm:text-5xl">
              Quelques réponses avant de nous contacter.
            </h2>

            <p className="mt-6 max-w-md leading-8 text-neutral-500">
              Les informations essentielles pour préparer votre demande auprès de {site.businessName}.
            </p>
          </div>

          <div className="border-t border-neutral-300">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-neutral-300 py-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <div className="flex gap-5">
                    <span
                      className="pt-1 text-xs font-bold tracking-[0.2em]"
                      style={{ color: accentColor }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="text-lg font-light leading-7 sm:text-xl">
                      {item.question}
                    </span>
                  </div>

                  <span
                    className="text-xl transition-transform duration-300 group-open:rotate-45"
                    style={{ color: accentColor }}
                  >
                    +
                  </span>
                </summary>

                <p className="ml-11 mt-5 max-w-2xl leading-8 text-neutral-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "artisan") {
    return (
      <section id="faq" className="bg-[#f3eee4] px-6 py-20 text-stone-950 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              Bon à savoir
            </p>

            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Vos questions, simplement.
            </h2>

            <p className="mt-5 leading-8 text-stone-600">
              Retrouvez les informations utiles avant de contacter {site.businessName}.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-stone-300 bg-[#fffaf0] p-6 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div
                      data-siteai-accent-background
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {index + 1}
                    </div>

                    <span className="font-black leading-6">
                      {item.question}
                    </span>
                  </div>

                  <span className="text-lg font-black text-stone-400 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-5 pl-0 leading-7 text-stone-600 sm:pl-13">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="bg-white px-6 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.24em]"
              style={{ color: accentColor }}
            >
              FAQ
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Les réponses aux questions courantes.
            </h2>

            <p className="mt-5 max-w-md leading-8 text-slate-500">
              De quoi préparer votre demande avant de contacter {site.businessName}.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span
                      className="text-xs font-black"
                      style={{ color: accentColor }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="font-black">
                      {item.question}
                    </span>
                  </div>

                  <span
                    data-siteai-accent-background
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black text-white transition-transform duration-300 group-open:rotate-45"
                    style={{ backgroundColor: accentColor }}
                  >
                    +
                  </span>
                </summary>

                <p className="border-t border-slate-200 px-6 py-5 leading-7 text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


function TestimonialsSection({ site, accentColor, variant }: { site: GeneratedSite; accentColor: string; variant: "modern" | "elegant" | "artisan" }) {
  const testimonials = (site.testimonials ?? []).filter((item) => item.name.trim() && item.text.trim());
  if (!testimonials.length) return null;
  const elegant = variant === "elegant";
  const artisan = variant === "artisan";
  return (
    <section className={`px-6 py-20 sm:px-8 ${elegant ? "bg-[#f8f6f1] text-neutral-950" : artisan ? "bg-stone-100 text-stone-950" : "bg-white text-slate-950"}`}>
      <div className="mx-auto max-w-6xl">
        <p style={{color: accentColor}} className="text-sm font-black uppercase tracking-[0.24em]">Avis clients</p>
        <h2 className={`mt-4 text-3xl sm:text-4xl ${elegant ? "font-light" : "font-black"}`}>Ce que nos clients disent de nous</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <figure key={`${item.name}-${index}`} className={`rounded-2xl border p-6 ${elegant ? "border-neutral-300 bg-white" : artisan ? "border-stone-300 bg-white" : "border-slate-200 bg-slate-50"}`}>
              <div aria-label={`${item.rating ?? 5} étoiles`} className="text-amber-500">{"★".repeat(item.rating ?? 5)}<span className="text-slate-300">{"★".repeat(5 - (item.rating ?? 5))}</span></div>
              <blockquote className="mt-4 leading-7">“{item.text}”</blockquote>
              <figcaption className="mt-5 text-sm"><strong>{item.name}</strong>{item.role ? <span className="block text-slate-500">{item.role}</span> : null}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadForm({
  site,
  accentColor,
  variant,
  activity,
}: {
  site: GeneratedSite;
  accentColor: string;
  variant: "modern" | "elegant" | "artisan";
  activity: string;
}) {
  const previewOnly = useContext(PreviewOnlyContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const quoteOptions = getQuoteOptions(activity);
  const [requestType, setRequestType] = useState(quoteOptions[0] ?? "Demande de devis");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const isElegant = variant === "elegant";
  const isArtisan = variant === "artisan";
  const accentTextColor = getContrastTextColor(accentColor);

  const fieldClass = isElegant
    ? "w-full border-b border-neutral-300 bg-transparent px-0 py-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
    : isArtisan
      ? "w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-white"
      : "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30";

  const mutedClass = isElegant
    ? "text-neutral-500"
    : isArtisan
      ? "opacity-75"
      : "text-slate-400";

  async function resolvePublicSlug() {
    if (typeof window === "undefined") {
      return "";
    }

    const pathname = window.location.pathname;
    const siteMatch = pathname.match(/^\/site\/([^/?#]+)/);

    if (siteMatch?.[1]) {
      return decodeURIComponent(siteMatch[1]);
    }

    if (pathname.startsWith("/builder")) {
      return "";
    }

    const hostname = window.location.hostname.toLowerCase();

    if (
      hostname &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1"
    ) {
      try {
        const response = await fetch(
          `/api-backend/public-domains/${encodeURIComponent(hostname)}`,
          {
            cache: "no-store",
          },
        );

        if (response.ok) {
          const result = (await response.json()) as {
            publicSlug?: string;
          };

          if (result.publicSlug) {
            return result.publicSlug;
          }
        }
      } catch {
        // Le fallback ci-dessous suffit si le domaine ne peut pas être résolu.
      }
    }

    return site.slug || "";
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");
    if (previewOnly) {
      setFormError("Mode aperçu : aucun message envoyé. Teste le formulaire depuis le site publié.");
      return;
    }

    if (!name.trim()) {
      setFormError("Indiquez votre nom.");
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setFormError("Indiquez un email ou un numéro de téléphone.");
      return;
    }

    if (message.trim().length < 10) {
      setFormError("Décrivez votre besoin en quelques mots.");
      return;
    }

    if (!consent) {
      setFormError("Vous devez accepter l'utilisation de vos informations pour être recontacté.");
      return;
    }

    setSending(true);

    try {
      const publicSlug = await resolvePublicSlug();

      if (!publicSlug) {
        throw new Error(
          "Le formulaire est visible dans l'aperçu, mais l'envoi fonctionne sur le site publié.",
        );
      }

      const response = await fetch("/api-backend/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicSlug,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: `Type de demande : ${requestType}\n\n${message.trim()}`,
          consent,
          website,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText.trim() || "Impossible d'envoyer la demande.",
        );
      }

      setFormSuccess("Votre demande a bien été envoyée.");
      window.dispatchEvent(new CustomEvent("siteai:conversion", { detail: { type: "form_submit" } }));
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setRequestType(quoteOptions[0] ?? "Demande de devis");
      setConsent(false);
      setWebsite("");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la demande.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submitLead}
      data-siteai-lead-form
      style={isArtisan ? { color: accentTextColor } : undefined}
    >
      {previewOnly && <p className="mb-4 rounded-lg border border-current p-3 text-sm">Mode aperçu : aucun message ne sera envoyé.</p>}
      <p
        className={
          isElegant
            ? "text-xs font-bold uppercase tracking-[0.3em] text-neutral-500"
            : isArtisan
              ? "text-sm font-black uppercase tracking-[0.22em] opacity-75"
              : "text-sm font-black uppercase tracking-[0.2em] text-slate-400"
        }
      >
        Demande de devis
      </p>

      <p
        className={
          isElegant
            ? "mt-4 text-2xl font-light"
            : "mt-4 text-2xl font-black"
        }
      >
        Parlez-nous de votre projet
      </p>

      <div className="mt-6 grid gap-4">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Votre nom *"
          autoComplete="name"
          maxLength={100}
          required
          className={fieldClass}
        />

        <select name="requestType" value={requestType} onChange={(event) => setRequestType(event.target.value)} className={fieldClass} aria-label="Type de demande">
          {quoteOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>

        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Votre email"
          autoComplete="email"
          maxLength={254}
          className={fieldClass}
        />

        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Votre téléphone"
          autoComplete="tel"
          maxLength={40}
          className={fieldClass}
        />

        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Décrivez votre besoin *"
          rows={5}
          minLength={10}
          maxLength={3000}
          required
          className={`${fieldClass} resize-y sm:col-span-2`}
        />
      </div>

      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Site web
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <label data-siteai-consent className={`mt-5 grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] cursor-pointer items-start gap-3 text-xs leading-5 ${mutedClass}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
          required
        />
        <span>
          J&apos;accepte que mes informations soient utilisées pour répondre à ma demande.
        </span>
      </label>

      <button
        type="submit"
        disabled={sending}
        style={
          isElegant
            ? {
                borderColor: accentColor,
                color: accentColor,
              }
            : isArtisan
              ? undefined
              : {
                  backgroundColor: accentColor,
                  color: accentTextColor,
                }
        }
        className={
          isElegant
            ? "mt-6 w-full border px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            : isArtisan
              ? "mt-6 w-full rounded-xl bg-white px-6 py-4 text-sm font-black text-stone-950 shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              : "mt-6 w-full rounded-xl px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {sending ? "Envoi..." : "Envoyer ma demande"}
      </button>

      {site.phone && (
        <a
          href={`tel:${phoneHref(site.phone)}`}
          className={
            isElegant
              ? "mt-4 block text-center text-sm text-neutral-500 underline underline-offset-4"
              : isArtisan
                ? "mt-4 block text-center text-sm font-bold opacity-80"
                : "mt-4 block text-center text-sm font-bold text-slate-400"
          }
        >
          Ou appeler directement {formatPhoneNumber(site.phone)}
        </a>
      )}

      {formSuccess && (
        <p
          className={
            isElegant
              ? "mt-4 text-sm text-emerald-700"
              : isArtisan
                ? "mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white"
                : "mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300"
          }
        >
          ✓ {formSuccess}
        </p>
      )}

      {formError && (
        <p
          className={
            isElegant
              ? "mt-4 text-sm text-red-700"
              : isArtisan
                ? "mt-4 rounded-xl bg-black/15 px-4 py-3 text-sm font-bold text-white"
                : "mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
          }
        >
          {formError}
        </p>
      )}
    </form>
  );
}


function ContactSection({

  site,

  activity,

  city,

  accentColor,

  dark,

  elegant = false,

}: {

  site: GeneratedSite;

  activity: string;

  city: string;

  accentColor: string;

  dark: boolean;

  elegant?: boolean;

}) {
  const sector = getSectorVisualTheme(activity, city);

  if (elegant) {
    return (
      <section id="contact" className="bg-[#f8f6f1] px-6 py-24 text-neutral-950 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 border-y border-neutral-300 py-12 lg:gap-16" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
            <div>
              <p
                style={{ color: accentColor }}
                className="text-xs font-bold uppercase tracking-[0.4em]"
              >
                {sector.contactBadge}
              </p>

              <h2 className="mt-6 max-w-3xl text-4xl font-light leading-[1.08] sm:text-5xl">
                {textOr(site.contactTitle, "Parlons de votre projet.")}
              </h2>

              <p className="mt-6 max-w-2xl leading-8 text-neutral-600">
                {textOr(
                  site.contactText,
                  `Contactez ${site.businessName} pour échanger sur votre besoin en ${getActivityTheme(activity).noun} à ${city}.`,
                )}
              </p>
            </div>

            <div className="border-t border-neutral-300 pt-10 lg:border-t-0 lg:pt-0">
              <LeadForm
                site={site}
                accentColor={accentColor}
                variant="elegant"
                activity={activity}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (dark) {
    return (
      <section id="contact" className="bg-stone-900 px-6 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-3xl border border-stone-700 bg-stone-950">
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
              <div className="p-8 sm:p-10 lg:p-12">
                <p
                  style={{ color: accentColor }}
                  className="text-sm font-black uppercase tracking-[0.24em]"
                >
                  {sector.contactBadge}
                </p>

                <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {textOr(site.contactTitle, "Échangeons simplement sur votre besoin.")}
                </h2>

                <p className="mt-6 max-w-2xl leading-8 text-stone-300">
                  {textOr(
                    site.contactText,
                    `${site.businessName} intervient pour vos projets ${activityProjectPhrase(activity)} à ${city}.`,
                  )}
                </p>

                <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-stone-300">
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Contact direct
                  </span>
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Projet sur mesure
                  </span>
                  <span className="rounded-full border border-stone-700 px-4 py-2">
                    ✓ Intervention locale
                  </span>
                </div>
              </div>

              <div
                className="p-8 sm:p-10 lg:p-12"
                style={{
                  backgroundColor: accentColor,
                  color: getContrastTextColor(accentColor),
                }}
              >
                <LeadForm
                  site={site}
                  accentColor={accentColor}
                  variant="artisan"
                  activity={activity}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="bg-slate-50 px-6 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-7 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 15% 20%, ${accentColor}66 0, transparent 32%), radial-gradient(circle at 90% 85%, ${accentColor}33 0, transparent 28%)`,
            }}
          />

          <div className="relative grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
            <div>
              <p
                style={{ color: accentColor }}
                className="text-sm font-black uppercase tracking-[0.24em]"
              >
                {sector.contactBadge}
              </p>

              <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                {textOr(site.contactTitle, "Un projet ? Parlons-en.")}
              </h2>

              <p className="mt-6 max-w-2xl leading-8 text-slate-300">
                {textOr(
                  site.contactText,
                  `Contactez ${site.businessName} pour discuter de votre besoin en ${getActivityTheme(activity).noun} à ${city}.`,
                )}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ Échange direct
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ Besoin étudié
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
                  ✓ {city}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-8">
              <LeadForm
                site={site}
                accentColor={accentColor}
                variant="modern"
                activity={activity}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

}


/* -------------------------------------------------------------------------
 * Rendu « Signature » : mise en page éditoriale commune à tous les styles.
 * Les données, l'édition au clic, l'ordre des blocs et le formulaire de
 * contact restent ceux des anciens modèles ; seul l'habillage change.
 * ---------------------------------------------------------------------- */

function SignatureShell({
  settings,
  theme,
  displayFont,
  accentColor,
  onEdit,
  children,
}: {
  settings: ReturnType<typeof normalizeDesignSettings>;
  theme: DesignStyle;
  displayFont: string;
  accentColor: string;
  onEdit?: SitePreviewProps["onEdit"];
  children: React.ReactNode;
}) {
  return (
    <div
      className={`siteai-design-root ${signature.root}`}
      data-template="signature"
      data-editable-preview={onEdit ? "true" : undefined}
      onClickCapture={onEdit ? (event) => {
        const target = getPreviewEditTarget(event.currentTarget, event.target);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit(target);
      } : undefined}
      onKeyDownCapture={onEdit ? (event) => {
        if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
        const target = getPreviewEditTarget(event.currentTarget, event.target);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit(target);
      } : undefined}
      data-theme={theme}
      data-font={settings.font}
      data-display-font={displayFont}
      data-button={settings.buttonStyle}
      data-logo-size={settings.logoSize}
      data-width={settings.contentWidth}
      data-spacing={settings.spacing}
      data-background={settings.background}
      data-title-scale={settings.titleScale}
      data-text-scale={settings.textScale}
      data-title-weight={settings.titleWeight}
      data-title-case={settings.titleCase}
      data-line-height={settings.lineHeight}
      data-card-radius={settings.cardRadius}
      data-shadow-strength={settings.shadowStrength}
      data-image-radius={settings.imageRadius}
      data-image-ratio={settings.imageRatio}
      data-image-fit={settings.imageFit}
      data-button-size={settings.buttonSize}
      style={{
        "--sg-accent": accentColor,
        "--sg-on-accent": getContrastTextColor(accentColor),
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function signatureServiceImage(section: SiteSection) {
  const mode = section.imageMode?.trim().toLowerCase();
  if (mode === "none") return "";
  if (mode === "custom") return section.imageUrl?.trim() || "";
  if (section.imageUrl?.trim() && !section.imageMode) return section.imageUrl.trim();
  // En automatique, les photos restent dans « Réalisations » : pas de doublons.
  return "";
}

function SignatureArrow() {
  return <span aria-hidden="true" className={signature.arrow}>→</span>;
}

function SignatureTemplate({
  site,
  accentColor,
  activity,
  city,
  onEdit,
  heroLayout,
}: Omit<SitePreviewProps, "designStyle"> & { heroLayout: "auto" | "left" | "center" }) {
  const edit = (target: PreviewEditTarget) => previewEditProps(target, Boolean(onEdit));
  const sector = getSectorVisualTheme(activity, city);
  const action = goalAction(site);
  const hasPhone = Boolean(site.phone?.trim());
  const primaryHref = action?.href ?? (hasPhone ? `tel:${phoneHref(site.phone)}` : "#contact");
  const primaryLabel = action?.label ?? textOr(site.primaryCta, hasPhone ? "Appeler maintenant" : "Demander un devis");
  const primaryIsContact = primaryHref === "#contact";
  const secondaryHref = primaryIsContact ? "#services" : "#contact";
  const secondaryLabel = primaryIsContact
    ? "Voir nos prestations"
    : textOr(site.secondaryCta, "Demander un devis");

  const services = site.sections
    .map((section, sourceIndex) => ({ section, sourceIndex }))
    .filter(({ section }) => !section.hidden);
  const serviceImages = services.map(({ section }) => signatureServiceImage(section));
  const showServiceImages = serviceImages.filter(Boolean).length >= Math.min(2, services.length) && serviceImages.some(Boolean);
  const gallery = (site.gallery ?? []).filter((url) => url?.trim());
  const testimonials = (site.testimonials ?? []).filter((item) => item.name?.trim() && item.text?.trim());
  const steps = getProcessSteps(site, activity, city);
  const faq = getFaqItems(site, activity, city);
  const benefits = getBenefits(site, city, activity);
  const hasOwnBenefits = (site.benefits ?? []).some((item) => item?.title?.trim() && item?.text?.trim());
  const aboutTitle = textOr(site.aboutTitle, `À propos de ${site.businessName}`);
  const aboutText = textOr(
    site.aboutText,
    `${site.businessName} présente son savoir-faire en ${getActivityTheme(activity).noun} à ${city}, avec une approche claire et adaptée à chaque besoin.`,
  );
  const initial = site.businessName.trim().charAt(0).toUpperCase() || "L";
  const layout = heroLayout === "center" ? "center" : "left";
  const showGallery = isLayoutBlockVisible(site, "gallery") && gallery.length > 0;
  const year = new Date().getFullYear();

  const facts = [
    { label: "Activité", value: activity },
    { label: "Secteur", value: textOr(site.serviceArea, city) },
    ...(site.openingHours?.trim() ? [{ label: "Horaires", value: site.openingHours.trim() }] : []),
    ...(hasPhone ? [{ label: "Téléphone", value: formatPhoneNumber(site.phone) }] : []),
  ].filter((item) => item.value?.trim());

  const navLinks = [
    { href: "#services", label: sector.serviceLabel },
    ...(isLayoutBlockVisible(site, "about") ? [{ href: "#a-propos", label: "À propos" }] : []),
    ...(showGallery ? [{ href: "#realisations", label: "Réalisations" }] : []),
    ...(isLayoutBlockVisible(site, "faq") ? [{ href: "#faq", label: "Questions" }] : []),
    { href: "#contact", label: "Contact" },
  ];

  return (
    <>
      <MobileContactBar site={site} accentColor={accentColor} />

      <div className={signature.page}>
        <header className={signature.header}>
          <div className={`${signature.wrap} ${signature.headerInner}`}>
            <a href={onEdit ? undefined : "#top"} className={signature.brand}>
              {site.logoUrl ? (
                <img
                  {...edit({ kind: "field", field: "logoUrl" })}
                  src={site.logoUrl}
                  alt={`Logo ${site.businessName}`}
                  className={signature.logo}
                />
              ) : (
                <span {...edit({ kind: "field", field: "logoUrl" })} className={signature.monogram}>
                  {initial}
                </span>
              )}
              <span className={signature.brandText}>
                <span {...edit({ kind: "field", field: "businessName" })} className={signature.brandName}>
                  {site.businessName}
                </span>
                <span className={signature.brandMeta}>
                  {activity}{city ? ` · ${city}` : ""}
                </span>
              </span>
            </a>

            <nav className={signature.nav} aria-label="Navigation principale">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href}>{link.label}</a>
              ))}
              <a
                {...edit({ kind: "field", field: "phone" })}
                href={primaryHref}
                className={`${signature.btn} ${signature.btnPrimary} ${signature.headerCta}`}
              >
                {primaryLabel}
              </a>
            </nav>

            <details className={signature.menu}>
              <summary>
                Menu <span aria-hidden="true" className={signature.menuIcon} />
              </summary>
              <div className={signature.menuPanel}>
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href}>{link.label}</a>
                ))}
                <a href={primaryHref} className={`${signature.btn} ${signature.btnPrimary}`}>
                  {primaryLabel}
                </a>
              </div>
            </details>
          </div>
        </header>

        <section id="top" data-siteai-hero data-layout={layout} className={signature.hero}>
          <div className={signature.wrap}>
            <div className={signature.heroIntro}>
              <p className={signature.eyebrow}>
                {textOr(site.heroEyebrow, sector.heroFallback)}
              </p>
              <h1 {...edit({ kind: "field", field: "heroTitle" })} className={signature.heroTitle}>
                {site.heroTitle}
              </h1>
            </div>

            <div className={signature.heroBottom}>
              <p {...edit({ kind: "field", field: "heroText" })} className={signature.heroText}>
                {site.heroText}
              </p>

              <div className={signature.heroSide}>
                <div data-siteai-hero-actions className={signature.actions}>
                  <a href={primaryHref} className={`${signature.btn} ${signature.btnPrimary}`}>
                    {primaryLabel} <SignatureArrow />
                  </a>
                  <a href={secondaryHref} className={`${signature.btn} ${signature.btnGhost}`}>
                    {secondaryLabel}
                  </a>
                </div>
                {hasOwnBenefits && (
                  <ul className={signature.facts}>
                    {sector.trustItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {site.heroImageUrl ? (
              <figure {...edit({ kind: "field", field: "heroImageUrl" })} className={signature.heroMedia}>
                <img src={site.heroImageUrl} alt={site.businessName} />
                {city && <figcaption className={signature.heroMediaTag}>{activity} · {city}</figcaption>}
              </figure>
            ) : services.length > 0 ? (
              <ol className={signature.heroIndex}>
                {services.slice(0, 3).map(({ section }, index) => (
                  <li key={`${section.title}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{section.title}</strong>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>

        <section className={signature.benefits} aria-label="Nos engagements">
          <div className={`${signature.wrap} ${signature.benefitsGrid}`}>
            {benefits.map((item, index) => (
              <div key={item.title} className={signature.benefit}>
                <span className={signature.num}>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <OrderedBlock site={site} block="about">
          <section id="a-propos" className={signature.section}>
            <div className={`${signature.wrap} ${signature.split}`}>
              <div>
                <p className={signature.eyebrow}>{sector.aboutLabel}</p>
                <h2 className={signature.h2}>{aboutTitle}</h2>
              </div>
              <div className={signature.aboutBody}>
                <p className={signature.lead}>{aboutText}</p>
                {facts.length > 0 && (
                  <dl className={signature.metaList}>
                    {facts.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </section>
        </OrderedBlock>

        <OrderedBlock site={site} block="services">
          <section id="services" className={`${signature.section} ${signature.sectionSurface}`}>
            <div className={signature.wrap}>
              <div className={signature.sectionHead}>
                <div>
                  <p className={signature.eyebrow}>{sector.serviceLabel}</p>
                  <h2 className={signature.h2}>{sector.serviceHeading}</h2>
                </div>
                <p>{sector.serviceIntro}</p>
              </div>

              {showServiceImages ? (
                <div className={signature.serviceGrid}>
                  {services.map(({ section, sourceIndex }, index) => (
                    <article key={`${section.title}-${sourceIndex}`} className={signature.serviceCard}>
                      {serviceImages[index] && (
                        <figure>
                          <img
                            {...edit({ kind: "section", index: sourceIndex })}
                            src={serviceImages[index]}
                            alt={section.title}
                            loading="lazy"
                          />
                        </figure>
                      )}
                      <div className={signature.serviceCardTop}>
                        <span className={signature.num}>{String(index + 1).padStart(2, "0")}</span>
                        <span>{sector.serviceLabel}</span>
                      </div>
                      <h3 {...edit({ kind: "section", index: sourceIndex })}>{section.title}</h3>
                      <p {...edit({ kind: "section", index: sourceIndex })}>{section.text}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <ol className={signature.serviceList}>
                  {services.map(({ section, sourceIndex }, index) => (
                    <li key={`${section.title}-${sourceIndex}`} className={signature.serviceRow}>
                      <span className={signature.num}>{String(index + 1).padStart(2, "0")}</span>
                      <h3 {...edit({ kind: "section", index: sourceIndex })}>{section.title}</h3>
                      <p {...edit({ kind: "section", index: sourceIndex })}>{section.text}</p>
                      <a href="#contact" aria-label={`${sector.ctaLabel} : ${section.title}`}>
                        <SignatureArrow />
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className={`${signature.ctaBand} ${signature.sectionSurface}`}>
            <div className={`${signature.wrap}`}>
              <div className={signature.ctaInner} style={{ background: "var(--sg-bg)" }}>
                <div>
                  <h2>Un projet ? Parlons-en avec {site.businessName}.</h2>
                  <p>Présentez votre besoin, vous obtenez les informations utiles pour avancer.</p>
                </div>
                <a href={primaryIsContact ? "#contact" : primaryHref} className={`${signature.btn} ${signature.btnPrimary}`}>
                  {primaryLabel} <SignatureArrow />
                </a>
              </div>
            </div>
          </section>
        </OrderedBlock>

        <OrderedBlock site={site} block="process">
          <section className={`${signature.section} ${signature.band}`}>
            <div className={signature.wrap}>
              <div className={signature.sectionHead}>
                <div>
                  <p className={signature.eyebrow}>{sector.processEyebrow}</p>
                  <h2 className={signature.h2}>{sector.processHeading}</h2>
                </div>
                <p>Trois étapes simples pour transformer votre besoin en échange concret avec {site.businessName}.</p>
              </div>
              <ol className={signature.steps}>
                {steps.map((step, index) => (
                  <li key={step.title}>
                    <span className={signature.stepNum}>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </OrderedBlock>

        <OrderedBlock site={site} block="faq">
          <section id="faq" className={signature.section}>
            <div className={`${signature.wrap} ${signature.split}`}>
              <div>
                <p className={signature.eyebrow}>Questions fréquentes</p>
                <h2 className={signature.h2}>Les réponses avant de nous contacter.</h2>
                <p className={signature.lead} style={{ fontSize: "1rem" }}>
                  De quoi préparer votre demande auprès de {site.businessName}.
                </p>
              </div>
              <div className={signature.faqList}>
                {faq.map((item) => (
                  <details key={item.question} className={signature.faqItem}>
                    <summary>
                      <span>{item.question}</span>
                      <span aria-hidden="true" className={signature.faqToggle} />
                    </summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </OrderedBlock>

        {showGallery && (
          <section
            id="realisations"
            style={{ order: getLayoutOrder(site, "gallery") }}
            className={`${signature.section} ${signature.sectionSurface}`}
          >
            <div className={signature.wrap}>
              <div className={signature.sectionHead}>
                <div>
                  <p className={signature.eyebrow}>{sector.galleryLabel}</p>
                  <h2 className={signature.h2}>Des projets qui parlent d&apos;eux-mêmes.</h2>
                </div>
                <p>Quelques exemples du travail réalisé par {site.businessName}.</p>
              </div>
              <div className={signature.gallery} data-count={Math.min(gallery.length, 6)}>
                {gallery.map((imageUrl, index) => (
                  <figure key={`${imageUrl}-${index}`} {...edit({ kind: "gallery" })} className={signature.galleryItem}>
                    <div className={signature.galleryMedia}>
                      <img
                        src={imageUrl}
                        alt={`Réalisation ${index + 1} de ${site.businessName}`}
                        loading="lazy"
                      />
                    </div>
                    <figcaption>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{getProjectTitle(activity, index)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {testimonials.length > 0 && (
          <section style={{ order: getLayoutOrder(site, "gallery") }} className={signature.section}>
            <div className={signature.wrap}>
              <div className={signature.sectionHead}>
                <div>
                  <p className={signature.eyebrow}>Avis clients</p>
                  <h2 className={signature.h2}>Ce que nos clients disent de nous.</h2>
                </div>
              </div>
              <div className={signature.quotes} data-single={testimonials.length === 1 ? "true" : undefined}>
                {testimonials.slice(0, 6).map((item, index) => {
                  const rating = Math.min(5, Math.max(1, Math.round(item.rating ?? 5)));
                  return (
                    <figure key={`${item.name}-${index}`} className={signature.quote}>
                      <div>
                        <p className={signature.stars} aria-label={`${rating} étoiles sur 5`}>
                          {"★".repeat(rating)}
                          <span className={signature.starsOff}>{"★".repeat(5 - rating)}</span>
                        </p>
                        <blockquote>« {item.text} »</blockquote>
                      </div>
                      <figcaption>
                        <strong>{item.name}</strong>
                        {item.role ? <span>{item.role}</span> : null}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <OrderedBlock site={site} block="contact">
          <section id="contact" className={`${signature.section} ${signature.contact}`}>
            <div className={`${signature.wrap} ${signature.split}`}>
              <div className={signature.contactInfo}>
                <p className={signature.eyebrow}>{sector.contactBadge}</p>
                <h2 className={signature.h2}>{textOr(site.contactTitle, "Parlons de votre projet.")}</h2>
                <p>
                  {textOr(
                    site.contactText,
                    `Contactez ${site.businessName} pour échanger sur votre besoin en ${getActivityTheme(activity).noun} à ${city}.`,
                  )}
                </p>
                {hasPhone && (
                  <a {...edit({ kind: "field", field: "phone" })} href={`tel:${phoneHref(site.phone)}`} className={signature.phone}>
                    {formatPhoneNumber(site.phone)}
                  </a>
                )}
                <dl className={signature.metaList}>
                  <div>
                    <dt>Secteur</dt>
                    <dd>{textOr(site.serviceArea, city)}</dd>
                  </div>
                  <div>
                    <dt>Horaires</dt>
                    <dd>{textOr(site.openingHours, "Sur demande")}</dd>
                  </div>
                </dl>
                <div className={signature.socials}>
                  <SocialLinksList links={site.socialLinks} accentColor={accentColor} light />
                </div>
              </div>

              <div className={signature.formCard}>
                <LeadForm site={site} accentColor={accentColor} variant="elegant" activity={activity} />
              </div>
            </div>
          </section>
        </OrderedBlock>

        <footer style={{ order: 1000 }} className={signature.footer}>
          <div className={signature.wrap}>
            <p {...edit({ kind: "field", field: "businessName" })} className={signature.footerName}>
              {site.businessName}
            </p>
            <div className={signature.footerGrid}>
              <div>
                <h3>{activity}</h3>
                <p>
                  {textOr(site.metaDescription, `${site.businessName}, ${activity.toLowerCase()} à ${city}.`)}
                </p>
              </div>
              <div>
                <h3>Navigation</h3>
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href}>{link.label}</a>
                ))}
              </div>
              <div>
                <h3>Contact</h3>
                {city && <span>{city}</span>}
                {hasPhone && <a href={`tel:${phoneHref(site.phone)}`}>{formatPhoneNumber(site.phone)}</a>}
                <a href="#contact">Écrire un message</a>
              </div>
            </div>
            <div className={signature.footerBottom}>
              <p>© {year} {site.businessName}</p>
              <p>Site créé avec Lumio</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
