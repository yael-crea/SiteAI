"use client";
import { type DesignStyle } from "@/lib/designStyles";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";



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

export default function SitesPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState("");
  const [deletingID, setDeletingID] = useState<number | null>(null);

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
        await loadSites();
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

    window.open(
      `/site/${slug}`,
      "_blank",
      "noopener,noreferrer",
    );
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
    } catch (err) {
      console.error(err);
      setError("Impossible de supprimer ce site.");
    } finally {
      setDeletingID(null);
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

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-4xl">✨</div>
          <p className="mt-4 text-sm text-slate-400">
            Chargement de tes sites...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-white md:pb-10">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-xl font-black"
          >
            Site<span className="text-blue-500">AI</span>
          </button>

          <button
            type="button"
            onClick={createSite}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
          >
            + Nouveau
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm font-semibold text-slate-400 hover:text-white"
        >
          ← Retour au dashboard
        </button>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
            Mes sites
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Tous tes sites
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ouvre, modifie ou consulte tes sites depuis une page simple.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-3 text-center ${
              filter === "all"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            <p className="text-2xl font-black">{sites.length}</p>
            <p className="mt-1 text-xs text-slate-400">
              Tous
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("published")}
            className={`rounded-2xl border p-3 text-center ${
              filter === "published"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            <p className="text-2xl font-black text-emerald-400">
              {publishedCount}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Publiés
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`rounded-2xl border p-3 text-center ${
              filter === "draft"
                ? "border-amber-500 bg-amber-500/10"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            <p className="text-2xl font-black text-amber-400">
              {draftCount}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Brouillons
            </p>
          </button>
        </div>

        <div className="mt-5">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Rechercher un site..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 outline-none transition focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {sitesLoading ? (
          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Chargement...
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-4xl">🌐</div>
            <p className="mt-3 font-bold">
              Aucun site trouvé
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Crée ton premier site ou modifie ta recherche.
            </p>
            <button
              type="button"
              onClick={createSite}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500"
            >
              + Créer un site
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredSites.map((savedSite) => {
              const heroImage =
                savedSite.site?.heroImageUrl;
              const logo = savedSite.site?.logoUrl;

              return (
                <article
                  key={savedSite.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
                >
                  <div className="relative h-40 overflow-hidden bg-slate-800">
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
                            className="h-20 w-20 rounded-2xl bg-white object-contain p-3"
                          />
                        ) : (
                          <div className="text-4xl">✨</div>
                        )}
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
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

                  <div className="p-5">
                    <h2 className="break-words text-xl font-black">
                      {savedSite.businessName}
                    </h2>

                    <p className="mt-1 break-words text-sm text-slate-400">
                      {savedSite.activity} · {savedSite.city}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Modifié le {formatDate(savedSite.updatedAt)}
                    </p>

                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() => editSite(savedSite.id)}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500"
                      >
                        ✏️ Modifier le site
                      </button>

                      {savedSite.published &&
                        savedSite.publicSlug && (
                          <button
                            type="button"
                            onClick={() =>
                              viewPublicSite(
                                savedSite.publicSlug,
                              )
                            }
                            className="w-full rounded-xl border border-emerald-800 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-950"
                          >
                            🌍 Voir le site en ligne
                          </button>
                        )}

                      <button
                        type="button"
                        disabled={
                          deletingID === savedSite.id
                        }
                        onClick={() =>
                          deleteSite(
                            savedSite.id,
                            savedSite.businessName,
                          )
                        }
                        className="w-full rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50"
                      >
                        {deletingID === savedSite.id
                          ? "Suppression..."
                          : "🗑️ Supprimer"}
                      </button>
                    </div>
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
          paddingBottom:
            "calc(env(safe-area-inset-bottom) + 0.5rem)",
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
  );
}
