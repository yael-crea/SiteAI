"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DesignStyle =
  | "moderne"
  | "elegant"
  | "artisan";

type SavedSite = {
  id: number;
  businessName: string;
  activity: string;
  city: string;
  phone: string;
  designStyle: DesignStyle;
  accentColor: string;
  published: boolean;
  publicSlug: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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

    router.replace("/auth");
    router.refresh();
  }

  function createSite() {
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

    router.push(
      `/site/${slug}`,
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
      <header className="border-b border-slate-800 bg-slate-950/95">
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

          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
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
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Mes sites
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Crée, modifie et gère les sites de tes clients depuis un seul endroit.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Sites
            </p>

            <p className="mt-2 text-4xl font-black">
              {sites.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Publiés
            </p>

            <p className="mt-2 text-4xl font-black text-emerald-400">
              {publishedSites}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Brouillons
            </p>

            <p className="mt-2 text-4xl font-black text-amber-400">
              {draftSites}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Tous mes sites
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Retrouve tous tes projets SiteAI.
            </p>
          </div>

          <button
            type="button"
            onClick={createSite}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold transition hover:bg-blue-500"
          >
            Créer un site
          </button>
        </div>

        {sitesLoading ? (
          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">
              Chargement de tes sites...
            </p>
          </div>
        ) : sites.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
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
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sites.map(
              (site) => (
                <article
                  key={site.id}
                  className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        {site.businessName}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {site.activity}
                      </p>
                    </div>

                    {site.published ? (
                      <span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400">
                        Publié
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-800 bg-amber-950 px-3 py-1 text-xs font-bold text-amber-400">
                        Brouillon
                      </span>
                    )}
                  </div>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        Ville
                      </span>

                      <span className="font-medium">
                        {site.city ||
                          "Non renseignée"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        Style
                      </span>

                      <span className="font-medium capitalize">
                        {site.designStyle}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        Modifié
                      </span>

                      <span className="font-medium">
                        {formatDate(
                          site.updatedAt,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-7">
                    <button
                      type="button"
                      onClick={() =>
                        editSite(
                          site.id,
                        )
                      }
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold transition hover:bg-blue-500"
                    >
                      Modifier
                    </button>

                    {site.published &&
                      site.publicSlug && (
                        <button
                          type="button"
                          onClick={() =>
                            viewPublicSite(
                              site.publicSlug,
                            )
                          }
                          className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:border-blue-500"
                        >
                          Voir le site public
                        </button>
                      )}

                    <button
                      type="button"
                      disabled={
                        deletingID ===
                        site.id
                      }
                      onClick={() =>
                        deleteSite(
                          site.id,
                          site.businessName,
                        )
                      }
                      className="mt-3 w-full rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingID ===
                      site.id
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}