"use server";

import { cookies } from "next/headers";

import { forwardedHeaders } from "@/lib/api/forwarded";
import { backend } from "@/lib/api/server";
import type { Profile } from "@/lib/api/types";
import { BACKEND_URL, parseSetCookie } from "@/lib/backend";
import { DEVICE_COOKIE, SESSION_COOKIE } from "@/lib/cookie-names";

const secure = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE = 60 * 60;
const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;

type LoginResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string; mfaToken?: undefined }
  | { ok: false; mfaToken: string; error?: undefined };

/**
 * Llama a /auth/login o /auth/login/mfa y guarda las cookies que devuelve el back. Si la cuenta
 * tiene verificación en dos pasos, el primer paso no crea sesión: devuelve `mfaToken` (5 min).
 * Devuelve el error en lugar de lanzarlo: en producción Next oculta los mensajes lanzados.
 */
async function authenticate(path: string, payload: unknown): Promise<LoginResult> {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_COOKIE)?.value;

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await forwardedHeaders()),
      ...(deviceToken ? { Cookie: `device_token=${deviceToken}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) return { ok: false, error: "No se pudo conectar con el servidor" };

  const body = await res.json().catch(() => null);
  const setCookies = res.headers.getSetCookie();
  const newDeviceToken = parseSetCookie(setCookies, "device_token");
  if (newDeviceToken) {
    cookieStore.set(DEVICE_COOKIE, newDeviceToken, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: DEVICE_MAX_AGE,
    });
  }
  if (!res.ok) return { ok: false, error: body?.msg ?? "Credenciales inválidas" };
  if (body?.data?.mfa_required) return { ok: false, mfaToken: String(body.data.mfa_token) };

  const token = parseSetCookie(setCookies, "access_token");
  if (!token) return { ok: false, error: "No se recibió la sesión del servidor" };

  const profile = body.data as Profile;
  const expires = profile.session?.expires_at ? new Date(profile.session.expires_at) : null;
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    ...(expires ? { expires } : { maxAge: SESSION_MAX_AGE }),
  });
  return { ok: true, profile };
}

export async function loginAction(username: string, password: string): Promise<LoginResult> {
  return authenticate("/auth/login", { username, password });
}

/** Segundo paso: código de la app autenticadora (6 dígitos) o un código de respaldo. */
export async function mfaLoginAction(mfaToken: string, code: string): Promise<LoginResult> {
  return authenticate("/auth/login/mfa", { mfa_token: mfaToken, code });
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: "POST",
    headers: { ...(await forwardedHeaders()), ...(token ? { Cookie: `access_token=${token}` } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  cookieStore.delete(SESSION_COOKIE);
}

export async function meAction() {
  return backend<Profile>("/auth/me");
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  return backend<null>("/auth/password", {
    method: "PUT",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export type MfaStatus = { enabled: boolean; required: boolean; setup_pending: boolean; recovery_codes_left: number };
export type MfaSetup = { secret: string; otpauth_uri: string };
export type MySession = {
  id: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  current: boolean;
};

export async function mfaStatusAction() {
  return backend<MfaStatus>("/auth/mfa");
}

export async function mfaSetupAction() {
  return backend<MfaSetup>("/auth/mfa/setup", { method: "POST", body: {} });
}

export async function mfaEnableAction(code: string) {
  return backend<{ recovery_codes: string[] }>("/auth/mfa/enable", { method: "POST", body: { code } });
}

export async function mfaDisableAction(password: string, code: string) {
  return backend<null>("/auth/mfa/disable", { method: "POST", body: { password, code } });
}

export async function mySessionsAction() {
  return backend<MySession[]>("/auth/sessions");
}

export async function revokeMySessionAction(sessionId: string) {
  return backend<null>(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}
