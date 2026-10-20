"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  readExampleTemplate,
  rememberExampleTemplate,
} from "@/lib/exampleTemplates";

type AuthMode = "login" | "signup" | "forgot";

const TERMS_VERSION = "2026-10-20";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const templateID = new URLSearchParams(window.location.search).get("modele");
    if (templateID) rememberExampleTemplate(templateID);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (data.session) {
          router.replace(readExampleTemplate() ? "/builder" : "/dashboard");
          return;
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setPasswordConfirm("");
    setAcceptedTerms(false);
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");

    if (!cleanEmail) {
      setError("Entre ton adresse e-mail.");
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          },
        );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "E-mail envoyé. Ouvre le message reçu puis clique sur le lien pour choisir un nouveau mot de passe.",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer l'e-mail de réinitialisation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (mode === "forgot") {
      await handleForgotPassword(event);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");

    if (!cleanEmail) {
      setError("Entre ton adresse e-mail.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (
      mode === "signup" &&
      password !== passwordConfirm
    ) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    if (mode === "signup" && !acceptedTerms) {
      setError(
        "Tu dois accepter les CGU et prendre connaissance de la politique de confidentialité.",
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          throw loginError;
        }

        router.replace(readExampleTemplate() ? "/builder" : "/dashboard");
        router.refresh();
        return;
      }

      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/onboarding`
          : undefined;

      const {
        data,
        error: signupError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            terms_version: TERMS_VERSION,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setMessage(
        "Compte créé. Vérifie ta boîte mail puis clique sur le lien de confirmation. Tu seras ensuite dirigé vers la création de ton premier site.",
      );
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        const lowerMessage =
          err.message.toLowerCase();

        if (
          lowerMessage.includes(
            "invalid login credentials",
          ) ||
          lowerMessage.includes(
            "invalid credentials",
          )
        ) {
          setError(
            "E-mail ou mot de passe incorrect.",
          );
        } else if (
          lowerMessage.includes(
            "user already registered",
          ) ||
          lowerMessage.includes(
            "already registered",
          )
        ) {
          setError(
            "Un compte existe déjà avec cette adresse e-mail.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Chargement...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-black"
          >
            Lum
            <span className="text-blue-500">
              io
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            Lumio
          </p>

          <h1 className="mt-5 max-w-xl text-5xl font-black leading-tight">
            Crée le site de ton entreprise avec l&apos;IA.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Connecte-toi à ton espace ou crée ton
            compte pour générer, personnaliser et
            publier ton site.
          </p>

          <div className="mt-9 grid max-w-xl gap-4">
            {[
              "✨ Génération de site avec l’IA",
              "✍️ Modification depuis un éditeur simple",
              "🚀 Publication et gestion depuis ton dashboard",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 font-semibold text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/20 sm:p-9">
            {mode !== "forgot" && (
              <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() =>
                    changeMode("login")
                  }
                  className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                    mode === "login"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Connexion
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeMode("signup")
                  }
                  className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                    mode === "signup"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Créer un compte
                </button>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-3xl font-black">
                {mode === "login"
                  ? "Bon retour 👋"
                  : mode === "signup"
                    ? "Bienvenue sur Lumio ✨"
                    : "Mot de passe oublié 🔐"}
              </h2>

              <p className="mt-3 leading-7 text-slate-400">
                {mode === "login"
                  ? "Connecte-toi pour retrouver tes sites."
                  : mode === "signup"
                    ? "Crée ton compte puis configure ton premier site."
                    : "Entre ton adresse e-mail. Nous t'enverrons un lien pour choisir un nouveau mot de passe."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-400">
                  Adresse e-mail
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="toi@entreprise.fr"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    Mot de passe
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="••••••••"
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-400">
                    Confirmer le mot de passe
                  </label>

                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) =>
                      setPasswordConfirm(
                        event.target.value,
                      )
                    }
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>
              )}

              {mode === "signup" && (
                <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    required
                    className="mt-1 h-4 w-4 shrink-0 accent-blue-500"
                  />
                  <span>
                    J&apos;accepte les{" "}
                    <Link
                      href="/cgu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-300 underline hover:text-blue-200"
                    >
                      CGU
                    </Link>{" "}
                    et je reconnais avoir pris connaissance de la{" "}
                    <Link
                      href="/confidentialite"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-300 underline hover:text-blue-200"
                    >
                      politique de confidentialité
                    </Link>
                    . Les{" "}
                    <Link
                      href="/cgv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-300 underline hover:text-blue-200"
                    >
                      CGV
                    </Link>{" "}
                    s&apos;appliqueront lors de la souscription d&apos;un abonnement.
                  </span>
                </label>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() =>
                      changeMode("forgot")
                    }
                    className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-4 font-black transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Chargement..."
                  : mode === "login"
                    ? "Se connecter"
                    : mode === "signup"
                      ? "Créer mon compte"
                      : "Envoyer le lien"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() =>
                    changeMode("login")
                  }
                  className="w-full rounded-xl border border-slate-700 px-5 py-4 text-sm font-bold text-slate-300 transition hover:border-blue-500"
                >
                  ← Retour à la connexion
                </button>
              )}
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              En utilisant Lumio, tu peux consulter nos{" "}
              <Link href="/cgu" className="underline hover:text-slate-300">
                CGU
              </Link>
              , nos{" "}
              <Link href="/cgv" className="underline hover:text-slate-300">
                CGV
              </Link>
              , notre{" "}
              <Link
                href="/confidentialite"
                className="underline hover:text-slate-300"
              >
                politique de confidentialité
              </Link>{" "}
              et nos{" "}
              <Link
                href="/mentions-legales"
                className="underline hover:text-slate-300"
              >
                mentions légales
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

