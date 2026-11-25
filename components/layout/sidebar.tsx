"use client";

import {
  BarChart3,
  ClipboardList,
  DatabaseBackup,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  ScrollText,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "@/components/common/brand-mark";
import type { Profile } from "@/lib/api/types";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { avatarColor, initials, roleTitle, scopeLabel } from "@/lib/format";
import type { Section } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Section, LucideIcon> = {
  Resumen: LayoutDashboard,
  Estadísticas: BarChart3,
  Registros: ClipboardList,
  "Importar datos": FileSpreadsheet,
  "Registrar usuario": UserPlus,
  Usuarios: Users,
  "Red de salud": Network,
  Auditoría: ScrollText,
  "Roles y permisos": ShieldCheck,
  Backups: DatabaseBackup,
  Configuración: Settings,
};

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
        className,
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", !active && "opacity-80")} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function Sidebar({
  profile,
  sections,
  section,
  open,
  onNavigate,
  onClose,
  onLogout,
}: {
  profile: Profile;
  sections: Section[];
  section: Section;
  open: boolean;
  onNavigate: (section: Section) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const go = (target: Section) => {
    onNavigate(target);
    onClose();
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col print:hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 lg:w-64 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <Brand inverted />
          <button
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <button
          className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 text-left transition-colors hover:bg-sidebar-accent"
          onClick={() => go("Configuración")}
          title="Ver mi cuenta"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-sidebar-border"
            style={{ background: avatarColor(profile.username) }}
          >
            {initials(profile.full_name)}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-sidebar-accent-foreground">{profile.full_name}</strong>
            <span className="block truncate text-xs text-sidebar-foreground/75">{roleTitle(profile.role)}</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/60">{scopeLabel(profile)}</span>
          </span>
        </button>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3">
          <span className="block px-3 pt-2 pb-2 text-[11px] font-semibold tracking-[0.14em] text-sidebar-foreground/60">
            MENÚ PRINCIPAL
          </span>
          {sections.map((label) => (
            <NavItem key={label} icon={ICONS[label]} label={label} active={section === label} onClick={() => go(label)} />
          ))}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
          <ThemeToggle className="mb-2 flex w-full justify-between [&>button]:flex-1 [&>button]:justify-center" />
          <NavItem
            icon={Settings}
            label="Configuración"
            active={section === "Configuración"}
            onClick={() => go("Configuración")}
          />
          <NavItem
            icon={LogOut}
            label="Cerrar sesión"
            onClick={onLogout}
            className="text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive"
          />
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-5 flex print:hidden items-center justify-between border-b bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden">
      <Brand />
      <button
        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-xs hover:bg-muted"
        aria-label="Abrir menú"
        onClick={onClick}
      >
        <Menu className="size-4" />
        Menú
      </button>
    </div>
  );
}
