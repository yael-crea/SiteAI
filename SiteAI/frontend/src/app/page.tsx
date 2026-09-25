"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SitePreview from "@/components/SitePreview";

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

const MAX_GALLERY_IMAGES = 8;

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

  const [manualEditorOpen, setManualEditorOpen] =
    useState(false);

  const [logoUploading, setLogoUploading] =
    useState(false);

  const [logoError, setLogoError] =
    useState("");

  const [heroImageUploading, setHeroImageUploading] =
    useState(false);

  const [heroImageError, setHeroImageError] =
    useState("");

  const [galleryUploading, setGalleryUploading] =
    useState(false);

  const [galleryRemovingIndex, setGalleryRemovingIndex] =
    useState<number | null>(null);

  const [galleryError, setGalleryError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

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

        const siteToOpen =
          sessionStorage.getItem(
            "siteai_site_to_open",
          );

        if (siteToOpen) {
          sessionStorage.removeItem(
            "siteai_site_to_open",
          );

          const siteID =
            Number(siteToOpen);

          if (
            Number.isInteger(siteID) &&
            siteID > 0
          ) {
            await openSavedSite(
              siteID,
            );
          }
        }
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
    setManualEditorOpen(false);

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

      const generatedSite: GeneratedSite = {
        ...data,
        logoUrl:
          data.logoUrl ?? "",
        heroImageUrl:
          data.heroImageUrl ?? "",
        gallery:
          data.gallery ?? [],
      };

      setSite(generatedSite);
      setBusinessName(
        generatedSite.businessName ||
          businessName,
      );
      setPhone(
        generatedSite.phone ||
          phone,
      );
      setManualEditorOpen(true);
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

      const modifiedSite: GeneratedSite = {
        ...data.site,
        logoUrl:
          data.site.logoUrl ||
          site.logoUrl ||
          "",
        heroImageUrl:
          data.site.heroImageUrl ||
          site.heroImageUrl ||
          "",
        gallery:
          data.site.gallery?.length
            ? data.site.gallery
            : site.gallery ?? [],
      };

      setSite(modifiedSite);

      setBusinessName(
        modifiedSite.businessName,
      );

      setPhone(
        modifiedSite.phone,
      );

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

    const synchronizedSite: GeneratedSite = {
      ...site,
      businessName:
        businessName.trim() ||
        site.businessName,
      phone:
        phone.trim() ||
        site.phone,
    };

    setSite(synchronizedSite);

    const body = {
      site: synchronizedSite,
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
        const message =
          await response.text();

        throw new Error(
          message ||
            "Erreur sauvegarde",
        );
      }

      const saved: SavedSite =
        await response.json();

      setSavedSiteID(
        saved.id,
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

      setSite(
        saved.site,
      );

      setSaveMessage(
        saved.published
          ? "✅ Modifications enregistrées et visibles sur le site public."
          : savedSiteID === null
            ? "✅ Site sauvegardé."
            : "✅ Modifications enregistrées.",
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
    setSaveError("");
    setSaveMessage("");

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

      setSite({
        ...saved.site,
        logoUrl:
          saved.site.logoUrl ?? "",
        heroImageUrl:
          saved.site.heroImageUrl ?? "",
        gallery:
          saved.site.gallery ?? [],
      });

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
      setManualEditorOpen(true);

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

  function returnToDashboard() {
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

    router.push("/dashboard");
  }

  function createNewSite() {
    sessionStorage.removeItem(
      "siteai_site_to_open",
    );

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
    setError("");

    setManualEditorOpen(false);
  }

  function getLogoExtension(
    file: File,
  ) {
    const byMime: Record<
      string,
      string
    > = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };

    return (
      byMime[file.type] ||
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg"
    );
  }

  async function handleLogoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file || !site) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setLogoError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setLogoError(
        "Le logo doit faire 5 Mo maximum.",
      );
      return;
    }

    setLogoUploading(true);
    setLogoError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const extension =
        getLogoExtension(file);

      const path =
        `${userData.user.id}/logos/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("site-images")
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("site-images")
          .getPublicUrl(path);

      if (
        !publicData.publicUrl
      ) {
        throw new Error(
          "URL publique introuvable",
        );
      }

      updateSiteField(
        "logoUrl",
        publicData.publicUrl,
      );

      setSaveMessage(
        "✅ Logo envoyé. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      setLogoError(
        "Impossible d'envoyer le logo.",
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleHeroImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file || !site) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setHeroImageError(
        "Format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setHeroImageError(
        "L'image doit faire 5 Mo maximum.",
      );
      return;
    }

    setHeroImageUploading(true);
    setHeroImageError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const extension =
        getLogoExtension(file);

      const path =
        `${userData.user.id}/heroes/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("site-images")
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicData,
      } =
        supabase.storage
          .from("site-images")
          .getPublicUrl(path);

      if (
        !publicData.publicUrl
      ) {
        throw new Error(
          "URL publique introuvable",
        );
      }

      updateSiteField(
        "heroImageUrl",
        publicData.publicUrl,
      );

      setSaveMessage(
        "✅ Image de couverture ajoutée. Pense à enregistrer les modifications.",
      );
    } catch (err) {
      console.error(err);

      setHeroImageError(
        "Impossible d'envoyer l'image de couverture.",
      );
    } finally {
      setHeroImageUploading(false);
    }
  }

  function removeHeroImage() {
    updateSiteField(
      "heroImageUrl",
      "",
    );

    setHeroImageError("");
    setSaveMessage(
      "Image de couverture retirée. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  function getStoragePathFromPublicUrl(
    url: string,
  ) {
    const marker =
      "/storage/v1/object/public/site-images/";

    const markerIndex =
      url.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath =
      url.slice(
        markerIndex +
          marker.length,
      );

    try {
      return decodeURIComponent(
        encodedPath,
      );
    } catch {
      return encodedPath;
    }
  }

  async function handleGalleryUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ?? [],
      );

    event.target.value = "";

    if (
      files.length === 0 ||
      !site
    ) {
      return;
    }

    const currentGallery =
      site.gallery ?? [];

    if (
      currentGallery.length +
        files.length >
      MAX_GALLERY_IMAGES
    ) {
      setGalleryError(
        `Tu peux mettre ${MAX_GALLERY_IMAGES} photos maximum dans la galerie.`,
      );
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    for (const file of files) {
      if (
        !allowedTypes.includes(
          file.type,
        )
      ) {
        setGalleryError(
          "Une des images a un format non autorisé. Utilise JPG, PNG, WebP ou AVIF.",
        );
        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setGalleryError(
          "Chaque image doit faire 5 Mo maximum.",
        );
        return;
      }
    }

    setGalleryUploading(true);
    setGalleryError("");
    setSaveMessage("");
    setSaveError("");

    const uploadedPaths: string[] =
      [];

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Utilisateur non connecté",
        );
      }

      const newUrls: string[] =
        [];

      for (const file of files) {
        const extension =
          getLogoExtension(file);

        const path =
          `${userData.user.id}/gallery/${crypto.randomUUID()}.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("site-images")
            .upload(
              path,
              file,
              {
                cacheControl:
                  "3600",
                upsert: false,
                contentType:
                  file.type,
              },
            );

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(path);

        const {
          data: publicData,
        } =
          supabase.storage
            .from("site-images")
            .getPublicUrl(path);

        if (
          !publicData.publicUrl
        ) {
          throw new Error(
            "URL publique introuvable",
          );
        }

        newUrls.push(
          publicData.publicUrl,
        );
      }

      updateSiteField(
        "gallery",
        [
          ...currentGallery,
          ...newUrls,
        ],
      );

      setSaveMessage(
        `✅ ${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} ajoutée${newUrls.length > 1 ? "s" : ""}. Pense à enregistrer les modifications.`,
      );
    } catch (err) {
      console.error(err);

      if (
        uploadedPaths.length > 0
      ) {
        await supabase.storage
          .from("site-images")
          .remove(uploadedPaths);
      }

      setGalleryError(
        "Impossible d'envoyer les photos de la galerie.",
      );
    } finally {
      setGalleryUploading(false);
    }
  }

  async function removeGalleryImage(
    index: number,
  ) {
    if (!site) {
      return;
    }

    const gallery =
      site.gallery ?? [];

    const imageUrl =
      gallery[index];

    if (!imageUrl) {
      return;
    }

    setGalleryRemovingIndex(index);
    setGalleryError("");
    setSaveError("");

    try {
      const storagePath =
        getStoragePathFromPublicUrl(
          imageUrl,
        );

      if (storagePath) {
        const {
          error: removeError,
        } =
          await supabase.storage
            .from("site-images")
            .remove([
              storagePath,
            ]);

        if (removeError) {
          throw removeError;
        }
      }

      updateSiteField(
        "gallery",
        gallery.filter(
          (
            _,
            galleryIndex,
          ) =>
            galleryIndex !==
            index,
        ),
      );

      setSaveMessage(
        "Photo retirée de la galerie. Enregistre les modifications.",
      );
    } catch (err) {
      console.error(err);

      setGalleryError(
        "Impossible de supprimer cette photo.",
      );
    } finally {
      setGalleryRemovingIndex(
        null,
      );
    }
  }

  function moveGalleryImage(
    index: number,
    direction:
      | "left"
      | "right",
  ) {
    if (!site) {
      return;
    }

    const gallery = [
      ...(site.gallery ?? []),
    ];

    const targetIndex =
      direction === "left"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        gallery.length
    ) {
      return;
    }

    const currentImage =
      gallery[index];

    gallery[index] =
      gallery[targetIndex];

    gallery[targetIndex] =
      currentImage;

    updateSiteField(
      "gallery",
      gallery,
    );
  }

  function removeLogo() {
    updateSiteField(
      "logoUrl",
      "",
    );

    setLogoError("");
    setSaveMessage(
      "Logo retiré de la page. Enregistre les modifications pour appliquer ce changement.",
    );
  }

  function updateSiteField<
    K extends keyof GeneratedSite,
  >(
    field: K,
    value: GeneratedSite[K],
  ) {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [field]: value,
        };
      },
    );

    if (
      field === "businessName"
    ) {
      setBusinessName(
        String(value),
      );
    }

    if (
      field === "phone"
    ) {
      setPhone(
        String(value),
      );
    }

    setSaveMessage("");
  }

  function updateSection(
    index: number,
    field: keyof SiteSection,
    value: string,
  ) {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        const sections =
          current.sections.map(
            (section, sectionIndex) =>
              sectionIndex === index
                ? {
                    ...section,
                    [field]: value,
                  }
                : section,
          );

        return {
          ...current,
          sections,
        };
      },
    );

    setSaveMessage("");
  }

  function addSection() {
    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections: [
            ...current.sections,
            {
              title:
                "Nouveau service",
              text:
                "Décrivez ici ce service.",
            },
          ],
        };
      },
    );

    setSaveMessage("");
  }

  function removeSection(
    index: number,
  ) {
    if (!site) {
      return;
    }

    if (
      site.sections.length <= 1
    ) {
      setSaveError(
        "Le site doit conserver au moins une section.",
      );

      return;
    }

    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          sections:
            current.sections.filter(
              (_, sectionIndex) =>
                sectionIndex !==
                index,
            ),
        };
      },
    );

    setSaveMessage("");
    setSaveError("");
  }

  function moveSection(
    index: number,
    direction: "up" | "down",
  ) {
    if (!site) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        site.sections.length
    ) {
      return;
    }

    setSite(
      (current) => {
        if (!current) {
          return current;
        }

        const sections = [
          ...current.sections,
        ];

        const temporary =
          sections[index];

        sections[index] =
          sections[targetIndex];

        sections[targetIndex] =
          temporary;

        return {
          ...current,
          sections,
        };
      },
    );

    setSaveMessage("");
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
          <button
            type="button"
            onClick={returnToDashboard}
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
              onClick={returnToDashboard}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-blue-500"
            >
              ← Dashboard
            </button>

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

        <div className="grid gap-8 xl:grid-cols-[440px_1fr]">
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

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Utilise ces informations pour créer un nouveau site avec l&apos;IA.
              </p>

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
                    {(
                      [
                        [
                          "moderne",
                          "Moderne",
                        ],
                        [
                          "elegant",
                          "Élégant",
                        ],
                        [
                          "artisan",
                          "Artisan",
                        ],
                      ] as const
                    ).map(
                      ([
                        value,
                        label,
                      ]) => (
                        <button
                          key={
                            value
                          }
                          type="button"
                          onClick={() =>
                            setDesignStyle(
                              value,
                            )
                          }
                          className={`rounded-xl border px-3 py-3 text-sm ${
                            designStyle ===
                            value
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm text-slate-400">
                    Couleur
                  </p>

                  <div className="flex flex-wrap gap-3">
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

                    <input
                      type="color"
                      value={
                        accentColor
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccentColor(
                          event.target
                            .value,
                        )
                      }
                      title="Couleur personnalisée"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      ✍️ Éditeur manuel
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Modifie directement le contenu puis enregistre.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setManualEditorOpen(
                        (open) =>
                          !open,
                      )
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                  >
                    {manualEditorOpen
                      ? "Fermer"
                      : "Ouvrir"}
                  </button>
                </div>

                {manualEditorOpen && (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
                          {site.logoUrl ? (
                            <img
                              src={site.logoUrl}
                              alt={`Logo ${site.businessName}`}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="px-2 text-center text-xs text-slate-500">
                              Aucun logo
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-bold">
                            Logo de l&apos;entreprise
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            JPG, PNG, WebP ou AVIF • 5 Mo maximum.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500">
                              {logoUploading
                                ? "Envoi..."
                                : site.logoUrl
                                  ? "Remplacer le logo"
                                  : "Ajouter un logo"}

                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                disabled={logoUploading}
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>

                            {site.logoUrl && (
                              <button
                                type="button"
                                onClick={removeLogo}
                                disabled={logoUploading}
                                className="rounded-xl border border-red-900 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                              >
                                Retirer le logo
                              </button>
                            )}
                          </div>

                          {logoError && (
                            <p className="mt-3 text-sm text-red-400">
                              {logoError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <p className="font-bold">
                        Image de couverture
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Grande photo affichée derrière le titre principal du site.
                      </p>

                      {site.heroImageUrl && (
                        <img
                          src={site.heroImageUrl}
                          alt="Image de couverture"
                          className="mt-4 h-48 w-full rounded-2xl object-cover"
                        />
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500">
                          {heroImageUploading
                            ? "Envoi..."
                            : site.heroImageUrl
                              ? "Remplacer l'image"
                              : "Ajouter une image"}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            disabled={heroImageUploading}
                            onChange={handleHeroImageUpload}
                            className="hidden"
                          />
                        </label>

                        {site.heroImageUrl && (
                          <button
                            type="button"
                            onClick={removeHeroImage}
                            disabled={heroImageUploading}
                            className="rounded-xl border border-red-900 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                          >
                            Retirer l&apos;image
                          </button>
                        )}
                      </div>

                      {heroImageError && (
                        <p className="mt-3 text-sm text-red-400">
                          {heroImageError}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            Galerie photos
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Ajoute jusqu&apos;à {MAX_GALLERY_IMAGES} photos. Tu peux ensuite changer leur ordre.
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                          {(site.gallery ?? []).length}/{MAX_GALLERY_IMAGES}
                        </span>
                      </div>

                      {(site.gallery ?? []).length > 0 && (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          {(site.gallery ?? []).map(
                            (
                              imageUrl,
                              index,
                            ) => (
                              <div
                                key={`${imageUrl}-${index}`}
                                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Photo ${index + 1} de ${site.businessName}`}
                                  className="h-36 w-full object-cover"
                                />

                                <div className="flex items-center justify-between gap-2 p-3">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={index === 0 || galleryUploading}
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          "left",
                                        )
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                                    >
                                      ←
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        index ===
                                          (site.gallery ?? []).length -
                                            1 ||
                                        galleryUploading
                                      }
                                      onClick={() =>
                                        moveGalleryImage(
                                          index,
                                          "right",
                                        )
                                      }
                                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                                    >
                                      →
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      galleryRemovingIndex ===
                                        index ||
                                      galleryUploading
                                    }
                                    onClick={() =>
                                      removeGalleryImage(
                                        index,
                                      )
                                    }
                                    className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-40"
                                  >
                                    {galleryRemovingIndex ===
                                    index
                                      ? "Suppression..."
                                      : "Supprimer"}
                                  </button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      <div className="mt-5">
                        <label
                          className={`inline-block rounded-xl px-4 py-3 text-sm font-bold ${
                            galleryUploading ||
                            (site.gallery ?? []).length >=
                              MAX_GALLERY_IMAGES
                              ? "cursor-not-allowed bg-slate-700 text-slate-400"
                              : "cursor-pointer bg-blue-600 hover:bg-blue-500"
                          }`}
                        >
                          {galleryUploading
                            ? "Envoi des photos..."
                            : "Ajouter des photos"}

                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            disabled={
                              galleryUploading ||
                              (site.gallery ?? []).length >=
                                MAX_GALLERY_IMAGES
                            }
                            onChange={handleGalleryUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {galleryError && (
                        <p className="mt-3 text-sm text-red-400">
                          {galleryError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Nom affiché
                      </label>

                      <input
                        value={
                          site.businessName
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "businessName",
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-slate-400">
                          Activité
                        </label>

                        <input
                          value={
                            activity
                          }
                          onChange={(
                            event,
                          ) => {
                            setActivity(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
                          }}
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
                          ) => {
                            setCity(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Téléphone
                      </label>

                      <input
                        value={
                          site.phone
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "phone",
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Grand titre
                      </label>

                      <textarea
                        value={
                          site.heroTitle
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "heroTitle",
                            event.target
                              .value,
                          )
                        }
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-400">
                        Texte d&apos;accueil
                      </label>

                      <textarea
                        value={
                          site.heroText
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSiteField(
                            "heroText",
                            event.target
                              .value,
                          )
                        }
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="border-t border-slate-800 pt-6">
                      <p className="font-bold">
                        SEO Google
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Ces textes sont utilisés pour le titre et la description Google du site public.
                      </p>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-slate-400">
                          Titre SEO
                        </label>

                        <input
                          value={
                            site.metaTitle
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSiteField(
                              "metaTitle",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {
                            site.metaTitle
                              .length
                          }{" "}
                          caractères
                        </p>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-slate-400">
                          Description SEO
                        </label>

                        <textarea
                          value={
                            site.metaDescription
                          }
                          onChange={(
                            event,
                          ) =>
                            updateSiteField(
                              "metaDescription",
                              event.target
                                .value,
                            )
                          }
                          rows={4}
                          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                        />

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {
                            site.metaDescription
                              .length
                          }{" "}
                          caractères
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            Sections / services
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Tu peux modifier, supprimer, ajouter ou déplacer les blocs.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            addSection
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"
                        >
                          + Ajouter
                        </button>
                      </div>

                      <div className="mt-5 space-y-5">
                        {site.sections.map(
                          (
                            section,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-slate-300">
                                  Section{" "}
                                  {
                                    index +
                                    1
                                  }
                                </p>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      0
                                    }
                                    onClick={() =>
                                      moveSection(
                                        index,
                                        "up",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      site
                                        .sections
                                        .length -
                                        1
                                    }
                                    onClick={() =>
                                      moveSection(
                                        index,
                                        "down",
                                      )
                                    }
                                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs disabled:opacity-30"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSection(
                                        index,
                                      )
                                    }
                                    className="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>

                              <input
                                value={
                                  section.title
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateSection(
                                    index,
                                    "title",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Titre"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                              />

                              <textarea
                                value={
                                  section.text
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateSection(
                                    index,
                                    "text",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Texte"
                                rows={4}
                                className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6">
                      <p className="mb-3 font-bold">
                        Apparence
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            [
                              "moderne",
                              "Moderne",
                            ],
                            [
                              "elegant",
                              "Élégant",
                            ],
                            [
                              "artisan",
                              "Artisan",
                            ],
                          ] as const
                        ).map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              key={
                                value
                              }
                              type="button"
                              onClick={() => {
                                setDesignStyle(
                                  value,
                                );
                                setSaveMessage(
                                  "",
                                );
                              }}
                              className={`rounded-xl border px-3 py-3 text-sm ${
                                designStyle ===
                                value
                                  ? "border-blue-500 bg-blue-500/10"
                                  : "border-slate-700"
                              }`}
                            >
                              {label}
                            </button>
                          ),
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
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
                              onClick={() => {
                                setAccentColor(
                                  color.value,
                                );
                                setSaveMessage(
                                  "",
                                );
                              }}
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

                        <input
                          type="color"
                          value={
                            accentColor
                          }
                          onChange={(
                            event,
                          ) => {
                            setAccentColor(
                              event.target
                                .value,
                            );
                            setSaveMessage(
                              "",
                            );
                          }}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        saveCurrentSite
                      }
                      disabled={saving}
                      className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500 disabled:opacity-50"
                    >
                      {saving
                        ? "Enregistrement..."
                        : openedSite?.published
                          ? "💾 Enregistrer et mettre à jour le site public"
                          : savedSiteID ===
                              null
                            ? "💾 Sauvegarder le site"
                            : "💾 Enregistrer les modifications"}
                    </button>
                  </div>
                )}
              </div>
            )}

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

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Exemple : « rends le titre plus professionnel », « ajoute un service dépannage » ou « passe le site en vert ».
                </p>

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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-blue-500"
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
                      : "Modifier avec l'IA"}
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

                  <p className="mt-3 text-slate-500">
                    Crée ou ouvre un site pour commencer.
                  </p>
                </div>
              </div>
            ) : (
              <SitePreview
                site={site}
                designStyle={designStyle}
                accentColor={accentColor}
                activity={activity}
                city={city}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
