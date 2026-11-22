"use server";

import { cookies, headers } from "next/headers";

import { backend } from "@/lib/api/server";
import type { Profile } from "@/lib/api/types";
import { BACKEND_URL, parseSetCookie } from "@/lib/backend";

const secure = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE = 60 * 60;
const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;

type LoginResult = { ok: true; profile: Profile } | { ok: false; error: string };

/** Devuelve el error en lugar de lanzarlo: en producción Next oculta los mensajes de los errores lanzados. */
export async function loginAction(username: string, password: string): Promise<LoginResult> {
  const cookieStore = await cookies();
  const userAgent = (await headers()).get("user-agent") ?? "";
  const deviceToken = cookieStore.get("device_token")?.value;

  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      ...(deviceToken ? { Cookie: `device_token=${deviceToken}` } : {}),
    },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false, error: "No se pudo conectar con el servidor" };

  const body = await res.json().catch(() => null);
  const setCookies = res.headers.getSetCookie();
  const newDeviceToken = parseSetCookie(setCookies, "device_token");
  if (newDeviceToken) {
    cookieStore.set("device_token", newDeviceToken, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: DEVICE_MAX_AGE,
    });
  }
  if (!res.ok) return { ok: false, error: body?.msg ?? "Credenciales inválidas" };

  const token = parseSetCookie(setCookies, "access_token");
  if (!token) return { ok: false, error: "No se recibió la sesión del servidor" };

  const profile = body.data as Profile;
  const expires = profile.session?.expires_at ? new Date(profile.session.expires_at) : null;
  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    ...(expires ? { expires } : { maxAge: SESSION_MAX_AGE }),
  });
  return { ok: true, profile };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const userAgent = (await headers()).get("user-agent") ?? "";
  await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: "POST",
    headers: { "User-Agent": userAgent, ...(token ? { Cookie: `access_token=${token}` } : {}) },
    cache: "no-store",
  }).catch(() => null);
  cookieStore.delete("access_token");
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
