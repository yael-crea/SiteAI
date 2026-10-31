import { describe, expect, it } from "vitest";
import { normalizeDesignExtras } from "./appearanceSettings";
import { siteMotionCSS } from "./siteMotionCSS";
import { tradeMotion } from "./siteMotion";

describe("tradeMotion", () => {
  it.each([
    ["Avocat / Cabinet juridique", { motion: "subtle", heroBackground: "auto" }],
    ["Expert-comptable", { motion: "subtle", heroBackground: "auto" }],
    ["Coach sportif", { motion: "dynamic", heroBackground: "aurora" }],
    ["DJ / Événementiel", { motion: "dynamic", heroBackground: "aurora" }],
    ["Agence web / Développeur", { motion: "dynamic", heroBackground: "gradient" }],
    ["Restaurant", { motion: "subtle", heroBackground: "zoom" }],
    ["Coiffeur", { motion: "subtle", heroBackground: "zoom" }],
    ["Plombier", { motion: "subtle", heroBackground: "zoom" }],
  ])("%s", (activity, expected) => {
    expect(tradeMotion(activity, true)).toEqual(expected);
  });

  it("n'utilise jamais le zoom sans photo d'accueil", () => {
    expect(tradeMotion("Restaurant", false).heroBackground).toBe("gradient");
    expect(tradeMotion("Plombier", false).heroBackground).toBe("gradient");
  });
});

describe("réglages d'animation", () => {
  it("garde auto pour les sites créés avant les animations", () => {
    expect(normalizeDesignExtras({})).toMatchObject({ motion: "auto", heroBackground: "auto" });
  });

  it("refuse une valeur inconnue", () => {
    expect(normalizeDesignExtras({ motion: "turbo" as never, heroBackground: "<script>" as never })).toMatchObject({
      motion: "auto",
      heroBackground: "auto",
    });
  });

  it("n'anime rien si le visiteur demande moins d'animations", () => {
    const keyframes = siteMotionCSS.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(keyframes).toBeGreaterThan(0);
    // Toute règle « animation: » est dans le bloc no-preference.
    expect(siteMotionCSS.slice(0, keyframes)).not.toMatch(/\banimation:/);
  });
});
