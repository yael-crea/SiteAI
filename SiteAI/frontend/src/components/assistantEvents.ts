/*
 * Ouverture de l'assistant Lumio depuis n'importe quelle page.
 *
 * Fichier séparé de LumioAssistant.tsx : les pages importent ce petit module
 * tout de suite et chargent l'assistant lui-même à la demande. Une demande
 * envoyée avant que l'assistant soit chargé est gardée, puis rejouée dès son
 * arrivée.
 */

export const OPEN_ASSISTANT_EVENT = "lumio-assistant:open";

type PendingOpen = { prompt?: string; send?: boolean };

declare global {
  interface Window {
    __lumioAssistantPending?: PendingOpen;
  }
}

/** `send` envoie aussitôt la demande au lieu de seulement préremplir le champ. */
export function openLumioAssistant(prompt?: string, options: { send?: boolean } = {}) {
  const detail: PendingOpen = { prompt, send: options.send };
  window.__lumioAssistantPending = detail;
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail }));
}

/** Demande d'ouverture arrivée avant le chargement de l'assistant (lue une seule fois). */
export function takePendingAssistantOpen(): PendingOpen | null {
  const pending = window.__lumioAssistantPending ?? null;
  window.__lumioAssistantPending = undefined;
  return pending;
}
