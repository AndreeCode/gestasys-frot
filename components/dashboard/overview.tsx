"use client";

import { Baby, BarChart3, Building2, CalendarDays, History, Network, ServerCog, Trophy, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { RiskBadge, StatusDot } from "@/components/common/badges";
import { ErrorState, LoadingState } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadDashboard } from "@/lib/actions/dashboard";
import type { Breakdown, DashboardData, Upcoming } from "@/lib/api/types";
import { formatDate, formatDateTime, formatNumber, relativeTime, roleTitle } from "@/lib/format";
import { RecordStats } from "./record-stats";
import { useSession } from "./session";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function UpcomingList({ items, empty }: { items: Upcoming[]; empty: string }) {
  if (items.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y">
      {items.map((item) => {
        const [, month, day] = item.date.slice(0, 10).split("-");
        return (
          <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={`${item.pregnancy_id}-${item.date}`}>
            <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-accent py-1.5 text-accent-foreground" title={formatDate(item.date)}>
              <strong className="text-lg leading-none font-semibold tabular-nums">{day}</strong>
              <span className="text-[10px] font-medium tracking-wide uppercase">{MONTHS[Number(month) - 1]}</span>
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-medium">{item.full_name}</strong>
              <small className="block truncate text-xs text-muted-foreground">
                {item.code} · {item.health_facility_name}
              </small>
            </div>
            <RiskBadge level={item.risk_level} />
          </li>
        );
      })}
    </ul>
  );
}

function StatusLine({ tone, children }: { tone: "ok" | "warn" | "bad"; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <StatusDot tone={tone} />
      <span className="leading-snug">{children}</span>
    </li>
  );
}

function SystemStatus({ data }: { data: DashboardData }) {
  const system = data.system;
  return (
    <ul className="divide-y">
      <StatusLine tone={system.database === "ok" ? "ok" : "bad"}>Base de datos {system.database === "ok" ? "conectada" : "con errores"}</StatusLine>
      <StatusLine tone={system.backup_enabled && system.backup_auto && system.pg_dump_available ? "ok" : "warn"}>
        {!system.backup_enabled
          ? "Backups desactivados"
          : system.backup_auto
            ? `Backup automático activo (${system.backup_schedule})`
            : "Backup automático desactivado"}
        {system.backup_enabled && !system.pg_dump_available && " · pg_dump no disponible"}
      </StatusLine>
      <StatusLine tone={system.last_backup_ok === false ? "bad" : system.last_backup_at ? "ok" : "warn"}>
        {system.last_backup_at ? `Último backup: ${formatDateTime(system.last_backup_at)}` : "Todavía no hay backups completados"}
        {system.last_backup_ok === false && " · el último intento falló"}
      </StatusLine>
      {system.failed_logins_24h !== undefined && (
        <StatusLine tone={(system.locked_accounts ?? 0) > 0 ? "bad" : system.failed_logins_24h > 20 ? "warn" : "ok"}>
          {formatNumber(system.failed_logins_24h)} logins fallidos en 24 h
          {(system.locked_accounts ?? 0) > 0 && ` · ${formatNumber(system.locked_accounts ?? 0)} cuentas bloqueadas ahora`}
        </StatusLine>
      )}
      {"audit_chain_ok" in system && (
        <StatusLine tone={system.audit_chain_ok === false ? "bad" : system.audit_chain_ok ? "ok" : "warn"}>
          {system.audit_chain_ok === false
            ? "La auditoría fue alterada: revisa el log del servidor"
            : system.audit_chain_ok
              ? `Auditoría íntegra (${formatNumber(system.audit_chain_records ?? 0)} registros)`
              : "Auditoría aún sin verificar"}
        </StatusLine>
      )}
      <StatusLine tone={data.stats.high_risk > 0 ? "warn" : "ok"}>
        {formatNumber(data.stats.high_risk)} gestantes de alto riesgo en seguimiento
      </StatusLine>
    </ul>
  );
}

function BreakdownTable({ rows, first }: { rows: (Breakdown & { name: string; sub?: string | null })[]; first: string }) {
  if (rows.length === 0) return <Empty>Sin datos.</Empty>;
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>{first}</TableHead>
            <TableHead className="w-[30%]">Gestantes</TableHead>
            <TableHead className="text-right">Seguimiento</TableHead>
            <TableHead className="text-right">Pendientes</TableHead>
            <TableHead className="text-right">Completadas</TableHead>
            <TableHead className="text-right">Alto riesgo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell>
                <strong className="block font-medium">{r.name}</strong>
                {r.sub && <small className="text-xs text-muted-foreground">{r.sub}</small>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold tabular-nums">{formatNumber(r.total)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(r.in_followup)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(r.pending)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(r.completed)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <span className={r.high_risk > 0 ? "font-semibold text-destructive" : ""}>{formatNumber(r.high_risk)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthlyChart({ items }: { items: DashboardData["by_month"] }) {
  const max = Math.max(...items.flatMap((i) => [i.registered, i.controls]), 1);
  return (
    <div>
      <div className="flex h-44 items-end gap-3">
        {items.map((m) => {
          const [, month] = m.month.split("-");
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 max-w-5 rounded-t-md bg-primary transition-all"
                  style={{ height: `${Math.max(2, (m.registered / max) * 100)}%` }}
                  title={`${m.registered} gestantes registradas`}
                />
                <div
                  className="w-1/3 max-w-5 rounded-t-md bg-chart-2 transition-all"
                  style={{ height: `${Math.max(2, (m.controls / max) * 100)}%` }}
                  title={`${m.controls} controles prenatales`}
                />
              </div>
              <span className="text-xs text-muted-foreground capitalize">{MONTHS[Number(month) - 1]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Gestantes registradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-2" /> Controles (APN)
        </span>
      </div>
    </div>
  );
}

function MineCard({ data }: { data: DashboardData }) {
  const items = [
    { label: "Registradas por ti", value: data.mine.total },
    { label: "Este mes", value: data.mine.new_this_month },
    { label: "En seguimiento", value: data.mine.in_followup },
    { label: "Alto riesgo", value: data.mine.high_risk },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg bg-muted/60 px-4 py-3">
          <span className="text-xs text-muted-foreground">{i.label}</span>
          <strong className="block text-2xl font-semibold tabular-nums">{formatNumber(i.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function Overview() {
  const { profile } = useSession();
  const { data, error, loading, reload } = useBackendQuery("dashboard", loadDashboard);
  const firstName = profile.full_name.split(/\s+/)[0];
  const scope = data?.scope;
  const level = scope?.level ?? profile.scope_level;
  const scopeName =
    level === "network"
      ? "Toda la red de salud"
      : level === "micro_network"
        ? `${scope?.micro_network_name ?? profile.micro_network_name ?? "Microred"} · ${scope?.facilities ?? "—"} EE.SS.`
        : `${scope?.health_facility_name ?? profile.health_facility_name ?? "Establecimiento"}${scope?.micro_network_name ? ` · ${scope.micro_network_name}` : ""}`;

  return (
    <>
      <PageHeading
        eyebrow={`${roleTitle(profile.role)} · ${scopeName}`}
        title={`Hola, ${firstName}`}
        subtitle={
          level === "network"
            ? "Indicadores de toda la red: microredes, establecimientos y equipos."
            : level === "micro_network"
              ? "Indicadores de tu microred y de cada uno de sus establecimientos."
              : "Indicadores de tu establecimiento y de tus registros."
        }
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      <RecordStats stats={data?.stats ?? null} />
      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {level === "network" && data.by_micro_network.length > 0 && (
            <Panel as="article" className="lg:col-span-3">
              <PanelHeading
                title="Por microred"
                description={`${data.by_micro_network.length} microredes · ${formatNumber(data.scope.active_users)} usuarios activos en la red`}
                icon={<Network className="size-[18px]" />}
              />
              <BreakdownTable
                first="Microred"
                rows={data.by_micro_network.map((m) => ({ ...m, name: m.micro_network_name, sub: `${m.facilities} EE.SS.` }))}
              />
            </Panel>
          )}
          {level !== "health_facility" && (
            <Panel as="article" className="lg:col-span-3">
              <PanelHeading
                title="Por establecimiento"
                description={
                  level === "micro_network"
                    ? `EE.SS. de ${data.scope.micro_network_name ?? "tu microred"} · ${formatNumber(data.scope.active_users)} usuarios activos`
                    : "Todos los EE.SS. de la red"
                }
                icon={<Building2 className="size-[18px]" />}
              />
              <BreakdownTable
                first="Establecimiento"
                rows={data.by_facility.map((f) => ({ ...f, name: f.health_facility_name, sub: level === "network" ? f.micro_network_name : null }))}
              />
            </Panel>
          )}

          <Panel as="article" className="lg:col-span-2">
            <PanelHeading title="Últimos 6 meses" description="Gestantes registradas y controles prenatales" icon={<BarChart3 className="size-[18px]" />} />
            <MonthlyChart items={data.by_month} />
          </Panel>
          <Panel as="article">
            <PanelHeading title="Tu aporte" description="Gestantes que registraste en tu ámbito" icon={<UserRound className="size-[18px]" />} />
            <MineCard data={data} />
          </Panel>

          {level !== "health_facility" || data.by_registrar.length > 1 ? (
            <Panel as="article" className="lg:col-span-3">
              <PanelHeading title="Registradores" description="Quién está cargando información en tu ámbito" icon={<Trophy className="size-[18px]" />} />
              {data.by_registrar.length === 0 ? (
                <Empty>Todavía no hay registros.</Empty>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Usuario</TableHead>
                        <TableHead>Establecimiento</TableHead>
                        <TableHead className="text-right">Gestantes</TableHead>
                        <TableHead className="text-right">Este mes</TableHead>
                        <TableHead className="text-right">Controles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.by_registrar.map((r) => (
                        <TableRow key={r.user_id}>
                          <TableCell>
                            <strong className="block font-medium">{r.full_name}</strong>
                            <small className="text-xs text-muted-foreground">{roleTitle(r.role)}</small>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.health_facility_name ?? "Nivel red / microred"}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatNumber(r.total)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(r.this_month)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(r.controls)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Panel>
          ) : null}

          <Panel as="article" className="lg:col-span-2">
            <PanelHeading title="Actividad reciente" description="Últimos movimientos en tu ámbito" icon={<History className="size-[18px]" />} />
            {data.recent_activity.length === 0 ? (
              <Empty>Aún no hay actividad registrada.</Empty>
            ) : (
              <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[7px] before:w-px before:bg-border">
                {data.recent_activity.map((item) => (
                  <li className="relative flex gap-4 pl-7" key={item.id}>
                    <span className="absolute top-1 left-0 size-[15px] rounded-full border-[3px] border-card bg-primary ring-1 ring-primary/30" />
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm font-medium">{item.description}</strong>
                      <small className="text-xs text-muted-foreground">
                        {[item.user_name && `por ${item.user_name}`, item.health_facility_name, item.ip_address && `IP ${item.ip_address}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <small className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(item.created_at)}>
                      {relativeTime(item.created_at)}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel as="article">
            <PanelHeading
              title="Estado del sistema"
              description={data.system.database === "ok" ? "Servicios operativos" : "Hay servicios con problemas"}
              icon={<ServerCog className="size-[18px]" />}
            />
            <SystemStatus data={data} />
          </Panel>

          <Panel as="article" className="lg:col-span-1">
            <PanelHeading title="Próximas citas" description="Controles en los próximos 7 días" icon={<CalendarDays className="size-[18px]" />} />
            <UpcomingList items={data.upcoming_appointments} empty="No hay citas programadas esta semana." />
          </Panel>
          <Panel as="article" className="lg:col-span-2">
            <PanelHeading
              title="Partos próximos"
              description={`FPP en los próximos 30 días (${data.stats.due_next_30_days})`}
              icon={<Baby className="size-[18px]" />}
            />
            <UpcomingList items={data.due_soon} empty="No hay partos previstos en los próximos 30 días." />
          </Panel>
        </div>
      ) : null}
    </>
  );
}
