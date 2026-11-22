"use client";

import { Download, FileCheck, Upload } from "lucide-react";
import { useRef, useState } from "react";

import buttons from "@/components/common/buttons.module.css";
import { EmptyState } from "@/components/common/feedback";
import grid from "@/components/common/grid.module.css";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { importCsv, loadImports } from "@/lib/actions/imports";
import type { ApiResult, DataImport } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";
import styles from "./import-export.module.css";

const MAX_BYTES = 10 * 1024 * 1024;

function ImportResult({ result }: { result: DataImport }) {
  return (
    <Panel className={styles.result}>
      <PanelHeading
        title={result.dry_run ? "Resultado de la validación" : "Resultado de la importación"}
        description={`${result.file_name} · ${result.total_rows} filas${result.dry_run ? " · no se guardó nada" : ""}`}
      />
      <div className={styles.counts}>
        <div><span>Filas</span><strong>{result.total_rows}</strong></div>
        <div><span>{result.dry_run ? "Se crearían" : "Nuevos"}</span><strong>{result.inserted}</strong></div>
        <div><span>{result.dry_run ? "Se actualizarían" : "Actualizados"}</span><strong>{result.updated}</strong></div>
        <div className={result.failed ? styles.bad : ""}><span>Con errores</span><strong>{result.failed}</strong></div>
      </div>
      {result.errors.length > 0 && (
        <div className={styles.errors}>
          {result.errors.map((e) => (
            <div key={`${e.line}-${e.message}`}>
              <b>Línea {e.line}</b>
              <span>{e.code ? `${e.code}: ` : ""}{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const noHistory = async (): Promise<ApiResult<DataImport[]>> => ({ ok: true, data: [], msg: "" });

export function ImportExport() {
  const { can } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DataImport | null>(null);
  const { run, pending } = useBackendAction();
  const history = useBackendQuery("imports", can("data_import.get") ? loadImports : noHistory);

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
      history.reload();
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="GESTIÓN DE INFORMACIÓN"
        title="Importar y exportar datos"
        subtitle="Carga registros desde un archivo CSV o descarga una copia autorizada."
      />
      <section className={grid.split}>
        <Panel as="article" className={styles.card}>
          <Upload size={24} />
          <h2>Importar registros</h2>
          <p>
            Columnas mínimas: nombres, apellidos, fecha_nacimiento y establecimiento. Con <b>codigo</b> se actualiza un
            registro existente; sin él se crea uno nuevo. Primero valida el archivo para revisar errores.
          </p>
          <label className={styles.drop}>
            <Upload size={20} />
            <strong>{file ? file.name : "Seleccionar archivo CSV"}</strong>
            <span>{file ? formatBytes(file.size) : "Formato .csv (coma o punto y coma) · máximo 10 MB"}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className={styles.row}>
            <button className={buttons.outline} disabled={!file || pending} onClick={() => send(true)}>
              <FileCheck size={16} /> Validar sin guardar
            </button>
            <button className={buttons.primary} disabled={!file || pending} onClick={() => send(false)}>
              <Upload size={16} /> {pending ? "Procesando..." : "Importar archivo"}
            </button>
          </div>
          <a className={buttons.ghost} href="/files/import-template" download>
            Descargar plantilla CSV
          </a>
        </Panel>
        <Panel as="article" className={styles.card}>
          <Download size={24} />
          <h2>Exportar registros</h2>
          <p>Descarga todos los registros activos en CSV (UTF-8, compatible con Excel).</p>
          {can("pregnancy.export") ? (
            <div className={styles.row}>
              <a className={buttons.outline} href="/files/export" download>
                <Download size={16} /> Descargar CSV (coma)
              </a>
              <a className={buttons.outline} href="/files/export?delimiter=%3B" download>
                <Download size={16} /> CSV para Excel (punto y coma)
              </a>
            </div>
          ) : (
            <p>No tienes permiso para exportar registros.</p>
          )}
        </Panel>
      </section>

      {result && <ImportResult result={result} />}

      {can("data_import.get") && (
        <Panel className={styles.history}>
          <PanelHeading title="Historial de importaciones" description="Últimas 10 importaciones realizadas" />
          {history.data && history.data.length === 0 && <EmptyState text="Aún no se han importado archivos." />}
          {history.data?.map((item) => (
            <div className={styles.historyRow} key={item.id ?? item.file_name}>
              <strong>{item.file_name}</strong>
              <span>{formatDateTime(item.created_at)}</span>
              <span>
                {item.inserted} nuevos · {item.updated} act.
              </span>
              <span className={cn(item.failed > 0 && styles.bad)}>
                {item.failed} con errores{item.imported_by_name ? ` · ${item.imported_by_name}` : ""}
              </span>
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}
