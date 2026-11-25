"use client";

import { OTPField } from "@base-ui/react/otp-field";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Info, KeyRound, Loader2, Lock, LogIn, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Field } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, mfaLoginAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { AuthLayout } from "./auth-layout";

export type LoginReason = "salida" | "expirada";

const REMEMBER_KEY = "gestasys.username";
const OTP_LENGTH = 6;
const iconClass = "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground";

function readRemembered(): string {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveRemembered(username: string | null) {
  try {
    if (username) window.localStorage.setItem(REMEMBER_KEY, username);
    else window.localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* almacenamiento bloqueado: solo se pierde la comodidad */
  }
}

function ReasonNotice({ reason }: { reason: LoginReason }) {
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/25 bg-accent/60 px-3.5 py-3 text-sm text-accent-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      {reason === "salida" ? "Cerraste sesión correctamente." : "Tu sesión expiró por seguridad. Vuelve a ingresar."}
    </div>
  );
}

export function LoginForm({ reason }: { reason: LoginReason | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const remembered = readRemembered();
    if (remembered && usernameRef.current && rememberRef.current) {
      usernameRef.current.value = remembered;
      rememberRef.current.checked = true;
      passwordRef.current?.focus();
    }
  }, []);

  function trackCaps(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    let result;
    if (mfaToken) {
      result = await mfaLoginAction(mfaToken, String(form.get("code") ?? "").trim());
    } else {
      const username = String(form.get("username") ?? "").trim();
      saveRemembered(form.get("remember") ? username : null);
      result = await loginAction(username, String(form.get("password") ?? ""));
    }
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

  const submitLabel = pending ? "Verificando..." : mfaToken ? "Verificar" : "Ingresar";

  return (
    <AuthLayout
      eyebrow={mfaToken ? "Verificación en dos pasos" : "Portal seguro"}
      title={mfaToken ? "Confirma que eres tú" : "Bienvenido"}
      description={
        mfaToken
          ? useRecovery
            ? "Escribe uno de tus códigos de respaldo (por ejemplo ABCD-EFGH)."
            : "Escribe el código de 6 dígitos de tu app autenticadora."
          : "Ingresa con tu usuario o correo institucional."
      }
    >
      {reason && !mfaToken && !error && <ReasonNotice reason={reason} />}
      <form ref={formRef} className="grid gap-5" onSubmit={onSubmit} key={mfaToken ? `mfa-${useRecovery}` : "password"}>
        {mfaToken ? (
          useRecovery ? (
            <Field label="Código de respaldo">
              <div className="relative">
                <KeyRound className={iconClass} />
                <Input
                  name="code"
                  required
                  autoFocus
                  autoComplete="off"
                  minLength={8}
                  maxLength={20}
                  placeholder="ABCD-EFGH"
                  className="h-11 pl-10 font-mono tracking-widest uppercase"
                />
              </div>
            </Field>
          ) : (
            <div className="grid gap-2">
              <span className="text-sm font-medium">Código de verificación</span>
              <OTPField.Root
                name="code"
                length={OTP_LENGTH}
                required
                autoSubmit
                aria-label="Código de verificación de 6 dígitos"
                className="flex justify-between gap-2"
              >
                {Array.from({ length: OTP_LENGTH }, (_, index) => (
                  <OTPField.Input
                    key={index}
                    autoFocus={index === 0}
                    aria-label={index === 0 ? undefined : `Dígito ${index + 1} de ${OTP_LENGTH}`}
                    className="size-12 rounded-lg border border-input bg-card text-center text-xl font-semibold tabular-nums transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/40 sm:size-14"
                  />
                ))}
              </OTPField.Root>
            </div>
          )
        ) : (
          <>
            <Field label="Usuario o correo">
              <div className="relative">
                <User className={iconClass} />
                <Input
                  ref={usernameRef}
                  name="username"
                  autoComplete="username"
                  required
                  autoFocus
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="usuario@salud.gob.pe"
                  className="h-11 pl-10"
                />
              </div>
            </Field>
            <Field
              label={
                <span className="flex items-center justify-between">
                  Contraseña
                  {capsLock && <span className="text-xs font-medium text-warning">Bloq Mayús activado</span>}
                </span>
              }
            >
              <div className="relative">
                <Lock className={iconClass} />
                <Input
                  ref={passwordRef}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  onKeyDown={trackCaps}
                  onKeyUp={trackCaps}
                  className="h-11 pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground select-none">
                <input ref={rememberRef} type="checkbox" name="remember" className="size-4 accent-primary" />
                Recordar mi usuario
              </label>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowHelp((v) => !v)}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {showHelp && (
              <p className="-mt-2 rounded-lg bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Pídele al administrador de tu microred que la restablezca. Recibirás una contraseña temporal que deberás
                cambiar al ingresar.
              </p>
            )}
          </>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className={cn("h-11 w-full text-sm", !pending && "shadow-sm shadow-primary/25")} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
          {submitLabel}
        </Button>

        {mfaToken && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMfaToken(null)}>
              <ArrowLeft /> Volver
            </Button>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setError(null);
                setUseRecovery((v) => !v);
              }}
            >
              {useRecovery ? "Usar la app autenticadora" : "Usar un código de respaldo"}
            </button>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
