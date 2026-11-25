"use client";

import { KeyRound, LogOut, Monitor, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Pill } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Notice } from "@/components/common/feedback";
import { Field, FormActions, FormGrid, Hint } from "@/components/common/form";
import { ToastProvider } from "@/components/common/toast";
import { AuthLayout } from "@/components/login/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import {
  mfaDisableAction,
  mfaEnableAction,
  mfaSetupAction,
  mfaStatusAction,
  mySessionsAction,
  revokeMyOtherSessionsAction,
  revokeMySessionAction,
  type MfaSetup,
} from "@/lib/actions/auth";
import type { Profile } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

/** La clave en grupos de 4 se copia a mano sin errores ("Ingresar clave de configuración"). */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

/**
 * Verificación en dos pasos con TOTP (ASVS V6.3): cualquier app autenticadora sirve
 * (Google Authenticator, Microsoft Authenticator, FreeOTP...). El back guarda el secreto cifrado.
 */
export function MfaPanel({ onChanged }: { onChanged?: () => void }) {
  const status = useBackendQuery("mfa-status", mfaStatusAction);
  const { run, pending } = useBackendAction();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await run(mfaSetupAction(password), "Clave generada: agrégala en tu app");
    if (result) setSetup(result.data);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const result = await run(mfaEnableAction(code));
    if (result) {
      setCodes(result.data.recovery_codes);
      setSetup(null);
      status.reload();
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await run(mfaDisableAction(String(form.get("password") ?? ""), String(form.get("code") ?? "")))) {
      status.reload();
      onChanged?.();
    }
  }

  if (status.error) return <ErrorState error={status.error} onRetry={status.reload} />;
  if (!status.data) return <LoadingState />;

  if (codes) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">
          <b>Guarda estos códigos de respaldo ahora: no se volverán a mostrar.</b> Cada uno sirve una sola vez si pierdes el
          celular.
        </Notice>
        <pre className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-muted p-4 font-mono text-sm tracking-wider">
          {codes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </pre>
        <Button
          onClick={() => {
            setCodes(null);
            onChanged?.();
          }}
        >
          <ShieldCheck /> Ya los guardé
        </Button>
      </div>
    );
  }

  if (status.data.enabled) {
    return (
      <div className="space-y-4">
        <Notice tone="success" className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Verificación en dos pasos <b>activa</b>. Te quedan {status.data.recovery_codes_left} códigos de respaldo.
          </span>
        </Notice>
        {status.data.required ? (
          <Hint>Tu rol exige la verificación en dos pasos, así que no se puede desactivar.</Hint>
        ) : (
          <form onSubmit={disable}>
            <FormGrid>
              <Field label="Contraseña">
                <Input name="password" type="password" required autoComplete="current-password" />
              </Field>
              <Field label="Código actual">
                <Input name="code" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={20} />
              </Field>
            </FormGrid>
            <FormActions className="mt-4 justify-start">
              <Button type="submit" variant="outline" disabled={pending}>
                Desactivar verificación en dos pasos
              </Button>
            </FormActions>
          </form>
        )}
      </div>
    );
  }

  if (!setup) {
    return (
      <form onSubmit={start} className="space-y-4">
        <Hint className="text-sm">
          Además de la contraseña, al ingresar se pedirá un código de 6 dígitos de una app autenticadora en tu celular.
          {status.data.required && " Tu rol lo exige."}
        </Hint>
        <Field label="Confirma tu contraseña">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit" disabled={pending}>
          <KeyRound /> Configurar verificación en dos pasos
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-5">
      <ol className="space-y-4">
        {[
          <>Abre tu app autenticadora y elige «Ingresar una clave de configuración».</>,
          <>
            Escribe esta clave (tipo «basada en tiempo»):
            <code className="mt-2 block rounded-lg bg-muted px-3 py-2.5 font-mono text-base font-semibold tracking-widest break-all text-foreground select-all">
              {grouped(setup.secret)}
            </code>
            <small className="mt-1.5 block text-xs text-muted-foreground">
              Desde el celular también puedes{" "}
              <a className="font-medium text-primary underline-offset-4 hover:underline" href={setup.otpauth_uri}>
                abrirla directamente en la app
              </a>
              .
            </small>
          </>,
          <>Escribe el código de 6 dígitos que muestra la app.</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">{step}</div>
          </li>
        ))}
      </ol>
      <Field label="Código de la app">
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          minLength={6}
          maxLength={6}
          autoFocus
          placeholder="123456"
          className="h-11 text-lg tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        <ShieldCheck /> {pending ? "Verificando..." : "Activar"}
      </Button>
    </form>
  );
}

/**
 * Sesiones abiertas de la propia cuenta (ASVS V7.4 / V7.5.2): cerrar una o todas las demás,
 * confirmando la contraseña, así quien encuentre la sesión abierta no echa al dueño.
 */
export function SessionsPanel() {
  const sessions = useBackendQuery("my-sessions", mySessionsAction);
  const { run, pending } = useBackendAction();
  const [password, setPassword] = useState("");

  async function close(id: string | null) {
    const action = id ? revokeMySessionAction(id, password) : revokeMyOtherSessionsAction(password);
    if (await run(action)) {
      setPassword("");
      sessions.reload();
    }
  }

  if (sessions.error) return <ErrorState error={sessions.error} onRetry={sessions.reload} />;
  if (!sessions.data) return <LoadingState />;
  if (!sessions.data.length) return <EmptyState text="No hay sesiones activas." />;

  const others = sessions.data.some((s) => !s.current);

  return (
    <div className="space-y-4">
      {others && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/60 p-4">
          <Field label="Contraseña para cerrar sesiones" className="min-w-56 flex-1">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button variant="outline" disabled={pending || !password} onClick={() => close(null)}>
            <LogOut /> Cerrar todas las demás
          </Button>
        </div>
      )}
      <ul className="divide-y rounded-lg border">
        {sessions.data.map((s) => (
          <li key={s.id} className="flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Monitor className="size-5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="truncate font-medium">
                  {s.current ? "Esta sesión" : (s.user_agent ?? "Navegador desconocido").slice(0, 60)}
                </strong>
                {s.current && (
                  <Pill tone="success" dot>
                    Actual
                  </Pill>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                IP {s.ip_address ?? "—"} · última actividad {formatDateTime(s.last_activity_at)} · iniciada {formatDateTime(s.created_at)}
              </div>
            </div>
            {!s.current && (
              <Button variant="ghost" size="sm" disabled={pending || !password} onClick={() => close(s.id)}>
                <LogOut /> Cerrar
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pantalla obligatoria cuando el rol exige MFA y aún no está activo (el back bloquea el resto). */
export function ForceMfaSetup({ profile, onDone, onLogout }: { profile: Profile; onDone: () => void; onLogout: () => void }) {
  return (
    <ToastProvider>
      <AuthLayout
        wide
        eyebrow="Seguridad de la cuenta"
        title="Activa la verificación en dos pasos"
        description={`Hola ${profile.full_name}, tu rol tiene acceso a datos sensibles de pacientes y exige un segundo factor para ingresar.`}
        footer={
          <Button variant="ghost" className="w-full" onClick={onLogout}>
            <LogOut /> Cerrar sesión
          </Button>
        }
      >
        <MfaPanel onChanged={onDone} />
      </AuthLayout>
    </ToastProvider>
  );
}
