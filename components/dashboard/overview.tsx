"use client";

import { ErrorState, LoadingState } from "@/components/common/feedback";
import grid from "@/components/common/grid.module.css";
import { PageHeading } from "@/components/common/page-heading";
import { Panel } from "@/components/common/panel";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadDashboard } from "@/lib/actions/dashboard";
import type { Upcoming } from "@/lib/api/types";
import { RISK_LABELS, formatDate, formatDateTime, formatNumber, relativeTime, roleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecordStats } from "./record-stats";
import { useSession } from "./session";
import styles from "./overview.module.css";

function UpcomingList({ items, empty }: { items: Upcoming[]; empty: string }) {
  if (items.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <>
      {items.map((item) => (
        <div className={styles.upcoming} key={`${item.pregnancy_id}-${item.date}`}>
          <span className={styles.date}>{formatDate(item.date)}</span>
          <div>
            <strong>{item.full_name}</strong>
            <small>
              {item.code} · {item.health_facility_name}
            </small>
          </div>
          <em className={cn(styles.risk, styles[item.risk_level])}>Riesgo {RISK_LABELS[item.risk_level].toLowerCase()}</em>
        </div>
      ))}
    </>
  );
}

export function Overview() {
  const { profile } = useSession();
  const { data, error, loading, reload } = useBackendQuery("dashboard", loadDashboard);
  const system = data?.system;

  return (
    <>
      <PageHeading
        eyebrow={`PANEL DE ${roleTitle(profile.role).toUpperCase()}`}
        title="Resumen general"
        subtitle="Indicadores principales del seguimiento materno."
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      <RecordStats stats={data?.stats ?? null} />
      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          <section className={grid.split}>
            <Panel as="article" className={styles.card}>
              <h2>Actividad reciente</h2>
              <p>Últimos movimientos en el sistema</p>
              {data.recent_activity.length === 0 && <p className={styles.empty}>Aún no hay actividad registrada.</p>}
              {data.recent_activity.map((item, i) => (
                <div className={styles.activity} key={item.id}>
                  <span>{i + 1}</span>
                  <div>
                    <strong>{item.description}</strong>
                    {item.user_name && <small className={styles.by}>por {item.user_name}</small>}
                  </div>
                  <small title={formatDateTime(item.created_at)}>{relativeTime(item.created_at)}</small>
                </div>
              ))}
            </Panel>
            <Panel as="article" className={styles.card}>
              <h2>Estado del sistema</h2>
              <p>
                {system?.database === "ok" ? "Todos los servicios están operativos" : "Hay servicios con problemas"}
              </p>
              <div className={styles.systemStatus}>
                <b className={system?.database === "ok" ? "" : styles.bad} />
                Base de datos {system?.database === "ok" ? "conectada" : "con errores"}
              </div>
              <div className={styles.systemStatus}>
                <b className={system?.backup_auto && system.pg_dump_available ? "" : styles.warn} />
                {system?.backup_auto
                  ? `Backup automático activo (${system.backup_schedule})`
                  : "Backup automático desactivado"}
                {system && !system.pg_dump_available && " · pg_dump no disponible"}
              </div>
              <div className={styles.systemStatus}>
                <b className={system?.last_backup_ok === false ? styles.bad : system?.last_backup_at ? "" : styles.warn} />
                {system?.last_backup_at
                  ? `Último backup: ${formatDateTime(system.last_backup_at)}`
                  : "Todavía no hay backups completados"}
                {system?.last_backup_ok === false && " · el último intento falló"}
              </div>
              <div className={styles.systemStatus}>
                <b className={data.stats.high_risk > 0 ? styles.warn : ""} />
                {formatNumber(data.stats.high_risk)} gestantes de alto riesgo en seguimiento
              </div>
            </Panel>
          </section>
          <section className={cn(grid.split, styles.spaced)}>
            <Panel as="article" className={styles.card}>
              <h2>Próximas citas</h2>
              <p>Controles programados en los próximos 7 días</p>
              <UpcomingList items={data.upcoming_appointments} empty="No hay citas programadas esta semana." />
            </Panel>
            <Panel as="article" className={styles.card}>
              <h2>Partos próximos</h2>
              <p>Fecha probable de parto en los próximos 30 días ({data.stats.due_next_30_days})</p>
              <UpcomingList items={data.due_soon} empty="No hay partos previstos en los próximos 30 días." />
            </Panel>
          </section>
        </>
      ) : null}
    </>
  );
}
