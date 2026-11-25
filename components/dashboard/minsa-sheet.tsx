"use client";

import { Check, FileSpreadsheet } from "lucide-react";
import { Fragment, useMemo } from "react";

import { colorName, readableText } from "@/components/common/color-mark";
import type { MinsaSection, MinsaView } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Elegir qué secciones del formato MINSA ver o exportar: `null` = todas. */
export function SectionPicker({
  sections,
  value,
  onChange,
}: {
  sections: MinsaSection[];
  value: string[] | null;
  onChange: (value: string[] | null) => void;
}) {
  const optional = sections.filter((s) => !s.fixed);
  const isOn = (id: string) => value === null || value.includes(id);

  function toggle(id: string) {
    const current = value ?? optional.map((s) => s.id);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === optional.length ? null : next);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Secciones:</span>
        <button
          className={cn("rounded-md px-2 py-1 font-medium", value === null ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          onClick={() => onChange(null)}
        >
          Todo el formato
        </button>
        <button
          className={cn("rounded-md px-2 py-1 font-medium", value?.length === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          onClick={() => onChange([])}
        >
          Solo datos
        </button>
        <button
          className={cn(
            "rounded-md px-2 py-1 font-medium",
            value?.length === 1 && value[0] === "apn" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
          onClick={() => onChange(["apn"])}
        >
          Datos + APN
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {optional.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            aria-pressed={isOn(s.id)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
              isOn(s.id) ? "border-primary/40 bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {isOn(s.id) && <Check className="size-3" />}
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function spans(values: string[]) {
  const out: { start: number; size: number; text: string }[] = [];
  values.forEach((text, i) => {
    const last = out[out.length - 1];
    if (last && last.text === text) last.size += 1;
    else out.push({ start: i, size: 1, text });
  });
  return out;
}

const SECTION_TONES = ["bg-primary/90", "bg-primary/75"];

/** Planilla con las mismas columnas y encabezados (sección / grupo / campo) que el Excel del MINSA. */
/** Leyenda de colores de la página; un clic filtra por ese color, otro clic lo quita. */
export function ColorLegend({
  legend,
  value,
  onChange,
}: {
  legend: MinsaView["legend"];
  value: string | undefined;
  onChange: (mark: string | undefined) => void;
}) {
  const options = [
    { id: "any", label: "Pintadas (1)", swatch: null as string | null },
    { id: "none", label: "Sin color (0)", swatch: null as string | null },
    ...legend.map((l) => ({ id: l.color, label: colorName(l.color), swatch: l.color })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 font-medium text-muted-foreground">Marcas:</span>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(value === o.id ? undefined : o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 capitalize transition-colors",
            value === o.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {o.swatch && <span className="size-3 rounded-[3px] ring-1 ring-foreground/20" style={{ background: `#${o.swatch}` }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MinsaSheet({
  view,
  onOpen,
  binary,
}: {
  view: MinsaView;
  onOpen: (id: string) => void;
  /** Muestra cada celda como 1 (pintada) / 0 (sin color) en lugar del valor. */
  binary?: boolean;
}) {
  const nameIndex = view.columns.findIndex((c) => c.key === "f:full_name");
  const columns = view.columns.map((c, i) => ({ ...c, i })).filter((c) => c.key !== "n" && c.key !== "f:full_name");
  const sectionSpans = useMemo(() => spans(columns.map((c) => c.section)), [columns]);
  const groupSpans = useMemo(() => spans(columns.map((c) => `${c.section}\u0000${c.group}`)), [columns]);

  if (view.rows.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
        <FileSpreadsheet className="size-4" /> No hay registros con estos filtros.
      </p>
    );
  }

  const sticky = "sticky left-0 z-10 border-r bg-card";
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border">
      <table className="border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-20">
          <tr>
            <th rowSpan={3} className={cn(sticky, "z-30 min-w-56 border-b bg-muted px-3 text-left align-bottom font-semibold")}>
              Nº · Apellidos y nombres
            </th>
            {sectionSpans.map((s, k) => (
              <th
                key={`s${s.start}`}
                colSpan={s.size}
                className={cn("border-r border-b px-2 py-1.5 text-center font-semibold text-primary-foreground", SECTION_TONES[k % 2])}
              >
                {s.text}
              </th>
            ))}
          </tr>
          <tr>
            {groupSpans.map((g) => (
              <th key={`g${g.start}`} colSpan={g.size} className="border-r border-b bg-accent px-2 py-1 text-center font-medium text-accent-foreground">
                {g.text.split("\u0000")[1]}
              </th>
            ))}
          </tr>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="min-w-28 border-r border-b bg-muted px-2 py-1.5 text-left align-bottom font-medium text-muted-foreground">
                {c.label || "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row, r) => (
            <Fragment key={view.ids[r]}>
              <tr className="group cursor-pointer" onClick={() => onOpen(view.ids[r])}>
                <td
                  className={cn(sticky, "border-b px-3 py-2 group-hover:bg-muted")}
                  style={view.fills[r]?.[0] ? { boxShadow: `inset 4px 0 0 #${view.fills[r][0]}` } : undefined}
                >
                  <span className="mr-2 text-muted-foreground tabular-nums">{row[0]}</span>
                  <strong className="font-medium">{nameIndex >= 0 ? row[nameIndex] : ""}</strong>
                  <span className="block font-mono text-[11px] text-primary">{view.codes[r]}</span>
                </td>
                {columns.map((c) => {
                  const fill = c.key.startsWith("m:") ? null : (view.fills[r]?.[c.i] ?? null);
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "max-w-64 border-r border-b px-2 py-2 align-top whitespace-pre-wrap",
                        !fill && "group-hover:bg-muted/50",
                        binary && "text-center font-semibold tabular-nums",
                      )}
                      style={fill ? { background: `#${fill}`, color: readableText(fill) } : undefined}
                      title={fill ? `Pintada de ${colorName(fill)} (1)` : undefined}
                    >
                      {binary && !c.key.startsWith("m:") ? (fill ? "1" : "0") : row[c.i]}
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
