"use server";

import { backend, combine, id } from "@/lib/api/server";
import type { Backup, BackupStatus } from "@/lib/api/types";

export async function loadBackups() {
  const [status, backups] = await Promise.all([
    backend<BackupStatus>("/backups/status"),
    backend<Backup[]>("/backups", { query: { limit: 50 } }),
  ]);
  return combine({ status, backups });
}

export async function createBackup() {
  return backend<Backup>("/backups", { method: "POST", body: { priority: "high" } });
}

export async function deleteBackup(backupId: string) {
  return backend<null>(`/backups/${id(backupId)}`, { method: "DELETE" });
}
