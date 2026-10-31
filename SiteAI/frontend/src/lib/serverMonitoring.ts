/*
 * Suivi des erreurs du serveur Next (rendu des pages, routes API, proxy
 * backend) vers Sentry, actif seulement si SENTRY_DSN est défini.
 *
 * L'événement est envoyé directement à l'API « envelope » de Sentry : pas de
 * SDK, donc rien d'ajouté au JavaScript des visiteurs ni à celui des sites
 * clients. Aucun en-tête de requête (cookies, jeton) n'est transmis.
 */

type ErrorContext = {
  path?: string;
  method?: string;
  tags?: Record<string, string>;
};

function parseDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!url.username || !projectId) return null;
    return {
      key: url.username,
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const digest =
      "digest" in error && error.digest !== undefined
        ? String(error.digest)
        : undefined;
    return { type: error.name || "Error", value: error.message, stack: error.stack, digest };
  }
  return { type: "Error", value: String(error), stack: undefined, digest: undefined };
}

export async function reportServerError(
  error: unknown,
  context: ErrorContext = {},
) {
  const dsn = parseDsn(process.env.SENTRY_DSN?.trim() ?? "");
  if (!dsn) return;

  const details = errorDetails(error);
  const eventId = crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: now,
    platform: "javascript",
    level: "error",
    logger: "next-server",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    exception: { values: [{ type: details.type, value: details.value }] },
    request: context.path ? { url: context.path, method: context.method } : undefined,
    tags: { runtime: "next", ...context.tags },
    extra: { digest: details.digest, stack: details.stack },
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: now }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=lumio-next/1.0`,
      },
      body: envelope,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Le suivi ne doit jamais faire échouer la requête du visiteur.
  }
}
