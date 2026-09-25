"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<
    "login" | "signup"
  >("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const {
          data,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (sessionError) {
          console.error(
            sessionError,
          );

          setCheckingSession(false);
          return;
        }

        if (data.session) {
          router.replace(
            "/dashboard",
          );

          return;
        }

        setCheckingSession(false);
      } catch (err) {
        console.error(err);

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail =
      email.trim();

    if (
      cleanEmail === "" ||
      password === ""
    ) {
      setError(
        "Entre ton adresse e-mail et ton mot de passe.",
      );

      return;
    }

    if (
      mode === "signup" &&
      password.length < 6
    ) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );

      return;
    }

    if (
      mode === "signup" &&
      password !== confirmPassword
    ) {
      setError(
        "Les mots de passe ne correspondent pas.",
      );

      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const {
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            },
          );

        if (loginError) {
          throw loginError;
        }

        router.replace(
          "/dashboard",
        );

        router.refresh();

        return;
      }

      const {
        data,
        error: signupError,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace(
          "/dashboard",
        );

        router.refresh();

        return;
      }

      setMessage(
        "✅ Compte créé. Vérifie ton adresse e-mail pour confirmer ton compte.",
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);

      if (
        err instanceof Error
      ) {
        const text =
          err.message.toLowerCase();

        if (
          text.includes(
            "invalid login credentials",
          )
        ) {
          setError(
            "Adresse e-mail ou mot de passe incorrect.",
          );

          return;
        }

        if (
          text.includes(
            "user already registered",
          )
        ) {
          setError(
            "Un compte existe déjà avec cette adresse e-mail.",
          );

          return;
        }

        if (
          text.includes(
            "email not confirmed",
          )
        ) {
          setError(
            "Confirme d'abord ton adresse e-mail.",
          );

          return;
        }

        setError(
          err.message,
        );

        return;
      }

      setError(
        "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(
    newMode:
      | "login"
      | "signup",
  ) {
    setMode(newMode);

    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            ✨
          </div>

          <p className="mt-4 text-slate-400">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black">
            Site
            <span className="text-blue-500">
              AI
            </span>
          </h1>

          <p className="mt-3 text-slate-400">
            {mode === "login"
              ? "Connecte-toi à ton espace."
              : "Crée ton compte SiteAI."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-950 p-1">
            <button
              type="button"
              onClick={() =>
                switchMode(
                  "login",
                )
              }
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
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
                switchMode(
                  "signup",
                )
              }
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-slate-400"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                placeholder="ton@email.com"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-slate-400"
              >
                Mot de passe
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target
                      .value,
                  )
                }
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            {mode ===
              "signup" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm text-slate-400"
                >
                  Confirme le mot de passe
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Chargement..."
                : mode ===
                    "login"
                  ? "Se connecter"
                  : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login"
              ? "Pas encore de compte ?"
              : "Tu as déjà un compte ?"}
          </p>

          <button
            type="button"
            onClick={() =>
              switchMode(
                mode === "login"
                  ? "signup"
                  : "login",
              )
            }
            className="mt-2 w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            {mode === "login"
              ? "Créer un compte"
              : "Se connecter"}
          </button>
        </div>
      </div>
    </main>
  );
}