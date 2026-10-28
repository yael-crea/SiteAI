"use client";

/*
 * Notifications Lumio.
 *
 *   <ToastProvider>…</ToastProvider>          (une fois, autour de la page)
 *   const toast = useToast();
 *   const result = await save();              (attendre la vraie réponse)
 *   toast({ tone: "success", title: "Site enregistré" });
 *
 * Règle : une notification de réussite n'est envoyée qu'après la
 * confirmation de l'opération. La liste est une zone annoncée par les
 * lecteurs d'écran ; les erreurs le sont immédiatement
 * (role="alert") et restent affichées jusqu'à leur fermeture ; les autres
 * disparaissent après quelques secondes, sauf si la souris ou le focus
 * clavier est dessus.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Icon from "./Icon";
import styles from "./ui.module.css";

export type ToastTone = "info" | "success" | "danger";
export type ToastOptions = { title: string; description?: string; tone?: ToastTone; duration?: number };
type ToastItem = Required<Pick<ToastOptions, "title" | "tone">> & ToastOptions & { id: number; leaving: boolean };

const MAX_VISIBLE = 3;
const EXIT_MS = 180;
const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast doit être utilisé dans un <ToastProvider>.");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback((options: ToastOptions) => {
    const id = ++nextId.current;
    const item: ToastItem = { ...options, tone: options.tone ?? "info", id, leaving: false };
    setItems((current) => [...current, item].slice(-MAX_VISIBLE));
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol className={styles.toastRegion} aria-label="Notifications" aria-live="polite" aria-relevant="additions">
        {items.map((item) => <ToastCard key={item.id} item={item} onDismiss={dismiss} />)}
      </ol>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const duration = item.duration ?? (item.tone === "danger" ? 0 : 5000);

  useEffect(() => {
    if (!duration || paused || item.leaving) return;
    const timer = window.setTimeout(() => onDismiss(item.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, paused, item.id, item.leaving, onDismiss]);

  const icon = item.tone === "success" ? "check" : item.tone === "danger" ? "alert" : "info";

  return (
    <li
      className={styles.toast}
      data-tone={item.tone}
      data-leaving={item.leaving || undefined}
      role={item.tone === "danger" ? "alert" : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.toastIcon}><Icon name={icon} size={18} /></span>
      <span className={styles.toastText}>
        <strong>{item.title}</strong>
        {item.description && <span>{item.description}</span>}
      </span>
      <button type="button" className={styles.toastClose} onClick={() => onDismiss(item.id)} aria-label="Fermer la notification">
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}
