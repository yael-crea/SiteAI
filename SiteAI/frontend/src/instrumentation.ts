import type { Instrumentation } from "next";
import { reportServerError } from "@/lib/serverMonitoring";

// Erreurs du serveur Next (rendu, routes, proxy) envoyées à Sentry.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportServerError(error, {
    path: request.path,
    method: request.method,
    tags: {
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
};
