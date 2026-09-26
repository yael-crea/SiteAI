"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type LeadStatus =
  | "new"
  | "contacted"
  | "quote_sent"
  | "won"
  | "lost";

type Lead = {
  id: number;
  siteId: number;
  publicSlug: string;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: LeadStatus;
  note: string;
  followUpAt: string | null;
  createdAt: string;
};

type StatusFilter = "all" | LeadStatus;

const statusOptions: Array<{
  value: LeadStatus;
  label: string;
}> = [
  {
    value: "new",
    label: "Nouveau",
  },
  {
    value: "contacted",
    label: "Contacté",
  },
  {
    value: "quote_sent",
    label: "Devis envoyé",
  },
  {
    value: "won",
    label: "Gagné",
  },
  {
    value: "lost",
    label: "Perdu",
  },
];

function statusLabel(
  status: LeadStatus,
) {
  return (
    statusOptions.find(
      (item) =>
        item.value === status,
    )?.label ?? status
  );
}

function statusClasses(
  status: LeadStatus,
) {
  switch (status) {
    case "new":
      return "border-blue-800 bg-blue-950/40 text-blue-300";

    case "contacted":
      return "border-amber-800 bg-amber-950/40 text-amber-300";

    case "quote_sent":
      return "border-violet-800 bg-violet-950/40 text-violet-300";

    case "won":
      return "border-emerald-800 bg-emerald-950/40 text-emerald-300";

    case "lost":
      return "border-red-900 bg-red-950/40 text-red-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

export default function ProspectsPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [userEmail, setUserEmail] =
    useState("");

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [error, setError] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [updatingID, setUpdatingID] =
    useState<number | null>(null);

  const [savedID, setSavedID] =
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
          data.session.user.email ??
            "",
        );

        setAuthLoading(false);

        await loadLeads();
      } catch (err) {
        console.error(err);

        if (active) {
          setAuthLoading(false);

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
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
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

  async function loadLeads() {
    setLoading(true);
    setError("");

    try {
      const response =
        await authenticatedFetch(
          "/leads",
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            "Impossible de récupérer les prospects.",
        );
      }

      const data =
        (await response.json()) as Lead[];

      setLeads(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les prospects.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveLead(
    leadID: number,
    statusOverride?: LeadStatus,
  ) {
    const lead =
      leads.find(
        (item) =>
          item.id === leadID,
      );

    if (!lead) {
      return;
    }

    const nextStatus =
      statusOverride ??
      lead.status;

    setUpdatingID(leadID);
    setSavedID(null);
    setError("");

    try {
      const response =
        await authenticatedFetch(
          `/leads/${leadID}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: nextStatus,
              note: lead.note ?? "",
              followUpAt:
                lead.followUpAt ||
                null,
            }),
          },
        );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          text ||
            "Impossible d'enregistrer le suivi.",
        );
      }

      setLeads(
        (current) =>
          current.map(
            (item) =>
              item.id === leadID
                ? {
                    ...item,
                    status:
                      nextStatus,
                  }
                : item,
          ),
      );

      setSavedID(leadID);

      window.setTimeout(
        () => {
          setSavedID(
            (current) =>
              current === leadID
                ? null
                : current,
          );
        },
        1800,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer le suivi.",
      );
    } finally {
      setUpdatingID(null);
    }
  }

  function updateLeadStatus(
    leadID: number,
    status: LeadStatus,
  ) {
    setLeads(
      (current) =>
        current.map(
          (lead) =>
            lead.id === leadID
              ? {
                  ...lead,
                  status,
                }
              : lead,
        ),
    );

    void saveLead(
      leadID,
      status,
    );
  }

  function updateLeadNote(
    leadID: number,
    note: string,
  ) {
    setLeads(
      (current) =>
        current.map(
          (lead) =>
            lead.id === leadID
              ? {
                  ...lead,
                  note,
                }
              : lead,
        ),
    );
  }

  function updateLeadFollowUp(
    leadID: number,
    localValue: string,
  ) {
    let isoValue: string | null =
      null;

    if (localValue) {
      const date =
        new Date(localValue);

      if (
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        isoValue =
          date.toISOString();
      }
    }

    setLeads(
      (current) =>
        current.map(
          (lead) =>
            lead.id === leadID
              ? {
                  ...lead,
                  followUpAt:
                    isoValue,
                }
              : lead,
        ),
    );
  }

  function toDateTimeLocal(
    value: string | null,
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

    const offset =
      date.getTimezoneOffset();

    const localDate =
      new Date(
        date.getTime() -
          offset * 60 * 1000,
      );

    return localDate
      .toISOString()
      .slice(0, 16);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.replace("/auth");
    router.refresh();
  }

  function formatDate(
    value: string,
  ) {
    return new Date(
      value,
    ).toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  const counts = {
    all: leads.length,
    new: leads.filter(
      (lead) =>
        lead.status === "new",
    ).length,
    contacted: leads.filter(
      (lead) =>
        lead.status ===
        "contacted",
    ).length,
    quote_sent: leads.filter(
      (lead) =>
        lead.status ===
        "quote_sent",
    ).length,
    won: leads.filter(
      (lead) =>
        lead.status === "won",
    ).length,
    lost: leads.filter(
      (lead) =>
        lead.status === "lost",
    ).length,
  };

  const filteredLeads =
    useMemo(() => {
      if (
        statusFilter ===
        "all"
      ) {
        return leads;
      }

      return leads.filter(
        (lead) =>
          lead.status ===
          statusFilter,
      );
    }, [
      leads,
      statusFilter,
    ]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            📥
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
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
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
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:border-blue-500"
            >
              ← Dashboard
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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
              Prospects
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Suivi commercial
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Suis chaque demande depuis
              sa réception jusqu&apos;au
              devis et à la conversion.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold hover:border-blue-500 disabled:opacity-50"
          >
            ↻ Actualiser
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                "all",
              )
            }
            className={`rounded-2xl border p-5 text-left transition ${
              statusFilter ===
              "all"
                ? "border-white bg-white/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-sm text-slate-400">
              Tous
            </p>

            <p className="mt-2 text-3xl font-black">
              {counts.all}
            </p>
          </button>

          {statusOptions.map(
            (item) => (
              <button
                key={
                  item.value
                }
                type="button"
                onClick={() =>
                  setStatusFilter(
                    item.value,
                  )
                }
                className={`rounded-2xl border p-5 text-left transition ${
                  statusFilter ===
                  item.value
                    ? statusClasses(
                        item.value,
                      )
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <p className="text-sm text-slate-400">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {
                    counts[
                      item.value
                    ]
                  }
                </p>
              </button>
            ),
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-5 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
            Chargement des prospects...
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            <div className="text-5xl">
              📭
            </div>

            <p className="mt-5 text-xl font-bold">
              Aucun prospect
            </p>

            <p className="mt-2 text-slate-500">
              Aucun prospect ne
              correspond à ce statut.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredLeads.map(
              (lead) => (
                <article
                  key={lead.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black">
                          {
                            lead.name
                          }
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                            lead.status,
                          )}`}
                        >
                          {statusLabel(
                            lead.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-blue-400">
                        {
                          lead.businessName
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Reçu le{" "}
                        {formatDate(
                          lead.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={
                          lead.status
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLeadStatus(
                            lead.id,
                            event.target
                              .value as LeadStatus,
                          )
                        }
                        disabled={
                          updatingID ===
                          lead.id
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        {statusOptions.map(
                          (
                            option,
                          ) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          ),
                        )}
                      </select>

                      {lead.publicSlug && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/site/${lead.publicSlug}`,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:border-blue-500"
                        >
                          🌍 Voir le site
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Email
                      </p>

                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="mt-2 block break-all font-semibold text-blue-400"
                        >
                          {
                            lead.email
                          }
                        </a>
                      ) : (
                        <p className="mt-2 text-slate-600">
                          Non renseigné
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Téléphone
                      </p>

                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="mt-2 block font-semibold text-emerald-400"
                        >
                          {
                            lead.phone
                          }
                        </a>
                      ) : (
                        <p className="mt-2 text-slate-600">
                          Non renseigné
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Message
                    </p>

                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-300">
                      {
                        lead.message
                      }
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Note interne
                      </p>

                      <textarea
                        value={
                          lead.note ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLeadNote(
                            lead.id,
                            event.target
                              .value,
                          )
                        }
                        maxLength={3000}
                        rows={4}
                        placeholder="Exemple : client rappelé, intéressé par une intervention mardi..."
                        className="mt-3 w-full resize-y rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Relance prévue
                      </p>

                      <input
                        type="datetime-local"
                        value={toDateTimeLocal(
                          lead.followUpAt,
                        )}
                        onChange={(
                          event,
                        ) =>
                          updateLeadFollowUp(
                            lead.id,
                            event.target
                              .value,
                          )
                        }
                        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />

                      {lead.followUpAt && (
                        <button
                          type="button"
                          onClick={() =>
                            updateLeadFollowUp(
                              lead.id,
                              "",
                            )
                          }
                          className="mt-3 text-xs font-bold text-slate-500 hover:text-white"
                        >
                          Effacer la relance
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          saveLead(
                            lead.id,
                          )
                        }
                        disabled={
                          updatingID ===
                          lead.id
                        }
                        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black transition hover:bg-blue-500 disabled:opacity-50"
                      >
                        {updatingID ===
                        lead.id
                          ? "Enregistrement..."
                          : "💾 Enregistrer le suivi"}
                      </button>

                      {savedID ===
                        lead.id && (
                        <p className="mt-3 text-center text-xs font-bold text-emerald-400">
                          ✓ Suivi enregistré
                        </p>
                      )}
                    </div>
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
