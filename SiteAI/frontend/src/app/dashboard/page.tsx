"use client";

import "../app-theme.css";
import dynamic from "next/dynamic";
// Assistant fermé au départ : chargé après l'affichage de la page.
const LumioAssistant = dynamic(() => import("@/components/LumioAssistant"), { ssr: false });
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import Icon from "@/components/ui/Icon";
import AppSidebar from "@/components/app/AppSidebar";
import { readableBillingStatus, readablePlan } from "@/lib/billingLabels";
import { Badge, EmptyState, Skeleton } from "@/components/ui/Surface";

type DesignStyle = "moderne" | "elegant" | "artisan";

type GeneratedSite = {
  businessName: string;
  logoUrl?: string;
  heroImageUrl?: string;
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

type FilterType = "all" | "published" | "draft";

type ShareFeedback = {
  siteID: number;
  message: string;
  error?: boolean;
};


type DomainVerification = {
  type: string;
  domain?: string;
  value?: string;
  reason?: string;
};

type RecommendedRecord = {
  rank: string;
  value: unknown;
};

type DomainStatus = {
  domain: string;
  verified: boolean;
  configured: boolean;
  configuredBy?: string;
  verification?: DomainVerification[];
  recommendedCNAME?: RecommendedRecord[];
  recommendedIPv4?: RecommendedRecord[];
  message?: string;
};

type BillingStatus = {
  plan: string;
  status: string;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  canManage: boolean;
  maxPublishedSites?: number;
  customDomainAllowed?: boolean;
};

type LeadSummary = {
  id: number;
  siteId: number;
  businessName: string;
  status: string;
  archived?: boolean;
  quoteAmountCents: number;
  createdAt: string;
};

type SiteAnalyticsSummary = {
  siteId: number;
  publicSlug: string;
  businessName: string;
  views30d: number;
  visitors30d: number;
  leads30d: number;
  conversionRate: number;
};

type AnalyticsSummary = {
  views30d: number;
  visitors30d: number;
  leads30d: number;
  conversionRate: number;
  sites: SiteAnalyticsSummary[];
};

function formatBillingDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isValidDate(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatCurrency(
  cents: number,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    },
  ).format(
    (cents || 0) / 100,
  );
}

// Date du jour : vide dans le HTML envoyé par le serveur (préparé à l'avance),
// écrite dans le navigateur, pour ne jamais afficher une date périmée.
const noSubscription = () => () => {};
function TodayLabel() {
  return useSyncExternalStore(
    noSubscription,
    () => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    () => "",
  );
}

export default function DashboardPage() {
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deletingID, setDeletingID] = useState<number | null>(null);
  const [duplicatingID, setDuplicatingID] = useState<number | null>(null);
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [domainPanelSiteID, setDomainPanelSiteID] = useState<number | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainActionLoading, setDomainActionLoading] = useState(false);
  const [domainError, setDomainError] = useState("");

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

        if (!active) return;

        setUserEmail(data.session.user.email ?? "");
        setAuthLoading(false);

        await Promise.all([
          loadSites(),
          loadBilling(),
          loadLeads(),
          loadAnalytics(),
          checkAdminAccess(),
        ]);
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

  async function authenticatedFetch(
    path: string,
    options: RequestInit = {},
  ) {
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

  async function checkAdminAccess() {
    try {
      const response = await authenticatedFetch("/admin/stats");

      if (response.status === 403) {
        setIsAdmin(false);
        return;
      }

      if (!response.ok) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error("Vérification admin impossible :", err);
      setIsAdmin(false);
    }
  }

  async function loadSites() {
    setSitesLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch("/sites");

      if (!response.ok) {
        throw new Error("Impossible de récupérer les sites.");
      }

      const data: SavedSite[] = await response.json();

      const onboardingSkipped =
        sessionStorage.getItem("siteai_onboarding_skipped") === "true";

      if (data.length === 0 && !onboardingSkipped) {
        router.replace("/onboarding");
        return;
      }

      setSites(data);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger tes sites.");
    } finally {
      setSitesLoading(false);
    }
  }

  async function loadLeads() {
    setLeadsLoading(true);

    try {
      const response = await authenticatedFetch("/leads");

      if (!response.ok) {
        throw new Error("Impossible de récupérer les prospects.");
      }

      const data = (await response.json()) as LeadSummary[];
      setLeads(data);
    } catch (err) {
      console.error(err);
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);

    try {
      const response = await authenticatedFetch("/analytics/summary");

      if (!response.ok) {
        throw new Error("Impossible de récupérer les statistiques.");
      }

      const data = (await response.json()) as AnalyticsSummary;
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadBilling() {
    setBillingLoading(true);

    try {
      const response = await authenticatedFetch("/stripe/status");

      if (!response.ok) {
        throw new Error("Impossible de récupérer l’abonnement.");
      }

      const data: BillingStatus = await response.json();
      setBilling(data);
    } catch (err) {
      console.error(err);
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("siteai_site_to_open");
    router.replace("/auth");
    router.refresh();
  }

  function createSite() {
    sessionStorage.removeItem("siteai_site_to_open");
    router.push("/creer");
  }

  function editSite(id: number) {
    sessionStorage.setItem("siteai_site_to_open", String(id));
    router.push("/builder");
  }

  function viewPublicSite(slug: string) {
    if (!slug) return;
    window.open(`/site/${slug}`, "_blank", "noopener,noreferrer");
  }

  function publicSiteUrl(slug: string) {
    if (typeof window === "undefined") {
      return `/site/${encodeURIComponent(slug)}`;
    }

    return `${window.location.origin}/site/${encodeURIComponent(slug)}`;
  }

  async function copyText(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("copy-failed");
    }
  }

  async function copyPublicSite(
    siteID: number,
    slug: string,
  ) {
    if (!slug) return;

    try {
      await copyText(publicSiteUrl(slug));

      setShareFeedback({
        siteID,
        message: "✓ Lien copié",
      });
    } catch (err) {
      console.error(err);

      setShareFeedback({
        siteID,
        message: "Impossible de copier le lien.",
        error: true,
      });
    }
  }

  async function sharePublicSite(
    siteID: number,
    slug: string,
    businessName: string,
  ) {
    if (!slug) return;

    const url = publicSiteUrl(slug);

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: businessName || "Site professionnel",
          text: `Découvre le site de ${businessName || "cette entreprise"}.`,
          url,
        });

        setShareFeedback({
          siteID,
          message: "Options de partage ouvertes.",
        });

        return;
      }

      await copyText(url);

      setShareFeedback({
        siteID,
        message: "✓ Lien copié pour le partager",
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "AbortError"
      ) {
        return;
      }

      console.error(err);

      setShareFeedback({
        siteID,
        message: "Impossible d’ouvrir le partage.",
        error: true,
      });
    }
  }

  async function duplicateSite(
    id: number,
    businessName: string,
  ) {
    if (duplicatingID !== null) return;

    setDuplicatingID(id);
    setError("");

    try {
      const response = await authenticatedFetch(
        `/sites/${id}/duplicate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const message = (await response.text()).trim();

        throw new Error(
          message || "Impossible de dupliquer ce site.",
        );
      }

      const duplicated: SavedSite = await response.json();

      setSites((currentSites) => [
        duplicated,
        ...currentSites.filter((site) => site.id !== duplicated.id),
      ]);

      setSearch("");
      setFilter("all");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Impossible de dupliquer "${businessName}".`,
      );
    } finally {
      setDuplicatingID(null);
    }
  }

  async function deleteSite(id: number, businessName: string) {
    const confirmed = await confirm({
      title: `Supprimer définitivement le site "${businessName}" ?`,
      confirmLabel: "Supprimer", tone: "danger",
    });

    if (!confirmed) return;

    setDeletingID(id);
    setError("");

    try {
      const response = await authenticatedFetch(`/sites/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur suppression");
      }

      setSites((currentSites) =>
        currentSites.filter((site) => site.id !== id),
      );

      if (domainPanelSiteID === id) {
        closeDomainPanel();
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de supprimer ce site.");
    } finally {
      setDeletingID(null);
    }
  }

  async function openDomainPanel(siteID: number) {
    if (domainPanelSiteID === siteID) {
      closeDomainPanel();
      return;
    }

    setDomainPanelSiteID(siteID);
    setDomainInput("");
    setDomainStatus(null);
    setDomainError("");

    await loadDomainStatus(siteID);
  }

  function closeDomainPanel() {
    setDomainPanelSiteID(null);
    setDomainInput("");
    setDomainStatus(null);
    setDomainError("");
    setDomainLoading(false);
    setDomainActionLoading(false);
  }

  async function loadDomainStatus(siteID: number) {
    setDomainLoading(true);
    setDomainError("");

    try {
      const response = await authenticatedFetch(`/sites/${siteID}/domain`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Impossible de récupérer le domaine.",
        );
      }

      const data: DomainStatus = await response.json();
      setDomainStatus(data);

      if (data.domain) {
        setDomainInput(data.domain);
      }
    } catch (err) {
      console.error(err);
      setDomainError(
        err instanceof Error
          ? err.message
          : "Impossible de récupérer le domaine.",
      );
    } finally {
      setDomainLoading(false);
    }
  }

  async function addDomain(siteID: number) {
    const cleanDomain = domainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    if (!cleanDomain) {
      setDomainError(
        "Entre un domaine, par exemple : monentreprise.fr",
      );
      return;
    }

    setDomainActionLoading(true);
    setDomainError("");

    try {
      const response = await authenticatedFetch(`/sites/${siteID}/domain`, {
        method: "POST",
        body: JSON.stringify({ domain: cleanDomain }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Impossible d'ajouter ce domaine.",
        );
      }

      const data: DomainStatus = await response.json();
      setDomainStatus(data);
      setDomainInput(data.domain || cleanDomain);
    } catch (err) {
      console.error(err);
      setDomainError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter le domaine.",
      );
    } finally {
      setDomainActionLoading(false);
    }
  }

  async function verifyDomain(siteID: number) {
    setDomainActionLoading(true);
    setDomainError("");

    try {
      const response = await authenticatedFetch(
        `/sites/${siteID}/domain/verify`,
        { method: "POST" },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Impossible de vérifier le domaine.",
        );
      }

      const data: DomainStatus = await response.json();
      setDomainStatus(data);
    } catch (err) {
      console.error(err);
      setDomainError(
        err instanceof Error
          ? err.message
          : "Impossible de vérifier le domaine.",
      );
    } finally {
      setDomainActionLoading(false);
    }
  }

  async function deleteDomain(siteID: number) {
    if (!domainStatus?.domain) return;

    const confirmed = await confirm({
      title: `Retirer le domaine "${domainStatus.domain}" de ce site ?`,
      confirmLabel: "Retirer le domaine", tone: "danger",
    });

    if (!confirmed) return;

    setDomainActionLoading(true);
    setDomainError("");

    try {
      const response = await authenticatedFetch(`/sites/${siteID}/domain`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Impossible de retirer le domaine.",
        );
      }

      const data: DomainStatus = await response.json();
      setDomainStatus(data);
      setDomainInput("");
    } catch (err) {
      console.error(err);
      setDomainError(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer le domaine.",
      );
    } finally {
      setDomainActionLoading(false);
    }
  }

  function openCustomDomain() {
    if (!domainStatus?.domain) return;

    window.open(
      `https://${domainStatus.domain}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function formatRecordValue(value: unknown) {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null || value === undefined) return "";

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const publishedSites = sites.filter((site) => site.published).length;
  const draftSites = sites.length - publishedSites;
  const newLeadsCount = leads.filter((lead) => lead.status === "new").length;

  const commercialStats = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = new Date(today);

    thirtyDaysAgo.setDate(
      thirtyDaysAgo.getDate() - 29,
    );

    const activeLeads = leads.filter(
      (lead) =>
        lead.archived !== true &&
        isValidDate(lead.createdAt),
    );

    const leads30d = activeLeads.filter(
      (lead) =>
        new Date(lead.createdAt) >=
        thirtyDaysAgo,
    );

    const new30d = leads30d.filter(
      (lead) => lead.status === "new",
    ).length;

    const contacted30d = leads30d.filter(
      (lead) => lead.status === "contacted",
    ).length;

    const quoteSent30d = leads30d.filter(
      (lead) => lead.status === "quote_sent",
    ).length;

    const won30d = leads30d.filter(
      (lead) => lead.status === "won",
    ).length;

    const lost30d = leads30d.filter(
      (lead) => lead.status === "lost",
    ).length;

    const commercialConversion =
      leads30d.length > 0
        ? (won30d / leads30d.length) * 100
        : 0;

    const closed30d = won30d + lost30d;

    const winRate =
      closed30d > 0
        ? (won30d / closed30d) * 100
        : 0;

    const daily = Array.from(
      { length: 30 },
      (_, index) => {
        const date = new Date(thirtyDaysAgo);

        date.setDate(
          thirtyDaysAgo.getDate() + index,
        );

        const start = startOfDay(date);
        const end = new Date(start);

        end.setDate(
          end.getDate() + 1,
        );

        const count = leads30d.filter(
          (lead) => {
            const createdAt = new Date(
              lead.createdAt,
            );

            return (
              createdAt >= start &&
              createdAt < end
            );
          },
        ).length;

        return {
          date: start,
          count,
        };
      },
    );

    const maxDaily = Math.max(
      1,
      ...daily.map(
        (item) => item.count,
      ),
    );

    const openPipelineValue =
      leads30d
        .filter(
          (lead) =>
            lead.status === "new" ||
            lead.status === "contacted" ||
            lead.status === "quote_sent",
        )
        .reduce(
          (total, lead) =>
            total +
            (lead.quoteAmountCents || 0),
          0,
        );

    const wonValue =
      leads30d
        .filter(
          (lead) =>
            lead.status === "won",
        )
        .reduce(
          (total, lead) =>
            total +
            (lead.quoteAmountCents || 0),
          0,
        );

    const lostValue =
      leads30d
        .filter(
          (lead) =>
            lead.status === "lost",
        )
        .reduce(
          (total, lead) =>
            total +
            (lead.quoteAmountCents || 0),
          0,
        );

    const quotedLeads =
      leads30d.filter(
        (lead) =>
          (lead.quoteAmountCents || 0) >
          0,
      );

    const averageQuoteValue =
      quotedLeads.length > 0
        ? Math.round(
            quotedLeads.reduce(
              (total, lead) =>
                total +
                (lead.quoteAmountCents ||
                  0),
              0,
            ) /
              quotedLeads.length,
          )
        : 0;

    return {
      total30d: leads30d.length,
      new30d,
      contacted30d,
      quoteSent30d,
      won30d,
      lost30d,
      commercialConversion,
      winRate,
      daily,
      maxDaily,
      openPipelineValue,
      wonValue,
      lostValue,
      averageQuoteValue,
    };
  }, [leads]);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesSearch =
        query === "" ||
        site.businessName.toLowerCase().includes(query) ||
        site.activity.toLowerCase().includes(query) ||
        site.city.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "published" && site.published) ||
        (filter === "draft" && !site.published);

      return matchesSearch && matchesFilter;
    });
  }, [sites, search, filter]);

  const planName = readablePlan(billing?.plan ?? "free");
  const billingStatus = readableBillingStatus(billing?.status ?? "");
  const subscriptionActive =
    billing?.status === "active" || billing?.status === "trialing";

  const customDomainAllowed =
    subscriptionActive && billing?.customDomainAllowed === true;

  // Pas d'écran de chargement : la structure et le titre partent dans le HTML de la page
  // (affichage plus rapide), les chiffres arrivent ensuite avec leurs squelettes.

  return (
    <>
    <main className="lumio-app has-sidebar min-h-screen overflow-x-hidden bg-slate-950 text-white" aria-busy={authLoading || undefined}>
      {confirmDialog}
      <AppSidebar
        className="hidden lg:flex"
        current="dashboard"
        userEmail={userEmail}
        isAdmin={isAdmin}
        newLeadsCount={newLeadsCount}
        leadsLoading={leadsLoading}
        planName={planName}
        billingStatus={billingStatus}
        billingLoading={billingLoading}
        onNavigate={(path) => router.push(path)}
        onLogout={() => void handleLogout()}
        onCreateSite={createSite}
      />
      {/* En dessous de 1024 px, l'en-tête reste la navigation ; au-delà, la barre latérale le remplace. */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="lumio-logo shrink-0"
              aria-label="Lumio, tableau de bord"
            >
              lumio<span>.</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold transition hover:border-blue-500 md:hidden"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? "close" : "menu"} size={20} />
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <div className="hidden text-right xl:block">
                <p className="text-xs text-slate-500">Connecté avec</p>
                <p className="text-sm font-medium">{userEmail}</p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-amber-500 hover:text-amber-300"
                >
                  Admin
                </button>
              )}

              <a
                href="mailto:support@lumio.business"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
              >
                Aide
              </a>

              <button
                type="button"
                onClick={() => router.push("/prospects")}
                className="relative rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-500"
              >
                Prospects
                {!leadsLoading && newLeadsCount > 0 && (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                    {newLeadsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-violet-500"
              >
                Abonnement
              </button>

              <button
                type="button"
                onClick={createSite}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold transition hover:bg-blue-500"
              >
                <Icon name="plus" size={15} className="mr-1 inline-block align-[-0.15em]" />Nouveau site
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-900 hover:bg-red-950/40 hover:text-red-300"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 border-t border-slate-800 pt-4 md:hidden">
              {userEmail && (
                <div className="mb-3 rounded-xl bg-slate-900 px-4 py-3">
                  <p className="text-xs text-slate-500">Connecté avec</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-200">
                    {userEmail}
                  </p>
                </div>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/admin");
                  }}
                  className="mb-2 w-full rounded-xl border border-amber-700 px-4 py-3 text-left text-sm font-bold text-amber-300 transition hover:bg-amber-950"
                >
                  Administration
                </button>
              )}

              <a
                href="mailto:support@lumio.business"
                className="mb-2 block w-full rounded-xl border border-blue-900 px-4 py-3 text-left text-sm font-bold text-blue-300 transition hover:bg-blue-950"
              >
                Contacter le support
              </a>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="w-full rounded-xl border border-red-900 px-4 py-3 text-left text-sm font-semibold text-red-400 transition hover:bg-red-950"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <section id="dashboard-top" className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-6 sm:py-9 md:pb-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="min-h-5 text-sm text-slate-400 first-letter:uppercase">
              <TodayLabel />
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Bonjour, <em>voici ton activité.</em>
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Retrouve tes sites, tes prospects et les chiffres essentiels de ton activité.
            </p>
          </div>

          <button
            type="button"
            onClick={createSite}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold transition hover:bg-blue-500"
          >
            <Icon name="plus" size={16} className="mr-1.5 inline-block align-[-0.2em]" />
            Créer un nouveau site
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => router.push("/prospects")} className="lumio-kpi block">
            <span className="flex items-center justify-between gap-2 text-sm text-slate-400">
              Prospects à traiter
              {!leadsLoading && newLeadsCount > 0 && <Badge tone="accent" dot>Nouveau</Badge>}
            </span>
            {leadsLoading ? (
              <span className="mt-3 grid gap-2" aria-label="Chargement des prospects">
                <Skeleton width={64} height={28} />
                <Skeleton width="70%" height={10} />
              </span>
            ) : (
              <>
                <span className="lumio-kpi-value block">{newLeadsCount}</span>
                <span className="mt-2 block text-xs text-slate-500">
                  {leads.length} demande{leads.length > 1 ? "s" : ""} au total
                </span>
              </>
            )}
          </button>

          <button type="button" onClick={() => router.push("/prospects")} className="lumio-kpi block">
            <span className="block text-sm text-slate-400">Pipeline ouvert</span>
            {leadsLoading ? (
              <span className="mt-3 grid gap-2" aria-label="Chargement du pipeline">
                <Skeleton width={110} height={28} />
                <Skeleton width="70%" height={10} />
              </span>
            ) : (
              <>
                <span className="lumio-kpi-value block">{formatCurrency(commercialStats.openPipelineValue)}</span>
                <span className="mt-2 block text-xs text-slate-500">
                  {commercialStats.quoteSent30d} devis envoyé{commercialStats.quoteSent30d > 1 ? "s" : ""} · 30 jours
                </span>
              </>
            )}
          </button>

          <div className="lumio-kpi col-span-2 sm:col-span-1">
            <span className="block text-sm text-slate-400">Conversion commerciale</span>
            {leadsLoading ? (
              <span className="mt-3 grid gap-2" aria-label="Chargement de la conversion">
                <Skeleton width={80} height={28} />
                <Skeleton width="70%" height={10} />
              </span>
            ) : (
              <>
                <span className="lumio-kpi-value block">{commercialStats.commercialConversion.toFixed(1)} %</span>
                <span className="mt-2 block text-xs text-slate-500">
                  {commercialStats.won30d} gagné{commercialStats.won30d > 1 ? "s" : ""} sur {commercialStats.total30d} · 30 jours
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sur petit écran, la formule reste visible ici (la barre latérale n'apparaît qu'à partir de 1024 px). */}
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="lumio-kpi mt-3 flex w-full items-center justify-between gap-4 lg:hidden"
        >
          <span>
            <span className="block text-sm text-slate-400">Abonnement</span>
            {billingLoading ? (
              <span className="mt-2 block"><Skeleton width={90} height={16} /></span>
            ) : (
              <span className="mt-1 block text-lg font-semibold text-white">{planName}</span>
            )}
          </span>
          {!billingLoading && (
            <span className="text-right">
              <span className={`block text-sm font-semibold ${subscriptionActive ? "text-emerald-400" : "text-slate-500"}`}>
                {billingStatus}
              </span>
              {billing?.currentPeriodEnd && (
                <span className="mt-1 block text-xs text-slate-400">
                  {billing.cancelAtPeriodEnd ? "Fin le " : "Renouvellement le "}
                  {formatBillingDate(billing.currentPeriodEnd)}
                </span>
              )}
            </span>
          )}
        </button>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Mes sites</h2>
              <p className="mt-1 text-sm text-slate-400">
                Accède directement aux sites que tu gères le plus récemment.
              </p>
            </div>

            <div className="lumio-segmented flex gap-1 self-start rounded-full bg-slate-900 p-1 sm:self-auto" role="group" aria-label="Filtrer les sites">
              {([
                ["all", "Tous", sites.length],
                ["published", "Publiés", publishedSites],
                ["draft", "Brouillons", draftSites],
              ] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    filter === value ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {label} <span className="ml-1 text-slate-500">{count}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/sites")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500"
            >
              Voir tous les sites<Icon name="arrowRight" size={15} className="ml-1.5 inline-block align-[-0.15em]" />
            </button>
          </div>

          {sitesLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Chargement des sites">
              {[0, 1, 2].map((index) => (
                <div key={index} className="lumio-kpi grid gap-3">
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="40%" height={10} />
                  <Skeleton height={40} />
                </div>
              ))}
            </div>
          ) : sites.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon="globe"
              title="Crée ton premier site"
              description="Décris ton activité : Lumio prépare une première version que tu pourras modifier avant de publier."
              action={
                <button
                  type="button"
                  onClick={createSite}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500"
                >
                  <Icon name="plus" size={15} className="mr-1 inline-block align-[-0.15em]" />
                  Créer un site
                </button>
              }
            />
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sites
                .filter((savedSite) =>
                  filter === "all" ? true : filter === "published" ? savedSite.published : !savedSite.published,
                )
                .slice(0, 3)
                .map((savedSite) => (
                <article
                  key={`dashboard-site-${savedSite.id}`}
                  className="lumio-kpi"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="lumio-site-mark" aria-hidden="true">
                      {savedSite.businessName.trim().charAt(0).toUpperCase() || "L"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">
                        {savedSite.businessName}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {savedSite.activity} · {savedSite.city}
                      </p>
                    </div>

                    <Badge tone={savedSite.published ? "success" : "warning"} dot className="shrink-0">
                      {savedSite.published ? "En ligne" : "Brouillon"}
                    </Badge>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => editSite(savedSite.id)}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black hover:bg-blue-500"
                    >
                      Modifier
                    </button>

                    {savedSite.published && savedSite.publicSlug ? (
                      <button
                        type="button"
                        onClick={() => viewPublicSite(savedSite.publicSlug)}
                        className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:border-emerald-600"
                      >
                        Voir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => editSite(savedSite.id)}
                        className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:border-blue-500"
                      >
                        Ouvrir
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Pipeline commercial
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Prospects créés sur 30 jours, classés selon leur statut actuel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/prospects")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 hover:border-emerald-500"
            >
              Ouvrir le CRM<Icon name="arrowRight" size={15} className="ml-1.5 inline-block align-[-0.15em]" />
            </button>
          </div>

          <div className="lumio-kpi mt-4">
            {commercialStats.total30d === 0 ? (
              <p className="text-sm text-slate-400">
                Aucun prospect sur les 30 derniers jours. Les demandes envoyées depuis tes sites apparaîtront ici.
              </p>
            ) : (
              <>
                <div className="lumio-pipeline-bar" role="img" aria-label={`Pipeline sur 30 jours : ${commercialStats.new30d} nouveaux, ${commercialStats.contacted30d} contactés, ${commercialStats.quoteSent30d} devis envoyés, ${commercialStats.won30d} gagnés, ${commercialStats.lost30d} perdus`}>
                  {[
                    [commercialStats.new30d, "#6a5af9"],
                    [commercialStats.contacted30d, "#8f7dff"],
                    [commercialStats.quoteSent30d, "#b4a9ff"],
                    [commercialStats.won30d, "var(--ui-green)"],
                    [commercialStats.lost30d, "#3a3a46"],
                  ].map(([count, color], index) =>
                    Number(count) > 0 ? <i key={index} style={{ flexGrow: Number(count), background: String(color) }} /> : null,
                  )}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-400">
                  {[
                    ["Nouveaux", commercialStats.new30d, "#6a5af9"],
                    ["Contactés", commercialStats.contacted30d, "#8f7dff"],
                    ["Devis envoyés", commercialStats.quoteSent30d, "#b4a9ff"],
                    ["Gagnés", commercialStats.won30d, "var(--ui-green)"],
                    ["Perdus", commercialStats.lost30d, "#3a3a46"],
                  ].map(([label, count, color]) => (
                    <li key={String(label)} className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full" style={{ background: String(color) }} aria-hidden="true" />
                      {label} <span className="font-semibold text-white">{count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <details className="lumio-details mt-3">
            <summary className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-slate-400 hover:text-white">
              <Icon name="plus" size={14} />
              Détail des chiffres sur 30 jours
            </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Prospects créés
              </p>
              <p className="mt-1 text-2xl font-black">
                {commercialStats.total30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Sur 30 jours
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Devis envoyés
              </p>
              <p className="mt-1 text-2xl font-black text-blue-400">
                {commercialStats.quoteSent30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Statut actuel
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Gagnés
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {commercialStats.won30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Clients convertis
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Perdus
              </p>
              <p className="mt-1 text-2xl font-black text-red-400">
                {commercialStats.lost30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Opportunités perdues
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:col-span-1 sm:p-4">
              <p className="text-sm text-slate-400">
                Conversion commerciale
              </p>
              <p className="mt-1 text-2xl font-black text-violet-400">
                {commercialStats.commercialConversion.toFixed(1)} %
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Gagnés / prospects créés
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Pipeline ouvert
              </p>

              <p className="mt-1 text-2xl font-black text-violet-400">
                {formatCurrency(
                  commercialStats.openPipelineValue,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Valeur des opportunités ouvertes
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                CA gagné
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-400">
                {formatCurrency(
                  commercialStats.wonValue,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Prospects gagnés sur 30 jours
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                CA perdu
              </p>

              <p className="mt-1 text-2xl font-black text-red-400">
                {formatCurrency(
                  commercialStats.lostValue,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Opportunités perdues sur 30 jours
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
              <p className="text-sm text-slate-400">
                Devis moyen
              </p>

              <p className="mt-1 text-2xl font-black text-blue-400">
                {formatCurrency(
                  commercialStats.averageQuoteValue,
                )}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Moyenne des montants renseignés
              </p>
            </div>
          </div>

          </details>

          <div className="mt-5 space-y-4 md:hidden">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                    Prospects
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    Activité récente
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Une vue simple des 30 derniers jours
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-center">
                  <p className="text-3xl font-black text-emerald-400">
                    {commercialStats.total30d}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/70">
                    Total
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <p className="text-2xl font-black text-white">
                    {commercialStats.daily.at(-1)?.count ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Aujourd&apos;hui
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <p className="text-2xl font-black text-white">
                    {commercialStats.daily
                      .slice(-7)
                      .reduce(
                        (total, item) => total + item.count,
                        0,
                      )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    7 jours
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-center">
                  <p className="text-2xl font-black text-white">
                    {commercialStats.total30d}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    30 jours
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      Derniers 7 jours
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Chaque case correspond à une journée
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">
                    {commercialStats.daily
                      .slice(-7)
                      .reduce(
                        (total, item) => total + item.count,
                        0,
                      )}{" "}
                    prospect(s)
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {commercialStats.daily
                    .slice(-7)
                    .map((item) => (
                      <div
                        key={`mobile-${item.date.toISOString()}`}
                        className={`rounded-xl border p-2 text-center ${
                          item.count > 0
                            ? "border-emerald-700/70 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900"
                        }`}
                      >
                        <p
                          className={`text-lg font-black ${
                            item.count > 0
                              ? "text-emerald-400"
                              : "text-slate-600"
                          }`}
                        >
                          {item.count}
                        </p>

                        <p className="mt-1 text-[9px] text-slate-600">
                          {formatShortDay(item.date)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Pipeline
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Où en sont tes prospects ?
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Les statuts sont affichés clairement, sans graphique compliqué.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Nouveaux",
                    value: commercialStats.new30d,
                    textClass: "text-blue-400",
                    borderClass: "border-blue-900/70",
                    backgroundClass: "bg-blue-950/20",
                  },
                  {
                    label: "Contactés",
                    value: commercialStats.contacted30d,
                    textClass: "text-cyan-400",
                    borderClass: "border-cyan-900/70",
                    backgroundClass: "bg-cyan-950/20",
                  },
                  {
                    label: "Devis envoyés",
                    value: commercialStats.quoteSent30d,
                    textClass: "text-violet-400",
                    borderClass: "border-violet-900/70",
                    backgroundClass: "bg-violet-950/20",
                  },
                  {
                    label: "Gagnés",
                    value: commercialStats.won30d,
                    textClass: "text-emerald-400",
                    borderClass: "border-emerald-900/70",
                    backgroundClass: "bg-emerald-950/20",
                  },
                  {
                    label: "Perdus",
                    value: commercialStats.lost30d,
                    textClass: "text-red-400",
                    borderClass: "border-red-900/70",
                    backgroundClass: "bg-red-950/20",
                  },
                ].map((item) => (
                  <div
                    key={`mobile-pipeline-${item.label}`}
                    className={`rounded-2xl border p-4 ${item.borderClass} ${item.backgroundClass}`}
                  >
                    <p className={`text-3xl font-black ${item.textClass}`}>
                      {item.value}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-300">
                      {item.label}
                    </p>
                  </div>
                ))}

                <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4">
                  <p className="text-3xl font-black text-emerald-400">
                    {commercialStats.winRate.toFixed(0)}%
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-300">
                    Réussite
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/prospects")}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black hover:bg-blue-500"
              >
                Voir tous les prospects<Icon name="arrowRight" size={15} className="ml-1.5 inline-block align-[-0.15em]" />
              </button>
            </div>
          </div>

          <div className="mt-4 hidden gap-4 md:grid xl:grid-cols-[1.45fr_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-black">
                    Nouveaux prospects par jour
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Activité sur les 30 derniers jours
                  </p>
                </div>

                <p className="text-sm font-bold text-slate-400">
                  {commercialStats.total30d} au total
                </p>
              </div>

              <div className="mt-4 overflow-hidden pb-1">
                <div className="flex w-full items-end gap-1.5">
                  {commercialStats.daily.map(
                    (item, index) => {
                      const height =
                        item.count === 0
                          ? 8
                          : Math.max(
                              18,
                              Math.round(
                                (item.count /
                                  commercialStats.maxDaily) *
                                  90,
                              ),
                            );

                      const showLabel =
                        index === 0 ||
                        index ===
                          commercialStats.daily.length - 1 ||
                        index % 5 === 0;

                      return (
                        <div
                          key={item.date.toISOString()}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                          title={`${formatShortDay(item.date)} : ${item.count} prospect${item.count > 1 ? "s" : ""}`}
                        >
                          <span className="mb-2 text-[10px] font-bold text-slate-500">
                            {item.count > 0 ? item.count : ""}
                          </span>

                          <div
                            className={`w-full rounded-t-md ${
                              item.count > 0
                                ? "bg-emerald-500"
                                : "bg-slate-800"
                            }`}
                            style={{
                              height: `${height}px`,
                            }}
                          />

                          <span className="mt-2 h-4 text-[9px] text-slate-600">
                            {showLabel
                              ? formatShortDay(item.date)
                              : ""}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="font-black">
                Répartition du pipeline
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Statuts actuels des prospects créés sur 30 jours
              </p>

              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Nouveaux",
                    value: commercialStats.new30d,
                    className: "bg-blue-500",
                  },
                  {
                    label: "Contactés",
                    value: commercialStats.contacted30d,
                    className: "bg-cyan-500",
                  },
                  {
                    label: "Devis envoyés",
                    value: commercialStats.quoteSent30d,
                    className: "bg-violet-500",
                  },
                  {
                    label: "Gagnés",
                    value: commercialStats.won30d,
                    className: "bg-emerald-500",
                  },
                  {
                    label: "Perdus",
                    value: commercialStats.lost30d,
                    className: "bg-red-500",
                  },
                ].map((item) => {
                  const percentage =
                    commercialStats.total30d > 0
                      ? (item.value /
                          commercialStats.total30d) *
                        100
                      : 0;

                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-300">
                          {item.label}
                        </span>

                        <span className="font-black">
                          {item.value}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${item.className}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Taux de réussite
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-400">
                  {commercialStats.winRate.toFixed(1)} %
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Gagnés parmi les opportunités clôturées
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
                Statistiques
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Performance des 30 derniers jours
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Visiteurs, pages vues, prospects et taux de conversion de tes sites publiés.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-500 disabled:opacity-50"
            >
              ↻ Actualiser les stats
            </button>
          </div>

          {analyticsLoading ? (
            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Chargement des statistiques...
            </div>
          ) : analytics ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                  <p className="text-sm text-slate-400">
                    Visiteurs uniques
                  </p>

                  <p className="mt-1 text-3xl font-black text-cyan-400">
                    {analytics.visitors30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Sur les 30 derniers jours
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                  <p className="text-sm text-slate-400">
                    Pages vues
                  </p>

                  <p className="mt-1 text-3xl font-black text-blue-400">
                    {analytics.views30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Toutes visites confondues
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                  <p className="text-sm text-slate-400">
                    Prospects
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-400">
                    {analytics.leads30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Demandes reçues sur 30 jours
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
                  <p className="text-sm text-slate-400">
                    Conversion
                  </p>

                  <p className="mt-1 text-3xl font-black text-violet-400">
                    {analytics.conversionRate.toFixed(1)} %
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Prospects / visiteurs uniques
                  </p>
                </div>
              </div>

              {analytics.sites.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  <div className="border-b border-slate-800 px-5 py-4">
                    <h3 className="font-black">
                      Détail par site
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {analytics.sites.map((siteStats) => (
                      <div
                        key={siteStats.siteId}
                        className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-[1.5fr_repeat(4,minmax(90px,1fr))] md:items-center"
                      >
                        <div className="col-span-2 md:col-span-1">
                          <p className="font-bold">
                            {siteStats.businessName}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {siteStats.publicSlug || "Non publié"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Visiteurs
                          </p>
                          <p className="mt-1 font-black">
                            {siteStats.visitors30d}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Vues
                          </p>
                          <p className="mt-1 font-black">
                            {siteStats.views30d}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Prospects
                          </p>
                          <p className="mt-1 font-black text-emerald-400">
                            {siteStats.leads30d}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Conversion
                          </p>
                          <p className="mt-1 font-black text-violet-400">
                            {siteStats.conversionRate.toFixed(1)} %
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Les statistiques ne sont pas encore disponibles.
            </div>
          )}
        </section>

        {error && (
          <div className="mt-8 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/98 px-2 pt-2 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
        aria-label="Navigation mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("dashboard-top")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-blue-400"
            aria-label="Accueil du dashboard"
          >
            <Icon name="home" size={20} />
            <span>Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/sites")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
            aria-label="Mes sites"
          >
            <Icon name="globe" size={20} />
            <span>Sites</span>
          </button>

          <button
            type="button"
            onClick={createSite}
            className="mx-auto flex h-14 w-14 -translate-y-2 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-light text-white shadow-lg shadow-blue-950/60 transition hover:bg-blue-500"
            aria-label="Créer un nouveau site"
          >
            <Icon name="plus" size={24} />
          </button>

          <button
            type="button"
            onClick={() => router.push("/prospects")}
            className="relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
            aria-label="Prospects"
          >
            <Icon name="inbox" size={20} />
            <span>Prospects</span>
            {!leadsLoading && newLeadsCount > 0 && (
              <span className="absolute right-2 top-0 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                {newLeadsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
            aria-label="Abonnement"
          >
            <Icon name="card" size={20} />
            <span>Abonnement</span>
          </button>
        </div>
      </nav>
    </main>
      <LumioAssistant page="Tableau de bord" mobileOffset={96} />
    </>
  );
}


