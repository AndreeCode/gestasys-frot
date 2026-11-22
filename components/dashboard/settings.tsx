"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { BrandMark } from "@/components/common/brand-mark";
import { Eyebrow, PageHeading } from "@/components/common/page-heading";
import { Panel } from "@/components/common/panel";
import { ToastProvider } from "@/components/common/toast";
import { useBackendAction } from "@/hooks/use-backend";
import { changePasswordAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/api/types";
import { formatDateTime, roleTitle } from "@/lib/format";
import login from "@/components/login/login.module.css";
import { MfaPanel, SessionsPanel } from "./account-security";
import { useSession } from "./session";
import forms from "./forms.module.css";
import detail from "./record-detail.module.css";

function PasswordForm({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const { run, pending } = useBackendAction();
  const [mismatch, setMismatch] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const next = String(form.get("new_password") ?? "");
    if (next !== String(form.get("confirm") ?? "")) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    if (await run(changePasswordAction(String(form.get("current_password") ?? ""), next))) {
      element.reset();
      onDone();
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? login.form : undefined}>
      <div className={compact ? undefined : forms.grid}>
        <label className={compact ? undefined : forms.full}>
          Contraseña actual
          <input name="current_password" type="password" required autoComplete="current-password" />
        </label>
        <label>
          Nueva contraseña
          <input name="new_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
        <label>
          Repite la nueva contraseña
          <input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </label>
      </div>
      {mismatch && <div className={compact ? login.error : forms.formError}>Las contraseñas nuevas no coinciden</div>}
      <p className={forms.hint} style={{ margin: "8px 0 14px" }}>
        Mínimo 8 caracteres y que no sea una contraseña común; una frase larga es más segura y fácil de recordar. Al cambiarla se cierran tus otras sesiones.
      </p>
      {compact ? (
        <button className={login.submit} disabled={pending}>
          <KeyRound size={16} /> {pending ? "Guardando..." : "Cambiar contraseña"}
        </button>
      ) : (
        <div className={forms.actions} style={{ justifyContent: "flex-start" }}>
          <button className={buttons.primary} disabled={pending}>
            <KeyRound size={16} /> {pending ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      )}
    </form>
  );
}

export function Settings() {
  const { profile, reloadProfile } = useSession();
  return (
    <>
      <PageHeading eyebrow="MI CUENTA" title="Configuración" subtitle="Tus datos de acceso y seguridad." />
      <Panel className={forms.card}>
        <h2 style={{ color: "var(--navy)", fontSize: 15, margin: "22px 0 16px" }}>Datos de la cuenta</h2>
        <div className={detail.summary}>
          <div><span>Nombre</span><strong>{profile.full_name}</strong></div>
          <div><span>Usuario</span><strong>{profile.username}</strong></div>
          <div><span>Correo</span><strong>{profile.email}</strong></div>
          <div><span>Rol</span><strong>{roleTitle(profile.role)}</strong></div>
          <div><span>DNI</span><strong>{profile.dni ?? "—"}</strong></div>
          <div><span>Teléfono</span><strong>{profile.phone ?? "—"}</strong></div>
          <div><span>Último ingreso</span><strong>{formatDateTime(profile.last_login_at)}</strong></div>
          <div><span>Permisos</span><strong>{profile.permissions.length}</strong></div>
        </div>
      </Panel>
      <Panel className={forms.card}>
        <h2 style={{ color: "var(--navy)", fontSize: 15, margin: "22px 0 16px" }}>Cambiar contraseña</h2>
        <PasswordForm onDone={reloadProfile} />
      </Panel>
      <Panel className={forms.card}>
        <h2 style={{ color: "var(--navy)", fontSize: 15, margin: "22px 0 16px" }}>Verificación en dos pasos</h2>
        <MfaPanel onChanged={reloadProfile} />
      </Panel>
      <Panel className={forms.card}>
        <h2 style={{ color: "var(--navy)", fontSize: 15, margin: "22px 0 6px" }}>Mis sesiones</h2>
        <p className={forms.hint} style={{ margin: "0 0 14px" }}>
          Si ves una sesión que no reconoces, ciérrala y cambia tu contraseña. Las sesiones se cierran solas tras 30 minutos sin actividad.
        </p>
        <SessionsPanel />
      </Panel>
    </>
  );
}

export function ForcePasswordChange({
  profile,
  onDone,
  onLogout,
}: {
  profile: Profile;
  onDone: () => void;
  onLogout: () => void;
}) {
  return (
    <ToastProvider>
      <main className={login.screen}>
        <section className={login.card}>
          <div className={login.brand}>
            <BrandMark />
            <span>gestasys</span>
          </div>
          <Eyebrow>PRIMER INGRESO</Eyebrow>
          <h1>Crea tu contraseña</h1>
          <p className={login.copy}>
            Hola {profile.full_name}, tu cuenta tiene una contraseña temporal. Cámbiala para continuar.
            {profile.temp_password_expires_at && ` Vence el ${formatDateTime(profile.temp_password_expires_at)}.`}
          </p>
          <PasswordForm onDone={onDone} compact />
          <button className={buttons.ghost} style={{ marginTop: 16 }} onClick={onLogout}>
            <LogOut size={13} style={{ verticalAlign: "-2px" }} /> Cerrar sesión
          </button>
        </section>
      </main>
    </ToastProvider>
  );
}
