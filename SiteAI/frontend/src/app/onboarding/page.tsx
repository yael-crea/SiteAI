"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SiteSection = {
  title: string;
  text: string;
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
};

type SavedSite = {
  id: number;
};

export default function OnboardingPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [activity, setActivity] = useState("");
  const [city, setCity] = useState("Montpellier");

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          router.replace("/auth");
          return;
        }

        const response = await fetch("/api-backend/sites", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace("/auth");
          return;
        }

        if (response.ok) {
          const sites: SavedSite[] = await response.json();

          if (sites.length > 0) {
            router.replace("/dashboard");
            return;
          }
        }

        if (active) {
          setChecking(false);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setChecking(false);
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
    } = await supabase.auth.getSession();

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanBusinessName = businessName.trim();
    const cleanActivity = activity.trim();
    const cleanCity = city.trim();

    setError("");

    if (!cleanBusinessName) {
      setError("Entre le nom de ton entreprise.");
      return;
    }

    if (!cleanActivity) {
      setError("Indique ton activité.");
      return;
    }

    if (!cleanCity) {
      setError("Indique ta ville.");
      return;
    }

    setCreating(true);

    try {
      const generateResponse = await authenticatedFetch(
        "/generate",
        {
          method: "POST",
          body: JSON.stringify({
            businessName: cleanBusinessName,
            activity: cleanActivity,
            city: cleanCity,
            phone: "",
            services: [],
          }),
        },
      );

      if (!generateResponse.ok) {
        const message = (
          await generateResponse.text()
        ).trim();

        throw new Error(
          message ||
            "Impossible de générer ton premier site.",
        );
      }

      const generatedData: GeneratedSite =
        await generateResponse.json();

      const generatedSite: GeneratedSite = {
        ...generatedData,
        businessName:
          generatedData.businessName ||
          cleanBusinessName,
        phone: generatedData.phone ?? "",
        logoUrl: generatedData.logoUrl ?? "",
        heroImageUrl:
          generatedData.heroImageUrl ?? "",
        gallery: generatedData.gallery ?? [],
        sections: generatedData.sections ?? [],
      };

      const saveResponse = await authenticatedFetch(
        "/sites",
        {
          method: "POST",
          body: JSON.stringify({
            site: generatedSite,
            activity: cleanActivity,
            city: cleanCity,
            designStyle: "moderne",
            accentColor: "#2563eb",
          }),
        },
      );

      if (!saveResponse.ok) {
        const message = (
          await saveResponse.text()
        ).trim();

        throw new Error(
          message ||
            "Le site a été généré mais n'a pas pu être sauvegardé.",
        );
      }

      const savedSite: SavedSite =
        await saveResponse.json();

      sessionStorage.removeItem(
        "siteai_onboarding_skipped",
      );

      sessionStorage.removeItem(
        "siteai_onboarding_business_name",
      );

      sessionStorage.removeItem(
        "siteai_onboarding_activity",
      );

      sessionStorage.removeItem(
        "siteai_onboarding_city",
      );

      sessionStorage.setItem(
        "siteai_site_to_open",
        String(savedSite.id),
      );

      router.push("/builder");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer ton premier site.",
      );
    } finally {
      setCreating(false);
    }
  }

  function skipOnboarding() {
    sessionStorage.setItem(
      "siteai_onboarding_skipped",
      "true",
    );

    sessionStorage.removeItem(
      "siteai_onboarding_business_name",
    );

    sessionStorage.removeItem(
      "siteai_onboarding_activity",
    );

    sessionStorage.removeItem(
      "siteai_onboarding_city",
    );

    router.push("/dashboard");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Préparation de ton espace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-black">
            Site
            <span className="text-blue-500">
              AI
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={creating}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-800 hover:text-red-400 disabled:opacity-40"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-black">
              1
            </div>

            <div className="h-1 w-14 rounded-full bg-blue-600" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 font-black text-slate-400">
              2
            </div>

            <div className="h-1 w-14 rounded-full bg-slate-800" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 font-black text-slate-400">
              3
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
              Bienvenue sur SiteAI
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Créons ton premier site.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Renseigne simplement ton entreprise.
              SiteAI va générer automatiquement ton
              premier site, le sauvegarder puis l&apos;ouvrir
              directement dans l&apos;éditeur.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-7 md:p-9"
          >
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Nom de l&apos;entreprise
                </label>

                <input
                  value={businessName}
                  onChange={(event) =>
                    setBusinessName(
                      event.target.value,
                    )
                  }
                  placeholder="Exemple : Dupont Plomberie"
                  autoFocus
                  required
                  disabled={creating}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Activité
                </label>

                <input
                  value={activity}
                  onChange={(event) =>
                    setActivity(
                      event.target.value,
                    )
                  }
                  placeholder="Exemple : Plombier"
                  required
                  disabled={creating}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Ville
                </label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value,
                    )
                  }
                  placeholder="Montpellier"
                  required
                  disabled={creating}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {creating && (
                <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-4">
                  <p className="font-bold text-blue-300">
                    ✨ SiteAI crée ton site...
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Génération du contenu puis sauvegarde
                    de ton premier site. Cela peut prendre
                    quelques secondes.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-blue-600 px-6 py-4 font-black transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "✨ Création de ton site..."
                  : "✨ Créer automatiquement mon site"}
              </button>

              <button
                type="button"
                onClick={skipOnboarding}
                disabled={creating}
                className="w-full rounded-xl border border-slate-700 px-6 py-4 text-sm font-bold text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-40"
              >
                Passer pour l&apos;instant
              </button>
            </div>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Ton entreprise"],
              ["2", "Création par l’IA"],
              ["3", "Personnalisation"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center"
              >
                <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Étape {number}
                </div>

                <div className="mt-2 font-bold">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
