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

export default function DashboardPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [deletingID, setDeletingID] = useState<number | null>(null);

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

        await Promise.all([loadSites(), loadBilling()]);
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
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-2xl font-black"
          >
            Site<span className="text-blue-500">AI</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right xl:block">
              <p className="text-xs text-slate-500">Connecté avec</p>
              <p className="text-sm font-medium">{userEmail}</p>
            </div>

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
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
              Dashboard
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Mes sites
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Gère tes sites, publications, domaines personnalisés et ton
              abonnement depuis SiteAI.
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

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-6 text-left transition ${
              filter === "all"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Tous les sites</p>
            <p className="mt-2 text-4xl font-black">{sites.length}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("published")}
            className={`rounded-2xl border p-6 text-left transition ${
              filter === "published"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Publiés</p>
            <p className="mt-2 text-4xl font-black text-emerald-400">
              {publishedSites}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`rounded-2xl border p-6 text-left transition ${
              filter === "draft"
                ? "border-amber-500 bg-amber-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">Brouillons</p>
            <p className="mt-2 text-4xl font-black text-amber-400">
              {draftSites}
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="rounded-2xl border border-violet-800 bg-violet-950/30 p-6 text-left transition hover:border-violet-500"
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
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
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

        {error && (
          <div className="mt-8 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par entreprise, activité ou ville..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 lg:max-w-xl"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  filter === "all"
                    ? "bg-blue-600"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Tous
              </button>

              <button
                type="button"
                onClick={() => setFilter("published")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  filter === "published"
                    ? "bg-emerald-600"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Publiés
              </button>

              <button
                type="button"
                onClick={() => setFilter("draft")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  filter === "draft"
                    ? "bg-amber-600"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Brouillons
              </button>

              <button
                type="button"
                onClick={() => {
                  loadSites();
                  loadBilling();
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-blue-500"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {sitesLoading ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            Chargement...
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
            Aucun site trouvé.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredSites.map((savedSite) => {
              const heroImage = savedSite.site?.heroImageUrl;
              const logo = savedSite.site?.logoUrl;
              const domainPanelOpen = domainPanelSiteID === savedSite.id;

              return (
                <article
                  key={savedSite.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-800">
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={savedSite.businessName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                        {logo ? (
                          <img
                            src={logo}
                            alt={savedSite.businessName}
                            className="h-24 w-24 rounded-2xl bg-white object-contain p-3"
                          />
                        ) : (
                          <div className="text-5xl">✨</div>
                        )}
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      {savedSite.published ? (
                        <span className="rounded-full bg-emerald-950/90 px-3 py-1 text-xs font-bold text-emerald-400">
                          ● Publié
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-950/90 px-3 py-1 text-xs font-bold text-amber-400">
                          ● Brouillon
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold">
                      {savedSite.businessName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {savedSite.activity} · {savedSite.city}
                    </p>

                    <p className="mt-3 text-xs text-slate-600">
                      Modifié le {formatDate(savedSite.updatedAt)}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => editSite(savedSite.id)}
                        className="col-span-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500"
                      >
                        ✏️ Modifier
                      </button>

                      {savedSite.published && savedSite.publicSlug ? (
                        <button
                          type="button"
                          onClick={() => viewPublicSite(savedSite.publicSlug)}
                          className="rounded-xl border border-emerald-800 px-3 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-950"
                        >
                          🌍 Voir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => editSite(savedSite.id)}
                          className="rounded-xl border border-slate-700 px-3 py-3 text-sm"
                        >
                          🚀 Publier
                        </button>
                      )}

                      {billingLoading ? (
                        <button
                          type="button"
                          disabled
                          className="rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold text-slate-500 opacity-60"
                        >
                          🌐 Domaine
                        </button>
                      ) : customDomainAllowed ? (
                        <button
                          type="button"
                          onClick={() => openDomainPanel(savedSite.id)}
                          className="rounded-xl border border-blue-800 px-3 py-3 text-sm font-semibold text-blue-400 hover:bg-blue-950"
                        >
                          🌐 Domaine
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push("/pricing")}
                          className="rounded-xl border border-violet-800 px-3 py-3 text-sm font-semibold text-violet-300 hover:bg-violet-950"
                        >
                          🔒 Domaine Pro
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingID === savedSite.id}
                        onClick={() =>
                          deleteSite(savedSite.id, savedSite.businessName)
                        }
                        className="col-span-2 rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>

                    {!billingLoading && !customDomainAllowed && (
                      <div className="mt-4 rounded-xl border border-violet-900/70 bg-violet-950/20 p-4">
                        <p className="text-sm font-bold text-violet-300">
                          🔒 Domaine personnalisé
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          Disponible avec les formules Pro ou Agence.
                        </p>

                        <button
                          type="button"
                          onClick={() => router.push("/pricing")}
                          className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
                        >
                          Voir les formules
                        </button>
                      </div>
                    )}

                    {domainPanelOpen && customDomainAllowed && (
                      <div className="mt-6 border-t border-slate-800 pt-6">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold">
                              🌐 Domaine personnalisé
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              Exemple : dupont-plomberie.fr
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={closeDomainPanel}
                            className="text-sm text-slate-500"
                          >
                            Fermer
                          </button>
                        </div>

                        {domainLoading ? (
                          <p className="mt-5 text-sm text-slate-400">
                            Chargement...
                          </p>
                        ) : (
                          <>
                            <input
                              value={domainInput}
                              onChange={(event) =>
                                setDomainInput(event.target.value)
                              }
                              placeholder="monentreprise.fr"
                              disabled={domainActionLoading}
                              className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                            />

                            {!domainStatus?.domain && (
                              <button
                                type="button"
                                disabled={domainActionLoading}
                                onClick={() => addDomain(savedSite.id)}
                                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
                              >
                                {domainActionLoading
                                  ? "Ajout..."
                                  : "Ajouter le domaine"}
                              </button>
                            )}

                            {domainStatus?.domain && (
                              <div className="mt-5 space-y-4">
                                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                                  <p className="text-xs uppercase text-slate-500">
                                    Domaine
                                  </p>

                                  <p className="mt-2 break-all font-bold">
                                    {domainStatus.domain}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        domainStatus.verified
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : "bg-amber-500/10 text-amber-400"
                                      }`}
                                    >
                                      {domainStatus.verified
                                        ? "✓ Vérifié"
                                        : "En attente de vérification"}
                                    </span>

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        domainStatus.configured
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : "bg-orange-500/10 text-orange-400"
                                      }`}
                                    >
                                      {domainStatus.configured
                                        ? "✓ DNS configuré"
                                        : "DNS à configurer"}
                                    </span>
                                  </div>
                                </div>

                                {(domainStatus.verification ?? []).length >
                                  0 && (
                                  <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
                                    <p className="font-bold text-amber-300">
                                      Vérification du domaine
                                    </p>

                                    <p className="mt-2 text-xs leading-5 text-slate-400">
                                      Ajoute ces informations chez le
                                      fournisseur où ton domaine a été acheté.
                                    </p>

                                    <div className="mt-4 space-y-3">
                                      {(domainStatus.verification ?? []).map(
                                        (verification, index) => (
                                          <div
                                            key={index}
                                            className="rounded-lg bg-slate-950 p-3 text-xs"
                                          >
                                            <p>
                                              Type :{" "}
                                              <strong>
                                                {verification.type}
                                              </strong>
                                            </p>

                                            {verification.domain && (
                                              <p className="mt-1 break-all">
                                                Nom : {verification.domain}
                                              </p>
                                            )}

                                            {verification.value && (
                                              <p className="mt-1 break-all">
                                                Valeur : {verification.value}
                                              </p>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                                {(domainStatus.recommendedCNAME ?? []).length >
                                  0 && (
                                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                                    <p className="font-bold">
                                      CNAME recommandé
                                    </p>

                                    <div className="mt-3 space-y-2">
                                      {(
                                        domainStatus.recommendedCNAME ?? []
                                      ).map((record, index) => (
                                        <div
                                          key={index}
                                          className="rounded-lg bg-slate-900 p-3 text-xs"
                                        >
                                          <p className="break-all">
                                            {formatRecordValue(record.value)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {(domainStatus.recommendedIPv4 ?? []).length >
                                  0 && (
                                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                                    <p className="font-bold">
                                      Adresse IPv4 recommandée
                                    </p>

                                    <div className="mt-3 space-y-2">
                                      {(
                                        domainStatus.recommendedIPv4 ?? []
                                      ).map((record, index) => (
                                        <div
                                          key={index}
                                          className="rounded-lg bg-slate-900 p-3 text-xs"
                                        >
                                          <p className="break-all">
                                            {formatRecordValue(record.value)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {domainStatus.message && (
                                  <p className="rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-400">
                                    {domainStatus.message}
                                  </p>
                                )}

                                <button
                                  type="button"
                                  disabled={domainActionLoading}
                                  onClick={() => verifyDomain(savedSite.id)}
                                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
                                >
                                  {domainActionLoading
                                    ? "Vérification..."
                                    : "🔄 Vérifier le domaine"}
                                </button>

                                {domainStatus.verified &&
                                  domainStatus.configured && (
                                    <button
                                      type="button"
                                      onClick={openCustomDomain}
                                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500"
                                    >
                                      🌍 Ouvrir le domaine
                                    </button>
                                  )}

                                <button
                                  type="button"
                                  disabled={domainActionLoading}
                                  onClick={() => deleteDomain(savedSite.id)}
                                  className="w-full rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50"
                                >
                                  Retirer le domaine
                                </button>
                              </div>
                            )}

                            {domainError && (
                              <p className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
                                {domainError}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
