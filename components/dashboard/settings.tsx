"use client";

import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Notice } from "@/components/common/feedback";
import { Field, FormActions, FormGrid, Hint, full } from "@/components/common/form";
import { PageHeading } from "@/components/common/page-heading";
import { InfoGrid, InfoItem, Panel, PanelHeading } from "@/components/common/panel";
import { ToastProvider } from "@/components/common/toast";
import { AuthLayout } from "@/components/login/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackendAction } from "@/hooks/use-backend";
import { changePasswordAction } from "@/lib/actions/auth";
import type { Profile } from "@/lib/api/types";
import { formatDateTime, roleTitle } from "@/lib/format";
import { MfaPanel, SessionsPanel } from "./account-security";
import { useSession } from "./session";

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
    <form onSubmit={onSubmit}>
      <FormGrid cols={compact ? 1 : 2}>
        <Field label="Contraseña actual" className={full}>
          <Input name="current_password" type="password" required autoComplete="current-password" className={compact ? "h-11" : undefined} />
        </Field>
        <Field label="Nueva contraseña">
          <Input
            name="new_password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={compact ? "h-11" : undefined}
          />
        </Field>
        <Field label="Repite la nueva contraseña">
          <Input
            name="confirm"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={compact ? "h-11" : undefined}
          />
        </Field>
      </FormGrid>
      {mismatch && (
        <Notice tone="danger" className="mt-4">
          Las contraseñas nuevas no coinciden
        </Notice>
      )}
      <Hint className="mt-4">
        Mínimo 8 caracteres y que no sea una contraseña común; una frase larga es más segura y fácil de recordar. Al cambiarla se
        cierran tus otras sesiones.
      </Hint>
      <FormActions className={compact ? "mt-5" : "justify-start"}>
        <Button type="submit" size="lg" className={compact ? "h-11 w-full" : undefined} disabled={pending}>
          <KeyRound /> {pending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </FormActions>
    </form>
  );
}

export function Settings() {
  const { profile, reloadProfile } = useSession();
  return (
    <>
      <PageHeading eyebrow="Mi cuenta" title="Configuración" subtitle="Tus datos de acceso y seguridad." />
      <div className="grid gap-6">
        <Panel>
          <PanelHeading title="Datos de la cuenta" icon={<UserRound className="size-[18px]" />} />
          <InfoGrid>
            <InfoItem label="Nombre">{profile.full_name}</InfoItem>
            <InfoItem label="Usuario">{profile.username}</InfoItem>
            <InfoItem label="Correo">{profile.email}</InfoItem>
            <InfoItem label="Rol">{roleTitle(profile.role)}</InfoItem>
            <InfoItem label="DNI">{profile.dni ?? "—"}</InfoItem>
            <InfoItem label="Teléfono">{profile.phone ?? "—"}</InfoItem>
            <InfoItem label="Último ingreso">{formatDateTime(profile.last_login_at)}</InfoItem>
            <InfoItem label="Permisos">{profile.permissions.length}</InfoItem>
          </InfoGrid>
        </Panel>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel>
            <PanelHeading title="Cambiar contraseña" icon={<KeyRound className="size-[18px]" />} />
            <PasswordForm onDone={reloadProfile} />
          </Panel>
          <Panel>
            <PanelHeading
              title="Verificación en dos pasos"
              description="Un código de tu celular además de la contraseña."
              icon={<ShieldCheck className="size-[18px]" />}
            />
            <MfaPanel onChanged={reloadProfile} />
          </Panel>
        </div>
        <Panel>
          <PanelHeading
            title="Mis sesiones"
            description="Si ves una sesión que no reconoces, ciérrala y cambia tu contraseña. Las sesiones se cierran solas tras 30 minutos sin actividad."
            icon={<MonitorSmartphone className="size-[18px]" />}
          />
          <SessionsPanel />
        </Panel>
      </div>
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
      <AuthLayout
        eyebrow="Primer ingreso"
        title="Crea tu contraseña"
        description={
          <>
            Hola {profile.full_name}, tu cuenta tiene una contraseña temporal. Cámbiala para continuar.
            {profile.temp_password_expires_at && ` Vence el ${formatDateTime(profile.temp_password_expires_at)}.`}
          </>
        }
        footer={
          <Button variant="ghost" className="w-full" onClick={onLogout}>
            <LogOut /> Cerrar sesión
          </Button>
        }
      >
        <PasswordForm onDone={onDone} compact />
      </AuthLayout>
    </ToastProvider>
  );
}
