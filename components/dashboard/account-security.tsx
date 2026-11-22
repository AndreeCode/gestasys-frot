"use client";

import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { BrandMark } from "@/components/common/brand-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/feedback";
import { Eyebrow } from "@/components/common/page-heading";
import { ToastProvider } from "@/components/common/toast";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import {
  mfaDisableAction,
  mfaEnableAction,
  mfaSetupAction,
  mfaStatusAction,
  mySessionsAction,
  revokeMySessionAction,
  type MfaSetup,
} from "@/lib/actions/auth";
import type { Profile } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import login from "@/components/login/login.module.css";
import forms from "./forms.module.css";

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

  async function start() {
    const result = await run(mfaSetupAction(), "Clave generada: agrégala en tu app");
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
      <div>
        <div className={forms.notice}>
          <b>Guarda estos códigos de respaldo ahora: no se volverán a mostrar.</b> Cada uno sirve una sola vez si pierdes
          el celular.
        </div>
        <pre style={{ fontSize: 14, lineHeight: 1.8, letterSpacing: 1, margin: "0 0 14px" }}>{codes.join("\n")}</pre>
        <button className={buttons.primary} onClick={() => { setCodes(null); onChanged?.(); }}>
          <ShieldCheck size={16} /> Ya los guardé
        </button>
      </div>
    );
  }

  if (status.data.enabled) {
    return (
      <div>
        <div className={forms.notice}>
          <ShieldCheck size={13} style={{ verticalAlign: "-2px" }} /> Verificación en dos pasos <b>activa</b>. Te quedan{" "}
          {status.data.recovery_codes_left} códigos de respaldo.
        </div>
        {status.data.required ? (
          <p className={forms.hint}>Tu rol exige la verificación en dos pasos, así que no se puede desactivar.</p>
        ) : (
          <form onSubmit={disable}>
            <div className={forms.grid}>
              <label>
                Contraseña
                <input name="password" type="password" required autoComplete="current-password" />
              </label>
              <label>
                Código actual
                <input name="code" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={20} />
              </label>
            </div>
            <button className={buttons.outline} disabled={pending}>
              Desactivar verificación en dos pasos
            </button>
          </form>
        )}
      </div>
    );
  }

  if (!setup) {
    return (
      <div>
        <p className={forms.hint} style={{ margin: "0 0 14px", fontSize: 12 }}>
          Además de la contraseña, al ingresar se pedirá un código de 6 dígitos de una app autenticadora en tu celular.
          {status.data.required && " Tu rol lo exige."}
        </p>
        <button className={buttons.primary} onClick={start} disabled={pending}>
          <KeyRound size={16} /> Configurar verificación en dos pasos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm}>
      <ol style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 18, margin: "0 0 14px" }}>
        <li>Abre tu app autenticadora y elige «Ingresar una clave de configuración».</li>
        <li>
          Escribe esta clave (tipo «basada en tiempo»):{" "}
          <code style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{grouped(setup.secret)}</code>
          <br />
          <small>
            Desde el celular también puedes <a href={setup.otpauth_uri}>abrirla directamente en la app</a>.
          </small>
        </li>
        <li>Escribe el código de 6 dígitos que muestra la app.</li>
      </ol>
      <div className={forms.grid}>
        <label>
          Código de la app
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} autoFocus />
        </label>
      </div>
      <button className={buttons.primary} disabled={pending}>
        <ShieldCheck size={16} /> {pending ? "Verificando..." : "Activar"}
      </button>
    </form>
  );
}

/** Sesiones abiertas de la propia cuenta (ASVS V7.4): cerrar las que no reconozcas. */
export function SessionsPanel() {
  const sessions = useBackendQuery("my-sessions", mySessionsAction);
  const { run, pending } = useBackendAction();

  async function close(id: string) {
    if (await run(revokeMySessionAction(id))) sessions.reload();
  }

  if (sessions.error) return <ErrorState error={sessions.error} onRetry={sessions.reload} />;
  if (!sessions.data) return <LoadingState />;
  if (!sessions.data.length) return <EmptyState text="No hay sesiones activas." />;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {sessions.data.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #e6eef0", borderRadius: 8, padding: "10px 12px" }}>
          <MonitorSmartphone size={18} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
            <strong>{s.current ? "Esta sesión" : (s.user_agent ?? "Navegador desconocido").slice(0, 60)}</strong>
            <div style={{ color: "#7b8a91" }}>
              IP {s.ip_address ?? "—"} · última actividad {formatDateTime(s.last_activity_at)} · iniciada {formatDateTime(s.created_at)}
            </div>
          </div>
          {!s.current && (
            <button className={buttons.ghost} disabled={pending} onClick={() => close(s.id)}>
              <LogOut size={13} /> Cerrar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Pantalla obligatoria cuando el rol exige MFA y aún no está activo (el back bloquea el resto). */
export function ForceMfaSetup({ profile, onDone, onLogout }: { profile: Profile; onDone: () => void; onLogout: () => void }) {
  return (
    <ToastProvider>
      <main className={login.screen}>
        <section className={login.card} style={{ maxWidth: 520 }}>
          <div className={login.brand}>
            <BrandMark />
            <span>gestasys</span>
          </div>
          <Eyebrow>SEGURIDAD DE LA CUENTA</Eyebrow>
          <h1>Activa la verificación en dos pasos</h1>
          <p className={login.copy}>
            Hola {profile.full_name}, tu rol tiene acceso a datos sensibles de pacientes y exige un segundo factor para ingresar.
          </p>
          <MfaPanel onChanged={onDone} />
          <button className={buttons.ghost} style={{ marginTop: 16 }} onClick={onLogout}>
            <LogOut size={13} style={{ verticalAlign: "-2px" }} /> Cerrar sesión
          </button>
        </section>
      </main>
    </ToastProvider>
  );
}
