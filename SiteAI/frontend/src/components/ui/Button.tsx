"use client";

/*
 * Bouton Lumio : principal (violet), secondaire, discret ou danger.
 *
 * `loading` garde la largeur du bouton, affiche un indicateur et bloque les
 * clics. `done` affiche une coche : à ne passer à true qu'après la réponse
 * réelle du serveur (jamais de réussite anticipée).
 */

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import Icon from "./Icon";
import styles from "./ui.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  done?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return [
    styles.button,
    variant !== "secondary" && styles[variant],
    size !== "md" && styles[size],
    block && styles.block,
    className,
  ].filter(Boolean).join(" ");
}

export default function Button({
  variant = "secondary",
  size = "md",
  block = false,
  loading = false,
  done = false,
  loadingLabel = "En cours…",
  icon,
  type = "button",
  disabled,
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, block, className })}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...rest}
    >
      <span className={styles.buttonLabel}>
        {done ? <span className={styles.doneMark}><Icon name="check" size={16} /></span> : icon}
        {children}
      </span>
      {loading && (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.srOnly}>{loadingLabel}</span>
        </>
      )}
    </button>
  );
}
