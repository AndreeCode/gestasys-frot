"use client";

import { Building2, Filter, Globe, Monitor, ScrollText, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Pill, type Tone } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { InfoGrid, InfoItem, Panel, PanelHeading } from "@/components/common/panel";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendQuery } from "@/hooks/use-backend";
import { loadAudit, loadAuditFacilities } from "@/lib/actions/audit";
import type { AuditFilters, AuditLog } from "@/lib/api/types";
import { ACTION_LABELS, TABLE_LABELS, describeUserAgent, formatDateTime, roleTitle } from "@/lib/format";
import { useSession } from "./session";

const LIMIT = 25;

const ACTION_TONE: Record<string, Tone> = {
  INSERT: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "primary",
  LOGIN_FAILED: "warning",
  ACCESS_DENIED: "danger",
  MFA_FAILED: "warning",
};

const HIDDEN_FIELDS = new Set(["updated_at", "created_at", "id", "clinical_data", "password_changed_at"]);

function Changes({ log }: { log: AuditLog }) {
  const details = (log.details ?? {}) as { old?: Record<string, unknown>; new?: Record<string, unknown> };
  const before = details.old ?? {};
  const after = details.new ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) => !HIDDEN_FIELDS.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  if (!details.old && !details.new) {
    const rest = Object.entries(log.details ?? {}).filter(([k]) => k !== "scope");
    if (rest.length === 0) return <p className="text-sm text-muted-foreground">Sin datos adicionales.</p>;
    return (
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
        {JSON.stringify(Object.fromEntries(rest), null, 2)}
      </pre>
    );
  }
  if (keys.length === 0) return <p className="text-sm text-muted-foreground">Sin cambios visibles en los campos.</p>;
  const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Campo</TableHead>
            {details.old && <TableHead>Antes</TableHead>}
            {details.new && <TableHead>Después</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((k) => (
            <TableRow key={k}>
              <TableCell className="font-mono text-xs">{k}</TableCell>
              {details.old && <TableCell className="max-w-56 text-xs break-words whitespace-normal text-muted-foreground">{show(before[k])}</TableCell>}
              {details.new && <TableCell className="max-w-56 text-xs break-words whitespace-normal">{show(after[k])}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AuditDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <Modal
      title={`${ACTION_LABELS[log.action] ?? log.action} · ${TABLE_LABELS[log.affected_table ?? ""] ?? log.affected_table ?? ""}`}
      description={formatDateTime(log.created_at)}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <InfoGrid>
          <InfoItem label="Usuario">
            {log.user_name ?? "Sistema"}
            {log.user_role && <span className="block text-xs font-normal text-muted-foreground">{roleTitle(log.user_role)}</span>}
          </InfoItem>
          <InfoItem label="Registro">{log.record_label ?? "—"}</InfoItem>
          <InfoItem label="Establecimiento">
            {log.health_facility_name ?? "—"}
            {log.micro_network_name && <span className="block text-xs font-normal text-muted-foreground">{log.micro_network_name}</span>}
          </InfoItem>
          <InfoItem label="Actuó desde">{log.actor_health_facility_name ?? (log.user_id ? "Nivel red / microred" : "—")}</InfoItem>
          <InfoItem label="IP">{log.ip_address ?? "—"}</InfoItem>
          <InfoItem label="Dispositivo">{describeUserAgent(log.user_agent)}</InfoItem>
          <InfoItem label="Resultado">{log.result === "successful" ? "Correcto" : log.result === "failed" ? "Fallido" : "Bloqueado"}</InfoItem>
          <InfoItem label="ID del registro">
            <span className="font-mono text-xs break-all">{log.record_id ?? "—"}</span>
          </InfoItem>
        </InfoGrid>
        {log.user_agent && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 font-mono text-[11px] break-all text-muted-foreground">{log.user_agent}</p>
        )}
        <div>
          <h3 className="mb-2 text-sm font-semibold">Cambios</h3>
          <Changes log={log} />
        </div>
      </div>
    </Modal>
  );
}

export function AuditTable({ items, onSelect, compact }: { items: AuditLog[]; onSelect: (log: AuditLog) => void; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acción</TableHead>
            {!compact && <TableHead>Registro</TableHead>}
            <TableHead>Dónde se registró</TableHead>
            <TableHead>Desde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((log) => (
            <TableRow
              key={log.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => onSelect(log)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(log)}
            >
              <TableCell className="align-top text-xs tabular-nums">{formatDateTime(log.created_at)}</TableCell>
              <TableCell className="align-top">
                <strong className="block text-sm font-medium">{log.user_name ?? "Sistema"}</strong>
                {log.user_role && <small className="text-xs text-muted-foreground">{roleTitle(log.user_role)}</small>}
              </TableCell>
              <TableCell className="align-top">
                <Pill tone={log.result !== "successful" ? "danger" : (ACTION_TONE[log.action] ?? "neutral")}>
                  {ACTION_LABELS[log.action] ?? log.action}
                </Pill>
              </TableCell>
              {!compact && (
                <TableCell className="align-top">
                  <span className="block text-sm">{TABLE_LABELS[log.affected_table ?? ""] ?? log.affected_table ?? "—"}</span>
                  {log.record_label && <small className="font-mono text-xs text-muted-foreground">{log.record_label}</small>}
                </TableCell>
              )}
              <TableCell className="align-top">
                <span className="flex items-center gap-1.5 text-sm">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  {log.health_facility_name ?? "—"}
                </span>
                {log.micro_network_name && <small className="block pl-5 text-xs text-muted-foreground">{log.micro_network_name}</small>}
              </TableCell>
              <TableCell className="align-top">
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                  {log.ip_address ?? "—"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Monitor className="size-3.5 shrink-0" />
                  {describeUserAgent(log.user_agent)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AuditLogView() {
  const { profile } = useSession();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AuditFilters>({ limit: LIMIT, offset: 0 });
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const facilities = useBackendQuery("audit-facilities", loadAuditFacilities);
  const { data, error, loading, reload } = useBackendQuery(JSON.stringify(filters), () => loadAudit(filters));

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = search.trim() || undefined;
      setFilters((f) => (f.q === q ? f : { ...f, q, offset: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const update = (patch: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...patch, offset: 0 }));
  const scopeText =
    profile.scope_level === "network"
      ? "toda la red de salud"
      : profile.scope_level === "micro_network"
        ? (profile.micro_network_name ?? "tu microred")
        : (profile.health_facility_name ?? "tu establecimiento");

  return (
    <>
      <PageHeading
        eyebrow="Seguridad"
        title="Auditoría"
        subtitle={`Quién registró o cambió cada dato, en qué establecimiento, desde qué IP y dispositivo (${scopeText}).`}
      />
      <Panel>
        <PanelHeading
          title="Bitácora inmutable"
          description={data ? `${data.total} eventos · firmados con HMAC encadenado` : "Cargando..."}
          icon={<ScrollText className="size-[18px]" />}
        />
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Usuario, IP o código de registro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar en la auditoría"
            />
          </div>
          <NativeSelect className="w-full" aria-label="Acción" value={filters.action ?? ""} onChange={(e) => update({ action: e.target.value || undefined })}>
            <NativeSelectOption value="">Todas las acciones</NativeSelectOption>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <NativeSelectOption key={k} value={k}>
                {v}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            aria-label="Tipo de registro"
            value={filters.affected_table ?? ""}
            onChange={(e) => update({ affected_table: e.target.value || undefined })}
          >
            <NativeSelectOption value="">Todo tipo de registro</NativeSelectOption>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <NativeSelectOption key={k} value={k}>
                {v}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full"
            aria-label="Establecimiento"
            value={filters.health_facility_id ?? ""}
            onChange={(e) => update({ health_facility_id: e.target.value || undefined })}
          >
            <NativeSelectOption value="">Todos los EE.SS.</NativeSelectOption>
            {(facilities.data ?? []).map((f) => (
              <NativeSelectOption key={f.id} value={f.id}>
                {f.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input type="date" aria-label="Desde" value={filters.date_from ?? ""} onChange={(e) => update({ date_from: e.target.value || undefined })} />
          <Input type="date" aria-label="Hasta" value={filters.date_to ?? ""} onChange={(e) => update({ date_to: e.target.value || undefined })} />
        </div>
        {(filters.action || filters.affected_table || filters.health_facility_id || filters.date_from || filters.date_to) && (
          <button
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            onClick={() => setFilters({ limit: LIMIT, offset: 0, q: filters.q })}
          >
            <Filter className="size-3.5" /> Quitar filtros
          </button>
        )}
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data ? (
          <LoadingState />
        ) : data && data.items.length === 0 ? (
          <EmptyState text="No hay eventos que coincidan con los filtros." />
        ) : data ? (
          <>
            <AuditTable items={data.items} onSelect={setSelected} />
            <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={(offset) => setFilters((f) => ({ ...f, offset }))} />
          </>
        ) : null}
        {profile.scope_level !== "network" && (
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            Solo ves los eventos de {scopeText}. La verificación completa de la cadena la hace el superadmin.
          </p>
        )}
      </Panel>
      {selected && <AuditDetail log={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
