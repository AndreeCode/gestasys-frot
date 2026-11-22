"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BrandMark } from "@/components/common/brand-mark";
import { Eyebrow } from "@/components/common/page-heading";
import { loginAction, mfaLoginAction } from "@/lib/actions/auth";
import styles from "./login.module.css";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = mfaToken
      ? await mfaLoginAction(mfaToken, String(form.get("code") ?? ""))
      : await loginAction(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    if (!result.ok) {
      if (result.mfaToken) setMfaToken(result.mfaToken);
      else setError(result.error ?? "No se pudo iniciar sesión");
      if (result.error?.includes("vencio")) setMfaToken(null);
      setPending(false);
      return;
    }
    // Navegación completa: proxy.ts ya ve la cookie nueva.
    window.location.replace("/");
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <BrandMark />
          <span>gestasys</span>
        </div>
        <Eyebrow>PORTAL SEGURO</Eyebrow>
        <h1>{mfaToken ? "Verificación en dos pasos" : "Iniciar sesión"}</h1>
        <p className={styles.copy}>
          {mfaToken
            ? "Escribe el código de 6 dígitos de tu app autenticadora, o uno de tus códigos de respaldo."
            : "Ingresa con tu usuario o correo institucional."}
        </p>
        <form className={styles.form} onSubmit={onSubmit} key={mfaToken ? "mfa" : "password"}>
          {mfaToken ? (
            <label>
              Código de verificación
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                minLength={6}
                maxLength={20}
                placeholder="123456"
              />
            </label>
          ) : (
            <>
              <label>
                Usuario o correo
                <input name="username" autoComplete="username" required autoFocus placeholder="usuario@salud.gob.pe" />
              </label>
              <label>
                Contraseña
                <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
              </label>
            </>
          )}
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          <button className={styles.submit} disabled={pending}>
            <LogIn size={16} /> {pending ? "Verificando..." : mfaToken ? "Verificar" : "Ingresar"}
          </button>
          {mfaToken && (
            <button type="button" className={styles.link} onClick={() => setMfaToken(null)}>
              Volver a usuario y contraseña
            </button>
          )}
        </form>
        <small className={styles.demoNote}>
          <ShieldCheck size={12} style={{ verticalAlign: "-2px" }} /> Tu sesión se protege con cookies seguras.
        </small>
      </section>
    </main>
  );
}
