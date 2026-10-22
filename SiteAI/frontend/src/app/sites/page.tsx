"use client";







import "../app-theme.css";
import LumioAssistant from "@/components/LumioAssistant";
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







export default function SitesPage() {



  const router = useRouter();







  const [authLoading, setAuthLoading] = useState(true);



  const [sitesLoading, setSitesLoading] = useState(true);



  const [sites, setSites] = useState<SavedSite[]>([]);



  const [search, setSearch] = useState("");



  const [filter, setFilter] = useState<FilterType>("all");



  const [error, setError] = useState("");



  const [deletingID, setDeletingID] = useState<number | null>(null);

  const [duplicatingID, setDuplicatingID] = useState<number | null>(null);

  const [shareFeedback, setShareFeedback] = useState<ShareFeedback | null>(null);







  const [billingLoading, setBillingLoading] = useState(true);



  const [billing, setBilling] = useState<BillingStatus | null>(null);







  const [domainPanelSiteID, setDomainPanelSiteID] =



    useState<number | null>(null);



  const [domainInput, setDomainInput] = useState("");



  const [domainStatus, setDomainStatus] =



    useState<DomainStatus | null>(null);



  const [domainLoading, setDomainLoading] = useState(false);



  const [domainActionLoading, setDomainActionLoading] =



    useState(false);



  const [domainError, setDomainError] = useState("");







  useEffect(() => {



    let active = true;







    async function initialize() {



      try {



        const { data, error: sessionError } =



          await supabase.auth.getSession();







        if (sessionError || !data.session) {



          if (active) {



            setAuthLoading(false);



            router.replace("/auth");



          }



          return;



        }







        if (!active) return;







        setAuthLoading(false);



        await Promise.all([



          // These loaders are stable for this one-time authenticated initialization.
          // eslint-disable-next-line react-hooks/immutability
          loadSites(),



          // eslint-disable-next-line react-hooks/immutability
          loadBilling(),



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



    const { data, error: sessionError } =



      await supabase.auth.getSession();







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



      const response =



        await authenticatedFetch("/stripe/status");







      if (!response.ok) {



        throw new Error(



          "Impossible de récupérer l’abonnement.",



        );



      }







      const data: BillingStatus =



        await response.json();







      setBilling(data);



    } catch (err) {



      console.error(err);



      setBilling(null);



    } finally {



      setBillingLoading(false);



    }



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







    window.open(



      `/site/${slug}`,



      "_blank",



      "noopener,noreferrer",



    );



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



  async function deleteSite(



    id: number,



    businessName: string,



  ) {



    const confirmed = window.confirm(



      `Supprimer définitivement le site "${businessName}" ?`,



    );







    if (!confirmed) return;







    setDeletingID(id);



    setError("");







    try {



      const response = await authenticatedFetch(



        `/sites/${id}`,



        {



          method: "DELETE",



        },



      );







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



      const response =



        await authenticatedFetch(



          `/sites/${siteID}/domain`,



        );







      if (!response.ok) {



        const message =



          await response.text();







        throw new Error(



          message ||



            "Impossible de récupérer le domaine.",



        );



      }







      const data: DomainStatus =



        await response.json();







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



      const response =



        await authenticatedFetch(



          `/sites/${siteID}/domain`,



          {



            method: "POST",



            body: JSON.stringify({



              domain: cleanDomain,



            }),



          },



        );







      if (!response.ok) {



        const message =



          await response.text();







        throw new Error(



          message ||



            "Impossible d'ajouter ce domaine.",



        );



      }







      const data: DomainStatus =



        await response.json();







      setDomainStatus(data);



      setDomainInput(



        data.domain || cleanDomain,



      );



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



      const response =



        await authenticatedFetch(



          `/sites/${siteID}/domain/verify`,



          {



            method: "POST",



          },



        );







      if (!response.ok) {



        const message =



          await response.text();







        throw new Error(



          message ||



            "Impossible de vérifier le domaine.",



        );



      }







      const data: DomainStatus =



        await response.json();







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



    if (!domainStatus?.domain) {



      return;



    }







    const confirmed = window.confirm(



      `Retirer le domaine "${domainStatus.domain}" de ce site ?`,



    );







    if (!confirmed) {



      return;



    }







    setDomainActionLoading(true);



    setDomainError("");







    try {



      const response =



        await authenticatedFetch(



          `/sites/${siteID}/domain`,



          {



            method: "DELETE",



          },



        );







      if (!response.ok) {



        const message =



          await response.text();







        throw new Error(



          message ||



            "Impossible de retirer le domaine.",



        );



      }







      const data: DomainStatus =



        await response.json();







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



    if (!domainStatus?.domain) {



      return;



    }







    window.open(



      `https://${domainStatus.domain}`,



      "_blank",



      "noopener,noreferrer",



    );



  }







  function formatRecordValue(



    value: unknown,



  ) {



    if (typeof value === "string") {



      return value;



    }







    if (



      typeof value === "number" ||



      typeof value === "boolean"



    ) {



      return String(value);



    }







    if (



      value === null ||



      value === undefined



    ) {



      return "";



    }







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







  const publishedCount = sites.filter(



    (site) => site.published,



  ).length;







  const draftCount = sites.length - publishedCount;







  const subscriptionActive =



    billing?.status === "active" ||



    billing?.status === "trialing";







  const normalizedPlan =



    (billing?.plan ?? "")



      .trim()



      .toLowerCase();







  const planAllowsCustomDomain =



    normalizedPlan === "pro" ||



    normalizedPlan === "agence";







  const customDomainAllowed =



    subscriptionActive &&



    planAllowsCustomDomain &&



    billing?.customDomainAllowed === true;







  if (authLoading) {



    return (



      <main className="lumio-app flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="lumio-loading">
          <strong>lumio<span>.</span></strong>
          <p>Chargement de tes sites…</p>
        </div>
      </main>



    );



  }







  return (
    <>
    <main className="lumio-app min-h-screen bg-slate-950 pb-28 text-white md:pb-12">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="lumio-logo"
            aria-label="Lumio, tableau de bord"
          >
            lumio<span>.</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="hidden rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 sm:inline-flex"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={createSite}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black transition hover:bg-blue-500"
            >
              + Nouveau site
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
              Mes sites
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Tous tes sites, <em>au même endroit.</em>
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Retrouve rapidement un site, modifie-le et gère sa publication,
              son partage ou son domaine depuis un seul endroit.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "all"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Tous
            </p>
            <p className="mt-1 text-2xl font-black">{sites.length}</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Publiés
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-400">
              {publishedCount}
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Brouillons
            </p>
            <p className="mt-1 text-2xl font-black text-amber-400">
              {draftCount}
            </p>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par entreprise, activité ou ville..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setFilter("published")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                filter === "published"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Publiés
            </button>
            <button
              type="button"
              onClick={() => setFilter("draft")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                filter === "draft"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Brouillons
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {sitesLoading ? (
          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Chargement...
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-700 bg-slate-900/70 p-10 text-center">
            <p className="font-[family-name:var(--font-serif)] text-4xl italic text-slate-500">Rien ici.</p>
            <p className="mt-3 font-black">Aucun site trouvé</p>
            <p className="mt-2 text-sm text-slate-500">
              Modifie ta recherche ou crée un nouveau site.
            </p>
            <button
              type="button"
              onClick={createSite}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black hover:bg-blue-500"
            >
              + Créer un site
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSites.map((savedSite) => {
              const heroImage = savedSite.site?.heroImageUrl;
              const logo = savedSite.site?.logoUrl;
              const domainPanelOpen = domainPanelSiteID === savedSite.id;

              return (
                <article
                  key={savedSite.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-sm shadow-black/20 transition hover:border-slate-700"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-800">
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
                            className="h-16 w-16 rounded-2xl bg-white object-contain p-2.5"
                          />
                        ) : (
                          <div className="font-[family-name:var(--font-serif)] text-5xl tracking-tight text-slate-500">lumio<span className="text-blue-500">.</span></div>
                        )}
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${
                          savedSite.published
                            ? "bg-emerald-950/90 text-emerald-400"
                            : "bg-amber-950/90 text-amber-400"
                        }`}
                      >
                        {savedSite.published ? "● Publié" : "● Brouillon"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-black">
                        {savedSite.businessName}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {savedSite.activity} · {savedSite.city}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        Modifié le {formatDate(savedSite.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => editSite(savedSite.id)}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black transition hover:bg-blue-500"
                      >
                        Modifier
                      </button>

                      {savedSite.published && savedSite.publicSlug && (
                        <button
                          type="button"
                          onClick={() => viewPublicSite(savedSite.publicSlug)}
                          className="rounded-xl border border-emerald-800 px-4 py-3 text-sm font-bold text-emerald-400 transition hover:bg-emerald-950"
                        >
                          Voir
                        </button>
                      )}
                    </div>

                    <details className="group mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
                      <summary className="cursor-pointer list-none px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-800">
                        ••• Plus d&apos;actions
                      </summary>

                      <div className="space-y-2 border-t border-slate-800 p-3">
                        <button
                          type="button"
                          disabled={duplicatingID === savedSite.id}
                          onClick={() =>
                            duplicateSite(savedSite.id, savedSite.businessName)
                          }
                          className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {duplicatingID === savedSite.id
                            ? "Duplication..."
                            : "Dupliquer"}
                        </button>

                        {savedSite.published && savedSite.publicSlug && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void copyPublicSite(
                                    savedSite.id,
                                    savedSite.publicSlug,
                                  )
                                }
                                className="rounded-xl border border-slate-700 px-3 py-3 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
                              >
                                Copier
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void sharePublicSite(
                                    savedSite.id,
                                    savedSite.publicSlug,
                                    savedSite.businessName,
                                  )
                                }
                                className="rounded-xl border border-slate-700 px-3 py-3 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
                              >
                                Partager
                              </button>
                            </div>

                            {shareFeedback?.siteID === savedSite.id && (
                              <p
                                role="status"
                                className={`text-center text-xs ${
                                  shareFeedback.error
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                }`}
                              >
                                {shareFeedback.message}
                              </p>
                            )}
                          </>
                        )}

                        {billingLoading ? (
                          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-500">
                            Vérification du domaine...
                          </div>
                        ) : customDomainAllowed ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openDomainPanel(savedSite.id)}
                              className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                domainPanelOpen
                                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                  : "border-blue-800 text-blue-400 hover:bg-blue-950"
                              }`}
                            >
                              {domainPanelOpen
                                ? "Fermer le domaine"
                                : "Gérer le domaine"}
                            </button>

                            {domainPanelOpen && (
                              <div className="rounded-2xl border border-blue-900/60 bg-slate-950 p-4">
                                <p className="font-black">Domaine personnalisé</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  Exemple : monentreprise.fr
                                </p>

                                {domainLoading ? (
                                  <p className="mt-4 text-sm text-slate-400">
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
                                      className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                                          <p className="text-xs uppercase text-slate-500">
                                            Domaine
                                          </p>
                                          <p className="mt-2 break-all font-black">
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
                                              fournisseur où ton domaine a été
                                              acheté.
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
                                                        Nom :{" "}
                                                        {verification.domain}
                                                      </p>
                                                    )}
                                                    {verification.value && (
                                                      <p className="mt-1 break-all">
                                                        Valeur :{" "}
                                                        {verification.value}
                                                      </p>
                                                    )}
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {(domainStatus.recommendedCNAME ?? [])
                                          .length > 0 && (
                                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                                            <p className="font-bold">
                                              CNAME recommandé
                                            </p>
                                            <div className="mt-3 space-y-2">
                                              {(
                                                domainStatus.recommendedCNAME ??
                                                []
                                              ).map((record, index) => (
                                                <div
                                                  key={index}
                                                  className="rounded-lg bg-slate-950 p-3 text-xs"
                                                >
                                                  <p className="break-all">
                                                    {formatRecordValue(
                                                      record.value,
                                                    )}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {(domainStatus.recommendedIPv4 ?? [])
                                          .length > 0 && (
                                          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                                            <p className="font-bold">
                                              Adresse IPv4 recommandée
                                            </p>
                                            <div className="mt-3 space-y-2">
                                              {(
                                                domainStatus.recommendedIPv4 ??
                                                []
                                              ).map((record, index) => (
                                                <div
                                                  key={index}
                                                  className="rounded-lg bg-slate-950 p-3 text-xs"
                                                >
                                                  <p className="break-all">
                                                    {formatRecordValue(
                                                      record.value,
                                                    )}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {domainStatus.message && (
                                          <p className="rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-400">
                                            {domainStatus.message}
                                          </p>
                                        )}

                                        <button
                                          type="button"
                                          disabled={domainActionLoading}
                                          onClick={() =>
                                            verifyDomain(savedSite.id)
                                          }
                                          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
                                        >
                                          {domainActionLoading
                                            ? "Vérification..."
                                            : "Vérifier le domaine"}
                                        </button>

                                        {domainStatus.verified &&
                                          domainStatus.configured && (
                                            <button
                                              type="button"
                                              onClick={openCustomDomain}
                                              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500"
                                            >
                                              Ouvrir le domaine
                                            </button>
                                          )}

                                        <button
                                          type="button"
                                          disabled={domainActionLoading}
                                          onClick={() =>
                                            deleteDomain(savedSite.id)
                                          }
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
                          </>
                        ) : billing ? (
                          <button
                            type="button"
                            onClick={() => router.push("/pricing")}
                            className="w-full rounded-xl border border-violet-800 px-4 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-950"
                          >
                            Domaine personnalisé · Pro
                          </button>
                        ) : (
                          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-500">
                            Domaine personnalisé indisponible pour le moment.
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={deletingID === savedSite.id}
                          onClick={() =>
                            deleteSite(savedSite.id, savedSite.businessName)
                          }
                          className="w-full rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                        >
                          {deletingID === savedSite.id
                            ? "Suppression..."
                            : "Supprimer"}
                        </button>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/98 px-2 pt-2 backdrop-blur md:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
        }}
        aria-label="Navigation mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
          >
            <span className="text-lg">⌂</span>
            <span>Accueil</span>
          </button>

          <button
            type="button"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-blue-400"
          >
            <span className="text-lg">▣</span>
            <span>Sites</span>
          </button>

          <button
            type="button"
            onClick={createSite}
            className="mx-auto flex h-14 w-14 -translate-y-2 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-light text-white shadow-lg shadow-blue-950/60"
            aria-label="Créer un nouveau site"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => router.push("/prospects")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
          >
            <span className="text-lg">✉</span>
            <span>Prospects</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-slate-300"
          >
            <span className="text-lg">◈</span>
            <span>Abonnement</span>
          </button>
        </div>
      </nav>
    </main>
      <LumioAssistant page="Mes sites" mobileOffset={96} />
    </>
  );
}
