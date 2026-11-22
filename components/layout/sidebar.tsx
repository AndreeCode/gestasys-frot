"use client";

import {
  ClipboardList,
  DatabaseBackup,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand-mark";
import type { Profile } from "@/lib/api/types";
import { avatarColor, initials, roleTitle } from "@/lib/format";
import type { Section } from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./sidebar.module.css";

const ICONS: Record<Section, LucideIcon> = {
  Resumen: LayoutDashboard,
  Registros: ClipboardList,
  "Importar datos": FileSpreadsheet,
  "Registrar usuario": UserPlus,
  Usuarios: Users,
  "Roles y permisos": ShieldCheck,
  Backups: DatabaseBackup,
  Configuración: Settings,
};

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
      {open && <button aria-label="Cerrar menú" className={styles.backdrop} onClick={onClose} />}
      <aside className={cn(styles.sidebar, open && styles.open)}>
        <div className={styles.brand}>
          <BrandMark />
          <span>gestasys</span>
          <button className={styles.closeMenu} aria-label="Cerrar menú" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <button className={styles.profile} onClick={() => go("Configuración")} title="Ver mi cuenta">
          <div className={styles.avatar} style={{ background: avatarColor(profile.username) }}>
            {initials(profile.full_name)}
          </div>
          <div>
            <strong>{profile.full_name}</strong>
            <span>{roleTitle(profile.role)}</span>
          </div>
        </button>
        <nav aria-label="Navegación principal">
          <span className={styles.navLabel}>MENÚ PRINCIPAL</span>
          {sections.map((label) => {
            const Icon = ICONS[label];
            return (
              <button
                key={label}
                onClick={() => go(label)}
                className={cn(styles.navItem, section === label && styles.active)}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className={styles.bottom}>
          <button
            className={cn(styles.navItem, section === "Configuración" && styles.active)}
            onClick={() => go("Configuración")}
          >
            <Settings size={19} />
            <span>Configuración</span>
          </button>
          <button className={cn(styles.navItem, styles.logout)} onClick={onLogout}>
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.menuButton} aria-label="Abrir menú" onClick={onClick}>
      <Menu size={22} />
      <span>Menú</span>
    </button>
  );
}
