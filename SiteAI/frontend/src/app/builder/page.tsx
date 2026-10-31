"use client";

import SaveStatus from "@/components/builder/SaveStatus";
import BuilderToolsMenu from "@/components/builder/BuilderToolsMenu";
import FirstSiteGuide from "@/components/builder/FirstSiteGuide";
import { sameContent } from "@/lib/builderSaveState";
import { withTradePhotos } from "@/lib/tradePhotos";
import { tradeMotion } from "@/lib/siteMotion";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import Icon from "@/components/ui/Icon";

import PublicationPanel from "@/components/builder/PublicationPanel";
import dynamic from "next/dynamic";
// Panneaux « Contenu » et « Apparence » : cachés à l'ouverture (panneau Aperçu), chargés quand on les affiche.
const AppearancePanel = dynamic(() => import("@/components/builder/AppearancePanel"));
const ContentMediaPanel = dynamic(() => import("@/components/builder/ContentMediaPanel"));

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PreviewEditTarget } from "@/components/SitePreview";
import AccountVersions, {
  type AccountVersion,
} from "@/components/AccountVersions";
import { actionError } from "@/lib/actionErrors";
import BuilderVersions, {
  useBuilderVersions,
} from "@/components/BuilderVersions";
import { useBuilderDraft } from "@/lib/useBuilderDraft";
import AIUsage from "@/components/AIUsage";
import { activityExamples } from "@/lib/activityExamples";
import "./editor-theme.css";
import "./builder-layout.css";
import type { AssistantModification } from "@/components/LumioAssistant";
import { openLumioAssistant } from "@/components/assistantEvents";
// Assistant fermé au départ : chargé après l'affichage de l'éditeur.
const LumioAssistant = dynamic(() => import("@/components/LumioAssistant"), { ssr: false });
// Moteur d'aperçu des sites (le plus gros composant) : téléchargé pendant la vérification de session,
// il n'est affiché qu'une fois le site chargé.
const loadSitePreview = () => import("@/components/SitePreview");
const SitePreview = dynamic(loadSitePreview);
import SiteGoalPicker from "@/components/SiteGoalPicker";
import { type SiteGoal } from "@/lib/siteGoal";
import { normalizeDesignExtras } from "@/lib/appearanceSettings";
import StylePicker from "@/components/StylePicker";
import { getDesignStyle, type DesignStyle } from "@/lib/designStyles";
import { getSiteHealth, type Testimonial } from "@/lib/siteGrowth";
import {
  clearExampleTemplate,
  readExampleTemplate,
} from "@/lib/exampleTemplates";

import type {
  IconMode,
  ImageMode,
  LayoutBlock,
  SiteSection,
  SocialLinks,
  DesignSettings,
  GeneratedSite,
  PreviewDevice,
  SavedSite,
} from "@/lib/builderTypes";

const socialLinkFields = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/ton-entreprise" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/ton-entreprise" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@ton-entreprise" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/ton-entreprise" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@ton-entreprise" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+33 6 12 34 56 78 ou wa.me/…" },
] as const satisfies ReadonlyArray<{
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
}>;

function normalizeSocialLinks(value?: SocialLinks | null): SocialLinks {
  return socialLinkFields.reduce<SocialLinks>((links, { key }) => {
    const url = value?.[key]?.trim();
    if (url) links[key] = url;
    return links;
  }, {});
}

const defaultDesignSettings: DesignSettings = {
  font: "system",
  buttonStyle: "soft",
  cardStyle: "bordered",
  logoSize: "medium",
  heroLayout: "auto",
  contentWidth: "normal",
  spacing: "normal",
  background: "auto",
};

function normalizeDesignSettings(
  value?: Partial<DesignSettings> | null,
): DesignSettings {
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
      value?.buttonStyle === "square" || value?.buttonStyle === "pill"
        ? value.buttonStyle
        : "soft",
    cardStyle:
      value?.cardStyle === "simple" || value?.cardStyle === "shadow"
        ? value.cardStyle
        : "bordered",
    logoSize:
      value?.logoSize === "small" || value?.logoSize === "large"
        ? value.logoSize
        : "medium",
    heroLayout:
      value?.heroLayout === "left" ||
      value?.heroLayout === "center" ||
      value?.heroLayout === "split" ||
      value?.heroLayout === "immersive"
        ? value.heroLayout
        : "auto",
    contentWidth: value?.contentWidth === "wide" ? "wide" : "normal",
    spacing:
      value?.spacing === "compact" || value?.spacing === "airy"
        ? value.spacing
        : "normal",
    background:
      value?.background === "light" || value?.background === "dark"
        ? value.background
        : "auto",
  };
}

const MAX_GALLERY_IMAGES = 8;

const serviceIconOptions = [
  "🔧",
  "💧",
  "🚿",
  "🔥",
  "⚡",
  "💡",
  "🔌",
  "🧰",
  "✂️",
  "💇",
  "✨",
  "🎨",
  "🍽️",
  "🥘",
  "🥐",
  "🍰",
  "🌿",
  "🌱",
  "🌳",
  "🏡",
  "🚗",
  "🛞",
  "⚙️",
  "🔍",
  "📷",
  "🎥",
  "⚖️",
  "📄",
  "🧱",
  "🪚",
  "🧹",
  "⭐",
];

const defaultLayoutOrder: LayoutBlock[] = [
  "about",
  "services",
  "process",
  "faq",
  "gallery",
  "contact",
];

const layoutBlockLabels: Record<LayoutBlock, string> = {
  about: "À propos",
  services: "Services",
  process: "Comment ça marche",
  faq: "FAQ",
  gallery: "Réalisations",
  contact: "Contact",
};

function normalizeLayoutOrder(value: LayoutBlock[] | undefined): LayoutBlock[] {
  const valid = new Set<LayoutBlock>(defaultLayoutOrder);

  const result: LayoutBlock[] = [];

  for (const block of value ?? []) {
    if (valid.has(block) && !result.includes(block)) {
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

function normalizeHiddenBlocks(
  value: LayoutBlock[] | undefined,
): LayoutBlock[] {
  const valid = new Set<LayoutBlock>(defaultLayoutOrder);

  return Array.from(new Set((value ?? []).filter((block) => valid.has(block))));
}

function normalizeIconMode(value: string | undefined): IconMode {
  if (value === "custom" || value === "none") {
    return value;
  }

  return "auto";
}

function normalizeImageMode(value: string | undefined): ImageMode {
  if (value === "custom" || value === "none") {
    return value;
  }

  return "auto";
}

const colors = [
  {
    name: "Bleu",
    value: "#2563eb",
  },
  {
    name: "Orange",
    value: "#ea580c",
  },
  {
    name: "Vert",
    value: "#16a34a",
  },
  {
    name: "Violet",
    value: "#7c3aed",
  },
  {
    name: "Rouge",
    value: "#dc2626",
  },
];

function getReadableTextColor(backgroundColor: string) {
  const rawHex = backgroundColor.trim().replace("#", "");
  const hex =
    rawHex.length === 3
      ? rawHex
          .split("")
          .map((character) => character + character)
          .join("")
      : rawHex;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#ffffff";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;

  const linearize = (channel: number) =>
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue);

  return luminance > 0.45 ? "#0f172a" : "#ffffff";
}
const previewViewports: Record<
  PreviewDevice,
  {
    width: number;
    height: number;
    label: string;
  }
> = {
  desktop: {
    width: 1280,
    height: 760,
    label: "Ordinateur · 1280 px",
  },
  tablet: {
    width: 768,
    height: 900,
    label: "Tablette · 768 px",
  },
  mobile: {
    width: 390,
    height: 844,
    label: "Téléphone · 390 px",
  },
};

type ResponsivePreviewProps = {
  onEdit?: (target: PreviewEditTarget) => void;
  device: PreviewDevice;
  site: GeneratedSite;
  designStyle: DesignStyle;
  accentColor: string;
  activity: string;
  city: string;
};

// srcDoc inherits the builder URL as its base URL. Follow fragments by scrolling
// the preview document explicitly, never by navigating its iframe.
function followPreviewAnchor(event: MouseEvent, frameDocument: Document) {
  if (event.defaultPrevented) return;
  const element = event.target as Element | null;
  if (!element || typeof element.closest !== "function") return;
  const link = element.closest("a[href]");
  const href = link?.getAttribute("href")?.trim();
  if (!href?.startsWith("#")) return;
  event.preventDefault();
  if (event.type === "auxclick") return;
  if (href === "#") {
    frameDocument.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  let id = href.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* Keep malformed fragments inert. */
  }
  frameDocument
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ResponsiveSitePreview({
  device,
  site,
  designStyle,
  accentColor,
  activity,
  city,
  onEdit,
}: ResponsivePreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const [scale, setScale] = useState(1);

  const viewport = previewViewports[device];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function updateScale() {
      const currentContainer = containerRef.current;

      if (!currentContainer) {
        return;
      }

      const availableWidth = Math.max(1, currentContainer.clientWidth - 8);

      setScale(Math.min(1, availableWidth / viewport.width));
    }

    updateScale();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScale);

      return () => {
        window.removeEventListener("resize", updateScale);
      };
    }

    const observer = new ResizeObserver(updateScale);

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [viewport.width]);

  useEffect(() => {
    const frameDocument = portalRoot?.ownerDocument;
    if (!frameDocument) return;
    const handleAnchor = (event: MouseEvent) =>
      followPreviewAnchor(event, frameDocument);
    // Bubble after the editor's capture handler: editable fields keep priority.
    frameDocument.addEventListener("click", handleAnchor);
    frameDocument.addEventListener("auxclick", handleAnchor);
    return () => {
      frameDocument.removeEventListener("click", handleAnchor);
      frameDocument.removeEventListener("auxclick", handleAnchor);
    };
  }, [portalRoot]);

  function prepareIframe() {
    const frame = iframeRef.current;

    const frameDocument = frame?.contentDocument;

    if (!frameDocument) {
      return;
    }

    frameDocument.documentElement.lang = "fr";

    // Les variables de polices (next/font) sont posées sur <html> : l'aperçu en a besoin aussi.
    frameDocument.documentElement.className = document.documentElement.className;

    frameDocument.documentElement.style.background = "#ffffff";

    frameDocument.body.style.margin = "0";

    frameDocument.body.style.background = "#ffffff";

    frameDocument.body.style.minWidth = "0";

    frameDocument.head
      .querySelectorAll("[data-siteai-preview-style='true']")
      .forEach((node) => node.remove());

    document.head
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;

        clone.setAttribute("data-siteai-preview-style", "true");

        frameDocument.head.appendChild(clone);
      });

    setPortalRoot(
      frameDocument.getElementById("siteai-responsive-preview-root"),
    );
  }

  const scaledWidth = viewport.width * scale;

  const scaledHeight = viewport.height * scale;

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        className="mx-auto"
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
      >
        <iframe
          ref={iframeRef}
          title={`Aperçu ${viewport.label}`}
          srcDoc={`<!doctype html><html lang="fr"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="siteai-responsive-preview-root"></div></body></html>`}
          onLoad={prepareIframe}
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className={`block bg-white ${
            device === "mobile"
              ? "rounded-[2rem] border-[10px] border-slate-800"
              : device === "tablet"
                ? "rounded-[1.5rem] border-[8px] border-slate-800"
                : "border border-slate-700"
          }`}
        />

        {portalRoot &&
          createPortal(
            <SitePreview
              previewOnly
              onEdit={onEdit}
              site={site}
              designStyle={designStyle}
              accentColor={accentColor}
              activity={activity}
              city={city}
            />,
            portalRoot,
          )}
      </div>
    </div>
  );
}


function normalizeActivity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseServices(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendService(current: string, suggestion: string) {
  if (
    parseServices(current).some(
      (item) => normalizeActivity(item) === normalizeActivity(suggestion),
    )
  )
    return current;
  return current.trim() ? current.trimEnd() + "\n" + suggestion : suggestion;
}

type BuilderSnapshot = {
  site: GeneratedSite | null;
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  services: string;
  designStyle: DesignStyle;
  accentColor: string;
};

function isBuilderSnapshot(value: unknown): value is BuilderSnapshot {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (
    ![
      "businessName",
      "activity",
      "city",
      "phone",
      "services",
      "designStyle",
      "accentColor",
    ].every((key) => typeof draft[key] === "string")
  )
    return false;
  if (getDesignStyle(draft.designStyle).id !== draft.designStyle) return false;
  if (draft.site === null) return true;
  if (!draft.site || typeof draft.site !== "object") return false;
  const content = draft.site as Record<string, unknown>;
  return (
    [
      "businessName",
      "slug",
      "metaTitle",
      "metaDescription",
      "heroTitle",
      "heroText",
      "phone",
      "logoUrl",
      "heroImageUrl",
    ].every((key) => typeof content[key] === "string") &&
    Array.isArray(content.gallery) &&
    content.gallery.every((item) => typeof item === "string") &&
    Array.isArray(content.sections) &&
    content.sections.every(
      (item) =>
        item && typeof item.title === "string" && typeof item.text === "string",
    )
  );
}

// Onglets du panneau : [panneau ordinateur, libellé, étape mobile].
const workspaceTabs = [
  ["contenu", "Contenu", 1],
  ["apparence", "Style", 2],
  ["publication", "Publier", 4],
] as const;

// Onglets fixés en bas de l'écran sur mobile : [libellé, étape].
const mobileTabs = [
  ["Contenu", 1],
  ["Style", 2],
  ["Aperçu", 3],
  ["Publier", 4],
] as const;

const previewDeviceOptions = [
  ["desktop", "Ordinateur"],
  ["tablet", "Tablette"],
  ["mobile", "Téléphone"],
] as const;

// Idées rapides de la barre de l'assistant : [libellé, demande préremplie].
const quickIdeas = [
  [
    "Raccourcir",
    "Raccourcis les textes du site en conservant les informations essentielles, les noms et les coordonnées. Ne change ni le style ni les images.",
  ],
  [
    "Plus professionnel",
    "Rends les textes du site plus professionnels sans inventer de faits, de tarifs, de certifications ou d’avis. Conserve le style et les images.",
  ],
  [
    "Simplifier",
    "Réécris les textes avec des mots simples et des phrases courtes, sans modifier les informations, le style ou les images.",
  ],
  [
    "Ajouter une promotion",
    "Ajoute une promotion clairement visible dans le texte d’accueil. Laisse des emplacements [OFFRE], [PRIX] et [DATE DE FIN] à compléter et n’invente aucun tarif.",
  ],
  [
    "Nouveau service",
    "Ajoute un nouveau service à la fin des prestations. Utilise le titre [NOM DU SERVICE] et une description courte à compléter, sans inventer de prix.",
  ],
  [
    "Améliorer Google",
    "Améliore le titre et la description SEO pour l’activité et la ville déjà renseignées, sans ajouter de zone, certification ou promesse qui n’existe pas.",
  ],
  [
    "Mettre en avant le devis",
    "Rends les appels à l’action plus directs afin d’encourager les demandes de devis, sans modifier les coordonnées ni inventer de délai de réponse.",
  ],
] as const;

export default function Home() {
  useEffect(() => {
    void loadSitePreview();
  }, []);
  const router = useRouter();
  const mobileSteps = [
    "Infos",
    "Contenu",
    "Style",
    "Aperçu",
    "Publier",
  ] as const;
  const [advancedMode, setAdvancedMode] = useState(false);
  const [newSiteGoal, setNewSiteGoal] = useState<SiteGoal>("quote");
  const [newBookingUrl, setNewBookingUrl] = useState("");
  const [mobileStep, setMobileStep] = useState(0);
  const [desktopPanel, setDesktopPanel] = useState<
    | "infos"
    | "contenu"
    | "apparence"
    | "ia"
    | "publication"
    | "sites"
    | "apercu"
    | null
  >(null);
  const [isMobileBuilder, setIsMobileBuilder] = useState(false);
  const mobileHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(width < 48rem)");
    const update = () => setIsMobileBuilder(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function navigateMobileStep(step: number) {
    setMobileStep(step);
    requestAnimationFrame(() => {
      mobileHeadingRef.current?.focus({ preventScroll: true });
      mobileHeadingRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }

  const [draftUserId, setDraftUserId] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [openingSite, setOpeningSite] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{
    publicSlug: string;
    businessName: string;
  } | null>(null);
  // Clic sur un texte de l'aperçu → ouvre le champ correspondant (actif par défaut).
  const [previewEditing, setPreviewEditing] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [userEmail, setUserEmail] = useState("");

  const [businessName, setBusinessName] = useState("");

  const [activity, setActivity] = useState("");
  const [activitySuggestionsOpen, setActivitySuggestionsOpen] = useState(false);

  const [city, setCity] = useState("Montpellier");

  const [phone, setPhone] = useState("");

  const [services, setServices] = useState("");
  const [showAllServiceSuggestions, setShowAllServiceSuggestions] =
    useState(false);

  const [siteGoal, setSiteGoal] = useState("obtenir des demandes de devis");

  const [targetAudience, setTargetAudience] = useState("");

  const [desiredTone, setDesiredTone] = useState("professionnel et chaleureux");

  const [communicationStyle, setCommunicationStyle] =
    useState("clair et concis");

  const [primaryAction, setPrimaryAction] = useState("nous contacter");

  const selectedServices = parseServices(services).map(normalizeActivity);

  const normalizedActivitySearch = normalizeActivity(activity);

  const activitySuggestions = activityExamples
    .filter((example) => {
      if (!normalizedActivitySearch) {
        return true;
      }

      const normalizedLabel = normalizeActivity(example.label);

      return (
        normalizedLabel.includes(normalizedActivitySearch) ||
        example.keywords.some((keyword) =>
          normalizeActivity(keyword).includes(normalizedActivitySearch),
        )
      );
    })
    .slice(0, 6);

  const hasExactActivityMatch = activityExamples.some(
    (example) =>
      normalizeActivity(example.label) === normalizedActivitySearch,
  );

  const activitySearch = normalizeActivity(activity);
  const servicesSearch = normalizeActivity(services);

  const suggestedActivities = activityExamples
    .map((example) => {
      const normalizedLabel = normalizeActivity(example.label);

      const activityKeywordMatch = example.keywords.some((keyword) => {
        const normalizedKeyword = normalizeActivity(keyword);

        return (
          activitySearch.includes(normalizedKeyword) ||
          (activitySearch.length >= 3 &&
            normalizedKeyword.includes(activitySearch))
        );
      });

      const serviceKeywordMatch = example.keywords.some((keyword) => {
        const normalizedKeyword = normalizeActivity(keyword);

        return (
          servicesSearch.includes(normalizedKeyword) ||
          (servicesSearch.length >= 3 &&
            normalizedKeyword.includes(servicesSearch))
        );
      });

      const labelMatch =
        activitySearch.length >= 3 &&
        (normalizedLabel.includes(activitySearch) ||
          activitySearch.includes(normalizedLabel));

      let score = 0;

      if (labelMatch) score += 10;
      if (activityKeywordMatch) score += 6;
      if (serviceKeywordMatch) score += 3;

      return {
        example,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.example);

  const suggestedServices = Array.from(
    new Set(
      suggestedActivities.flatMap((example) => example.services),
    ),
  )
    .filter(
      (suggestion) =>
        !selectedServices.includes(normalizeActivity(suggestion)),
    )
    .slice(0, 20);

  const [designStyle, setDesignStyle] = useState<DesignStyle>("moderne");

  const [accentColor, setAccentColor] = useState("#2563eb");

  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

  const [previewFullscreenOpen, setPreviewFullscreenOpen] = useState(false);
  const previewDialogRef = useRef<HTMLDivElement | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const [editorCollapsed, setEditorCollapsed] = useState(false);

  const [site, setSite] = useState<GeneratedSite | null>(null);

  const activeDesktopPanel = desktopPanel ?? (site ? "contenu" : "infos");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [editLoading, setEditLoading] = useState(false);

  const [savedSites, setSavedSites] = useState<SavedSite[]>([]);

  const [savedSiteID, setSavedSiteID] = useState<number | null>(null);

  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);

  const [sitesLoading, setSitesLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [publishing, setPublishing] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");

  const [saveError, setSaveError] = useState("");

  const [manualEditorOpen, setManualEditorOpen] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);

  const [logoError, setLogoError] = useState("");

  const [heroImageUploading, setHeroImageUploading] = useState(false);

  const [heroImageError, setHeroImageError] = useState("");

  const [serviceImageUploadingIndex, setServiceImageUploadingIndex] = useState<
    number | null
  >(null);

  const [serviceImageErrorIndex, setServiceImageErrorIndex] = useState<
    number | null
  >(null);

  const [serviceImageError, setServiceImageError] = useState("");

  const [galleryUploading, setGalleryUploading] = useState(false);

  const [galleryRemovingIndex, setGalleryRemovingIndex] = useState<
    number | null
  >(null);

  const [galleryError, setGalleryError] = useState("");

  const busy =
    restoringVersion ||
    loading ||
    editLoading ||
    saving ||
    publishing ||
    openingSite ||
    logoUploading ||
    heroImageUploading ||
    galleryUploading ||
    serviceImageUploadingIndex !== null;
  const draftSnapshot: BuilderSnapshot = {
    site,
    businessName,
    activity,
    city,
    phone,
    services,
    designStyle,
    accentColor,
  };
  const draft = useBuilderDraft<BuilderSnapshot>({
    storageKey: draftUserId
      ? `siteai:draft:v1:${draftUserId}:${savedSiteID ?? "new"}`
      : null,
    value: draftSnapshot,
    enabled: draftReady && !openingSite,
    validate: isBuilderSnapshot,
    onRestore: restoreSnapshot,
  });

  const versions = useBuilderVersions<BuilderSnapshot>(
    draftUserId && draftReady && !openingSite
      ? `siteai:versions:v1:${draftUserId}:${savedSiteID ?? "new"}`
      : null,
    isBuilderSnapshot,
  );

  function savedSnapshot(saved: SavedSite): BuilderSnapshot {
    return {
      site: saved.site,
      businessName: saved.businessName,
      activity: saved.activity,
      city: saved.city,
      phone: saved.phone,
      services: saved.site.sections.map((section) => section.title).join(", "),
      designStyle: saved.designStyle,
      accentColor: saved.accentColor,
    };
  }

  function restoreVersion(snapshot: BuilderSnapshot) {
    if (busy || !versions.checkpoint(draftSnapshot, "Avant restauration"))
      return false;
    restoreSnapshot(snapshot);
    setSaveMessage(
      "Version restaurée dans l’éditeur uniquement. Enregistre quand tu es prêt.",
    );
    return true;
  }

  async function loadAccountVersions(): Promise<AccountVersion[]> {
    if (savedSiteID === null) return [];
    const response = await authenticatedFetch(`/sites/${savedSiteID}/versions`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  async function restoreAccountVersion(versionId: number) {
    setRestoringVersion(true);
    try {
      const current = await saveCurrentSite();
      if (!current)
        throw new Error(
          "La sauvegarde préalable a échoué. Ferme cette fenêtre pour lire le message et conserver tes modifications.",
        );
      const response = await authenticatedFetch(
        `/sites/${current.id}/restore-version`,
        {
          method: "POST",
          body: JSON.stringify({
            versionId,
            expectedRevision: current.draftRevision,
          }),
        },
      );
      if (!response.ok) throw new Error(await response.text());
      const restored: SavedSite = await response.json();
      setDraftRevision(restored.draftRevision);
      restoreSnapshot(savedSnapshot(restored));
      await loadSavedSites();
      setSaveMessage(
        "Version restaurée et enregistrée dans ton compte. Le site public reste inchangé jusqu’à Publier les modifications.",
      );
    } finally {
      setRestoringVersion(false);
    }
  }

  function completeCheck(id: string) {
    if (id === "contact") {
      setSite((current) =>
        current
          ? {
              ...current,
              hiddenBlocks: (current.hiddenBlocks ?? []).filter(
                (block) => block !== "contact",
              ),
            }
          : current,
      );
      setSaveMessage(
        "Section contact réactivée dans le brouillon. Publie les modifications pour la rendre visible en ligne.",
      );
      return;
    }
    const targets: Record<string, string> = {
      booking: "goal",
      identity: "businessName",
      phone: "phone",
      intro: "heroTitle",
      services: "services",
      photos: "heroImageUrl",
      seo: "seo",
      local: "local",
      reviews: "reviews",
    };
    setPreviewFullscreenOpen(false);
    setMobileStep(1);
    setDesktopPanel("contenu");
    setEditorCollapsed(false);
    setManualEditorOpen(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const field = Array.from(
          document.querySelectorAll<HTMLElement>(
            `[data-builder-edit="${targets[id] ?? "businessName"}"]`,
          ),
        ).find((element) => element.getClientRects().length > 0);
        let parent = field?.parentElement;
        while (parent) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.focus({ preventScroll: true });
      }),
    );
  }

  function restoreSnapshot(snapshot: BuilderSnapshot) {
    setSite(snapshot.site);
    setBusinessName(snapshot.businessName);
    setActivity(snapshot.activity);
    setCity(snapshot.city);
    setPhone(snapshot.phone);
    setServices(snapshot.services);
    setDesignStyle(snapshot.designStyle);
    setAccentColor(snapshot.accentColor);
    setSaveMessage("");
    setSaveError("");
    if (!snapshot.site) {
      setMobileStep(0);
      setDesktopPanel("infos");
    }
  }

  function editFromPreview(target: PreviewEditTarget) {
    if (busy) return;
    setPreviewFullscreenOpen(false);
    setDesktopPanel("contenu");
    setMobileStep(1);
    setEditorCollapsed(false);
    setManualEditorOpen(true);
    const key =
      target.kind === "field"
        ? target.field
        : target.kind === "section"
          ? `section-${target.index}`
          : "gallery";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLElement>(
          `[data-builder-edit="${key}"]`,
        );
        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
      }),
    );
  }

  function prepareQuickPrompt(instruction: string) {
    openLumioAssistant(instruction);
  }

  useEffect(() => {
    if (!previewFullscreenOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    // Le focus entre dans l'aperçu à l'ouverture et revient ensuite à
    // l'élément qui l'a ouvert.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    previewDialogRef.current?.focus();

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewFullscreenOpen(false);

        return;
      }

      // Tab et Maj+Tab restent dans l'aperçu tant qu'il est ouvert.
      const dialog = previewDialogRef.current;

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();

        return;
      }

      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);

      previouslyFocused?.focus();
    };
  }, [previewFullscreenOpen]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          if (active) {
            setAuthLoading(false);
            router.replace("/auth");
          }

          return;
        }

        if (!active) {
          return;
        }

        setDraftUserId(data.session.user.id);
        setUserEmail(data.session.user.email ?? "");

        setAuthLoading(false);

        // These loaders are stable for this one-time authenticated initialization.
        // eslint-disable-next-line react-hooks/immutability
        await loadSavedSites();

        const selectedTemplate = readExampleTemplate();

        if (selectedTemplate) {
          setSavedSiteID(null);
          setSite(null);
          setBusinessName(selectedTemplate.businessName);
          setActivity(selectedTemplate.activity);
          setCity(selectedTemplate.city);
          setServices(selectedTemplate.services.join(", "));
          setDesignStyle(selectedTemplate.designStyle);
          setAccentColor(selectedTemplate.accentColor);
          setMobileStep(0);
          setDesktopPanel("infos");
          setSaveMessage("Modèle chargé. Remplace les informations par celles de ton entreprise, puis génère ton site.");
          clearExampleTemplate();
          if (active) setDraftReady(true);
          return;
        }

        const siteToOpen = sessionStorage.getItem("siteai_site_to_open");

        if (siteToOpen) {
          sessionStorage.removeItem("siteai_site_to_open");

          const siteID = Number(siteToOpen);

          if (Number.isInteger(siteID) && siteID > 0) {
            // The saved-site loader is stable for this one-time session handoff.
            // eslint-disable-next-line react-hooks/immutability
            await openSavedSite(siteID);
          }
        }
        if (active) setDraftReady(true);
      } catch (err) {
        console.error(err);

        if (active) {
          setAuthLoading(false);
          router.replace("/auth");
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  async function getAccessToken() {
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !data.session) {
      await supabase.auth.signOut();

      router.replace("/auth");

      throw new Error("Session absente");
    }

    return data.session.access_token;
  }

  async function authenticatedFetch(path: string, options: RequestInit = {}) {
    const token = await getAccessToken();

    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`/api-backend${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (response.status === 401) {
      await supabase.auth.signOut();

      router.replace("/auth");
    }

    return response;
  }

  async function loadSavedSites() {
    setSitesLoading(true);

    try {
      const response = await authenticatedFetch("/sites");

      if (!response.ok) {
        throw new Error(
          `Impossible de récupérer les sites : ${response.status}`,
        );
      }

      const data: SavedSite[] = await response.json();

      setSavedSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSitesLoading(false);
    }
  }

  function currentSavedSite() {
    if (savedSiteID === null) {
      return null;
    }

    return savedSites.find((saved) => saved.id === savedSiteID) ?? null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/auth");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSaveMessage("");
    setSaveError("");
    setManualEditorOpen(false);

    const serviceList = parseServices(services);

    try {
      const response = await authenticatedFetch("/generate", {
        method: "POST",

        body: JSON.stringify({
          businessName,
          activity,
          city,
          phone,
          services: serviceList,
          goal: siteGoal,
          targetAudience: targetAudience.trim(),
          tone: desiredTone,
          communicationStyle,
          primaryAction,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(message);
      }

      const data: GeneratedSite = await response.json();

      const withPhotos: GeneratedSite = withTradePhotos({
        ...data,
        siteGoal: newSiteGoal,
        bookingUrl: newBookingUrl,
        logoUrl: data.logoUrl ?? "",
        heroImageUrl: data.heroImageUrl ?? "",
        gallery: data.gallery ?? [],
        sections: (data.sections ?? []).map((section) => ({
          ...section,
          imageMode: section.imageMode ?? "auto",
          imageUrl: section.imageUrl ?? "",
          hidden: section.hidden ?? false,
        })),
        layoutOrder: normalizeLayoutOrder(data.layoutOrder),
        hiddenBlocks: normalizeHiddenBlocks(data.hiddenBlocks),
        designSettings: normalizeDesignSettings({
          ...data.designSettings,
          ...getDesignStyle(designStyle).settings,
        }),
        testimonials: data.testimonials ?? [],
        serviceArea: data.serviceArea ?? city,
        openingHours: data.openingHours ?? "",
        clientName: data.clientName ?? "",
        clientEmail: data.clientEmail ?? "",
        socialLinks: normalizeSocialLinks(data.socialLinks),
      }, activity);
      // Animations proposées selon le métier (modifiables dans « Animations »).
      const generatedSite: GeneratedSite = {
        ...withPhotos,
        designSettings: withPhotos.designSettings && {
          ...withPhotos.designSettings,
          ...tradeMotion(activity, Boolean(withPhotos.heroImageUrl)),
        },
      };

      draft.clearDraft();
      setSavedSiteID(null);
      setDraftRevision(null);
      setPublishedResult(null);
      setSite(generatedSite);
      setDesktopPanel("contenu");
      if (window.matchMedia("(width < 48rem)").matches) navigateMobileStep(1);
      setBusinessName(generatedSite.businessName || businessName);
      setPhone(generatedSite.phone || phone);
      setManualEditorOpen(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Impossible de générer le site.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fusionne un site renvoyé par l'IA avec le site ouvert. Les changements de
   * mise en page et de design sont appliqués, tandis que les médias et les
   * métadonnées client restent rattachés à leur section d'origine.
   */
  function mergeAIModifiedSite(
    base: GeneratedSite,
    incoming: GeneratedSite,
  ): GeneratedSite {
    const site = base;
    return {
      ...incoming,
      siteGoal: site.siteGoal,
      bookingUrl: site.bookingUrl,
      logoUrl: incoming.logoUrl || site.logoUrl || "",
      heroImageUrl: incoming.heroImageUrl || site.heroImageUrl || "",
      gallery: incoming.gallery?.length
        ? incoming.gallery
        : (site.gallery ?? []),
      sections: (incoming.sections ?? []).map((section) => {
        const sourceIndex = section.sourceIndex;
        const original =
          typeof sourceIndex === "number" &&
          Number.isInteger(sourceIndex) &&
          sourceIndex >= 0 &&
          sourceIndex < site.sections.length
            ? site.sections[sourceIndex]
            : undefined;
        return {
          ...section,
          iconMode: original?.iconMode ?? section.iconMode ?? "auto",
          icon: original?.icon ?? section.icon ?? "",
          imageMode: original?.imageMode ?? section.imageMode ?? "auto",
          imageUrl: original?.imageUrl ?? section.imageUrl ?? "",
          hidden: original?.hidden ?? section.hidden ?? false,
        };
      }),
      layoutOrder: normalizeLayoutOrder(
        incoming.layoutOrder ?? site.layoutOrder,
      ),
      hiddenBlocks: normalizeHiddenBlocks(
        incoming.hiddenBlocks ?? site.hiddenBlocks,
      ),
      designSettings: normalizeDesignSettings(
        { ...site.designSettings, ...incoming.designSettings },
      ),
      testimonials: site.testimonials ?? [],
      serviceArea: site.serviceArea ?? incoming.serviceArea ?? city,
      openingHours: site.openingHours ?? incoming.openingHours ?? "",
      clientName: site.clientName ?? incoming.clientName ?? "",
      clientEmail: site.clientEmail ?? incoming.clientEmail ?? "",
      socialLinks: normalizeSocialLinks(
        site.socialLinks ?? incoming.socialLinks,
      ),
    };
  }

  function getAssistantContext() {
    if (!site) return null;
    return { site, designStyle, accentColor, activity, city };
  }

  function applyAssistantModification(modification: AssistantModification) {
    if (!site) return;
    const before = draftSnapshot;
    versions.checkpoint(before, "Avant modification par l’assistant");
    const modifiedSite = mergeAIModifiedSite(site, modification.site);
    setSite(modifiedSite);
    setBusinessName(modifiedSite.businessName);
    setPhone(modifiedSite.phone);
    const nextStyle = getDesignStyle(modification.designStyle);
    if (nextStyle.id === modification.designStyle) {
      setDesignStyle(nextStyle.id);
    }
    if (modification.accentColor) {
      setAccentColor(modification.accentColor);
    }
    setSaveMessage("Modification de l’assistant appliquée. Pense à enregistrer.");
    return () => restoreSnapshot(before);
  }

  async function saveCurrentSite(): Promise<SavedSite | null> {
    if (!site) {
      return null;
    }

    if (
      savedSiteID !== null &&
      (draftRevision === null || !Number.isSafeInteger(draftRevision))
    ) {
      setSaveError(
        "Le serveur doit être mis à jour avant d’enregistrer un brouillon privé. Attends le déploiement Railway, puis rouvre ce site.",
      );
      return null;
    }
    const previousSaved = currentSavedSite();
    if (previousSaved)
      versions.checkpoint(savedSnapshot(previousSaved), "Avant enregistrement");
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    const synchronizedSite: GeneratedSite = {
      ...site,
      businessName: businessName.trim() || site.businessName,
      phone: phone.trim() || site.phone,
      sections: (site.sections ?? []).map((section) => ({
        ...section,
        imageMode: section.imageMode ?? "auto",
        imageUrl: section.imageUrl ?? "",
        hidden: section.hidden ?? false,
      })),
      layoutOrder: normalizeLayoutOrder(site.layoutOrder),
      hiddenBlocks: normalizeHiddenBlocks(site.hiddenBlocks),
      designSettings: normalizeDesignSettings(site.designSettings),
      socialLinks: normalizeSocialLinks(site.socialLinks),
    };

    setSite(synchronizedSite);

    const body = {
      expectedRevision: draftRevision,
      site: synchronizedSite,
      activity,
      city,
      designStyle,
      accentColor,
    };

    try {
      let response: Response;

      if (savedSiteID === null) {
        response = await authenticatedFetch("/sites", {
          method: "POST",

          body: JSON.stringify(body),
        });
      } else {
        response = await authenticatedFetch(`/sites/${savedSiteID}`, {
          method: "PUT",

          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        setSaveConflict(response.status === 409);
        const message = await response.text();

        throw new Error(message || "Erreur sauvegarde");
      }

      const saved: SavedSite = await response.json();

      versions.checkpoint(
        savedSnapshot(saved),
        "Brouillon enregistré",
        `siteai:versions:v1:${draftUserId}:${saved.id}`,
      );
      if (savedSiteID === null) draft.clearDraft();
      setDraftRevision(saved.draftRevision);
      setSaveConflict(false);
      setSavedSiteID(saved.id);

      setBusinessName(saved.businessName);

      setActivity(saved.activity);

      setCity(saved.city);

      setPhone(saved.phone);

      setDesignStyle(saved.designStyle);

      setAccentColor(saved.accentColor);

      setSite({
        ...saved.site,
        designSettings: normalizeDesignSettings(saved.site.designSettings),
        testimonials: saved.site.testimonials ?? [],
        serviceArea: saved.site.serviceArea ?? saved.city,
        openingHours: saved.site.openingHours ?? "",
        clientName: saved.site.clientName ?? "",
        clientEmail: saved.site.clientEmail ?? "",
        socialLinks: normalizeSocialLinks(saved.site.socialLinks),
      });

      setSaveMessage(
        saved.published
          ? "Brouillon enregistré dans ton compte. Le site public reste inchangé."
          : savedSiteID === null
            ? "Brouillon enregistré dans ton compte."
            : "Brouillon enregistré dans ton compte.",
      );

      await loadSavedSites();
      return saved;
    } catch (err) {
      console.error(err);

      setSaveError(
        actionError(
          err,
          "La sauvegarde a échoué. Tes modifications restent dans cet éditeur. Réessaie avant de quitter la page.",
        ),
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentSite() {
    if (saving || publishing) return;
    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      // Publish only after the current editor content has been saved successfully.
      const latestSavedSite = await saveCurrentSite();
      if (!latestSavedSite) return;
      if (!Number.isSafeInteger(latestSavedSite.draftRevision)) {
        setSaveError(
          "Attends la mise à jour du serveur Railway puis rouvre ce site avant de publier.",
        );
        return;
      }
      const response = await authenticatedFetch(
        `/sites/${latestSavedSite.id}/publish`,
        {
          method: "POST",
          body: JSON.stringify({
            expectedRevision: latestSavedSite.draftRevision,
          }),
        },
      );

      if (!response.ok) {
        let message = (await response.text()).trim();

        if (response.status === 403 && message === "") {
          try {
            const statusResponse = await authenticatedFetch("/stripe/status");

            if (statusResponse.ok) {
              const billingStatus: {
                plan?: string;
                status?: string;
                maxPublishedSites?: number;
              } = await statusResponse.json();

              const plan = (billingStatus.plan ?? "").trim().toLowerCase();

              if (
                billingStatus.status !== "active" &&
                billingStatus.status !== "trialing"
              ) {
                message =
                  "Un abonnement actif est nécessaire pour publier un site.";
              } else if (plan === "essentiel") {
                message =
                  "Limite de la formule Essentiel atteinte : 1 site publié maximum. Dépublie ce site ou passe à Agence pour gérer plusieurs clients.";
              } else if (plan === "pro") {
                message =
                  "Limite de la formule Pro atteinte : 1 site publié maximum. Passe à Agence pour gérer jusqu'à 10 sites clients.";
              } else if (plan === "agence") {
                message =
                  "Limite de la formule Agence atteinte : 10 sites publiés maximum.";
              }
            }
          } catch {
            // On garde le message générique ci-dessous si le statut Stripe
            // ne peut pas être relu.
          }
        }

        setSaveError(message || "Impossible de publier le site.");

        return;
      }

      const saved: SavedSite = await response.json();

      setSaveMessage("Site publié avec succès.");

      await loadSavedSites();

      setPublishedResult({
        publicSlug: saved.publicSlug,
        businessName: saved.businessName,
      });
      setDesktopPanel("publication");
      setMobileStep(4);
    } catch (err) {
      console.error("Erreur réseau pendant la publication :", err);

      setSaveError("Impossible de contacter le serveur pour publier le site.");
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishCurrentSite() {
    setPublishedResult(null);
    if (savedSiteID === null) {
      return;
    }

    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await authenticatedFetch(
        `/sites/${savedSiteID}/unpublish`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Erreur dépublication");
      }

      setSaveMessage("Le site n'est plus public.");

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError("Impossible de retirer le site.");
    } finally {
      setPublishing(false);
    }
  }

  async function openSavedSite(id: number) {
    if (busy) return;
    setOpeningSite(true);
    setPublishedResult(null);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await authenticatedFetch(`/sites/${id}`);

      if (!response.ok) {
        throw new Error("Impossible d'ouvrir le site");
      }

      const saved: SavedSite = await response.json();

      setDraftRevision(saved.draftRevision);
      setSaveConflict(false);
      setSavedSiteID(saved.id);

      setSite({
        ...saved.site,
        logoUrl: saved.site.logoUrl ?? "",
        heroImageUrl: saved.site.heroImageUrl ?? "",
        gallery: saved.site.gallery ?? [],
        sections: (saved.site.sections ?? []).map((section) => ({
          ...section,
          imageMode: section.imageMode ?? "auto",
          imageUrl: section.imageUrl ?? "",
          hidden: section.hidden ?? false,
        })),
        layoutOrder: normalizeLayoutOrder(saved.site.layoutOrder),
        hiddenBlocks: normalizeHiddenBlocks(saved.site.hiddenBlocks),
        designSettings: normalizeDesignSettings(saved.site.designSettings),
        testimonials: saved.site.testimonials ?? [],
        serviceArea: saved.site.serviceArea ?? saved.city,
        openingHours: saved.site.openingHours ?? "",
        clientName: saved.site.clientName ?? "",
        clientEmail: saved.site.clientEmail ?? "",
        socialLinks: normalizeSocialLinks(saved.site.socialLinks),
      });

      setBusinessName(saved.businessName);

      setActivity(saved.activity);

      setCity(saved.city);

      setPhone(saved.phone);

      setDesignStyle(saved.designStyle);

      setAccentColor(saved.accentColor);

      setServices(
        saved.site.sections.map((section) => section.title).join(", "),
      );

      setManualEditorOpen(true);

      setSaveMessage(`Site "${saved.businessName}" ouvert.`);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      setSaveError("Impossible d'ouvrir ce site.");
    } finally {
      setOpeningSite(false);
    }
  }

  async function deleteSavedSite(id: number) {
    const confirmed = await confirm({
      title: "Supprimer définitivement ce site ?",
      confirmLabel: "Supprimer",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/sites/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur suppression");
      }

      if (savedSiteID === id) {
        createNewSite();
      }

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError("Impossible de supprimer.");
    }
  }

  function returnToDashboard() {
    sessionStorage.removeItem("siteai_site_to_open");

    router.push("/dashboard");
  }

  /** Nouveau site : on passe par la création guidée en 3 questions. */
  function startGuidedCreation() {
    if (busy) return;
    sessionStorage.removeItem("siteai_site_to_open");
    router.push("/creer");
  }

  function createNewSite() {
    if (busy) return;
    if (savedSiteID === null) {
      draft.clearDraft();
      draft.resetHistory({
        site: null,
        businessName: "",
        activity: "",
        city: "Montpellier",
        phone: "",
        services: "",
        designStyle: "moderne",
        accentColor: "#2563eb",
      });
    }
    setPublishedResult(null);
    sessionStorage.removeItem("siteai_site_to_open");

    setSavedSiteID(null);
    setDraftRevision(null);
    setSite(null);
    setMobileStep(0);
    setDesktopPanel(null);

    setBusinessName("");
    setActivity("");
    setActivitySuggestionsOpen(false);
    setCity("Montpellier");
    setPhone("");
    setServices("");

    setSiteGoal("generer des demandes de contact");
    setTargetAudience("");
    setDesiredTone("professionnel et chaleureux");
    setCommunicationStyle("clair et concis");
    setPrimaryAction("nous contacter");

    setDesignStyle("moderne");

    setAccentColor("#2563eb");

    setSaveMessage("");
    setSaveError("");

    setError("");

    setManualEditorOpen(false);
  }

  function getLogoExtension(file: File) {
    const byMime: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };

    return (
      byMime[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg"
    );
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !site) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setLogoError("Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Le logo doit faire 5 Mo maximum.");
      return;
    }

    setLogoUploading(true);
    setLogoError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Utilisateur non connecté");
      }

      const extension = getLogoExtension(file);

      const path = `${userData.user.id}/logos/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("site-images")
        .getPublicUrl(path);

      if (!publicData.publicUrl) {
        throw new Error("URL publique introuvable");
      }

      updateSiteField("logoUrl", publicData.publicUrl);

      setSaveMessage("✅ Logo envoyé. Pense à enregistrer les modifications.");
    } catch (err) {
      console.error(err);

      setLogoError(
        actionError(
          err,
          "Logo non envoyé. Utilise JPG, PNG, WebP ou AVIF (5 Mo maximum), puis réessaie.",
        ),
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !site) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setHeroImageError("Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setHeroImageError("L'image doit faire 5 Mo maximum.");
      return;
    }

    setHeroImageUploading(true);
    setHeroImageError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Utilisateur non connecté");
      }

      const extension = getLogoExtension(file);

      const path = `${userData.user.id}/heroes/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("site-images")
        .getPublicUrl(path);

      if (!publicData.publicUrl) {
        throw new Error("URL publique introuvable");
      }

      updateSiteField("heroImageUrl", publicData.publicUrl);

      setSaveMessage(
        "✅ Image de couverture ajoutée. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      setHeroImageError(
        actionError(
          err,
          "Photo non envoyée. Vérifie le format et la taille du fichier puis réessaie.",
        ),
      );
    } finally {
      setHeroImageUploading(false);
    }
  }

  function removeHeroImage() {
    updateSiteField("heroImageUrl", "");

    setHeroImageError("");
    setSaveMessage(
      "Image de couverture retirée. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  async function handleServiceImageUpload(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !site) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setServiceImageErrorIndex(index);
      setServiceImageError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setServiceImageErrorIndex(index);
      setServiceImageError("L'image doit faire 5 Mo maximum.");
      return;
    }

    setServiceImageUploadingIndex(index);
    setServiceImageErrorIndex(null);
    setServiceImageError("");
    setSaveMessage("");
    setSaveError("");

    let uploadedPath = "";

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Utilisateur non connecté");
      }

      const extension = getLogoExtension(file);

      uploadedPath = `${userData.user.id}/services/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("site-images")
        .getPublicUrl(uploadedPath);

      if (!publicData.publicUrl) {
        throw new Error("URL publique introuvable");
      }

      setSite((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections: current.sections.map((section, sectionIndex) =>
            sectionIndex === index
              ? {
                  ...section,
                  imageMode: "custom",
                  imageUrl: publicData.publicUrl,
                }
              : section,
          ),
        };
      });

      // Keep previous media available for undo and the published site.

      setSaveMessage(
        "✅ Photo du service ajoutée. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      if (uploadedPath) {
        await supabase.storage.from("site-images").remove([uploadedPath]);
      }

      setServiceImageErrorIndex(index);
      setServiceImageError(
        actionError(
          err,
          "Photo non envoyée. Vérifie le format et la taille du fichier puis réessaie.",
        ),
      );
    } finally {
      setServiceImageUploadingIndex(null);
    }
  }

  async function removeServiceImage(index: number) {
    if (!site) {
      return;
    }

    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections: current.sections.map((section, sectionIndex) =>
          sectionIndex === index
            ? {
                ...section,
                imageMode: "none",
                imageUrl: "",
              }
            : section,
        ),
      };
    });

    setServiceImageErrorIndex(null);
    setServiceImageError("");
    setSaveMessage(
      "Photo du service retirée. Pense à enregistrer les modifications.",
    );

    // Removing from the draft does not delete media used by the public site.
  }

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/site-images/";

    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = url.slice(markerIndex + marker.length);

    try {
      return decodeURIComponent(encodedPath);
    } catch {
      return encodedPath;
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (files.length === 0 || !site) {
      return;
    }

    const currentGallery = site.gallery ?? [];

    if (currentGallery.length + files.length > MAX_GALLERY_IMAGES) {
      setGalleryError(
        `Tu peux mettre ${MAX_GALLERY_IMAGES} photos maximum dans la galerie.`,
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setGalleryError(
          "Une des images a un format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setGalleryError("Chaque image doit faire 5 Mo maximum.");
        return;
      }
    }

    setGalleryUploading(true);
    setGalleryError("");
    setSaveMessage("");
    setSaveError("");

    const uploadedPaths: string[] = [];

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Utilisateur non connecté");
      }

      const newUrls: string[] = [];

      for (const file of files) {
        const extension = getLogoExtension(file);

        const path = `${userData.user.id}/gallery/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("site-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const { data: publicData } = supabase.storage
          .from("site-images")
          .getPublicUrl(path);

        if (!publicData.publicUrl) {
          throw new Error("URL publique introuvable");
        }

        newUrls.push(publicData.publicUrl);
      }

      updateSiteField("gallery", [...currentGallery, ...newUrls]);

      setSaveMessage(
        `✅ ${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} ajoutée${newUrls.length > 1 ? "s" : ""}. Pense à enregistrer les modifications.`,
      );
    } catch (err) {
      console.error(err);

      if (uploadedPaths.length > 0) {
        await supabase.storage.from("site-images").remove(uploadedPaths);
      }

      setGalleryError(
        actionError(
          err,
          "Photo non envoyée. Vérifie le format et la taille du fichier puis réessaie.",
        ),
      );
    } finally {
      setGalleryUploading(false);
    }
  }

  async function removeGalleryImage(index: number) {
    if (!site) {
      return;
    }

    const gallery = site.gallery ?? [];

    const imageUrl = gallery[index];

    if (!imageUrl) {
      return;
    }

    setGalleryRemovingIndex(index);
    setGalleryError("");
    setSaveError("");

    try {
      // Keep the file available to the public site and undo history.
      updateSiteField(
        "gallery",
        gallery.filter((_, galleryIndex) => galleryIndex !== index),
      );

      setSaveMessage(
        "Photo retirée de la galerie. Enregistre les modifications.",
      );
    } catch (err) {
      console.error(err);

      setGalleryError("Impossible de supprimer cette photo.");
    } finally {
      setGalleryRemovingIndex(null);
    }
  }

  function moveGalleryImage(index: number, direction: "left" | "right") {
    if (!site) {
      return;
    }

    const gallery = [...(site.gallery ?? [])];

    const targetIndex = direction === "left" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= gallery.length) {
      return;
    }

    const currentImage = gallery[index];

    gallery[index] = gallery[targetIndex];

    gallery[targetIndex] = currentImage;

    updateSiteField("gallery", gallery);
  }

  function removeLogo() {
    updateSiteField("logoUrl", "");

    setLogoError("");
    setSaveMessage(
      "Logo retiré de la page. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  function updateSiteField<K extends keyof GeneratedSite>(
    field: K,
    value: GeneratedSite[K],
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    if (field === "businessName") {
      setBusinessName(String(value));
    }

    if (field === "phone") {
      setPhone(String(value));
    }

    setSaveMessage("");
  }

  function updateSocialLink(key: keyof SocialLinks, value: string) {
    setSite((current) =>
      current
        ? {
            ...current,
            socialLinks: {
              ...current.socialLinks,
              [key]: value,
            },
          }
        : current,
    );
    setSaveMessage("");
  }

  function updateDesignSetting<K extends keyof DesignSettings>(
    field: K,
    value: DesignSettings[K],
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const settings = normalizeDesignSettings(current.designSettings);

      return {
        ...current,
        designSettings: {
          ...settings,
          [field]: value,
        },
      };
    });

    setSaveMessage("");
  }

  function updateTestimonial(
    index: number,
    field: keyof Testimonial,
    value: string | number,
  ) {
    setSite((current) =>
      current
        ? {
            ...current,
            testimonials: (current.testimonials ?? []).map((item, itemIndex) =>
              itemIndex === index ? { ...item, [field]: value } : item,
            ),
          }
        : current,
    );
    setSaveMessage("");
  }

  function addTestimonial() {
    setSite((current) =>
      current
        ? {
            ...current,
            testimonials: [
              ...(current.testimonials ?? []),
              { name: "", role: "", text: "", rating: 5 },
            ].slice(0, 6),
          }
        : current,
    );
    setSaveMessage("");
  }

  function removeTestimonial(index: number) {
    setSite((current) =>
      current
        ? {
            ...current,
            testimonials: (current.testimonials ?? []).filter(
              (_, itemIndex) => itemIndex !== index,
            ),
          }
        : current,
    );
    setSaveMessage("");
  }

  async function suggestAccentFromLogo() {
    if (!site?.logoUrl) {
      setLogoError(
        "Ajoute d’abord ton logo pour obtenir une suggestion de couleur.",
      );
      return;
    }
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = site.logoUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("logo inaccessible"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas indisponible");
      context.drawImage(image, 0, 0, 48, 48);
      const pixels = context.getImageData(0, 0, 48, 48).data;
      let red = 0,
        green = 0,
        blue = 0,
        count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        const brightness =
          pixels[index] + pixels[index + 1] + pixels[index + 2];
        if (alpha < 180 || brightness > 700 || brightness < 70) continue;
        red += pixels[index];
        green += pixels[index + 1];
        blue += pixels[index + 2];
        count += 1;
      }
      if (!count) throw new Error("aucune couleur exploitable");
      const color = `#${[red, green, blue]
        .map((value) =>
          Math.round(value / count)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
      setAccentColor(color);
      setLogoError("");
      setSaveMessage("✅ Couleur principale proposée depuis le logo.");
    } catch {
      setLogoError(
        "La couleur du logo n’a pas pu être lue. Choisis une palette proposée ci-dessous.",
      );
    }
  }

  function updateSection(
    index: number,
    field: keyof SiteSection,
    value: string,
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const sections = current.sections.map((section, sectionIndex) =>
        sectionIndex === index
          ? {
              ...section,
              [field]: value,
            }
          : section,
      );

      return {
        ...current,
        sections,
      };
    });

    setSaveMessage("");
  }

  function addSection() {
    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections: [
          ...current.sections,
          {
            title: "Nouveau service",
            text: "Décrivez ici ce service.",
            iconMode: "auto",
            icon: "",
            imageMode: "auto",
            imageUrl: "",
            hidden: false,
          },
        ],
      };
    });

    setSaveMessage("");
  }

  function removeSection(index: number) {
    if (!site) {
      return;
    }

    if (site.sections.length <= 1) {
      setSaveError("Le site doit conserver au moins une section.");

      return;
    }

    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections: current.sections.filter(
          (_, sectionIndex) => sectionIndex !== index,
        ),
      };
    });

    setSaveMessage("");
    setSaveError("");
  }

  function moveSection(index: number, direction: "up" | "down") {
    if (!site) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= site.sections.length) {
      return;
    }

    setSite((current) => {
      if (!current) {
        return current;
      }

      const sections = [...current.sections];

      const temporary = sections[index];

      sections[index] = sections[targetIndex];

      sections[targetIndex] = temporary;

      return {
        ...current,
        sections,
      };
    });

    setSaveMessage("");
  }

  function toggleSectionVisibility(index: number) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections: current.sections.map((section, sectionIndex) =>
          sectionIndex === index
            ? {
                ...section,
                hidden: !section.hidden,
              }
            : section,
        ),
      };
    });

    setSaveMessage("");
  }

  function moveLayoutBlock(block: LayoutBlock, direction: "up" | "down") {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const layoutOrder = normalizeLayoutOrder(current.layoutOrder);

      const index = layoutOrder.indexOf(block);

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= layoutOrder.length) {
        return current;
      }

      const next = [...layoutOrder];

      const temporary = next[index];

      next[index] = next[targetIndex];

      next[targetIndex] = temporary;

      return {
        ...current,
        layoutOrder: next,
      };
    });

    setSaveMessage("");
  }

  function toggleLayoutBlock(block: LayoutBlock) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const hiddenBlocks = normalizeHiddenBlocks(current.hiddenBlocks);

      const isHidden = hiddenBlocks.includes(block);

      return {
        ...current,
        hiddenBlocks: isHidden
          ? hiddenBlocks.filter((item) => item !== block)
          : [...hiddenBlocks, block],
      };
    });

    setSaveMessage("");
  }

  function selectDesignStyle(value: DesignStyle) {
    const style = getDesignStyle(value);
    setDesignStyle(style.id);
    setAccentColor(style.accent);
    // Changer de style garde les animations choisies.
    setSite((current) =>
      current
        ? {
            ...current,
            designSettings: {
              ...style.settings,
              motion: current.designSettings?.motion,
              heroBackground: current.designSettings?.heroBackground,
            },
          }
        : current,
    );
    setSaveMessage("");
  }

  function getPreviewBackground() {
    if (designStyle === "elegant") {
      return "bg-neutral-950";
    }

    if (designStyle === "artisan") {
      return "bg-stone-900";
    }

    return "bg-slate-950";
  }

  function getCardStyle() {
    if (designStyle === "elegant") {
      return "rounded-none border-neutral-200";
    }

    if (designStyle === "artisan") {
      return "rounded-xl border-stone-200";
    }

    return "rounded-3xl border-slate-200";
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const openedSite = currentSavedSite();
  const siteHealth = site ? getSiteHealth(site) : null;
  // Compare the same normalized data that is persisted, not local draft timestamps.
  function persistedContent(
    value: GeneratedSite,
    name: string,
    contact: string,
    town: string,
  ) {
    return {
      ...value,
      businessName: name.trim() || value.businessName,
      phone: contact.trim() || value.phone,
      sections: (value.sections ?? []).map((section) => ({
        ...section,
        imageMode: section.imageMode ?? "auto",
        imageUrl: section.imageUrl ?? "",
        hidden: section.hidden ?? false,
      })),
      layoutOrder: normalizeLayoutOrder(value.layoutOrder),
      hiddenBlocks: normalizeHiddenBlocks(value.hiddenBlocks),
      designSettings: normalizeDesignSettings(value.designSettings),
      testimonials: value.testimonials ?? [],
      serviceArea: value.serviceArea ?? town,
      openingHours: value.openingHours ?? "",
      clientName: value.clientName ?? "",
      clientEmail: value.clientEmail ?? "",
      socialLinks: normalizeSocialLinks(value.socialLinks),
    };
  }
  const hasUnsavedChanges = Boolean(
    site &&
      (!openedSite ||
        !sameContent(
          {
            site: persistedContent(site, businessName, phone, city),
            activity,
            city,
            designStyle,
            accentColor,
          },
          {
            site: persistedContent(
              openedSite.site,
              openedSite.businessName,
              openedSite.phone,
              openedSite.city,
            ),
            activity: openedSite.activity,
            city: openedSite.city,
            designStyle: openedSite.designStyle,
            accentColor: openedSite.accentColor,
          },
        )),
  );

  // Panneau latéral : trois onglets (Contenu, Style, Publier) au lieu de cinq étapes.
  // « apercu » masque le panneau pour laisser toute la place au site.
  const panelHidden = editorCollapsed || activeDesktopPanel === "apercu";
  // Sur mobile, l'étape 0 (formulaire de création) n'a plus lieu d'être une fois le site créé.
  const mobileView = site && mobileStep === 0 ? 1 : mobileStep;

  function openWorkspaceTab(
    panel: (typeof workspaceTabs)[number][0],
    step: number,
  ) {
    setDesktopPanel(panel);
    setEditorCollapsed(false);
    if (isMobileBuilder) navigateMobileStep(step);
    else setMobileStep(step);
  }

  function togglePanel() {
    if (panelHidden) {
      setEditorCollapsed(false);
      if (activeDesktopPanel === "apercu") setDesktopPanel("contenu");
    } else {
      setEditorCollapsed(true);
    }
  }

  function sendAiPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt || busy) return;
    openLumioAssistant(prompt, { send: true });
    setAiPrompt("");
  }

  if (authLoading) {
    return (
      <main className="lumio-editor lumio-night flex min-h-screen items-center justify-center">
        <div className="lumio-loading">
          <strong>lumio<span>.</span></strong>
          <p>Ouverture de l’éditeur…</p>
        </div>
      </main>
    );
  }

  return (
    <main
      data-simple-mode={!advancedMode}
      data-desktop-panel={activeDesktopPanel}
      data-mobile-step={mobileView}
      data-panel-hidden={panelHidden}
      data-has-site={Boolean(site)}
      data-siteai-builder
      className="lumio-editor lumio-night min-h-screen overflow-x-hidden"
    >
      <header data-builder-header>
        <button
          type="button"
          onClick={returnToDashboard}
          className="lumio-logo shrink-0"
          aria-label="Lumio, mes sites"
        >
          lumio<span>.</span>
        </button>

        {site && (
          <div data-builder-site className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {businessName || site.businessName || "Mon site"}
            </p>
            <SaveStatus
              hasUnsavedChanges={hasUnsavedChanges}
              saving={saving}
              publishing={publishing}
              busy={busy}
              published={Boolean(openedSite?.published)}
              pendingPublication={Boolean(
                openedSite?.published &&
                  openedSite.draftRevision !== openedSite.publishedRevision,
              )}
              error={Boolean(saveError || saveConflict)}
              localStatus={draft.status}
              onSave={saveCurrentSite}
            />
          </div>
        )}

        <div data-builder-actions>
          {site && (
            <div data-builder-history className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                disabled={!draft.canUndo || busy}
                onClick={draft.undo}
                aria-label="Annuler la dernière modification"
                title="Annuler"
                data-icon-button
              >
                ↶
              </button>
              <button
                type="button"
                disabled={!draft.canRedo || busy}
                onClick={draft.redo}
                aria-label="Rétablir la modification"
                title="Rétablir"
                data-icon-button
              >
                ↷
              </button>
            </div>
          )}

          {site && (
            <BuilderToolsMenu
              advancedMode={advancedMode}
              hasSite={Boolean(site)}
              previewEditing={previewEditing}
              canUndo={draft.canUndo}
              canRedo={draft.canRedo}
              busy={busy}
              onToggleAdvanced={() => setAdvancedMode((value) => !value)}
              onUndo={draft.undo}
              onRedo={draft.redo}
              onTogglePreviewEditing={() => setPreviewEditing((value) => !value)}
              align="right"
              label="Plus"
            >
              <AccountVersions
                siteId={savedSiteID}
                disabled={busy}
                load={loadAccountVersions}
                restore={restoreAccountVersion}
              />
              <BuilderVersions
                entries={versions.entries}
                error={versions.error}
                disabled={busy || !draftReady}
                onSave={() =>
                  versions.checkpoint(draftSnapshot, "Version conservée")
                }
                onRestore={restoreVersion}
              />
            </BuilderToolsMenu>
          )}

          <details data-account-menu className="relative">
            <summary
              aria-label="Mon compte"
              title={userEmail ? `Connecté avec ${userEmail}` : "Mon compte"}
            >
              {(userEmail || "?").slice(0, 1).toUpperCase()}
            </summary>
            <div data-account-popover>
              {userEmail && (
                <p className="px-3 pb-2 text-xs text-slate-400">
                  Connecté avec
                  <span className="mt-0.5 block break-all text-sm font-medium text-slate-200">
                    {userEmail}
                  </span>
                </p>
              )}
              <button type="button" onClick={returnToDashboard}>
                Mes sites
              </button>
              <button type="button" onClick={startGuidedCreation}>
                + Nouveau site
              </button>
              <button type="button" onClick={handleLogout} data-danger>
                Déconnexion
              </button>
            </div>
          </details>

          {site && (
            <button
              type="button"
              data-publish-cta
              disabled={busy}
              onClick={() => openWorkspaceTab("publication", 4)}
              className="hidden md:inline-flex"
            >
              {openedSite?.published ? "Mettre en ligne" : "Publier"}
            </button>
          )}
        </div>
      </header>

      {(saveConflict ||
        versions.error ||
        draft.status === "error" ||
        draft.restoredDraft) && (
        <div data-builder-notices role="status">
          {saveConflict && (
            <p role="alert" className="text-amber-300">
              Une version plus récente existe. Utilise Plus › Versions pour
              conserver ton travail, puis{" "}
              <button
                type="button"
                disabled={busy || savedSiteID === null}
                onClick={() => {
                  if (savedSiteID !== null) {
                    setSaveConflict(false);
                    void openSavedSite(savedSiteID);
                  }
                }}
                className="underline disabled:opacity-40"
              >
                rouvre le brouillon du compte
              </button>
              .
            </p>
          )}
          {versions.error && (
            <p role="alert" className="text-amber-300">
              {versions.error}
            </p>
          )}
          {draft.status === "error" && (
            <button
              type="button"
              onClick={draft.retrySave}
              className="text-blue-300 underline"
            >
              Réessayer la sauvegarde locale
            </button>
          )}
          {draft.restoredDraft && (
            <div className="flex flex-wrap items-center gap-3">
              <p>Un brouillon a été retrouvé sur cet appareil.</p>
              <button
                type="button"
                disabled={busy}
                onClick={draft.restoreDraft}
                className="rounded-lg bg-blue-600 px-3 py-2 font-semibold"
              >
                Reprendre
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={draft.discardDraft}
                className="rounded-lg border border-slate-700 px-3 py-2"
              >
                Garder cette version
              </button>
            </div>
          )}
        </div>
      )}

      <h1
        ref={mobileHeadingRef}
        tabIndex={-1}
        className="sr-only"
      >
        {site ? mobileSteps[mobileView] : "Crée ton site"}
      </h1>

      <section data-builder-section>
        {/* Guide de démarrage : sur mobile seulement, l'aperçu vide l'explique déjà sur ordinateur. */}
        {!site && (
          <div data-first-guide>
            <FirstSiteGuide />
          </div>
        )}

        <div data-builder-grid>
          <div data-builder-panel>
            {site && (
              <div
                role="tablist"
                aria-label="Modifier le site"
                data-builder-tabs
              >
                {workspaceTabs.map(([value, label, step]) => {
                  const selected = isMobileBuilder
                    ? mobileView === step
                    : activeDesktopPanel === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => openWorkspaceTab(value, step)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          <fieldset
            disabled={busy}
            data-builder-editor
            className="space-y-4"
          >
            <form
              data-mobile-panel="infos"
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
            >
              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Objectif du site
                </p>
                <SiteGoalPicker
                  value={newSiteGoal}
                  bookingUrl={newBookingUrl}
                  disabled={busy}
                  onChange={(value) => {
                    setNewSiteGoal(value);
                    setSiteGoal(
                      value === "calls"
                        ? "recevoir des appels"
                        : value === "booking"
                          ? "obtenir des rendez-vous"
                          : "obtenir des demandes de devis",
                    );
                  }}
                  onBookingUrlChange={setNewBookingUrl}
                />
              </div>
              <h2 className="text-2xl font-bold">Ton entreprise</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Présente ton activité avec tes propres mots. L’IA utilisera ces
                informations pour préparer ton site.
              </p>

              <div className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="business-name"
                    className="mb-2 block text-sm text-slate-400"
                  >
                    Nom de l&apos;entreprise
                  </label>

                  <input
                    id="business-name"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Dupont Plomberie"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="relative">
                  <label
                    htmlFor="business-activity"
                    className="mb-2 block text-sm text-slate-400"
                  >
                    Activité
                  </label>

                  <div className="relative">
                    <input
                      id="business-activity"
                      value={activity}
                      onChange={(event) => {
                        setActivity(event.target.value);
                        setActivitySuggestionsOpen(true);
                      }}
                      onFocus={() => setActivitySuggestionsOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setActivitySuggestionsOpen(false);
                        }, 150);
                      }}
                      autoComplete="off"
                      placeholder="Ex. Plombier, coiffeur, restaurant..."
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-11 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label="Afficher les suggestions"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        setActivitySuggestionsOpen((open) => !open)
                      }
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    >
                      <span
                        className={`text-xs transition ${
                          activitySuggestionsOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                  </div>

                  {activitySuggestionsOpen &&
                    activitySuggestions.length > 0 &&
                    !hasExactActivityMatch && (
                      <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
                        <div className="border-b border-slate-800 px-4 py-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Suggestions
                          </p>
                        </div>

                        <div className="max-h-72 overflow-y-auto p-2">
                          {activitySuggestions.map((example) => (
                            <button
                              key={example.label}
                              type="button"
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                              onClick={() => {
                                setActivity(example.label);
                                setActivitySuggestionsOpen(false);
                              }}
                              className="group flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-blue-500/10"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-100 transition group-hover:text-blue-300">
                                  {example.label}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {example.services
                                    .slice(0, 3)
                                    .join(" · ")}
                                </p>
                              </div>

                              <span className="shrink-0 text-sm text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-400">
                                →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {activitySuggestionsOpen &&
                    normalizedActivitySearch.length >= 2 &&
                    activitySuggestions.length === 0 && (
                      <div className="absolute left-0 right-0 top-full z-[100] mt-2 rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/40">
                        <p className="text-sm font-semibold text-slate-200">
                          Utiliser « {activity} »
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Aucun métier prédéfini ne correspond exactement.
                          Lumio utilisera quand même cette activité pour créer
                          le site.
                        </p>
                      </div>
                    )}
                </div>

                <div>
                  <label
                    htmlFor="business-city"
                    className="mb-2 block text-sm text-slate-400"
                  >
                    Ville
                  </label>

                  <input
                    id="business-city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business-phone"
                    className="mb-2 block text-sm text-slate-400"
                  >
                    Téléphone
                  </label>

                  <input
                    id="business-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business-services"
                    className="mb-2 block text-sm text-slate-400"
                  >
                    Services
                  </label>

                  <textarea
                    id="business-services"
                    aria-describedby="services-help"
                    value={services}
                    onChange={(event) => setServices(event.target.value)}
                    placeholder="Décris tes prestations, une par ligne"
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div
                  id="services-help"
                  className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"
                >
                  <p className="text-xs leading-5 text-slate-400">
                    Une prestation par ligne, ou séparée par une virgule.
                    Précise ce que tu proposes réellement à tes clients.
                  </p>
                  {suggestedServices.length > 0 && (
                    <>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            Idées de prestations
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Suggestions adaptées à ce que tu écris dans
                            Activité et Services.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                          {suggestedServices.length} idées
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {suggestedServices.map((suggestion, index) => {
                          const added = selectedServices.includes(
                            normalizeActivity(suggestion),
                          );

                          return (
                            <button
                              key={suggestion}
                              type="button"
                              disabled={added || loading}
                              onClick={() =>
                                setServices((current) =>
                                  appendService(current, suggestion),
                                )
                              }
                              className={`${!showAllServiceSuggestions && index >= 6 ? "hidden sm:inline-flex" : "inline-flex"} rounded-lg border border-slate-600 px-3 py-2 text-left text-xs text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/10 disabled:border-emerald-900 disabled:bg-emerald-950/20 disabled:text-emerald-300`}
                            >
                              {added ? "✓ " : "+ "}
                              {suggestion}
                            </button>
                          );
                        })}
                      </div>
                      {suggestedServices.length > 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllServiceSuggestions((value) => !value)
                          }
                          className="mt-3 text-xs font-semibold text-blue-300 sm:hidden"
                        >
                          {showAllServiceSuggestions
                            ? "Voir moins"
                            : `Voir les ${suggestedServices.length - 6} autres suggestions`}
                        </button>
                      )}
                    </>
                  )}
                  <p role="status" className="mt-3 text-xs text-slate-400">
                    {selectedServices.length} prestation
                    {selectedServices.length > 1 ? "s" : ""} renseignée
                    {selectedServices.length > 1 ? "s" : ""}
                  </p>
                </div>

                {!site && (
                  <details className="group rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-200">
                      <span>Personnaliser davantage</span>
                      <span className="text-sm text-blue-400 transition group-open:rotate-180">
                        ⌄
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Facultatif : précise la clientèle, le ton et l&apos;action
                      principale seulement si tu en as besoin.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div data-advanced-option>
                        <label
                          htmlFor="site-goal"
                          className="mb-2 block text-xs font-bold text-slate-400"
                        >
                          Précision de l’objectif pour l’IA
                        </label>
                        <select
                          id="site-goal"
                          value={siteGoal}
                          onChange={(event) => setSiteGoal(event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="generer des demandes de contact">
                            Générer des demandes de contact
                          </option>
                          <option value="obtenir des demandes de devis">
                            Obtenir des demandes de devis
                          </option>
                          <option value="obtenir des rendez-vous">
                            Obtenir des rendez-vous
                          </option>
                          <option value="presenter clairement les services">
                            Présenter clairement les services
                          </option>
                          <option value="attirer des clients en etablissement">
                            Attirer des clients en établissement
                          </option>
                          <option value="renforcer la presence locale">
                            Renforcer la présence locale
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="target-audience"
                          className="mb-2 block text-xs font-bold text-slate-400"
                        >
                          Clientèle cible
                        </label>
                        <input
                          id="target-audience"
                          value={targetAudience}
                          onChange={(event) =>
                            setTargetAudience(event.target.value)
                          }
                          placeholder="Ex. familles, entreprises, femmes 18–40 ans..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="desired-tone"
                          className="mb-2 block text-xs font-bold text-slate-400"
                        >
                          Ton souhaité
                        </label>
                        <select
                          id="desired-tone"
                          value={desiredTone}
                          onChange={(event) =>
                            setDesiredTone(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="professionnel et chaleureux">
                            Professionnel et chaleureux
                          </option>
                          <option value="premium et elegant">
                            Premium et élégant
                          </option>
                          <option value="moderne et dynamique">
                            Moderne et dynamique
                          </option>
                          <option value="simple et rassurant">
                            Simple et rassurant
                          </option>
                          <option value="direct et commercial">
                            Direct et commercial
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="communication-style"
                          className="mb-2 block text-xs font-bold text-slate-400"
                        >
                          Style de communication
                        </label>
                        <select
                          id="communication-style"
                          value={communicationStyle}
                          onChange={(event) =>
                            setCommunicationStyle(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="clair et concis">
                            Clair et concis
                          </option>
                          <option value="pedagogique">Pédagogique</option>
                          <option value="local et humain">
                            Local et humain
                          </option>
                          <option value="commercial sans exageration">
                            Commercial sans exagération
                          </option>
                          <option value="haut de gamme">Haut de gamme</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="primary-action"
                          className="mb-2 block text-xs font-bold text-slate-400"
                        >
                          Action principale souhaitée
                        </label>
                        <select
                          id="primary-action"
                          value={primaryAction}
                          onChange={(event) =>
                            setPrimaryAction(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="nous contacter">Nous contacter</option>
                          <option value="appeler">Appeler</option>
                          <option value="demander un devis">
                            Demander un devis
                          </option>
                          <option value="prendre rendez-vous">
                            Prendre rendez-vous
                          </option>
                          <option value="decouvrir les services">
                            Découvrir les services
                          </option>
                        </select>
                      </div>
                    </div>
                  </details>
                )}

                <div>
                  <p className="mb-2 text-sm text-slate-400">Style du site</p>

                  <StylePicker
                    compact={!advancedMode}
                    value={designStyle}
                    onChange={selectDesignStyle}
                    disabled={loading || editLoading || saving || publishing}
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm text-slate-400">Couleur</p>

                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.name}
                        onClick={() => setAccentColor(color.value)}
                        style={{
                          backgroundColor: color.value,
                        }}
                        className={`h-9 w-9 rounded-full border-2 ${
                          accentColor === color.value
                            ? "border-white"
                            : "border-transparent"
                        }`}
                      />
                    ))}

                    <input
                      type="color"
                      value={accentColor}
                      onChange={(event) => setAccentColor(event.target.value)}
                      title="Couleur personnalisée"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: accentColor,
                    color: getReadableTextColor(accentColor),
                  }}
                  className="w-full rounded-xl px-6 py-4 font-bold disabled:opacity-50"
                >
                  {loading ? "Création..." : "Créer avec l'IA"}
                </button>

                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </form>

            {site && (
              <div
                data-mobile-manual
                className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">✍️ Éditeur manuel</h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Modifie directement le contenu puis enregistre.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualEditorOpen((open) => !open)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                  >
                    {manualEditorOpen ? "Fermer" : "Ouvrir"}
                  </button>
                </div>

                {(manualEditorOpen ||
                  isMobileBuilder ||
                  activeDesktopPanel === "contenu" ||
                  activeDesktopPanel === "apparence") && (
                  <div data-mobile-fields className="mt-6 space-y-6">
                    <ContentMediaPanel
                      site={site}
                      logoUploading={logoUploading}
                      logoError={logoError}
                      handleLogoUpload={handleLogoUpload}
                      removeLogo={removeLogo}
                      heroImageUploading={heroImageUploading}
                      heroImageError={heroImageError}
                      handleHeroImageUpload={handleHeroImageUpload}
                      removeHeroImage={removeHeroImage}
                      MAX_GALLERY_IMAGES={MAX_GALLERY_IMAGES}
                      galleryUploading={galleryUploading}
                      galleryRemovingIndex={galleryRemovingIndex}
                      galleryError={galleryError}
                      moveGalleryImage={moveGalleryImage}
                      removeGalleryImage={removeGalleryImage}
                      handleGalleryUpload={handleGalleryUpload}
                    />

                    <SiteGoalPicker
                      value={site.siteGoal ?? "legacy"}
                      bookingUrl={site.bookingUrl ?? ""}
                      disabled={busy}
                      onChange={(value) => {
                        setSite((current) =>
                          current
                            ? {
                                ...current,
                                siteGoal: value,
                                hiddenBlocks: (
                                  current.hiddenBlocks ?? []
                                ).filter((block) => block !== "contact"),
                              }
                            : current,
                        );
                        setSaveMessage("");
                      }}
                      onBookingUrlChange={(value) =>
                        updateSiteField("bookingUrl", value)
                      }
                    />
                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Nom affiché
                      </label>

                      <input
                        data-builder-edit="businessName"
                        value={site.businessName}
                        onChange={(event) =>
                          updateSiteField("businessName", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-slate-400">
                          Activité
                        </label>

                        <input
                          value={activity}
                          onChange={(event) => {
                            setActivity(event.target.value);
                            setSaveMessage("");
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-slate-400">
                          Ville
                        </label>

                        <input
                          value={city}
                          onChange={(event) => {
                            setCity(event.target.value);
                            setSaveMessage("");
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Téléphone
                      </label>

                      <input
                        data-builder-edit="phone"
                        value={site.phone}
                        onChange={(event) =>
                          updateSiteField("phone", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <details className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4">
                      <summary className="cursor-pointer font-bold text-slate-200">
                        Réseaux sociaux
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Ajoute uniquement les profils que tu souhaites afficher dans le pied de page du site.
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {socialLinkFields.map(({ key, label, placeholder }) => (
                          <label key={key} className="block">
                            <span className="mb-2 block text-sm text-slate-400">
                              {label}
                            </span>
                            <input
                              type="text"
                              inputMode={key === "whatsapp" ? "tel" : "url"}
                              value={site.socialLinks?.[key] ?? ""}
                              onChange={(event) =>
                                updateSocialLink(key, event.target.value)
                              }
                              placeholder={placeholder}
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Tu peux coller un lien avec ou sans https://. Pour WhatsApp, un numéro de téléphone suffit.
                      </p>
                    </details>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Grand titre
                      </label>

                      <textarea
                        data-builder-edit="heroTitle"
                        value={site.heroTitle}
                        onChange={(event) =>
                          updateSiteField("heroTitle", event.target.value)
                        }
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Texte d&apos;accueil
                      </label>

                      <textarea
                        data-builder-edit="heroText"
                        value={site.heroText}
                        onChange={(event) =>
                          updateSiteField("heroText", event.target.value)
                        }
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary
                        data-builder-edit="seo"
                        className="cursor-pointer text-sm font-semibold"
                      >
                        Référencement Google
                      </summary>
                      <div className="mt-4">
                        <p className="font-bold">SEO Google</p>

                        <p className="mt-1 text-sm text-slate-500">
                          Ces textes sont utilisés pour le titre et la
                          description Google du site public.
                        </p>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm text-slate-400">
                            Titre SEO
                          </label>

                          <input
                            value={site.metaTitle}
                            onChange={(event) =>
                              updateSiteField("metaTitle", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                          />

                          <p className="mt-2 text-right text-xs text-slate-500">
                            {site.metaTitle.length} caractères
                          </p>
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm text-slate-400">
                            Description SEO
                          </label>

                          <textarea
                            value={site.metaDescription}
                            onChange={(event) =>
                              updateSiteField(
                                "metaDescription",
                                event.target.value,
                              )
                            }
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                          />

                          <p className="mt-2 text-right text-xs text-slate-500">
                            {site.metaDescription.length} caractères
                          </p>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Zone, horaires et avis clients
                      </summary>
                      <div className="mt-4 space-y-5">
                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            Zone d’intervention ou adresse
                          </label>
                          <input
                            data-builder-edit="local"
                            value={site.serviceArea ?? ""}
                            onChange={(event) =>
                              updateSiteField("serviceArea", event.target.value)
                            }
                            placeholder={`Exemple : ${city} et 30 km autour`}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            Horaires
                          </label>
                          <input
                            value={site.openingHours ?? ""}
                            onChange={(event) =>
                              updateSiteField(
                                "openingHours",
                                event.target.value,
                              )
                            }
                            placeholder="Exemple : lundi au vendredi, 8 h – 18 h"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="border-t border-slate-800 pt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold">Avis clients</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Ajoute uniquement des avis réels, avec l’accord
                                du client.
                              </p>
                            </div>
                            <button
                              data-builder-edit="reviews"
                              type="button"
                              onClick={addTestimonial}
                              disabled={(site.testimonials?.length ?? 0) >= 6}
                              className="rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-40"
                            >
                              + Ajouter
                            </button>
                          </div>
                          <div className="mt-4 space-y-4">
                            {(site.testimonials ?? []).map((item, index) => (
                              <div
                                key={index}
                                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <input
                                    value={item.name}
                                    onChange={(event) =>
                                      updateTestimonial(
                                        index,
                                        "name",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Nom du client"
                                    maxLength={100}
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                                  />
                                  <input
                                    value={item.role ?? ""}
                                    onChange={(event) =>
                                      updateTestimonial(
                                        index,
                                        "role",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Projet ou ville (facultatif)"
                                    maxLength={100}
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                                  />
                                </div>
                                <textarea
                                  value={item.text}
                                  onChange={(event) =>
                                    updateTestimonial(
                                      index,
                                      "text",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Texte de l’avis"
                                  rows={3}
                                  maxLength={600}
                                  className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                                />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <select
                                    value={item.rating ?? 5}
                                    onChange={(event) =>
                                      updateTestimonial(
                                        index,
                                        "rating",
                                        Number(event.target.value),
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                                  >
                                    <option value={5}>5 étoiles</option>
                                    <option value={4}>4 étoiles</option>
                                    <option value={3}>3 étoiles</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeTestimonial(index)}
                                    className="text-xs font-bold text-red-400"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(site.testimonials?.length ?? 0) === 0 && (
                              <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                                Aucun avis ajouté.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Informations client (pour les agences)
                      </summary>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <input
                          value={site.clientName ?? ""}
                          onChange={(event) =>
                            updateSiteField("clientName", event.target.value)
                          }
                          placeholder="Nom du client"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                        />
                        <input
                          type="email"
                          value={site.clientEmail ?? ""}
                          onChange={(event) =>
                            updateSiteField("clientEmail", event.target.value)
                          }
                          placeholder="Email du client"
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                        />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Ces informations restent privées et servent à organiser
                        les sites clients dans le tableau de bord.
                      </p>
                    </details>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Ordre et visibilité des sections
                      </summary>
                      <div className="mt-4">
                        <div>
                          <p className="font-bold">Ordre des blocs du site</p>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Déplace ou masque les grandes parties du site.
                            L&apos;aperçu se met à jour immédiatement.
                          </p>
                        </div>

                        <div className="mt-5 space-y-3">
                          {normalizeLayoutOrder(site.layoutOrder).map(
                            (block, index, order) => {
                              const hidden = normalizeHiddenBlocks(
                                site.hiddenBlocks,
                              ).includes(block);

                              return (
                                <div
                                  key={block}
                                  className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                                    hidden
                                      ? "border-slate-800 bg-slate-950/40 opacity-60"
                                      : "border-slate-700 bg-slate-950"
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">
                                      {layoutBlockLabels[block]}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {hidden
                                        ? "Masqué sur le site"
                                        : "Visible sur le site"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() =>
                                        moveLayoutBlock(block, "up")
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-30"
                                    >
                                      ↑ Monter
                                    </button>

                                    <button
                                      type="button"
                                      disabled={index === order.length - 1}
                                      onClick={() =>
                                        moveLayoutBlock(block, "down")
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-30"
                                    >
                                      ↓ Descendre
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleLayoutBlock(block)}
                                      className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                        hidden
                                          ? "border-emerald-800 text-emerald-400"
                                          : "border-amber-800 text-amber-300"
                                      }`}
                                    >
                                      {hidden ? "Afficher" : "Masquer"}
                                    </button>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </details>

                    <div
                      data-builder-edit="services"
                      tabIndex={-1}
                      className="border-t border-slate-800 pt-6"
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">Sections / services</p>

                          <p className="mt-1 text-sm text-slate-500">
                            Tu peux modifier, supprimer, ajouter ou déplacer les
                            blocs.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={addSection}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"
                        >
                          + Ajouter
                        </button>
                      </div>

                      <div className="mt-5 space-y-5">
                        {site.sections.map((section, index) => (
                          <div
                            key={index}
                            className={`rounded-2xl border border-slate-800 bg-slate-950 p-4 ${
                              section.hidden ? "opacity-55" : ""
                            }`}
                          >
                            <div className="mb-4 flex min-w-0 flex-col items-stretch gap-3">
                              <p className="text-sm font-bold text-slate-300">
                                Section {index + 1}
                              </p>

                              <div className="flex min-w-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveSection(index, "up")}
                                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                >
                                  ↑
                                </button>

                                <button
                                  type="button"
                                  disabled={index === site.sections.length - 1}
                                  onClick={() => moveSection(index, "down")}
                                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                >
                                  ↓
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleSectionVisibility(index)}
                                  className={`rounded-lg border px-2 py-1 text-xs ${
                                    section.hidden
                                      ? "border-emerald-900 text-emerald-400"
                                      : "border-amber-900 text-amber-300"
                                  }`}
                                >
                                  {section.hidden ? "Afficher" : "Masquer"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeSection(index)}
                                  className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>

                            <input
                              data-builder-edit={`section-${index}`}
                              value={section.title}
                              onChange={(event) =>
                                updateSection(
                                  index,
                                  "title",
                                  event.target.value,
                                )
                              }
                              placeholder="Titre"
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                            />

                            <textarea
                              value={section.text}
                              onChange={(event) =>
                                updateSection(index, "text", event.target.value)
                              }
                              placeholder="Texte"
                              rows={4}
                              className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                            />

                            <div
                              data-advanced-option
                              className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-slate-200">
                                    Photo du service
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Utilise automatiquement une photo de la
                                    galerie, importe une photo précise ou
                                    affiche le service sans image.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {(
                                    [
                                      ["auto", "Automatique"],
                                      ["custom", "Ma photo"],
                                      ["none", "Aucune"],
                                    ] as const
                                  ).map(([mode, label]) => (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() =>
                                        updateSection(index, "imageMode", mode)
                                      }
                                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                        normalizeImageMode(
                                          section.imageMode,
                                        ) === mode
                                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {normalizeImageMode(section.imageMode) ===
                                "auto" && (
                                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400">
                                  {site.gallery?.length
                                    ? `✨ Lumio utilisera automatiquement une photo de ta galerie pour ce service.`
                                    : "✨ Ajoute des photos dans Réalisations pour que Lumio puisse en utiliser automatiquement ici."}
                                </div>
                              )}

                              {normalizeImageMode(section.imageMode) ===
                                "custom" && (
                                <div className="mt-4">
                                  {section.imageUrl?.trim() ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                                      <img
                                        src={section.imageUrl}
                                        alt={`Photo ${section.title}`}
                                        className="h-44 w-full object-cover"
                                      />

                                      <div className="flex flex-wrap gap-2 p-3">
                                        <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500">
                                          {serviceImageUploadingIndex === index
                                            ? "Envoi..."
                                            : "Remplacer"}

                                          <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/avif"
                                            disabled={
                                              serviceImageUploadingIndex !==
                                              null
                                            }
                                            onChange={(event) =>
                                              handleServiceImageUpload(
                                                index,
                                                event,
                                              )
                                            }
                                            className="hidden"
                                          />
                                        </label>

                                        <button
                                          type="button"
                                          disabled={
                                            serviceImageUploadingIndex !== null
                                          }
                                          onClick={() =>
                                            removeServiceImage(index)
                                          }
                                          className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                                        >
                                          Retirer
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-7 text-center text-sm font-bold text-slate-300 transition hover:border-blue-500 hover:text-blue-300">
                                      {serviceImageUploadingIndex === index
                                        ? "Envoi de la photo..."
                                        : "📷 Ajouter une photo pour ce service"}

                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/avif"
                                        disabled={
                                          serviceImageUploadingIndex !== null
                                        }
                                        onChange={(event) =>
                                          handleServiceImageUpload(index, event)
                                        }
                                        className="hidden"
                                      />
                                    </label>
                                  )}

                                  {serviceImageErrorIndex === index &&
                                    serviceImageError && (
                                      <p className="mt-3 text-xs text-red-400">
                                        {serviceImageError}
                                      </p>
                                    )}
                                </div>
                              )}

                              {normalizeImageMode(section.imageMode) ===
                                "none" && (
                                <p className="mt-4 text-xs text-slate-500">
                                  Cette carte sera affichée sans photo.
                                </p>
                              )}
                            </div>

                            <div
                              data-advanced-option
                              className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-slate-200">
                                    Icône du service
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Laisse Lumio choisir automatiquement,
                                    sélectionne ton icône ou masque-la.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {(
                                    [
                                      ["auto", "Automatique"],
                                      ["custom", "Choisir"],
                                      ["none", "Aucune"],
                                    ] as const
                                  ).map(([mode, label]) => (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() => {
                                        updateSection(index, "iconMode", mode);

                                        if (
                                          mode === "custom" &&
                                          !section.icon?.trim()
                                        ) {
                                          updateSection(index, "icon", "✨");
                                        }
                                      }}
                                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                        normalizeIconMode(section.iconMode) ===
                                        mode
                                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {normalizeIconMode(section.iconMode) ===
                                "custom" && (
                                <div className="mt-4">
                                  <div className="flex flex-wrap gap-2">
                                    {serviceIconOptions.map((icon) => (
                                      <button
                                        key={icon}
                                        type="button"
                                        onClick={() =>
                                          updateSection(index, "icon", icon)
                                        }
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition ${
                                          section.icon === icon
                                            ? "border-blue-500 bg-blue-500/10"
                                            : "border-slate-700 bg-slate-950 hover:border-slate-500"
                                        }`}
                                        title={`Utiliser ${icon}`}
                                      >
                                        {icon}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="mt-4 flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-2xl">
                                      {section.icon?.trim() || "✨"}
                                    </div>

                                    <input
                                      value={section.icon ?? ""}
                                      onChange={(event) =>
                                        updateSection(
                                          index,
                                          "icon",
                                          event.target.value.slice(0, 12),
                                        )
                                      }
                                      placeholder="Ou colle ton emoji : 🔧"
                                      className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              )}

                              {normalizeIconMode(section.iconMode) ===
                                "auto" && (
                                <p className="mt-4 text-xs text-emerald-400">
                                  ✨ Lumio choisira l&apos;icône selon le métier
                                  et la position du service.
                                </p>
                              )}

                              {normalizeIconMode(section.iconMode) ===
                                "none" && (
                                <p className="mt-4 text-xs text-slate-500">
                                  Cette carte sera affichée sans icône.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <AppearancePanel
                      site={site}
                      advancedMode={advancedMode}
                      designStyle={designStyle}
                      selectDesignStyle={selectDesignStyle}
                      loading={loading}
                      editLoading={editLoading}
                      saving={saving}
                      publishing={publishing}
                      colors={colors}
                      accentColor={accentColor}
                      setAccentColor={setAccentColor}
                      setSaveMessage={setSaveMessage}
                      suggestAccentFromLogo={suggestAccentFromLogo}
                      normalizeDesignSettings={normalizeDesignSettings}
                      updateSiteField={updateSiteField}
                    />

                    <button
                      data-desktop-save
                      data-mobile-hide
                      type="button"
                      onClick={saveCurrentSite}
                      disabled={saving || publishing}
                      className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500 disabled:opacity-50"
                    >
                      {saving
                        ? "Enregistrement..."
                        : openedSite?.published
                          ? "Enregistrer le brouillon"
                          : savedSiteID === null
                            ? "Sauvegarder le site"
                            : openedSite?.published
                              ? "Enregistrer le brouillon"
                              : "Enregistrer les modifications"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {site && (
              <PublicationPanel
                openedSite={openedSite}
                publishedResult={publishedResult}
                businessName={businessName}
                siteHealth={siteHealth}
                completeCheck={completeCheck}
                navigateMobileStep={navigateMobileStep}
                setDesktopPanel={setDesktopPanel}
                saveCurrentSite={saveCurrentSite}
                publishCurrentSite={publishCurrentSite}
                unpublishCurrentSite={unpublishCurrentSite}
                saving={saving}
                publishing={publishing}
                editLoading={editLoading}
                loading={loading}
                saveMessage={saveMessage}
                saveError={saveError}
              />
            )}

            <div
              data-desktop-sites
              data-mobile-panel="infos"
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Mes sites</h2>

                <button
                  type="button"
                  onClick={loadSavedSites}
                  className="text-sm text-blue-400"
                >
                  Actualiser
                </button>
              </div>

              {sitesLoading ? (
                <p className="mt-5 text-slate-400">Chargement...</p>
              ) : savedSites.length === 0 ? (
                <p className="mt-5 text-slate-500">Aucun site sauvegardé.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {savedSites.map((saved) => (
                    <div
                      key={saved.id}
                      className={`rounded-xl border p-4 ${
                        savedSiteID === saved.id
                          ? "border-blue-500 bg-slate-950"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{saved.businessName}</p>

                          <p className="text-sm text-slate-400">
                            {saved.activity} • {saved.city}
                          </p>
                        </div>

                        {saved.published ? (
                          <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold text-green-400">
                            Public
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-500">
                            Brouillon
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-600">
                        {formatDate(saved.updatedAt)}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openSavedSite(saved.id)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
                        >
                          Ouvrir
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteSavedSite(saved.id)}
                          className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400"
                        >
                          Supprimer
                        </button>
                      </div>

                      {saved.published && saved.publicSlug && (
                        <a
                          href={`/site/${saved.publicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block rounded-lg border border-green-800 px-3 py-2 text-center text-sm text-green-400"
                        >
                          🌍 Voir en ligne
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

            {site && (isMobileBuilder ? mobileView === 1 : activeDesktopPanel === "contenu") && (
              <button
                type="button"
                data-more-options
                aria-pressed={advancedMode}
                onClick={() => setAdvancedMode((value) => !value)}
              >
                {advancedMode
                  ? "Masquer les options avancées"
                  : "Plus d’options : SEO, avis, ordre des blocs…"}
              </button>
            )}
          </div>

          <div data-desktop-preview data-mobile-hide>
            {!site ? (
              <div className="flex h-full min-h-[560px] items-center justify-center p-6 text-center">
                <div>
                  <div className="lumio-empty-mark" aria-hidden="true">lumio<span>.</span></div>

                  <h2 className="mt-5 text-3xl font-bold">
                    Ton site prend forme <em>ici.</em>
                  </h2>

                  <p className="mx-auto mt-3 max-w-md leading-6 text-slate-400">
                    Réponds à 3 questions : Lumio écrit les textes, choisit
                    la mise en page et prépare ton site.
                  </p>

                  <button
                    type="button"
                    onClick={startGuidedCreation}
                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold"
                  >
                    Créer mon site en 3 questions
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    ou remplis le formulaire à gauche
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div data-preview-toolbar>
                  <button
                    type="button"
                    onClick={togglePanel}
                    aria-pressed={!panelHidden}
                    data-pill
                  >
                    {panelHidden ? "☰ Afficher le panneau" : "Masquer le panneau"}
                  </button>

                  <div data-device-switch role="group" aria-label="Taille de l’aperçu">
                    {previewDeviceOptions.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPreviewDevice(value)}
                        aria-pressed={previewDevice === value}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p data-preview-hint>
                    {previewEditing
                      ? "Clique sur un texte ou une image pour le modifier"
                      : previewViewports[previewDevice].label}
                  </p>

                  <button
                    type="button"
                    onClick={() => setPreviewFullscreenOpen(true)}
                    data-pill
                  >
                    Agrandir
                  </button>
                </div>

                <div data-preview-canvas>
                  <ResponsiveSitePreview
                    onEdit={
                      previewEditing && !busy ? editFromPreview : undefined
                    }
                    device={previewDevice}
                    site={site}
                    designStyle={designStyle}
                    accentColor={accentColor}
                    activity={activity}
                    city={city}
                  />
                </div>

                <form data-ai-bar onSubmit={sendAiPrompt}>
                  <div data-ai-input>
                    <span aria-hidden="true">✦</span>
                    <label htmlFor="builder-ai-prompt" className="sr-only">
                      Demande à Lumio de modifier ton site
                    </label>
                    <input
                      id="builder-ai-prompt"
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Demande à Lumio : « ajoute mes horaires », « passe le site en vert »…"
                      autoComplete="off"
                      disabled={busy}
                    />
                    <button
                      type="submit"
                      disabled={busy || !aiPrompt.trim()}
                      data-ai-send
                    >
                      Envoyer
                    </button>
                  </div>
                  <div data-ai-ideas>
                    {quickIdeas.map(([label, instruction]) => (
                      <button
                        key={label}
                        type="button"
                        disabled={busy}
                        onClick={() => prepareQuickPrompt(instruction)}
                      >
                        {label}
                      </button>
                    ))}
                    <AIUsage ready={Boolean(draftUserId)} busy={busy} />
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {isMobileBuilder && mobileView === 3 && site && (
        <div data-mobile-preview>
          <button
            type="button"
            onClick={() => {
              setPreviewDevice("mobile");
              setPreviewFullscreenOpen(true);
            }}
            className="mb-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold"
          >
            Agrandir l&apos;aperçu
          </button>
          <ResponsiveSitePreview
            onEdit={previewEditing && !busy ? editFromPreview : undefined}
            device="mobile"
            site={site}
            designStyle={designStyle}
            accentColor={accentColor}
            activity={activity}
            city={city}
          />
        </div>
      )}

      {site && (
        <nav aria-label="Modifier le site" data-mobile-tabbar>
          {mobileTabs.map(([label, step]) => (
            <button
              key={label}
              type="button"
              aria-current={mobileView === step ? "page" : undefined}
              onClick={() => {
                const panel = step === 2 ? "apparence" : step === 4 ? "publication" : step === 3 ? "apercu" : "contenu";
                setDesktopPanel(panel);
                navigateMobileStep(step);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {confirmDialog}

      {site && previewFullscreenOpen && (
        <div
          ref={previewDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 outline-none backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu du site en grand"
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="font-bold text-white">Aperçu du site en grand</p>
              <p className="mt-1 text-xs text-slate-500">
                Vérifie le rendu final avant de publier. Échap ferme aussi cet
                aperçu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
                {(
                  [
                    ["desktop", "🖥️", "Ordinateur"],
                    ["tablet", "▭", "Tablette"],
                    ["mobile", "📱", "Téléphone"],
                  ] as const
                ).map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPreviewDevice(value)}
                    aria-pressed={previewDevice === value}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                      previewDevice === value
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="mr-1.5">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPreviewFullscreenOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Icon name="close" size={15} className="mr-1.5 inline-block align-[-0.15em]" />
                Fermer
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
            <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl sm:p-5">
              <ResponsiveSitePreview
                onEdit={previewEditing && !busy ? editFromPreview : undefined}
                device={previewDevice}
                site={site}
                designStyle={designStyle}
                accentColor={accentColor}
                activity={activity}
                city={city}
              />

              <p className="mt-3 text-center text-xs text-slate-500">
                {previewViewports[previewDevice].label}
              </p>
            </div>
          </div>
        </div>
      )}
      <LumioAssistant
        page="Éditeur"
        getSiteContext={getAssistantContext}
        onSiteModified={applyAssistantModification}
        onBusyChange={setEditLoading}
        busy={busy && !editLoading}
        mobileOffset={88}
        hideDesktopLauncher
      />
    </main>
  );
}




