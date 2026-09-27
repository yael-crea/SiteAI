"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SitePreview, { type PreviewEditTarget } from "@/components/SitePreview";
import PublicationSuccess from "@/components/PublicationSuccess";
import { useBuilderDraft } from "@/lib/useBuilderDraft";
import StylePicker from "@/components/StylePicker";
import { getDesignStyle, type DesignStyle } from "@/lib/designStyles";
import { getSiteHealth, smartPalettes, type Testimonial } from "@/lib/siteGrowth";

type IconMode =
  | "auto"
  | "custom"
  | "none";

type ImageMode =
  | "auto"
  | "custom"
  | "none";

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

type DesignSettings = {
  font:
    | "system"
    | "modern"
    | "classic"
    | "editorial"
    | "mono";
  buttonStyle:
    | "square"
    | "soft"
    | "pill";
  cardStyle:
    | "simple"
    | "bordered"
    | "shadow";
  logoSize:
    | "small"
    | "medium"
    | "large";
  heroLayout:
    | "auto"
    | "left"
    | "center";
  contentWidth:
    | "normal"
    | "wide";
  spacing:
    | "compact"
    | "normal"
    | "airy";
  background:
    | "auto"
    | "light"
    | "dark";
};

type GeneratedSite = {
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
};



type PreviewDevice =
  | "desktop"
  | "tablet"
  | "mobile";

type ModifyResponse = {
  site: GeneratedSite;
  designStyle: DesignStyle;
  accentColor: string;
};

type SavedSite = {
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

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

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

const layoutBlockLabels: Record<
  LayoutBlock,
  string
> = {
  about: "À propos",
  services: "Services",
  process: "Comment ça marche",
  faq: "FAQ",
  gallery: "Réalisations",
  contact: "Contact",
};

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

function normalizeHiddenBlocks(
  value: LayoutBlock[] | undefined,
): LayoutBlock[] {
  const valid = new Set<LayoutBlock>(
    defaultLayoutOrder,
  );

  return Array.from(
    new Set(
      (value ?? []).filter((block) =>
        valid.has(block),
      ),
    ),
  );
}

function normalizeIconMode(
  value: string | undefined,
): IconMode {
  if (
    value === "custom" ||
    value === "none"
  ) {
    return value;
  }

  return "auto";
}

function normalizeImageMode(
  value: string | undefined,
): ImageMode {
  if (
    value === "custom" ||
    value === "none"
  ) {
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
    frameDocument.defaultView?.scrollTo({top: 0, behavior: "smooth"});
    return;
  }
  let id = href.slice(1);
  try { id = decodeURIComponent(id); } catch { /* Keep malformed fragments inert. */ }
  frameDocument.getElementById(id)?.scrollIntoView({behavior: "smooth", block: "start"});
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
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);

  const [portalRoot, setPortalRoot] =
    useState<HTMLElement | null>(null);

  const [scale, setScale] =
    useState(1);

  const viewport =
    previewViewports[device];

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    function updateScale() {
      const currentContainer =
        containerRef.current;

      if (!currentContainer) {
        return;
      }

      const availableWidth =
        Math.max(
          1,
          currentContainer.clientWidth - 8,
        );

      setScale(
        Math.min(
          1,
          availableWidth /
            viewport.width,
        ),
      );
    }

    updateScale();

    if (
      typeof ResizeObserver ===
      "undefined"
    ) {
      window.addEventListener(
        "resize",
        updateScale,
      );

      return () => {
        window.removeEventListener(
          "resize",
          updateScale,
        );
      };
    }

    const observer =
      new ResizeObserver(
        updateScale,
      );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [viewport.width]);

  useEffect(() => {
    const frameDocument = portalRoot?.ownerDocument;
    if (!frameDocument) return;
    const handleAnchor = (event: MouseEvent) => followPreviewAnchor(event, frameDocument);
    // Bubble after the editor's capture handler: editable fields keep priority.
    frameDocument.addEventListener("click", handleAnchor);
    frameDocument.addEventListener("auxclick", handleAnchor);
    return () => {
      frameDocument.removeEventListener("click", handleAnchor);
      frameDocument.removeEventListener("auxclick", handleAnchor);
    };
  }, [portalRoot]);

  function prepareIframe() {
    const frame =
      iframeRef.current;

    const frameDocument =
      frame?.contentDocument;

    if (!frameDocument) {
      return;
    }

    frameDocument.documentElement.lang =
      "fr";

    frameDocument.documentElement.style.background =
      "#ffffff";

    frameDocument.body.style.margin =
      "0";

    frameDocument.body.style.background =
      "#ffffff";

    frameDocument.body.style.minWidth =
      "0";

    frameDocument.head
      .querySelectorAll(
        "[data-siteai-preview-style='true']",
      )
      .forEach((node) =>
        node.remove(),
      );

    document.head
      .querySelectorAll(
        'style, link[rel="stylesheet"]',
      )
      .forEach((node) => {
        const clone =
          node.cloneNode(
            true,
          ) as HTMLElement;

        clone.setAttribute(
          "data-siteai-preview-style",
          "true",
        );

        frameDocument.head.appendChild(
          clone,
        );
      });

    setPortalRoot(
      frameDocument.getElementById(
        "siteai-responsive-preview-root",
      ),
    );
  }

  const scaledWidth =
    viewport.width * scale;

  const scaledHeight =
    viewport.height * scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
    >
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
            transformOrigin:
              "top left",
          }}
          className={`block bg-white ${
            device === "mobile"
              ? "rounded-[2rem] border-[10px] border-slate-800"
              : device ===
                  "tablet"
                ? "rounded-[1.5rem] border-[8px] border-slate-800"
                : "border border-slate-700"
          }`}
        />

        {portalRoot &&
          createPortal(
            <SitePreview onEdit={onEdit}
              site={site}
              designStyle={
                designStyle
              }
              accentColor={
                accentColor
              }
              activity={activity}
              city={city}
            />,
            portalRoot,
          )}
      </div>
    </div>
  );
}

const activityExamples = [
  {label: "Plombier", keywords: ["plomb", "chauffag"], services: ["Recherche de fuite", "Installation sanitaire", "Remplacement de chauffe-eau", "Rénovation de salle de bain"]},
  {label: "Électricien", keywords: ["electric"], services: ["Dépannage électrique", "Installation de prises", "Rénovation électrique", "Installation d’éclairage"]},
  {label: "Coiffeur", keywords: ["coiff", "barbier"], services: ["Coupe femme", "Coupe homme", "Coloration", "Taille de barbe"]},
  {label: "Restaurant", keywords: ["restaur", "pizzeria", "traiteur"], services: ["Repas sur place", "Plats à emporter", "Réservation de table", "Repas de groupe"]},
  {label: "Paysagiste", keywords: ["paysag", "jardin"], services: ["Entretien de jardin", "Taille de haies", "Tonte de pelouse", "Aménagement extérieur"]},
  {label: "Entreprise de nettoyage", keywords: ["nettoy", "menage"], services: ["Nettoyage de bureaux", "Entretien de locaux", "Nettoyage de vitres", "Remise en état"]},
  {label: "Peintre en bâtiment", keywords: ["peint"], services: ["Peinture intérieure", "Peinture extérieure", "Préparation des murs", "Pose de revêtements muraux"]},
] as const;

function normalizeActivity(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseServices(value: string) {
  return value.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
}

function appendService(current: string, suggestion: string) {
  if (parseServices(current).some(item => normalizeActivity(item) === normalizeActivity(suggestion))) return current;
  return current.trim() ? current.trimEnd() + "\n" + suggestion : suggestion;
}

type BuilderSnapshot = {
  site: GeneratedSite | null;
  businessName: string; activity: string; city: string; phone: string; services: string;
  designStyle: DesignStyle; accentColor: string;
};

function isBuilderSnapshot(value: unknown): value is BuilderSnapshot {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (!["businessName", "activity", "city", "phone", "services", "designStyle", "accentColor"].every(key => typeof draft[key] === "string")) return false;
  if (getDesignStyle(draft.designStyle).id !== draft.designStyle) return false;
  if (draft.site === null) return true;
  if (!draft.site || typeof draft.site !== "object") return false;
  const content = draft.site as Record<string, unknown>;
  return ["businessName", "slug", "metaTitle", "metaDescription", "heroTitle", "heroText", "phone", "logoUrl", "heroImageUrl"].every(key => typeof content[key] === "string")
    && Array.isArray(content.gallery) && content.gallery.every(item => typeof item === "string")
    && Array.isArray(content.sections) && content.sections.every(item => item && typeof item.title === "string" && typeof item.text === "string");
}

export default function Home() {
  const router = useRouter();
  const mobileSteps = ["Infos", "Contenu", "Apparence", "Aperçu", "Publication"] as const;
  const [mobileStep, setMobileStep] = useState(0);
  const [desktopPanel, setDesktopPanel] = useState<"infos" | "contenu" | "apparence" | "ia" | "publication" | "sites" | "apercu" | null>(null);
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
      mobileHeadingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }


  const [draftUserId, setDraftUserId] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [openingSite, setOpeningSite] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{publicSlug: string; businessName: string} | null>(null);
  const [previewEditing, setPreviewEditing] = useState(false);
  const [authLoading, setAuthLoading] =
    useState(true);

  const [userEmail, setUserEmail] =
    useState("");

  const [builderMobileMenuOpen, setBuilderMobileMenuOpen] =
    useState(false);

  const [businessName, setBusinessName] =
    useState("");

  const [activity, setActivity] =
    useState("");

  const [city, setCity] =
    useState("Montpellier");

  const [phone, setPhone] =
    useState("");

  const [services, setServices] =
    useState("");

  const suggestedActivity = activityExamples.find(example =>
    example.keywords.some(keyword => normalizeActivity(activity).includes(keyword)),
  );
  const selectedServices = parseServices(services).map(normalizeActivity);

  const [designStyle, setDesignStyle] =
    useState<DesignStyle>("moderne");

  const [accentColor, setAccentColor] =
    useState("#2563eb");

  const [previewDevice, setPreviewDevice] =
    useState<PreviewDevice>("desktop");

  const [previewFullscreenOpen, setPreviewFullscreenOpen] =
    useState(false);

  const [editorCollapsed, setEditorCollapsed] =
    useState(false);

  const [site, setSite] =
    useState<GeneratedSite | null>(null);

  const activeDesktopPanel = desktopPanel ?? (site ? "apercu" : "infos");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editPrompt, setEditPrompt] =
    useState("");

  const [editLoading, setEditLoading] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [savedSites, setSavedSites] =
    useState<SavedSite[]>([]);

  const [savedSiteID, setSavedSiteID] =
    useState<number | null>(null);

  const [sitesLoading, setSitesLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
    useState("");

  const [manualEditorOpen, setManualEditorOpen] =
    useState(false);

  const [logoUploading, setLogoUploading] =
    useState(false);

  const [logoError, setLogoError] =
    useState("");

  const [heroImageUploading, setHeroImageUploading] =
    useState(false);

  const [heroImageError, setHeroImageError] =
    useState("");

  const [serviceImageUploadingIndex, setServiceImageUploadingIndex] =
    useState<number | null>(null);

  const [serviceImageErrorIndex, setServiceImageErrorIndex] =
    useState<number | null>(null);

  const [serviceImageError, setServiceImageError] =
    useState("");

  const [galleryUploading, setGalleryUploading] =
    useState(false);

  const [galleryRemovingIndex, setGalleryRemovingIndex] =
    useState<number | null>(null);

  const [galleryError, setGalleryError] =
    useState("");


  const busy = loading || editLoading || saving || publishing || openingSite || logoUploading || heroImageUploading || galleryUploading || serviceImageUploadingIndex !== null;
  const draftSnapshot: BuilderSnapshot = {site, businessName, activity, city, phone, services, designStyle, accentColor};
  const draft = useBuilderDraft<BuilderSnapshot>({
    storageKey: draftUserId ? `siteai:draft:v1:${draftUserId}:${savedSiteID ?? "new"}` : null,
    value: draftSnapshot,
    enabled: draftReady && !openingSite,
    validate: isBuilderSnapshot,
    onRestore: restoreSnapshot,
  });

  function restoreSnapshot(snapshot: BuilderSnapshot) {
    setSite(snapshot.site); setBusinessName(snapshot.businessName); setActivity(snapshot.activity);
    setCity(snapshot.city); setPhone(snapshot.phone); setServices(snapshot.services);
    setDesignStyle(snapshot.designStyle); setAccentColor(snapshot.accentColor);
    setSaveMessage(""); setSaveError("");
    if (!snapshot.site) { setMobileStep(0); setDesktopPanel("infos"); }
  }

  function editFromPreview(target: PreviewEditTarget) {
    if (busy) return;
    setPreviewFullscreenOpen(false);
    setDesktopPanel("contenu"); setMobileStep(1); setEditorCollapsed(false); setManualEditorOpen(true);
    const key = target.kind === "field" ? target.field : target.kind === "section" ? `section-${target.index}` : "gallery";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[data-builder-edit="${key}"]`);
      field?.focus({preventScroll: true});
      field?.scrollIntoView({behavior: "smooth", block: "center"});
    }));
  }

  function prepareQuickPrompt(instruction: string) {
    setEditPrompt(instruction); setDesktopPanel("ia"); setMobileStep(1);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const field = document.getElementById("builder-ai-instruction");
      field?.focus({preventScroll: true}); field?.scrollIntoView({behavior: "smooth", block: "center"});
    }));
  }

  useEffect(() => {
    if (!previewFullscreenOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setPreviewFullscreenOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [previewFullscreenOpen]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !data.session
        ) {
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
        setUserEmail(
          data.session.user.email ?? "",
        );

        setAuthLoading(false);

        await loadSavedSites();

        const siteToOpen =
          sessionStorage.getItem(
            "siteai_site_to_open",
          );

        if (siteToOpen) {
          sessionStorage.removeItem(
            "siteai_site_to_open",
          );

          const siteID =
            Number(siteToOpen);

          if (
            Number.isInteger(siteID) &&
            siteID > 0
          ) {
            await openSavedSite(
              siteID,
            );
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
    const {
      data,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !data.session
    ) {
      await supabase.auth.signOut();

      router.replace("/auth");

      throw new Error(
        "Session absente",
      );
    }

    return data.session.access_token;
  }

  async function authenticatedFetch(
    path: string,
    options: RequestInit = {},
  ) {
    const token =
      await getAccessToken();

    const headers =
      new Headers(
        options.headers,
      );

    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    const response =
      await fetch(
        `/api-backend${path}`,
        {
          ...options,
          headers,
          cache: "no-store",
        },
      );

    if (
      response.status === 401
    ) {
      await supabase.auth.signOut();

      router.replace("/auth");
    }

    return response;
  }

  async function loadSavedSites() {
    setSitesLoading(true);

    try {
      const response =
        await authenticatedFetch(
          "/sites",
        );

      if (!response.ok) {
        throw new Error(
          `Impossible de récupérer les sites : ${response.status}`,
        );
      }

      const data: SavedSite[] =
        await response.json();

      setSavedSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSitesLoading(false);
    }
  }

  function currentSavedSite() {
    if (
      savedSiteID === null
    ) {
      return null;
    }

    return (
      savedSites.find(
        (saved) =>
          saved.id ===
          savedSiteID,
      ) ?? null
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/auth");
    router.refresh();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSaveMessage("");
    setSaveError("");
    setChatMessages([]);
    setManualEditorOpen(false);

    const serviceList = parseServices(services);

    try {
      const response =
        await authenticatedFetch(
          "/generate",
          {
            method: "POST",

            body: JSON.stringify({
              businessName,
              activity,
              city,
              phone,
              services:
                serviceList,
            }),
          },
        );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(message);
      }

      const data: GeneratedSite =
        await response.json();

      const generatedSite: GeneratedSite = {
        ...data,
        logoUrl:
          data.logoUrl ?? "",
        heroImageUrl:
          data.heroImageUrl ?? "",
        gallery:
          data.gallery ?? [],
        sections:
          (data.sections ?? []).map(
            (section) => ({
              ...section,
              imageMode:
                section.imageMode ?? "auto",
              imageUrl:
                section.imageUrl ?? "",
              hidden:
                section.hidden ?? false,
            }),
          ),
        layoutOrder:
          normalizeLayoutOrder(
            data.layoutOrder,
          ),
        hiddenBlocks:
          normalizeHiddenBlocks(
            data.hiddenBlocks,
          ),
        designSettings:
          normalizeDesignSettings(
            {...data.designSettings, ...getDesignStyle(designStyle).settings},
          ),
        testimonials: data.testimonials ?? [],
        serviceArea: data.serviceArea ?? city,
        openingHours: data.openingHours ?? "",
        clientName: data.clientName ?? "",
        clientEmail: data.clientEmail ?? "",
      };

      draft.clearDraft();
      setSavedSiteID(null);
      setPublishedResult(null);
      setSite(generatedSite);
      setDesktopPanel("apercu");
      if (window.matchMedia("(width < 48rem)").matches) navigateMobileStep(1);
      setBusinessName(
        generatedSite.businessName ||
          businessName,
      );
      setPhone(
        generatedSite.phone ||
          phone,
      );
      setManualEditorOpen(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de générer le site.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleModification(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!site) {
      return;
    }

    const instruction =
      editPrompt.trim();

    if (
      instruction === ""
    ) {
      return;
    }

    setEditLoading(true);
    setEditError("");
    setSaveMessage("");

    setChatMessages(
      (messages) => [
        ...messages,
        {
          role: "user",
          text: instruction,
        },
      ],
    );

    setEditPrompt("");

    try {
      const response =
        await authenticatedFetch(
          "/modify",
          {
            method: "POST",

            body: JSON.stringify({
              site,
              instruction,
              designStyle,
              accentColor,
              activity,
              city,
            }),
          },
        );

      if (!response.ok) {
        const message =
          (
            await response.text()
          ).trim();

        throw new Error(
          message ||
            "Impossible de modifier le site.",
        );
      }

      const data: ModifyResponse =
        await response.json();

      const modifiedSite: GeneratedSite = {
        ...data.site,
        logoUrl:
          data.site.logoUrl ||
          site.logoUrl ||
          "",
        heroImageUrl:
          data.site.heroImageUrl ||
          site.heroImageUrl ||
          "",
        gallery:
          data.site.gallery?.length
            ? data.site.gallery
            : site.gallery ?? [],
        sections:
          (data.site.sections ?? []).map(
            (section, index) => ({
              ...section,
              iconMode:
                site.sections[index]?.iconMode ??
                section.iconMode ??
                "auto",
              icon:
                site.sections[index]?.icon ??
                section.icon ??
                "",
              imageMode:
                site.sections[index]?.imageMode ??
                section.imageMode ??
                "auto",
              imageUrl:
                site.sections[index]?.imageUrl ??
                section.imageUrl ??
                "",
              hidden:
                site.sections[index]
                  ?.hidden ??
                section.hidden ??
                false,
            }),
          ),
        layoutOrder:
          normalizeLayoutOrder(
            site.layoutOrder ??
              data.site.layoutOrder,
          ),
        hiddenBlocks:
          normalizeHiddenBlocks(
            site.hiddenBlocks ??
              data.site.hiddenBlocks,
          ),
        designSettings:
          normalizeDesignSettings(
            site.designSettings ??
              data.site.designSettings,
          ),
        testimonials: site.testimonials ?? data.site.testimonials ?? [],
        serviceArea: site.serviceArea ?? data.site.serviceArea ?? city,
        openingHours: site.openingHours ?? data.site.openingHours ?? "",
        clientName: site.clientName ?? data.site.clientName ?? "",
        clientEmail: site.clientEmail ?? data.site.clientEmail ?? "",
      };

      setSite(modifiedSite);

      setBusinessName(
        modifiedSite.businessName,
      );

      setPhone(
        modifiedSite.phone,
      );

      setDesignStyle(
        data.designStyle,
      );

      setAccentColor(
        data.accentColor,
      );

      setChatMessages(
        (messages) => [
          ...messages,
          {
            role: "assistant",
            text:
              "Modification effectuée.",
          },
        ],
      );
    } catch (err) {
      console.error(err);

      setEditError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le site.",
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function saveCurrentSite(): Promise<SavedSite | null> {
    if (!site) {
      return null;
    }

    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    const synchronizedSite: GeneratedSite = {
      ...site,
      businessName:
        businessName.trim() ||
        site.businessName,
      phone:
        phone.trim() ||
        site.phone,
      sections:
        (site.sections ?? []).map(
          (section) => ({
            ...section,
            imageMode:
              section.imageMode ?? "auto",
            imageUrl:
              section.imageUrl ?? "",
            hidden:
              section.hidden ?? false,
          }),
        ),
      layoutOrder:
        normalizeLayoutOrder(
          site.layoutOrder,
        ),
      hiddenBlocks:
        normalizeHiddenBlocks(
          site.hiddenBlocks,
        ),
      designSettings:
        normalizeDesignSettings(
          site.designSettings,
        ),
    };

    setSite(synchronizedSite);

    const body = {
      site: synchronizedSite,
      activity,
      city,
      designStyle,
      accentColor,
    };

    try {
      let response: Response;

      if (
        savedSiteID === null
      ) {
        response =
          await authenticatedFetch(
            "/sites",
            {
              method: "POST",

              body:
                JSON.stringify(
                  body,
                ),
            },
          );
      } else {
        response =
          await authenticatedFetch(
            `/sites/${savedSiteID}`,
            {
              method: "PUT",

              body:
                JSON.stringify(
                  body,
                ),
            },
          );
      }

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            "Erreur sauvegarde",
        );
      }

      const saved: SavedSite =
        await response.json();

      if (savedSiteID === null) draft.clearDraft();
      setSavedSiteID(
        saved.id,
      );

      setBusinessName(
        saved.businessName,
      );

      setActivity(
        saved.activity,
      );

      setCity(
        saved.city,
      );

      setPhone(
        saved.phone,
      );

      setDesignStyle(
        saved.designStyle,
      );

      setAccentColor(
        saved.accentColor,
      );

      setSite({
        ...saved.site,
        designSettings:
          normalizeDesignSettings(
            saved.site.designSettings,
          ),
        testimonials: saved.site.testimonials ?? [],
        serviceArea: saved.site.serviceArea ?? saved.city,
        openingHours: saved.site.openingHours ?? "",
        clientName: saved.site.clientName ?? "",
        clientEmail: saved.site.clientEmail ?? "",
      });

      setSaveMessage(
        saved.published
          ? "✅ Modifications enregistrées et visibles sur le site public."
          : savedSiteID === null
            ? "✅ Site sauvegardé."
            : "✅ Modifications enregistrées.",
      );

      if (saved.published && saved.publicSlug) setPublishedResult({publicSlug: saved.publicSlug, businessName: saved.businessName});
      await loadSavedSites();
      return saved;
    } catch (err) {
      console.error(err);

      setSaveError("La sauvegarde a échoué. Tes modifications restent dans cet éditeur. Réessaie avant de quitter la page.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentSite() {
    if (saving || publishing) return;
    if (
      savedSiteID === null
    ) {
      setSaveError(
        "Sauvegarde le site avant de le publier.",
      );

      return;
    }

    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      // Publish only after the current editor content has been saved successfully.
      const latestSavedSite = await saveCurrentSite();
      if (!latestSavedSite) return;
      const response =
        await authenticatedFetch(
          `/sites/${latestSavedSite.id}/publish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        let message =
          (
            await response.text()
          ).trim();

        if (
          response.status === 403 &&
          message === ""
        ) {
          try {
            const statusResponse =
              await authenticatedFetch(
                "/stripe/status",
              );

            if (statusResponse.ok) {
              const billingStatus:
                {
                  plan?: string;
                  status?: string;
                  maxPublishedSites?: number;
                } =
                await statusResponse.json();

              const plan =
                (
                  billingStatus.plan ??
                  ""
                )
                  .trim()
                  .toLowerCase();

              if (
                billingStatus.status !== "active" &&
                billingStatus.status !== "trialing"
              ) {
                message =
                  "Un abonnement actif est nécessaire pour publier un site.";
              } else if (
                plan === "essentiel"
              ) {
                message =
                  "Limite de la formule Essentiel atteinte : 1 site publié maximum. Dépublie ce site ou passe à Agence pour gérer plusieurs clients.";
              } else if (
                plan === "pro"
              ) {
                message =
                  "Limite de la formule Pro atteinte : 1 site publié maximum. Passe à Agence pour gérer jusqu'à 10 sites clients.";
              } else if (
                plan === "agence"
              ) {
                message =
                  "Limite de la formule Agence atteinte : 10 sites publiés maximum.";
              }
            }
          } catch {
            // On garde le message générique ci-dessous si le statut Stripe
            // ne peut pas être relu.
          }
        }

        setSaveError(
          message ||
            "Impossible de publier le site.",
        );

        return;
      }

      const saved: SavedSite =
        await response.json();

      setSaveMessage(
        "🚀 Site publié avec succès.",
      );

      await loadSavedSites();

      setPublishedResult({publicSlug: saved.publicSlug, businessName: saved.businessName});
      setDesktopPanel("publication"); setMobileStep(4);
    } catch (err) {
      console.error(
        "Erreur réseau pendant la publication :",
        err,
      );

      setSaveError(
        "Impossible de contacter le serveur pour publier le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishCurrentSite() {
    setPublishedResult(null);
    if (
      savedSiteID === null
    ) {
      return;
    }

    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${savedSiteID}/unpublish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Erreur dépublication",
        );
      }

      setSaveMessage(
        "Le site n'est plus public.",
      );

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de retirer le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function openSavedSite(
    id: number,
  ) {
    if (busy) return;
    setOpeningSite(true); setPublishedResult(null);
    setSaveError("");
    setSaveMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${id}`,
        );

      if (!response.ok) {
        throw new Error(
          "Impossible d'ouvrir le site",
        );
      }

      const saved: SavedSite =
        await response.json();

      setSavedSiteID(
        saved.id,
      );

      setSite({
        ...saved.site,
        logoUrl:
          saved.site.logoUrl ?? "",
        heroImageUrl:
          saved.site.heroImageUrl ?? "",
        gallery:
          saved.site.gallery ?? [],
        sections:
          (saved.site.sections ?? []).map(
            (section) => ({
              ...section,
              imageMode:
                section.imageMode ?? "auto",
              imageUrl:
                section.imageUrl ?? "",
              hidden:
                section.hidden ?? false,
            }),
          ),
        layoutOrder:
          normalizeLayoutOrder(
            saved.site.layoutOrder,
          ),
        hiddenBlocks:
          normalizeHiddenBlocks(
            saved.site.hiddenBlocks,
          ),
        designSettings:
          normalizeDesignSettings(
            saved.site.designSettings,
          ),
        testimonials: saved.site.testimonials ?? [],
        serviceArea: saved.site.serviceArea ?? saved.city,
        openingHours: saved.site.openingHours ?? "",
        clientName: saved.site.clientName ?? "",
        clientEmail: saved.site.clientEmail ?? "",
      });

      setBusinessName(
        saved.businessName,
      );

      setActivity(
        saved.activity,
      );

      setCity(
        saved.city,
      );

      setPhone(
        saved.phone,
      );

      setDesignStyle(
        saved.designStyle,
      );

      setAccentColor(
        saved.accentColor,
      );

      setServices(
        saved.site.sections
          .map(
            (section) =>
              section.title,
          )
          .join(", "),
      );

      setChatMessages([]);
      setManualEditorOpen(true);

      setSaveMessage(
        `Site "${saved.businessName}" ouvert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible d'ouvrir ce site.",
      );
    } finally {
      setOpeningSite(false);
    }
  }

  async function deleteSavedSite(
    id: number,
  ) {
    const confirmed =
      window.confirm(
        "Supprimer définitivement ce site ?",
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `/sites/${id}`,
          {
            method: "DELETE",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Erreur suppression",
        );
      }

      if (
        savedSiteID === id
      ) {
        createNewSite();
      }

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de supprimer.",
      );
    }
  }

  function returnToDashboard() {
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.push("/dashboard");
  }

  function createNewSite() {
    if (busy) return;
    if (savedSiteID === null) {
      draft.clearDraft();
      draft.resetHistory({site: null, businessName: "", activity: "", city: "Montpellier", phone: "", services: "", designStyle: "moderne", accentColor: "#2563eb"});
    }
    setPublishedResult(null);
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    setSavedSiteID(null);
    setSite(null);
    setMobileStep(0);
    setDesktopPanel(null);

    setBusinessName("");
    setActivity("");
    setCity("Montpellier");
    setPhone("");
    setServices("");

    setDesignStyle(
      "moderne",
    );

    setAccentColor(
      "#2563eb",
    );

    setChatMessages([]);

    setSaveMessage("");
    setSaveError("");

    setEditPrompt("");
    setEditError("");
    setError("");

    setManualEditorOpen(false);
  }

  function getLogoExtension(
    file: File,
  ) {
    const byMime: Record<
      string,
      string
    > = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };

    return (
      byMime[file.type] ||
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg"
    );
  }

  async function handleLogoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

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

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setLogoError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setLogoError(
        "Le logo doit faire 5 Mo maximum.",
      );
      return;
    }

    setLogoUploading(true);
    setLogoError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const extension =
        getLogoExtension(file);

      const path =
        `${userData.user.id}/logos/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("site-images")
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("site-images")
          .getPublicUrl(path);

      if (
        !publicData.publicUrl
      ) {
        throw new Error(
          "URL publique introuvable",
        );
      }

      updateSiteField(
        "logoUrl",
        publicData.publicUrl,
      );

      setSaveMessage(
        "✅ Logo envoyé. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      setLogoError(
        "Impossible d'envoyer le logo.",
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleHeroImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

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

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setHeroImageError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setHeroImageError(
        "L'image doit faire 5 Mo maximum.",
      );
      return;
    }

    setHeroImageUploading(true);
    setHeroImageError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const extension =
        getLogoExtension(file);

      const path =
        `${userData.user.id}/heroes/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("site-images")
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("site-images")
          .getPublicUrl(path);

      if (
        !publicData.publicUrl
      ) {
        throw new Error(
          "URL publique introuvable",
        );
      }

      updateSiteField(
        "heroImageUrl",
        publicData.publicUrl,
      );

      setSaveMessage(
        "✅ Image de couverture ajoutée. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      setHeroImageError(
        "Impossible d'envoyer l'image de couverture.",
      );
    } finally {
      setHeroImageUploading(false);
    }
  }

  function removeHeroImage() {
    updateSiteField(
      "heroImageUrl",
      "",
    );

    setHeroImageError("");
    setSaveMessage(
      "Image de couverture retirée. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  async function handleServiceImageUpload(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

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

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setServiceImageErrorIndex(index);
      setServiceImageError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setServiceImageErrorIndex(index);
      setServiceImageError(
        "L'image doit faire 5 Mo maximum.",
      );
      return;
    }


    setServiceImageUploadingIndex(index);
    setServiceImageErrorIndex(null);
    setServiceImageError("");
    setSaveMessage("");
    setSaveError("");

    let uploadedPath = "";

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const extension =
        getLogoExtension(file);

      uploadedPath =
        `${userData.user.id}/services/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("site-images")
          .upload(
            uploadedPath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("site-images")
          .getPublicUrl(
            uploadedPath,
          );

      if (
        !publicData.publicUrl
      ) {
        throw new Error(
          "URL publique introuvable",
        );
      }

      setSite(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            sections:
              current.sections.map(
                (
                  section,
                  sectionIndex,
                ) =>
                  sectionIndex ===
                  index
                    ? {
                        ...section,
                        imageMode:
                          "custom",
                        imageUrl:
                          publicData.publicUrl,
                      }
                    : section,
              ),
          };
        },
      );

      // Keep previous media available for undo and the published site.

      setSaveMessage(
        "✅ Photo du service ajoutée. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      if (uploadedPath) {
        await supabase.storage
          .from("site-images")
          .remove([
            uploadedPath,
          ]);
      }

      setServiceImageErrorIndex(index);
      setServiceImageError(
        "Impossible d'envoyer la photo du service.",
      );
    } finally {
      setServiceImageUploadingIndex(null);
    }
  }

  async function removeServiceImage(
    index: number,
  ) {
    if (!site) {
      return;
    }


    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections:
            current.sections.map(
              (
                section,
                sectionIndex,
              ) =>
                sectionIndex ===
                index
                  ? {
                      ...section,
                      imageMode:
                        "none",
                      imageUrl: "",
                    }
                  : section,
            ),
        };
      },
    );

    setServiceImageErrorIndex(null);
    setServiceImageError("");
    setSaveMessage(
      "Photo du service retirée. Pense à enregistrer les modifications.",
    );

    // Removing from the draft does not delete media used by the public site.
  }

  function getStoragePathFromPublicUrl(
    url: string,
  ) {
    const marker =
      "/storage/v1/object/public/site-images/";

    const markerIndex =
      url.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath =
      url.slice(
        markerIndex +
          marker.length,
      );

    try {
      return decodeURIComponent(
        encodedPath,
      );
    } catch {
      return encodedPath;
    }
  }

  async function handleGalleryUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ?? [],
      );

    event.target.value = "";

    if (
      files.length === 0 ||
      !site
    ) {
      return;
    }

    const currentGallery =
      site.gallery ?? [];

    if (
      currentGallery.length +
        files.length >
      MAX_GALLERY_IMAGES
    ) {
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
      if (
        !allowedTypes.includes(
          file.type,
        )
      ) {
        setGalleryError(
          "Une des images a un format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
        );
        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setGalleryError(
          "Chaque image doit faire 5 Mo maximum.",
        );
        return;
      }
    }

    setGalleryUploading(true);
    setGalleryError("");
    setSaveMessage("");
    setSaveError("");

    const uploadedPaths: string[] =
      [];

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const newUrls: string[] =
        [];

      for (const file of files) {
        const extension =
          getLogoExtension(file);

        const path =
          `${userData.user.id}/gallery/${crypto.randomUUID()}.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("site-images")
            .upload(
              path,
              file,
              {
                cacheControl:
                  "3600",
                upsert: false,
                contentType:
                  file.type,
              },
            );

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const {
          data: publicData,
        } =
          supabase.storage
            .from("site-images")
            .getPublicUrl(path);

        if (
          !publicData.publicUrl
        ) {
          throw new Error(
            "URL publique introuvable",
          );
        }

        newUrls.push(
          publicData.publicUrl,
        );
      }

      updateSiteField(
        "gallery",
        [
          ...currentGallery,
          ...newUrls,
        ],
      );

      setSaveMessage(
        `✅ ${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} ajoutée${newUrls.length > 1 ? "s" : ""}. Pense à enregistrer les modifications.`,
      );
    } catch (err) {
      console.error(err);

      if (
        uploadedPaths.length > 0
      ) {
        await supabase.storage
          .from("site-images")
          .remove(uploadedPaths);
      }

      setGalleryError(
        "Impossible d'envoyer les photos de la galerie.",
      );
    } finally {
      setGalleryUploading(false);
    }
  }

  async function removeGalleryImage(
    index: number,
  ) {
    if (!site) {
      return;
    }

    const gallery =
      site.gallery ?? [];

    const imageUrl =
      gallery[index];

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
        gallery.filter(
          (
            _,
            galleryIndex,
          ) =>
            galleryIndex !==
            index,
        ),
      );

      setSaveMessage(
        "Photo retirée de la galerie. Enregistre les modifications.",
      );
    } catch (err) {
      console.error(err);

      setGalleryError(
        "Impossible de supprimer cette photo.",
      );
    } finally {
      setGalleryRemovingIndex(
        null,
      );
    }
  }

  function moveGalleryImage(
    index: number,
    direction:
      | "left"
      | "right",
  ) {
    if (!site) {
      return;
    }

    const gallery = [
      ...(site.gallery ?? []),
    ];

    const targetIndex =
      direction === "left"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        gallery.length
    ) {
      return;
    }

    const currentImage =
      gallery[index];

    gallery[index] =
      gallery[targetIndex];

    gallery[targetIndex] =
      currentImage;

    updateSiteField(
      "gallery",
      gallery,
    );
  }

  function removeLogo() {
    updateSiteField(
      "logoUrl",
      "",
    );

    setLogoError("");
    setSaveMessage(
      "Logo retiré de la page. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  function updateSiteField<
    K extends keyof GeneratedSite,
  >(
    field: K,
    value: GeneratedSite[K],
  ) {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [field]: value,
        };
      },
    );

    if (
      field === "businessName"
    ) {
      setBusinessName(
        String(value),
      );
    }

    if (
      field === "phone"
    ) {
      setPhone(
        String(value),
      );
    }

    setSaveMessage("");
  }

  function updateDesignSetting<
    K extends keyof DesignSettings,
  >(
    field: K,
    value: DesignSettings[K],
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const settings =
        normalizeDesignSettings(
          current.designSettings,
        );

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
    setSite((current) => current ? {
      ...current,
      testimonials: (current.testimonials ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    } : current);
    setSaveMessage("");
  }

  function addTestimonial() {
    setSite((current) => current ? {
      ...current,
      testimonials: [
        ...(current.testimonials ?? []),
        { name: "", role: "", text: "", rating: 5 },
      ].slice(0, 6),
    } : current);
    setSaveMessage("");
  }

  function removeTestimonial(index: number) {
    setSite((current) => current ? {
      ...current,
      testimonials: (current.testimonials ?? []).filter((_, itemIndex) => itemIndex !== index),
    } : current);
    setSaveMessage("");
  }

  async function suggestAccentFromLogo() {
    if (!site?.logoUrl) {
      setLogoError("Ajoute d’abord ton logo pour obtenir une suggestion de couleur.");
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
      let red = 0, green = 0, blue = 0, count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
        if (alpha < 180 || brightness > 700 || brightness < 70) continue;
        red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1;
      }
      if (!count) throw new Error("aucune couleur exploitable");
      const color = `#${[red, green, blue].map((value) => Math.round(value / count).toString(16).padStart(2, "0")).join("")}`;
      setAccentColor(color);
      setLogoError("");
      setSaveMessage("✅ Couleur principale proposée depuis le logo.");
    } catch {
      setLogoError("La couleur du logo n’a pas pu être lue. Choisis une palette proposée ci-dessous.");
    }
  }

  function updateSection(
    index: number,
    field: keyof SiteSection,
    value: string,
  ) {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        const sections =
          current.sections.map(
            (section, sectionIndex) =>
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
      },
    );

    setSaveMessage("");
  }

  function addSection() {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections: [
            ...current.sections,
            {
              title:
                "Nouveau service",
              text:
                "Décrivez ici ce service.",
              iconMode:
                "auto",
              icon: "",
              imageMode:
                "auto",
              imageUrl: "",
              hidden: false,
            },
          ],
        };
      },
    );

    setSaveMessage("");
  }

  function removeSection(
    index: number,
  ) {
    if (!site) {
      return;
    }

    if (
      site.sections.length <= 1
    ) {
      setSaveError(
        "Le site doit conserver au moins une section.",
      );

      return;
    }

    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections:
            current.sections.filter(
              (_, sectionIndex) =>
                sectionIndex !==
                index,
            ),
        };
      },
    );

    setSaveMessage("");
    setSaveError("");
  }

  function moveSection(
    index: number,
    direction: "up" | "down",
  ) {
    if (!site) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        site.sections.length
    ) {
      return;
    }

    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        const sections = [
          ...current.sections,
        ];

        const temporary =
          sections[index];

        sections[index] =
          sections[targetIndex];

        sections[targetIndex] =
          temporary;

        return {
          ...current,
          sections,
        };
      },
    );

    setSaveMessage("");
  }

  function toggleSectionVisibility(
    index: number,
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sections:
          current.sections.map(
            (section, sectionIndex) =>
              sectionIndex === index
                ? {
                    ...section,
                    hidden:
                      !section.hidden,
                  }
                : section,
          ),
      };
    });

    setSaveMessage("");
  }

  function moveLayoutBlock(
    block: LayoutBlock,
    direction: "up" | "down",
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const layoutOrder =
        normalizeLayoutOrder(
          current.layoutOrder,
        );

      const index =
        layoutOrder.indexOf(block);

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >=
          layoutOrder.length
      ) {
        return current;
      }

      const next = [
        ...layoutOrder,
      ];

      const temporary =
        next[index];

      next[index] =
        next[targetIndex];

      next[targetIndex] =
        temporary;

      return {
        ...current,
        layoutOrder: next,
      };
    });

    setSaveMessage("");
  }

  function toggleLayoutBlock(
    block: LayoutBlock,
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const hiddenBlocks =
        normalizeHiddenBlocks(
          current.hiddenBlocks,
        );

      const isHidden =
        hiddenBlocks.includes(block);

      return {
        ...current,
        hiddenBlocks: isHidden
          ? hiddenBlocks.filter(
              (item) =>
                item !== block,
            )
          : [
              ...hiddenBlocks,
              block,
            ],
      };
    });

    setSaveMessage("");
  }

  function selectDesignStyle(value: DesignStyle) {
    const style = getDesignStyle(value);
    setDesignStyle(style.id);
    setAccentColor(style.accent);
    setSite(current => current ? {...current, designSettings: {...style.settings}} : current);
    setSaveMessage("");
  }

  function getPreviewBackground() {
    if (
      designStyle ===
      "elegant"
    ) {
      return "bg-neutral-950";
    }

    if (
      designStyle ===
      "artisan"
    ) {
      return "bg-stone-900";
    }

    return "bg-slate-950";
  }

  function getCardStyle() {
    if (
      designStyle ===
      "elegant"
    ) {
      return "rounded-none border-neutral-200";
    }

    if (
      designStyle ===
      "artisan"
    ) {
      return "rounded-xl border-stone-200";
    }

    return "rounded-3xl border-slate-200";
  }

  function formatDate(
    value: string,
  ) {
    return new Date(
      value,
    ).toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  const openedSite =
    currentSavedSite();
  const siteHealth = site ? getSiteHealth(site) : null;

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main data-desktop-panel={activeDesktopPanel} data-mobile-step={mobileStep} data-siteai-builder className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-[1800px] px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={returnToDashboard}
              className="shrink-0 text-2xl font-black"
            >
              Site
              <span className="text-blue-500">
                AI
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setBuilderMobileMenuOpen(
                  (current) => !current,
                )
              }
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold transition hover:border-blue-500 md:hidden"
              aria-label={
                builderMobileMenuOpen
                  ? "Fermer le menu"
                  : "Ouvrir le menu"
              }
              aria-expanded={builderMobileMenuOpen}
            >
              {builderMobileMenuOpen ? "✕" : "☰"}
            </button>

            <div className="hidden items-center gap-4 md:flex">
              <div className="hidden text-right xl:block">
                <p className="text-xs text-slate-500">
                  Connecté avec
                </p>

                <p className="text-sm font-medium">
                  {userEmail}
                </p>
              </div>

              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-blue-500"
              >
                ← Dashboard
              </button>

              <button
                type="button"
                onClick={createNewSite}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-blue-500"
              >
                + Nouveau site
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {builderMobileMenuOpen && (
            <div className="mt-4 border-t border-slate-800 pt-4 md:hidden">
              {userEmail && (
                <div className="mb-3 rounded-xl bg-slate-900 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Connecté avec
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-200">
                    {userEmail}
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBuilderMobileMenuOpen(false);
                    returnToDashboard();
                  }}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left text-sm font-semibold hover:border-blue-500"
                >
                  ← Dashboard
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBuilderMobileMenuOpen(false);
                    createNewSite();
                  }}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left text-sm font-semibold hover:border-blue-500"
                >
                  + Nouveau site
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBuilderMobileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full rounded-xl border border-red-900 px-4 py-3 text-left text-sm font-semibold text-red-400 hover:bg-red-950"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <nav aria-label="Outils du builder" className="hidden shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-5 py-3 md:flex">
        {([
          ["apercu", "Aperçu"], ["infos", "Infos"], ["contenu", "Contenu"],
          ["apparence", "Apparence"], ["ia", "Assistant IA"], ["sites", "Mes sites"],
          ["publication", "Sauvegarder / Publier"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" disabled={!site && !["infos", "sites"].includes(value)}
            aria-pressed={activeDesktopPanel === value}
            onClick={() => { setDesktopPanel(value); setEditorCollapsed(false); }}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-30 ${activeDesktopPanel === value ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </nav>
      <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!draft.canUndo || busy} onClick={draft.undo} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-30">↶ Annuler</button>
          <button type="button" disabled={!draft.canRedo || busy} onClick={draft.redo} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-30">↷ Rétablir</button>
          {site && <button type="button" aria-pressed={previewEditing} onClick={() => setPreviewEditing(value => !value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${previewEditing ? "border-blue-400 bg-blue-500/10 text-blue-200" : "border-slate-700"}`}>{previewEditing ? "Modifier en cliquant : actif" : "Modifier en cliquant"}</button>}
          <p role="status" className="text-xs text-slate-400">{draft.status === "saved" ? "Brouillon enregistré sur cet appareil" : draft.status === "saving" ? "Enregistrement du brouillon…" : draft.status === "error" ? "Brouillon non enregistré : stockage indisponible" : "Brouillon local · publication manuelle"}</p>
        </div>
        {draft.status === "error" && <button type="button" onClick={draft.retrySave} className="mt-2 text-xs text-blue-300 underline">Réessayer la sauvegarde locale</button>}
        {draft.restoredDraft && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-blue-800 bg-blue-950/30 p-3 text-sm">
          <p>Un brouillon a été retrouvé sur cet appareil.</p>
          <button type="button" disabled={busy} onClick={draft.restoreDraft} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold">Reprendre</button>
          <button type="button" disabled={busy} onClick={draft.discardDraft} className="rounded-lg border border-slate-700 px-3 py-2">Garder cette version</button>
        </div>}
      </div>
      <div className="px-4 pt-5 md:hidden">
        <nav aria-label="Étapes de création du site" className="grid grid-cols-5 gap-1">
          {mobileSteps.map((label, index) => (
            <button key={label} type="button" aria-current={mobileStep === index ? "step" : undefined}
              disabled={index > 0 && !site} onClick={() => navigateMobileStep(index)}
              className={`min-h-14 min-w-0 rounded-xl px-1 py-2 text-[10px] font-bold disabled:opacity-35 ${mobileStep === index ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-300"}`}>
              <span className="mb-1 block text-sm">{index + 1}</span>{label}
            </button>
          ))}
        </nav>
        <h1 ref={mobileHeadingRef} tabIndex={-1} className="mt-5 scroll-mt-4 text-2xl font-bold outline-none">
          {mobileSteps[mobileStep]}
        </h1>
        <p className="mt-2 text-sm text-slate-400" aria-live="polite">
          Étape {mobileStep + 1} sur 5 · {[
            "Renseigne ton entreprise, puis crée ou ouvre un site.",
            "Modifie tes textes et tes images, ou demande de l’aide à l’IA.",
            "Personnalise le style, les couleurs et la mise en page.",
            "Parcours ton site avant de le publier.",
            "Enregistre tes modifications, puis publie ton site.",
          ][mobileStep]}
        </p>
      </div>
      <style>{`
        [data-builder-editor] { container: siteai-editor / inline-size; min-width: 0; }
        [data-builder-editor] input,
        [data-builder-editor] textarea,
        [data-builder-editor] select { min-width: 0; max-width: 100%; }
        [data-builder-editor] .grid > *,
        [data-builder-editor] .flex > * { min-width: 0; }
        [data-builder-editor] p,
        [data-builder-editor] button,
        [data-builder-editor] label { overflow-wrap: anywhere; }
        /* Controls follow their panel width, not the width of the desktop. */
        @container siteai-editor (max-width: 420px) {
          [data-builder-editor] [class~="sm:flex-row"] {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          [data-builder-editor] [class~="sm:grid-cols-2"],
          [data-builder-editor] [class~="sm:grid-cols-3"],
          [data-builder-editor] [class~="md:grid-cols-2"] {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }

        @media (width >= 48rem) {
          [data-siteai-builder] { height: 100dvh; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
          [data-siteai-builder] > header { flex-shrink: 0; }
          [data-siteai-builder] > header > div { max-width: none; padding-top: .65rem; padding-bottom: .65rem; }
          [data-builder-section] { width: 100%; max-width: none; flex: 1; min-height: 0; padding: 1rem; }
          [data-builder-section] > [data-mobile-hide] { display: none; }
          [data-builder-grid] { height: 100%; min-height: 0; grid-template-columns: 320px minmax(0, 1fr); gap: 1rem; }
          [data-builder-editor] { display: block; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding-right: .25rem; }
          [data-builder-editor] > * { display: none; margin: 0; }
          [data-desktop-panel="infos"] form[data-mobile-panel="infos"],
          [data-desktop-panel="sites"] [data-desktop-sites],
          [data-desktop-panel="ia"] [data-desktop-ai],
          [data-desktop-panel="publication"] [data-mobile-panel="publication"],
          [data-desktop-panel="contenu"] [data-mobile-manual],
          [data-desktop-panel="apparence"] [data-mobile-manual] { display: block; padding: 1.25rem; border-radius: 1rem; }
          [data-mobile-manual] > div:first-child { display: none; }
          [data-mobile-fields] { margin-top: 0; }
          [data-desktop-save] { display: none; }
          [data-desktop-panel="contenu"] [data-mobile-appearance] { display: none; }
          [data-desktop-panel="apparence"] [data-mobile-fields] > :not([data-mobile-appearance]) { display: none; }
          [data-desktop-panel="apparence"] [data-mobile-appearance] { border: 0; padding: 0; margin: 0; }
          [data-desktop-panel="apercu"] [data-builder-grid] { grid-template-columns: minmax(0, 1fr); }
          [data-desktop-panel="apercu"] [data-builder-editor] { display: none; }
          [data-desktop-preview] { position: static; align-self: stretch; min-height: 0; overflow: auto; border-radius: 1rem; scrollbar-width: thin; }
          [data-desktop-preview] > div:first-child { position: sticky; top: 0; z-index: 10; background: #0b1222; padding: .75rem 1rem; }
          [data-desktop-preview] > div:first-child > div { flex-direction: row; flex-wrap: wrap; }
          [data-desktop-preview] > div:first-child > div > div:first-child { display: none; }
          [data-desktop-preview] > div:first-child > div > div:last-child > button:first-child { display: none; }
          [data-desktop-preview] > div:nth-child(2) { padding: .75rem; }
          [data-desktop-preview] > div:nth-child(2) > p { display: none; }
        }

        @media (width < 48rem) {
          [data-siteai-builder] [data-mobile-hide] { display: none !important; }
          [data-builder-section] { padding-top: 1rem; padding-bottom: calc(7rem + env(safe-area-inset-bottom)); }
          [data-builder-grid] { display: block; }
          [data-mobile-step="3"] [data-builder-section] { display: none; }
          [data-builder-editor] { display: block !important; }
          [data-mobile-panel], [data-mobile-manual] { display: none; }
          [data-mobile-step="0"] [data-mobile-panel="infos"],
          [data-mobile-step="1"] [data-mobile-panel="contenu"],
          [data-mobile-step="4"] [data-mobile-panel="publication"],
          [data-mobile-step="1"] [data-mobile-manual],
          [data-mobile-step="2"] [data-mobile-manual] { display: block; margin-top: 0; margin-bottom: 1.5rem; padding: 1.25rem; }
          [data-mobile-manual] > div:first-child { display: none; }
          [data-mobile-fields] { margin-top: 0; }
          [data-mobile-step="1"] [data-mobile-appearance] { display: none; }
          [data-mobile-step="2"] [data-mobile-fields] > :not([data-mobile-appearance]) { display: none; }
          [data-mobile-step="2"] [data-mobile-appearance] { border: 0; padding-top: 0; margin-top: 0; }
        }
      `}</style>
      <section data-builder-section className="mx-auto max-w-[1800px] px-4 py-7 sm:py-10 lg:px-6 lg:py-14">
        <div data-mobile-hide className="mb-8 text-center sm:mb-12">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-blue-400">
            SiteAI
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
            Crée ton site professionnel

            <span className="block text-blue-500">
              avec l&apos;IA
            </span>
          </h1>
        </div>

        <div data-builder-grid
          className={`grid gap-6 ${
            editorCollapsed
              ? "grid-cols-1"
              : "xl:grid-cols-[360px_minmax(0,1fr)]"
          }`}
        >
          <fieldset disabled={busy} data-builder-editor
            className={
              editorCollapsed
                ? "hidden"
                : "space-y-8"
            }
          >
            <form data-mobile-panel="infos"
              onSubmit={
                handleSubmit
              }
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7"
            >
              <h2 className="text-2xl font-bold">
                Ton entreprise
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Présente ton activité avec tes propres mots. L’IA utilisera ces informations pour préparer ton site.
              </p>

              <div className="mt-7 space-y-5">
                <div>
                  <label htmlFor="business-name" className="mb-2 block text-sm text-slate-400">
                    Nom de l&apos;entreprise
                  </label>

                  <input
                    id="business-name" value={
                      businessName
                    }
                    onChange={(
                      event,
                    ) =>
                      setBusinessName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Dupont Plomberie"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="business-activity" className="mb-2 block text-sm text-slate-400">
                    Activité
                  </label>

                  <input
                    id="business-activity" list="activity-examples" value={activity}
                    onChange={(
                      event,
                    ) =>
                      setActivity(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Plombier"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <datalist id="activity-examples">
                  {activityExamples.map(example => <option key={example.label} value={example.label} />)}
                </datalist>

                <div>
                  <label htmlFor="business-city" className="mb-2 block text-sm text-slate-400">
                    Ville
                  </label>

                  <input
                    id="business-city" value={city}
                    onChange={(
                      event,
                    ) =>
                      setCity(
                        event.target
                          .value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="business-phone" className="mb-2 block text-sm text-slate-400">
                    Téléphone
                  </label>

                  <input
                    id="business-phone" type="tel" autoComplete="tel" value={phone}
                    onChange={(
                      event,
                    ) =>
                      setPhone(
                        event.target
                          .value,
                      )
                    }
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="business-services" className="mb-2 block text-sm text-slate-400">
                    Services
                  </label>

                  <textarea
                    id="business-services" aria-describedby="services-help" value={services}
                    onChange={(
                      event,
                    ) =>
                      setServices(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Décris tes prestations, une par ligne"
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div id="services-help" className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <p className="text-xs leading-5 text-slate-400">Une prestation par ligne, ou séparée par une virgule. Précise ce que tu proposes réellement à tes clients.</p>
                  {suggestedActivity && <>
                    <p className="mt-3 text-sm font-semibold">Idées de prestations</p>
                    <p className="mt-1 text-xs text-slate-400">Clique uniquement sur celles que tu proposes.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestedActivity.services.map(suggestion => {
                        const added = selectedServices.includes(normalizeActivity(suggestion));
                        return <button key={suggestion} type="button" disabled={added || loading}
                          onClick={() => setServices(current => appendService(current, suggestion))}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-left text-xs text-blue-200 hover:border-blue-400 disabled:border-emerald-900 disabled:text-emerald-300">
                          {added ? "✓ " : "+ "}{suggestion}
                        </button>;
                      })}
                    </div>
                  </>}
                  <p role="status" className="mt-3 text-xs text-slate-400">{selectedServices.length} prestation{selectedServices.length > 1 ? "s" : ""} renseignée{selectedServices.length > 1 ? "s" : ""}</p>
                </div>

                <div>
                  <p className="mb-2 text-sm text-slate-400">
                    Style
                  </p>

                  <StylePicker value={designStyle} onChange={selectDesignStyle} disabled={loading || editLoading || saving || publishing} />
                </div>

                <div>
                  <p className="mb-3 text-sm text-slate-400">
                    Couleur
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {colors.map(
                      (color) => (
                        <button
                          key={
                            color.value
                          }
                          type="button"
                          title={
                            color.name
                          }
                          onClick={() =>
                            setAccentColor(
                              color.value,
                            )
                          }
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                          className={`h-9 w-9 rounded-full border-2 ${
                            accentColor ===
                            color.value
                              ? "border-white"
                              : "border-transparent"
                          }`}
                        />
                      ),
                    )}

                    <input
                      type="color"
                      value={
                        accentColor
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccentColor(
                          event.target
                            .value,
                        )
                      }
                      title="Couleur personnalisée"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                  className="w-full rounded-xl px-6 py-4 font-bold disabled:opacity-50"
                >
                  {loading
                    ? "Création..."
                    : "Créer avec l'IA"}
                </button>

                {error && (
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                )}
              </div>
            </form>

            {site && (
              <div data-mobile-manual className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      ✍️ Éditeur manuel
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Modifie directement le contenu puis enregistre.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setManualEditorOpen(
                        (open) =>
                          !open,
                      )
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                  >
                    {manualEditorOpen
                      ? "Fermer"
                      : "Ouvrir"}
                  </button>
                </div>

                {(manualEditorOpen || isMobileBuilder || activeDesktopPanel === "contenu" || activeDesktopPanel === "apparence") && (
                  <div data-mobile-fields className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
                          {site.logoUrl ? (
                            <img
                              src={site.logoUrl}
                              alt={`Logo ${site.businessName}`}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="px-2 text-center text-xs text-slate-500">
                              Aucun logo
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-bold">
                            Logo de l&apos;entreprise
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            JPG, PNG, WebP ou AVIF • 5 Mo maximum.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <label data-builder-edit="logoUrl" tabIndex={-1} className="cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500">
                              {logoUploading
                                ? "Envoi..."
                                : site.logoUrl
                                  ? "Remplacer le logo"
                                  : "Ajouter un logo"}

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                disabled={logoUploading}
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>

                            {site.logoUrl && (
                              <button
                                type="button"
                                onClick={removeLogo}
                                disabled={logoUploading}
                                className="rounded-xl border border-red-900 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                              >
                                Retirer le logo
                              </button>
                            )}
                          </div>

                          {logoError && (
                            <p className="mt-3 text-sm text-red-400">
                              {logoError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <p className="font-bold">
                        Image de couverture
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Grande photo affichée derrière le titre principal du site.
                      </p>

                      {site.heroImageUrl && (
                        <img
                          src={site.heroImageUrl}
                          alt="Image de couverture"
                          className="mt-4 h-48 w-full rounded-2xl object-cover"
                        />
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <label data-builder-edit="heroImageUrl" tabIndex={-1} className="cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500">
                          {heroImageUploading
                            ? "Envoi..."
                            : site.heroImageUrl
                              ? "Remplacer l'image"
                              : "Ajouter une image"}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            disabled={heroImageUploading}
                            onChange={handleHeroImageUpload}
                            className="hidden"
                          />
                        </label>

                        {site.heroImageUrl && (
                          <button
                            type="button"
                            onClick={removeHeroImage}
                            disabled={heroImageUploading}
                            className="rounded-xl border border-red-900 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                          >
                            Retirer l&apos;image
                          </button>
                        )}
                      </div>

                      {heroImageError && (
                        <p className="mt-3 text-sm text-red-400">
                          {heroImageError}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            Galerie photos
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Ajoute jusqu&apos;à {MAX_GALLERY_IMAGES} photos. Tu peux ensuite changer leur ordre.
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                          {(site.gallery ?? []).length}/{MAX_GALLERY_IMAGES}
                        </span>
                      </div>

                      {(site.gallery ?? []).length > 0 && (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          {(site.gallery ?? []).map(
                            (
                              imageUrl,
                              index,
                            ) => (
                              <div
                                key={`${imageUrl}-${index}`}
                                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Photo ${index + 1} de ${site.businessName}`}
                                  className="h-36 w-full object-cover"
                                />

                                <div className="flex items-center justify-between gap-2 p-3">
                                  <div className="flex min-w-0 flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={index === 0 || galleryUploading}
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          "left",
                                        )
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                                    >
                                      ←
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        index ===
                                          (site.gallery ?? []).length -
                                            1 ||
                                        galleryUploading
                                      }
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          "right",
                                        )
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                                    >
                                      →
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      galleryRemovingIndex ===
                                        index ||
                                      galleryUploading
                                    }
                                    onClick={() =>
                                      removeGalleryImage(
                                        index,
                                      )
                                    }
                                    className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-40"
                                  >
                                    {galleryRemovingIndex ===
                                    index
                                      ? "Suppression..."
                                      : "Supprimer"}
                                  </button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      <div className="mt-5">
                        <label data-builder-edit="gallery" tabIndex={-1}
                          className={`inline-block rounded-xl px-4 py-3 text-sm font-bold ${
                            galleryUploading ||
                            (site.gallery ?? []).length >=
                              MAX_GALLERY_IMAGES
                              ? "cursor-not-allowed bg-slate-700 text-slate-400"
                              : "cursor-pointer bg-blue-600 hover:bg-blue-500"
                          }`}
                        >
                          {galleryUploading
                            ? "Envoi des photos..."
                            : "Ajouter des photos"}

                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            disabled={
                              galleryUploading ||
                              (site.gallery ?? []).length >=
                                MAX_GALLERY_IMAGES
                            }
                            onChange={handleGalleryUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {galleryError && (
                        <p className="mt-3 text-sm text-red-400">
                          {galleryError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Nom affiché
                      </label>

                      <input data-builder-edit="businessName"
                        value={
                          site.businessName
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "businessName",
                            event.target
                              .value,
                          )
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
                          value={
                            activity
                          }
                          onChange={(
                            event,
                          ) => {
                            setActivity(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
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
                          onChange={(
                            event,
                          ) => {
                            setCity(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Téléphone
                      </label>

                      <input data-builder-edit="phone"
                        value={
                          site.phone
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "phone",
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Grand titre
                      </label>

                      <textarea data-builder-edit="heroTitle"
                        value={
                          site.heroTitle
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "heroTitle",
                            event.target
                              .value,
                          )
                        }
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Texte d&apos;accueil
                      </label>

                      <textarea data-builder-edit="heroText"
                        value={
                          site.heroText
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "heroText",
                            event.target
                              .value,
                          )
                        }
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer text-sm font-semibold">Référencement Google</summary><div className="mt-4">
                      <p className="font-bold">
                        SEO Google
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Ces textes sont utilisés pour le titre et la description Google du site public.
                      </p>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-slate-400">
                          Titre SEO
                        </label>

                        <input
                          value={
                            site.metaTitle
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSiteField(
                              "metaTitle",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {
                            site.metaTitle
                              .length
                          }{" "}
                          caractères
                        </p>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-slate-400">
                          Description SEO
                        </label>

                        <textarea
                          value={
                            site.metaDescription
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSiteField(
                              "metaDescription",
                              event.target
                                .value,
                            )
                          }
                          rows={4}
                          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {
                            site.metaDescription
                              .length
                          }{" "}
                          caractères
                        </p>
                      </div>
                    </div></details>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">Zone, horaires et avis clients</summary>
                      <div className="mt-4 space-y-5">
                        <div>
                          <label className="mb-2 block text-sm text-slate-400">Zone d’intervention ou adresse</label>
                          <input value={site.serviceArea ?? ""} onChange={(event) => updateSiteField("serviceArea", event.target.value)} placeholder={`Exemple : ${city} et 30 km autour`} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm text-slate-400">Horaires</label>
                          <input value={site.openingHours ?? ""} onChange={(event) => updateSiteField("openingHours", event.target.value)} placeholder="Exemple : lundi au vendredi, 8 h – 18 h" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500" />
                        </div>
                        <div className="border-t border-slate-800 pt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="font-bold">Avis clients</p><p className="mt-1 text-xs leading-5 text-slate-500">Ajoute uniquement des avis réels, avec l’accord du client.</p></div>
                            <button type="button" onClick={addTestimonial} disabled={(site.testimonials?.length ?? 0) >= 6} className="rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-40">+ Ajouter</button>
                          </div>
                          <div className="mt-4 space-y-4">
                            {(site.testimonials ?? []).map((item, index) => (
                              <div key={index} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <input value={item.name} onChange={(event) => updateTestimonial(index, "name", event.target.value)} placeholder="Nom du client" maxLength={100} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                                  <input value={item.role ?? ""} onChange={(event) => updateTestimonial(index, "role", event.target.value)} placeholder="Projet ou ville (facultatif)" maxLength={100} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                                </div>
                                <textarea value={item.text} onChange={(event) => updateTestimonial(index, "text", event.target.value)} placeholder="Texte de l’avis" rows={3} maxLength={600} className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <select value={item.rating ?? 5} onChange={(event) => updateTestimonial(index, "rating", Number(event.target.value))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value={5}>5 étoiles</option><option value={4}>4 étoiles</option><option value={3}>3 étoiles</option></select>
                                  <button type="button" onClick={() => removeTestimonial(index)} className="text-xs font-bold text-red-400">Supprimer</button>
                                </div>
                              </div>
                            ))}
                            {(site.testimonials?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">Aucun avis ajouté.</p>}
                          </div>
                        </div>
                      </div>
                    </details>

                    <details className="rounded-xl border border-slate-700 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">Informations client — Agence</summary>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <input value={site.clientName ?? ""} onChange={(event) => updateSiteField("clientName", event.target.value)} placeholder="Nom du client" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm" />
                        <input type="email" value={site.clientEmail ?? ""} onChange={(event) => updateSiteField("clientEmail", event.target.value)} placeholder="Email du client" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm" />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">Ces informations restent privées et servent à organiser les sites clients dans le tableau de bord.</p>
                    </details>

                    <details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer text-sm font-semibold">Ordre et visibilité des sections</summary><div className="mt-4">
                      <div>
                        <p className="font-bold">
                          Ordre des blocs du site
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Déplace ou masque les grandes parties du site. L&apos;aperçu se met à jour immédiatement.
                        </p>
                      </div>

                      <div className="mt-5 space-y-3">
                        {normalizeLayoutOrder(
                          site.layoutOrder,
                        ).map(
                          (
                            block,
                            index,
                            order,
                          ) => {
                            const hidden =
                              normalizeHiddenBlocks(
                                site.hiddenBlocks,
                              ).includes(
                                block,
                              );

                            return (
                              <div
                                key={
                                  block
                                }
                                className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                                  hidden
                                    ? "border-slate-800 bg-slate-950/40 opacity-60"
                                    : "border-slate-700 bg-slate-950"
                                }`}
                              >
                                <div>
                                  <p className="text-sm font-bold text-slate-200">
                                    {
                                      layoutBlockLabels[
                                        block
                                      ]
                                    }
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
                                    disabled={
                                      index ===
                                      0
                                    }
                                    onClick={() =>
                                      moveLayoutBlock(
                                        block,
                                        "up",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-30"
                                  >
                                    ↑ Monter
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      order.length -
                                        1
                                    }
                                    onClick={() =>
                                      moveLayoutBlock(
                                        block,
                                        "down",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-30"
                                  >
                                    ↓ Descendre
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleLayoutBlock(
                                        block,
                                      )
                                    }
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                      hidden
                                        ? "border-emerald-800 text-emerald-400"
                                        : "border-amber-800 text-amber-300"
                                    }`}
                                  >
                                    {hidden
                                      ? "Afficher"
                                      : "Masquer"}
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div></details>

                    <div className="border-t border-slate-800 pt-6">
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            Sections / services
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Tu peux modifier, supprimer, ajouter ou déplacer les blocs.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            addSection
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"
                        >
                          + Ajouter
                        </button>
                      </div>

                      <div className="mt-5 space-y-5">
                        {site.sections.map(
                          (
                            section,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className={`rounded-2xl border border-slate-800 bg-slate-950 p-4 ${
                                section.hidden
                                  ? "opacity-55"
                                  : ""
                              }`}
                            >
                              <div className="mb-4 flex min-w-0 flex-col items-stretch gap-3">
                                <p className="text-sm font-bold text-slate-300">
                                  Section{" "}
                                  {
                                    index +
                                    1
                                  }
                                </p>

                                <div className="flex min-w-0 flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      0
                                    }
                                    onClick={() =>
                                      moveSection(
                                        index,
                                        "up",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      site
                                        .sections
                                        .length -
                                        1
                                    }
                                    onClick={() =>
                                      moveSection(
                                        index,
                                        "down",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSectionVisibility(
                                        index,
                                      )
                                    }
                                    className={`rounded-lg border px-2 py-1 text-xs ${
                                      section.hidden
                                        ? "border-emerald-900 text-emerald-400"
                                        : "border-amber-900 text-amber-300"
                                    }`}
                                  >
                                    {section.hidden
                                      ? "Afficher"
                                      : "Masquer"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSection(
                                        index,
                                      )
                                    }
                                    className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>

                              <input data-builder-edit={`section-${index}`}
                                value={
                                  section.title
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateSection(
                                    index,
                                    "title",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Titre"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                              />

                              <textarea
                                value={
                                  section.text
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateSection(
                                    index,
                                    "text",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Texte"
                                rows={4}
                                className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                              />

                              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">
                                      Photo du service
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      Utilise automatiquement une photo de la galerie, importe une photo précise ou affiche le service sans image.
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      [
                                        [
                                          "auto",
                                          "Automatique",
                                        ],
                                        [
                                          "custom",
                                          "Ma photo",
                                        ],
                                        [
                                          "none",
                                          "Aucune",
                                        ],
                                      ] as const
                                    ).map(
                                      ([
                                        mode,
                                        label,
                                      ]) => (
                                        <button
                                          key={
                                            mode
                                          }
                                          type="button"
                                          onClick={() =>
                                            updateSection(
                                              index,
                                              "imageMode",
                                              mode,
                                            )
                                          }
                                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                            normalizeImageMode(
                                              section.imageMode,
                                            ) ===
                                            mode
                                              ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                              : "border-slate-700 text-slate-400 hover:border-slate-500"
                                          }`}
                                        >
                                          {
                                            label
                                          }
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {normalizeImageMode(
                                  section.imageMode,
                                ) ===
                                  "auto" && (
                                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400">
                                    {site.gallery?.length
                                      ? `✨ SiteAI utilisera automatiquement une photo de ta galerie pour ce service.`
                                      : "✨ Ajoute des photos dans Réalisations pour que SiteAI puisse en utiliser automatiquement ici."}
                                  </div>
                                )}

                                {normalizeImageMode(
                                  section.imageMode,
                                ) ===
                                  "custom" && (
                                  <div className="mt-4">
                                    {section.imageUrl?.trim() ? (
                                      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                                        <img
                                          src={
                                            section.imageUrl
                                          }
                                          alt={`Photo ${section.title}`}
                                          className="h-44 w-full object-cover"
                                        />

                                        <div className="flex flex-wrap gap-2 p-3">
                                          <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500">
                                            {serviceImageUploadingIndex ===
                                            index
                                              ? "Envoi..."
                                              : "Remplacer"}

                                            <input
                                              type="file"
                                              accept="image/jpeg,image/png,image/webp,image/avif"
                                              disabled={
                                                serviceImageUploadingIndex !==
                                                null
                                              }
                                              onChange={(
                                                event,
                                              ) =>
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
                                              serviceImageUploadingIndex !==
                                              null
                                            }
                                            onClick={() =>
                                              removeServiceImage(
                                                index,
                                              )
                                            }
                                            className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                                          >
                                            Retirer
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-7 text-center text-sm font-bold text-slate-300 transition hover:border-blue-500 hover:text-blue-300">
                                        {serviceImageUploadingIndex ===
                                        index
                                          ? "Envoi de la photo..."
                                          : "📷 Ajouter une photo pour ce service"}

                                        <input
                                          type="file"
                                          accept="image/jpeg,image/png,image/webp,image/avif"
                                          disabled={
                                            serviceImageUploadingIndex !==
                                            null
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            handleServiceImageUpload(
                                              index,
                                              event,
                                            )
                                          }
                                          className="hidden"
                                        />
                                      </label>
                                    )}

                                    {serviceImageErrorIndex ===
                                      index &&
                                      serviceImageError && (
                                        <p className="mt-3 text-xs text-red-400">
                                          {
                                            serviceImageError
                                          }
                                        </p>
                                      )}
                                  </div>
                                )}

                                {normalizeImageMode(
                                  section.imageMode,
                                ) ===
                                  "none" && (
                                  <p className="mt-4 text-xs text-slate-500">
                                    Cette carte sera affichée sans photo.
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">
                                      Icône du service
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      Laisse SiteAI choisir automatiquement, sélectionne ton icône ou masque-la.
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      [
                                        [
                                          "auto",
                                          "Automatique",
                                        ],
                                        [
                                          "custom",
                                          "Choisir",
                                        ],
                                        [
                                          "none",
                                          "Aucune",
                                        ],
                                      ] as const
                                    ).map(
                                      ([
                                        mode,
                                        label,
                                      ]) => (
                                        <button
                                          key={
                                            mode
                                          }
                                          type="button"
                                          onClick={() => {
                                            updateSection(
                                              index,
                                              "iconMode",
                                              mode,
                                            );

                                            if (
                                              mode ===
                                                "custom" &&
                                              !section.icon?.trim()
                                            ) {
                                              updateSection(
                                                index,
                                                "icon",
                                                "✨",
                                              );
                                            }
                                          }}
                                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                            normalizeIconMode(
                                              section.iconMode,
                                            ) ===
                                            mode
                                              ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                              : "border-slate-700 text-slate-400 hover:border-slate-500"
                                          }`}
                                        >
                                          {
                                            label
                                          }
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {normalizeIconMode(
                                  section.iconMode,
                                ) ===
                                  "custom" && (
                                  <div className="mt-4">
                                    <div className="flex flex-wrap gap-2">
                                      {serviceIconOptions.map(
                                        (
                                          icon,
                                        ) => (
                                          <button
                                            key={
                                              icon
                                            }
                                            type="button"
                                            onClick={() =>
                                              updateSection(
                                                index,
                                                "icon",
                                                icon,
                                              )
                                            }
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition ${
                                              section.icon ===
                                              icon
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-slate-700 bg-slate-950 hover:border-slate-500"
                                            }`}
                                            title={`Utiliser ${icon}`}
                                          >
                                            {
                                              icon
                                            }
                                          </button>
                                        ),
                                      )}
                                    </div>

                                    <div className="mt-4 flex items-center gap-3">
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-2xl">
                                        {section.icon?.trim() ||
                                          "✨"}
                                      </div>

                                      <input
                                        value={
                                          section.icon ??
                                          ""
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          updateSection(
                                            index,
                                            "icon",
                                            event.target.value.slice(
                                              0,
                                              12,
                                            ),
                                          )
                                        }
                                        placeholder="Ou colle ton emoji : 🔧"
                                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                )}

                                {normalizeIconMode(
                                  section.iconMode,
                                ) ===
                                  "auto" && (
                                  <p className="mt-4 text-xs text-emerald-400">
                                    ✨ SiteAI choisira l&apos;icône selon le métier et la position du service.
                                  </p>
                                )}

                                {normalizeIconMode(
                                  section.iconMode,
                                ) ===
                                  "none" && (
                                  <p className="mt-4 text-xs text-slate-500">
                                    Cette carte sera affichée sans icône.
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div data-mobile-appearance className="border-t border-slate-800 pt-6">
                      <p className="mb-3 font-bold">
                        Apparence
                      </p>

                      <StylePicker value={designStyle} onChange={selectDesignStyle} disabled={loading || editLoading || saving || publishing} />

                      <div className="mt-4 flex flex-wrap gap-3">
                        {colors.map(
                          (color) => (
                            <button
                              key={
                                color.value
                              }
                              type="button"
                              title={
                                color.name
                              }
                              onClick={() => {
                                setAccentColor(
                                  color.value,
                                );
                                setSaveMessage(
                                  "",
                                );
                              }}
                              style={{
                                backgroundColor:
                                  color.value,
                              }}
                              className={`h-9 w-9 rounded-full border-2 ${
                                accentColor ===
                                color.value
                                  ? "border-white"
                                  : "border-transparent"
                              }`}
                            />
                          ),
                        )}

                        <input
                          type="color"
                          value={
                            accentColor
                          }
                          onChange={(
                            event,
                          ) => {
                            setAccentColor(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
                          }}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                        />
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div><p className="text-sm font-bold">Couleurs conseillées</p><p className="mt-1 text-xs text-slate-500">Choisis une couleur cohérente ou laisse SiteAI lire ton logo.</p></div>
                          <button type="button" onClick={suggestAccentFromLogo} disabled={!site.logoUrl} className="rounded-lg border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 disabled:opacity-40">✨ Depuis mon logo</button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {smartPalettes.map((palette) => <div key={palette.name} className="flex items-center justify-between gap-4"><span className="text-xs text-slate-400">{palette.name}</span><div className="flex gap-2">{palette.colors.map((color) => <button key={color} type="button" title={`${palette.name} : ${color}`} onClick={() => { setAccentColor(color); setSaveMessage(""); }} style={{backgroundColor: color}} className={`h-7 w-7 rounded-full border-2 ${accentColor === color ? "border-white" : "border-transparent"}`} />)}</div></div>)}
                        </div>
                      </div>

                      <details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer text-sm font-semibold">Plus d’options de design</summary><div className="mt-4">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold">
                              Design avancé
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Personnalise le rendu sans toucher au contenu.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateSiteField(
                                "designSettings",
                                {
                                  ...defaultDesignSettings,
                                },
                              )
                            }
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500"
                          >
                            Réinitialiser
                          </button>
                        </div>

                        <div className="mt-5 space-y-5">
                          <div>
                            <label className="mb-2 block text-sm text-slate-400">
                              Police
                            </label>
                            <select
                              value={
                                normalizeDesignSettings(
                                  site.designSettings,
                                ).font
                              }
                              onChange={(event) =>
                                updateDesignSetting(
                                  "font",
                                  event.target.value as DesignSettings["font"],
                                )
                              }
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="system">Système</option>
                              <option value="modern">Moderne</option>
                              <option value="classic">Classique</option>
                              <option value="editorial">Éditorial</option>
                              <option value="mono">Monospace</option>
                            </select>
                          </div>

                          <div>
                            <p className="mb-2 text-sm text-slate-400">
                              Boutons
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(
                                [
                                  ["square", "Carrés"],
                                  ["soft", "Arrondis"],
                                  ["pill", "Pilule"],
                                ] as const
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    updateDesignSetting(
                                      "buttonStyle",
                                      value,
                                    )
                                  }
                                  className={`border px-3 py-3 text-xs font-bold ${
                                    normalizeDesignSettings(
                                      site.designSettings,
                                    ).buttonStyle === value
                                      ? "border-blue-500 bg-blue-500/10"
                                      : "border-slate-700"
                                  } ${
                                    value === "square"
                                      ? "rounded-none"
                                      : value === "pill"
                                        ? "rounded-full"
                                        : "rounded-xl"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-sm text-slate-400">
                              Cartes
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(
                                [
                                  ["simple", "Simple"],
                                  ["bordered", "Bordée"],
                                  ["shadow", "Ombre"],
                                ] as const
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    updateDesignSetting(
                                      "cardStyle",
                                      value,
                                    )
                                  }
                                  className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                                    normalizeDesignSettings(
                                      site.designSettings,
                                    ).cardStyle === value
                                      ? "border-blue-500 bg-blue-500/10"
                                      : "border-slate-700"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm text-slate-400">
                                Taille du logo
                              </label>
                              <select
                                value={
                                  normalizeDesignSettings(
                                    site.designSettings,
                                  ).logoSize
                                }
                                onChange={(event) =>
                                  updateDesignSetting(
                                    "logoSize",
                                    event.target.value as DesignSettings["logoSize"],
                                  )
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                              >
                                <option value="small">Petit</option>
                                <option value="medium">Moyen</option>
                                <option value="large">Grand</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm text-slate-400">
                                Largeur
                              </label>
                              <select
                                value={
                                  normalizeDesignSettings(
                                    site.designSettings,
                                  ).contentWidth
                                }
                                onChange={(event) =>
                                  updateDesignSetting(
                                    "contentWidth",
                                    event.target.value as DesignSettings["contentWidth"],
                                  )
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                              >
                                <option value="normal">Normale</option>
                                <option value="wide">Large</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-sm text-slate-400">
                              Hero
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {(
                                [
                                  ["auto", "Auto"],
                                  ["left", "À gauche"],
                                  ["center", "Centré"],
                                ] as const
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    updateDesignSetting(
                                      "heroLayout",
                                      value,
                                    )
                                  }
                                  className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                                    normalizeDesignSettings(
                                      site.designSettings,
                                    ).heroLayout === value
                                      ? "border-blue-500 bg-blue-500/10"
                                      : "border-slate-700"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm text-slate-400">
                                Espacement
                              </label>
                              <select
                                value={
                                  normalizeDesignSettings(
                                    site.designSettings,
                                  ).spacing
                                }
                                onChange={(event) =>
                                  updateDesignSetting(
                                    "spacing",
                                    event.target.value as DesignSettings["spacing"],
                                  )
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                              >
                                <option value="compact">Compact</option>
                                <option value="normal">Normal</option>
                                <option value="airy">Aéré</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm text-slate-400">
                                Fond général
                              </label>
                              <select
                                value={
                                  normalizeDesignSettings(
                                    site.designSettings,
                                  ).background
                                }
                                onChange={(event) =>
                                  updateDesignSetting(
                                    "background",
                                    event.target.value as DesignSettings["background"],
                                  )
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                              >
                                <option value="auto">Selon le style</option>
                                <option value="light">Clair</option>
                                <option value="dark">Sombre</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div></details>
                    </div>

                    <button data-desktop-save data-mobile-hide
                      type="button"
                      onClick={
                        saveCurrentSite
                      }
                      disabled={saving || publishing}
                      className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500 disabled:opacity-50"
                    >
                      {saving
                        ? "Enregistrement..."
                        : openedSite?.published
                          ? "💾 Enregistrer et mettre à jour le site public"
                          : savedSiteID ===
                              null
                            ? "💾 Sauvegarder le site"
                            : openedSite?.published ? "💾 Mettre à jour le site public" : "💾 Enregistrer les modifications"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {site && (
              <div data-mobile-panel="publication" className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
                <h2 className="text-xl font-bold">
                  Sauvegarde et publication
                </h2>
                {(publishedResult || openedSite?.published) && <PublicationSuccess key={publishedResult?.publicSlug ?? openedSite?.publicSlug} publicSlug={publishedResult?.publicSlug ?? openedSite?.publicSlug ?? ""} businessName={publishedResult?.businessName ?? openedSite?.businessName ?? businessName} />}

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {openedSite?.published
                    ? "Ton site est en ligne. Enregistrer met aussi à jour sa version publique."
                    : "Enregistre ton brouillon, puis publie-le quand tu es prêt."}
                </p>
                <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">Bilan du site</h3><p className="mt-1 text-xs leading-5 text-slate-400">Ces conseils ne bloquent pas la publication.</p></div><span className={`rounded-full px-3 py-2 text-sm font-black ${(siteHealth?.score ?? 0) >= 75 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{siteHealth?.score ?? 0}/100</span></div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{width: `${siteHealth?.score ?? 0}%`}} /></div>
                  <ul className="mt-4 space-y-3 text-sm">
                    {(siteHealth?.checks ?? []).map(item => (
                      <li key={item.label} className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <span title={item.advice}><span aria-hidden="true" className={item.ready ? "text-emerald-400" : "text-amber-300"}>{item.ready ? "✓ " : "○ "}</span>{item.label}
                          <span className="sr-only">{item.ready ? " : renseigné" : " : à compléter"}</span>
                        </span>
                        {!item.ready && <button type="button" onClick={() => {
                          navigateMobileStep(1); setDesktopPanel("contenu"); setEditorCollapsed(false);
                        }} className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-blue-300 hover:bg-slate-800">Compléter</button>}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => { navigateMobileStep(3); setDesktopPanel("apercu"); }}
                    className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold hover:border-blue-500">Vérifier l’aperçu</button>
                </div>

                <button
                  type="button"
                  onClick={
                    saveCurrentSite
                  }
                  disabled={saving || publishing}
                  className="mt-5 w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500 disabled:opacity-50"
                >
                  {saving
                    ? "Sauvegarde..."
                    : savedSiteID ===
                        null
                      ? "💾 Sauvegarder"
                      : "💾 Enregistrer les modifications"}
                </button>

                {savedSiteID !==
                  null &&
                  !openedSite?.published && (
                    <button
                      type="button"
                      onClick={
                        publishCurrentSite
                      }
                      disabled={
                        publishing || saving || editLoading || loading
                      }
                      className="mt-3 w-full rounded-xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-500 disabled:opacity-50"
                    >
                      {publishing
                        ? "Enregistrement et publication..."
                        : "🚀 Enregistrer et publier"}
                    </button>
                  )}

                {openedSite?.published && (
                  <>
                    

                    <button
                      type="button"
                      onClick={
                        unpublishCurrentSite
                      }
                      disabled={
                        publishing
                      }
                      className="mt-3 w-full rounded-xl border border-red-800 px-6 py-4 font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                    >
                      Retirer de la publication
                    </button>

                    
                  </>
                )}

                {saveMessage && (
                  <p className="mt-4 text-sm text-green-400">
                    {saveMessage}
                  </p>
                )}

                {saveError && (
                  <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4">
                    <p className="text-sm leading-6 text-red-300">
                      {saveError}
                    </p>

                    {[
                      "abonnement",
                      "formule",
                      "limite",
                      "pro",
                      "agence",
                    ].some((word) =>
                      saveError
                        .toLowerCase()
                        .includes(word),
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            "/pricing",
                          )
                        }
                        className="mt-3 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500"
                      >
                        💳 Voir les formules
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {site && (
              <div data-desktop-ai data-mobile-panel="contenu" className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
                <h2 className="text-xl font-bold">
                  ✨ Modifier avec l&apos;IA
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Exemple : « rends le titre plus professionnel », « ajoute un service dépannage » ou « passe le site en vert ».
                </p>

                <div className="mt-5 space-y-3">
                  {chatMessages.map(
                    (
                      message,
                      index,
                    ) => (
                      <div
                        key={index}
                        className={`rounded-xl p-3 text-sm ${
                          message.role ===
                          "user"
                            ? "bg-blue-600"
                            : "bg-slate-800"
                        }`}
                      >
                        {
                          message.text
                        }
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["Raccourcir", "Raccourcis les textes du site en conservant les informations essentielles, les noms et les coordonnées. Ne change ni le style ni les images."],
                    ["Plus professionnel", "Rends les textes du site plus professionnels sans inventer de faits, de tarifs, de certifications ou d’avis. Conserve le style et les images."],
                    ["Simplifier", "Réécris les textes avec des mots simples et des phrases courtes, sans modifier les informations, le style ou les images."],
                    ["Ajouter une promotion", "Ajoute une promotion clairement visible dans le texte d’accueil. Laisse des emplacements [OFFRE], [PRIX] et [DATE DE FIN] à compléter et n’invente aucun tarif."],
                    ["Nouveau service", "Ajoute un nouveau service à la fin des prestations. Utilise le titre [NOM DU SERVICE] et une description courte à compléter, sans inventer de prix."],
                    ["Améliorer Google", "Améliore le titre et la description SEO pour l’activité et la ville déjà renseignées, sans ajouter de zone, certification ou promesse qui n’existe pas."],
                    ["Mettre en avant le devis", "Rends les appels à l’action plus directs afin d’encourager les demandes de devis, sans modifier les coordonnées ni inventer de délai de réponse."],
                  ].map(([label, instruction]) => <button key={label} type="button" disabled={busy} onClick={() => prepareQuickPrompt(instruction)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:border-blue-400 disabled:opacity-40">{label}</button>)}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">Choisis une suggestion, ajuste la demande si besoin, puis lance la modification.</p>
                <form
                  onSubmit={
                    handleModification
                  }
                  className="mt-5"
                >
                  <textarea id="builder-ai-instruction"
                    value={
                      editPrompt
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditPrompt(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Mets le site en vert..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={
                      editLoading
                    }
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                    className="mt-3 w-full rounded-xl px-6 py-4 font-bold disabled:opacity-50"
                  >
                    {editLoading
                      ? "Modification..."
                      : "Modifier avec l'IA"}
                  </button>

                  {editError && (
                    <p className="mt-3 text-sm text-red-400">
                      {editError}
                    </p>
                  )}
                </form>
              </div>
            )}

            <div data-desktop-sites data-mobile-panel="infos" className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  📂 Mes sites
                </h2>

                <button
                  type="button"
                  onClick={
                    loadSavedSites
                  }
                  className="text-sm text-blue-400"
                >
                  Actualiser
                </button>
              </div>

              {sitesLoading ? (
                <p className="mt-5 text-slate-400">
                  Chargement...
                </p>
              ) : savedSites.length ===
                0 ? (
                <p className="mt-5 text-slate-500">
                  Aucun site sauvegardé.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {savedSites.map(
                    (saved) => (
                      <div
                        key={
                          saved.id
                        }
                        className={`rounded-xl border p-4 ${
                          savedSiteID ===
                          saved.id
                            ? "border-blue-500 bg-slate-950"
                            : "border-slate-800 bg-slate-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">
                              {
                                saved.businessName
                              }
                            </p>

                            <p className="text-sm text-slate-400">
                              {
                                saved.activity
                              }{" "}
                              • {saved.city}
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
                          {formatDate(
                            saved.updatedAt,
                          )}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openSavedSite(
                                saved.id,
                              )
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
                          >
                            Ouvrir
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSavedSite(
                                saved.id,
                              )
                            }
                            className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400"
                          >
                            Supprimer
                          </button>
                        </div>

                        {saved.published &&
                          saved.publicSlug && (
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
                    ),
                  )}
                </div>
              )}
            </div>
          </fieldset>

          <div data-desktop-preview data-mobile-hide className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 xl:sticky xl:top-6 xl:self-start">
            {!site ? (
              <div className="flex min-h-[700px] items-center justify-center text-center">
                <div>
                  <div className="text-7xl">
                    ✨
                  </div>

                  <h2 className="mt-5 text-3xl font-bold">
                    Aperçu du site
                  </h2>

                  <p className="mt-3 text-slate-500">
                    Crée ou ouvre un site pour commencer.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-200">
                        Aperçu responsive
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Le site est rendu dans un vrai viewport pour tester les versions ordinateur, tablette et téléphone.
                      </p>
                    </div>

                    <div className="inline-flex w-fit rounded-xl border border-slate-700 bg-slate-900 p-1">
                      {(
                        [
                          [
                            "desktop",
                            "🖥️",
                            "Ordinateur",
                          ],
                          [
                            "tablet",
                            "▭",
                            "Tablette",
                          ],
                          [
                            "mobile",
                            "📱",
                            "Téléphone",
                          ],
                        ] as const
                      ).map(
                        ([
                          value,
                          icon,
                          label,
                        ]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setPreviewDevice(
                                value,
                              )
                            }
                            aria-pressed={
                              previewDevice ===
                              value
                            }
                            title={`Aperçu ${label.toLowerCase()}`}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                              previewDevice ===
                              value
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <span className="mr-1.5">
                              {icon}
                            </span>
                            <span className="hidden sm:inline">
                              {label}
                            </span>
                          </button>
                        ),
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditorCollapsed(
                            (collapsed) =>
                              !collapsed,
                          )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-500 hover:text-white"
                      >
                        {editorCollapsed
                          ? "☰ Afficher l'éditeur"
                          : "↔ Plus de place"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewFullscreenOpen(
                            true,
                          )
                        }
                        className="rounded-xl border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition hover:bg-blue-500/20 hover:text-white"
                      >
                        ⛶ Agrandir l&apos;aperçu
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 sm:p-6">
                  <ResponsiveSitePreview onEdit={previewEditing && !busy ? editFromPreview : undefined}
                    device={previewDevice}
                    site={site}
                    designStyle={designStyle}
                    accentColor={accentColor}
                    activity={activity}
                    city={city}
                  />

                  <p className="mt-3 text-center text-xs text-slate-500">
                    {
                      previewViewports[
                        previewDevice
                      ].label
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {isMobileBuilder && mobileStep === 3 && site && (
        <div className="px-2 pb-28 md:hidden">
          <button type="button" onClick={() => { setPreviewDevice("mobile"); setPreviewFullscreenOpen(true); }}
            className="mb-3 w-full rounded-xl border border-blue-500/50 px-4 py-3 font-bold text-blue-300">
            ⛶ Agrandir l&apos;aperçu
          </button>
          <ResponsiveSitePreview onEdit={previewEditing && !busy ? editFromPreview : undefined} device="mobile" site={site} designStyle={designStyle}
            accentColor={accentColor} activity={activity} city={city} />
        </div>
      )}
      <nav aria-label="Navigation entre les étapes" className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-slate-800 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <button type="button" disabled={mobileStep === 0} onClick={() => navigateMobileStep(mobileStep - 1)}
          className="min-h-11 flex-1 rounded-xl border border-slate-700 px-3 py-3 text-sm font-bold disabled:opacity-35">Précédent</button>
        {mobileStep < 4 ? (
          <button type="button" disabled={!site} onClick={() => navigateMobileStep(mobileStep + 1)}
            className="min-h-11 flex-1 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold disabled:opacity-35">
            {mobileSteps[mobileStep + 1]} →
          </button>
        ) : <span className="flex-1 text-center text-sm text-slate-400">Étape 5 sur 5</span>}
      </nav>

      {site &&
        previewFullscreenOpen && (
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu du site en grand"
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="font-bold text-white">
                  Aperçu du site en grand
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Vérifie le rendu final avant de publier. Échap ferme aussi cet aperçu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
                  {(
                    [
                      [
                        "desktop",
                        "🖥️",
                        "Ordinateur",
                      ],
                      [
                        "tablet",
                        "▭",
                        "Tablette",
                      ],
                      [
                        "mobile",
                        "📱",
                        "Téléphone",
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      icon,
                      label,
                    ]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setPreviewDevice(
                            value,
                          )
                        }
                        aria-pressed={
                          previewDevice ===
                          value
                        }
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                          previewDevice ===
                          value
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="mr-1.5">
                          {icon}
                        </span>
                        {label}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewFullscreenOpen(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  ✕ Fermer
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
              <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl sm:p-5">
                <ResponsiveSitePreview onEdit={previewEditing && !busy ? editFromPreview : undefined}
                  device={previewDevice}
                  site={site}
                  designStyle={designStyle}
                  accentColor={accentColor}
                  activity={activity}
                  city={city}
                />

                <p className="mt-3 text-center text-xs text-slate-500">
                  {
                    previewViewports[
                      previewDevice
                    ].label
                  }
                </p>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
