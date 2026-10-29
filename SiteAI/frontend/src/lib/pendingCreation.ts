/*
 * Réponses du parcours de création gardées pendant l'inscription.
 *
 * Un visiteur peut répondre aux trois questions sans compte ; au moment de
 * générer, ses réponses sont gardées ici, il crée son compte (ou se
 * connecte), puis le parcours reprend à la dernière question.
 *
 * localStorage plutôt que sessionStorage : le lien de confirmation d'e-mail
 * s'ouvre souvent dans un nouvel onglet. Les réponses restent dans le
 * navigateur du visiteur, expirent après 24 h et sont effacées dès que le
 * site est créé.
 */

export type PendingCreation = {
  activity: string;
  businessName: string;
  city: string;
  phone: string;
  goal: string;
  bookingUrl: string;
  templateServices: string[] | null;
  services?: string[];
  tone?: string;
};

const STORAGE_KEY = "lumio_pending_creation";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePendingCreation(answers: PendingCreation) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...answers, savedAt: Date.now() }));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le visiteur devra répondre à nouveau.
  }
}

export function readPendingCreation(): PendingCreation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PendingCreation> & { savedAt?: number };
    if (!data.savedAt || Date.now() - data.savedAt > MAX_AGE_MS || !data.activity?.trim()) {
      clearPendingCreation();
      return null;
    }
    return {
      activity: data.activity,
      businessName: data.businessName ?? "",
      city: data.city ?? "",
      phone: data.phone ?? "",
      goal: data.goal ?? "",
      bookingUrl: data.bookingUrl ?? "",
      templateServices: Array.isArray(data.templateServices) ? data.templateServices : null,
      services: Array.isArray(data.services) ? data.services.filter((item) => typeof item === "string") : [],
      tone: data.tone ?? "",
    };
  } catch {
    return null;
  }
}

export function clearPendingCreation() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à effacer.
  }
}

/** Vrai si des réponses attendent la fin de l'inscription. */
export function hasPendingCreation() {
  return readPendingCreation() !== null;
}
