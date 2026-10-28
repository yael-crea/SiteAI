"use client";

/*
 * Fenêtre de confirmation Lumio, prévue pour remplacer window.confirm.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: "Supprimer ce site ?", tone: "danger" }))) return;
 *   …
 *   return <>{…}{confirmDialog}</>;
 *
 * Repose sur <dialog> natif : focus piégé dans la fenêtre, Échap pour
 * annuler, contenu de la page inerte. Le focus revient à l'élément qui
 * avait ouvert la fenêtre. Pour une action dangereuse, le focus initial est
 * sur « Annuler » afin qu'un appui sur Entrée ne supprime rien par erreur.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Button from "./Button";
import Icon from "./Icon";
import styles from "./ui.module.css";

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    // Une confirmation déjà ouverte est considérée comme annulée.
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOpen(false);
  }, []);

  useEffect(() => () => resolver.current?.(false), []);

  const dialog = options ? <ConfirmDialog {...options} open={open} onResult={settle} /> : null;
  return [confirm, dialog];
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "default",
  onResult,
}: ConfirmOptions & { open: boolean; onResult: (confirmed: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.returnValue = "";
      dialog.showModal();
      (tone === "danger" ? cancelRef : confirmRef).current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, tone]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-tone={tone}
      aria-labelledby={titleId}
      aria-describedby={description ? textId : undefined}
      onClose={() => {
        onResult(ref.current?.returnValue === "confirm");
        returnFocus.current?.focus();
        returnFocus.current = null;
      }}
      onClick={(event) => {
        // Un clic sur le fond (hors de la fenêtre) annule.
        if (event.target === ref.current) ref.current.close("cancel");
      }}
    >
      <form method="dialog">
        <div className={styles.dialogBody}>
          <span className={styles.dialogIcon}>
            <Icon name={tone === "danger" ? "trash" : "info"} size={20} />
          </span>
          <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
          {description && <p id={textId} className={styles.dialogText}>{description}</p>}
        </div>
        <div className={styles.dialogActions}>
          <Button ref={cancelRef} type="submit" value="cancel" variant="ghost">{cancelLabel}</Button>
          <Button ref={confirmRef} type="submit" value="confirm" variant={tone === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
