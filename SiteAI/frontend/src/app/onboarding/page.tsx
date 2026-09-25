"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SavedSite = {
  id: number;
};

export default function OnboardingPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    sessionStorage.removeItem("siteai_site_to_open");

    sessionStorage.setItem(
      "siteai_onboarding_business_name",
      cleanBusinessName,
    );
    sessionStorage.setItem(
      "siteai_onboarding_activity",
      cleanActivity,
    );
    sessionStorage.setItem(
      "siteai_onboarding_city",
      cleanCity,
    );

    sessionStorage.removeItem("siteai_onboarding_skipped");

    router.push("/builder");
  }

  function skipOnboarding() {
    sessionStorage.setItem("siteai_onboarding_skipped", "true");

    sessionStorage.removeItem("siteai_onboarding_business_name");
    sessionStorage.removeItem("siteai_onboarding_activity");
    sessionStorage.removeItem("siteai_onboarding_city");

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
          <div className="text-5xl">✨</div>
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
            Site<span className="text-blue-500">AI</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-red-800 hover:text-red-400"
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
              Parle-nous de ton entreprise.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Ces informations seront envoyées directement dans l&apos;éditeur
              pour te faire gagner du temps lors de la création de ton premier
              site.
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
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Exemple : Dupont Plomberie"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Activité
                </label>

                <input
                  value={activity}
                  onChange={(event) => setActivity(event.target.value)}
                  placeholder="Exemple : Plombier"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  Ville
                </label>

                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Montpellier"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-6 py-4 font-black transition hover:bg-blue-500"
              >
                Continuer vers mon premier site →
              </button>

              <button
                type="button"
                onClick={skipOnboarding}
                className="w-full rounded-xl border border-slate-700 px-6 py-4 text-sm font-bold text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Passer pour l&apos;instant
              </button>
            </div>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Ton entreprise"],
              ["2", "Personnalisation"],
              ["3", "Publication"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center"
              >
                <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Étape {number}
                </div>
                <div className="mt-2 font-bold">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
