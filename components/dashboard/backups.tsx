"use client";

import { Archive, CalendarClock, DatabaseBackup, Download, HardDrive, History, Loader2, Trash } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Pill, type Tone } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createBackup, deleteBackup, loadBackups } from "@/lib/actions/backups";
import type { Backup } from "@/lib/api/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

const LIMIT = 15;

const STATUS: Record<Backup["status"], [string, Tone]> = {
  running: ["En curso", "info"],
  completed: ["Completado", "success"],
  failed: ["Fallido", "danger"],
};
const PRIORITY: Record<Backup["priority"], [string, Tone]> = {
  high: ["Alta", "danger"],
  normal: ["Normal", "primary"],
  low: ["Baja", "neutral"],
};

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <strong className="block truncate text-sm font-medium tabular-nums">{value}</strong>
      </div>
    </div>
  );
}

export function Backups() {
  const { can } = useSession();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useBackendQuery(`backups:${offset}`, () => loadBackups(LIMIT, offset));
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

  const healthy = Boolean(status?.enabled && status.auto_enabled && status.pg_dump_available);
  const title = running
    ? "Backup en curso..."
    : !status
      ? "Cargando estado..."
      : !status.enabled
        ? "Backups desactivados"
        : !status.pg_dump_available
          ? "pg_dump no está disponible en el servidor"
          : status.auto_enabled
            ? "Backup automático activo"
            : "Backup automático desactivado";

  return (
    <>
      <PageHeading
        eyebrow="Administración"
        title="Backups y seguridad"
        subtitle="Protege la información con copias automáticas y manuales."
        action={
          can("backup.post") && (
            <Button size="lg" disabled={pending || running || !status?.enabled || !status.pg_dump_available} onClick={start}>
              {running ? <Loader2 className="animate-spin" /> : <DatabaseBackup />}
              {running ? "Backup en curso..." : "Crear backup ahora"}
            </Button>
          )
        }
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      <Panel className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-2xl",
              healthy ? "bg-success/12 text-success" : "bg-warning/15 text-warning",
            )}
          >
            <Archive className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {status && (
                <Pill tone={healthy ? "success" : status.last_failure && !status.last_backup ? "danger" : "warning"} dot>
                  {healthy ? "Protección activa" : "Revisa la configuración del servidor"}
                </Pill>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {status && !status.enabled
                ? "Los backups están desactivados en el servidor (BACKUP_ENABLED=false)."
                : status?.auto_enabled
                  ? `Las copias automáticas se ejecutan todos los días a las ${status.schedule}; se conservan las últimas ${status.keep}.`
                  : "Activa BACKUP_AUTO en el servidor para programar copias diarias."}
            </p>
            {status && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Meta icon={<History className="size-4" />} label="Último backup" value={formatDateTime(status.last_backup?.finished_at)} />
                <Meta icon={<CalendarClock className="size-4" />} label="Próximo" value={formatDateTime(status.next_run_at)} />
                <Meta icon={<HardDrive className="size-4" />} label="Espacio usado" value={formatBytes(status.total_size_bytes)} />
              </div>
            )}
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelHeading
          title="Historial de backups"
          description={data ? `${data.backups.total} copias · prioridad, tablas protegidas y fecha de cada una` : "Cargando..."}
        />
        {loading && !data && <LoadingState />}
        {data && data.backups.total === 0 && <EmptyState text="Todavía no se han creado backups." />}
        {data && data.backups.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Tablas</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.backups.items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="align-top">
                      <strong className="block font-medium">{b.kind === "automatic" ? "Backup automático" : "Backup manual"}</strong>
                      {b.created_by_name && <small className="block text-xs text-muted-foreground">por {b.created_by_name}</small>}
                      {b.sha256 && (
                        <small
                          className="block font-mono text-[11px] text-muted-foreground"
                          title={`SHA-256 ${b.sha256} (compáralo con: sha256sum ${b.file_name ?? "archivo"})`}
                        >
                          SHA-256 {b.sha256.slice(0, 12)}…
                        </small>
                      )}
                    </TableCell>
                    <TableCell className="align-top tabular-nums">{formatDateTime(b.started_at)}</TableCell>
                    <TableCell className="align-top">{b.tables.length ? `${b.tables.length} tablas` : "—"}</TableCell>
                    <TableCell className="align-top tabular-nums">{formatBytes(b.size_bytes)}</TableCell>
                    <TableCell className="align-top">
                      <Pill tone={PRIORITY[b.priority][1]}>{PRIORITY[b.priority][0]}</Pill>
                    </TableCell>
                    <TableCell className="max-w-64 align-top whitespace-normal">
                      <Pill tone={STATUS[b.status][1]} dot>
                        {STATUS[b.status][0]}
                      </Pill>
                      {b.error && <small className="mt-1 block text-xs text-destructive">{b.error}</small>}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-1">
                        {b.status === "completed" && (
                          <a
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                            href={`/files/backups/${b.id}`}
                            download
                            title="Descargar"
                          >
                            <Download />
                          </a>
                        )}
                        {can("backup.delete") && b.status !== "running" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Eliminar"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={pending}
                            onClick={() => remove(b)}
                          >
                            <Trash />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && (
          <Pagination total={data.backups.total} limit={data.backups.limit} offset={data.backups.offset} onChange={setOffset} />
        )}
      </Panel>
    </>
  );
}
