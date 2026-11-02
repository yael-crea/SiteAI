import { describe, expect, it } from "vitest";

import { isDraftOlderThan } from "./useBuilderDraft";

describe("isDraftOlderThan", () => {
  it("garde le brouillon sans version du compte à comparer", () => {
    expect(isDraftOlderThan("2026-11-02T12:33:49.294Z", null)).toBe(false);
    expect(isDraftOlderThan("2026-11-02T12:33:49.294Z", undefined)).toBe(false);
    expect(isDraftOlderThan("2026-11-02T12:33:49.294Z", "pas une date")).toBe(false);
  });

  it("écarte un brouillon antérieur ou égal à la dernière sauvegarde du compte", () => {
    expect(isDraftOlderThan("2026-11-02T12:33:49.294Z", "2026-11-02T12:35:40.000Z")).toBe(true);
    expect(isDraftOlderThan("2026-11-02T12:35:40.000Z", "2026-11-02T12:35:40.000Z")).toBe(true);
  });

  it("propose un brouillon plus récent que la sauvegarde du compte", () => {
    expect(isDraftOlderThan("2026-11-02T12:36:10.000Z", "2026-11-02T12:35:40.000Z")).toBe(false);
  });
});
