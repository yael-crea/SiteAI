"use client";
import "../app-theme.css";
import LumioAssistant from "@/components/LumioAssistant";
import { notificationLabel } from "@/lib/actionErrors";



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
  notificationStatus?: string;

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

  archived: boolean;

  quoteAmountCents: number;

  createdAt: string;

};

type QuoteItem = {

  description: string;

  quantity: number;

  unitPriceCents: number;

  totalCents: number;

};

type Quote = {

  id: number;

  leadId: number;

  quoteNumber: string;

  title: string;

  items: QuoteItem[];

  subtotalCents: number;

  taxRateBps: number;

  taxCents: number;

  totalCents: number;

  notes: string;

  status: "draft" | "sent";

  validUntil: string;

  sentAt: string | null;

  createdAt: string;

};

type QuoteDraftItem = {

  description: string;

  quantity: string;

  unitPrice: string;

};

type QuoteDraft = {

  title: string;

  taxRate: string;

  validityDays: string;

  notes: string;

  items: QuoteDraftItem[];

};



type StatusFilter = "all" | LeadStatus;

type ArchiveView = "active" | "archived";



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



  const [archiveView, setArchiveView] =

    useState<ArchiveView>("active");



  const [search, setSearch] =

    useState("");



  const [siteFilter, setSiteFilter] =

    useState("all");



  const [updatingID, setUpdatingID] =

    useState<number | null>(null);



  const [savedID, setSavedID] =

    useState<number | null>(null);

  const [quoteLeadID, setQuoteLeadID] =

    useState<number | null>(null);

  const [quoteDraft, setQuoteDraft] =

    useState<QuoteDraft>({

      title: "Devis",

      taxRate: "20",

      validityDays: "30",

      notes: "",

      items: [

        {

          description: "Prestation",

          quantity: "1",

          unitPrice: "",

        },

      ],

    });

  const [quotesByLead, setQuotesByLead] =

    useState<Record<number, Quote[]>>({});

  const [quoteWorkingID, setQuoteWorkingID] =

    useState<number | null>(null);

  const [quoteNotice, setQuoteNotice] =

    useState("");



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

          "/leads?includeArchived=true",

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

    overrides?: {

      status?: LeadStatus;

      archived?: boolean;

    },

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

      overrides?.status ??

      lead.status;



    const nextArchived =

      overrides?.archived ??

      lead.archived;



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

              archived:

                nextArchived,

              quoteAmountCents:

                lead.quoteAmountCents ?? 0,

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

                    archived:

                      nextArchived,

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

      {

        status,

      },

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



  function updateLeadQuoteAmount(

    leadID: number,

    euros: number,

  ) {

    const cents =

      Number.isFinite(euros) &&

      euros > 0

        ? Math.round(

            euros * 100,

          )

        : 0;



    setLeads(

      (current) =>

        current.map(

          (lead) =>

            lead.id === leadID

              ? {

                  ...lead,

                  quoteAmountCents:

                    cents,

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



  async function toggleArchive(

    leadID: number,

    archived: boolean,

  ) {

    const lead =

      leads.find(

        (item) =>

          item.id === leadID,

      );



    if (!lead) {

      return;

    }



    if (

      archived &&

      !window.confirm(

        `Archiver le prospect "${lead.name}" ?`,

      )

    ) {

      return;

    }



    await saveLead(

      leadID,

      {

        archived,

      },

    );

  }



  function isSameLocalDay(

    value: string,

    target: Date,

  ) {

    const date =

      new Date(value);



    if (

      Number.isNaN(

        date.getTime(),

      )

    ) {

      return false;

    }



    return (

      date.getFullYear() ===

        target.getFullYear() &&

      date.getMonth() ===

        target.getMonth() &&

      date.getDate() ===

        target.getDate()

    );

  }



  function isOpenLead(

    lead: Lead,

  ) {

    return (

      !lead.archived &&

      lead.status !== "won" &&

      lead.status !== "lost"

    );

  }



  function csvCell(

    value: string | number | boolean | null | undefined,

  ) {

    let text =

      value === null ||

      value === undefined

        ? ""

        : String(value);



    if (

      /^[=+\-@]/.test(

        text,

      )

    ) {

      text = `'${text}`;

    }



    return `"${text.replace(

      /"/g,

      '""',

    )}"`;

  }



  function exportCSV() {

    if (

      filteredLeads.length ===

      0

    ) {

      return;

    }



    const rows = [

      [

        "Statut",

        "Site",

        "Nom",

        "Email",

        "Téléphone",

        "Message",

        "Note interne",

        "Relance prévue",

        "Montant du devis",

        "Archivé",

        "Reçu le",

      ],

      ...filteredLeads.map(

        (lead) => [

          statusLabel(

            lead.status,

          ),

          lead.businessName,

          lead.name,

          lead.email,

          lead.phone,

          lead.message,

          lead.note,

          lead.followUpAt

            ? formatDate(

                lead.followUpAt,

              )

            : "",

          formatCurrency(

            lead.quoteAmountCents,

          ),

          lead.archived

            ? "Oui"

            : "Non",

          formatDate(

            lead.createdAt,

          ),

        ],

      ),

    ];



    const csv =

      "\uFEFF" +

      rows

        .map((row) =>

          row

            .map((cell) =>

              csvCell(cell),

            )

            .join(";"),

        )

        .join("\r\n");



    const blob = new Blob(

      [csv],

      {

        type: "text/csv;charset=utf-8;",

      },

    );



    const url =

      URL.createObjectURL(

        blob,

      );



    const link =

      document.createElement(

        "a",

      );



    link.href = url;

    link.download =

      `prospects-siteai-${new Date()

        .toISOString()

        .slice(0, 10)}.csv`;



    document.body.appendChild(

      link,

    );



    link.click();

    link.remove();



    URL.revokeObjectURL(

      url,

    );

  }

  function quoteDraftSubtotal() {

    return quoteDraft.items.reduce(

      (total, item) => {

        const quantity =

          Math.max(

            0,

            Math.floor(

              Number(

                item.quantity.replace(

                  ",",

                  ".",

                ),

              ) || 0,

            ),

          );

        const unitPrice =

          Number(

            item.unitPrice.replace(

              ",",

              ".",

            ),

          ) || 0;

        return total +

          quantity *

            Math.max(

              0,

              Math.round(

                unitPrice * 100,

              ),

            );

      },

      0,

    );

  }

  async function loadQuotes(

    leadID: number,

  ) {

    const response =

      await authenticatedFetch(

        `/quotes?leadId=${leadID}`,

      );

    if (!response.ok) {

      const text =

        await response.text();

      throw new Error(

        text ||

          "Impossible de charger les devis.",

      );

    }

    const quotes =

      (await response.json()) as Quote[];

    setQuotesByLead(

      (current) => ({

        ...current,

        [leadID]: quotes,

      }),

    );

  }

  async function toggleQuotePanel(

    lead: Lead,

  ) {

    if (quoteLeadID === lead.id) {

      setQuoteLeadID(null);

      return;

    }

    setQuoteLeadID(lead.id);

    setQuoteNotice("");

    setQuoteDraft({

      title: "Devis",

      taxRate: "20",

      validityDays: "30",

      notes: "",

      items: [

        {

          description:

            "Prestation",

          quantity: "1",

          unitPrice:

            lead.quoteAmountCents >

            0

              ? String(

                  lead.quoteAmountCents /

                    100,

                )

              : "",

        },

      ],

    });

    setQuoteWorkingID(lead.id);

    try {

      await loadQuotes(lead.id);

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Impossible de charger les devis.",

      );

    } finally {

      setQuoteWorkingID(null);

    }

  }

  function updateQuoteItem(

    index: number,

    field: keyof QuoteDraftItem,

    value: string,

  ) {

    setQuoteDraft(

      (current) => ({

        ...current,

        items: current.items.map(

          (item, itemIndex) =>

            itemIndex === index

              ? {

                  ...item,

                  [field]: value,

                }

              : item,

        ),

      }),

    );

  }

  function addQuoteItem() {

    setQuoteDraft(

      (current) => ({

        ...current,

        items: [

          ...current.items,

          {

            description: "",

            quantity: "1",

            unitPrice: "",

          },

        ],

      }),

    );

  }

  function removeQuoteItem(

    index: number,

  ) {

    setQuoteDraft(

      (current) => ({

        ...current,

        items: current.items.filter(

          (_, itemIndex) =>

            itemIndex !== index,

        ),

      }),

    );

  }

  async function createAndSendQuote(

    lead: Lead,

  ) {

    setError("");

    setQuoteNotice("");

    if (!lead.email) {

      setError(

        "Ajoutez d'abord une adresse e-mail au prospect.",

      );

      return;

    }

    const items =

      quoteDraft.items.map(

        (item) => ({

          description:

            item.description.trim(),

          quantity: Math.floor(

            Number(

              item.quantity.replace(

                ",",

                ".",

              ),

            ) || 0,

          ),

          unitPriceCents:

            Math.round(

              (Number(

                item.unitPrice.replace(

                  ",",

                  ".",

                ),

              ) || 0) * 100,

            ),

        }),

      );

    if (

      items.length === 0 ||

      items.some(

        (item) =>

          !item.description ||

          item.quantity < 1 ||

          item.unitPriceCents < 0,

      ) ||

      quoteDraftSubtotal() <= 0

    ) {

      setError(

        "Complétez les prestations, quantités et prix du devis.",

      );

      return;

    }

    setQuoteWorkingID(lead.id);

    try {

      const response =

        await authenticatedFetch(

          "/quotes",

          {

            method: "POST",

            body: JSON.stringify({

              leadId: lead.id,

              title:

                quoteDraft.title,

              items,

              taxRateBps:

                Math.round(

                  (Number(

                    quoteDraft.taxRate.replace(

                      ",",

                      ".",

                    ),

                  ) || 0) *

                    100,

                ),

              validityDays:

                Math.round(

                  Number(

                    quoteDraft.validityDays,

                  ) || 30,

                ),

              notes:

                quoteDraft.notes,

            }),

          },

        );

      if (!response.ok) {

        const text =

          await response.text();

        throw new Error(

          text ||

            "Impossible de créer le devis.",

        );

      }

      const result =

        (await response.json()) as {

          quote: Quote;

          emailSent: boolean;

          warning?: string;

        };

      setQuotesByLead(

        (current) => ({

          ...current,

          [lead.id]: [

            result.quote,

            ...(current[lead.id] ?? []),

          ],

        }),

      );

      if (result.emailSent) {

        setLeads(

          (current) =>

            current.map(

              (item) =>

                item.id === lead.id

                  ? {

                      ...item,

                      status:

                        "quote_sent",

                      quoteAmountCents:

                        result.quote.totalCents,

                    }

                  : item,

            ),

        );

      }

      setQuoteNotice(

        result.emailSent

          ? `✓ ${result.quote.quoteNumber} envoyé à ${lead.email}`

          : result.warning ??

              "Devis enregistré, e-mail non envoyé.",

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Impossible de créer le devis.",

      );

    } finally {

      setQuoteWorkingID(null);

    }

  }

  async function downloadQuote(

    quote: Quote,

  ) {

    setError("");

    try {

      const response =

        await authenticatedFetch(

          `/quotes/${quote.id}/pdf`,

        );

      if (!response.ok) {

        throw new Error(

          "Impossible de télécharger le PDF.",

        );

      }

      const url =

        URL.createObjectURL(

          await response.blob(),

        );

      const link =

        document.createElement("a");

      link.href = url;

      link.download =

        `${quote.quoteNumber}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Impossible de télécharger le PDF.",

      );

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



  function formatCurrency(

    cents: number,

  ) {

    return new Intl.NumberFormat(

      "fr-FR",

      {

        style: "currency",

        currency: "EUR",

        maximumFractionDigits: 2,

      },

    ).format(

      (cents || 0) / 100,

    );

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



  const activeLeads =

    useMemo(

      () =>

        leads.filter(

          (lead) =>

            !lead.archived,

        ),

      [leads],

    );



  const archivedLeads =

    useMemo(

      () =>

        leads.filter(

          (lead) =>

            lead.archived,

        ),

      [leads],

    );



  const counts = {

    all: activeLeads.length,

    new: activeLeads.filter(

      (lead) =>

        lead.status === "new",

    ).length,

    contacted:

      activeLeads.filter(

        (lead) =>

          lead.status ===

          "contacted",

      ).length,

    quote_sent:

      activeLeads.filter(

        (lead) =>

          lead.status ===

          "quote_sent",

      ).length,

    won: activeLeads.filter(

      (lead) =>

        lead.status === "won",

    ).length,

    lost: activeLeads.filter(

      (lead) =>

        lead.status === "lost",

    ).length,

  };



  const siteOptions =

    useMemo(() => {

      const map =

        new Map<

          number,

          string

        >();



      for (const lead of leads) {

        map.set(

          lead.siteId,

          lead.businessName,

        );

      }



      return Array.from(

        map.entries(),

      )

        .map(

          ([

            siteId,

            businessName,

          ]) => ({

            siteId,

            businessName,

          }),

        )

        .sort((a, b) =>

          a.businessName.localeCompare(

            b.businessName,

            "fr",

          ),

        );

    }, [leads]);



  const today =

    new Date();



  const followUpTodayCount =

    activeLeads.filter(

      (lead) =>

        isOpenLead(lead) &&

        lead.followUpAt &&

        isSameLocalDay(

          lead.followUpAt,

          today,

        ),

    ).length;



  const overdueCount =

    activeLeads.filter(

      (lead) =>

        isOpenLead(lead) &&

        lead.followUpAt &&

        new Date(

          lead.followUpAt,

        ).getTime() <

          Date.now(),

    ).length;



  const openPipelineValue =

    activeLeads

      .filter(

        (lead) =>

          lead.status === "new" ||

          lead.status === "contacted" ||

          lead.status === "quote_sent",

      )

      .reduce(

        (total, lead) =>

          total +

          (lead.quoteAmountCents || 0),

        0,

      );



  const wonValue =

    activeLeads

      .filter(

        (lead) =>

          lead.status === "won",

      )

      .reduce(

        (total, lead) =>

          total +

          (lead.quoteAmountCents || 0),

        0,

      );



  const lostValue =

    activeLeads

      .filter(

        (lead) =>

          lead.status === "lost",

      )

      .reduce(

        (total, lead) =>

          total +

          (lead.quoteAmountCents || 0),

        0,

      );



  const quotedLeads =

    activeLeads.filter(

      (lead) =>

        (lead.quoteAmountCents || 0) >

        0,

    );



  const averageQuoteValue =

    quotedLeads.length > 0

      ? Math.round(

          quotedLeads.reduce(

            (total, lead) =>

              total +

              (lead.quoteAmountCents ||

                0),

            0,

          ) / quotedLeads.length,

        )

      : 0;



  const filteredLeads =

    useMemo(() => {

      const query =

        search

          .trim()

          .toLowerCase();



      const source =

        archiveView ===

        "archived"

          ? archivedLeads

          : activeLeads;



      return source.filter(

        (lead) => {

          const matchesStatus =

            statusFilter ===

              "all" ||

            lead.status ===

              statusFilter;



          const matchesSite =

            siteFilter ===

              "all" ||

            String(

              lead.siteId,

            ) === siteFilter;



          const searchable =

            [

              lead.name,

              lead.email,

              lead.phone,

              lead.businessName,

            ]

              .join(" ")

              .toLowerCase();



          const matchesSearch =

            query === "" ||

            searchable.includes(

              query,

            );



          return (

            matchesStatus &&

            matchesSite &&

            matchesSearch

          );

        },

      );

    }, [

      activeLeads,

      archivedLeads,

      archiveView,

      search,

      siteFilter,

      statusFilter,

    ]);



  if (authLoading) {

    return (

      <main className="lumio-app flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="lumio-loading">
          <strong>lumio<span>.</span></strong>
          <p>Chargement de tes prospects…</p>
        </div>
      </main>

    );

  }



  return (
    <>

    <main className="lumio-app min-h-screen bg-slate-950 text-white">

      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">

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

              Suivi <em>commercial.</em>

            </h1>



            <p className="mt-3 max-w-2xl text-slate-400">

              Suis chaque demande depuis

              sa réception jusqu&apos;au

              devis et à la conversion.

            </p>

          </div>



          <div className="flex flex-wrap gap-3">

            <button

              type="button"

              onClick={exportCSV}

              disabled={

                loading ||

                filteredLeads.length ===

                  0

              }

              className="rounded-xl border border-emerald-800 px-5 py-3 font-bold text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"

            >

              Exporter en CSV

            </button>



            <button

              type="button"

              onClick={loadLeads}

              disabled={loading}

              className="rounded-xl border border-slate-700 px-5 py-3 font-bold hover:border-blue-500 disabled:opacity-50"

            >

              ↻ Actualiser

            </button>

          </div>

        </div>



        <div className="mt-10 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-5">

            <p className="text-sm text-blue-300">

              À relancer aujourd&apos;hui

            </p>



            <p className="mt-2 text-3xl font-black text-blue-400">

              {followUpTodayCount}

            </p>

          </div>



          <div className="rounded-2xl border border-amber-900/70 bg-amber-950/20 p-5">

            <p className="text-sm text-amber-300">

              Relances en retard

            </p>



            <p className="mt-2 text-3xl font-black text-amber-400">

              {overdueCount}

            </p>

          </div>



          <button

            type="button"

            onClick={() =>

              setArchiveView(

                "archived",

              )

            }

            className={`rounded-2xl border p-5 text-left transition ${

              archiveView ===

              "archived"

                ? "border-slate-400 bg-slate-800"

                : "border-slate-800 bg-slate-900 hover:border-slate-700"

            }`}

          >

            <p className="text-sm text-slate-400">

              Archivés

            </p>



            <p className="mt-2 text-3xl font-black">

              {

                archivedLeads.length

              }

            </p>

          </button>

        </div>



        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-violet-900/70 bg-violet-950/20 p-5">

            <p className="text-sm text-violet-300">

              Pipeline ouvert

            </p>



            <p className="mt-2 text-3xl font-black text-violet-400">

              {formatCurrency(

                openPipelineValue,

              )}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              Nouveau + Contacté + Devis envoyé

            </p>

          </div>



          <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-5">

            <p className="text-sm text-emerald-300">

              CA gagné

            </p>



            <p className="mt-2 text-3xl font-black text-emerald-400">

              {formatCurrency(

                wonValue,

              )}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              Prospects marqués Gagné

            </p>

          </div>



          <div className="rounded-2xl border border-red-900/70 bg-red-950/20 p-5">

            <p className="text-sm text-red-300">

              CA perdu

            </p>



            <p className="mt-2 text-3xl font-black text-red-400">

              {formatCurrency(

                lostValue,

              )}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              Prospects marqués Perdu

            </p>

          </div>



          <div className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-5">

            <p className="text-sm text-blue-300">

              Devis moyen

            </p>



            <p className="mt-2 text-3xl font-black text-blue-400">

              {formatCurrency(

                averageQuoteValue,

              )}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              Moyenne des montants renseignés

            </p>

          </div>

        </div>



        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">

          <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">

            <input

              type="search"

              value={search}

              onChange={(event) =>

                setSearch(

                  event.target.value,

                )

              }

              placeholder="Rechercher par nom, email, téléphone ou entreprise..."

              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"

            />



            <select

              value={siteFilter}

              onChange={(event) =>

                setSiteFilter(

                  event.target.value,

                )

              }

              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"

            >

              <option value="all">

                Tous les sites

              </option>



              {siteOptions.map(

                (site) => (

                  <option

                    key={

                      site.siteId

                    }

                    value={

                      site.siteId

                    }

                  >

                    {

                      site.businessName

                    }

                  </option>

                ),

              )}

            </select>



            <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">

              <button

                type="button"

                onClick={() =>

                  setArchiveView(

                    "active",

                  )

                }

                className={`rounded-lg px-4 py-2 text-sm font-bold ${

                  archiveView ===

                  "active"

                    ? "bg-blue-600 text-white"

                    : "text-slate-400"

                }`}

              >

                Actifs

              </button>



              <button

                type="button"

                onClick={() =>

                  setArchiveView(

                    "archived",

                  )

                }

                className={`rounded-lg px-4 py-2 text-sm font-bold ${

                  archiveView ===

                  "archived"

                    ? "bg-slate-700 text-white"

                    : "text-slate-400"

                }`}

              >

                Archivés

              </button>

            </div>

          </div>

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

            <p className="font-[family-name:var(--font-serif)] text-4xl italic text-slate-500">Rien ici.</p>



            <p className="mt-5 text-xl font-bold">

              Aucun prospect

            </p>



            <p className="mt-2 text-slate-500">

              Aucun prospect ne correspond aux filtres sélectionnés.

            </p>

          </div>

        ) : (

          <div className="mt-8 space-y-4">

            {filteredLeads.map(

              (lead) => (

                <article

                  key={lead.id}

                  className={`rounded-3xl border p-6 ${

                    lead.archived

                      ? "border-slate-800 bg-slate-900/60"

                      : "border-slate-800 bg-slate-900"

                  }`}

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



                        {lead.archived && (

                          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">

                            Archivé

                          </span>

                        )}



                        {!lead.archived &&

                          lead.followUpAt &&

                          isOpenLead(

                            lead,

                          ) &&

                          new Date(

                            lead.followUpAt,

                          ).getTime() <

                            Date.now() && (

                            <span className="rounded-full border border-amber-800 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-300">

                              Relance en retard

                            </span>

                          )}

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

                            lead.id ||

                          lead.archived

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



                      {lead.email && (

                        <a

                          href={`mailto:${lead.email}`}

                          className="rounded-xl border border-blue-800 px-4 py-3 text-center text-sm font-bold text-blue-300 hover:bg-blue-950"

                        >

                          E-mail

                        </a>

                      )}



                      {lead.phone && (

                        <a

                          href={`tel:${lead.phone}`}

                          className="rounded-xl border border-emerald-800 px-4 py-3 text-center text-sm font-bold text-emerald-300 hover:bg-emerald-950"

                        >

                          Appeler

                        </a>

                      )}



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

                          Voir le site

                        </button>

                      )}



                      <button

                        type="button"

                        disabled={

                          updatingID ===

                          lead.id

                        }

                        onClick={() =>

                          toggleArchive(

                            lead.id,

                            !lead.archived,

                          )

                        }

                        className={`rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${

                          lead.archived

                            ? "border-blue-800 text-blue-300 hover:bg-blue-950"

                            : "border-slate-700 text-slate-300 hover:bg-slate-800"

                        }`}

                      >

                        {lead.archived

                          ? "Restaurer"

                          : "Archiver"}

                      </button>

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
                    <p className="mt-4 rounded-xl border border-slate-700 p-3 text-xs leading-5 text-slate-400">{notificationLabel(lead.notificationStatus)}</p>

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

                        Montant du devis

                      </p>



                      <div className="mt-3 flex items-center rounded-xl border border-slate-800 bg-slate-900 focus-within:border-violet-500">

                        <input

                          type="number"

                          min="0"

                          step="0.01"

                          inputMode="decimal"
                          value={
                            lead.quoteAmountCents > 0
                              ? lead.quoteAmountCents / 100
                              : ""
                          }

                          onChange={(

                            event,

                          ) =>

                            updateLeadQuoteAmount(

                              lead.id,

                              event.currentTarget

                                .valueAsNumber,

                            )

                          }

                          placeholder="0,00"

                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"

                        />



                        <span className="pr-4 text-sm font-black text-violet-300">

                          €

                        </span>

                      </div>



                      <p className="mt-3 text-xs text-slate-500">

                        Valeur estimée ou montant du devis envoyé.

                      </p>



                      {lead.quoteAmountCents >

                        0 && (

                        <p className="mt-3 text-lg font-black text-violet-300">

                          {formatCurrency(

                            lead.quoteAmountCents,

                          )}

                        </p>

                      )}

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

                          : "Enregistrer le suivi"}

                      </button>



                      {savedID ===

                        lead.id && (

                        <p className="mt-3 text-center text-xs font-bold text-emerald-400">

                          ✓ Suivi enregistré

                        </p>

                      )}

                    </div>

                  </div>

                  <div className="mt-4 rounded-2xl border border-violet-900/70 bg-violet-950/20 p-5">

                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                      <div>

                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300">

                          Devis PDF

                        </p>

                        <p className="mt-1 text-sm text-slate-400">

                          Créez le devis et envoyez-le directement au client.

                        </p>

                      </div>

                      <button

                        type="button"

                        onClick={() =>

                          void toggleQuotePanel(

                            lead,

                          )

                        }

                        className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-black transition hover:bg-violet-500"

                      >

                        {quoteLeadID ===

                        lead.id

                          ? "Fermer"

                          : "Créer un devis"}

                      </button>

                    </div>

                    {quoteLeadID ===

                      lead.id && (

                      <div className="mt-6 border-t border-violet-900/60 pt-6">

                        {!lead.email && (

                          <p className="mb-5 rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm font-semibold text-amber-300">

                            Ce prospect n&apos;a pas d&apos;adresse e-mail. L&apos;envoi sera disponible après ajout d&apos;un e-mail.

                          </p>

                        )}

                        <div className="grid gap-4 md:grid-cols-3">

                          <label className="text-sm font-bold text-slate-300 md:col-span-2">

                            Titre

                            <input

                              value={

                                quoteDraft.title

                              }

                              onChange={(event) =>

                                setQuoteDraft(

                                  (current) => ({

                                    ...current,

                                    title:

                                      event.target.value,

                                  }),

                                )

                              }

                              maxLength={120}

                              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"

                            />

                          </label>

                          <label className="text-sm font-bold text-slate-300">

                            Validité (jours)

                            <input

                              type="number"

                              min="1"

                              max="365"

                              value={

                                quoteDraft.validityDays

                              }

                              onChange={(event) =>

                                setQuoteDraft(

                                  (current) => ({

                                    ...current,

                                    validityDays:

                                      event.target.value,

                                  }),

                                )

                              }

                              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"

                            />

                          </label>

                        </div>

                        <div className="mt-5 space-y-3">

                          {quoteDraft.items.map(

                            (item, index) => (

                              <div

                                key={index}

                                className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_110px_150px_auto] md:items-end"

                              >

                                <label className="text-xs font-bold text-slate-400">

                                  Prestation

                                  <input

                                    value={

                                      item.description

                                    }

                                    onChange={(event) =>

                                      updateQuoteItem(

                                        index,

                                        "description",

                                        event.target.value,

                                      )

                                    }

                                    maxLength={240}

                                    placeholder="Ex. Installation et fourniture"

                                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-violet-500"

                                  />

                                </label>

                                <label className="text-xs font-bold text-slate-400">

                                  Quantité

                                  <input

                                    type="number"

                                    min="1"

                                    step="1"

                                    value={

                                      item.quantity

                                    }

                                    onChange={(event) =>

                                      updateQuoteItem(

                                        index,

                                        "quantity",

                                        event.target.value,

                                      )

                                    }

                                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-violet-500"

                                  />

                                </label>

                                <label className="text-xs font-bold text-slate-400">

                                  Prix unitaire HT

                                  <div className="mt-2 flex rounded-lg border border-slate-700 bg-slate-900 focus-within:border-violet-500">

                                    <input

                                      type="number"

                                      min="0"

                                      step="0.01"

                                      value={

                                        item.unitPrice

                                      }

                                      onChange={(event) =>

                                        updateQuoteItem(

                                          index,

                                          "unitPrice",

                                          event.target.value,

                                        )

                                      }

                                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"

                                    />

                                    <span className="pr-3 pt-2.5 text-sm text-slate-400">

                                      €

                                    </span>

                                  </div>

                                </label>

                                <button

                                  type="button"

                                  onClick={() =>

                                    removeQuoteItem(

                                      index,

                                    )

                                  }

                                  disabled={

                                    quoteDraft.items.length ===

                                    1

                                  }

                                  className="rounded-lg border border-red-900 px-3 py-2.5 text-xs font-bold text-red-300 disabled:opacity-30"

                                >

                                  Retirer

                                </button>

                              </div>

                            ),

                          )}

                        </div>

                        <button

                          type="button"

                          onClick={addQuoteItem}

                          disabled={

                            quoteDraft.items.length >=

                            20

                          }

                          className="mt-3 text-sm font-bold text-violet-300 hover:text-violet-200 disabled:opacity-40"

                        >

                          + Ajouter une ligne

                        </button>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">

                          <label className="text-sm font-bold text-slate-300">

                            Conditions ou message

                            <textarea

                              value={

                                quoteDraft.notes

                              }

                              onChange={(event) =>

                                setQuoteDraft(

                                  (current) => ({

                                    ...current,

                                    notes:

                                      event.target.value,

                                  }),

                                )

                              }

                              rows={4}

                              maxLength={3000}

                              placeholder="Ex. Acompte de 30 % à la commande."

                              className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"

                            />

                          </label>

                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                            <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-300">

                              TVA

                              <span className="flex w-28 rounded-lg border border-slate-700 bg-slate-900">

                                <input

                                  type="number"

                                  min="0"

                                  max="100"

                                  step="0.1"

                                  value={

                                    quoteDraft.taxRate

                                  }

                                  onChange={(event) =>

                                    setQuoteDraft(

                                      (current) => ({

                                        ...current,

                                        taxRate:

                                          event.target.value,

                                      }),

                                    )

                                  }

                                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-right outline-none"

                                />

                                <span className="pr-3 pt-2 text-slate-500">

                                  %

                                </span>

                              </span>

                            </label>

                            <div className="mt-4 space-y-2 text-sm">

                              <p className="flex justify-between text-slate-400">

                                <span>Total HT</span>

                                <span>

                                  {formatCurrency(

                                    quoteDraftSubtotal(),

                                  )}

                                </span>

                              </p>

                              <p className="flex justify-between text-slate-400">

                                <span>TVA</span>

                                <span>

                                  {formatCurrency(

                                    Math.round(

                                      quoteDraftSubtotal() *

                                        (Number(

                                          quoteDraft.taxRate.replace(

                                            ",",

                                            ".",

                                          ),

                                        ) || 0) /

                                        100,

                                    ),

                                  )}

                                </span>

                              </p>

                              <p className="flex justify-between border-t border-slate-800 pt-3 text-lg font-black text-violet-300">

                                <span>Total TTC</span>

                                <span>

                                  {formatCurrency(

                                    quoteDraftSubtotal() +

                                      Math.round(

                                        quoteDraftSubtotal() *

                                          (Number(

                                            quoteDraft.taxRate.replace(

                                              ",",

                                              ".",

                                            ),

                                          ) || 0) /

                                          100,

                                      ),

                                  )}

                                </span>

                              </p>

                            </div>

                          </div>

                        </div>

                        <button

                          type="button"

                          onClick={() =>

                            void createAndSendQuote(

                              lead,

                            )

                          }

                          disabled={

                            quoteWorkingID ===

                              lead.id ||

                            !lead.email

                          }

                          className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-black transition hover:bg-violet-500 disabled:opacity-50"

                        >

                          {quoteWorkingID ===

                          lead.id

                            ? "Création et envoi..."

                            : `Créer le PDF et l’envoyer à ${lead.email || "ce client"}`}

                        </button>

                        {quoteNotice && (

                          <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm font-bold text-emerald-300">

                            {quoteNotice}

                          </p>

                        )}

                        <div className="mt-7 border-t border-slate-800 pt-5">

                          <h3 className="text-sm font-black text-white">

                            Historique des devis

                          </h3>

                          {quoteWorkingID ===

                            lead.id &&

                          !quotesByLead[

                            lead.id

                          ] ? (

                            <p className="mt-3 text-sm text-slate-500">

                              Chargement...

                            </p>

                          ) : (quotesByLead[

                              lead.id

                            ] ?? []).length ===

                            0 ? (

                            <p className="mt-3 text-sm text-slate-500">

                              Aucun devis créé pour ce prospect.

                            </p>

                          ) : (

                            <div className="mt-3 space-y-2">

                              {(quotesByLead[

                                lead.id

                              ] ?? []).map(

                                (quote) => (

                                  <div

                                    key={

                                      quote.id

                                    }

                                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center"

                                  >

                                    <div>

                                      <p className="font-black text-white">

                                        {

                                          quote.quoteNumber

                                        }

                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">

                                        {quote.status ===

                                        "sent"

                                          ? "Envoyé"

                                          : "Enregistré, non envoyé"}

                                        {" · "}

                                        {formatDate(

                                          quote.createdAt,

                                        )}

                                      </p>

                                    </div>

                                    <div className="flex items-center gap-3">

                                      <span className="font-black text-violet-300">

                                        {formatCurrency(

                                          quote.totalCents,

                                        )}

                                      </span>

                                      <button

                                        type="button"

                                        onClick={() =>

                                          void downloadQuote(

                                            quote,

                                          )

                                        }

                                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold hover:border-violet-500"

                                      >

                                        PDF

                                      </button>

                                    </div>

                                  </div>

                                ),

                              )}

                            </div>

                          )}

                        </div>

                      </div>

                    )}

                  </div>



                </article>

              ),

            )}

          </div>

        )}

      </section>

    </main>
      <LumioAssistant page="Prospects" mobileOffset={24} />
    </>

  );

}
