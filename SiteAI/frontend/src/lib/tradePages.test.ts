import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activityExamples } from "./activityExamples";
import { exampleTemplates } from "./exampleTemplates";
import { tradePages } from "./tradePages";
import { tradePhotosFor } from "./tradePhotos";

describe("pages métier (/site-internet/[metier])", () => {
  it("a des adresses uniques et valides", () => {
    const slugs = tradePages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(tradePages.map((page) => [page.slug, page]))("%s pré-remplit un métier connu de /creer", (_, page) => {
    // /creer?metier=… ne remplit le métier que si le libellé existe à l'identique.
    expect(activityExamples.map((item) => item.label)).toContain(page.label);
  });

  it.each(tradePages.map((page) => [page.slug, page]))("%s a un contenu complet", (_, page) => {
    expect(page.description.length).toBeGreaterThanOrEqual(110);
    expect(page.description.length).toBeLessThanOrEqual(200);
    expect(page.searches).toHaveLength(3);
    expect(page.sections).toHaveLength(4);
    expect(page.faq).toHaveLength(3);
    if (page.exampleId) {
      expect(exampleTemplates.map((template) => template.id)).toContain(page.exampleId);
    }
  });

  it("n'a pas deux pages avec la même accroche", () => {
    const intros = tradePages.map((page) => page.intro);
    expect(new Set(intros).size).toBe(intros.length);
  });

  it.each(tradePages.map((page) => [page.slug, page]))("%s a des photos présentes dans public/", (_, page) => {
    for (const photo of tradePhotosFor(page.label)) {
      expect(existsSync(new URL(`../../public${photo}`, import.meta.url)), photo).toBe(true);
    }
  });
});
