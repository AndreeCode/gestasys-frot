import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookie-names";
import { contentSecurityPolicy, newNonce } from "@/lib/csp";
import { checkSession } from "@/lib/session-check";

/** Navegación de página completa (no Server Action ni petición RSC). */
function isPageLoad(request: NextRequest) {
  return request.method === "GET" && !request.headers.has("rsc") && !request.headers.has("next-action");
}

export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname === "/" && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((pathname === "/" || pathname === "/login") && hasSession && isPageLoad(request)) {
    const state = await checkSession(request);
    if (state === "invalid") {
      // Cookie vieja: se borra y se muestra el login (sin bucle / <-> /login).
      const response = NextResponse.redirect(new URL("/login?motivo=expirada", request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (pathname === "/login" && state === "valid") {
      // Ya hay sesión: directo a su panel (el resumen depende del rol y del ámbito).
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
