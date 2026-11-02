import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearCreationProgress,
  readCreationProgress,
  saveCreationProgress,
  type CreationProgress,
} from "./pendingCreation";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const progress: CreationProgress = {
  step: "services",
  servicesActivity: "Plombier",
  activity: "Plombier",
  businessName: "Atelier test",
  city: "Montpellier",
  phone: "",
  goal: "quote",
  bookingUrl: "",
  templateServices: null,
  services: ["Recherche de fuite"],
  tone: "expert",
  strengths: "",
  serviceArea: "",
  openingHours: "",
};

describe("progression du questionnaire", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restitue la question et les réponses après un rechargement", () => {
    saveCreationProgress(progress);
    expect(readCreationProgress()).toEqual(progress);
  });

  it("ignore une étape inconnue et s'efface après la création", () => {
    window.sessionStorage.setItem("lumio_creation_progress", JSON.stringify({ ...progress, step: "style" }));
    expect(readCreationProgress()).toBeNull();

    saveCreationProgress(progress);
    clearCreationProgress();
    expect(readCreationProgress()).toBeNull();
  });
});
