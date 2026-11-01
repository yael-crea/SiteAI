import type { SiteLegal } from "@/lib/builderTypes";

/*
 * Mentions légales des sites clients : un site professionnel doit indiquer
 * qui l'édite et qui l'héberge (loi pour la confiance dans l'économie
 * numérique, art. 6). Affichées par components/site/SiteLegalNotice, vérifiées
 * avant publication (siteGrowth.getSiteHealth).
 */

export const LUMIO_HOST_NOTICE =
  "Site créé avec Lumio (SIREN 131 781 932, 3 rue de l’Opale, 34070 Montpellier) et hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données du site sont stockées dans l’Union européenne (Supabase, Francfort).";

export function legalNoticeMissingFields(site: { legal?: SiteLegal }): string[] {
  const legal = site.legal ?? {};
  const missing: string[] = [];
  if (!legal.companyName?.trim()) missing.push("nom ou raison sociale");
  if (!legal.address?.trim()) missing.push("adresse");
  if (!legal.siren?.trim()) missing.push("SIREN ou SIRET");
  if (!legal.email?.trim()) missing.push("e-mail de contact");
  return missing;
}
