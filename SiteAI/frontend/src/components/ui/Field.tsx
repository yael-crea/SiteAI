"use client";

/*
 * Champs de formulaire Lumio : libellé toujours visible, aide facultative,
 * erreur reliée au champ (aria-describedby + aria-invalid) pour qu'elle soit
 * lue par les lecteurs d'écran.
 */

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import Icon from "./Icon";
import styles from "./ui.module.css";

type FieldMeta = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldMeta & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, { hint, error }: FieldMeta, extra?: string) {
  return [error ? `${id}-error` : hint ? `${id}-hint` : null, extra].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: FieldMeta & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <input
        id={fieldId}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { label, hint, error }, ariaDescribedBy)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={fieldId}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { label, hint, error }, ariaDescribedBy)}
        {...rest}
      />
    </FieldShell>
  );
}
