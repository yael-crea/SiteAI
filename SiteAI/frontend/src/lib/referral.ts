/*
 * Code de parrainage reçu par lien (lumio.business/?parrain=CODE). La page
 * d'accueil statique l'enregistre sous cette clé (public/decouvrir.html) ;
 * il est envoyé au premier paiement, où le backend relie le filleul à son
 * parrain. Valable 90 jours.
 */

export const REFERRAL_STORAGE_KEY = "lumio_referral";
const REFERRAL_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export function readReferralCode(now = Date.now()): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = JSON.parse(window.localStorage.getItem(REFERRAL_STORAGE_KEY) ?? "null");
    if (
      saved &&
      typeof saved.code === "string" &&
      /^[a-z0-9]{6,16}$/.test(saved.code) &&
      typeof saved.at === "number" &&
      now - saved.at < REFERRAL_MAX_AGE_MS
    ) {
      return saved.code;
    }
  } catch {
    // Stockage indisponible ou valeur illisible : pas de parrainage.
  }
  return "";
}
