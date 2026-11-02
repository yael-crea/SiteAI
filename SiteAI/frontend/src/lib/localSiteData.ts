/*
 * Données de site gardées dans le navigateur (brouillons, versions, réponses
 * du questionnaire). Elles contiennent les textes et coordonnées du client :
 * on les efface à la déconnexion pour qu'un ordinateur partagé ne les garde pas.
 */

const LOCAL_PREFIXES = ["siteai:"];
const LOCAL_KEYS = ["lumio_pending_creation"];
const SESSION_KEYS = ["siteai_site_to_open", "siteai_onboarding_skipped", "lumio_creation_progress"];

type KeyStorage = Pick<Storage, "length" | "key" | "removeItem">;

function removeMatching(storage: KeyStorage, matches: (key: string) => boolean) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && matches(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

export function clearLocalSiteData(local: KeyStorage, session: KeyStorage) {
  removeMatching(local, (key) => LOCAL_KEYS.includes(key) || LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix)));
  removeMatching(session, (key) => SESSION_KEYS.includes(key));
}
