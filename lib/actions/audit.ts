"use server";

import { backend, paged } from "@/lib/api/server";
import type { AuditFilters, AuditLog, HealthFacility } from "@/lib/api/types";

/** Bitácora filtrada por el back según el ámbito del usuario (red, microred o EE.SS.). */
export async function loadAudit(filters: AuditFilters) {
  return paged<AuditLog>("/audit-logs", filters);
}

export async function loadAuditFacilities() {
  return backend<HealthFacility[]>("/health-facilities", { query: { active: true } });
}
