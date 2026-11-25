import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { CLEAR_SITE_DATA, SESSION_COOKIE } from "@/lib/cookie-names";

/**
 * La sesión dejó de valer en el backend pero la cookie sigue en el navegador. Un Server
 * Component no puede borrarla; sin esta ruta, proxy.ts mandaría de /login a / en bucle.
 */
export async function GET(request: NextRequest) {
  (await cookies()).delete(SESSION_COOKIE);
  const response = NextResponse.redirect(new URL("/login?motivo=expirada", request.url));
  for (const [key, value] of Object.entries(CLEAR_SITE_DATA)) response.headers.set(key, value);
  return response;
}
