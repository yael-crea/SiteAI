import { AuthClient } from "@supabase/auth-js";
import { StorageClient } from "@supabase/storage-js";

/*
 * Client Supabase allégé : Lumio n'utilise que la connexion (auth) et le
 * stockage de fichiers (storage). createClient() de @supabase/supabase-js
 * charge aussi le temps réel, la base de données et les fonctions (environ
 * 60 Ko compressés sur chaque page de l'espace client).
 *
 * Construction reprise à l'identique de @supabase/supabase-js 2.116.0
 * (SupabaseClient) : même URL, même clé de session dans le navigateur
 * (sb-<projet>-auth-token), mêmes options de connexion et mêmes en-têtes.
 * Les sessions existantes restent donc valides.
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL est manquante",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est manquante",
  );
}

const baseUrl = new URL(supabaseUrl.trim().endsWith("/") ? supabaseUrl.trim() : `${supabaseUrl.trim()}/`);

// Même en-tête d'identification que supabase-js dans le navigateur.
const clientHeaders = {
  "X-Client-Info": `supabase-js/2.116.0; runtime=${typeof document !== "undefined" ? "web" : "node"}`,
};

const auth = new AuthClient({
  url: new URL("auth/v1", baseUrl).href,
  headers: {
    Authorization: `Bearer ${supabasePublishableKey}`,
    apikey: supabasePublishableKey,
    ...clientHeaders,
  },
  storageKey: `sb-${baseUrl.hostname.split(".")[0]}-auth-token`,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: "implicit",
  hasCustomAuthorizationHeader: false,
});

// Requêtes de stockage : jeton de la session en cours, sinon la clé publique (comme supabase-js).
async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const { data } = await auth.getSession();
  const headers = new Headers(init?.headers);
  if (!headers.has("apikey")) headers.set("apikey", supabasePublishableKey as string);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${data.session?.access_token ?? supabasePublishableKey}`);
  }
  return fetch(input, { ...init, headers });
}

const storage = new StorageClient(new URL("storage/v1", baseUrl).href, clientHeaders, fetchWithAuth);

export const supabase = { auth, storage };
