/*
 * Éléments d'affichage sans état : pastille, carte, squelette de chargement
 * et état vide. Composants serveur, utilisables partout.
 */

import type { HTMLAttributes, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
import styles from "./ui.module.css";

const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={cx(styles.badge, className)} data-tone={tone} {...rest}>
      {dot && <i className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Card({
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean }) {
  return (
    <div className={cx(styles.card, padded && styles.padded, interactive && styles.interactive, className)} {...rest}>
      {children}
    </div>
  );
}

export function Skeleton({
  width,
  height,
  className,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return <span className={cx(styles.skeleton, className)} style={{ width, height }} aria-hidden="true" />;
}

export function EmptyState({
  title,
  description,
  icon = "sparkle",
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.empty, className)}>
      <span className={styles.emptyIcon}><Icon name={icon} size={20} /></span>
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}
