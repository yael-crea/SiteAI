// Messages d'erreur Supabase Auth traduits : jamais de texte technique anglais affiché tel quel.

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed:
    "Ton adresse e-mail n’est pas encore confirmée. Ouvre le lien reçu par e-mail, ou demande un nouvel envoi ci-dessous.",
  user_already_exists: "Un compte existe déjà avec cette adresse e-mail.",
  email_exists: "Un compte existe déjà avec cette adresse e-mail.",
  over_email_send_rate_limit:
    "Trop d’e-mails ont été envoyés récemment. Réessaie dans quelques minutes.",
  over_request_rate_limit:
    "Trop de tentatives en peu de temps. Patiente quelques minutes avant de réessayer.",
  weak_password:
    "Ce mot de passe est trop simple. Choisis-en un plus long, avec des lettres et des chiffres.",
  same_password: "Le nouveau mot de passe doit être différent de l’ancien.",
  email_address_invalid: "Cette adresse e-mail n’est pas valide.",
  session_not_found:
    "Ta session a expiré. Demande un nouveau lien depuis la page de connexion.",
  otp_expired: "Ce lien a expiré. Demande un nouveau lien.",
};

// Anciennes versions de l'API sans `code` : on reconnaît le message anglais.
const MESSAGES_BY_TEXT: [string, string][] = [
  ["invalid login credentials", MESSAGES_BY_CODE.invalid_credentials],
  ["invalid credentials", MESSAGES_BY_CODE.invalid_credentials],
  ["email not confirmed", MESSAGES_BY_CODE.email_not_confirmed],
  ["already registered", MESSAGES_BY_CODE.user_already_exists],
  ["email rate limit exceeded", MESSAGES_BY_CODE.over_email_send_rate_limit],
  ["for security purposes, you can only request this", MESSAGES_BY_CODE.over_request_rate_limit],
  ["rate limit", MESSAGES_BY_CODE.over_request_rate_limit],
  ["should be different from the old password", MESSAGES_BY_CODE.same_password],
  ["auth session missing", MESSAGES_BY_CODE.session_not_found],
];

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const { code } = error as { code: unknown };
  return typeof code === "string" ? code : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : "";
}

export function isEmailNotConfirmed(error: unknown): boolean {
  return (
    errorCode(error) === "email_not_confirmed" ||
    errorText(error).includes("email not confirmed")
  );
}

export function authErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (code && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code];
  const text = errorText(error);
  const match = MESSAGES_BY_TEXT.find(([needle]) => text.includes(needle));
  return match ? match[1] : fallback;
}
