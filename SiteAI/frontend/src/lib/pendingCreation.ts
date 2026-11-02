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
  strengths?: string;
  serviceArea?: string;
  openingHours?: string;
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
      strengths: data.strengths ?? "",
      serviceArea: data.serviceArea ?? "",
      openingHours: data.openingHours ?? "",
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

/*
 * Questionnaire en cours dans cet onglet : un rechargement reprend à la même
 * question avec les mêmes réponses. sessionStorage suffit ici, l'onglet reste
 * le même ; les réponses sont effacées dès que le site est créé.
 */

export type CreationStep = "activity" | "business" | "services" | "goal";
export type CreationProgress = PendingCreation & { step: CreationStep; servicesActivity: string };

const PROGRESS_KEY = "lumio_creation_progress";
const PROGRESS_STEPS: CreationStep[] = ["activity", "business", "services", "goal"];

export function saveCreationProgress(progress: CreationProgress) {
  try {
    window.sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Stockage indisponible : un rechargement repartira de la première question.
  }
}

export function readCreationProgress(): CreationProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CreationProgress>;
    if (!data.step || !PROGRESS_STEPS.includes(data.step)) return null;
    return {
      step: data.step,
      servicesActivity: data.servicesActivity ?? "",
      activity: data.activity ?? "",
      businessName: data.businessName ?? "",
      city: data.city ?? "",
      phone: data.phone ?? "",
      goal: data.goal ?? "",
      bookingUrl: data.bookingUrl ?? "",
      templateServices: Array.isArray(data.templateServices) ? data.templateServices : null,
      services: Array.isArray(data.services) ? data.services.filter((item) => typeof item === "string") : [],
      tone: data.tone ?? "",
      strengths: data.strengths ?? "",
      serviceArea: data.serviceArea ?? "",
      openingHours: data.openingHours ?? "",
    };
  } catch {
    return null;
  }
}

export function clearCreationProgress() {
  try {
    window.sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    // Rien à effacer.
  }
}
