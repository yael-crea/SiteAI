"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

function readablePlan(plan: string) {
  switch (plan.toLowerCase()) {
    case "essentiel":
      return "Essentiel";
    case "pro":
      return "Pro";
    case "agence":
      return "Agence";
    default:
      return "Aucun abonnement";
  }
}

function readableBillingStatus(status: string) {
  switch (status) {
    case "active":
      return "Actif";
    case "trialing":
      return "Période d’essai";
    case "past_due":
      return "Paiement en retard";
    case "unpaid":
      return "Impayé";
    case "canceled":
      return "Résilié";
    case "incomplete":
      return "Paiement incomplet";
    case "incomplete_expired":
      return "Expiré";
    default:
      return status || "Inactif";
  }
}

function formatBillingDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
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

export default function DashboardPage() {
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
    router.push("/builder");
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
    const confirmed = window.confirm(
      `Supprimer définitivement le site "${businessName}" ?`,
    );

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

    const confirmed = window.confirm(
      `Retirer le domaine "${domainStatus.domain}" de ce site ?`,
    );

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

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">✨</div>
          <p className="mt-4 text-slate-400">Chargement de ton espace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="shrink-0 text-2xl font-black"
            >
              Lu<span className="text-blue-500">mio</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold transition hover:border-blue-500 md:hidden"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <div className="hidden text-right xl:block">
                <p className="text-xs text-slate-500">Connecté avec</p>
                <p className="text-sm font-medium">{userEmail}</p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="rounded-xl border border-amber-700 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-950"
                >
                  ⚙️ Admin
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/prospects")}
                className="relative rounded-xl border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-950"
              >
                📥 Prospects
                {!leadsLoading && newLeadsCount > 0 && (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                    {newLeadsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="rounded-xl border border-violet-700 px-4 py-2 text-sm font-bold text-violet-300 transition hover:bg-violet-950"
              >
                💳 Abonnement
              </button>

              <button
                type="button"
                onClick={createSite}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold transition hover:bg-blue-500"
              >
                + Nouveau site
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950"
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
                  ⚙️ Administration
                </button>
              )}

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
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
              Dashboard
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Mes sites
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
            + Créer un nouveau site
          </button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "all"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Tous les sites</p>
            <p className="mt-1 text-3xl font-black">{sites.length}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("published")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "published"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Publiés</p>
            <p className="mt-1 text-3xl font-black text-emerald-400">
              {publishedSites}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "draft"
                ? "border-amber-500 bg-amber-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Brouillons</p>
            <p className="mt-1 text-3xl font-black text-amber-400">
              {draftSites}
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/prospects")}
            className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-4 text-left transition hover:border-emerald-500"
          >
            <p className="text-sm text-emerald-300">Prospects</p>

            {leadsLoading ? (
              <p className="mt-3 text-sm text-slate-500">Chargement...</p>
            ) : (
              <>
                <p className="mt-1 text-3xl font-black text-emerald-400">
                  {newLeadsCount}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {leads.length} demande{leads.length > 1 ? "s" : ""} au total
                </p>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="rounded-2xl border border-violet-800 bg-violet-950/30 p-4 text-left transition hover:border-violet-500"
          >
            <p className="text-sm text-violet-300">Abonnement</p>

            {billingLoading ? (
              <p className="mt-3 text-sm text-slate-500">Chargement...</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-black">{planName}</p>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    subscriptionActive
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}
                >
                  {billingStatus}
                </p>
              </>
            )}
          </button>
        </div>

        {!billingLoading && (
          <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Formule actuelle
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-xl font-black">{planName}</p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      subscriptionActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {billingStatus}
                  </span>
                </div>

                {billing?.currentPeriodEnd && (
                  <p className="mt-2 text-sm text-slate-500">
                    {billing.cancelAtPeriodEnd
                      ? "Fin de l’abonnement prévue le "
                      : "Prochain renouvellement : "}
                    {formatBillingDate(billing.currentPeriodEnd)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="rounded-xl border border-violet-700 px-5 py-3 text-sm font-bold text-violet-300 hover:bg-violet-950"
              >
                {subscriptionActive
                  ? "Gérer mon abonnement"
                  : "Voir les formules"}
              </button>
            </div>
          </div>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                Sites
              </p>
              <h2 className="mt-2 text-2xl font-black">Tes sites</h2>
              <p className="mt-1 text-sm text-slate-500">
                Accède directement aux sites que tu gères le plus récemment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/sites")}
              className="rounded-xl border border-blue-800 px-4 py-2 text-sm font-bold text-blue-300 transition hover:bg-blue-950"
            >
              Voir tous les sites →
            </button>
          </div>

          {sitesLoading ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500">
              Chargement des sites...
            </div>
          ) : sites.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-7 text-center">
              <p className="font-black">Aucun site pour le moment</p>
              <p className="mt-2 text-sm text-slate-500">
                Crée ton premier site avec Lumio.
              </p>
              <button
                type="button"
                onClick={createSite}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black hover:bg-blue-500"
              >
                + Créer un site
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sites.slice(0, 3).map((savedSite) => (
                <article
                  key={`dashboard-site-${savedSite.id}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black">
                        {savedSite.businessName}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {savedSite.activity} · {savedSite.city}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                        savedSite.published
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {savedSite.published ? "Publié" : "Brouillon"}
                    </span>
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
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
                Commercial
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Pipeline commercial
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Prospects créés sur 30 jours, classés selon leur statut actuel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/prospects")}
              className="rounded-xl border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-950"
            >
              Ouvrir le CRM →
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
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

            <div className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4">
              <p className="text-sm text-blue-300">
                Devis envoyés
              </p>
              <p className="mt-1 text-2xl font-black text-blue-400">
                {commercialStats.quoteSent30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Statut actuel
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4">
              <p className="text-sm text-emerald-300">
                Gagnés
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {commercialStats.won30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Clients convertis
              </p>
            </div>

            <div className="rounded-2xl border border-red-900/70 bg-red-950/20 p-4">
              <p className="text-sm text-red-300">
                Perdus
              </p>
              <p className="mt-1 text-2xl font-black text-red-400">
                {commercialStats.lost30d}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Opportunités perdues
              </p>
            </div>

            <div className="rounded-2xl border border-violet-900/70 bg-violet-950/20 p-4">
              <p className="text-sm text-violet-300">
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

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-violet-900/70 bg-violet-950/20 p-4">
              <p className="text-sm text-violet-300">
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

            <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4">
              <p className="text-sm text-emerald-300">
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

            <div className="rounded-2xl border border-red-900/70 bg-red-950/20 p-4">
              <p className="text-sm text-red-300">
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

            <div className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4">
              <p className="text-sm text-blue-300">
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
                Voir tous les prospects →
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-4">
                  <p className="text-sm text-cyan-300">
                    Visiteurs uniques
                  </p>

                  <p className="mt-1 text-3xl font-black text-cyan-400">
                    {analytics.visitors30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Sur les 30 derniers jours
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4">
                  <p className="text-sm text-blue-300">
                    Pages vues
                  </p>

                  <p className="mt-1 text-3xl font-black text-blue-400">
                    {analytics.views30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Toutes visites confondues
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4">
                  <p className="text-sm text-emerald-300">
                    Prospects
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-400">
                    {analytics.leads30d}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Demandes reçues sur 30 jours
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-900/70 bg-violet-950/20 p-4">
                  <p className="text-sm text-violet-300">
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
                        className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_repeat(4,minmax(90px,1fr))] md:items-center"
                      >
                        <div>
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
            <span className="text-lg">⌂</span>
            <span>Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/sites")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
            aria-label="Mes sites"
          >
            <span className="text-lg">▣</span>
            <span>Sites</span>
          </button>

          <button
            type="button"
            onClick={createSite}
            className="mx-auto flex h-14 w-14 -translate-y-2 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-light text-white shadow-lg shadow-blue-950/60 transition hover:bg-blue-500"
            aria-label="Créer un nouveau site"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => router.push("/prospects")}
            className="relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
            aria-label="Prospects"
          >
            <span className="text-lg">✉</span>
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
            <span className="text-lg">◈</span>
            <span>Abonnement</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
