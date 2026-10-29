"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import "../app-theme.css";
import dynamic from "next/dynamic";
// Assistant fermé au départ : chargé après l'affichage de la page.
const LumioAssistant = dynamic(() => import("@/components/LumioAssistant"), { ssr: false });
import { plans, CGV_VERSION, freePreviewText, domainText, aiUsageText, cancellationText, priceSuffix, priceTaxText, type PlanName } from "@/lib/commercialPlans";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


type BillingStatus = {
  isOwner?: boolean;
  plan: string;
  status: string;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  canManage: boolean;
};



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
    cgvAccepted,
    setCgvAccepted,
  ] = useState(false);

  const [
    professionalUseAccepted,
    setProfessionalUseAccepted,
  ] = useState(false);

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

        // The billing loader is stable for this one-time authenticated initialization.
        // eslint-disable-next-line react-hooks/immutability
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
    if (!cgvAccepted) {
      setError(
        "Tu dois accepter les CGV avant de continuer vers le paiement.",
      );
      return;
    }

    if (!professionalUseAccepted) {
      setError(
        "Lumio est réservé aux professionnels : coche la déclaration d'usage professionnel avant de continuer.",
      );
      return;
    }

    setCheckoutLoading(
      plan,
    );

    setError("");
    setMessage("");

    try {
      const acceptanceResponse =
        await authenticatedFetch(
          "/legal/cgv/accept",
          {
            method: "POST",
            body: JSON.stringify(
              {
                plan,
                version: CGV_VERSION,
                professionalUse: professionalUseAccepted,
              },
            ),
          },
        );

      if (!acceptanceResponse.ok) {
        const acceptanceText =
          await acceptanceResponse.text();

        throw new Error(
          acceptanceText ||
            "Impossible d'enregistrer l'acceptation des CGV.",
        );
      }

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

      window.location.assign(
        data.url,
      );
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

      window.location.assign(
        data.url,
      );
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
      <main className="lumio-app flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="lumio-loading">
          <strong>lumio<span>.</span></strong>
          <p>Chargement des formules…</p>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className="lumio-app min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
            className="lumio-logo"
            aria-label="Lumio, tableau de bord"
          >
            lumio<span>.</span>
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
            Abonnements Lumio
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            Choisis la formule <em>adaptée à ton activité.</em>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Prépare ton site gratuitement. Passe à un abonnement mensuel quand tu es prêt à le publier.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-blue-800 bg-blue-950/30 p-6 text-center">
          <h2 className="text-xl font-black">Découvre ton site avant de payer</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{freePreviewText}</p>
          <Link href="/creer" className="mt-5 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500">Créer mon aperçu gratuit</Link>
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
                  {billing?.isOwner ? "Ton accès propriétaire" : "Ton abonnement"}
                </p>

                <p className="mt-2 text-xl font-black capitalize">
                  {billing?.isOwner ? "Propriétaire · sans abonnement" : currentPlan ===
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

                {!billing?.isOwner && billing?.currentPeriodEnd && (
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

        {!billing?.isOwner && !activeSubscription && (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={cgvAccepted}
                onChange={(event) => {
                  setCgvAccepted(event.target.checked);
                  setError("");
                }}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
              />

              <span className="text-sm leading-6 text-slate-300">
                J&apos;ai lu et j&apos;accepte les{" "}
                <Link
                  href="/cgv"
                  target="_blank"
                  className="font-bold text-blue-400 underline hover:text-blue-300"
                >
                  Conditions générales de vente
                </Link>
                .
              </span>
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={professionalUseAccepted}
                onChange={(event) => {
                  setProfessionalUseAccepted(event.target.checked);
                  setError("");
                }}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
              />

              <span className="text-sm leading-6 text-slate-300">
                Je souscris pour les besoins de mon activité professionnelle
                (entreprise, indépendant, association). Je reconnais que les
                offres Lumio sont réservées aux professionnels.
              </span>
            </label>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Tu dois cocher les deux cases avant d&apos;être redirigé vers
              Stripe. Version des CGV : 29/10/2026.
            </p>
          </div>
        )}

        {billing?.isOwner && (
          <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-emerald-700 bg-emerald-950/20 p-6">
            <p className="font-bold text-emerald-300">Toutes les fonctionnalités, sans abonnement Lumio</p>
            <p className="mt-3 text-sm text-slate-300">Publication sans limite de formule, domaines personnalisés, espace Agence, statistiques et IA sans quota mensuel. La limite de 20 demandes IA par heure reste active. Les frais externes éventuels (IA, hébergement, domaine) restent à ta charge.</p>
            {billing.hasSubscription && <p className="mt-3 text-sm text-amber-300">Un abonnement Stripe existe encore : cet accès ne le résilie pas automatiquement. Tu peux le gérer avec le bouton ci-dessus.</p>}
            <a href="/admin" className="mt-4 inline-block font-bold text-emerald-300 underline">Ouvrir l’administration</a>
          </div>
        )}

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
                    <span className="absolute right-5 top-5 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
                      Recommandé
                    </span>
                  )}

                  <div>
                    <h2 className="pt-8 text-2xl font-black">
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
                        {priceSuffix}
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

                  {billing?.isOwner ? (
                    <button type="button" disabled className="mt-9 w-full rounded-xl bg-emerald-600/20 px-5 py-4 font-black text-emerald-400">Inclus dans ton accès propriétaire</button>
                  ) : isCurrent ? (
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
                        checkoutLoading !== null ||
                        !cgvAccepted ||
                        !professionalUseAccepted
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


        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-400">{priceTaxText}</p>
        <section aria-label="Ce qui est inclus" className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl text-white">Ton domaine, ton adresse</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{domainText}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl text-white">Une IA avec des limites claires</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{aiUsageText}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl text-white">Si tu résilies</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{cancellationText}</p>
          </div>
        </section>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-blue-800 bg-blue-950/30 p-6 text-center">
          <h2 className="text-xl font-black text-white">Une question avant de choisir ?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Écris-nous à{" "}
            <a
              href="mailto:support@lumio.business"
              className="font-bold text-blue-300 underline decoration-blue-500/60 underline-offset-4 hover:text-blue-200"
            >
              support@lumio.business
            </a>
            . L’équipe Lumio te répondra dès que possible.
          </p>
        </div>

      </section>
    </main>
      <LumioAssistant page="Abonnement" mobileOffset={24} />
    </>
  );
}
