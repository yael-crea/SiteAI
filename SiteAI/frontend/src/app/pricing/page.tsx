"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlanName =
  | "essentiel"
  | "pro"
  | "agence";

type BillingStatus = {
  plan: string;
  status: string;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  canManage: boolean;
};

type Plan = {
  id: PlanName;
  name: string;
  price: string;
  description: string;
  highlighted?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "19,90 €",
    description:
      "Pour un indépendant ou une petite entreprise qui veut un site professionnel rapidement.",
    features: [
      "1 site publié",
      "Génération avec l’IA",
      "Templates Moderne, Élégant et Artisan",
      "Éditeur manuel",
      "URL publique SiteAI",
      "Sauvegarde du site",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "39,90 €",
    description:
      "Pour les professionnels qui veulent davantage de possibilités et leur propre domaine.",
    highlighted: true,
    features: [
      "Jusqu’à 3 sites publiés",
      "Toutes les fonctions Essentiel",
      "Galerie photos",
      "SEO avancé",
      "Domaine personnalisé",
      "Modification avec l’IA",
    ],
  },
  {
    id: "agence",
    name: "Agence",
    price: "79,90 €",
    description:
      "Pour gérer plusieurs clients et plusieurs sites depuis le même compte.",
    features: [
      "Jusqu’à 10 sites publiés",
      "Toutes les fonctions Pro",
      "Domaines personnalisés",
      "Gestion multi-sites",
      "Idéal pour agences et freelances",
      "Priorité sur les futures fonctions",
    ],
  },
];

function formatDate(
  value?: string,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
}

function readableStatus(
  status: string,
) {
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

export default function PricingPage() {
  const router =
    useRouter();

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    billingLoading,
    setBillingLoading,
  ] = useState(true);

  const [
    billing,
    setBilling,
  ] =
    useState<BillingStatus | null>(
      null,
    );

  const [
    userEmail,
    setUserEmail,
  ] = useState("");

  const [
    checkoutLoading,
    setCheckoutLoading,
  ] =
    useState<PlanName | null>(
      null,
    );

  const [
    portalLoading,
    setPortalLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data,
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !data.session
        ) {
          if (active) {
            setAuthLoading(
              false,
            );

            router.replace(
              "/auth",
            );
          }

          return;
        }

        if (!active) {
          return;
        }

        setUserEmail(
          data.session.user
            .email ?? "",
        );

        setAuthLoading(false);

        const params =
          new URLSearchParams(
            window.location.search,
          );

        if (
          params.get(
            "checkout",
          ) === "success"
        ) {
          setMessage(
            "Paiement validé. Ton abonnement est en cours d’activation.",
          );
        }

        if (
          params.get(
            "checkout",
          ) === "cancel"
        ) {
          setMessage(
            "Paiement annulé. Aucun abonnement n’a été créé.",
          );
        }

        await loadBilling();
      } catch (
        err
      ) {
        console.error(err);

        if (active) {
          setAuthLoading(
            false,
          );

          router.replace(
            "/auth",
          );
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
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !data.session
    ) {
      await supabase.auth.signOut();

      router.replace(
        "/auth",
      );

      throw new Error(
        "Session absente",
      );
    }

    return data.session
      .access_token;
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
      !headers.has(
        "Content-Type",
      )
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
          cache:
            "no-store",
        },
      );

    if (
      response.status ===
      401
    ) {
      await supabase.auth.signOut();

      router.replace(
        "/auth",
      );
    }

    return response;
  }

  async function loadBilling() {
    setBillingLoading(true);
    setError("");

    try {
      const response =
        await authenticatedFetch(
          "/stripe/status",
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            "Impossible de récupérer ton abonnement.",
        );
      }

      const data: BillingStatus =
        await response.json();

      setBilling(data);
    } catch (
      err
    ) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de récupérer ton abonnement.",
      );
    } finally {
      setBillingLoading(
        false,
      );
    }
  }

  async function startCheckout(
    plan: PlanName,
  ) {
    setCheckoutLoading(
      plan,
    );

    setError("");
    setMessage("");

    try {
      const response =
        await authenticatedFetch(
          "/stripe/checkout",
          {
            method: "POST",
            body: JSON.stringify(
              {
                plan,
              },
            ),
          },
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            "Impossible de démarrer le paiement.",
        );
      }

      const data =
        (await response.json()) as {
          url?: string;
        };

      if (!data.url) {
        throw new Error(
          "Stripe n’a pas retourné de page de paiement.",
        );
      }

      window.location.href =
        data.url;
    } catch (
      err
    ) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer le paiement.",
      );

      setCheckoutLoading(
        null,
      );
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setError("");

    try {
      const response =
        await authenticatedFetch(
          "/stripe/portal",
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            "Impossible d’ouvrir la gestion de l’abonnement.",
        );
      }

      const data =
        (await response.json()) as {
          url?: string;
        };

      if (!data.url) {
        throw new Error(
          "Stripe n’a pas retourné l’URL du portail.",
        );
      }

      window.location.href =
        data.url;
    } catch (
      err
    ) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’ouvrir la gestion de l’abonnement.",
      );

      setPortalLoading(
        false,
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.replace(
      "/auth",
    );

    router.refresh();
  }

  const currentPlan =
    (
      billing?.plan || "free"
    ).toLowerCase();

  const activeSubscription =
    Boolean(
      billing?.hasSubscription,
    );

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Chargement...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5">
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

              <p className="text-sm">
                {userEmail}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard",
                )
              }
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-blue-500"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            Abonnements SiteAI
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            Choisis la formule
            adaptée à ton activité
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Tous les paiements sont
            gérés par Stripe. Tu peux
            ensuite gérer ou résilier
            ton abonnement depuis ton
            espace client.
          </p>
        </div>

        {message && (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-blue-800 bg-blue-950/30 p-5 text-center text-blue-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5 text-center text-red-300">
            {error}
          </div>
        )}

        <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          {billingLoading ? (
            <p className="text-center text-slate-400">
              Vérification de ton
              abonnement...
            </p>
          ) : (
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Ton abonnement
                </p>

                <p className="mt-2 text-xl font-black capitalize">
                  {currentPlan ===
                  "free"
                    ? "Aucun abonnement"
                    : currentPlan}
                </p>

                {billing && (
                  <p className="mt-2 text-sm text-slate-400">
                    Statut :{" "}
                    <span className="font-semibold text-white">
                      {readableStatus(
                        billing.status,
                      )}
                    </span>
                  </p>
                )}

                {billing?.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-slate-500">
                    {billing.cancelAtPeriodEnd
                      ? "Fin prévue le "
                      : "Prochain renouvellement : "}
                    {formatDate(
                      billing.currentPeriodEnd,
                    )}
                  </p>
                )}
              </div>

              {billing?.canManage && (
                <button
                  type="button"
                  disabled={
                    portalLoading
                  }
                  onClick={
                    openPortal
                  }
                  className="rounded-xl border border-blue-700 px-5 py-3 font-bold text-blue-400 hover:bg-blue-950 disabled:opacity-50"
                >
                  {portalLoading
                    ? "Ouverture..."
                    : "Gérer mon abonnement"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-7 lg:grid-cols-3">
          {plans.map(
            (plan) => {
              const isCurrent =
                currentPlan ===
                  plan.id &&
                activeSubscription;

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border p-7 ${
                    plan.highlighted
                      ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-950/30"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wider">
                      Populaire
                    </span>
                  )}

                  <div>
                    <h2 className="text-2xl font-black">
                      {plan.name}
                    </h2>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      {
                        plan.description
                      }
                    </p>

                    <div className="mt-7 flex items-end gap-2">
                      <span className="text-4xl font-black">
                        {plan.price}
                      </span>

                      <span className="pb-1 text-slate-500">
                        / mois
                      </span>
                    </div>
                  </div>

                  <ul className="mt-8 flex-1 space-y-4">
                    {plan.features.map(
                      (
                        feature,
                      ) => (
                        <li
                          key={
                            feature
                          }
                          className="flex gap-3 text-sm text-slate-300"
                        >
                          <span className="font-black text-emerald-400">
                            ✓
                          </span>

                          <span>
                            {
                              feature
                            }
                          </span>
                        </li>
                      ),
                    )}
                  </ul>

                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="mt-9 w-full rounded-xl bg-emerald-600/20 px-5 py-4 font-black text-emerald-400"
                    >
                      ✓ Formule actuelle
                    </button>
                  ) : activeSubscription ? (
                    <button
                      type="button"
                      onClick={
                        openPortal
                      }
                      disabled={
                        portalLoading
                      }
                      className="mt-9 w-full rounded-xl border border-slate-700 px-5 py-4 font-black hover:border-blue-500 disabled:opacity-50"
                    >
                      Gérer / changer de formule
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        checkoutLoading !==
                        null
                      }
                      onClick={() =>
                        startCheckout(
                          plan.id,
                        )
                      }
                      className={`mt-9 w-full rounded-xl px-5 py-4 font-black disabled:opacity-50 ${
                        plan.highlighted
                          ? "bg-blue-600 hover:bg-blue-500"
                          : "bg-white text-slate-950 hover:bg-slate-200"
                      }`}
                    >
                      {checkoutLoading ===
                      plan.id
                        ? "Ouverture de Stripe..."
                        : `Choisir ${plan.name}`}
                    </button>
                  )}
                </article>
              );
            },
          )}
        </div>

        <div className="mx-auto mt-12 max-w-3xl text-center text-sm leading-6 text-slate-500">
          En environnement de test,
          utilise uniquement les cartes
          de test Stripe. Aucun vrai
          paiement n&apos;est débité.
        </div>
      </section>
    </main>
  );
}
