"use server";

import { backend } from "@/lib/api/server";
import type { DashboardData } from "@/lib/api/types";

export async function loadDashboard() {
  return backend<DashboardData>("/dashboard");
}
