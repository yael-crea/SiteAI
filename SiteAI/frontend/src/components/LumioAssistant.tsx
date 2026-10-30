"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { GeneratedSite } from "@/lib/builderTypes";
import styles from "./LumioAssistant.module.css";

/** Contexte du site ouvert dans l'éditeur, envoyé avec chaque message. */
export type AssistantSiteContext = {
  site: GeneratedSite;
  designStyle: string;
  accentColor: string;
  activity: string;
  city: string;
};

export type AssistantModification = {
  site: GeneratedSite;
  designStyle: string;
  accentColor: string;
};

type AssistantResponse = {
  reply: string;
  action: "answer" | "modified";
  suggestions?: string[];
  site?: GeneratedSite;
  designStyle?: string;
  accentColor?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  modified?: boolean;
  undone?: boolean;
};

type LumioAssistantProps = {
  /** Nom de la page, transmis à l'IA pour adapter ses réponses. */
  page: string;
  /** Renvoie le site ouvert (éditeur uniquement). */
  getSiteContext?: () => AssistantSiteContext | null;
  /**
   * Applique une modification renvoyée par l'assistant et retourne une
   * fonction d'annulation.
   */
  onSiteModified?: (modification: AssistantModification) => (() => void) | void;
  /** Empêche l'envoi quand l'éditeur est déjà occupé. */
  busy?: boolean;
  /** Prévient la page quand l'assistant travaille (pour bloquer l'enregistrement). */
  onBusyChange?: (busy: boolean) => void;
  /** Distance du bouton par rapport au bas de l'écran sur mobile. */
  mobileOffset?: number;
  starterSuggestions?: string[];
  /** Masque le bouton flottant sur ordinateur (la page a sa propre entrée vers l'assistant). */
  hideDesktopLauncher?: boolean;
};

import { OPEN_ASSISTANT_EVENT, takePendingAssistantOpen } from "./assistantEvents";

// Conservé pour les imports existants ; l'événement vit dans assistantEvents.ts.
export { OPEN_ASSISTANT_EVENT, openLumioAssistant } from "./assistantEvents";

/** Ouvre l'assistant depuis n'importe quel bouton, avec un message pré-rempli. */

const defaultSuggestions = [
  "Comment publier mon site ?",
  "Connecter mon nom de domaine",
  "Quelle formule choisir ?",
];

const editorSuggestions = [
  "Rends les textes plus professionnels",
  "Passe le site en vert sapin",
  "Ajoute un service dépannage urgent",
  "Améliore mon référencement Google",
];

function storageKey(page: string) {
  return `lumio:assistant:v1:${page}`;
}

function readStoredMessages(page: string): Message[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey(page));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Message =>
          !!item &&
          typeof item === "object" &&
          typeof (item as Message).text === "string" &&
          ["user", "assistant", "error"].includes((item as Message).role),
      )
      .slice(-30)
      // Une annulation n'a de sens que dans la session qui l'a créée.
      .map((item) => ({ ...item, undone: item.modified ? true : item.undone }));
  } catch {
    return [];
  }
}

function writeStoredMessages(page: string, messages: Message[]) {
  try {
    window.sessionStorage.setItem(storageKey(page), JSON.stringify(messages.slice(-30)));
  } catch {
    // Stockage indisponible : la conversation reste en mémoire.
  }
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5Z"
        fill="currentColor"
      />
      <path
        d="M18.5 15.5c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5Z"
        fill="currentColor"
        opacity=".7"
      />
    </svg>
  );
}

export default function LumioAssistant({
  page,
  getSiteContext,
  onSiteModified,
  busy = false,
  onBusyChange,
  mobileOffset = 92,
  starterSuggestions,
  hideDesktopLauncher = false,
}: LumioAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() =>
    typeof window === "undefined" ? [] : readStoredMessages(page),
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const undoActions = useRef(new Map<string, () => void>());
  const [undoableIds, setUndoableIds] = useState<string[]>([]);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const titleId = useId();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  useEffect(() => {
    // Détecté après le montage pour éviter un écart entre serveur et navigateur.
    const timer = window.setTimeout(() => setVoiceAvailable(getSpeechRecognition() !== null), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    onBusyChange?.(sending);
  }, [sending, onBusyChange]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.continuous = false;
    const before = draft.trim();
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }
      transcript = transcript.trim();
      if (transcript) setDraft(before ? `${before} ${transcript}` : transcript);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      inputRef.current?.focus();
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  }

  const inEditor = Boolean(getSiteContext);
  const baseSuggestions =
    starterSuggestions ?? (inEditor ? editorSuggestions : defaultSuggestions);

  useEffect(() => {
    writeStoredMessages(page, messages);
  }, [messages, page]);

  useEffect(() => {
    if (!open) return;
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    function openWith(prompt?: string, autoSend?: boolean) {
      takePendingAssistantOpen();
      setOpen(true);
      if (prompt && autoSend) window.setTimeout(() => void sendRef.current(prompt), 0);
      else if (prompt) setDraft(prompt);
    }
    function handleOpen(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string; send?: boolean }>).detail;
      openWith(detail?.prompt, detail?.send);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, handleOpen);
    // L'assistant est chargé à la demande : on rejoue une ouverture demandée avant son arrivée.
    const pending = takePendingAssistantOpen();
    const timer = pending ? window.setTimeout(() => openWith(pending.prompt, pending.send), 0) : undefined;
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, handleOpen);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Sur mobile, le panneau occupe tout l'écran : on bloque le défilement derrière.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  function resizeInput() {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }

  useEffect(resizeInput, [draft]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    if (busy) {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "error",
          text: "L'éditeur termine une action en cours. Réessaie dans quelques secondes.",
        },
      ]);
      return;
    }

    const history = messages
      .filter((item) => item.role !== "error")
      .slice(-8)
      .map((item) => ({ role: item.role, text: item.text }));

    setMessages((current) => [...current, { id: newId(), role: "user", text: message }]);
    setDraft("");
    setSuggestions([]);
    setSending(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Ta session a expiré. Reconnecte-toi pour utiliser l'assistant.");
      }

      const siteContext = getSiteContext?.() ?? null;
      const response = await fetch("/api-backend/assistant", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          message,
          history,
          page,
          ...(siteContext ?? {}),
        }),
      });

      if (!response.ok) {
        const detail = (await response.text()).trim();
        if (response.status === 401) {
          throw new Error("Ta session a expiré. Reconnecte-toi pour utiliser l'assistant.");
        }
        if (response.status === 404) {
          throw new Error("L'assistant est en cours de déploiement. Réessaie dans quelques minutes.");
        }
        throw new Error(detail || "L'assistant ne répond pas pour le moment.");
      }

      const result: AssistantResponse = await response.json();
      const id = newId();
      let modified = false;

      if (result.action === "modified" && result.site && onSiteModified) {
        const undo = onSiteModified({
          site: result.site,
          designStyle: result.designStyle ?? siteContext?.designStyle ?? "",
          accentColor: result.accentColor ?? siteContext?.accentColor ?? "",
        });
        if (typeof undo === "function") {
          undoActions.current.set(id, undo);
          setUndoableIds((current) => [...current, id]);
        }
        modified = true;
      }

      setMessages((current) => [
        ...current,
        { id, role: "assistant", text: result.reply, modified },
      ]);
      setSuggestions(result.suggestions ?? []);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "error",
          text:
            error instanceof Error && error.message
              ? error.message
              : "L'assistant ne répond pas pour le moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  function undo(id: string) {
    const action = undoActions.current.get(id);
    if (!action) return;
    action();
    undoActions.current.delete(id);
    setUndoableIds((current) => current.filter((item) => item !== id));
    setMessages((current) => [
      ...current.map((item) => (item.id === id ? { ...item, undone: true } : item)),
      { id: newId(), role: "assistant", text: "C'est annulé : ton site est revenu à la version précédente." },
    ]);
  }

  function reset() {
    undoActions.current.clear();
    setUndoableIds([]);
    setMessages([]);
    setSuggestions([]);
  }

  useEffect(() => {
    sendRef.current = send;
  });

  const visibleSuggestions = suggestions.length > 0 ? suggestions : messages.length === 0 ? baseSuggestions : [];

  return (
    <div
      className={styles.root}
      style={{ ["--assistant-mobile-offset" as string]: `${mobileOffset}px` }}
    >
      <button
        ref={launcherRef}
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""} ${hideDesktopLauncher ? styles.launcherMobileOnly : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
      >
        <SparkIcon className={styles.launcherIcon} />
        Assistant
      </button>

      {open && (
        <section
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className={styles.header}>
            <div className={styles.headerText}>
              <h2 id={titleId} className={styles.title}>
                Assistant <em>Lumio</em>
              </h2>
              <p className={styles.subtitle}>
                {inEditor
                  ? "Je réponds à tes questions et je modifie ton site."
                  : "Je réponds à tes questions sur Lumio."}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={reset}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              onClick={close}
              aria-label="Fermer l'assistant"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={messagesRef} className={styles.messages} aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <h3>
                  Dis-moi ce que tu veux, <em>je m&apos;en occupe.</em>
                </h3>
                <p>
                  {inEditor
                    ? "Demande une modification en langage simple (« ajoute mes horaires », « change la couleur »…) ou pose une question. Chaque modification peut être annulée en un clic."
                    : "Publication, domaine, abonnement, prospects : pose ta question. Pour modifier un site, ouvre-le dans l'éditeur et je pourrai le changer directement."}
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.bubble} ${
                  message.role === "user"
                    ? styles.user
                    : message.role === "error"
                      ? styles.error
                      : styles.assistant
                }`}
              >
                {message.modified && <span className={styles.modifiedTag}>Site modifié</span>}
                {message.modified && <br />}
                {message.text}
                {message.modified && (
                  <div>
                    <button
                      type="button"
                      className={styles.undoButton}
                      onClick={() => undo(message.id)}
                      disabled={message.undone || !undoableIds.includes(message.id)}
                    >
                      {message.undone ? "Modification annulée" : "Annuler la modification"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className={styles.typing} role="status">
                <span className={styles.dots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {inEditor ? "Je réfléchis…" : "Je cherche la réponse…"}
              </div>
            )}
          </div>

          {visibleSuggestions.length > 0 && (
            <div className={styles.suggestions}>
              {visibleSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.chip}
                  disabled={sending}
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={draft}
              rows={1}
              maxLength={2000}
              placeholder={
                listening
                  ? "Je t'écoute…"
                  : inEditor
                    ? "Ex. : ajoute mes horaires d'ouverture"
                    : "Pose ta question…"
              }
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Message pour l'assistant"
            />
            {voiceAvailable && (
              <button
                type="button"
                className={`${styles.mic} ${listening ? styles.micActive : ""}`}
                onClick={toggleVoice}
                disabled={sending}
                aria-pressed={listening}
                aria-label={listening ? "Arrêter la dictée" : "Dicter mon message"}
                title={listening ? "Arrêter la dictée" : "Dicter mon message"}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className={styles.send}
              disabled={sending || draft.trim() === ""}
              aria-label="Envoyer"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className={styles.footnote}>
            Les questions ne comptent pas dans ton quota mensuel. Une modification du site compte comme une demande IA.
          </p>
        </section>
      )}
    </div>
  );
}
