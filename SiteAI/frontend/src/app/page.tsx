"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

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
  sections: SiteSection[];
};

type DesignStyle =
  | "moderne"
  | "elegant"
  | "artisan";

type ModifyResponse = {
  site: GeneratedSite;
  designStyle: DesignStyle;
  accentColor: string;
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

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const colors = [
  {
    name: "Bleu",
    value: "#2563eb",
  },
  {
    name: "Orange",
    value: "#ea580c",
  },
  {
    name: "Vert",
    value: "#16a34a",
  },
  {
    name: "Violet",
    value: "#7c3aed",
  },
  {
    name: "Rouge",
    value: "#dc2626",
  },
];

export default function Home() {
  const router = useRouter();

  const [authLoading, setAuthLoading] =
    useState(true);

  const [userEmail, setUserEmail] =
    useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [activity, setActivity] =
    useState("");

  const [city, setCity] =
    useState("Montpellier");

  const [phone, setPhone] =
    useState("");

  const [services, setServices] =
    useState("");

  const [designStyle, setDesignStyle] =
    useState<DesignStyle>("moderne");

  const [accentColor, setAccentColor] =
    useState("#2563eb");

  const [site, setSite] =
    useState<GeneratedSite | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editPrompt, setEditPrompt] =
    useState("");

  const [editLoading, setEditLoading] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [savedSites, setSavedSites] =
    useState<SavedSite[]>([]);

  const [savedSiteID, setSavedSiteID] =
    useState<number | null>(null);

  const [sitesLoading, setSitesLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
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

        await loadSavedSites();
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

  async function loadSavedSites() {
    setSitesLoading(true);

    try {
      const response =
        await authenticatedFetch(
          "/sites",
        );

      if (!response.ok) {
        throw new Error(
          `Impossible de récupérer les sites : ${response.status}`,
        );
      }

      const data: SavedSite[] =
        await response.json();

      setSavedSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSitesLoading(false);
    }
  }

  function currentSavedSite() {
    if (
      savedSiteID === null
    ) {
      return null;
    }

    return (
      savedSites.find(
        (saved) =>
          saved.id ===
          savedSiteID,
      ) ?? null
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/auth");
    router.refresh();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSaveMessage("");
    setSaveError("");
    setSavedSiteID(null);
    setChatMessages([]);

    const serviceList =
      services
        .split(",")
        .map(
          (service) =>
            service.trim(),
        )
        .filter(
          (service) =>
            service !== "",
        );

    try {
      const response =
        await authenticatedFetch(
          "/generate",
          {
            method: "POST",

            body: JSON.stringify({
              businessName,
              activity,
              city,
              phone,
              services:
                serviceList,
            }),
          },
        );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(message);
      }

      const data: GeneratedSite =
        await response.json();

      setSite(data);
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de générer le site.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleModification(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!site) {
      return;
    }

    const instruction =
      editPrompt.trim();

    if (
      instruction === ""
    ) {
      return;
    }

    setEditLoading(true);
    setEditError("");
    setSaveMessage("");

    setChatMessages(
      (messages) => [
        ...messages,
        {
          role: "user",
          text: instruction,
        },
      ],
    );

    setEditPrompt("");

    try {
      const response =
        await authenticatedFetch(
          "/modify",
          {
            method: "POST",

            body: JSON.stringify({
              site,
              instruction,
              designStyle,
              accentColor,
              activity,
              city,
            }),
          },
        );

      if (!response.ok) {
        throw new Error(
          "Erreur modification",
        );
      }

      const data: ModifyResponse =
        await response.json();

      setSite(data.site);

      setDesignStyle(
        data.designStyle,
      );

      setAccentColor(
        data.accentColor,
      );

      setChatMessages(
        (messages) => [
          ...messages,
          {
            role: "assistant",
            text:
              "Modification effectuée.",
          },
        ],
      );
    } catch (err) {
      console.error(err);

      setEditError(
        "Impossible de modifier le site.",
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function saveCurrentSite() {
    if (!site) {
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    const body = {
      site,
      activity,
      city,
      designStyle,
      accentColor,
    };

    try {
      let response: Response;

      if (
        savedSiteID === null
      ) {
        response =
          await authenticatedFetch(
            "/sites",
            {
              method: "POST",

              body:
                JSON.stringify(
                  body,
                ),
            },
          );
      } else {
        response =
          await authenticatedFetch(
            `/sites/${savedSiteID}`,
            {
              method: "PUT",

              body:
                JSON.stringify(
                  body,
                ),
            },
          );
      }

      if (!response.ok) {
        throw new Error(
          "Erreur sauvegarde",
        );
      }

      const saved: SavedSite =
        await response.json();

      setSavedSiteID(
        saved.id,
      );

      setSaveMessage(
        savedSiteID === null
          ? "Site sauvegardé."
          : "Modifications enregistrées.",
      );

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de sauvegarder.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentSite() {
    if (
      savedSiteID === null
    ) {
      setSaveError(
        "Sauvegarde le site avant de le publier.",
      );
      return;
    }

    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${savedSiteID}/publish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Erreur publication",
        );
      }

      const saved: SavedSite =
        await response.json();

      setSaveMessage(
        "🚀 Site publié avec succès.",
      );

      await loadSavedSites();

      router.push(
        `/site/${saved.publicSlug}`,
      );
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de publier le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishCurrentSite() {
    if (
      savedSiteID === null
    ) {
      return;
    }

    setPublishing(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response =
        await authenticatedFetch(
          `/sites/${savedSiteID}/unpublish`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Erreur dépublication",
        );
      }

      setSaveMessage(
        "Le site n'est plus public.",
      );

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de retirer le site.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function openSavedSite(
    id: number,
  ) {
    try {
      const response =
        await authenticatedFetch(
          `/sites/${id}`,
        );

      if (!response.ok) {
        throw new Error(
          "Impossible d'ouvrir le site",
        );
      }

      const saved: SavedSite =
        await response.json();

      setSavedSiteID(
        saved.id,
      );

      setSite(
        saved.site,
      );

      setBusinessName(
        saved.businessName,
      );

      setActivity(
        saved.activity,
      );

      setCity(
        saved.city,
      );

      setPhone(
        saved.phone,
      );

      setDesignStyle(
        saved.designStyle,
      );

      setAccentColor(
        saved.accentColor,
      );

      setServices(
        saved.site.sections
          .map(
            (section) =>
              section.title,
          )
          .join(", "),
      );

      setChatMessages([]);

      setSaveMessage(
        `Site "${saved.businessName}" ouvert.`,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible d'ouvrir ce site.",
      );
    }
  }

  async function deleteSavedSite(
    id: number,
  ) {
    const confirmed =
      window.confirm(
        "Supprimer définitivement ce site ?",
      );

    if (!confirmed) {
      return;
    }

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

      if (
        savedSiteID === id
      ) {
        createNewSite();
      }

      await loadSavedSites();
    } catch (err) {
      console.error(err);

      setSaveError(
        "Impossible de supprimer.",
      );
    }
  }

  function createNewSite() {
    setSavedSiteID(null);
    setSite(null);

    setBusinessName("");
    setActivity("");
    setCity("Montpellier");
    setPhone("");
    setServices("");

    setDesignStyle(
      "moderne",
    );

    setAccentColor(
      "#2563eb",
    );

    setChatMessages([]);

    setSaveMessage("");
    setSaveError("");

    setEditPrompt("");
    setEditError("");
  }

  function getPreviewBackground() {
    if (
      designStyle ===
      "elegant"
    ) {
      return "bg-neutral-950";
    }

    if (
      designStyle ===
      "artisan"
    ) {
      return "bg-stone-900";
    }

    return "bg-slate-950";
  }

  function getCardStyle() {
    if (
      designStyle ===
      "elegant"
    ) {
      return "rounded-none border-neutral-200";
    }

    if (
      designStyle ===
      "artisan"
    ) {
      return "rounded-xl border-stone-200";
    }

    return "rounded-3xl border-slate-200";
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
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  const openedSite =
    currentSavedSite();

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-black">
            Site
            <span className="text-blue-500">
              AI
            </span>
          </div>

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
              onClick={
                createNewSite
              }
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-blue-500"
            >
              + Nouveau site
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

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-blue-400">
            SiteAI
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Crée ton site professionnel

            <span className="block text-blue-500">
              avec l&apos;IA
            </span>
          </h1>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
          <div className="space-y-8">
            <form
              onSubmit={
                handleSubmit
              }
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <h2 className="text-2xl font-bold">
                Ton entreprise
              </h2>

              <div className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Nom de l&apos;entreprise
                  </label>

                  <input
                    value={
                      businessName
                    }
                    onChange={(
                      event,
                    ) =>
                      setBusinessName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Dupont Plomberie"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Activité
                  </label>

                  <input
                    value={activity}
                    onChange={(
                      event,
                    ) =>
                      setActivity(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Plombier"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Ville
                  </label>

                  <input
                    value={city}
                    onChange={(
                      event,
                    ) =>
                      setCity(
                        event.target
                          .value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Téléphone
                  </label>

                  <input
                    value={phone}
                    onChange={(
                      event,
                    ) =>
                      setPhone(
                        event.target
                          .value,
                      )
                    }
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Services
                  </label>

                  <textarea
                    value={services}
                    onChange={(
                      event,
                    ) =>
                      setServices(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Dépannage plomberie, chauffe-eau, rénovation..."
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm text-slate-400">
                    Style
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDesignStyle(
                          "moderne",
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        designStyle ===
                        "moderne"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700"
                      }`}
                    >
                      Moderne
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDesignStyle(
                          "elegant",
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        designStyle ===
                        "elegant"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700"
                      }`}
                    >
                      Élégant
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDesignStyle(
                          "artisan",
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        designStyle ===
                        "artisan"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700"
                      }`}
                    >
                      Artisan
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm text-slate-400">
                    Couleur
                  </p>

                  <div className="flex gap-3">
                    {colors.map(
                      (color) => (
                        <button
                          key={
                            color.value
                          }
                          type="button"
                          title={
                            color.name
                          }
                          onClick={() =>
                            setAccentColor(
                              color.value,
                            )
                          }
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                          className={`h-9 w-9 rounded-full border-2 ${
                            accentColor ===
                            color.value
                              ? "border-white"
                              : "border-transparent"
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                  className="w-full rounded-xl px-6 py-4 font-bold disabled:opacity-50"
                >
                  {loading
                    ? "Création..."
                    : "Créer avec l'IA"}
                </button>

                {error && (
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                )}
              </div>
            </form>

            {site && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
                <h2 className="text-xl font-bold">
                  💾 Sauvegarde et publication
                </h2>

                <button
                  type="button"
                  onClick={
                    saveCurrentSite
                  }
                  disabled={saving}
                  className="mt-5 w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500 disabled:opacity-50"
                >
                  {saving
                    ? "Sauvegarde..."
                    : savedSiteID ===
                        null
                      ? "💾 Sauvegarder"
                      : "💾 Enregistrer les modifications"}
                </button>

                {savedSiteID !==
                  null &&
                  !openedSite?.published && (
                    <button
                      type="button"
                      onClick={
                        publishCurrentSite
                      }
                      disabled={
                        publishing
                      }
                      className="mt-3 w-full rounded-xl bg-blue-600 px-6 py-4 font-bold hover:bg-blue-500 disabled:opacity-50"
                    >
                      {publishing
                        ? "Publication..."
                        : "🚀 Publier le site"}
                    </button>
                  )}

                {openedSite?.published && (
                  <>
                    <a
                      href={`/site/${openedSite.publicSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block w-full rounded-xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-500"
                    >
                      🌍 Voir le site public
                    </a>

                    <button
                      type="button"
                      onClick={
                        unpublishCurrentSite
                      }
                      disabled={
                        publishing
                      }
                      className="mt-3 w-full rounded-xl border border-red-800 px-6 py-4 font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                    >
                      Retirer de la publication
                    </button>

                    <div className="mt-4 rounded-xl bg-slate-950 p-4">
                      <p className="text-xs uppercase text-slate-500">
                        Adresse publique
                      </p>

                      <p className="mt-2 break-all text-sm text-blue-400">
                        /site/
                        {
                          openedSite.publicSlug
                        }
                      </p>
                    </div>
                  </>
                )}

                {saveMessage && (
                  <p className="mt-4 text-sm text-green-400">
                    {saveMessage}
                  </p>
                )}

                {saveError && (
                  <p className="mt-4 text-sm text-red-400">
                    {saveError}
                  </p>
                )}
              </div>
            )}

            {site && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
                <h2 className="text-xl font-bold">
                  ✨ Modifier avec l&apos;IA
                </h2>

                <div className="mt-5 space-y-3">
                  {chatMessages.map(
                    (
                      message,
                      index,
                    ) => (
                      <div
                        key={index}
                        className={`rounded-xl p-3 text-sm ${
                          message.role ===
                          "user"
                            ? "bg-blue-600"
                            : "bg-slate-800"
                        }`}
                      >
                        {
                          message.text
                        }
                      </div>
                    ),
                  )}
                </div>

                <form
                  onSubmit={
                    handleModification
                  }
                  className="mt-5"
                >
                  <textarea
                    value={
                      editPrompt
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditPrompt(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Mets le site en vert..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={
                      editLoading
                    }
                    style={{
                      backgroundColor:
                        accentColor,
                    }}
                    className="mt-3 w-full rounded-xl px-6 py-4 font-bold disabled:opacity-50"
                  >
                    {editLoading
                      ? "Modification..."
                      : "Modifier"}
                  </button>

                  {editError && (
                    <p className="mt-3 text-sm text-red-400">
                      {editError}
                    </p>
                  )}
                </form>
              </div>
            )}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  📂 Mes sites
                </h2>

                <button
                  type="button"
                  onClick={
                    loadSavedSites
                  }
                  className="text-sm text-blue-400"
                >
                  Actualiser
                </button>
              </div>

              {sitesLoading ? (
                <p className="mt-5 text-slate-400">
                  Chargement...
                </p>
              ) : savedSites.length ===
                0 ? (
                <p className="mt-5 text-slate-500">
                  Aucun site sauvegardé.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {savedSites.map(
                    (saved) => (
                      <div
                        key={
                          saved.id
                        }
                        className={`rounded-xl border p-4 ${
                          savedSiteID ===
                          saved.id
                            ? "border-blue-500 bg-slate-950"
                            : "border-slate-800 bg-slate-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">
                              {
                                saved.businessName
                              }
                            </p>

                            <p className="text-sm text-slate-400">
                              {
                                saved.activity
                              }{" "}
                              • {saved.city}
                            </p>
                          </div>

                          {saved.published ? (
                            <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold text-green-400">
                              Public
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-500">
                              Brouillon
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-slate-600">
                          {formatDate(
                            saved.updatedAt,
                          )}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openSavedSite(
                                saved.id,
                              )
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
                          >
                            Ouvrir
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSavedSite(
                                saved.id,
                              )
                            }
                            className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400"
                          >
                            Supprimer
                          </button>
                        </div>

                        {saved.published &&
                          saved.publicSlug && (
                            <a
                              href={`/site/${saved.publicSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block rounded-lg border border-green-800 px-3 py-2 text-center text-sm text-green-400"
                            >
                              🌍 Voir en ligne
                            </a>
                          )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            {!site ? (
              <div className="flex min-h-[700px] items-center justify-center text-center">
                <div>
                  <div className="text-7xl">
                    ✨
                  </div>

                  <h2 className="mt-5 text-3xl font-bold">
                    Aperçu du site
                  </h2>
                </div>
              </div>
            ) : (
              <div className="bg-white text-slate-950">
                <nav className="flex items-center justify-between border-b px-8 py-5">
                  <strong>
                    {
                      site.businessName
                    }
                  </strong>

                  {site.phone && (
                    <a
                      href={`tel:${site.phone}`}
                      style={{
                        color:
                          accentColor,
                      }}
                    >
                      {site.phone}
                    </a>
                  )}
                </nav>

                <section
                  className={`${getPreviewBackground()} px-8 py-24 text-center text-white`}
                >
                  <p
                    style={{
                      color:
                        accentColor,
                    }}
                    className="font-bold uppercase tracking-widest"
                  >
                    {
                      site.businessName
                    }
                  </p>

                  <h2 className="mx-auto mt-4 max-w-3xl text-5xl font-black">
                    {
                      site.heroTitle
                    }
                  </h2>

                  <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
                    {
                      site.heroText
                    }
                  </p>

                  {site.phone && (
                    <a
                      href={`tel:${site.phone}`}
                      style={{
                        backgroundColor:
                          accentColor,
                      }}
                      className="mt-8 inline-block rounded-xl px-7 py-4 font-bold text-white"
                    >
                      Appeler
                    </a>
                  )}
                </section>

                <section className="px-8 py-20">
                  <div className="grid gap-6 md:grid-cols-2">
                    {site.sections.map(
                      (
                        section,
                        index,
                      ) => (
                        <article
                          key={index}
                          className={`border p-7 ${getCardStyle()}`}
                        >
                          <div
                            style={{
                              backgroundColor:
                                accentColor,
                            }}
                            className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
                          >
                            {index + 1}
                          </div>

                          <h3 className="text-xl font-bold">
                            {
                              section.title
                            }
                          </h3>

                          <p className="mt-3 leading-7 text-slate-600">
                            {
                              section.text
                            }
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                </section>

                <footer className="bg-slate-950 px-8 py-10 text-white">
                  <p className="font-bold">
                    {
                      site.businessName
                    }
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {activity} à{" "}
                    {city}
                  </p>
                </footer>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}