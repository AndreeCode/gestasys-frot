"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ErrorState, LoadingState, Notice } from "@/components/common/feedback";
import { Field, FormActions } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { readableText } from "@/components/common/color-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { loadMinsaTemplate } from "@/lib/actions/minsa-template";
import { createMinsaPregnancy } from "@/lib/actions/pregnancies";
import type { HealthFacility, TemplateColumn } from "@/lib/api/types";

const DATE_KEYS = new Set(["f:birth_date", "f:lmp", "f:edd"]);
const SKIP = new Set(["n", "f:renaes", "f:micro_network", "f:facility"]);
const ORDINALS = ["1era", "2da", "3era", "4ta", "5ta", "6ta", "7ma", "8va", "9na", "10ma", "11vo", "12vo", "13vo"];

function SectionHeader({ title, color }: { title: string; color: string | null }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase"
      style={color ? { background: `#${color}`, color: readableText(color) } : { background: "var(--accent)", color: "var(--accent-foreground)" }}
    >
      {title}
    </div>
  );
}

export function MinsaRecordForm({
  facilities,
  onClose,
  onSaved,
}: {
  facilities: HealthFacility[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const template = useBackendQuery("minsa-template", loadMinsaTemplate);
  const { run, pending } = useBackendAction();
  const [apnCount, setApnCount] = useState(1);

  const defs = (template.data?.columns ?? []).filter((c) => c.visible);
  const fixed = defs.filter((c) => (c.kind === "fixed" || c.kind === "id") && !SKIP.has(c.key ?? ""));
  const apnParts = defs.filter((c) => c.kind === "apn");
  const clinicalSections: { name: string; color: string | null; columns: TemplateColumn[] }[] = [];
  for (const c of defs.filter((d) => d.kind === "clinical" || d.kind === "custom")) {
    const last = clinicalSections[clinicalSections.length - 1];
    if (last && last.name === c.section) last.columns.push(c);
    else clinicalSections.push({ name: c.section, color: c.fills[0], columns: [c] });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cells: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (key === "health_facility_id" || typeof value !== "string") continue;
      if (value.trim()) cells[key] = value.trim();
    }
    const facility = String(form.get("health_facility_id") ?? "") || undefined;
    const result = await run(createMinsaPregnancy(cells, facility));
    if (result) onSaved(result.data.id);
  }

  return (
    <Modal
      title="Nuevo registro · formato MINSA"
      description="Mismas columnas que la planilla de seguimiento. Obligatorio: apellidos y nombres, y la fecha de nacimiento o la edad."
      onClose={onClose}
      wide
    >
      {template.error && <ErrorState error={template.error} onRetry={template.reload} />}
      {!template.data && !template.error && <LoadingState />}
      {template.data && (
        <form onSubmit={onSubmit} className="space-y-6">
          {facilities.length > 1 && (
            <Field label="Establecimiento (EE.SS.) *">
              <NativeSelect className="w-full" name="health_facility_id" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  Elige el EE.SS.
                </NativeSelectOption>
                {facilities.map((f) => (
                  <NativeSelectOption key={f.id} value={f.id}>
                    {f.name}
                    {f.micro_network_name ? ` — ${f.micro_network_name}` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}

          <section className="space-y-3">
            <SectionHeader title="Datos de la gestante y embarazo actual" color={fixed[0]?.fills[0] ?? null} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fixed.map((c) => (
                <Field
                  key={c.key}
                  label={`${c.label}${c.key === "f:full_name" ? " *" : ""}`}
                  className={c.key === "f:full_name" || c.key === "f:address" ? "sm:col-span-2" : undefined}
                >
                  <Input
                    name={c.key ?? ""}
                    type={DATE_KEYS.has(c.key ?? "") ? "date" : c.key === "f:age" ? "number" : "text"}
                    required={c.key === "f:full_name"}
                    min={c.key === "f:age" ? 9 : undefined}
                    max={c.key === "f:age" ? 60 : undefined}
                    placeholder={
                      c.key === "f:full_name" ? "APELLIDO PATERNO MATERNO NOMBRES" : c.key === "f:formula" ? "G1 P0000" : c.key === "f:dni" ? "8 dígitos" : undefined
                    }
                    inputMode={c.key === "f:dni" || c.key === "f:phone" ? "numeric" : undefined}
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Si no sabes la fecha de nacimiento, escribe la edad: se estima. La FPP se calcula desde la FUM.</p>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Atenciones prenatales (APN)" color={apnParts[0]?.fills[0] ?? null} />
            {Array.from({ length: apnCount }, (_, i) => (
              <div key={i} className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">{ORDINALS[i]} APN</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {apnParts.map((part) => {
                    const name = `apn:${i + 1}:${(part.key ?? "").split(":")[1]}`;
                    const isDate = name.endsWith(":date") || name.endsWith(":next");
                    return (
                      <Field key={name} label={part.label}>
                        <Input name={name} type={isDate ? "date" : "text"} />
                      </Field>
                    );
                  })}
                </div>
              </div>
            ))}
            {apnCount < 13 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setApnCount((n) => n + 1)}>
                <Plus /> Agregar {ORDINALS[apnCount]} APN
              </Button>
            )}
          </section>

          <section className="space-y-2">
            <SectionHeader title="Ficha MINSA (opcional)" color={null} />
            {clinicalSections.map((s) => (
              <details key={s.name} className="group rounded-xl border">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
                  <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color ? `#${s.color}` : "var(--primary)" }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.columns.length} campos</span>
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {s.columns.map((c) => (
                    <Field key={c.key} label={c.group && c.group !== c.label ? `${c.group} · ${c.label || "Detalle"}` : c.label || "Detalle"}>
                      <Input name={c.key ?? ""} placeholder={/fecha|dd\/mm/i.test(`${c.group} ${c.label}`) ? "DD/MM/AAAA" : undefined} />
                    </Field>
                  ))}
                </div>
              </details>
            ))}
          </section>

          <Notice tone="info" className="text-xs">
            Al guardar queda en la auditoría con tu usuario, EE.SS., IP y dispositivo. Luego puedes completar o corregir celdas en Registros →
            Formato MINSA → Editar celdas.
          </Notice>
          <FormActions className="mt-0 border-t pt-5">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Registrar gestante"}
            </Button>
          </FormActions>
        </form>
      )}
    </Modal>
  );
}
