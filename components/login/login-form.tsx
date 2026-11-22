"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BrandMark } from "@/components/common/brand-mark";
import { Eyebrow } from "@/components/common/page-heading";
import { loginAction } from "@/lib/actions/auth";
import styles from "./login.module.css";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await loginAction(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    if (!result.ok) {
      setError(result.error);
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
        <h1>Iniciar sesión</h1>
        <p className={styles.copy}>Ingresa con tu usuario o correo institucional.</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Usuario o correo
            <input name="username" autoComplete="username" required autoFocus placeholder="usuario@salud.gob.pe" />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
          </label>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          <button className={styles.submit} disabled={pending}>
            <LogIn size={16} /> {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <small className={styles.demoNote}>
          <ShieldCheck size={12} style={{ verticalAlign: "-2px" }} /> Tu sesión se protege con cookies seguras.
        </small>
      </section>
    </main>
  );
}
