import { cookies } from "next/headers";

import { BACKEND_URL } from "@/lib/backend";
import { forwardedHeaders } from "@/lib/api/forwarded";
import type { ApiResult } from "@/lib/api/types";
import { toQuery } from "@/lib/query";

type Method = "GET" | "POST" | "PUT" | "DELETE";

/** Encabezados para hablar con el backend en nombre del usuario: cookie de sesión, navegador e IP. */
export async function sessionHeaders(): Promise<Record<string, string> | null> {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return null;
  return { Cookie: `access_token=${token}`, ...(await forwardedHeaders()) };
}

/**
 * Llamada al backend desde una Server Action: el token viaja servidor a servidor y nunca
 * llega al navegador. `body` va como JSON y `form` como multipart.
 */
export async function backend<T>(
  path: string,
  init: { method?: Method; body?: unknown; form?: FormData; query?: Record<string, unknown> } = {},
): Promise<ApiResult<T>> {
  const auth = await sessionHeaders();
  if (!auth) return { ok: false, status: 401, error: "Tu sesión terminó, vuelve a ingresar" };

  const res = await fetch(`${BACKEND_URL}/api${path}${toQuery(init.query)}`, {
    method: init.method ?? "GET",
    headers: { ...auth, ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return { ok: false, status: 503, error: "No se pudo conectar con el servidor" };

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) (await cookies()).delete("access_token");
    return { ok: false, status: res.status, error: payload?.msg ?? `Error ${res.status} del servidor` };
  }
  return { ok: true, data: payload?.data as T, msg: payload?.msg ?? "", meta: payload?.meta };
}

/** Une varias lecturas hechas en paralelo: si alguna falla, devuelve ese error. */
export function combine<T extends Record<string, ApiResult<unknown>>>(
  results: T,
): ApiResult<{ [K in keyof T]: T[K] extends ApiResult<infer U> ? U : never }> {
  const data: Record<string, unknown> = {};
  for (const [key, result] of Object.entries(results)) {
    if (!result.ok) return result;
    data[key] = result.data;
  }
  return { ok: true, data: data as { [K in keyof T]: T[K] extends ApiResult<infer U> ? U : never }, msg: "" };
}

/** Listas de apoyo que no todos los roles pueden leer: un 403 se vuelve lista vacía. */
export function orEmpty<T>(result: ApiResult<T[]>): ApiResult<T[]> {
  return !result.ok && result.status === 403 ? { ok: true, data: [], msg: "" } : result;
}

export const id = (value: string) => encodeURIComponent(value);
