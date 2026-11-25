"use server";

import { backend } from "@/lib/api/server";
import type { ReportData } from "@/lib/api/types";

/** Estadísticas y cumplimiento: el back limita al ámbito del usuario (superadmin elige microred o EE.SS.). */
export async function loadReport(microNetworkId?: string, healthFacilityId?: string) {
  return backend<ReportData>("/reports/summary", {
    query: { micro_network_id: microNetworkId, health_facility_id: healthFacilityId },
  });
}
