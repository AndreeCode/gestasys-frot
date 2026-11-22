"use server";

import { backend, combine, id, orEmpty } from "@/lib/api/server";
import type { Role, User } from "@/lib/api/types";

export type UserInput = {
  full_name: string;
  email: string;
  username?: string | null;
  role_id: string;
  password: string;
  dni?: string | null;
  phone?: string | null;
};

export type UserUpdate = Partial<Omit<UserInput, "password">> & {
  password?: string;
  active?: boolean;
  blocked?: boolean;
  blocked_reason?: string | null;
};

export async function loadUsers() {
  const [users, roles] = await Promise.all([backend<User[]>("/users"), backend<Role[]>("/roles/assignable")]);
  return combine({ users, roles: orEmpty(roles) });
}

export async function loadAssignableRoles() {
  return backend<Role[]>("/roles/assignable");
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
