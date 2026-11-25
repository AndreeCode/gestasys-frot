"use server";

import { backend, combine, id, paged } from "@/lib/api/server";
import type { Backup, BackupStatus } from "@/lib/api/types";

export async function loadBackups(limit: number, offset: number) {
  const [status, backups] = await Promise.all([
    backend<BackupStatus>("/backups/status"),
    paged<Backup>("/backups", { limit, offset }),
  ]);
  return combine({ status, backups });
}

export async function createBackup() {
  return backend<Backup>("/backups", { method: "POST", body: { priority: "high" } });
}

export async function deleteBackup(backupId: string) {
  return backend<null>(`/backups/${id(backupId)}`, { method: "DELETE" });
}
