"use client";

import { Pencil, Plus, RotateCcw, ShieldCheck, Trash, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Pill } from "@/components/common/badges";
import { ErrorState, LoadingState } from "@/components/common/feedback";
import { Field, FormActions, FormGrid } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createRole, deleteRole, loadRoles, updateRole } from "@/lib/actions/roles";
import type { Permission, Role } from "@/lib/api/types";
import { roleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Resumen",
  pregnancy: "Registros de gestantes",
  prenatal_control: "Controles prenatales",
  data_import: "Importaciones",
  health_facility: "Establecimientos",
  micro_network: "Microredes",
  user: "Usuarios",
  role: "Roles",
  permission: "Permisos",
  backup: "Backups",
  device: "Dispositivos",
  session: "Sesiones",
  audit_log: "Auditoría",
};

const moduleLabel = (module: string) => MODULE_LABELS[module] ?? module.replaceAll("_", " ");

function RoleForm({
  role,
  permissions,
  mine,
  onClose,
  onSaved,
}: {
  role?: Role;
  permissions: Permission[];
  mine: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { run, pending } = useBackendAction();
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permission_ids ?? []));
  const locked = role?.name === "admin";

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) map.set(p.module, [...(map.get(p.module) ?? []), p]);
    return [...map.entries()];
  }, [permissions]);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const input = locked ? { description } : { name, description, permission_ids: [...selected] };
    const result = await run(role ? updateRole(role.id, input) : createRole({ name, description, permission_ids: [...selected] }));
    if (result) onSaved();
  }

  return (
    <Modal
      title={role ? `Editar rol ${roleTitle(role.name)}` : "Crear rol"}
      description={
        locked
          ? "El rol admin tiene acceso total y sus permisos no se pueden cambiar."
          : "Solo puedes otorgar permisos que tú también tienes."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={onSubmit}>
        <FormGrid>
          <Field label="Nombre *">
            <Input
              name="name"
              required
              minLength={2}
              maxLength={60}
              defaultValue={role?.name}
              disabled={role?.is_system}
              placeholder="ej. obstetra"
            />
          </Field>
          <Field label="Descripción">
            <Input name="description" maxLength={300} defaultValue={role?.description ?? ""} placeholder="ej. Registra controles" />
          </Field>
        </FormGrid>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {groups.map(([module, items]) => {
            const ids = items.map((p) => p.id);
            const count = ids.filter((id) => selected.has(id)).length;
            const all = count === ids.length;
            return (
              <div className="rounded-xl border p-4" key={module}>
                <label className="mb-3 flex items-center gap-2.5 border-b pb-3">
                  <Checkbox
                    checked={all}
                    indeterminate={count > 0 && !all}
                    disabled={locked}
                    onCheckedChange={(on) => toggle(ids.filter((id) => mine.includes(id)), on)}
                  />
                  <span className="flex-1 text-sm font-semibold">{moduleLabel(module)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {count}/{ids.length}
                  </span>
                </label>
                <div className="space-y-2.5">
                  {items.map((p) => {
                    const disabled = locked || !mine.includes(p.id);
                    return (
                      <label key={p.id} className={cn("flex items-start gap-2.5 text-sm", disabled && "opacity-60")}>
                        <Checkbox
                          className="mt-0.5"
                          checked={selected.has(p.id)}
                          disabled={disabled}
                          onCheckedChange={(on) => toggle([p.id], on)}
                        />
                        <span className="min-w-0">
                          {p.description ?? p.code}
                          <code className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">{p.code}</code>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <FormActions className="border-t pt-5">
          <span className="mr-auto text-sm text-muted-foreground">{selected.size} permisos seleccionados</span>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : role ? "Guardar cambios" : "Crear rol"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}

export function RolesPermissions() {
  const { profile, can } = useSession();
  const { data, error, loading, reload } = useBackendQuery("roles", loadRoles);
  const { run, pending } = useBackendAction();
  const [editing, setEditing] = useState<Role | "new" | null>(null);

  const mine = useMemo(
    () => (data?.permissions ?? []).filter((p) => profile.permissions.includes(p.code)).map((p) => p.id),
    [data, profile.permissions],
  );

  async function remove(role: Role) {
    const msg = role.user_count
      ? `El rol ${roleTitle(role.name)} tiene usuarios: se desactivará en lugar de eliminarse. ¿Continuar?`
      : `¿Eliminar el rol ${roleTitle(role.name)}?`;
    if (!window.confirm(msg)) return;
    if (await run(deleteRole(role.id))) reload();
  }

  async function reactivate(role: Role) {
    if (await run(updateRole(role.id, { is_active: true }))) reload();
  }

  return (
    <>
      <PageHeading
        eyebrow="Administración"
        title="Roles y permisos"
        subtitle="Crea roles personalizados y define qué puede hacer cada usuario."
        action={
          can("role.post") && (
            <Button size="lg" onClick={() => setEditing("new")}>
              <Plus /> Crear rol
            </Button>
          )
        }
      />
      <Panel>
        <PanelHeading title="Roles del sistema" description="Configura permisos por nivel de acceso." />
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <LoadingState />}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.roles.map((role) => {
            const modules = [...new Set(role.permissions.map((c) => c.split(".")[0]))];
            return (
              <article
                key={role.id}
                className={cn("flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-sm", !role.is_active && "bg-muted/40")}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong className="text-base font-semibold">{roleTitle(role.name)}</strong>
                      {!role.is_active && <Pill>Inactivo</Pill>}
                      {role.is_system && <Pill tone="info">Sistema</Pill>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{role.description ?? "Sin descripción"}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {role.user_count} usuario(s)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> {role.permissions.length} permisos
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {modules.length === 0 && <span className="text-xs text-muted-foreground italic">Sin permisos</span>}
                  {modules.map((m) => (
                    <Pill key={m} tone="primary" className="h-5 px-2 text-[11px]">
                      {moduleLabel(m)}
                    </Pill>
                  ))}
                </div>
                <div className="min-h-4 flex-1" />
                <div className="flex flex-wrap gap-1 border-t pt-3 empty:hidden">
                  {can("role.put") && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(role)}>
                      <Pencil /> Editar
                    </Button>
                  )}
                  {can("role.put") && !role.is_active && (
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => reactivate(role)}>
                      <RotateCcw /> Reactivar
                    </Button>
                  )}
                  {can("role.delete") && !role.is_system && role.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={pending}
                      onClick={() => remove(role)}
                    >
                      <Trash /> Eliminar
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
      {editing && data && (
        <RoleForm
          role={editing === "new" ? undefined : editing}
          permissions={data.permissions}
          mine={mine}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
