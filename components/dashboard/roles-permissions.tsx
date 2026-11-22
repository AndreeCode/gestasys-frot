"use client";

import { Pencil, Trash } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { ErrorState, LoadingState } from "@/components/common/feedback";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createRole, deleteRole, loadRoles, updateRole } from "@/lib/actions/roles";
import type { Permission, Role } from "@/lib/api/types";
import { roleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";
import forms from "./forms.module.css";
import styles from "./permissions.module.css";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Resumen",
  pregnancy: "Registros de gestantes",
  prenatal_control: "Controles prenatales",
  data_import: "Importaciones",
  health_facility: "Establecimientos",
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
        <div className={forms.grid}>
          <label>
            Nombre *
            <input
              name="name"
              required
              minLength={2}
              maxLength={60}
              defaultValue={role?.name}
              disabled={role?.is_system}
              placeholder="ej. obstetra"
            />
          </label>
          <label>
            Descripción
            <input name="description" maxLength={300} defaultValue={role?.description ?? ""} placeholder="ej. Registra controles" />
          </label>
        </div>
        <div className={styles.permGroups}>
          {groups.map(([module, items]) => {
            const ids = items.map((p) => p.id);
            const all = ids.every((id) => selected.has(id));
            return (
              <div className={styles.permGroup} key={module}>
                <h4>
                  <input
                    type="checkbox"
                    checked={all}
                    disabled={locked}
                    onChange={(e) => toggle(ids.filter((id) => mine.includes(id)), e.target.checked)}
                  />
                  {moduleLabel(module)}
                </h4>
                {items.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      disabled={locked || !mine.includes(p.id)}
                      onChange={(e) => toggle([p.id], e.target.checked)}
                    />
                    <span>
                      {p.description ?? p.code} <code>{p.code}</code>
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        <div className={forms.actions}>
          <span className={forms.hint} style={{ marginRight: "auto" }}>
            {selected.size} permisos seleccionados
          </span>
          <button type="button" className={buttons.outline} onClick={onClose}>
            Cancelar
          </button>
          <button className={buttons.primary} disabled={pending}>
            {pending ? "Guardando..." : role ? "Guardar cambios" : "Crear rol"}
          </button>
        </div>
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
        eyebrow="ADMINISTRACIÓN"
        title="Roles y permisos"
        subtitle="Crea roles personalizados y define qué puede hacer cada usuario."
        action={
          can("role.post") && (
            <button className={buttons.primary} onClick={() => setEditing("new")}>
              <span>+</span> Crear rol
            </button>
          )
        }
      />
      <Panel>
        <PanelHeading title="Roles del sistema" description="Configura permisos por nivel de acceso." />
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <LoadingState />}
        <div className={styles.roles}>
          {data?.roles.map((role) => {
            const modules = [...new Set(role.permissions.map((c) => c.split(".")[0]))];
            return (
              <div key={role.id} className={styles.roleCard}>
                <div>
                  <strong>
                    {roleTitle(role.name)}
                    {!role.is_active && <span className={cn(styles.badge, styles.off)} style={{ marginLeft: 8 }}>Inactivo</span>}
                    {role.is_system && <span className={styles.badge} style={{ marginLeft: 8 }}>Sistema</span>}
                  </strong>
                  <span>
                    {role.description ?? "Sin descripción"} · {role.user_count} usuario(s) · {role.permissions.length} permisos
                  </span>
                </div>
                <div className={styles.rowActions}>
                  {can("role.put") && (
                    <button className={buttons.ghost} onClick={() => setEditing(role)}>
                      <Pencil size={13} /> Editar
                    </button>
                  )}
                  {can("role.put") && !role.is_active && (
                    <button className={buttons.ghost} disabled={pending} onClick={() => reactivate(role)}>
                      Reactivar
                    </button>
                  )}
                  {can("role.delete") && !role.is_system && role.is_active && (
                    <button className={cn(buttons.ghost, buttons.red)} disabled={pending} onClick={() => remove(role)}>
                      <Trash size={13} /> Eliminar
                    </button>
                  )}
                </div>
                <div className={styles.modules}>
                  {modules.length === 0 && <em>Sin permisos</em>}
                  {modules.map((m) => (
                    <em key={m}>{moduleLabel(m)}</em>
                  ))}
                </div>
              </div>
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
