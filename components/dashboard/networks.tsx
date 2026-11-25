"use client";

import { Building2, ClipboardList, Network, Pencil, Plus, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Pill } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/feedback";
import { Field, FormActions, FormGrid } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { Panel } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createFacility, createMicroNetwork, loadNetworks, updateFacility, updateMicroNetwork } from "@/lib/actions/networks";
import type { HealthFacility, MicroNetwork } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { useSession } from "./session";

const CATEGORIES = ["Puesto de Salud", "Centro de Salud", "Hospital"];

function Counter({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      <strong className="font-semibold text-foreground tabular-nums">{formatNumber(value)}</strong> {label}
    </span>
  );
}

function NetworkForm({ network, onClose, onSaved }: { network?: MicroNetwork; onClose: () => void; onSaved: () => void }) {
  const { run, pending } = useBackendAction();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? "").trim(),
      code: String(form.get("code") ?? "").trim() || null,
      network: String(form.get("network") ?? "").trim() || null,
    };
    if (await run(network ? updateMicroNetwork(network.id, input) : createMicroNetwork(input))) onSaved();
  }

  return (
    <Modal title={network ? `Editar ${network.name}` : "Nueva microred"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormGrid cols={1}>
          <Field label="Nombre *">
            <Input name="name" required maxLength={150} defaultValue={network?.name} placeholder="Microred Belén" />
          </Field>
          <Field label="Código" hint="(se genera si lo dejas vacío)">
            <Input name="code" maxLength={20} defaultValue={network?.code} placeholder="MR-BELEN" className="uppercase" />
          </Field>
          <Field label="Red de salud">
            <Input name="network" maxLength={150} defaultValue={network?.network ?? "Red de Salud Huamanga"} />
          </Field>
        </FormGrid>
        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}

function FacilityForm({
  facility,
  networks,
  defaultNetwork,
  onClose,
  onSaved,
}: {
  facility?: HealthFacility;
  networks: MicroNetwork[];
  defaultNetwork?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { run, pending } = useBackendAction();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (k: string) => String(form.get(k) ?? "").trim() || null;
    const input = {
      code: value("code") ?? "",
      name: value("name") ?? "",
      category: value("category"),
      district: value("district"),
      province: value("province"),
      renaes: value("renaes"),
      micro_network_id: value("micro_network_id"),
    };
    if (await run(facility ? updateFacility(facility.id, input) : createFacility(input))) onSaved();
  }

  return (
    <Modal title={facility ? `Editar ${facility.name}` : "Nuevo establecimiento"} onClose={onClose} wide>
      <form onSubmit={onSubmit}>
        <FormGrid>
          <Field label="Nombre *">
            <Input name="name" required maxLength={150} defaultValue={facility?.name} placeholder="P.S. Santa Ana" />
          </Field>
          <Field label="Código interno *">
            <Input name="code" required maxLength={20} defaultValue={facility?.code} placeholder="PS-SANTAANA" className="uppercase" />
          </Field>
          <Field label="Código RENAES" hint="(del MINSA)">
            <Input name="renaes" inputMode="numeric" pattern="[0-9]{1,20}" defaultValue={facility?.renaes ?? ""} />
          </Field>
          <Field label="Microred">
            <NativeSelect className="w-full" name="micro_network_id" defaultValue={facility?.micro_network_id ?? defaultNetwork ?? ""}>
              <NativeSelectOption value="">Sin microred</NativeSelectOption>
              {networks.map((n) => (
                <NativeSelectOption key={n.id} value={n.id}>
                  {n.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Categoría">
            <NativeSelect className="w-full" name="category" defaultValue={facility?.category ?? ""}>
              <NativeSelectOption value="">—</NativeSelectOption>
              {CATEGORIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Provincia">
            <Input name="province" maxLength={100} defaultValue={facility?.province ?? ""} placeholder="Huamanga" />
          </Field>
          <Field label="Distrito">
            <Input name="district" maxLength={100} defaultValue={facility?.district ?? ""} />
          </Field>
        </FormGrid>
        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}

type Editing =
  | { kind: "network"; network?: MicroNetwork }
  | { kind: "facility"; facility?: HealthFacility; networkId?: string }
  | null;

export function Networks() {
  const { can } = useSession();
  const { data, error, loading, reload } = useBackendQuery("networks", loadNetworks);
  const [editing, setEditing] = useState<Editing>(null);

  const groups = useMemo(() => {
    if (!data) return [];
    const byNetwork = new Map<string, HealthFacility[]>();
    for (const f of data.facilities) {
      const key = f.micro_network_id ?? "";
      byNetwork.set(key, [...(byNetwork.get(key) ?? []), f]);
    }
    const list = data.networks.map((n) => ({ network: n as MicroNetwork | null, title: n.name, facilities: byNetwork.get(n.id) ?? [] }));
    for (const [key, facilities] of byNetwork) {
      if (key && !data.networks.some((n) => n.id === key)) {
        list.push({ network: null, title: facilities[0].micro_network_name ?? "Microred", facilities });
      }
    }
    const orphans = byNetwork.get("") ?? [];
    if (orphans.length) list.push({ network: null, title: "Establecimientos sin microred", facilities: orphans });
    return list;
  }, [data]);

  const done = () => {
    setEditing(null);
    reload();
  };

  return (
    <>
      <PageHeading
        eyebrow="Organización"
        title="Red de salud"
        subtitle="Microredes y establecimientos (EE.SS.) con sus gestantes y usuarios."
        action={
          <>
            {can("health_facility.post") && (
              <Button variant="outline" size="lg" onClick={() => setEditing({ kind: "facility" })}>
                <Building2 /> Nuevo EE.SS.
              </Button>
            )}
            {can("micro_network.post") && (
              <Button size="lg" onClick={() => setEditing({ kind: "network" })}>
                <Plus /> Nueva microred
              </Button>
            )}
          </>
        }
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <LoadingState />}
      {data && groups.length === 0 && <EmptyState text="No hay microredes ni establecimientos a tu cargo." />}
      <div className="grid gap-6">
        {groups.map(({ network, title, facilities }) => (
          <Panel key={network?.id ?? title}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Network className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {network && <Pill tone="primary">{network.code}</Pill>}
                    {network && !network.active && <Pill>Inactiva</Pill>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {network?.network ?? (title === "Establecimientos sin microred" ? "Asígnalos a una microred para que sus admins los vean" : "Red de Salud")}
                  </p>
                  {network && (
                    <div className="mt-2 flex flex-wrap gap-4">
                      <Counter icon={Building2} value={network.facility_count} label="EE.SS." />
                      <Counter icon={ClipboardList} value={network.pregnancy_count} label="gestantes" />
                      <Counter icon={Users} value={network.user_count} label="usuarios" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {network && can("micro_network.put") && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ kind: "network", network })}>
                    <Pencil /> Editar
                  </Button>
                )}
                {network && can("health_facility.post") && (
                  <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "facility", networkId: network.id })}>
                    <Plus /> EE.SS.
                  </Button>
                )}
              </div>
            </div>
            {facilities.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">Sin establecimientos.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Establecimiento</TableHead>
                      <TableHead>RENAES</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-right">Gestantes</TableHead>
                      <TableHead className="text-right">Usuarios</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilities.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <strong className="block font-medium">{f.name}</strong>
                          <small className="text-xs text-muted-foreground">
                            {f.category ?? "—"} · {f.code}
                          </small>
                          {!f.active && <Pill className="ml-2">Inactivo</Pill>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.renaes ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[f.district, f.province].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(f.pregnancy_count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(f.user_count)}</TableCell>
                        <TableCell className="text-right">
                          {can("health_facility.put") && (
                            <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditing({ kind: "facility", facility: f })}>
                              <Pencil />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        ))}
      </div>
      {editing?.kind === "network" && <NetworkForm network={editing.network} onClose={() => setEditing(null)} onSaved={done} />}
      {editing?.kind === "facility" && data && (
        <FacilityForm
          facility={editing.facility}
          networks={data.networks}
          defaultNetwork={editing.networkId}
          onClose={() => setEditing(null)}
          onSaved={done}
        />
      )}
    </>
  );
}
