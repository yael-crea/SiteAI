"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthMode =
  | "login"
  | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] =
    useState<AuthMode>("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (
        !sessionError &&
        data.session
      ) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          if (session) {
            router.replace("/");
          }
        },
      );

    return () => {
      active = false;

      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const {
          error: loginError,
        } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) {
          throw loginError;
        }

        router.replace("/");
        router.refresh();

        return;
      }

      const {
        data,
        error: signupError,
      } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,

          options: {
            emailRedirectTo:
              `${window.location.origin}/auth`,
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();

        return;
      }

      setMessage(
        "Compte créé. Vérifie ton adresse e-mail puis connecte-toi.",
      );

      setMode("login");
      setPassword("");
    } catch (err) {
      console.error(err);

      if (
        err instanceof Error
      ) {
        setError(err.message);
      } else {
        setError(
          "Une erreur est survenue.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(
    newMode: AuthMode,
  ) {
    setMode(newMode);
    setError("");
    setMessage("");
    setPassword("");
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
        <div className="mb-10 text-center">
          <div className="text-4xl font-black">
            Site
            <span className="text-blue-500">
              AI
            </span>
          </div>

          <p className="mt-3 text-slate-400">
            Crée et gère tes sites professionnels avec l&apos;IA.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
            <button
              type="button"
              onClick={() =>
                switchMode(
                  "login",
                )
              }
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode ===
                "login"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Se connecter
            </button>

            <button
              type="button"
              onClick={() =>
                switchMode(
                  "signup",
                )
              }
              className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                mode ===
                "signup"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <h1 className="mt-8 text-2xl font-black">
            {mode === "login"
              ? "Connexion"
              : "Créer ton compte"}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {mode === "login"
              ? "Connecte-toi pour accéder à tes sites."
              : "Crée ton compte SiteAI."}
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-7 space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Adresse e-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="exemple@email.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Mot de passe
              </label>

              <input
                type="password"
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Ton mot de passe"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Chargement..."
                : mode ===
                    "login"
                  ? "Se connecter"
                  : "Créer mon compte"}
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-green-900 bg-green-950/50 p-4 text-sm text-green-300">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}