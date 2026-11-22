import { NextResponse } from "next/server";

import { sessionHeaders } from "@/lib/api/server";
import { BACKEND_URL } from "@/lib/backend";

/** Reenvía una descarga del backend al navegador (CSV, backups) sin exponer el token. */
export async function forwardDownload(path: string): Promise<Response> {
  const auth = await sessionHeaders();
  if (!auth) return NextResponse.json({ status: 401, msg: "Tu sesión terminó, vuelve a ingresar" }, { status: 401 });

  const res = await fetch(`${BACKEND_URL}/api${path}`, { headers: auth, cache: "no-store" }).catch(() => null);
  if (!res) return NextResponse.json({ status: 503, msg: "No se pudo conectar con el servidor" }, { status: 503 });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    return NextResponse.json(
      { status: res.status, msg: payload?.msg ?? `Error ${res.status} del servidor` },
      { status: res.status },
    );
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length", "x-total-count"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "no-store");
  return new Response(res.body, { status: 200, headers });
}
