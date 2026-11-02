import { describe, expect, it } from "vitest";

import { authErrorMessage, isEmailNotConfirmed } from "./authErrors";

function supabaseError(message: string, code?: string) {
  return Object.assign(new Error(message), code ? { code } : {});
}

describe("authErrorMessage", () => {
  it("traduit les erreurs par leur code Supabase", () => {
    expect(authErrorMessage(supabaseError("Email not confirmed", "email_not_confirmed"), "x")).toMatch(
      /pas encore confirmée/,
    );
    expect(authErrorMessage(supabaseError("email rate limit exceeded", "over_email_send_rate_limit"), "x")).toMatch(
      /Trop d’e-mails/,
    );
  });

  it("reconnaît le message anglais quand le code manque", () => {
    expect(authErrorMessage(supabaseError("Invalid login credentials"), "x")).toBe(
      "E-mail ou mot de passe incorrect.",
    );
    expect(authErrorMessage(supabaseError("email rate limit exceeded"), "x")).toMatch(/Trop d’e-mails/);
  });

  it("n'affiche jamais un message inconnu en anglais", () => {
    expect(authErrorMessage(supabaseError("Something unexpected"), "Une erreur est survenue.")).toBe(
      "Une erreur est survenue.",
    );
    expect(authErrorMessage("pas une erreur", "Repli")).toBe("Repli");
  });
});

describe("isEmailNotConfirmed", () => {
  it("détecte un compte non confirmé par code ou par message", () => {
    expect(isEmailNotConfirmed(supabaseError("x", "email_not_confirmed"))).toBe(true);
    expect(isEmailNotConfirmed(supabaseError("Email not confirmed"))).toBe(true);
    expect(isEmailNotConfirmed(supabaseError("Invalid login credentials", "invalid_credentials"))).toBe(false);
  });
});
