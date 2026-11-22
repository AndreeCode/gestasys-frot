import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * La sesión dejó de valer en el backend pero la cookie sigue en el navegador. Un Server
 * Component no puede borrarla; sin esta ruta, proxy.ts mandaría de /login a / en bucle.
 */
export async function GET(request: NextRequest) {
  (await cookies()).delete("access_token");
  return NextResponse.redirect(new URL("/login", request.url));
}
