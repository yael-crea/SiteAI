import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CGV_VERSION, plans } from "./commercialPlans";

/*
 * Les formules sont écrites à plusieurs endroits : tarifs et CGV (ce module),
 * page d'accueil statique et backend Go. Un écart casse le paiement (version
 * des CGV refusée) ou promet ce que le backend n'applique pas.
 */

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("formules commerciales", () => {
  it("utilise la même version des CGV que le backend", () => {
    const backend = read("../../backend/main.go");
    expect(backend).toContain(`const currentCGVVersion = "${CGV_VERSION}"`);
  });

  it("affiche les mêmes prix sur la page d'accueil", () => {
    const landing = read("public/decouvrir.html");
    for (const plan of plans) {
      expect(landing).toContain(`${plan.price} <small>/ mois</small>`);
      const schemaPrice = plan.price.replace(",", ".").replace(" €", "");
      expect(landing).toContain(`"name": "${plan.name}", "price": "${schemaPrice}"`);
    }
  });

  it("garde 1 site publié pour Essentiel et Pro, 10 pour Agence", () => {
    const features = Object.fromEntries(plans.map((plan) => [plan.id, plan.features.join(" ")]));
    expect(features.essentiel).toContain("1 site publié");
    expect(features.pro).toContain("1 site publié");
    expect(features.agence).toContain("10 sites publiés");
  });
});
