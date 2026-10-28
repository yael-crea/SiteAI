"use client";

/*
 * Barre latérale de l'espace client (écrans larges uniquement).
 *
 * Composant d'affichage : il ne fait aucune requête. Les liens et actions
 * sont ceux de l'en-tête existant (prospects, abonnement, support,
 * administration, déconnexion), passés par la page qui l'utilise.
 */

import Icon, { type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Surface";

type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
  badge?: number;
};

type AppSidebarProps = {
  current: "dashboard" | "sites" | "prospects";
  userEmail: string;
  isAdmin: boolean;
  newLeadsCount: number;
  leadsLoading: boolean;
  planName: string;
  billingStatus: string;
  billingLoading: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  className?: string;
};

export default function AppSidebar({
  current,
  userEmail,
  isAdmin,
  newLeadsCount,
  leadsLoading,
  planName,
  billingStatus,
  billingLoading,
  onNavigate,
  onLogout,
  className = "",
}: AppSidebarProps) {
  const items: NavItem[] = [
    { key: "dashboard", label: "Accueil", icon: "home", onSelect: () => onNavigate("/dashboard") },
    { key: "sites", label: "Mes sites", icon: "globe", onSelect: () => onNavigate("/sites") },
    {
      key: "prospects",
      label: "Prospects",
      icon: "inbox",
      onSelect: () => onNavigate("/prospects"),
      badge: !leadsLoading && newLeadsCount > 0 ? newLeadsCount : undefined,
    },
  ];

  return (
    <aside
      className={`lumio-sidebar fixed inset-y-0 left-0 z-40 w-[248px] flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 ${className}`}
      aria-label="Espace client"
    >
      <button
        type="button"
        onClick={() => onNavigate("/dashboard")}
        className="lumio-logo self-start px-2"
        aria-label="Lumio, tableau de bord"
      >
        lumio<span>.</span>
      </button>

      <nav className="mt-8 grid gap-1" aria-label="Navigation principale">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onSelect}
              aria-current={active ? "page" : undefined}
              className={`lumio-nav-item flex items-center gap-3 px-3 text-left text-sm ${
                active ? "is-active text-white" : "text-slate-400"
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="lumio-nav-badge" aria-label={`${item.badge} nouveau${item.badge > 1 ? "x" : ""}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-3">
        <button
          type="button"
          onClick={() => onNavigate("/pricing")}
          className="lumio-plan-card text-left"
        >
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <Icon name="card" size={14} />
            Formule
          </span>
          {billingLoading ? (
            <span className="mt-2 grid gap-1.5" aria-label="Chargement de la formule">
              <Skeleton width="55%" height={14} />
              <Skeleton width="80%" height={10} />
            </span>
          ) : (
            <>
              <span className="mt-1 block text-base font-semibold text-white">{planName}</span>
              {billingStatus && <span className="mt-0.5 block text-xs text-slate-400">{billingStatus}</span>}
            </>
          )}
        </button>

        <div className="grid gap-0.5 border-t border-slate-800 pt-3">
          {isAdmin && (
            <button type="button" onClick={() => onNavigate("/admin")} className="lumio-nav-item flex items-center gap-3 px-3 text-left text-sm text-slate-400">
              <Icon name="shield" size={16} />
              Administration
            </button>
          )}
          <a href="mailto:support@lumio.business" className="lumio-nav-item flex items-center gap-3 px-3 text-sm text-slate-400">
            <Icon name="help" size={16} />
            Aide
          </a>
          <button type="button" onClick={onLogout} className="lumio-nav-item flex items-center gap-3 px-3 text-left text-sm text-slate-400">
            <Icon name="logout" size={16} />
            Déconnexion
          </button>
        </div>

        {userEmail && (
          <p className="truncate px-3 text-xs text-slate-500" title={userEmail}>
            {userEmail}
          </p>
        )}
      </div>
    </aside>
  );
}
