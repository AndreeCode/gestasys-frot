"use server";

import { backend, combine, id, orEmpty } from "@/lib/api/server";
import type { HealthFacility, MicroNetwork } from "@/lib/api/types";

export type MicroNetworkInput = { name: string; code?: string | null; network?: string | null; active?: boolean };

export type FacilityInput = {
  code: string;
  name: string;
  category?: string | null;
  district?: string | null;
  province?: string | null;
  renaes?: string | null;
  micro_network_id?: string | null;
  active?: boolean;
};

export async function loadNetworks() {
  const [networks, facilities] = await Promise.all([
    backend<MicroNetwork[]>("/micro-networks"),
    backend<HealthFacility[]>("/health-facilities"),
  ]);
  return combine({ networks: orEmpty(networks), facilities });
}

export async function createMicroNetwork(input: MicroNetworkInput) {
  return backend<MicroNetwork>("/micro-networks", { method: "POST", body: input });
}

export async function updateMicroNetwork(networkId: string, input: Partial<MicroNetworkInput>) {
  return backend<MicroNetwork>(`/micro-networks/${id(networkId)}`, { method: "PUT", body: input });
}

export async function createFacility(input: FacilityInput) {
  return backend<HealthFacility>("/health-facilities", { method: "POST", body: input });
}

export async function updateFacility(facilityId: string, input: Partial<FacilityInput>) {
  return backend<HealthFacility>(`/health-facilities/${id(facilityId)}`, { method: "PUT", body: input });
}
