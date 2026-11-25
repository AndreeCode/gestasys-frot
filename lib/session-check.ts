import type { NextRequest } from "next/server";

import { BACKEND_URL } from "@/lib/backend";
import { SESSION_COOKIE } from "@/lib/cookie-names";

export type SessionState = "valid" | "invalid" | "unknown";

/**
 * Pregunta al backend si la cookie de sesión sigue siendo válida (proxy.ts, solo en navegaciones a
 * / y /login). "unknown" = el backend no respondió: no se borra nada y se deja pasar como antes.
 */
export async function checkSession(request: NextRequest): Promise<SessionState> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return "invalid";
  const ip = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Cookie: `access_token=${token}`,
        "User-Agent": request.headers.get("user-agent") ?? "",
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (res.status === 401) return "invalid";
    return res.ok || res.status === 403 ? "valid" : "unknown";
  } catch {
    return "unknown";
  }
}
