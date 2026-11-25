"use client";

import { useMemo, useState } from "react";

import { ErrorState, LoadingState } from "@/components/common/feedback";
import { ToastProvider } from "@/components/common/toast";
import { AppShell } from "@/components/layout/app-shell";
import { MobileMenuButton, Sidebar } from "@/components/layout/sidebar";
import { useBackendQuery } from "@/hooks/use-backend";
import { meAction } from "@/lib/actions/auth";
import { SECTION_PERMISSION, type Section } from "@/lib/types";
import { AuditLogView } from "./audit";
import { Backups } from "./backups";
import { Networks } from "./networks";
import { Reports } from "./reports";
import { ForceMfaSetup } from "./account-security";
import { ForcePasswordChange, Settings } from "./settings";
import { ImportExport } from "./import-export";
import { Overview } from "./overview";
import { Records } from "./records";
import { RolesPermissions } from "./roles-permissions";
import { SessionProvider } from "./session";
import { UserRegistration } from "./user-registration";
import { UsersPanel } from "./users-panel";

const ORDER: Section[] = [
  "Resumen",
  "Estadísticas",
  "Registros",
  "Importar datos",
  "Red de salud",
  "Usuarios",
  "Registrar usuario",
  "Roles y permisos",
  "Auditoría",
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

  const [leaving, setLeaving] = useState(false);

  /** POST a /signed-out: cierra la sesión en el back, borra la cookie y va al login en una sola navegación. */
  function logout() {
    setLeaving(true);
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/signed-out";
    document.body.appendChild(form);
    form.submit();
  }

  if (leaving) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6">
        <LoadingState text="Cerrando sesión..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6">
        <div className="w-full max-w-md">
          {error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState text="Cargando tu sesión..." />}
        </div>
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
        ) : section === "Estadísticas" ? (
          <Reports />
        ) : section === "Red de salud" ? (
          <Networks />
        ) : section === "Auditoría" ? (
          <AuditLogView />
        ) : section === "Backups" ? (
          <Backups />
        ) : (
          <Settings />
        )}
      </AppShell>
    </SessionProvider>
  );
}
