"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  readExampleTemplate,
  rememberExampleTemplate,
} from "@/lib/exampleTemplates";
import styles from "./auth.module.css";

type AuthMode = "login" | "signup" | "forgot";

const TERMS_VERSION = "2026-10-20";
const PRODUCTION_AUTH_ORIGIN = "https://lumio.business";

function getAuthRedirectUrl(path: string) {
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const currentHostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalDevelopment =
    currentHostname === "localhost" || currentHostname === "127.0.0.1";
  // Aperçus Vercel du projet (déjà autorisés dans Supabase) : on reste sur l'aperçu.
  const isVercelPreview =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    /^lumio-[a-z0-9-]+-yael-bf82\.vercel\.app$/.test(currentHostname);
  const origin = isLocalDevelopment || isVercelPreview
    ? currentOrigin
    : PRODUCTION_AUTH_ORIGIN;

  return new URL(path, `${origin}/`).toString();
}

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

        if (!active) return;

        if (data.session) {
          router.replace(readExampleTemplate() ? "/builder" : "/dashboard");
          return;
        }
      } catch (sessionError) {
        console.error(sessionError);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void checkSession();

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

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
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
      const redirectTo = getAuthRedirectUrl("/reset-password");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo },
      );

      if (resetError) throw resetError;

      setMessage(
        "E-mail envoyé. Ouvre le message reçu puis clique sur le lien pour choisir un nouveau mot de passe.",
      );
    } catch (resetError) {
      console.error(resetError);
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Impossible d'envoyer l'e-mail de réinitialisation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl("/auth"),
        },
      });

      if (googleError) throw googleError;
    } catch (googleError) {
      console.error(googleError);
      setError(
        googleError instanceof Error
          ? googleError.message
          : "Impossible de se connecter avec Google pour le moment.",
      );
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (mode === "signup" && password !== passwordConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
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
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (loginError) throw loginError;

        router.replace(readExampleTemplate() ? "/builder" : "/dashboard");
        router.refresh();
        return;
      }

      const emailRedirectTo = getAuthRedirectUrl("/onboarding");
      const { data, error: signupError } = await supabase.auth.signUp({
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

      if (signupError) throw signupError;

      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setMessage(
        "Compte créé. Vérifie ta boîte mail puis clique sur le lien de confirmation. Tu seras ensuite dirigé vers la création de ton premier site.",
      );
    } catch (submitError) {
      console.error(submitError);

      if (submitError instanceof Error) {
        const lowerMessage = submitError.message.toLowerCase();

        if (
          lowerMessage.includes("invalid login credentials") ||
          lowerMessage.includes("invalid credentials")
        ) {
          setError("E-mail ou mot de passe incorrect.");
        } else if (
          lowerMessage.includes("user already registered") ||
          lowerMessage.includes("already registered")
        ) {
          setError("Un compte existe déjà avec cette adresse e-mail.");
        } else {
          setError(submitError.message);
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
      <main className={styles.loadingScreen}>
        <div className={styles.loadingLogo}>
          lumio<span>.</span>
        </div>
        <p>Ouverture de ton espace…</p>
      </main>
    );
  }

  const modeTitle =
    mode === "login"
      ? "Heureux de te revoir."
      : mode === "signup"
        ? "Ton site commence ici."
        : "Retrouve ton accès.";

  const modeDescription =
    mode === "login"
      ? "Connecte-toi pour reprendre tes sites là où tu les as laissés."
      : mode === "signup"
        ? "Crée ton espace gratuitement et prépare une première version de ton site."
        : "Indique ton adresse e-mail. Nous t’enverrons un lien sécurisé.";

  return (
    <main className={styles.authPage}>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" className={styles.logo} aria-label="Lumio, accueil">
            lumio<span>.</span>
          </Link>

          <Link href="/" className={styles.backLink}>
            <span>Accueil</span>
            <b aria-hidden="true">→</b>
          </Link>
        </div>
      </header>

      <section className={styles.layout}>
        <div className={styles.story}>
          <p className={styles.eyebrow}>
            <i aria-hidden="true" />
            L’espace où ton site prend forme
          </p>

          <h1>
            Ton activité,
            <br />
            bien présentée.
            <br />
            <em>À ton tour.</em>
          </h1>

          <p className={styles.storyLead}>
            Connecte-toi ou crée ton espace. Lumio garde tes contenus,
            tes réglages et chaque version de ton site au même endroit.
          </p>

          <div className={styles.sitePreview} aria-hidden="true">
            <div className={styles.previewBar}>
              <span>Atelier du Robinet</span>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className={styles.previewContent}>
              <small>ARTISAN PLOMBIER · MONTPELLIER</small>
              <h2>
                Votre maison.
                <br />
                <em>Notre attention</em>
                <br />
                au détail.
              </h2>
              <p>Dépannage, installation et rénovation.</p>
              <div>
                <span>✦ Première version prête</span>
                <b>Continuer <i>→</i></b>
              </div>
            </div>
          </div>

          <div className={styles.reassurance}>
            <span>Sans carte bancaire</span>
            <span>Sans coder</span>
            <span>Tu gardes la main</span>
          </div>
        </div>

        <div className={styles.formColumn}>
          <div className={styles.formCard}>
            {mode !== "forgot" && (
              <div className={styles.tabs} aria-label="Accès à Lumio">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={mode === "login" ? styles.activeTab : ""}
                  aria-pressed={mode === "login"}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className={mode === "signup" ? styles.activeTab : ""}
                  aria-pressed={mode === "signup"}
                >
                  Créer un compte
                </button>
              </div>
            )}

            <div className={styles.formIntro}>
              <p>{mode === "forgot" ? "RÉCUPÉRER TON ACCÈS" : "TON ESPACE LUMIO"}</p>
              <h2>{modeTitle}</h2>
              <span>{modeDescription}</span>
            </div>

            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className={styles.googleButton}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                    />
                  </svg>
                  <span>{loading ? "Connexion…" : "Continuer avec Google"}</span>
                  <b aria-hidden="true">→</b>
                </button>

                <div className={styles.divider}>
                  <span>ou avec ton e-mail</span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <label htmlFor="auth-email">
                <span>Adresse e-mail</span>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="toi@entreprise.fr"
                  autoComplete="email"
                  required
                />
              </label>

              {mode !== "forgot" && (
                <label htmlFor="auth-password">
                  <span>Mot de passe</span>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="6 caractères minimum"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                  />
                </label>
              )}

              {mode === "signup" && (
                <label htmlFor="auth-password-confirm">
                  <span>Confirmer le mot de passe</span>
                  <input
                    id="auth-password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="Répète ton mot de passe"
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              {mode === "signup" && (
                <label className={styles.consent}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    required
                  />
                  <span>
                    J’accepte les{" "}
                    <Link href="/cgu" target="_blank" rel="noopener noreferrer">
                      CGU
                    </Link>{" "}
                    et j’ai pris connaissance de la{" "}
                    <Link
                      href="/confidentialite"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      politique de confidentialité
                    </Link>
                    . Les{" "}
                    <Link href="/cgv" target="_blank" rel="noopener noreferrer">
                      CGV
                    </Link>{" "}
                    s’appliqueront lors de la souscription d’un abonnement.
                  </span>
                </label>
              )}

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className={styles.forgotButton}
                >
                  Mot de passe oublié ?
                </button>
              )}

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              {message && (
                <div className={styles.success} role="status">
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading} className={styles.submitButton}>
                <span>
                  {loading
                    ? "Chargement…"
                    : mode === "login"
                      ? "Se connecter"
                      : mode === "signup"
                        ? "Créer mon espace"
                        : "Envoyer le lien"}
                </span>
                <b aria-hidden="true">→</b>
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={styles.secondaryButton}
                >
                  ← Retour à la connexion
                </button>
              )}
            </form>

            <p className={styles.legal}>
              En continuant avec Google ou en créant un compte, tu acceptes nos{" "}
              <Link href="/cgu">CGU</Link> et reconnais avoir pris connaissance de nos{" "}
              <Link href="/cgv">CGV</Link>, de notre{" "}
              <Link href="/confidentialite">politique de confidentialité</Link> et nos{" "}
              <Link href="/mentions-legales">mentions légales</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

