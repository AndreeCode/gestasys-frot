"use client";

import { useMemo, useState } from "react";

import { ErrorState, LoadingState } from "@/components/common/feedback";
import { ToastProvider } from "@/components/common/toast";
import { AppShell } from "@/components/layout/app-shell";
import { MobileMenuButton, Sidebar } from "@/components/layout/sidebar";
import { useBackendQuery } from "@/hooks/use-backend";
import { logoutAction, meAction } from "@/lib/actions/auth";
import { SECTION_PERMISSION, type Section } from "@/lib/types";
import { Backups } from "./backups";
import { ForceMfaSetup } from "./account-security";
import { ForcePasswordChange, Settings } from "./settings";
import { ImportExport } from "./import-export";
import { Overview } from "./overview";
import { Records } from "./records";
import { RolesPermissions } from "./roles-permissions";
import { SessionProvider } from "./session";
import { UserRegistration } from "./user-registration";
import { UsersPanel } from "./users-panel";
import styles from "./dashboard.module.css";

const ORDER: Section[] = [
  "Resumen",
  "Registros",
  "Importar datos",
  "Registrar usuario",
  "Usuarios",
  "Roles y permisos",
  "Backups",
];

export function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}

function DashboardContent() {
  const { data: profile, error, reload } = useBackendQuery("me", meAction);
  const [chosen, setChosen] = useState<Section | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = useMemo(
    () =>
      profile
        ? ORDER.filter((s) => {
            const code = SECTION_PERMISSION[s];
            return code === null || profile.permissions.includes(code);
          })
        : [],
    [profile],
  );

  async function logout() {
    await logoutAction();
    window.location.replace("/signed-out");
  }

  if (!profile) {
    return (
      <div className={styles.fullscreen}>
        {error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState text="Cargando tu sesión..." />}
      </div>
    );
  }

  if (profile.must_change_password) {
    return <ForcePasswordChange profile={profile} onDone={reload} onLogout={logout} />;
  }

  if (profile.mfa_setup_required) {
    return <ForceMfaSetup profile={profile} onDone={reload} onLogout={logout} />;
  }

  const section: Section =
    chosen && (chosen === "Configuración" || sections.includes(chosen)) ? chosen : (sections[0] ?? "Configuración");

  return (
    <SessionProvider profile={profile} reloadProfile={reload}>
      <AppShell
        sidebar={
          <Sidebar
            profile={profile}
            sections={sections}
            section={section}
            open={sidebarOpen}
            onNavigate={setChosen}
            onClose={() => setSidebarOpen(false)}
            onLogout={logout}
          />
        }
      >
        <MobileMenuButton onClick={() => setSidebarOpen(true)} />
        {section === "Resumen" ? (
          <Overview />
        ) : section === "Registros" ? (
          <Records />
        ) : section === "Importar datos" ? (
          <ImportExport />
        ) : section === "Registrar usuario" ? (
          <UserRegistration />
        ) : section === "Usuarios" ? (
          <UsersPanel onRegister={sections.includes("Registrar usuario") ? () => setChosen("Registrar usuario") : undefined} />
        ) : section === "Roles y permisos" ? (
          <RolesPermissions />
        ) : section === "Backups" ? (
          <Backups />
        ) : (
          <Settings />
        )}
      </AppShell>
    </SessionProvider>
  );
}
