"use server";

import { backend, combine, id } from "@/lib/api/server";
import type { Permission, Role } from "@/lib/api/types";

export type RoleInput = { name: string; description: string | null; permission_ids: string[] };

export async function loadRoles() {
  const [roles, permissions] = await Promise.all([backend<Role[]>("/roles"), backend<Permission[]>("/permissions")]);
  return combine({ roles, permissions });
}

export async function createRole(input: RoleInput) {
  return backend<Role>("/roles", { method: "POST", body: input });
}

export async function updateRole(roleId: string, input: Partial<RoleInput> & { is_active?: boolean }) {
  return backend<Role>(`/roles/${id(roleId)}`, { method: "PUT", body: input });
}

export async function deleteRole(roleId: string) {
  return backend<null>(`/roles/${id(roleId)}`, { method: "DELETE" });
}
