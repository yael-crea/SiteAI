import { describe, expect, it } from "vitest";

import { clearLocalSiteData } from "./localSiteData";

function memoryStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => void values.delete(key),
    keys: () => [...values.keys()],
  };
}

describe("clearLocalSiteData", () => {
  it("efface brouillons, versions et réponses, mais pas la session ni les réglages", () => {
    const local = memoryStorage({
      "siteai:draft:v1:user:36": "{}",
      "siteai:versions:v1:user:36": "{}",
      lumio_pending_creation: "{}",
      "sb-projet-auth-token": "session",
      "lumio-theme": "dark",
    });
    const session = memoryStorage({
      siteai_site_to_open: "36",
      lumio_creation_progress: "{}",
      autre_cle: "x",
    });

    clearLocalSiteData(local, session);

    expect(local.keys()).toEqual(["sb-projet-auth-token", "lumio-theme"]);
    expect(session.keys()).toEqual(["autre_cle"]);
  });
});
