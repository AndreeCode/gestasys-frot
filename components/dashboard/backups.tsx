"use client";

import { Archive, DatabaseBackup, Download, Trash } from "lucide-react";
import { useEffect } from "react";

import buttons from "@/components/common/buttons.module.css";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createBackup, deleteBackup, loadBackups } from "@/lib/actions/backups";
import type { Backup } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";
import styles from "./backups.module.css";

const STATUS: Record<Backup["status"], string> = { running: "En curso", completed: "Completado", failed: "Fallido" };
const PRIORITY: Record<Backup["priority"], string> = { high: "Alta", normal: "Normal", low: "Baja" };

export function Backups() {
  const { can } = useSession();
  const { data, error, loading, reload } = useBackendQuery("backups", loadBackups);
  const { run, pending } = useBackendAction();
  const status = data?.status;
  const running = Boolean(status?.running);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 3000);
    return () => clearInterval(timer);
  }, [running, reload]);

  async function start() {
    if (await run(createBackup(), "Backup iniciado: se actualizará al terminar")) reload();
  }

  async function remove(backup: Backup) {
    if (!window.confirm(`¿Eliminar el backup del ${formatDateTime(backup.started_at)} y su archivo?`)) return;
    if (await run(deleteBackup(backup.id))) reload();
  }

  const healthy = status?.auto_enabled && status.pg_dump_available;
  const title = running
    ? "Backup en curso..."
    : !status
      ? "Cargando estado..."
      : !status.pg_dump_available
        ? "pg_dump no está disponible en el servidor"
        : status.auto_enabled
          ? "Backup automático activo"
          : "Backup automático desactivado";

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRACIÓN"
        title="Backups y seguridad"
        subtitle="Protege la información con copias automáticas y manuales."
        action={
          can("backup.post") && (
            <button className={buttons.primary} disabled={pending || running || !status?.pg_dump_available} onClick={start}>
              <DatabaseBackup size={16} /> {running ? "Backup en curso..." : "Crear backup ahora"}
            </button>
          )
        }
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      <Panel className={styles.panel}>
        <div className={styles.icon}>
          <Archive size={24} />
        </div>
        <div>
          <h2>{title}</h2>
          <p>
            {status?.auto_enabled
              ? `Las copias automáticas se ejecutan todos los días a las ${status.schedule}; se conservan las últimas ${status.keep}.`
              : "Activa BACKUP_AUTO en el servidor para programar copias diarias."}
          </p>
          <span className={cn(styles.badge, !healthy && styles.warn, status?.last_failure && !status.last_backup && styles.bad)}>
            <b /> {healthy ? "Protección activa" : "Revisa la configuración del servidor"}
          </span>
          {status && (
            <div className={styles.meta}>
              <span>Último backup: {formatDateTime(status.last_backup?.finished_at)}</span>
              {status.next_run_at && <span>Próximo: {formatDateTime(status.next_run_at)}</span>}
              <span>Espacio usado: {formatBytes(status.total_size_bytes)}</span>
            </div>
          )}
        </div>
      </Panel>
      <Panel className={styles.history}>
        <PanelHeading title="Historial de backups" description="Prioridad, tablas protegidas y fecha de cada copia." />
        {loading && !data && <LoadingState />}
        {data && data.backups.length === 0 && <EmptyState text="Todavía no se han creado backups." />}
        {data && data.backups.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha y hora</th>
                  <th>Tablas incluidas</th>
                  <th>Tamaño</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.backups.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.kind === "automatic" ? "Backup automático" : "Backup manual"}</strong>
                      {b.created_by_name && <small>por {b.created_by_name}</small>}
                    </td>
                    <td>{formatDateTime(b.started_at)}</td>
                    <td>{b.tables.length ? `${b.tables.length} tablas` : "—"}</td>
                    <td>{formatBytes(b.size_bytes)}</td>
                    <td>
                      <span className={cn(styles.priority, styles[b.priority])}>{PRIORITY[b.priority]}</span>
                    </td>
                    <td>
                      <em className={styles[b.status]}>{STATUS[b.status]}</em>
                      {b.error && <small>{b.error}</small>}
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        {b.status === "completed" && (
                          <a className={buttons.ghost} href={`/files/backups/${b.id}`} download title="Descargar">
                            <Download size={14} />
                          </a>
                        )}
                        {can("backup.delete") && b.status !== "running" && (
                          <button className={cn(buttons.ghost, buttons.red)} title="Eliminar" disabled={pending} onClick={() => remove(b)}>
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
