"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
};

type AdminStats = {
  summary: Summary;
  users: UserUsage[];
};

export default function AdminPage() {
  const router = useRouter();

  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
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
          setError("Ce compte n'est pas administrateur SiteAI.");
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

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-lg font-bold">Chargement du dashboard admin...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Site<span className="text-blue-500">AI</span>{" "}
            <span className="text-sm text-slate-500">Admin</span>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black hover:bg-blue-500"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-4xl font-black">Dashboard administrateur</h1>
        <p className="mt-2 text-slate-400">
          Statistiques réelles de SiteAI et consommation OpenAI.
        </p>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-5 text-red-300">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Utilisateurs" value={data.summary.totalUsers} />
              <Card title="Sites" value={data.summary.totalSites} />
              <Card title="Sites publiés" value={data.summary.publishedSites} />
              <Card title="IA aujourd'hui" value={data.summary.aiCallsToday} />
              <Card title="IA ce mois" value={data.summary.aiCallsMonth} />
              <Card title="Générations" value={data.summary.generationsMonth} />
              <Card title="Modifications" value={data.summary.modificationsMonth} />
              <Card
                title="Coût IA ce mois"
                value={`$${data.summary.costMonthUsd.toFixed(6)}`}
              />
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Utilisateur</th>
                    <th className="px-5 py-4">Appels IA</th>
                    <th className="px-5 py-4">Générations</th>
                    <th className="px-5 py-4">Modifications</th>
                    <th className="px-5 py-4">Tokens</th>
                    <th className="px-5 py-4">Coût</th>
                  </tr>
                </thead>

                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.userId} className="border-t border-slate-800">
                      <td className="px-5 py-4">
                        <div className="font-bold">{user.email || "Sans e-mail"}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {user.userId}
                        </div>
                      </td>
                      <td className="px-5 py-4">{user.aiCalls}</td>
                      <td className="px-5 py-4">{user.generations}</td>
                      <td className="px-5 py-4">{user.modifications}</td>
                      <td className="px-5 py-4">{user.totalTokens}</td>
                      <td className="px-5 py-4 text-emerald-400">
                        ${user.estimatedCostUsd.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
