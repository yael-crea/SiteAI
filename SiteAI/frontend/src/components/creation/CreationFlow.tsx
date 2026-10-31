"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SitePreview from "@/components/SitePreview";
import { activityExamples } from "@/lib/activityExamples";
import { designStyles, getDesignStyle, type DesignStyle } from "@/lib/designStyles";
import { clearExampleTemplate, readExampleTemplate } from "@/lib/exampleTemplates";
import { tradeHeroLayout, withTradePhotos } from "@/lib/tradePhotos";
import { clearPendingCreation, readPendingCreation, savePendingCreation } from "@/lib/pendingCreation";
import type { SiteGoal } from "@/lib/siteGoal";
import type { GeneratedSite } from "@/lib/builderTypes";
import styles from "./CreationFlow.module.css";

type Step = "activity" | "business" | "services" | "goal" | "generating" | "style";
type Goal = Exclude<SiteGoal, "legacy">;

type CreationFlowProps = {
  /** Premier site : si l'utilisateur a déjà des sites, on le renvoie au tableau de bord. */
  firstSite?: boolean;
};

const goals: { id: Goal; title: string; text: string; goal: string; action: string }[] = [
  {
    id: "quote",
    title: "Me demander un devis",
    text: "Un formulaire clair pour recevoir des demandes détaillées.",
    goal: "obtenir des demandes de devis qualifiées",
    action: "demander un devis",
  },
  {
    id: "calls",
    title: "M'appeler",
    text: "Ton numéro mis en avant, un appel en un geste sur mobile.",
    goal: "obtenir des appels de clients",
    action: "appeler",
  },
  {
    id: "booking",
    title: "Réserver",
    text: "Un bouton vers ton outil de réservation, ou une demande de créneau.",
    goal: "obtenir des réservations",
    action: "réserver",
  },
];

// Ton des textes : envoyé tel quel à la génération (le premier reprend l'ancien réglage par défaut).
const tones = [
  {
    id: "expert",
    title: "Professionnel",
    text: "Clair et rassurant, pour inspirer confiance.",
    tone: "professionnel, sobre et chaleureux",
    style: "clair et concis",
  },
  {
    id: "warm",
    title: "Chaleureux",
    text: "Proche et simple, comme on parle à un voisin.",
    tone: "chaleureux, proche et bienveillant",
    style: "simple et convivial",
  },
  {
    id: "premium",
    title: "Haut de gamme",
    text: "Élégant et sobre, pour une clientèle exigeante.",
    tone: "élégant, sobre et raffiné",
    style: "soigné et concis",
  },
  {
    id: "dynamic",
    title: "Dynamique",
    text: "Direct et énergique, qui donne envie d'agir.",
    tone: "dynamique, direct et motivant",
    style: "court et percutant",
  },
] as const;

type ToneId = (typeof tones)[number]["id"];

const MAX_SERVICES = 6;

const generatingMessages = [
  "J'analyse ton métier…",
  "J'écris tes textes, sans rien inventer…",
  "Je mets en valeur tes services…",
  "Je prépare trois styles pour toi…",
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function findActivityExample(activity: string) {
  const query = normalize(activity);
  if (!query) return null;
  return (
    activityExamples.find((item) => normalize(item.label) === query) ??
    activityExamples.find(
      (item) =>
        normalize(item.label).includes(query) ||
        item.keywords.some((keyword) => query.includes(normalize(keyword))),
    ) ??
    null
  );
}

/** Trois styles adaptés au métier, toujours différents les uns des autres. */
function suggestedStyles(activity: string): DesignStyle[] {
  const value = normalize(activity);
  const has = (...words: string[]) => words.some((word) => value.includes(word));
  if (has("ongle", "beaute", "esthet", "coiff", "barb", "massage", "bien-etre", "tatou", "fleur", "photo"))
    return ["elegant", "premium", "minimaliste"];
  if (has("restaurant", "pizz", "traiteur", "boulang", "patiss", "cafe", "bar"))
    return ["tradition", "elegant", "nature"];
  if (has("jardin", "paysag", "piscin", "yoga", "pilates"))
    return ["nature", "minimaliste", "elegant"];
  if (has("avocat", "comptable", "immobil", "architect", "consult", "formateur", "agence", "marketing"))
    return ["minimaliste", "premium", "moderne"];
  if (has("coach", "sport", "dj", "evenement", "lavage", "detailing"))
    return ["dynamique", "creatif", "moderne"];
  return ["moderne", "artisan", "minimaliste"];
}

export default function CreationFlow({ firstSite = false }: CreationFlowProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  // Sans compte, on peut répondre aux questions : le compte n'est demandé qu'au moment de générer.
  const [signedIn, setSignedIn] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [step, setStep] = useState<Step>("activity");
  const [activity, setActivity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [goal, setGoal] = useState<Goal>("quote");
  const [phone, setPhone] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [templateServices, setTemplateServices] = useState<string[] | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [servicesActivity, setServicesActivity] = useState("");
  const [customService, setCustomService] = useState("");
  const [tone, setTone] = useState<ToneId>("expert");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedSite | null>(null);
  const [styleChoices, setStyleChoices] = useState<DesignStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const { data } = await supabase.auth.getSession();
      const pending = data.session ? readPendingCreation() : null;
      if (data.session && active) setSignedIn(true);
      // Quelqu'un qui revient de l'inscription avec des réponses en attente reste ici.
      if (data.session && firstSite && !pending) {
        try {
          const response = await fetch("/api-backend/sites", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            cache: "no-store",
          });
          if (response.ok) {
            const sites: unknown[] = await response.json();
            if (Array.isArray(sites) && sites.length > 0) {
              router.replace(readExampleTemplate() ? "/builder" : "/dashboard");
              return;
            }
          }
        } catch {
          // On laisse l'utilisateur créer son site même si la vérification échoue.
        }
      }
      const template = readExampleTemplate();
      if (template && active) {
        setActivity(template.activity);
        setCity(template.city);
        setTemplateServices(template.services);
      }
      // Arrivée depuis une page /site-internet/[metier] : le métier est déjà choisi.
      const requestedTrade = new URLSearchParams(window.location.search).get("metier");
      const trade = activityExamples.find((item) => item.label === requestedTrade);
      if (!template && trade && active) setActivity(trade.label);
      if (pending && active) {
        setActivity(pending.activity);
        setBusinessName(pending.businessName);
        setCity(pending.city);
        setPhone(pending.phone);
        setBookingUrl(pending.bookingUrl);
        if (pending.templateServices) setTemplateServices(pending.templateServices);
        if (pending.services?.length) {
          setServices(pending.services.slice(0, MAX_SERVICES));
          setServicesActivity(pending.activity);
        }
        const savedTone = tones.find((item) => item.id === pending.tone);
        if (savedTone) setTone(savedTone.id);
        const savedGoal = goals.find((item) => item.id === pending.goal);
        if (savedGoal) setGoal(savedGoal.id);
        setResumed(true);
        setStep("goal");
      }
      if (active) setChecking(false);
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [firstSite, router]);

  useEffect(() => {
    if (checking) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [step, checking]);

  useEffect(() => {
    if (step !== "generating") return;
    const timer = window.setInterval(
      () => setMessageIndex((index) => Math.min(index + 1, generatingMessages.length - 1)),
      2600,
    );
    return () => window.clearInterval(timer);
  }, [step]);

  const suggestions = useMemo(() => {
    const query = normalize(activity);
    const list = query
      ? activityExamples.filter(
          (item) =>
            normalize(item.label).includes(query) ||
            item.keywords.some((keyword) => normalize(keyword).includes(query)),
        )
      : activityExamples;
    return list.slice(0, query ? 6 : 8).map((item) => item.label);
  }, [activity]);

  const stepNumber = step === "activity" ? 1 : step === "business" ? 2 : step === "services" ? 3 : 4;

  // Services proposés : ceux du modèle choisi, sinon ceux du métier ; les services ajoutés à la main restent en tête.
  const serviceOptions = useMemo(() => {
    const suggested: string[] = [...(templateServices ?? findActivityExample(activity)?.services ?? [])];
    const custom = services.filter((item) => !suggested.includes(item));
    return [...custom, ...suggested.slice(0, 12)];
  }, [templateServices, activity, services]);

  function toggleService(label: string) {
    setError("");
    setServices((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : current.length >= MAX_SERVICES
          ? current
          : [...current, label],
    );
  }

  function addCustomService() {
    const label = customService.trim().replace(/\s+/g, " ");
    if (!label) return;
    if (services.length >= MAX_SERVICES) {
      setError(`Garde ${MAX_SERVICES} services au maximum : tu pourras en ajouter d'autres dans l'éditeur.`);
      return;
    }
    setError("");
    if (!services.some((item) => normalize(item) === normalize(label))) setServices((current) => [...current, label]);
    setCustomService("");
  }

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.replace("/auth");
      throw new Error("Ta session a expiré. Reconnecte-toi.");
    }
    return token;
  }

  function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity.trim()) {
      setError("Indique ton métier, par exemple « Plombier » ou « Coiffeuse ».");
      return;
    }
    setError("");
    setStep("business");
  }

  function submitBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessName.trim()) {
      setError("Indique le nom de ton entreprise (tu pourras le changer ensuite).");
      return;
    }
    if (!city.trim()) {
      setError("Indique la ville où tu travailles.");
      return;
    }
    setError("");
    // Nouveau métier : on repart des services proposés pour ce métier (les quatre premiers).
    if (servicesActivity !== activity) {
      setServices((templateServices ?? findActivityExample(activity)?.services ?? []).slice(0, 4));
      setServicesActivity(activity);
    }
    setStep("services");
  }

  function submitServices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Aucun service n'est obligatoire : sans choix, la génération part des services généraux du métier.
    setError("");
    setStep("goal");
  }

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!signedIn) {
      // Les réponses sont gardées pendant l'inscription, puis le parcours reprend ici.
      savePendingCreation({ activity, businessName, city, phone, goal, bookingUrl, templateServices, services, tone });
      router.push("/auth?compte=nouveau");
      return;
    }
    setError("");
    setMessageIndex(0);
    setStep("generating");

    const example = findActivityExample(activity);
    const chosenServices = services.length ? services : templateServices ?? example?.services.slice(0, 4) ?? [];
    const selectedTone = tones.find((item) => item.id === tone) ?? tones[0];
    const selectedGoal = goals.find((item) => item.id === goal) ?? goals[0];

    try {
      const response = await fetch("/api-backend/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          businessName: businessName.trim(),
          activity: activity.trim(),
          city: city.trim(),
          phone: phone.trim(),
          services: chosenServices,
          goal: selectedGoal.goal,
          tone: selectedTone.tone,
          communicationStyle: selectedTone.style,
          primaryAction: selectedGoal.action,
        }),
      });
      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "La création n'a pas abouti. Réessaie dans un instant.");
      }
      const data: GeneratedSite = await response.json();
      const site: GeneratedSite = {
        ...data,
        businessName: data.businessName || businessName.trim(),
        phone: data.phone || phone.trim(),
        siteGoal: goal,
        bookingUrl: goal === "booking" ? bookingUrl.trim() : "",
        logoUrl: data.logoUrl ?? "",
        heroImageUrl: data.heroImageUrl ?? "",
        gallery: data.gallery ?? [],
        sections: (data.sections ?? []).map((section) => ({
          ...section,
          imageMode: section.imageMode ?? "auto",
          imageUrl: section.imageUrl ?? "",
          hidden: section.hidden ?? false,
        })),
        serviceArea: data.serviceArea ?? city.trim(),
      };
      const choices = suggestedStyles(activity);
      // Sans photo, le site paraît vide : on part des photos du métier, remplaçables dans l'éditeur.
      setGenerated(withTradePhotos(site, activity));
      setStyleChoices(choices);
      setSelectedStyle(choices[0]);
      setStep("style");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La création n'a pas abouti.");
      setStep("goal");
    }
  }

  async function openSite() {
    if (!generated || !selectedStyle || saving) return;
    setSaving(true);
    setError("");
    const style = getDesignStyle(selectedStyle);
    try {
      const response = await fetch("/api-backend/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          site: {
            ...generated,
            designSettings: designFor(style),
          },
          activity: activity.trim(),
          city: city.trim(),
          designStyle: style.id,
          accentColor: style.accent,
        }),
      });
      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "Ton site a été créé mais n'a pas pu être enregistré. Réessaie.");
      }
      const saved: { id: number } = await response.json();
      clearExampleTemplate();
      clearPendingCreation();
      sessionStorage.setItem("siteai_onboarding_skipped", "true");
      sessionStorage.setItem("siteai_site_to_open", String(saved.id));
      router.push("/builder");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer ton site.");
      setSaving(false);
    }
  }

  // Réglages d'un style pour ce site : le haut de page suit le métier quand le site a une photo principale.
  function designFor(style: ReturnType<typeof getDesignStyle>) {
    const hero = generated?.heroImageUrl ? tradeHeroLayout(activity) : undefined;
    return { ...generated?.designSettings, ...style.settings, ...(hero ? { heroLayout: hero } : {}) };
  }

  function back() {
    setError("");
    if (step === "business") setStep("activity");
    else if (step === "services") setStep("business");
    else if (step === "goal") setStep("services");
    else if (step === "style") setStep("goal");
  }

  if (checking) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <strong>
            lumio<span>.</span>
          </strong>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href={signedIn ? "/dashboard" : "/"} className={styles.logo} aria-label={signedIn ? "Lumio, tableau de bord" : "Lumio, accueil"}>
          lumio<span>.</span>
        </Link>
        {step !== "generating" && step !== "style" && (
          <div className={styles.progress} aria-label={`Question ${stepNumber} sur 4`}>
            {[1, 2, 3, 4].map((index) => (
              <i key={index} className={index <= stepNumber ? styles.progressDone : undefined} />
            ))}
          </div>
        )}
        <Link href={signedIn ? "/dashboard" : "/"} className={styles.quit}>
          Quitter
        </Link>
      </header>

      {step === "activity" && (
        <form className={styles.question} onSubmit={submitActivity}>
          <p className={styles.eyebrow}>Question 1 sur 4</p>
          <h1>
            Quel est <em>ton métier ?</em>
          </h1>
          <p className={styles.lead}>Lumio écrit tes textes à partir de ton activité réelle.</p>
          <label className={styles.field}>
            <span className={styles.srOnly}>Ton métier</span>
            <input
              ref={inputRef}
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              placeholder="Ex. : Plombier, Coiffeuse, Restaurant…"
              autoComplete="off"
              maxLength={80}
            />
          </label>
          <div className={styles.chips} aria-label="Suggestions de métiers">
            {suggestions.map((label) => (
              <button
                key={label}
                type="button"
                className={normalize(label) === normalize(activity) ? styles.chipActive : undefined}
                onClick={() => {
                  setActivity(label);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>
              Continuer <Arrow />
            </button>
          </div>
        </form>
      )}

      {step === "business" && (
        <form className={styles.question} onSubmit={submitBusiness}>
          <p className={styles.eyebrow}>Question 2 sur 4</p>
          <h1>
            Ton entreprise, <em>et où tu travailles.</em>
          </h1>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Nom de l&apos;entreprise</span>
              <input
                ref={inputRef}
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Ex. : Atelier du Robinet"
                autoComplete="organization"
                maxLength={120}
              />
            </label>
            <label className={styles.field}>
              <span>Ville</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ex. : Montpellier"
                autoComplete="address-level2"
                maxLength={80}
              />
            </label>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={back}>
              Retour
            </button>
            <button type="submit" className={styles.primary}>
              Continuer <Arrow />
            </button>
          </div>
        </form>
      )}

      {step === "services" && (
        <form className={styles.question} onSubmit={submitServices}>
          <p className={styles.eyebrow}>Question 3 sur 4</p>
          <h1>
            Tes services, <em>et ta façon de parler.</em>
          </h1>
          <p className={styles.lead}>
            {serviceOptions.length > 0
              ? `Choisis jusqu’à ${MAX_SERVICES} services à mettre en avant. Lumio écrit une présentation pour chacun.`
              : "Ajoute tes principaux services, ou continue : Lumio proposera des services adaptés à ton métier."}
          </p>
          {serviceOptions.length > 0 && (
          <div className={styles.chips} role="group" aria-label="Services à mettre en avant">
            {serviceOptions.map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed={services.includes(label)}
                className={services.includes(label) ? styles.chipActive : undefined}
                onClick={() => toggleService(label)}
              >
                {label}
              </button>
            ))}
          </div>
          )}
          <label className={`${styles.field} ${styles.addService}`}>
            <span>Un autre service ?</span>
            <div>
              <input
                ref={inputRef}
                value={customService}
                onChange={(event) => setCustomService(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomService();
                  }
                }}
                placeholder="Ex. : Remplacement de cumulus"
                maxLength={60}
              />
              <button type="button" className={styles.ghost} onClick={addCustomService} disabled={!customService.trim()}>
                Ajouter
              </button>
            </div>
          </label>
          <p className={styles.subhead}>Le ton de tes textes</p>
          <div className={`${styles.goalGrid} ${styles.toneGrid}`} role="radiogroup" aria-label="Ton des textes">
            {tones.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={tone === item.id}
                className={`${styles.goal} ${tone === item.id ? styles.goalActive : ""}`}
                onClick={() => setTone(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={back}>
              Retour
            </button>
            <button type="submit" className={styles.primary}>
              Continuer <Arrow />
            </button>
          </div>
        </form>
      )}

      {step === "goal" && (
        <form className={styles.question} onSubmit={generate}>
          <p className={styles.eyebrow}>Question 4 sur 4</p>
          <h1>
            Que doivent faire <em>tes visiteurs ?</em>
          </h1>
          <div className={styles.goalGrid} role="radiogroup" aria-label="Objectif du site">
            {goals.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={goal === item.id}
                className={`${styles.goal} ${goal === item.id ? styles.goalActive : ""}`}
                onClick={() => setGoal(item.id)}
              >
                <small>0{index + 1}</small>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          {goal === "calls" && (
            <label className={styles.field}>
              <span>Ton numéro (facultatif)</span>
              <input
                ref={inputRef}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="06 12 34 56 78"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
              />
            </label>
          )}
          {goal === "booking" && (
            <label className={styles.field}>
              <span>Lien de ton outil de réservation (facultatif)</span>
              <input
                ref={inputRef}
                value={bookingUrl}
                onChange={(event) => setBookingUrl(event.target.value)}
                placeholder="https://…"
                inputMode="url"
                maxLength={300}
              />
            </label>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={back}>
              Retour
            </button>
            <button type="submit" className={styles.primary}>
              {signedIn ? "Créer mon site" : "Créer mon compte et générer"} <Arrow />
            </button>
          </div>
          <p className={styles.note}>
            {!signedIn
              ? "Tes réponses sont gardées. Crée ton compte gratuit, sans carte bancaire, pour lancer la génération."
              : resumed
                ? "Tes réponses sont prêtes : vérifie-les puis lance la création. Une création compte comme une demande IA."
                : "Une création compte comme une demande IA. Rien n’est publié sans ton accord."}
          </p>
        </form>
      )}

      {step === "generating" && (
        <section className={styles.generating} aria-live="polite">
          <div className={styles.sketch} aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
            <b />
            <b />
          </div>
          <p className={styles.eyebrow}>Création en cours</p>
          <h1>
            {businessName.trim() || "Ton site"}, <em>presque prêt.</em>
          </h1>
          <p className={styles.lead}>{generatingMessages[messageIndex]}</p>
        </section>
      )}

      {step === "style" && generated && (
        <section className={styles.styleStep}>
          <div className={styles.styleHead}>
            <div>
              <p className={styles.eyebrow}>Dernière étape</p>
              <h1>
                Choisis <em>ton style.</em>
              </h1>
              <p className={styles.lead}>
                Ton contenu est prêt. Compare trois ambiances ; tu pourras tout changer ensuite.
              </p>
            </div>
            <div className={styles.styleActions}>
              <button type="button" className={styles.ghost} onClick={back} disabled={saving}>
                Modifier mes réponses
              </button>
              <button type="button" className={styles.primary} onClick={openSite} disabled={!selectedStyle || saving}>
                {saving ? "Ouverture…" : "Ouvrir mon site"} <Arrow />
              </button>
            </div>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.styleGrid} role="radiogroup" aria-label="Styles proposés">
            {styleChoices.map((id) => {
              const style = getDesignStyle(id);
              return (
                <div
                  key={id}
                  role="radio"
                  tabIndex={0}
                  aria-checked={selectedStyle === id}
                  aria-label={`Style ${style.label}`}
                  className={`${styles.styleCard} ${selectedStyle === id ? styles.styleCardActive : ""}`}
                  onClick={() => !saving && setSelectedStyle(id)}
                  onKeyDown={(event) => {
                    if (saving || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    setSelectedStyle(id);
                  }}
                >
                  <PreviewThumb>
                    <SitePreview
                      previewOnly
                      site={{ ...generated, designSettings: designFor(style) }}
                      designStyle={style.id}
                      accentColor={style.accent}
                      activity={activity.trim()}
                      city={city.trim()}
                    />
                  </PreviewThumb>
                  <span className={styles.styleLabel}>
                    <strong>{style.label}</strong>
                    <span>{style.description}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className={styles.note}>
            {designStyles.length - styleChoices.length} autres styles et toutes les couleurs restent disponibles dans l&apos;éditeur.
          </p>
        </section>
      )}
    </main>
  );
}

/**
 * Miniature d'un site : on le rend à sa vraie largeur (bureau ou mobile, selon
 * l'écran, pour que la mise en page corresponde) puis on le réduit pour qu'il
 * tienne dans la carte.
 */
function PreviewThumb({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ width: 1280, scale: 0.3 });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const width = window.innerWidth >= 1024 ? 1280 : 390;
      const available = frame.clientWidth || width * 0.3;
      setLayout({ width, scale: available / width });
    };
    const frameId = window.requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={frameRef} className={styles.previewFrame} aria-hidden="true" inert>
      <div
        className={styles.previewScale}
        style={{ width: layout.width, transform: `scale(${layout.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="16" height="16">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
