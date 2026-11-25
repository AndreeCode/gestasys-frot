import type { NextRequest } from "next/server";

import { forwardDownload } from "@/lib/api/download";

const FILTERS = ["q", "health_facility_id", "status", "risk_level", "mark", "micro_network_id", "age_group", "insurance", "controls", "missed", "due_from", "due_to", "created_from", "created_to"];
const SECTION = /^[a-z0-9-]{1,40}$/;

/** Excel en formato MINSA: filtros y secciones por POST (el DNI buscado no queda en la URL). */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const body: Record<string, unknown> = {};
  for (const key of FILTERS) {
    const value = form?.get(key);
    if (typeof value === "string" && value) body[key] = value;
  }
  const sections = (form?.getAll("sections") ?? []).filter((v): v is string => typeof v === "string" && SECTION.test(v));
  if (sections.length) body.sections = sections.slice(0, 40);
  return forwardDownload("/pregnancies/export/minsa", body);
}
