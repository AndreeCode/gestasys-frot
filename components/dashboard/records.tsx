"use client";

import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";

import buttons from "@/components/common/buttons.module.css";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadRecords } from "@/lib/actions/pregnancies";
import type { PregnancyFilters, PregnancyStatus } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toQuery } from "@/lib/query";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordStats } from "./record-stats";
import { useSession } from "./session";
import styles from "./records.module.css";

const LIMIT = 25;

const statusVariant: Record<PregnancyStatus, string | undefined> = {
  pending: styles.pending,
  in_followup: undefined,
  completed: styles.complete,
};

export function Records() {
  const { can, profile } = useSession();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PregnancyFilters>({ limit: LIMIT, offset: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  const exportHref = `/files/export${toQuery({
    q: filters.q,
    health_facility_id: filters.health_facility_id,
    status: filters.status,
    risk_level: filters.risk_level,
  })}`;

  return (
    <>
      <PageHeading
        eyebrow="GESTIÓN DE INFORMACIÓN"
        title="Registros de gestantes"
        subtitle={
          can("pregnancy.put")
            ? "Consulta y administra los registros de seguimiento materno."
            : "Consulta información autorizada del seguimiento materno."
        }
        action={
          can("pregnancy.post") && (
            <button className={buttons.primary} onClick={() => setCreating(true)}>
              <span>+</span> Nuevo registro
            </button>
          )
        }
      />
      <RecordStats stats={data?.stats ?? null} />
      <Panel>
        <PanelHeading
          title="Todos los registros"
          description={page ? `${page.total} registros · actualizado ${formatDateTime(new Date().toISOString())}` : "Cargando..."}
          action={
            can("pregnancy.export") && (
              <a className={buttons.outline} href={exportHref} download>
                <Download size={16} /> Exportar
              </a>
            )
          }
        />
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar por nombre, DNI o código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar por sede"
            value={filters.health_facility_id ?? ""}
            onChange={(e) => update({ health_facility_id: e.target.value || undefined })}
          >
            <option value="">Todas las sedes</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por estado"
            value={filters.status ?? ""}
            onChange={(e) => update({ status: (e.target.value || undefined) as PregnancyStatus | undefined })}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as PregnancyStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por riesgo"
            value={filters.risk_level ?? ""}
            onChange={(e) => update({ risk_level: (e.target.value || undefined) as PregnancyFilters["risk_level"] })}
          >
            <option value="">Todo riesgo</option>
            {(Object.keys(RISK_LABELS) as (keyof typeof RISK_LABELS)[]).map((r) => (
              <option key={r} value={r}>
                Riesgo {RISK_LABELS[r].toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !page ? (
          <LoadingState />
        ) : page && page.items.length === 0 ? (
          <EmptyState text="No hay registros que coincidan con los filtros." />
        ) : page ? (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>GESTANTE</th>
                    <th>SEDE</th>
                    <th>EDAD GEST.</th>
                    <th>RIESGO</th>
                    <th>ÚLTIMO REGISTRO</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((record) => (
                    <tr key={record.id} onClick={() => setSelected(record.id)}>
                      <td className={styles.code}>{record.code}</td>
                      <td>
                        <strong>{record.full_name}</strong>
                        <small>
                          {record.age} años{record.dni ? ` · DNI ${record.dni}` : ""}
                        </small>
                      </td>
                      <td>{record.health_facility_name}</td>
                      <td>
                        {record.gestational_age
                          ? `${record.gestational_age.weeks} sem ${record.gestational_age.days} d`
                          : "—"}
                      </td>
                      <td>
                        <span className={cn(styles.risk, styles[record.risk_level])}>{RISK_LABELS[record.risk_level]}</span>
                      </td>
                      <td>{formatDate(record.last_control_date ?? record.created_at)}</td>
                      <td>
                        <span className={cn(styles.status, statusVariant[record.status])}>
                          <b />
                          {STATUS_LABELS[record.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
