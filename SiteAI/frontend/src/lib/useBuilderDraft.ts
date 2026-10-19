"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SAVE_DELAY_MS = 600;
const HISTORY_LIMIT = 50;

export type DraftStatus = "idle" | "saving" | "saved" | "error" | "restore-available";
export type BuilderDraft<T> = { value: T; savedAt: string };
export type BuilderDraftOptions<T> = {
  /** Include both the authenticated user ID and the site ID (or `new`). */
  storageKey: string | null;
  value: T;
  onRestore: (value: T) => void;
  /** Enable only after the server value and storage key refer to the same site. */
  enabled: boolean;
  validate: (value: unknown) => value is T;
};

type History = { past: string[]; present: string; future: string[]; lastChangeAt: number | null };
type DraftSession<T> = {
  key: string;
  current: string;
  history: History;
  candidate: BuilderDraft<T> | null;
  pending: string | null;
  timer: ReturnType<typeof setTimeout> | null;
};

export function createDraftHistory(snapshot: string): History {
  return { past: [], present: snapshot, future: [], lastChangeAt: null };
}

/** One typing burst is one undo step; undo/redo always end a burst. */
export function recordDraftHistory(history: History, snapshot: string, now: number): History {
  if (snapshot === history.present) return history;
  const coalesce = history.lastChangeAt !== null && now - history.lastChangeAt < SAVE_DELAY_MS;
  return {
    past: coalesce ? history.past : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: snapshot,
    future: [],
    lastChangeAt: now,
  };
}

export function moveDraftHistory(history: History, direction: "undo" | "redo"): History {
  if (direction === "undo") {
    if (!history.past.length) return history;
    return {
      past: history.past.slice(0, -1),
      present: history.past[history.past.length - 1],
      future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
      lastChangeAt: null,
    };
  }
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: history.future[0],
    future: history.future.slice(1),
    lastChangeAt: null,
  };
}

export function readBuilderDraft<T>(raw: string, validate: (value: unknown) => value is T): BuilderDraft<T> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const envelope = parsed as Record<string, unknown>;
    if (envelope.version !== 1 || typeof envelope.savedAt !== "string" || !Number.isFinite(Date.parse(envelope.savedAt))) return null;
    if (!validate(envelope.value)) return null;
    return { value: envelope.value, savedAt: envelope.savedAt };
  } catch {
    return null;
  }
}

function serialize(value: unknown): string {
  const snapshot = JSON.stringify(value);
  if (typeof snapshot !== "string") throw new Error("Invalid draft snapshot");
  return snapshot;
}

/** Browser-only drafts. Saving a draft never publishes or changes the server. */
export function useBuilderDraft<T>({ storageKey, value, onRestore, enabled, validate }: BuilderDraftOptions<T>) {
  const serialized = useMemo(() => {
    try {
      return serialize(value);
    } catch {
      return null;
    }
  }, [value]);
  const sessionRef = useRef<DraftSession<T> | null>(null);
  const callbacksRef = useRef({ onRestore, validate });
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState<BuilderDraft<T> | null>(null);
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    callbacksRef.current = { onRestore, validate };
  }, [onRestore, validate]);

  const updateAvailability = useCallback((session: DraftSession<T>) => {
    setAvailability({ canUndo: session.history.past.length > 0, canRedo: session.history.future.length > 0 });
  }, []);

  const cancelTimer = useCallback((session: DraftSession<T>) => {
    if (session.timer !== null) clearTimeout(session.timer);
    session.timer = null;
  }, []);

  const flush = useCallback((session: DraftSession<T>, notify = true) => {
    cancelTimer(session);
    if (session.candidate || session.pending === null) return;
    try {
      const stamp = new Date().toISOString();
      window.localStorage.setItem(session.key, JSON.stringify({ version: 1, savedAt: stamp, value: JSON.parse(session.pending) }));
      session.pending = null;
      if (notify && sessionRef.current === session) {
        setStatus("saved");
        setSavedAt(stamp);
        setError(null);
      }
    } catch {
      // Keep the pending snapshot so a later edit, retry, or pagehide can retry it.
      if (notify && sessionRef.current === session) {
        setStatus("error");
        setError("Le brouillon n’a pas pu être enregistré sur cet appareil. Enregistrez votre site avec le bouton Enregistrer.");
      }
    }
  }, [cancelTimer]);

  const queueSave = useCallback((session: DraftSession<T>, snapshot: string) => {
    if (session.candidate) return;
    cancelTimer(session);
    session.pending = snapshot;
    setStatus("saving");
    setError(null);
    session.timer = setTimeout(() => flush(session), SAVE_DELAY_MS);
  }, [cancelTimer, flush]);

  // A key/enable transition is a new document boundary. Cleanup writes only the
  // old session's pending snapshot, never the new site's value to the old key.
  useEffect(() => {
    if (!enabled || !storageKey) {
      sessionRef.current = null;
      // Reset the state machine when the draft document is disabled or removed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      setError(null);
      setSavedAt(null);
      setRestoredDraft(null);
      setAvailability({ canUndo: false, canRedo: false });
      return;
    }
    if (serialized === null) {
      setStatus("error");
      setError("Ce brouillon ne peut pas être enregistré. Enregistrez votre site avec le bouton Enregistrer.");
      return;
    }
    const session: DraftSession<T> = {
      key: storageKey,
      current: serialized,
      history: createDraftHistory(serialized),
      candidate: null,
      pending: null,
      timer: null,
    };
    sessionRef.current = session;
    setStatus("idle");
    setError(null);
    setSavedAt(null);
    setRestoredDraft(null);
    setAvailability({ canUndo: false, canRedo: false });
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        const draft = readBuilderDraft(raw, callbacksRef.current.validate);
        if (!draft) {
          setStatus("error");
          setError("Le brouillon enregistré est illisible. Vos prochaines modifications créeront un nouveau brouillon.");
        } else if (serialize(draft.value) !== serialized) {
          session.candidate = draft;
          setRestoredDraft(draft);
          setStatus("restore-available");
        } else {
          setSavedAt(draft.savedAt);
          setStatus("saved");
        }
      }
    } catch {
      setStatus("error");
      setError("Le stockage local est indisponible. Utilisez le bouton Enregistrer pour conserver vos modifications.");
    }
    const handlePageHide = () => flush(session, false);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush(session, false);
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
      flush(session, false);
      if (sessionRef.current === session) sessionRef.current = null;
    };
    // Value changes are handled below; they must not reset the undo history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled, flush]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!enabled || !session || session.key !== storageKey) return;
    if (serialized === null) {
      cancelTimer(session);
      session.pending = null;
      // Surface serialization failures as part of the draft state machine.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setError("Ce brouillon ne peut pas être enregistré. Enregistrez votre site avec le bouton Enregistrer.");
      return;
    }
    if (session.current === serialized) return;
    session.current = serialized;
    session.history = recordDraftHistory(session.history, serialized, Date.now());
    updateAvailability(session);
    queueSave(session, serialized);
  }, [serialized, enabled, storageKey, cancelTimer, queueSave, updateAvailability]);

  const restoreDraft = useCallback(() => {
    const session = sessionRef.current;
    if (!session?.candidate || !enabled || session.key !== storageKey) return;
    const draft = session.candidate;
    const snapshot = serialize(draft.value);
    // Restoration is reversible, and is a separate action from a typing burst.
    session.history = recordDraftHistory({ ...session.history, lastChangeAt: null }, snapshot, Date.now());
    session.history.lastChangeAt = null;
    session.current = snapshot;
    session.candidate = null;
    setRestoredDraft(null);
    setSavedAt(draft.savedAt);
    setStatus("saved");
    setError(null);
    updateAvailability(session);
    callbacksRef.current.onRestore(JSON.parse(snapshot) as T);
  }, [enabled, storageKey, updateAvailability]);

  const discardDraft = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !enabled || session.key !== storageKey) return;
    session.candidate = null;
    setRestoredDraft(null);
    queueSave(session, session.current);
    flush(session);
  }, [enabled, storageKey, queueSave, flush]);

  /** Remove this key before turning an unsaved site into a server-backed site. */
  const clearDraft = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.key !== storageKey) return;
    cancelTimer(session);
    session.pending = null;
    session.candidate = null;
    setRestoredDraft(null);
    try {
      window.localStorage.removeItem(session.key);
      setStatus("idle");
      setError(null);
      setSavedAt(null);
    } catch {
      setStatus("error");
      setError("Le brouillon local n’a pas pu être supprimé sur cet appareil.");
    }
  }, [storageKey, cancelTimer]);

  const navigateHistory = useCallback((direction: "undo" | "redo") => {
    const session = sessionRef.current;
    if (!session || !enabled || session.key !== storageKey) return;
    const next = moveDraftHistory(session.history, direction);
    if (next === session.history) return;
    session.history = next;
    session.current = next.present;
    updateAvailability(session);
    queueSave(session, next.present);
    callbacksRef.current.onRestore(JSON.parse(next.present) as T);
  }, [enabled, storageKey, queueSave, updateAvailability]);

  const undo = useCallback(() => navigateHistory("undo"), [navigateHistory]);
  const redo = useCallback(() => navigateHistory("redo"), [navigateHistory]);

  /** Set a baseline when intentionally replacing a document under the same key. */
  const resetHistory = useCallback((nextValue?: T) => {
    const session = sessionRef.current;
    if (!session || session.key !== storageKey) return;
    const snapshot = nextValue === undefined ? session.current : serialize(nextValue);
    session.current = snapshot;
    session.history = createDraftHistory(snapshot);
    updateAvailability(session);
  }, [storageKey, updateAvailability]);

  const retrySave = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !enabled || session.key !== storageKey || session.candidate) return;
    session.pending = session.current;
    flush(session);
  }, [enabled, storageKey, flush]);

  return { status, error, savedAt, restoredDraft, restoreDraft, discardDraft, clearDraft, retrySave, undo, redo, resetHistory, ...availability };
}
