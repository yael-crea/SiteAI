"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../app-theme.css";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data } =
          await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (data.session) {
          setReady(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    initialize();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) {
          return;
        }

        if (
          event === "PASSWORD_RECOVERY" ||
          session
        ) {
          setReady(true);
          setChecking(false);
        }
      },
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (password !== passwordConfirm) {
      setError(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Mot de passe modifié avec succès. Tu vas être redirigé vers ton dashboard.",
      );

      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le mot de passe.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="lumio-app flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-5xl">
            🔐
          </div>

          <p className="mt-4 text-slate-400">
            Vérification du lien...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="lumio-app min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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
            href="/auth"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-blue-500"
          >
            Connexion
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/20 sm:p-9">
          <div className="text-center">
            <div className="text-5xl">
              🔐
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Nouveau mot de passe
            </h1>

            <p className="mt-3 leading-7 text-slate-400">
              Choisis un nouveau mot de passe pour ton
              compte Lumio.
            </p>
          </div>

          {!ready ? (
            <div className="mt-8">
              <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                Le lien de réinitialisation est invalide
                ou a expiré.
              </div>

              <Link
                href="/auth"
                className="mt-5 block rounded-xl bg-blue-600 px-5 py-4 text-center font-black hover:bg-blue-500"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-400">
                  Nouveau mot de passe
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

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
                  ? "Modification..."
                  : "Modifier mon mot de passe"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
