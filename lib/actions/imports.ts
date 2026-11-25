"use server";

import { backend, paged } from "@/lib/api/server";
import type { DataImport } from "@/lib/api/types";

export async function importCsv(form: FormData, dryRun: boolean) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, status: 422, error: "Selecciona un archivo CSV o Excel (.xlsx)" };
  }
  const body = new FormData();
  body.set("file", file, file.name);
  return backend<DataImport>("/pregnancies/import", { method: "POST", form: body, query: { dry_run: dryRun } });
}

export async function loadImports(limit: number, offset: number) {
  return paged<DataImport>("/imports", { limit, offset });
}
