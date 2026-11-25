"use client";

import { AlertTriangle, Building2, Download, FileCheck, FileSpreadsheet, FileUp, Globe, Info, Monitor, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Pill } from "@/components/common/badges";
import { EmptyState, Notice, Pagination } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { importCsv, loadImports } from "@/lib/actions/imports";
import type { ApiResult, DataImport, Page } from "@/lib/api/types";
import { describeUserAgent, formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

const MAX_BYTES = 10 * 1024 * 1024;
const HISTORY_LIMIT = 10;

function Count({ label, value, tone }: { label: string; value: number; tone?: "bad" | "warn" }) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3",
        tone === "bad" && value > 0 ? "bg-destructive/8 text-destructive" : tone === "warn" && value > 0 ? "bg-warning/12" : "bg-muted/60",
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="block text-2xl font-semibold tabular-nums">{value}</strong>
    </div>
  );
}

function ImportResult({ result }: { result: DataImport }) {
  const minsa = result.format === "minsa_xlsx";
  const problems = result.errors.filter((e) => e.level !== "warning");
  const warnings = result.errors.filter((e) => e.level === "warning");
  return (
    <Panel className="mt-6">
      <PanelHeading
        title={result.dry_run ? "Resultado de la validación" : "Resultado de la importación"}
        description={`${result.file_name} · ${result.total_rows} ${minsa ? "gestantes" : "filas"}${result.dry_run ? " · no se guardó nada" : ""}`}
        icon={<FileCheck className="size-[18px]" />}
      />
      <div className={cn("grid grid-cols-2 gap-3", minsa ? "md:grid-cols-6" : "md:grid-cols-4")}>
        <Count label={minsa ? "Gestantes" : "Filas"} value={result.total_rows} />
        <Count label={result.dry_run ? "Se crearían" : "Nuevas"} value={result.inserted} />
        <Count label={result.dry_run ? "Se actualizarían" : "Actualizadas"} value={result.updated} />
        {minsa && <Count label="Controles (APN)" value={result.controls} />}
        {minsa && <Count label="Avisos" value={result.warnings} tone="warn" />}
        <Count label="Con errores" value={result.failed} tone="bad" />
      </div>
      {result.created_facilities?.length > 0 && (
        <Notice tone="info" className="mt-4 flex items-start gap-2">
          <Building2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {result.dry_run ? "Se crearían" : "Se crearon"} los establecimientos: <b>{result.created_facilities.join(", ")}</b> (con su microred).
          </span>
        </Notice>
      )}
      {(problems.length > 0 || warnings.length > 0) && (
        <div className="mt-4 max-h-80 divide-y overflow-y-auto rounded-lg border">
          {[...problems, ...warnings].map((e, i) => (
            <div key={`${e.sheet}-${e.line}-${i}`} className="flex gap-3 px-4 py-2.5 text-sm">
              {e.level === "warning" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <span className="w-28 shrink-0 font-medium">
                {e.sheet ? `${e.sheet} · ` : ""}fila {e.line}
              </span>
              <span className="text-muted-foreground">
                {e.code ? <span className="mr-1 font-mono text-xs text-foreground">{e.code}</span> : null}
                {e.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const noHistory = async (): Promise<ApiResult<Page<DataImport>>> => ({
  ok: true,
  data: { items: [], total: 0, limit: HISTORY_LIMIT, offset: 0 },
  msg: "",
});

export function ImportExport() {
  const { can } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DataImport | null>(null);
  const [offset, setOffset] = useState(0);
  const { run, pending } = useBackendAction();
  const history = useBackendQuery(`imports:${offset}`, () =>
    can("data_import.get") ? loadImports(HISTORY_LIMIT, offset) : noHistory(),
  );

  function pick(selected: File | null) {
    setResult(null);
    if (selected && selected.size > MAX_BYTES) {
      setFile(null);
      window.alert("El archivo supera el máximo de 10 MB");
      return;
    }
    setFile(selected);
  }

  async function send(dryRun: boolean) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    const outcome = await run(importCsv(form, dryRun));
    if (!outcome) return;
    setResult(outcome.data);
    if (!dryRun) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      if (offset === 0) history.reload();
      else setOffset(0);
    }
  }

  const isExcel = file?.name.toLowerCase().endsWith(".xlsx");

  return (
    <>
      <PageHeading
        eyebrow="Gestión de información"
        title="Importar y exportar datos"
        subtitle="Carga el Excel de seguimiento de gestantes del MINSA o un CSV, y descarga copias autorizadas."
      />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel as="article" className="flex flex-col">
          <PanelHeading title="Importar registros" icon={<Upload className="size-[18px]" />} />
          <div className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-accent/40 p-3">
              <strong className="flex items-center gap-1.5 font-medium">
                <FileSpreadsheet className="size-4 text-primary" /> Excel MINSA (.xlsx)
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Formato de seguimiento de gestantes: datos, hasta 13 APN, laboratorio, vacunas, plan de parto, parto y puerperio. Se
                reconoce por la fila con <b>APELLIDOS Y NOMBRES</b> y <b>DNI</b>.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <strong className="flex items-center gap-1.5 font-medium">
                <Info className="size-4 text-muted-foreground" /> CSV
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Columnas mínimas: nombres, apellidos, fecha_nacimiento y establecimiento. Con <b>codigo</b> actualiza un registro.
              </p>
            </div>
          </div>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50",
              file ? "border-primary/50 bg-accent/50" : "hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
              {file ? <FileSpreadsheet className="size-6" /> : <FileUp className="size-6" />}
            </span>
            <strong className="text-sm font-medium">{file ? file.name : "Seleccionar Excel o CSV"}</strong>
            <span className="text-xs text-muted-foreground">
              {file ? `${formatBytes(file.size)} · ${isExcel ? "formato MINSA" : "CSV"}` : ".xlsx o .csv · máximo 10 MB"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" disabled={!file || pending} onClick={() => send(true)}>
              <FileCheck /> Validar sin guardar
            </Button>
            <Button disabled={!file || pending} onClick={() => send(false)}>
              <Upload /> {pending ? "Procesando..." : "Importar archivo"}
            </Button>
            <a className={cn(buttonVariants({ variant: "link" }), "ml-auto px-0")} href="/files/import-template" download>
              Plantilla CSV
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Cada importación queda en la auditoría con tu usuario, establecimiento, IP y dispositivo. Primero valida: no se guarda nada.
          </p>
        </Panel>
        <Panel as="article">
          <PanelHeading title="Exportar registros" icon={<Download className="size-[18px]" />} />
          <p className="mb-5 text-sm text-muted-foreground">
            Registros activos de tu ámbito. El Excel MINSA tiene las mismas columnas del formato y se puede volver a importar.
          </p>
          {can("pregnancy.export") ? (
            <div className="grid gap-3">
              <form method="post" action="/files/export-minsa">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-accent/40 p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <FileSpreadsheet className="size-5 text-primary" />
                  <span>
                    <strong className="block text-sm font-medium">Excel formato MINSA (.xlsx)</strong>
                    <span className="text-xs text-muted-foreground">
                      Completo: datos, 13 APN, laboratorio, vacunas, parto... Para elegir secciones usa Registros → Formato MINSA
                    </span>
                  </span>
                </button>
              </form>
              <a className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50" href="/files/export" download>
                <Download className="size-5 text-primary" />
                <span>
                  <strong className="block text-sm font-medium">CSV estándar</strong>
                  <span className="text-xs text-muted-foreground">Separado por comas</span>
                </span>
              </a>
              <a
                className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
                href="/files/export?delimiter=%3B"
                download
              >
                <FileSpreadsheet className="size-5 text-primary" />
                <span>
                  <strong className="block text-sm font-medium">CSV para Excel</strong>
                  <span className="text-xs text-muted-foreground">Separado por punto y coma</span>
                </span>
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes permiso para exportar registros.</p>
          )}
        </Panel>
      </section>

      {result && <ImportResult result={result} />}

      {can("data_import.get") && (
        <Panel className="mt-6">
          <PanelHeading
            title="Historial de importaciones"
            description={history.data ? `${history.data.total} importaciones · quién, cuándo, dónde y desde qué equipo` : "Cargando..."}
          />
          {history.data && history.data.total === 0 && <EmptyState text="Aún no se han importado archivos." />}
          {history.data && history.data.items.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Archivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Importó</TableHead>
                    <TableHead>Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.items.map((item) => (
                    <TableRow key={item.id ?? item.file_name}>
                      <TableCell className="align-top">
                        <strong className="block max-w-64 truncate font-medium">{item.file_name}</strong>
                        <Pill tone={item.format === "minsa_xlsx" ? "primary" : "neutral"} className="mt-1 h-5 text-[11px]">
                          {item.format === "minsa_xlsx" ? "Excel MINSA" : "CSV"}
                        </Pill>
                      </TableCell>
                      <TableCell className="align-top text-xs tabular-nums">{formatDateTime(item.created_at)}</TableCell>
                      <TableCell className="align-top text-sm">
                        {item.inserted} nuevas · {item.updated} act.
                        <span className={cn("block text-xs", item.failed > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {item.failed} con errores
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="block text-sm">{item.imported_by_name ?? "—"}</span>
                        <small className="text-xs text-muted-foreground">
                          {item.health_facility_name ?? item.micro_network_name ?? "Nivel red"}
                        </small>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <Globe className="size-3.5 text-muted-foreground" />
                          {item.ip_address ?? "—"}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Monitor className="size-3.5" />
                          {describeUserAgent(item.user_agent)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {history.data && (
            <Pagination total={history.data.total} limit={history.data.limit} offset={history.data.offset} onChange={setOffset} />
          )}
        </Panel>
      )}
    </>
  );
}
