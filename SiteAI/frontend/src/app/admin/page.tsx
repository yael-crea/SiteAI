"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../app-theme.css";

type Summary = {
  totalUsers: number;
  totalSites: number;
  publishedSites: number;
  aiCallsToday: number;
  aiCallsMonth: number;
  generationsMonth: number;
  modificationsMonth: number;
  tokensToday: number;
  tokensMonth: number;
  costTodayUsd: number;
  costMonthUsd: number;
  activeSubscriptions: number;
  essentielSubscriptions: number;
  proSubscriptions: number;
  agenceSubscriptions: number;
  scheduledCancellations: number;
  canceledSubscriptions: number;
  mrrEur: number;
};

type UserUsage = {
  userId: string;
  email: string;
  aiCalls: number;
  generations: number;
  modifications: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastAiUseAt?: string;
  plan: string;
  subscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  monthlyRevenueEur: number;
};

type FunnelCount = {
  label: string;
  count: number;
};

type Funnel = {
  days: number;
  landingViews: number;
  ctaClicks: number;
  signUps: number;
  firstSites: number;
  publishers: number;
  newSubscriptions: number;
  clicksByButton: FunnelCount[];
  viewsBySource: FunnelCount[];
  reminderEmails: FunnelCount[];
  remindedSubscribers: number;
};

type AdminStats = {
  summary: Summary;
  funnel?: Funnel;
  users: UserUsage[];
};

function moneyEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function moneyUSD(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

function percent(part: number, total: number) {
  if (total <= 0) return "–";
  return `${Math.round((part / total) * 100)} %`;
}

const BUTTON_LABELS: Record<string, string> = {
  header: "En-tête",
  hero: "Haut de page",
  pricing: "Tarifs",
};

const REMINDER_LABELS: Record<string, string> = {
  bienvenue: "Bienvenue",
  publier: "Publier",
  dernier_rappel: "Dernier rappel",
};

function planLabel(plan: string) {
  if (plan === "essentiel") return "Essentiel";
  if (plan === "pro") return "Pro";
  if (plan === "agence") return "Agence";
  return "Gratuit";
}

function statusLabel(status: string, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd) return "Résiliation prévue";
  if (status === "active") return "Actif";
  if (status === "trialing") return "Essai";
  if (status === "canceled") return "Annulé";
  return status || "Inactif";
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth");
        return;
      }

      const response = await fetch("/api-backend/admin/stats", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.status === 401) {
        router.replace("/auth");
        return;
      }

      if (response.status === 403) {
        setError("Ce compte n'est pas administrateur Lumio.");
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Impossible de charger les statistiques.");
      }

      const result: AdminStats = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger le dashboard admin.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // This effect initializes the remote dashboard state on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
  }, []);

  if (loading) {
    return (
      <main className="lumio-app flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-lg font-bold">Chargement du dashboard admin...</p>
      </main>
    );
  }

  return (
    <main className="lumio-app min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Lu<span className="text-blue-500">mio</span>{" "}
            <span className="text-sm text-slate-500">Admin</span>
          </Link>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadStats}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:border-blue-500"
            >
              Actualiser
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black hover:bg-blue-500"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-4xl font-black">Dashboard administrateur</h1>
        <p className="mt-2 text-slate-400">
          Business, abonnements Stripe et consommation OpenAI.
        </p>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-5 text-red-300">
            {error}
          </div>
        )}

        {data && (
          <>
            <h2 className="mt-10 text-xl font-black">💳 Business</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="MRR estimé" value={moneyEUR(data.summary.mrrEur)} />
              <Card title="Abonnements actifs" value={data.summary.activeSubscriptions} />
              <Card title="Résiliations prévues" value={data.summary.scheduledCancellations} />
              <Card title="Abonnements annulés" value={data.summary.canceledSubscriptions} />
              <Card title="Essentiel" value={data.summary.essentielSubscriptions} />
              <Card title="Pro" value={data.summary.proSubscriptions} />
              <Card title="Agence" value={data.summary.agenceSubscriptions} />
              <Card title="Sites publiés" value={data.summary.publishedSites} />
            </div>

            {data.funnel && <FunnelSection funnel={data.funnel} />}

            <h2 className="mt-10 text-xl font-black">✨ IA et plateforme</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Utilisateurs" value={data.summary.totalUsers} />
              <Card title="Sites" value={data.summary.totalSites} />
              <Card title="Appels IA aujourd'hui" value={data.summary.aiCallsToday} />
              <Card title="Appels IA ce mois" value={data.summary.aiCallsMonth} />
              <Card title="Générations ce mois" value={data.summary.generationsMonth} />
              <Card title="Modifications ce mois" value={data.summary.modificationsMonth} />
              <Card title="Tokens ce mois" value={data.summary.tokensMonth} />
              <Card title="Coût IA ce mois" value={moneyUSD(data.summary.costMonthUsd)} />
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-xl font-black">Clients</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Abonnement, revenu mensuel estimé et usage IA cumulé.
                </p>
              </div>

              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Utilisateur</th>
                    <th className="px-5 py-4">Formule</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">MRR</th>
                    <th className="px-5 py-4">Appels IA</th>
                    <th className="px-5 py-4">Tokens</th>
                    <th className="px-5 py-4">Coût IA</th>
                  </tr>
                </thead>

                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.userId} className="border-t border-slate-800">
                      <td className="px-5 py-4">
                        <div className="font-bold">{user.email || "Sans e-mail"}</div>
                        <div className="mt-1 max-w-[220px] truncate text-xs text-slate-600">
                          {user.userId}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold">
                        {planLabel(user.plan)}
                      </td>
                      <td className="px-5 py-4">
                        {statusLabel(user.subscriptionStatus, user.cancelAtPeriodEnd)}
                      </td>
                      <td className="px-5 py-4 text-emerald-400">
                        {moneyEUR(user.monthlyRevenueEur)}
                      </td>
                      <td className="px-5 py-4">{user.aiCalls}</td>
                      <td className="px-5 py-4">{user.totalTokens}</td>
                      <td className="px-5 py-4">
                        {moneyUSD(user.estimatedCostUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-600">
              Le MRR est une estimation basée sur les abonnements actifs/trialing
              enregistrés dans Lumio et les tarifs actuels : 19,90 €, 39,90 € et
              79,90 € par mois. Il ne correspond pas au solde bancaire Stripe.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function FunnelSection({ funnel }: { funnel: Funnel }) {
  const steps = [
    { title: "Visites de la page d'accueil", value: funnel.landingViews },
    { title: "Clics « Créer mon site »", value: funnel.ctaClicks },
    { title: "Comptes créés", value: funnel.signUps },
    { title: "Premiers sites créés", value: funnel.firstSites },
    { title: "Comptes ayant publié", value: funnel.publishers },
    { title: "Nouveaux abonnements", value: funnel.newSubscriptions },
  ];

  return (
    <>
      <h2 className="mt-10 text-xl font-black">
        🎯 Conversion sur {funnel.days} jours
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-500">{step.title}</p>
            <p className="mt-2 text-2xl font-black">{step.value}</p>
            {index > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {percent(step.value, steps[index - 1].value)} de l&apos;étape
                précédente
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <CountList
          title="Clics par bouton"
          items={funnel.clicksByButton}
          label={(item) => BUTTON_LABELS[item.label] ?? item.label}
        />
        <CountList
          title="Visites par source"
          items={funnel.viewsBySource}
          label={(item) => item.label || "Directe"}
        />
        <CountList
          title="Emails de relance envoyés"
          items={funnel.reminderEmails}
          label={(item) => REMINDER_LABELS[item.label] ?? item.label}
          footer={`${funnel.remindedSubscribers} destinataire(s) désormais abonné(s)`}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        Chaque étape est comptée sur la même période, sans suivre les mêmes
        personnes d&apos;une étape à l&apos;autre. Les visites sont mesurées
        sans cookie : une vue par chargement de page, robots exclus.
      </p>
    </>
  );
}

function CountList({
  title,
  items,
  label,
  footer,
}: {
  title: string;
  items: FunnelCount[];
  label: (item: FunnelCount) => string;
  footer?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Aucune donnée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex justify-between gap-4">
              <span className="truncate text-slate-300">{label(item)}</span>
              <span className="font-bold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && <p className="mt-3 text-xs text-slate-500">{footer}</p>}
    </div>
  );
}
