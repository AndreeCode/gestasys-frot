"use server";

import { backend, combine, id } from "@/lib/api/server";
import type {
  ApiResult,
  AuditLog,
  HealthFacility,
  MinsaView,
  Page,
  Pregnancy,
  PregnancyFilters,
  PregnancyInput,
  PrenatalControl,
  PrenatalControlInput,
  Stats,
} from "@/lib/api/types";

/** Solo los filtros con valor: el back valida estado y riesgo contra una lista cerrada. */
function searchBody(filters: PregnancyFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""));
}

/**
 * La búsqueda va por POST (ASVS V14): el DNI o el nombre viajan en el cuerpo y no quedan en la URL,
 * es decir, ni en el log de accesos del back ni en el historial o los proxies.
 */
async function pregnancyPage(filters: PregnancyFilters): Promise<ApiResult<Page<Pregnancy>>> {
  const result = await backend<Pregnancy[]>("/pregnancies/search", { method: "POST", body: searchBody(filters) });
  if (!result.ok) return result;
  return {
    ok: true,
    msg: result.msg,
    data: {
      items: result.data,
      total: Number(result.meta?.total ?? result.data.length),
      limit: Number(result.meta?.limit ?? filters.limit ?? 25),
      offset: Number(result.meta?.offset ?? 0),
    },
  };
}

export async function loadRecords(filters: PregnancyFilters) {
  const [page, stats, facilities] = await Promise.all([
    pregnancyPage(filters),
    backend<Stats>("/pregnancies/stats"),
    backend<HealthFacility[]>("/health-facilities", { query: { active: true } }),
  ]);
  return combine({ page, stats, facilities });
}

export async function loadStats() {
  return backend<Stats>("/pregnancies/stats");
}

export async function loadFacilities() {
  return backend<HealthFacility[]>("/health-facilities", { query: { active: true } });
}

export async function loadPregnancyDetail(pregnancyId: string) {
  const [pregnancy, controls] = await Promise.all([
    backend<Pregnancy>(`/pregnancies/${id(pregnancyId)}`),
    backend<PrenatalControl[]>("/prenatal-controls", { query: { pregnancy_id: pregnancyId } }),
  ]);
  return combine({ pregnancy, controls });
}

export async function createPregnancy(input: PregnancyInput) {
  return backend<Pregnancy>("/pregnancies", { method: "POST", body: input });
}

export async function updatePregnancy(pregnancyId: string, input: Partial<PregnancyInput>) {
  return backend<Pregnancy>(`/pregnancies/${id(pregnancyId)}`, { method: "PUT", body: input });
}

export async function deletePregnancy(pregnancyId: string) {
  return backend<null>(`/pregnancies/${id(pregnancyId)}`, { method: "DELETE" });
}

export async function createControl(pregnancyId: string, input: PrenatalControlInput) {
  return backend<PrenatalControl>("/prenatal-controls", {
    method: "POST",
    body: { ...input, pregnancy_id: pregnancyId },
  });
}

export async function updateControl(controlId: string, input: PrenatalControlInput) {
  return backend<PrenatalControl>(`/prenatal-controls/${id(controlId)}`, { method: "PUT", body: input });
}

export async function deleteControl(controlId: string) {
  return backend<null>(`/prenatal-controls/${id(controlId)}`, { method: "DELETE" });
}

/** Trazabilidad de una gestante: quién la registró o modificó, desde qué EE.SS., IP y dispositivo. */
export async function loadPregnancyHistory(pregnancyId: string) {
  return backend<AuditLog[]>(`/pregnancies/${id(pregnancyId)}/history`);
}

/** Vista en el formato de seguimiento de gestantes del MINSA (mismas columnas que el Excel). */
export async function loadMinsaView(filters: PregnancyFilters, sections: string[] | null) {
  const result = await backend<MinsaView>("/pregnancies/minsa", {
    method: "POST",
    body: { ...searchBody(filters), ...(sections ? { sections: sections.length ? sections : ["datos"] } : {}) },
  });
  if (!result.ok) return result;
  return {
    ...result,
    data: {
      ...result.data,
      total: Number(result.meta?.total ?? result.data.rows.length),
      limit: Number(result.meta?.limit ?? filters.limit ?? 25),
      offset: Number(result.meta?.offset ?? 0),
    },
  };
}
