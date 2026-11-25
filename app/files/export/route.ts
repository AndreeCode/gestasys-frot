import type { NextRequest } from "next/server";

import { forwardDownload } from "@/lib/api/download";

const ALLOWED = ["q", "health_facility_id", "status", "risk_level", "mark", "micro_network_id", "age_group", "insurance", "controls", "missed", "due_from", "due_to", "created_from", "created_to", "delimiter"];

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return forwardDownload(`/pregnancies/export${query ? `?${query}` : ""}`);
}

/** Export con filtros (incluido el DNI buscado) enviado por un formulario POST: nada queda en la URL. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const body: Record<string, string> = {};
  for (const key of ALLOWED) {
    const value = form?.get(key);
    if (typeof value === "string" && value) body[key] = value;
  }
  return forwardDownload("/pregnancies/export", body);
}
