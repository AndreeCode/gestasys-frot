"use client";

import { ChevronRight, Download, FileSpreadsheet, List, Plus, Search, Table2 } from "lucide-react";
import { useEffect, useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadMinsaView, loadRecords } from "@/lib/actions/pregnancies";
import type { PregnancyFilters, PregnancyStatus } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS, formatDate, formatDateTime, gestationalAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ColorLegend, MinsaSheet, SectionPicker } from "./minsa-sheet";
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
  exportFields,
}: {
  filters: PregnancyFilters;
  sections: string[] | null;
  onSections: (value: string[] | null) => void;
  onMark: (mark: string | undefined) => void;
  onOpen: (id: string) => void;
  canExport: boolean;
  exportFields: Record<string, string | undefined>;
}) {
  const [offset, setOffset] = useState(0);
  const [binary, setBinary] = useState(false);
  const query = { ...filters, limit: LIMIT, offset };
  const key = JSON.stringify([query, sections]);
  const { data, error, loading, reload } = useBackendQuery(`minsa:${key}`, () => loadMinsaView(query, sections));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
        {data ? (
          <SectionPicker
            sections={data.sections}
            value={sections}
            onChange={(value) => {
              onSections(value);
              setOffset(0);
            }}
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
            onChange={(mark) => {
              onMark(mark);
              setOffset(0);
            }}
          />
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs" role="radiogroup" aria-label="Mostrar celdas">
            {[
              [false, "Valores"],
              [true, "Marcas 0/1"],
            ].map(([value, label]) => (
              <button
                key={String(label)}
                role="radio"
                aria-checked={binary === value}
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
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data ? <LoadingState /> : data ? <MinsaSheet view={data} onOpen={onOpen} binary={binary} /> : null}
      {data && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={setOffset} />}
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === (search.trim() || undefined) ? f : { ...f, q: search.trim() || undefined, offset: 0 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, loading, reload } = useBackendQuery(JSON.stringify(filters), () => loadRecords(filters));
  const update = (patch: PregnancyFilters) => setFilters((f) => ({ ...f, ...patch, offset: 0 }));
  const scope = profile.health_facility_id;
  const facilities = (data?.facilities ?? []).filter((f) => !scope || f.id === scope);
  const page = data?.page;

  const exportFields = {
    q: filters.q,
    health_facility_id: filters.health_facility_id,
    status: filters.status,
    risk_level: filters.risk_level,
    mark: filters.mark,
  };

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
              placeholder="Buscar por nombre, DNI o código..."
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
        </div>
        {mode === "minsa" ? (
          <MinsaPanel
            filters={{
              q: filters.q,
              health_facility_id: filters.health_facility_id,
              status: filters.status,
              risk_level: filters.risk_level,
              mark: filters.mark,
            }}
            sections={sections}
            onSections={setSections}
            onMark={(mark) => update({ mark })}
            onOpen={setSelected}
            canExport={can("pregnancy.export")}
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
