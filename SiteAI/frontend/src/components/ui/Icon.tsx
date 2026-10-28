/*
 * Icônes de l'interface Lumio : un seul jeu cohérent (grille 20 px, trait 1,6,
 * extrémités arrondies) qui remplace les caractères Unicode (↗ ✓ ✦ +) dont le
 * rendu variait selon la police et le système.
 *
 * Composant serveur, sans dépendance : chaque icône est décorative par défaut
 * (aria-hidden). Passer `label` pour une icône porteuse de sens.
 */

import type { SVGProps } from "react";

const paths = {
  arrowUpRight: <path d="M6.5 13.5 13.5 6.5M7.5 6.5h6v6" />,
  arrowRight: <path d="M4 10h11.5M11 5.5 15.5 10 11 14.5" />,
  check: <path d="m4.5 10.5 3.5 3.5 7.5-8" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  sparkle: (
    <path d="M10 3.5c.5 3.4 3 5.9 6.5 6.5-3.5.6-6 3.1-6.5 6.5-.5-3.4-3-5.9-6.5-6.5 3.5-.6 6-3.1 6.5-6.5Z" />
  ),
  inbox: <path d="M3.5 11.5 5.6 5.2a1 1 0 0 1 .95-.7h6.9a1 1 0 0 1 .95.7l2.1 6.3M3.5 11.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3M3.5 11.5h3.6l1 1.8h3.8l1-1.8h3.6" />,
  document: <path d="M11.5 3.5h-5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-9m-3-3 3 3m-3-3v3h3M8 10.5h4M8 13h4" />,
  chart: <path d="M4 16h12M6.5 13V9.5M10 13V5.5M13.5 13v-6" />,
  phone: <path d="M6.6 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.4 6 5.4 11 11.4 11.4a1.5 1.5 0 0 0 1.6-1.5v-1.6a1 1 0 0 0-.8-1l-2.3-.5a1 1 0 0 0-1 .4l-.7.9a8 8 0 0 1-3.7-3.7l.9-.7a1 1 0 0 0 .4-1l-.5-2.3a1 1 0 0 0-1-.8Z" />,
  mail: <path d="M3.5 6a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6Zm0 .5 6.5 4.5 6.5-4.5" />,
  close: <path d="m5.5 5.5 9 9m0-9-9 9" />,
  alert: <path d="M10 7.5v3.5M10 13.75v.01M8.7 3.9 2.9 14a1.5 1.5 0 0 0 1.3 2.25h11.6A1.5 1.5 0 0 0 17.1 14L11.3 3.9a1.5 1.5 0 0 0-2.6 0Z" />,
  info: <path d="M10 9v4.5M10 6.5v.01M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />,
  trash: <path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6M8.5 9v4.5M11.5 9v4.5" />,
  pause: <path d="M7.5 5.5v9M12.5 5.5v9" />,
  play: <path d="M7 5.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L7.9 4.7a.6.6 0 0 0-.9.5Z" />,
  menu: <path d="M4 6.5h12M4 10h12M4 13.5h12" />,
  arrowLeft: <path d="M16 10H4.5M9 5.5 4.5 10 9 14.5" />,
} as const;

export type IconName = keyof typeof paths;

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
  size?: number;
  label?: string;
};

export default function Icon({ name, size = 16, label, className, ...rest }: IconProps) {
  const decorative = !label;
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill={name === "sparkle" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "sparkle" ? 0 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
