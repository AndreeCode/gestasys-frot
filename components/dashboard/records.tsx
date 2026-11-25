"use client";

import { ChevronRight, Download, FileSpreadsheet, List, Pencil, Plus, Save, Search, SlidersHorizontal, Table2, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotify } from "@/components/common/toast";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadMinsaView, loadRecords, updateMinsaCells } from "@/lib/actions/pregnancies";
import type { MinsaRow, MinsaView, PregnancyFilters, PregnancyStatus } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS, formatDate, formatDateTime, gestationalAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ColorLegend, MinsaSheet, SectionPicker, type Drafts } from "./minsa-sheet";
import { ColorMark } from "@/components/common/color-mark";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordStats } from "./record-stats";
import { useSession } from "./session";

const LIMIT = 25;

function MinsaPanel({
  filters,
  sections,
  onSections,
  onMark,
  onOpen,
  canExport,
  canEdit,
  onSaved,
  exportFields,
}: {
  filters: PregnancyFilters;
  sections: string[] | null;
  onSections: (value: string[] | null) => void;
  onMark: (mark: string | undefined) => void;
  onOpen: (id: string) => void;
  canExport: boolean;
  canEdit: boolean;
  onSaved: () => void;
  exportFields: Record<string, string | undefined>;
}) {
  const notify = useNotify();
  const [offset, setOffset] = useState(0);
  const [binary, setBinary] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [saved, setSaved] = useState<Record<string, MinsaRow>>({});
  const [saving, setSaving] = useState(false);
  const query = { ...filters, limit: LIMIT, offset };
  const key = JSON.stringify([query, sections]);
  const { data: loaded, error, loading, reload } = useBackendQuery(`minsa:${key}`, () => loadMinsaView(query, sections));

  /** Aplica las filas ya guardadas (el back las devuelve recalculadas) sobre la página cargada. */
  const data = useMemo<MinsaView | null>(() => {
    if (!loaded) return null;
    const keys = loaded.columns.map((c) => c.key);
    return {
      ...loaded,
      rows: loaded.rows.map((row, r) => {
        const fresh = saved[loaded.ids[r]];
        return fresh ? keys.map((k, i) => (k === "n" ? row[i] : (fresh.row[fresh.keys.indexOf(k)] ?? ""))) : row;
      }),
      fills: loaded.fills.map((fill, r) => {
        const fresh = saved[loaded.ids[r]];
        return fresh ? keys.map((k) => fresh.fills[fresh.keys.indexOf(k)] ?? null) : fill;
      }),
    };
  }, [loaded, saved]);

  const pending = Object.values(drafts).reduce((n, cells) => n + Object.keys(cells).length, 0);

  function setDraft(rowId: string, cellKey: string, value: string | null) {
    setDrafts((current) => {
      const row = { ...(current[rowId] ?? {}) };
      if (value === null) delete row[cellKey];
      else row[cellKey] = value;
      const next = { ...current, [rowId]: row };
      if (Object.keys(row).length === 0) delete next[rowId];
      return next;
    });
  }

  function guard(action: () => void) {
    if (pending && !window.confirm(`Tienes ${pending} celdas sin guardar. ¿Descartarlas?`)) return;
    setDrafts({});
    action();
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    let ok = 0;
    for (const [rowId, cells] of Object.entries(drafts)) {
      const code = data.codes[data.ids.indexOf(rowId)] ?? "";
      const result = await updateMinsaCells(rowId, cells);
      if (!result.ok) {
        if (result.status === 401) {
          window.location.replace("/session-expired");
          return;
        }
        notify(`${code}: ${result.error}`, "danger");
        continue;
      }
      ok += 1;
      setSaved((current) => ({ ...current, [rowId]: result.data }));
      setDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
    }
    setSaving(false);
    if (ok) {
      notify(`${ok} ${ok === 1 ? "registro actualizado" : "registros actualizados"}`);
      onSaved();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
        {data ? (
          <SectionPicker
            sections={data.sections}
            value={sections}
            onChange={(value) =>
              guard(() => {
                onSections(value);
                setOffset(0);
              })
            }
          />
        ) : (
          <span className="text-xs text-muted-foreground">Cargando secciones...</span>
        )}
        {canExport && (
          <form method="post" action="/files/export-minsa">
            {Object.entries(exportFields).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
            {(sections ?? []).map((id) => (
              <input key={id} type="hidden" name="sections" value={id} />
            ))}
            {sections !== null && sections.length === 0 && <input type="hidden" name="sections" value="datos" />}
            <Button type="submit" size="sm">
              <FileSpreadsheet /> Exportar esta vista (.xlsx)
            </Button>
          </form>
        )}
      </div>
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ColorLegend
            legend={data.legend}
            value={filters.mark}
            onChange={(mark) =>
              guard(() => {
                onMark(mark);
                setOffset(0);
              })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && !editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBinary(false);
                  setEditing(true);
                }}
              >
                <Pencil /> Editar celdas
              </Button>
            )}
            {editing && (
              <>
                <Button size="sm" disabled={!pending || saving} onClick={save}>
                  <Save /> {saving ? "Guardando..." : `Guardar${pending ? ` (${pending})` : ""}`}
                </Button>
                <Button size="sm" variant="ghost" disabled={saving} onClick={() => guard(() => setEditing(false))}>
                  <Undo2 /> {pending ? "Descartar" : "Terminar"}
                </Button>
              </>
            )}
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs" role="radiogroup" aria-label="Mostrar celdas">
            {[
              [false, "Valores"],
              [true, "Marcas 0/1"],
            ].map(([value, label]) => (
              <button
                key={String(label)}
                role="radio"
                aria-checked={binary === value}
                disabled={editing}
                onClick={() => setBinary(value as boolean)}
                className={cn(
                  "h-7 rounded-md px-2.5 font-medium",
                  binary === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label as string}
              </button>
            ))}
          </div>
          </div>
        </div>
      )}
      {editing && (
        <p className="rounded-lg border border-primary/25 bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
          Clic en una celda para escribir · <b>Enter</b> baja · <b>Tab</b> avanza · <b>Esc</b> cancela. Fechas como
          DD/MM/AAAA. Borrar la fecha de una APN elimina ese control. Las columnas atenuadas (EE.SS., microred, RENAES, edad) se
          cambian desde la ficha.
        </p>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <MinsaSheet
          view={data}
          onOpen={onOpen}
          binary={binary && !editing}
          editing={editing}
          drafts={drafts}
          onDraft={setDraft}
        />
      ) : null}
      {data && (
        <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={(next) => guard(() => setOffset(next))} />
      )}
    </div>
  );
}

export function Records() {
  const { can, profile } = useSession();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PregnancyFilters>({ limit: LIMIT, offset: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"list" | "minsa">("list");
  const [sections, setSections] = useState<string[] | null>(null);
  const [moreFilters, setMoreFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === (search.trim() || undefined) ? f : { ...f, q: search.trim() || undefined, offset: 0 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, reload } = useBackendQuery(JSON.stringify(filters), () => loadRecords(filters));
  const update = (patch: PregnancyFilters) => setFilters((f) => ({ ...f, ...patch, offset: 0 }));
  const scope = profile.health_facility_id;
  const facilities = (data?.facilities ?? []).filter(
    (f) => (!scope || f.id === scope) && (!filters.micro_network_id || f.micro_network_id === filters.micro_network_id),
  );
  const networks = data?.networks ?? [];
  const page = data?.page;

  const { limit: _limit, offset: _offset, ...active } = filters;
  void _limit;
  void _offset;
  const exportFields = Object.fromEntries(
    Object.entries(active).map(([k, v]) => [k, v === undefined || v === "" ? undefined : String(v)]),
  ) as Record<string, string | undefined>;
  const activeCount = Object.values(exportFields).filter(Boolean).length;
  const extraCount = ["micro_network_id", "age_group", "insurance", "controls", "missed", "due_from", "due_to", "created_from", "created_to"].filter(
    (k) => exportFields[k],
  ).length;

  function clearFilters() {
    setSearch("");
    setFilters({ limit: LIMIT, offset: 0 });
  }

  return (
    <>
      <PageHeading
        eyebrow="Gestión de información"
        title="Registros de gestantes"
        subtitle={
          can("pregnancy.put")
            ? "Consulta y administra los registros de seguimiento materno."
            : "Consulta información autorizada del seguimiento materno."
        }
        action={
          can("pregnancy.post") && (
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus /> Nuevo registro
            </Button>
          )
        }
      />
      <RecordStats stats={data?.stats ?? null} />
      <Panel>
        <PanelHeading
          title="Todos los registros"
          description={page ? `${page.total} registros · actualizado ${formatDateTime(new Date().toISOString())}` : "Cargando..."}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border bg-card p-0.5" role="radiogroup" aria-label="Vista">
                {(
                  [
                    ["list", "Lista", List],
                    ["minsa", "Formato MINSA", Table2],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                      mode === value ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
              {can("pregnancy.export") && (
                <>
                  <form method="post" action="/files/export">
                    {Object.entries(exportFields).map(([name, value]) =>
                      value ? <input key={name} type="hidden" name={name} value={value} /> : null,
                    )}
                    <Button variant="outline" type="submit" title="CSV simple (una fila por gestante)">
                      <Download /> CSV
                    </Button>
                  </form>
                  {mode === "list" && (
                    <form method="post" action="/files/export-minsa">
                      {Object.entries(exportFields).map(([name, value]) =>
                        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
                      )}
                      <Button variant="outline" type="submit" title="Excel con el formato completo de seguimiento del MINSA">
                        <FileSpreadsheet /> Excel MINSA
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          }
        />
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar registros"
              placeholder="Buscar por nombre, DNI, código, historia clínica o celular..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <NativeSelect
            className="w-full md:w-48"
            aria-label="Filtrar por sede"
            value={filters.health_facility_id ?? ""}
            onChange={(e) => update({ health_facility_id: e.target.value || undefined })}
          >
            <NativeSelectOption value="">Todas las sedes</NativeSelectOption>
            {facilities.map((f) => (
              <NativeSelectOption key={f.id} value={f.id}>
                {f.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full md:w-44"
            aria-label="Filtrar por estado"
            value={filters.status ?? ""}
            onChange={(e) => update({ status: (e.target.value || undefined) as PregnancyStatus | undefined })}
          >
            <NativeSelectOption value="">Todos los estados</NativeSelectOption>
            {(Object.keys(STATUS_LABELS) as PregnancyStatus[]).map((s) => (
              <NativeSelectOption key={s} value={s}>
                {STATUS_LABELS[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full md:w-40"
            aria-label="Filtrar por riesgo"
            value={filters.risk_level ?? ""}
            onChange={(e) => update({ risk_level: (e.target.value || undefined) as PregnancyFilters["risk_level"] })}
          >
            <NativeSelectOption value="">Todo riesgo</NativeSelectOption>
            {(Object.keys(RISK_LABELS) as (keyof typeof RISK_LABELS)[]).map((r) => (
              <NativeSelectOption key={r} value={r}>
                Riesgo {RISK_LABELS[r].toLowerCase()}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full md:w-40"
            aria-label="Filtrar por marca de color"
            value={filters.mark === "any" || filters.mark === "none" || !filters.mark ? (filters.mark ?? "") : "color"}
            onChange={(e) => update({ mark: e.target.value || undefined })}
          >
            <NativeSelectOption value="">Toda marca</NativeSelectOption>
            <NativeSelectOption value="any">Pintadas (1)</NativeSelectOption>
            <NativeSelectOption value="none">Sin color (0)</NativeSelectOption>
            {filters.mark && filters.mark !== "any" && filters.mark !== "none" && (
              <NativeSelectOption value="color" disabled>
                Un color
              </NativeSelectOption>
            )}
          </NativeSelect>
          <Button variant={moreFilters || extraCount ? "secondary" : "outline"} onClick={() => setMoreFilters((v) => !v)}>
            <SlidersHorizontal /> Más filtros{extraCount ? ` (${extraCount})` : ""}
          </Button>
        </div>
        {moreFilters && (
          <div className="mb-4 grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {networks.length > 1 && (
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Microred
                <NativeSelect
                  className="w-full"
                  value={filters.micro_network_id ?? ""}
                  onChange={(e) => update({ micro_network_id: e.target.value || undefined, health_facility_id: undefined })}
                >
                  <NativeSelectOption value="">Todas</NativeSelectOption>
                  {networks.map((n) => (
                    <NativeSelectOption key={n.id} value={n.id}>
                      {n.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Edad
              <NativeSelect
                className="w-full"
                value={filters.age_group ?? ""}
                onChange={(e) => update({ age_group: (e.target.value || undefined) as PregnancyFilters["age_group"] })}
              >
                <NativeSelectOption value="">Todas</NativeSelectOption>
                <NativeSelectOption value="teen">Adolescente (&lt; 18)</NativeSelectOption>
                <NativeSelectOption value="adult">18 a 35 años</NativeSelectOption>
                <NativeSelectOption value="older">Mayor de 35</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Atenciones prenatales
              <NativeSelect
                className="w-full"
                value={filters.controls ?? ""}
                onChange={(e) => update({ controls: (e.target.value || undefined) as PregnancyFilters["controls"] })}
              >
                <NativeSelectOption value="">Cualquier cantidad</NativeSelectOption>
                <NativeSelectOption value="none">Sin APN</NativeSelectOption>
                <NativeSelectOption value="lt6">1 a 5 APN</NativeSelectOption>
                <NativeSelectOption value="gte6">6 o más APN</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Seguro
              <NativeSelect className="w-full" value={filters.insurance ?? ""} onChange={(e) => update({ insurance: e.target.value || undefined })}>
                <NativeSelectOption value="">Todos</NativeSelectOption>
                <NativeSelectOption value="SIS">SIS</NativeSelectOption>
                <NativeSelectOption value="ESSALUD">EsSalud</NativeSelectOption>
                <NativeSelectOption value="Otro">Otro</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              FPP desde
              <Input type="date" value={filters.due_from ?? ""} onChange={(e) => update({ due_from: e.target.value || undefined })} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              FPP hasta
              <Input type="date" value={filters.due_to ?? ""} onChange={(e) => update({ due_to: e.target.value || undefined })} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Registrada desde
              <Input type="date" value={filters.created_from ?? ""} onChange={(e) => update({ created_from: e.target.value || undefined })} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Registrada hasta
              <Input type="date" value={filters.created_to ?? ""} onChange={(e) => update({ created_to: e.target.value || undefined })} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={Boolean(filters.missed)}
                onChange={(e) => update({ missed: e.target.checked || undefined })}
              />
              Solo inasistentes (cita vencida sin control posterior)
            </label>
          </div>
        )}
        {activeCount > 0 && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            {activeCount} {activeCount === 1 ? "filtro activo" : "filtros activos"}
            <button className="inline-flex items-center gap-1 font-medium text-primary hover:underline" onClick={clearFilters}>
              <X className="size-3" /> Limpiar todo
            </button>
          </div>
        )}
        {mode === "minsa" ? (
          <MinsaPanel
            filters={active}
            sections={sections}
            onSections={setSections}
            onMark={(mark) => update({ mark })}
            onOpen={setSelected}
            canExport={can("pregnancy.export")}
            canEdit={can("pregnancy.put")}
            onSaved={reload}
            exportFields={exportFields}
          />
        ) : null}
        {mode === "list" && error && <ErrorState error={error} onRetry={reload} />}
        {mode === "minsa" ? null : loading && !page ? (
          <LoadingState />
        ) : page && page.items.length === 0 ? (
          <EmptyState text="No hay registros que coincidan con los filtros." />
        ) : page ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Código</TableHead>
                    <TableHead>Gestante</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Edad gest.</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead>Último registro</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead title="Color de la fila en el Excel MINSA: 1 = pintada, 0 = sin color">Marca</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.items.map((record) => (
                    <TableRow
                      key={record.id}
                      className="group cursor-pointer"
                      tabIndex={0}
                      onClick={() => setSelected(record.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(record.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary">{record.code}</TableCell>
                      <TableCell>
                        <strong className="block font-medium">{record.full_name}</strong>
                        <small className="text-xs text-muted-foreground">
                          {record.age} años{record.dni ? ` · DNI ${record.dni}` : ""}
                        </small>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.health_facility_name}</TableCell>
                      <TableCell className="tabular-nums">{gestationalAge(record.gestational_age)}</TableCell>
                      <TableCell>
                        <RiskBadge level={record.risk_level} />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(record.last_control_date ?? record.created_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell>
                        <ColorMark color={record.row_color} />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              total={page.total}
              limit={page.limit}
              offset={page.offset}
              onChange={(offset) => setFilters((f) => ({ ...f, offset }))}
            />
          </>
        ) : null}
      </Panel>
      {creating && (
        <RecordForm
          facilities={facilities}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            reload();
            setSelected(saved.id);
          }}
        />
      )}
      {selected && (
        <RecordDetail pregnancyId={selected} facilities={facilities} onClose={() => setSelected(null)} onChanged={reload} />
      )}
    </>
  );
}
