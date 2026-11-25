"use client";

import { Activity, Baby, BarChart3, Building2, CalendarX, ClipboardCheck, HeartPulse, Printer, Target, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ErrorState, LoadingState } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Stat, StatsGrid } from "@/components/common/stat";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadReport } from "@/lib/actions/reports";
import type { ReportData, ReportIndicator } from "@/lib/api/types";
import { formatNumber, roleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Semáforo referencial: verde ≥ 80 %, ámbar 50–79 %, rojo < 50 % (al revés para inasistentes). */
function tone(percent: number | null, inverse?: boolean): "ok" | "warn" | "bad" | "none" {
  if (percent === null) return "none";
  if (inverse) return percent <= 10 ? "ok" : percent <= 25 ? "warn" : "bad";
  return percent >= 80 ? "ok" : percent >= 50 ? "warn" : "bad";
}

const TONE_BAR = { ok: "bg-success", warn: "bg-warning", bad: "bg-destructive", none: "bg-muted-foreground/30" };
const TONE_TEXT = { ok: "text-success", warn: "text-warning", bad: "text-destructive", none: "text-muted-foreground" };

function Percent({ value, inverse }: { value: number | null; inverse?: boolean }) {
  return (
    <span className={cn("font-semibold tabular-nums", TONE_TEXT[tone(value, inverse)])}>{value === null ? "—" : `${value}%`}</span>
  );
}

function IndicatorCard({ item }: { item: ReportIndicator }) {
  const t = tone(item.percent, item.inverse);
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-sm font-semibold">{item.label}</strong>
          <span className="text-xs text-muted-foreground">{item.detail}</span>
        </div>
        <span className={cn("text-2xl font-semibold tabular-nums", TONE_TEXT[t])}>{item.percent === null ? "—" : `${item.percent}%`}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", TONE_BAR[t])} style={{ width: `${Math.min(100, item.percent ?? 0)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        {formatNumber(item.value)} de {formatNumber(item.base)}
      </p>
    </div>
  );
}

function Distribution({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((n, i) => n + i.value, 0) || 1;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {items.map((i) => (
          <div key={i.label} className={i.color} style={{ width: `${(i.value / total) * 100}%` }} title={`${i.label}: ${i.value}`} />
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-sm", i.color)} />
              {i.label}
            </span>
            <span className="tabular-nums">
              <strong className="font-semibold">{formatNumber(i.value)}</strong>
              <span className="ml-1.5 text-xs text-muted-foreground">{Math.round((i.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthlyChart({ items }: { items: ReportData["by_month"] }) {
  const max = Math.max(...items.flatMap((i) => [i.registered, i.controls]), 1);
  return (
    <div>
      <div className="flex h-48 items-end gap-2">
        {items.map((m) => {
          const [year, month] = m.month.split("-");
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div className="w-2/5 max-w-4 rounded-t bg-primary" style={{ height: `${Math.max(2, (m.registered / max) * 100)}%` }} title={`${m.registered} gestantes`} />
                <div className="w-2/5 max-w-4 rounded-t bg-chart-2" style={{ height: `${Math.max(2, (m.controls / max) * 100)}%` }} title={`${m.controls} controles`} />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {MONTHS[Number(month) - 1]}
                {month === "01" && <span className="block text-center">{year}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
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

function Filters({
  data,
  network,
  facility,
  onNetwork,
  onFacility,
}: {
  data: ReportData;
  network: string;
  facility: string;
  onNetwork: (id: string) => void;
  onFacility: (id: string) => void;
}) {
  const facilities = data.options.facilities.filter((f) => !network || f.micro_network_id === network);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {data.can_choose_network && (
        <NativeSelect className="w-56" aria-label="Microred" value={network} onChange={(e) => onNetwork(e.target.value)}>
          <NativeSelectOption value="">Toda la red de salud</NativeSelectOption>
          {data.options.networks.map((n) => (
            <NativeSelectOption key={n.id} value={n.id}>
              {n.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      {facilities.length > 1 && (
        <NativeSelect className="w-56" aria-label="Establecimiento" value={facility} onChange={(e) => onFacility(e.target.value)}>
          <NativeSelectOption value="">{data.can_choose_network ? "Todos los EE.SS." : "Toda mi microred"}</NativeSelectOption>
          {facilities.map((f) => (
            <NativeSelectOption key={f.id} value={f.id}>
              {f.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="grid gap-6">{children}</div>;
}

export function Reports() {
  const { profile } = useSession();
  const [network, setNetwork] = useState("");
  const [facility, setFacility] = useState("");
  const { data, error, loading, reload } = useBackendQuery(`report:${network}:${facility}`, () =>
    loadReport(network || undefined, facility || undefined),
  );

  const scopeName = (() => {
    if (!data) return "";
    if (facility) return data.options.facilities.find((f) => f.id === facility)?.name ?? "";
    if (network) return data.options.networks.find((n) => n.id === network)?.name ?? "";
    if (profile.scope_level === "network") return "Toda la red de salud";
    return profile.micro_network_name ?? profile.health_facility_name ?? "";
  })();
  const s = data?.summary;

  return (
    <>
      <PageHeading
        eyebrow={`Estadísticas · ${roleTitle(profile.role)}`}
        title="Registros y cumplimiento"
        subtitle={scopeName ? `Indicadores de ${scopeName}.` : "Indicadores de tu ámbito."}
        action={
          <>
            {data && (
              <Filters
                data={data}
                network={network}
                facility={facility}
                onNetwork={(id) => {
                  setNetwork(id);
                  setFacility("");
                }}
                onFacility={setFacility}
              />
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </>
        }
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data ? (
        <LoadingState text="Calculando indicadores..." />
      ) : data && s ? (
        <Section>
          <StatsGrid>
            <Stat label="Gestantes" icon={Users} tone="primary" value={formatNumber(s.total)} detail={`${formatNumber(s.active)} activas · ${formatNumber(s.completed)} terminadas`} />
            <Stat label="Promedio de APN" icon={ClipboardCheck} tone="info" value={String(s.avg_controls)} detail={`${formatNumber(s.with_controls)} con al menos un control`} />
            <Stat label="Alto riesgo" icon={HeartPulse} tone="warning" value={formatNumber(s.risk_high)} detail={`${s.total ? Math.round((s.risk_high / s.total) * 100) : 0}% del total`} warning={s.risk_high > 0} />
            <Stat label="Inasistentes" icon={CalendarX} tone="warning" value={formatNumber(s.missed)} detail="Cita vencida sin control" warning={s.missed > 0} />
          </StatsGrid>

          <Panel>
            <PanelHeading
              title="Cumplimiento"
              description="Semáforo referencial: verde ≥ 80 %, ámbar 50–79 %, rojo < 50 % (en inasistentes, mientras menos mejor)"
              icon={<Target className="size-[18px]" />}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.indicators.map((item) => (
                <IndicatorCard key={item.id} item={item} />
              ))}
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel as="article" className="lg:col-span-2">
              <PanelHeading title="Últimos 12 meses" description="Gestantes registradas y controles prenatales" icon={<BarChart3 className="size-[18px]" />} />
              <MonthlyChart items={data.by_month} />
            </Panel>
            <Panel as="article">
              <PanelHeading title="Distribución" icon={<Activity className="size-[18px]" />} />
              <div className="space-y-6">
                <Distribution
                  title="Riesgo"
                  items={[
                    { label: "Alto", value: s.risk_high, color: "bg-destructive" },
                    { label: "Medio", value: s.risk_medium, color: "bg-warning" },
                    { label: "Bajo", value: s.risk_low, color: "bg-success" },
                  ]}
                />
                <Distribution
                  title="Estado"
                  items={[
                    { label: "Pendiente", value: s.status_pending, color: "bg-warning" },
                    { label: "En seguimiento", value: s.status_followup, color: "bg-primary" },
                    { label: "Terminado", value: s.completed, color: "bg-success" },
                  ]}
                />
                <Distribution
                  title="Edad"
                  items={[
                    { label: "Adolescente (< 18)", value: s.age_teen, color: "bg-chart-4" },
                    { label: "18 a 35 años", value: s.age_adult, color: "bg-chart-2" },
                    { label: "Mayor de 35", value: s.age_older, color: "bg-chart-5" },
                  ]}
                />
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeading
              title="Por establecimiento"
              description={`${data.by_facility.length} EE.SS. · comparación de cumplimiento`}
              icon={<Building2 className="size-[18px]" />}
            />
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Establecimiento</TableHead>
                    <TableHead className="text-right">Gestantes</TableHead>
                    <TableHead className="text-right">Activas</TableHead>
                    <TableHead className="text-right">Captación precoz</TableHead>
                    <TableHead className="text-right">≥ 6 APN</TableHead>
                    <TableHead className="text-right">Partos ≥ 6 APN</TableHead>
                    <TableHead className="text-right">Prom. APN</TableHead>
                    <TableHead className="text-right">Inasistentes</TableHead>
                    <TableHead className="text-right">Alto riesgo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_facility.map((f) => (
                    <TableRow key={f.health_facility_id}>
                      <TableCell>
                        <strong className="block font-medium">{f.health_facility_name}</strong>
                        {data.can_choose_network && !network && f.micro_network_name && (
                          <small className="text-xs text-muted-foreground">{f.micro_network_name}</small>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatNumber(f.total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.active)}</TableCell>
                      <TableCell className="text-right">
                        <Percent value={f.early_capture} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Percent value={f.six_apn} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Percent value={f.completed_six_apn} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{f.avg_controls}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", f.missed > 0 && "font-semibold text-destructive")}>{formatNumber(f.missed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.risk_high)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel>
            <PanelHeading title="Registradores" description="Quién registra y cuántos controles carga" icon={<Baby className="size-[18px]" />} />
            {data.by_registrar.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Sin registros.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
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
        </Section>
      ) : null}
    </>
  );
}
