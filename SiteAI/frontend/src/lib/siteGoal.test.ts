import { describe, expect, it } from "vitest";
import { goalAction, safeBookingUrl } from "./siteGoal";

describe("safeBookingUrl", () => {
  it("accepte un lien https de réservation", () => {
    expect(safeBookingUrl(" https://calendly.com/salon-lumiere ")).toBe("https://calendly.com/salon-lumiere");
  });

  it.each([
    ["javascript:alert(1)"],
    ["http://calendly.com/salon"],
    ["https://user:motdepasse@exemple.fr"],
    ["data:text/html,<script>alert(1)</script>"],
    ["pas une adresse"],
    [""],
    [undefined],
  ])("refuse %s", (value) => {
    expect(safeBookingUrl(value)).toBeNull();
  });
});

describe("goalAction", () => {
  it("garde seulement les chiffres et le + du téléphone", () => {
    expect(goalAction({ siteGoal: "calls", phone: "06 39 98-12.34" })).toEqual({
      href: "tel:0639981234",
      label: "Appeler maintenant",
    });
  });

  it("renvoie vers le contact si le lien de réservation est dangereux", () => {
    expect(goalAction({ siteGoal: "booking", bookingUrl: "javascript:alert(1)" })).toEqual({
      href: "#contact",
      label: "Demander une réservation",
    });
  });

  it("n'ajoute rien pour les anciens sites", () => {
    expect(goalAction({ siteGoal: "legacy" })).toBeNull();
  });
});
