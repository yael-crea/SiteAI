"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SitePreview from "@/components/SitePreview";

type IconMode = "auto" | "custom" | "none";
type ImageMode = "auto" | "custom" | "none";

type LayoutBlock =
  | "about"
  | "services"
  | "process"
  | "faq"
  | "gallery"
  | "contact";

type DesignSettings = {
  font: "system" | "modern" | "classic" | "editorial" | "mono";
  buttonStyle: "square" | "soft" | "pill";
  cardStyle: "simple" | "bordered" | "shadow";
  logoSize: "small" | "medium" | "large";
  heroLayout: "auto" | "left" | "center";
  contentWidth: "normal" | "wide";
  spacing: "compact" | "normal" | "airy";
  background: "auto" | "light" | "dark";
};

type SiteSection = {
  title: string;
  text: string;
  iconMode?: IconMode;
  icon?: string;
  imageMode?: ImageMode;
  imageUrl?: string;
  hidden?: boolean;
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
};

type DesignStyle = "moderne" | "elegant" | "artisan";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type Step = 1 | 2 | 3 | 4 | 5;

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

const defaultLayoutOrder: LayoutBlock[] = [
  "about",
  "services",
  "process",
  "faq",
  "gallery",
  "contact",
];

const colors = [
  { name: "Bleu", value: "#2563eb" },
  { name: "Orange", value: "#ea580c" },
  { name: "Vert", value: "#16a34a" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rouge", value: "#dc2626" },
];

const stepLabels: Record<Step, string> = {
  1: "Infos",
  2: "Contenu",
  3: "Apparence",
  4: "Aperçu",
  5: "Publication",
};

const previewViewports: Record<
  PreviewDevice,
  { width: number; height: number; label: string }
> = {
  desktop: {
    width: 1280,
    height: 760,
    label: "Ordinateur",
  },
  tablet: {
    width: 768,
    height: 900,
    label: "Tablette",
  },
  mobile: {
    width: 390,
    height: 844,
    label: "Téléphone",
  },
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

function normalizeLayoutOrder(
  value?: LayoutBlock[],
): LayoutBlock[] {
  const result: LayoutBlock[] = [];

  for (const item of value ?? []) {
    if (
      defaultLayoutOrder.includes(item) &&
      !result.includes(item)
    ) {
      result.push(item);
    }
  }

  for (const item of defaultLayoutOrder) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }

  return result;
}

function normalizeSite(
  value: GeneratedSite,
): GeneratedSite {
  return {
    ...value,
    businessName: value.businessName ?? "",
    slug: value.slug ?? "",
    metaTitle: value.metaTitle ?? "",
    metaDescription: value.metaDescription ?? "",
    heroTitle: value.heroTitle ?? "",
    heroText: value.heroText ?? "",
    phone: value.phone ?? "",
    logoUrl: value.logoUrl ?? "",
    heroImageUrl: value.heroImageUrl ?? "",
    gallery: value.gallery ?? [],
    sections: (value.sections ?? []).map((section) => ({
      ...section,
      title: section.title ?? "",
      text: section.text ?? "",
      iconMode: section.iconMode ?? "auto",
      imageMode: section.imageMode ?? "auto",
      imageUrl: section.imageUrl ?? "",
      hidden: section.hidden ?? false,
    })),
    layoutOrder: normalizeLayoutOrder(value.layoutOrder),
    hiddenBlocks: value.hiddenBlocks ?? [],
    designSettings: normalizeDesignSettings(
      value.designSettings,
    ),
  };
}

type ResponsivePreviewProps = {
  device: PreviewDevice;
  site: GeneratedSite;
  designStyle: DesignStyle;
  accentColor: string;
  activity: string;
  city: string;
};

function ResponsiveSitePreview({
  device,
  site,
  designStyle,
  accentColor,
  activity,
  city,
}: ResponsivePreviewProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);
  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);
  const [portalRoot, setPortalRoot] =
    useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);

  const viewport = previewViewports[device];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function updateScale() {
      const currentContainer =
        containerRef.current;

      if (!currentContainer) {
        return;
      }

      const availableWidth = Math.max(
        1,
        currentContainer.clientWidth - 8,
      );

      setScale(
        Math.min(
          1,
          availableWidth / viewport.width,
        ),
      );
    }

    updateScale();

    if (
      typeof ResizeObserver === "undefined"
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

    const observer = new ResizeObserver(
      updateScale,
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [viewport.width]);

  function prepareIframe() {
    const frame = iframeRef.current;
    const frameDocument =
      frame?.contentDocument;

    if (!frameDocument) {
      return;
    }

    frameDocument.documentElement.lang =
      "fr";
    frameDocument.documentElement.style.background =
      "#ffffff";
    frameDocument.body.style.margin = "0";
    frameDocument.body.style.background =
      "#ffffff";
    frameDocument.body.style.minWidth = "0";

    frameDocument.head
      .querySelectorAll(
        "[data-siteai-preview-style='true']",
      )
      .forEach((node) => node.remove());

    document.head
      .querySelectorAll(
        'style, link[rel="stylesheet"]',
      )
      .forEach((node) => {
        const clone =
          node.cloneNode(true) as HTMLElement;

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


function FullscreenSitePreview({
  device,
  site,
  designStyle,
  accentColor,
  activity,
  city,
}: ResponsivePreviewProps) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(null);
  const [portalRoot, setPortalRoot] =
    useState<HTMLElement | null>(null);

  const viewport = previewViewports[device];
  const isMobile = device === "mobile";

  function prepareIframe() {
    const frame = iframeRef.current;
    const frameDocument =
      frame?.contentDocument;

    if (!frameDocument) {
      return;
    }

    frameDocument.documentElement.lang =
      "fr";
    frameDocument.documentElement.style.background =
      "#ffffff";
    frameDocument.documentElement.style.height =
      "100%";

    frameDocument.body.style.margin = "0";
    frameDocument.body.style.background =
      "#ffffff";
    frameDocument.body.style.minWidth = "0";
    frameDocument.body.style.minHeight =
      "100%";

    frameDocument.head
      .querySelectorAll(
        "[data-siteai-preview-style='true']",
      )
      .forEach((node) => node.remove());

    document.head
      .querySelectorAll(
        'style, link[rel="stylesheet"]',
      )
      .forEach((node) => {
        const clone =
          node.cloneNode(true) as HTMLElement;

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
        "siteai-fullscreen-preview-root",
      ),
    );
  }

  return (
    <div
      className={`h-full w-full ${
        isMobile
          ? "overflow-hidden bg-white"
          : "overflow-auto bg-slate-900 p-4"
      }`}
    >
      <div
        className={
          isMobile
            ? "h-full w-full"
            : "mx-auto"
        }
        style={
          isMobile
            ? undefined
            : {
                width: viewport.width,
                minWidth: viewport.width,
              }
        }
      >
        <iframe
          ref={iframeRef}
          title={`Aperçu réel ${viewport.label}`}
          srcDoc={`<!doctype html><html lang="fr"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="siteai-fullscreen-preview-root"></div></body></html>`}
          onLoad={prepareIframe}
          style={{
            width: isMobile
              ? "100%"
              : viewport.width,
            height: isMobile
              ? "100%"
              : viewport.height,
          }}
          className={
            isMobile
              ? "block h-full w-full border-0 bg-white"
              : "block border border-slate-700 bg-white shadow-2xl"
          }
        />

        {portalRoot &&
          createPortal(
            <SitePreview
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

export default function MobileBuilderPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] =
    useState(true);
  const [step, setStep] = useState<Step>(1);

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

  const [designStyle, setDesignStyle] =
    useState<DesignStyle>("moderne");
  const [accentColor, setAccentColor] =
    useState("#2563eb");

  const [site, setSite] =
    useState<GeneratedSite | null>(null);
  const [openedSite, setOpenedSite] =
    useState<SavedSite | null>(null);
  const [savedSiteID, setSavedSiteID] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [publishing, setPublishing] =
    useState(false);

  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  const [aiInstruction, setAiInstruction] =
    useState("");
  const [aiEditing, setAiEditing] =
    useState(false);

  const [previewDevice, setPreviewDevice] =
    useState<PreviewDevice>("mobile");
  const [
    previewFullscreenOpen,
    setPreviewFullscreenOpen,
  ] = useState(false);

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
          router.replace("/auth");
          return;
        }

        if (!active) {
          return;
        }

        const siteToOpen =
          sessionStorage.getItem(
            "siteai_site_to_open",
          );

        if (siteToOpen) {
          sessionStorage.removeItem(
            "siteai_site_to_open",
          );

          const id = Number(siteToOpen);

          if (
            Number.isInteger(id) &&
            id > 0
          ) {
            await openSavedSite(id);
          }
        }
      } catch (err) {
        console.error(err);
        router.replace("/auth");
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!previewFullscreenOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [previewFullscreenOpen]);

  async function getAccessToken() {
    const {
      data,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !data.session
    ) {
      await supabase.auth.signOut();
      router.replace("/auth");
      throw new Error("Session absente");
    }

    return data.session.access_token;
  }

  async function authenticatedFetch(
    path: string,
    options: RequestInit = {},
  ) {
    const token = await getAccessToken();
    const headers = new Headers(
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

    const response = await fetch(
      `/api-backend${path}`,
      {
        ...options,
        headers,
        cache: "no-store",
      },
    );

    if (response.status === 401) {
      await supabase.auth.signOut();
      router.replace("/auth");
    }

    return response;
  }

  async function openSavedSite(id: number) {
    setError("");
    setMessage("");

    const response =
      await authenticatedFetch(
        `/sites/${id}`,
      );

    if (!response.ok) {
      throw new Error(
        "Impossible d'ouvrir le site.",
      );
    }

    const saved: SavedSite =
      await response.json();

    const normalized =
      normalizeSite(saved.site);

    setOpenedSite({
      ...saved,
      site: normalized,
    });
    setSavedSiteID(saved.id);
    setSite(normalized);
    setBusinessName(saved.businessName);
    setActivity(saved.activity);
    setCity(saved.city);
    setPhone(saved.phone);
    setServices(
      normalized.sections
        .map((section) => section.title)
        .join(", "),
    );
    setDesignStyle(saved.designStyle);
    setAccentColor(saved.accentColor);
  }

  function resetForNewSite() {
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );
    setStep(1);
    setBusinessName("");
    setActivity("");
    setCity("Montpellier");
    setPhone("");
    setServices("");
    setDesignStyle("moderne");
    setAccentColor("#2563eb");
    setSite(null);
    setOpenedSite(null);
    setSavedSiteID(null);
    setAiInstruction("");
    setError("");
    setMessage("");
  }

  async function generateSite(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !businessName.trim() ||
      !activity.trim() ||
      !city.trim()
    ) {
      setError(
        "Nom, activité et ville sont obligatoires.",
      );
      return;
    }

    if (site) {
      setSite((current) =>
        current
          ? {
              ...current,
              businessName:
                businessName.trim(),
              phone: phone.trim(),
            }
          : current,
      );
      setStep(2);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    setLoading(true);

    const serviceList = services
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean);

    try {
      const response =
        await authenticatedFetch(
          "/generate",
          {
            method: "POST",
            body: JSON.stringify({
              businessName:
                businessName.trim(),
              activity:
                activity.trim(),
              city: city.trim(),
              phone: phone.trim(),
              services: serviceList,
            }),
          },
        );

      if (!response.ok) {
        const raw =
          (await response.text()).trim();

        throw new Error(
          raw ||
            "Impossible de générer le site.",
        );
      }

      const generated: GeneratedSite =
        await response.json();

      setSite(
        normalizeSite(generated),
      );
      setStep(2);
      setMessage(
        "Site généré. Tu peux maintenant ajuster le contenu.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
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

  function updateSiteField(
    key:
      | "businessName"
      | "heroTitle"
      | "heroText"
      | "metaTitle"
      | "metaDescription"
      | "phone",
    value: string,
  ) {
    setSite((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );

    if (key === "businessName") {
      setBusinessName(value);
    }

    if (key === "phone") {
      setPhone(value);
    }

    setMessage("");
  }

  function updateSection(
    index: number,
    field: "title" | "text",
    value: string,
  ) {
    setSite((current) => {
      if (!current) {
        return current;
      }

      const sections =
        current.sections.map(
          (section, currentIndex) =>
            currentIndex === index
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

    setMessage("");
  }

  async function modifyWithAI() {
    if (
      !site ||
      !aiInstruction.trim()
    ) {
      return;
    }

    setAiEditing(true);
    setError("");
    setMessage("");

    try {
      const response =
        await authenticatedFetch(
          "/modify",
          {
            method: "POST",
            body: JSON.stringify({
              site,
              instruction:
                aiInstruction.trim(),
              designStyle,
              accentColor,
              activity,
              city,
            }),
          },
        );

      if (!response.ok) {
        const raw =
          (await response.text()).trim();

        throw new Error(
          raw ||
            "Impossible de modifier le site.",
        );
      }

      const data: ModifyResponse =
        await response.json();

      const modified =
        normalizeSite(data.site);

      setSite(modified);
      setBusinessName(
        modified.businessName ||
          businessName,
      );
      setPhone(
        modified.phone || phone,
      );
      setDesignStyle(
        data.designStyle,
      );
      setAccentColor(
        data.accentColor,
      );
      setAiInstruction("");
      setMessage(
        "Modification IA appliquée.",
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le site.",
      );
    } finally {
      setAiEditing(false);
    }
  }

  async function saveCurrentSite() {
    if (!site) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const synchronizedSite =
      normalizeSite({
        ...site,
        businessName:
          businessName.trim() ||
          site.businessName,
        phone:
          phone.trim() ||
          site.phone,
      });

    setSite(synchronizedSite);

    const body = {
      site: synchronizedSite,
      activity,
      city,
      designStyle,
      accentColor,
    };

    try {
      const response =
        savedSiteID === null
          ? await authenticatedFetch(
              "/sites",
              {
                method: "POST",
                body: JSON.stringify(
                  body,
                ),
              },
            )
          : await authenticatedFetch(
              `/sites/${savedSiteID}`,
              {
                method: "PUT",
                body: JSON.stringify(
                  body,
                ),
              },
            );

      if (!response.ok) {
        const raw =
          (await response.text()).trim();

        throw new Error(
          raw ||
            "Impossible de sauvegarder le site.",
        );
      }

      const saved: SavedSite =
        await response.json();

      const normalized =
        normalizeSite(saved.site);

      setSavedSiteID(saved.id);
      setOpenedSite({
        ...saved,
        site: normalized,
      });
      setSite(normalized);
      setBusinessName(saved.businessName);
      setActivity(saved.activity);
      setCity(saved.city);
      setPhone(saved.phone);
      setDesignStyle(saved.designStyle);
      setAccentColor(saved.accentColor);
      setMessage(
        "Site sauvegardé avec succès.",
      );

      return saved;
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de sauvegarder le site.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentSite() {
    let id = savedSiteID;

    if (id === null) {
      const saved =
        await saveCurrentSite();

      if (!saved) {
        return;
      }

      id = saved.id;
    }

    setPublishing(true);
    setError("");
    setMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${id}/publish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        const raw =
          (await response.text()).trim();

        throw new Error(
          raw ||
            "Impossible de publier le site. Vérifie ton abonnement.",
        );
      }

      const saved: SavedSite =
        await response.json();

      const normalized =
        normalizeSite(saved.site);

      setSavedSiteID(saved.id);
      setOpenedSite({
        ...saved,
        site: normalized,
      });
      setSite(normalized);
      setMessage(
        "Site publié avec succès.",
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de publier le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishCurrentSite() {
    if (savedSiteID === null) {
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${savedSiteID}/unpublish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        const raw =
          (await response.text()).trim();

        throw new Error(
          raw ||
            "Impossible de retirer le site.",
        );
      }

      setOpenedSite((current) =>
        current
          ? {
              ...current,
              published: false,
              publicSlug: "",
              publishedAt: null,
            }
          : current,
      );

      setMessage(
        "Le site n'est plus public.",
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de retirer le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  function goToStep(nextStep: Step) {
    if (
      nextStep > 1 &&
      !site
    ) {
      setError(
        "Génère d'abord le site à l'étape Infos.",
      );
      setStep(1);
      return;
    }

    setError("");
    setMessage("");
    setStep(nextStep);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>
          <p className="mt-4 text-slate-400">
            Ouverture du builder...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="text-xl font-black"
          >
            Site
            <span className="text-blue-500">
              AI
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForNewSite}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold"
            >
              + Nouveau
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/sites")
              }
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold"
            >
              Mes sites
            </button>
          </div>
        </div>

        <div className="border-t border-slate-900 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-blue-400">
              Étape {step} sur 5
            </span>
            <span className="text-slate-400">
              {stepLabels[step]}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {(
              [1, 2, 3, 4, 5] as Step[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  goToStep(item)
                }
                aria-label={`Étape ${item} ${stepLabels[item]}`}
                className={`h-2 rounded-full transition ${
                  item <= step
                    ? "bg-blue-500"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-4 py-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-300">
            {message}
          </div>
        )}

        {step === 1 && (
          <form
            onSubmit={generateSite}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Étape 1
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Ton entreprise
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Donne seulement les informations essentielles. L&apos;IA s&apos;occupe du reste.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Nom de l&apos;entreprise
                </label>
                <input
                  value={businessName}
                  onChange={(event) =>
                    setBusinessName(
                      event.target.value,
                    )
                  }
                  placeholder="Dupont Plomberie"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Activité
                </label>
                <input
                  value={activity}
                  onChange={(event) =>
                    setActivity(
                      event.target.value,
                    )
                  }
                  placeholder="Plombier"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Ville
                </label>
                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value,
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Téléphone
                </label>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Services
                </label>
                <textarea
                  value={services}
                  onChange={(event) =>
                    setServices(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Dépannage, installation, rénovation..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sépare les services avec des virgules.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-4 font-black hover:bg-blue-500 disabled:opacity-50"
            >
              {loading
                ? "Création du site..."
                : site
                  ? "Continuer vers le contenu →"
                  : "✨ Générer le site et continuer"}
            </button>
          </form>
        )}

        {step === 2 && site && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                Étape 2
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Contenu
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Modifie uniquement ce que tu veux. Tout est déjà généré.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-900/60 bg-violet-950/20 p-5">
              <p className="font-black text-violet-300">
                ✨ Modification avec l&apos;IA
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Exemple : « rends le texte plus haut de gamme ».
              </p>
              <textarea
                value={aiInstruction}
                onChange={(event) =>
                  setAiInstruction(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="Demande une modification..."
                className="mt-4 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              />
              <button
                type="button"
                disabled={
                  aiEditing ||
                  !aiInstruction.trim()
                }
                onClick={modifyWithAI}
                className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold disabled:opacity-50"
              >
                {aiEditing
                  ? "Modification..."
                  : "Appliquer avec l'IA"}
              </button>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Nom affiché
                  </label>
                  <input
                    value={site.businessName}
                    onChange={(event) =>
                      updateSiteField(
                        "businessName",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Grand titre
                  </label>
                  <textarea
                    value={site.heroTitle}
                    onChange={(event) =>
                      updateSiteField(
                        "heroTitle",
                        event.target.value,
                      )
                    }
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Texte d&apos;accueil
                  </label>
                  <textarea
                    value={site.heroText}
                    onChange={(event) =>
                      updateSiteField(
                        "heroText",
                        event.target.value,
                      )
                    }
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-black">
                Sections
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Les blocs principaux du site.
              </p>

              <div className="mt-5 space-y-4">
                {site.sections.map(
                  (section, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Section {index + 1}
                      </p>
                      <input
                        value={section.title}
                        onChange={(event) =>
                          updateSection(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-bold"
                      />
                      <textarea
                        value={section.text}
                        onChange={(event) =>
                          updateSection(
                            index,
                            "text",
                            event.target.value,
                          )
                        }
                        rows={4}
                        className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-black">
                SEO
              </h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Titre Google
                  </label>
                  <input
                    value={site.metaTitle}
                    onChange={(event) =>
                      updateSiteField(
                        "metaTitle",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Description Google
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
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                goToStep(3)
              }
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black"
            >
              Apparence →
            </button>
          </div>
        )}

        {step === 3 && site && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                Étape 3
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Apparence
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Choisis simplement l&apos;ambiance et la couleur du site.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-bold">
                Style
              </p>
              <div className="mt-4 grid gap-3">
                {(
                  [
                    [
                      "moderne",
                      "Moderne",
                      "Clair, net et dynamique",
                    ],
                    [
                      "elegant",
                      "Élégant",
                      "Sobre et haut de gamme",
                    ],
                    [
                      "artisan",
                      "Artisan",
                      "Chaleureux et authentique",
                    ],
                  ] as const
                ).map(
                  ([
                    value,
                    label,
                    description,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setDesignStyle(
                          value,
                        )
                      }
                      className={`rounded-2xl border p-4 text-left ${
                        designStyle === value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 bg-slate-950"
                      }`}
                    >
                      <p className="font-black">
                        {label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {description}
                      </p>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-bold">
                Couleur principale
              </p>

              <div className="mt-4 flex flex-wrap gap-4">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    aria-label={color.name}
                    onClick={() =>
                      setAccentColor(
                        color.value,
                      )
                    }
                    style={{
                      backgroundColor:
                        color.value,
                    }}
                    className={`h-12 w-12 rounded-full border-4 ${
                      accentColor ===
                      color.value
                        ? "border-white"
                        : "border-transparent"
                    }`}
                  />
                ))}

                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) =>
                    setAccentColor(
                      event.target.value,
                    )
                  }
                  className="h-12 w-14 rounded-xl border border-slate-700 bg-slate-950 p-1"
                  title="Couleur personnalisée"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                goToStep(4)
              }
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black"
            >
              Voir mon site →
            </button>

            <p className="text-center text-xs leading-5 text-slate-600">
              Les réglages très avancés restent disponibles sur ordinateur afin de garder le mobile simple.
            </p>
          </div>
        )}

        {step === 4 && site && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                Étape 4
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Aperçu
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ici tu vois réellement le résultat du site.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-950 p-1.5">
                {(
                  [
                    [
                      "mobile",
                      "📱",
                      "Mobile",
                    ],
                    [
                      "tablet",
                      "▭",
                      "Tablette",
                    ],
                    [
                      "desktop",
                      "🖥️",
                      "PC",
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
                      className={`rounded-xl px-2 py-3 text-xs font-bold ${
                        previewDevice === value
                          ? "bg-blue-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      <span className="block text-lg">
                        {icon}
                      </span>
                      <span>{label}</span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-3">
              <ResponsiveSitePreview
                device={previewDevice}
                site={site}
                designStyle={designStyle}
                accentColor={accentColor}
                activity={activity}
                city={city}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setPreviewFullscreenOpen(
                  true,
                )
              }
              className="w-full rounded-2xl border border-blue-500 bg-blue-500/10 px-5 py-4 font-black text-blue-300"
            >
              ⛶ Voir le rendu réel en plein écran
            </button>

            <button
              type="button"
              onClick={() =>
                goToStep(5)
              }
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black"
            >
              Sauvegarder / publier →
            </button>
          </div>
        )}

        {step === 5 && site && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                Étape 5
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Publication
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ton site est prêt. Sauvegarde-le puis publie-le quand tu veux.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black">
                    {businessName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {activity} · {city}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    openedSite?.published
                      ? "bg-emerald-950 text-emerald-400"
                      : "bg-amber-950 text-amber-400"
                  }`}
                >
                  {openedSite?.published
                    ? "● Public"
                    : "● Brouillon"}
                </span>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={saveCurrentSite}
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving
                  ? "Sauvegarde..."
                  : savedSiteID === null
                    ? "💾 Sauvegarder le site"
                    : "💾 Enregistrer les modifications"}
              </button>

              {!openedSite?.published && (
                <button
                  type="button"
                  disabled={
                    publishing ||
                    saving
                  }
                  onClick={publishCurrentSite}
                  className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-4 font-black hover:bg-blue-500 disabled:opacity-50"
                >
                  {publishing
                    ? "Publication..."
                    : "🚀 Publier le site"}
                </button>
              )}

              {openedSite?.published &&
                openedSite.publicSlug && (
                  <>
                    <a
                      href={`/site/${openedSite.publicSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block w-full rounded-2xl bg-blue-600 px-5 py-4 text-center font-black"
                    >
                      🌍 Voir le site public
                    </a>

                    <button
                      type="button"
                      disabled={publishing}
                      onClick={
                        unpublishCurrentSite
                      }
                      className="mt-3 w-full rounded-2xl border border-red-900 px-5 py-4 font-bold text-red-400 disabled:opacity-50"
                    >
                      Retirer de la publication
                    </button>
                  </>
                )}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/sites")
              }
              className="w-full rounded-2xl border border-slate-700 px-5 py-4 font-bold text-slate-300"
            >
              ← Retour à Mes sites
            </button>
          </div>
        )}
      </section>

      {step > 1 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-4 pt-3 backdrop-blur"
          style={{
            paddingBottom:
              "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button
              type="button"
              onClick={() =>
                goToStep(
                  Math.max(
                    1,
                    step - 1,
                  ) as Step,
                )
              }
              className="w-1/3 rounded-xl border border-slate-700 px-3 py-3 text-sm font-bold"
            >
              ← Retour
            </button>

            {step < 5 && (
              <button
                type="button"
                onClick={() =>
                  goToStep(
                    Math.min(
                      5,
                      step + 1,
                    ) as Step,
                  )
                }
                className="flex-1 rounded-xl bg-blue-600 px-3 py-3 text-sm font-black"
              >
                {stepLabels[
                  Math.min(
                    5,
                    step + 1,
                  ) as Step
                ]}{" "}
                →
              </button>
            )}
          </div>
        </div>
      )}

      {site &&
        previewFullscreenOpen && (
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu réel du site"
          >
            <div
              className="relative z-20 shrink-0 border-b border-slate-800 bg-slate-950/95 px-2 py-2 text-white backdrop-blur"
              style={{
                paddingTop:
                  "max(env(safe-area-inset-top), 0.5rem)",
              }}
            >
              <div className="mx-auto flex max-w-5xl items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewFullscreenOpen(
                      false,
                    )
                  }
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-black"
                >
                  ← Éditeur
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-center text-xs font-black">
                    Aperçu réel
                  </p>
                  <p className="truncate text-center text-[10px] text-slate-500">
                    {
                      previewViewports[
                        previewDevice
                      ].label
                    }
                  </p>
                </div>

                <div className="flex shrink-0 rounded-xl border border-slate-700 bg-slate-900 p-1">
                  {(
                    [
                      [
                        "mobile",
                        "📱",
                        "Téléphone",
                      ],
                      [
                        "tablet",
                        "▭",
                        "Tablette",
                      ],
                      [
                        "desktop",
                        "🖥️",
                        "Ordinateur",
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
                        aria-label={`Aperçu ${label}`}
                        title={label}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition ${
                          previewDevice ===
                          value
                            ? "bg-blue-600 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {icon}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <FullscreenSitePreview
                device={previewDevice}
                site={site}
                designStyle={designStyle}
                accentColor={accentColor}
                activity={activity}
                city={city}
              />
            </div>
          </div>
        )}
    </main>
  );
}
