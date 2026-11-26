"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, FileSpreadsheet, Plus, RotateCcw, Save, Trash, X } from "lucide-react";
import { useMemo, useState } from "react";

import { readableText } from "@/components/common/color-mark";
import { ErrorState, LoadingState, Notice } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Pill } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { loadMinsaTemplate, resetMinsaTemplate, saveMinsaTemplate } from "@/lib/actions/minsa-template";
import type { TemplateColumn } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Row = TemplateColumn & { uid: string };

let counter = 0;
const uid = () => `n${++counter}`;

function ColorField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <input
        type="color"
        aria-label={label}
        value={`#${value ?? "FFFFFF"}`}
        onChange={(e) => onChange(e.target.value.slice(1).toUpperCase())}
        className="size-7 cursor-pointer rounded-md border bg-card p-0.5"
      />
      {value && (
        <button type="button" aria-label={`Quitar ${label}`} onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function groupTitle(row: Row) {
  if (row.kind === "id" || row.kind === "fixed") return "Datos de la gestante y embarazo";
  if (row.kind === "apn") return "Atenciones prenatales (estas 6 columnas se repiten en las 13 APN)";
  return row.section;
}

function Preview({ rows }: { rows: Row[] }) {
  const visible = rows.filter((r) => r.visible);
  const spans: { text: string; color: string | null; size: number }[] = [];
  for (const r of visible) {
    const size = r.kind === "apn" ? 13 : 1;
    const last = spans[spans.length - 1];
    if (last && last.text === r.section) last.size += size;
    else spans.push({ text: r.section, color: r.fills[0], size });
  }
  const total = spans.reduce((n, s) => n + s.size, 0) || 1;
  return (
    <div className="flex h-9 overflow-hidden rounded-lg border text-[10px] font-semibold">
      {spans.map((s, i) => (
        <div
          key={`${s.text}-${i}`}
          className="flex min-w-0 items-center justify-center truncate border-r px-1 last:border-r-0"
          style={{ flexGrow: s.size, flexBasis: `${(s.size / total) * 100}%`, ...(s.color ? { background: `#${s.color}`, color: readableText(s.color) } : {}) }}
          title={`${s.text} (${s.size} columnas)`}
        >
          {s.text}
        </div>
      ))}
    </div>
  );
}

export function MinsaFormat() {
  const query = useBackendQuery("minsa-template", loadMinsaTemplate);
  const { run, pending } = useBackendAction();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newSection, setNewSection] = useState("");

  const current = useMemo<Row[]>(
    () => rows ?? (query.data?.columns ?? []).map((c) => ({ ...c, fills: [...c.fills, null, null, null].slice(0, 3), uid: c.key ?? uid() })),
    [rows, query.data],
  );

  function edit(next: Row[]) {
    setRows(next);
    setDirty(true);
  }

  function patch(id: string, change: Partial<Row>) {
    edit(current.map((r) => (r.uid === id ? { ...r, ...change } : r)));
  }

  function move(id: string, delta: number) {
    const i = current.findIndex((r) => r.uid === id);
    const j = i + delta;
    if (j < 0 || j >= current.length || groupTitle(current[i]) !== groupTitle(current[j])) return;
    const next = [...current];
    [next[i], next[j]] = [next[j], next[i]];
    edit(next);
  }

  function renameSection(oldName: string, name: string) {
    edit(current.map((r) => (r.section === oldName && (r.kind === "clinical" || r.kind === "custom") ? { ...r, section: name } : r)));
  }

  function sectionColor(name: string, color: string | null) {
    edit(current.map((r) => (groupTitle(r) === name ? { ...r, fills: [color, r.fills[1], r.fills[2]] } : r)));
  }

  function addColumn(section: string, after?: string) {
    const template = current.find((r) => r.section === section);
    const row: Row = {
      uid: uid(),
      key: null,
      kind: "custom",
      section,
      group: "",
      label: "Nueva columna",
      width: 14,
      visible: true,
      fills: template ? [...template.fills] : [null, null, null],
      aliases: [],
      builtin: false,
    };
    const index = after ? current.findIndex((r) => r.uid === after) : current.map(groupTitle).lastIndexOf(section);
    const next = [...current];
    next.splice(index + 1, 0, row);
    edit(next);
  }

  async function save() {
    const result = await run(saveMinsaTemplate(current));
    if (result) {
      setRows(result.data.columns.map((c) => ({ ...c, uid: c.key ?? uid() })));
      setDirty(false);
    }
  }

  async function reset() {
    if (!window.confirm("¿Volver al formato original del Excel MINSA? Las columnas nuevas se quitan del formato (sus datos se conservan en la ficha).")) return;
    const result = await run(resetMinsaTemplate());
    if (result) {
      setRows(null);
      setDirty(false);
      query.reload();
    }
  }

  const groups = useMemo(() => {
    const out: { title: string; rows: Row[]; editableName: boolean }[] = [];
    for (const r of current) {
      const title = groupTitle(r);
      const last = out[out.length - 1];
      if (last && last.title === title) last.rows.push(r);
      else out.push({ title, rows: [r], editableName: r.kind === "clinical" || r.kind === "custom" });
    }
    return out;
  }, [current]);

  return (
    <>
      <PageHeading
        eyebrow="Configuración"
        title="Formato MINSA"
        subtitle="Columnas, nombres y colores de la planilla de seguimiento. Se aplica a la vista, la edición, la exportación y la importación."
        action={
          <>
            <Button variant="outline" disabled={pending} onClick={reset}>
              <RotateCcw /> Formato original
            </Button>
            <Button disabled={!dirty || pending} onClick={save}>
              <Save /> {pending ? "Guardando..." : "Guardar formato"}
            </Button>
          </>
        }
      />
      {query.error && <ErrorState error={query.error} onRetry={query.reload} />}
      {!query.data && !query.error && <LoadingState />}
      {query.data && (
        <div className="grid gap-6">
          <Panel>
            <PanelHeading
              title="Vista previa del encabezado"
              description={query.data.customized || dirty ? "Formato personalizado" : "Formato original del Excel MINSA"}
              icon={<FileSpreadsheet className="size-[18px]" />}
            />
            <Preview rows={current} />
            <Notice tone="info" className="mt-4 text-xs leading-relaxed">
              <b>Renombrar</b> una columna no pierde datos: el sistema la sigue ubicando por su nombre original. Si el MINSA cambia el
              texto de una cabecera, agrégalo en <b>alias</b> para que el importador lo reconozca. Las columnas del formato original no se
              borran, se <b>ocultan</b>; las columnas nuevas guardan su dato en la ficha de cada gestante y se pueden editar en la vista
              MINSA.
            </Notice>
            {dirty && (
              <Notice tone="warning" className="mt-3 text-xs">
                Tienes cambios sin guardar.
              </Notice>
            )}
          </Panel>

          {groups.map((g) => {
            const color = g.rows[0]?.fills[0] ?? null;
            const sectionName = g.rows[0]?.section ?? "";
            return (
              <Panel key={g.rows[0]?.uid ?? g.title}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="h-8 w-2 shrink-0 rounded-full" style={{ background: color ? `#${color}` : "var(--primary)" }} />
                  {g.editableName ? (
                    <Input
                      className="h-9 max-w-xl flex-1 font-semibold"
                      value={sectionName}
                      aria-label="Nombre de la sección"
                      onChange={(e) => renameSection(sectionName, e.target.value)}
                    />
                  ) : (
                    <h2 className="flex-1 text-base font-semibold">{g.title}</h2>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Color de sección <ColorField value={color} label="Color de la sección" onChange={(c) => sectionColor(g.title, c)} />
                  </span>
                  {g.editableName && (
                    <Button variant="outline" size="sm" onClick={() => addColumn(sectionName)}>
                      <Plus /> Columna
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="w-16 px-2 py-2 text-left font-medium">Orden</th>
                        <th className="px-2 py-2 text-left font-medium">Nombre de la columna</th>
                        <th className="px-2 py-2 text-left font-medium">Grupo (fila 2)</th>
                        <th className="px-2 py-2 text-left font-medium">Alias (separados por ;)</th>
                        <th className="w-28 px-2 py-2 text-left font-medium">Colores</th>
                        <th className="w-16 px-2 py-2 text-left font-medium">Ancho</th>
                        <th className="w-20 px-2 py-2 text-left font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.uid} className={cn("border-t align-top", !r.visible && "opacity-50")}>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon-sm" aria-label="Subir" onClick={() => move(r.uid, -1)}>
                                <ArrowUp />
                              </Button>
                              <Button variant="ghost" size="icon-sm" aria-label="Bajar" onClick={() => move(r.uid, 1)}>
                                <ArrowDown />
                              </Button>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input className="h-8" value={r.label} maxLength={200} onChange={(e) => patch(r.uid, { label: e.target.value })} />
                            <span className="mt-0.5 flex gap-1">
                              {!r.builtin && <Pill tone="primary" className="h-4 px-1.5 text-[10px]">Nueva</Pill>}
                              {r.key && <span className="font-mono text-[10px] text-muted-foreground">{r.key}</span>}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-8"
                              value={r.group}
                              maxLength={150}
                              placeholder={r.kind === "apn" ? "1era APN, 2da APN..." : ""}
                              disabled={r.kind === "apn"}
                              onChange={(e) => patch(r.uid, { group: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-8"
                              value={r.aliases.join("; ")}
                              placeholder="Otro texto de cabecera"
                              disabled={r.kind === "id" || r.kind === "fixed" || r.kind === "apn"}
                              onChange={(e) => patch(r.uid, { aliases: e.target.value.split(";").map((a) => a.trimStart()).slice(0, 10) })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <ColorField value={r.fills[1]} label="Color del grupo" onChange={(c) => patch(r.uid, { fills: [r.fills[0], c, r.fills[2]] })} />
                              <ColorField value={r.fills[2]} label="Color de la columna" onChange={(c) => patch(r.uid, { fills: [r.fills[0], r.fills[1], c] })} />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-8 w-16"
                              type="number"
                              min={4}
                              max={60}
                              value={r.width}
                              onChange={(e) => patch(r.uid, { width: Math.max(4, Math.min(60, Number(e.target.value) || 14)) })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex justify-end gap-0.5">
                              {r.kind !== "id" && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={r.visible ? "Ocultar" : "Mostrar"}
                                  title={r.visible ? "Ocultar" : "Mostrar"}
                                  onClick={() => patch(r.uid, { visible: !r.visible })}
                                >
                                  {r.visible ? <Eye /> : <EyeOff />}
                                </Button>
                              )}
                              {(r.kind === "clinical" || r.kind === "custom") && (
                                <Button variant="ghost" size="icon-sm" aria-label="Agregar columna debajo" title="Agregar columna debajo" onClick={() => addColumn(r.section, r.uid)}>
                                  <Plus />
                                </Button>
                              )}
                              {!r.builtin && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Quitar columna"
                                  title="Quitar columna"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => edit(current.filter((x) => x.uid !== r.uid))}
                                >
                                  <Trash />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}

          <Panel>
            <PanelHeading title="Nueva sección" description="Por ejemplo, si el MINSA agrega un bloque nuevo a la planilla." icon={<Plus className="size-[18px]" />} />
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newSection.trim();
                if (!name) return;
                edit([
                  ...current,
                  {
                    uid: uid(),
                    key: null,
                    kind: "custom",
                    section: name.toUpperCase(),
                    group: "",
                    label: "Nueva columna",
                    width: 14,
                    visible: true,
                    fills: ["9DC3E6", "9DC3E6", "DEEBF7"],
                    aliases: [],
                    builtin: false,
                  },
                ]);
                setNewSection("");
              }}
            >
              <Input className="max-w-md" placeholder="Nombre de la sección" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
              <Button type="submit" variant="outline">
                <Plus /> Agregar sección
              </Button>
            </form>
          </Panel>
        </div>
      )}
    </>
  );
}
