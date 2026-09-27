export type SiteGoal = "legacy" | "calls" | "quote" | "booking";

export function safeBookingUrl(value?: string): string | null {
  try {
    const url = new URL((value ?? "").trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function goalAction(site: {siteGoal?: string; bookingUrl?: string; phone?: string}) {
  if (site.siteGoal === "calls") {
    const phone = (site.phone ?? "").replace(/[^\d+]/g, "");
    return phone ? {href: `tel:${phone}`, label: "Appeler maintenant"} : {href: "#contact", label: "Nous contacter"};
  }
  if (site.siteGoal === "quote") return {href: "#contact", label: "Demander un devis"};
  if (site.siteGoal === "booking") {
    const href = safeBookingUrl(site.bookingUrl);
    return {href: href ?? "#contact", label: href ? "Réserver" : "Demander une réservation"};
  }
  return null;
}
