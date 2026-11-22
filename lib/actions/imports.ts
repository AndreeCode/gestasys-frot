"use server";

import { backend } from "@/lib/api/server";
import type { DataImport } from "@/lib/api/types";

export async function importCsv(form: FormData, dryRun: boolean) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, status: 422, error: "Selecciona un archivo CSV" };
  }
  const body = new FormData();
  body.set("file", file, file.name);
  return backend<DataImport>("/pregnancies/import", { method: "POST", form: body, query: { dry_run: dryRun } });
}

export async function loadImports() {
  return backend<DataImport[]>("/imports", { query: { limit: 10 } });
}
