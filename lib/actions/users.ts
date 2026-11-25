"use server";

import { backend, combine, id, orEmpty } from "@/lib/api/server";
import type { HealthFacility, MicroNetwork, Role, User } from "@/lib/api/types";

export type UserInput = {
  full_name: string;
  email: string;
  username?: string | null;
  role_id: string;
  password: string;
  dni?: string | null;
  phone?: string | null;
  health_facility_id?: string | null;
  micro_network_id?: string | null;
};

export type UserUpdate = Partial<Omit<UserInput, "password">> & {
  password?: string;
  active?: boolean;
  blocked?: boolean;
  blocked_reason?: string | null;
};

const loadFacilities = () => backend<HealthFacility[]>("/health-facilities", { query: { active: true } });
const loadMicroNetworks = () => backend<MicroNetwork[]>("/micro-networks", { query: { active: true } });

export async function loadUsers() {
  const [users, roles, facilities, networks] = await Promise.all([
    backend<User[]>("/users"),
    backend<Role[]>("/roles/assignable"),
    loadFacilities(),
    loadMicroNetworks(),
  ]);
  return combine({ users, roles: orEmpty(roles), facilities: orEmpty(facilities), networks: orEmpty(networks) });
}

export async function loadUserFormOptions() {
  const [roles, facilities, networks] = await Promise.all([
    backend<Role[]>("/roles/assignable"),
    loadFacilities(),
    loadMicroNetworks(),
  ]);
  return combine({ roles, facilities: orEmpty(facilities), networks: orEmpty(networks) });
}

export async function createUser(input: UserInput) {
  return backend<User>("/users", { method: "POST", body: input });
}

export async function updateUser(userId: string, input: UserUpdate) {
  return backend<User>(`/users/${id(userId)}`, { method: "PUT", body: input });
}

export async function deleteUser(userId: string) {
  return backend<null>(`/users/${id(userId)}`, { method: "DELETE" });
}

/** Para un usuario que perdió su celular: debe volver a configurar la verificación al entrar. */
export async function resetUserMfa(userId: string) {
  return backend<null>(`/users/${id(userId)}/mfa`, { method: "DELETE" });
}
