"use server";

import { backend } from "@/lib/api/server";
import type { TemplateColumn } from "@/lib/api/types";

type TemplateData = { columns: TemplateColumn[]; customized: boolean };

export async function loadMinsaTemplate() {
  return backend<TemplateData>("/minsa-template");
}

export async function saveMinsaTemplate(columns: TemplateColumn[]) {
  return backend<TemplateData>("/minsa-template", {
    method: "PUT",
    body: {
      columns: columns.map((c) => ({
        key: c.key ?? undefined,
        kind: c.key ? c.kind : undefined,
        section: c.section,
        group: c.group,
        label: c.label,
        width: c.width,
        visible: c.visible,
        fills: c.fills.map((f) => f || null),
        aliases: c.aliases.filter(Boolean),
      })),
    },
  });
}

export async function resetMinsaTemplate() {
  return backend<TemplateData>("/minsa-template/reset", { method: "POST" });
}
