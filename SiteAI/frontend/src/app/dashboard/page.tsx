"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DesignStyle =
  | "moderne"
  | "elegant"
  | "artisan";

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

type FilterType =
  | "all"
  | "published"
  | "draft";

export default function DashboardPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] =
    useState(true);

  const [sitesLoading, setSitesLoading] =
    useState(true);

  const [userEmail, setUserEmail] =
    useState("");

  const [sites, setSites] =
    useState<SavedSite[]>([]);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [deletingID, setDeletingID] =
    useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data,
          error: sessionError,
        } =
          await supabase.auth.getSession();

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

        setUserEmail(
          data.session.user.email ?? "",
        );

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

  async function loadSites() {
    setSitesLoading(true);
    setError("");

    try {
      const response =
        await authenticatedFetch(
          "/sites",
        );

      if (!response.ok) {
        throw new Error(
          "Impossible de récupérer les sites.",
        );
      }

      const data: SavedSite[] =
        await response.json();

      setSites(data);
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de charger tes sites.",
      );
    } finally {
      setSitesLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.replace("/auth");
    router.refresh();
  }

  function createSite() {
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.push("/");
  }

  function editSite(
    id: number,
  ) {
    sessionStorage.setItem(
      "siteai_site_to_open",
      String(id),
    );

    router.push("/");
  }

  function viewPublicSite(
    slug: string,
  ) {
    if (!slug) {
      return;
    }

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
    const confirmed =
      window.confirm(
        `Supprimer définitivement le site "${businessName}" ?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingID(id);
    setError("");

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

      setSites(
        (currentSites) =>
          currentSites.filter(
            (site) =>
              site.id !== id,
          ),
      );
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de supprimer ce site.",
      );
    } finally {
      setDeletingID(null);
    }
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
      },
    );
  }

  const publishedSites =
    sites.filter(
      (site) =>
        site.published,
    ).length;

  const draftSites =
    sites.length -
    publishedSites;

  const filteredSites =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return sites.filter(
        (site) => {
          const matchesSearch =
            query === "" ||
            site.businessName
              .toLowerCase()
              .includes(query) ||
            site.activity
              .toLowerCase()
              .includes(query) ||
            site.city
              .toLowerCase()
              .includes(query);

          const matchesFilter =
            filter === "all" ||
            (
              filter ===
                "published" &&
              site.published
            ) ||
            (
              filter ===
                "draft" &&
              !site.published
            );

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      sites,
      search,
      filter,
    ]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Chargement de ton espace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
            className="text-2xl font-black"
          >
            Site
            <span className="text-blue-500">
              AI
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <p className="text-xs text-slate-500">
                Connecté avec
              </p>

              <p className="text-sm font-medium">
                {userEmail}
              </p>
            </div>

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
              Gère tous tes sites clients depuis ton espace SiteAI.
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

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setFilter("all")
            }
            className={`rounded-2xl border p-6 text-left transition ${
              filter === "all"
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">
              Tous les sites
            </p>

            <p className="mt-2 text-4xl font-black">
              {sites.length}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "published",
              )
            }
            className={`rounded-2xl border p-6 text-left transition ${
              filter ===
              "published"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">
              Publiés
            </p>

            <p className="mt-2 text-4xl font-black text-emerald-400">
              {publishedSites}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("draft")
            }
            className={`rounded-2xl border p-6 text-left transition ${
              filter === "draft"
                ? "border-amber-500 bg-amber-500/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">
              Brouillons
            </p>

            <p className="mt-2 text-4xl font-black text-amber-400">
              {draftSites}
            </p>
          </button>
        </div>

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
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher par entreprise, activité ou ville..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 lg:max-w-xl"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilter("all")
                }
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
                onClick={() =>
                  setFilter(
                    "published",
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  filter ===
                  "published"
                    ? "bg-emerald-600"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Publiés
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("draft")
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  filter ===
                  "draft"
                    ? "bg-amber-600"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Brouillons
              </button>

              <button
                type="button"
                onClick={loadSites}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-blue-500"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {filter === "all"
                ? "Tous mes sites"
                : filter ===
                    "published"
                  ? "Sites publiés"
                  : "Brouillons"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredSites.length} résultat
              {filteredSites.length >
              1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        {sitesLoading ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-slate-400">
              Chargement de tes sites...
            </p>
          </div>
        ) : sites.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <div className="text-5xl">
              ✨
            </div>

            <h3 className="mt-5 text-2xl font-bold">
              Aucun site pour le moment
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-slate-400">
              Crée ton premier site professionnel avec SiteAI.
            </p>

            <button
              type="button"
              onClick={createSite}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold transition hover:bg-blue-500"
            >
              Créer mon premier site
            </button>
          </div>
        ) : filteredSites.length ===
          0 ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            <div className="text-5xl">
              🔎
            </div>

            <h3 className="mt-5 text-xl font-bold">
              Aucun résultat
            </h3>

            <p className="mt-2 text-slate-400">
              Essaie une autre recherche ou change le filtre.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="mt-5 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold hover:border-blue-500"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredSites.map(
              (savedSite) => {
                const heroImage =
                  savedSite.site
                    ?.heroImageUrl;

                const logo =
                  savedSite.site
                    ?.logoUrl;

                return (
                  <article
                    key={
                      savedSite.id
                    }
                    className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-blue-950/20"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-800">
                      {heroImage ? (
                        <img
                          src={
                            heroImage
                          }
                          alt={
                            savedSite.businessName
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                          {logo ? (
                            <img
                              src={logo}
                              alt={
                                savedSite.businessName
                              }
                              className="h-24 w-24 rounded-2xl bg-white object-contain p-3"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-5xl">
                                ✨
                              </div>

                              <p className="mt-3 text-sm text-slate-500">
                                SiteAI
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="absolute left-4 top-4">
                        {savedSite.published ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-950/90 px-3 py-1.5 text-xs font-bold text-emerald-400 backdrop-blur">
                            ● Publié
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-500/30 bg-amber-950/90 px-3 py-1.5 text-xs font-bold text-amber-400 backdrop-blur">
                            ● Brouillon
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {logo && (
                          <img
                            src={logo}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1"
                          />
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-bold">
                            {
                              savedSite.businessName
                            }
                          </h3>

                          <p className="mt-1 truncate text-sm text-slate-400">
                            {
                              savedSite.activity
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3 border-t border-slate-800 pt-5 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">
                            Ville
                          </span>

                          <span className="truncate font-medium">
                            {savedSite.city ||
                              "Non renseignée"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">
                            Design
                          </span>

                          <span className="font-medium capitalize">
                            {
                              savedSite.designStyle
                            }
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">
                            Dernière modification
                          </span>

                          <span className="font-medium">
                            {formatDate(
                              savedSite.updatedAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            editSite(
                              savedSite.id,
                            )
                          }
                          className="col-span-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold transition hover:bg-blue-500"
                        >
                          ✏️ Modifier le site
                        </button>

                        {savedSite.published &&
                        savedSite.publicSlug ? (
                          <button
                            type="button"
                            onClick={() =>
                              viewPublicSite(
                                savedSite.publicSlug,
                              )
                            }
                            className="rounded-xl border border-emerald-800 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-950"
                          >
                            🌍 Voir
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              editSite(
                                savedSite.id,
                              )
                            }
                            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500"
                          >
                            🚀 Publier
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            deletingID ===
                            savedSite.id
                          }
                          onClick={() =>
                            deleteSite(
                              savedSite.id,
                              savedSite.businessName,
                            )
                          }
                          className="rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingID ===
                          savedSite.id
                            ? "..."
                            : "🗑️ Supprimer"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </main>
  );
}