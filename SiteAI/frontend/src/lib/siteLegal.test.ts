import { describe, expect, it } from "vitest";
import { getSiteHealth } from "./siteGrowth";
import { LUMIO_HOST_NOTICE, legalNoticeMissingFields } from "./siteLegal";

const complete = {
  companyName: "Atelier du Robinet SARL",
  address: "12 rue des Lilas, 34000 Montpellier",
  siren: "123 456 789",
  email: "contact@atelier-robinet.fr",
};

describe("mentions légales des sites clients", () => {
  it("liste les champs obligatoires manquants", () => {
    expect(legalNoticeMissingFields({})).toEqual(["nom ou raison sociale", "adresse", "SIREN ou SIRET", "e-mail de contact"]);
    expect(legalNoticeMissingFields({ legal: { ...complete, address: "  " } })).toEqual(["adresse"]);
    expect(legalNoticeMissingFields({ legal: complete })).toEqual([]);
  });

  it("nomme l'hébergeur et l'éditeur de Lumio", () => {
    expect(LUMIO_HOST_NOTICE).toContain("Vercel Inc.");
    expect(LUMIO_HOST_NOTICE).toContain("131 781 932");
  });

  it("est un point prioritaire de la vérification avant publication", () => {
    const missing = getSiteHealth({ businessName: "Atelier du Robinet" }).checks.find((check) => check.id === "legal");
    expect(missing).toMatchObject({ ready: false, priority: true });
    expect(missing?.advice).toContain("adresse");

    const done = getSiteHealth({ businessName: "Atelier du Robinet", legal: complete }).checks.find((check) => check.id === "legal");
    expect(done?.ready).toBe(true);
  });
});
