import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { forwardedHeaders } from "@/lib/api/forwarded";
import { BACKEND_URL } from "@/lib/backend";
import { CLEAR_SITE_DATA, SESSION_COOKIE } from "@/lib/cookie-names";

/**
 * Cierre de sesión en una sola navegación (POST desde un formulario, no se puede disparar con un
 * enlace): cierra la sesión en el backend, borra la cookie y lleva al login. Antes era una
 * Server Action y Next refrescaba la página ya sin sesión, lo que mostraba un error por un instante.
 */
export async function POST(request: NextRequest) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { ...(await forwardedHeaders()), Cookie: `access_token=${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
  }
  store.delete(SESSION_COOKIE);
  const response = NextResponse.redirect(new URL("/login?motivo=salida", request.url), 303);
  for (const [key, value] of Object.entries(CLEAR_SITE_DATA)) response.headers.set(key, value);
  return response;
}

/** Compatibilidad: una visita directa solo limpia la cookie local, como /session-expired. */
export { GET } from "../session-expired/route";
