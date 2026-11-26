"use client";

import { Lock, LockOpen, Search, ShieldOff, UserCheck, UserCog, UserPlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Pill } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingState, Pagination } from "@/components/common/feedback";
import { Field, FormActions, FormGrid } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { loadUsers, resetUserMfa, updateUser } from "@/lib/actions/users";
import type { HealthFacility, MicroNetwork, User } from "@/lib/api/types";
import { avatarColor, formatDateTime, initials, roleTitle, scopeLabel } from "@/lib/format";
import { useSession } from "./session";

type Dialog = { kind: "block" | "password" | "role" | "facility"; user: User } | null;

const PAGE = 15;

/** Valor del selector de ámbito: "" = toda la red, "mn:<id>" = microred, "hf:<id>" = establecimiento. */
export function scopeValue(user: { micro_network_id: string | null; health_facility_id: string | null }) {
  return user.health_facility_id ? `hf:${user.health_facility_id}` : user.micro_network_id ? `mn:${user.micro_network_id}` : "";
}

export function parseScope(value: string) {
  return {
    micro_network_id: value.startsWith("mn:") ? value.slice(3) : null,
    health_facility_id: value.startsWith("hf:") ? value.slice(3) : null,
  };
}

export function ScopeOptions({
  networks,
  facilities,
  allowNetwork,
}: {
  networks: MicroNetwork[];
  facilities: HealthFacility[];
  allowNetwork: boolean;
}) {
  return (
    <>
      {allowNetwork && <NativeSelectOption value="">Toda la red de salud</NativeSelectOption>}
      {networks.length > 0 && (
        <NativeSelectOptGroup label="Microred (admin: ve todos sus EE.SS.)">
          {networks.map((n) => (
            <NativeSelectOption key={n.id} value={`mn:${n.id}`}>
              {n.name}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
      )}
      <NativeSelectOptGroup label="Establecimiento (registrador o admin de sede)">
        {facilities.map((f) => (
          <NativeSelectOption key={f.id} value={`hf:${f.id}`}>
            {f.name}
            {f.micro_network_name ? ` — ${f.micro_network_name}` : ""}
          </NativeSelectOption>
        ))}
      </NativeSelectOptGroup>
    </>
  );
}

export function UsersPanel({ onRegister }: { onRegister?: () => void }) {
  const { profile, can } = useSession();
  const canMoveFacility = !profile.health_facility_id;
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useBackendQuery("users", loadUsers);
  const { run, pending } = useBackendAction();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<User | null>(null);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.users ?? []).filter((u) => {
      if (status === "active" && (!u.active || u.blocked)) return false;
      if (status === "inactive" && u.active) return false;
      if (status === "blocked" && !u.blocked) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      return !q || [u.full_name, u.username, u.email, u.dni ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, query, status, roleFilter]);
  const offset = Math.min(page * PAGE, Math.max(0, Math.floor((users.length - 1) / PAGE) * PAGE));
  const visible = users.slice(offset, offset + PAGE);

  async function save(user: User, input: Parameters<typeof updateUser>[1], text?: string) {
    if (await run(updateUser(user.id, input), text)) {
      setDialog(null);
      reload();
    }
  }

  async function resetMfa(user: User) {
    if (!window.confirm(`¿Restablecer la verificación en dos pasos de ${user.full_name}? Se cerrarán sus sesiones y deberá configurarla de nuevo.`)) return;
    if (await run(resetUserMfa(user.id))) reload();
  }


  async function onDialogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    if (dialog.kind === "block") {
      await save(dialog.user, { blocked: true, blocked_reason: String(form.get("reason") ?? "").trim() });
    } else if (dialog.kind === "password") {
      await save(
        dialog.user,
        { password: String(form.get("password") ?? "") },
        "Contraseña reseteada: el usuario deberá cambiarla al ingresar",
      );
    } else if (dialog.kind === "facility") {
      await save(dialog.user, parseScope(String(form.get("scope") ?? "")));
    } else {
      await save(dialog.user, { role_id: String(form.get("role_id") ?? "") });
    }
  }

  const activeCount = (data?.users ?? []).filter((u) => u.active && !u.blocked).length;

  return (
    <>
      <PageHeading
        eyebrow="Administración"
        title="Usuarios"
        subtitle="Administra las cuentas y roles del equipo."
        action={
          onRegister && (
            <Button size="lg" onClick={onRegister}>
              <UserPlus /> Registrar usuario
            </Button>
          )
        }
      />
      <Panel>
        <PanelHeading
          title="Usuarios registrados"
          description={data ? `${activeCount} cuentas activas de ${data.users.length}` : "Cargando..."}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, usuario, correo o DNI..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              aria-label="Buscar usuarios"
            />
          </div>
          <NativeSelect
            className="w-full sm:w-44"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filtrar por rol"
          >
            <NativeSelectOption value="">Todos los roles</NativeSelectOption>
            {[...new Set((data?.users ?? []).map((u) => u.role))].map((r) => (
              <NativeSelectOption key={r} value={r}>
                {roleTitle(r)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            className="w-full sm:w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            aria-label="Filtrar por estado"
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            <NativeSelectOption value="active">Activos</NativeSelectOption>
            <NativeSelectOption value="inactive">Inactivos</NativeSelectOption>
            <NativeSelectOption value="blocked">Bloqueados</NativeSelectOption>
          </NativeSelect>
        </div>
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <LoadingState />}
        {data && users.length === 0 && <EmptyState text="No hay usuarios que coincidan." />}
        {users.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {visible.map((user) => {
              const self = user.id === profile.id;
              return (
                <li
                  key={user.id}
                  className="grid gap-3 p-4 transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                      style={{ background: avatarColor(user.username) }}
                    >
                      {initials(user.full_name)}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-medium">
                        {user.full_name}
                        {self && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                      </strong>
                      <small className="block truncate text-xs text-muted-foreground">
                        {user.username} · {user.email}
                      </small>
                    </div>
                  </div>
                  <div className="min-w-0 text-sm">
                    <span className="block font-medium">{roleTitle(user.role)}</span>
                    <small className="block truncate text-xs text-muted-foreground">{scopeLabel(user)}</small>
                    <small className="block text-xs text-muted-foreground">Último ingreso: {formatDateTime(user.last_login_at)}</small>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!user.active ? (
                      <Pill dot>Inactiva</Pill>
                    ) : user.blocked ? (
                      <Pill tone="danger" dot title={user.blocked_reason ?? ""}>
                        Bloqueada
                      </Pill>
                    ) : (
                      <Pill tone="success" dot>
                        Activa
                      </Pill>
                    )}
                    {user.must_change_password && <Pill tone="warning">Contraseña temporal</Pill>}
                    {user.mfa_enabled && <Pill tone="primary">2 pasos</Pill>}
                    {user.blocked && user.blocked_reason && (
                      <small className="w-full text-xs text-muted-foreground">{user.blocked_reason}</small>
                    )}
                  </div>
                  {can("user.put") && !self ? (
                    <div className="flex flex-wrap gap-1.5 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                        <UserCog /> Editar
                      </Button>
                      {!user.active ? (
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => save(user, { active: true, blocked: false })}>
                          <UserCheck /> Dar acceso
                        </Button>
                      ) : user.blocked ? (
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => save(user, { blocked: false })}>
                          <LockOpen /> Dar acceso
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => setDialog({ kind: "block", user })}>
                          <Lock /> Cortar acceso
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="hidden lg:block" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Pagination total={users.length} limit={PAGE} offset={offset} onChange={(next) => setPage(Math.floor(next / PAGE))} />
      </Panel>

      {editing && data && (
        <UserEditDialog
          user={editing}
          roles={data.roles}
          networks={data.networks}
          facilities={data.facilities}
          allowNetwork={profile.scope_level === "network"}
          canMoveScope={canMoveFacility}
          canDelete={can("user.delete")}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onResetMfa={() => resetMfa(editing)}
        />
      )}

      {dialog && (
        <Modal
          title={
            dialog.kind === "block"
              ? `Cortar acceso a ${dialog.user.full_name}`
              : dialog.kind === "password"
                ? `Resetear contraseña de ${dialog.user.full_name}`
                : dialog.kind === "facility"
                  ? `Ámbito de ${dialog.user.full_name}`
                  : `Cambiar rol de ${dialog.user.full_name}`
          }
          description={
            dialog.kind === "block"
              ? "Se cerrarán todas sus sesiones al instante y no podrá ingresar hasta que le des acceso de nuevo."
              : dialog.kind === "password"
                ? "Se cerrarán sus sesiones y deberá cambiar esta contraseña temporal al ingresar."
                : dialog.kind === "facility"
                  ? "Con una microred verá todos sus establecimientos; con un EE.SS. solo ese. Sin ninguno ve toda la red."
                  : "Solo aparecen los roles que tú puedes asignar."
          }
          onClose={() => setDialog(null)}
        >
          <form onSubmit={onDialogSubmit}>
            {dialog.kind === "block" && (
              <Field label="Motivo *">
                <Input name="reason" required maxLength={300} autoFocus />
              </Field>
            )}
            {dialog.kind === "password" && (
              <Field label="Nueva contraseña temporal *">
                <Input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" autoFocus />
              </Field>
            )}
            {dialog.kind === "facility" && (
              <Field label="Microred o establecimiento">
                <NativeSelect className="w-full" name="scope" defaultValue={scopeValue(dialog.user)}>
                  <ScopeOptions
                    networks={data?.networks ?? []}
                    facilities={data?.facilities ?? []}
                    allowNetwork={profile.scope_level === "network"}
                  />
                </NativeSelect>
              </Field>
            )}
            {dialog.kind === "role" && (
              <Field label="Rol">
                <NativeSelect className="w-full" name="role_id" defaultValue={dialog.user.role_id} required>
                  {!data?.roles.some((r) => r.id === dialog.user.role_id) && (
                    <NativeSelectOption value={dialog.user.role_id}>{roleTitle(dialog.user.role)}</NativeSelectOption>
                  )}
                  {data?.roles.map((r) => (
                    <NativeSelectOption key={r.id} value={r.id}>
                      {roleTitle(r.name)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <FormActions>
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant={dialog.kind === "block" ? "destructive" : "default"} disabled={pending}>
                {pending ? "Guardando..." : "Confirmar"}
              </Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </>
  );
}


function UserEditDialog({
  user,
  roles,
  networks,
  facilities,
  allowNetwork,
  canMoveScope,
  canDelete,
  onClose,
  onSaved,
  onResetMfa,
}: {
  user: User;
  roles: { id: string; name: string; description: string | null }[];
  networks: MicroNetwork[];
  facilities: HealthFacility[];
  allowNetwork: boolean;
  canMoveScope: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
  onResetMfa: () => void;
}) {
  const { run, pending } = useBackendAction();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const input: Parameters<typeof updateUser>[1] = {};
    if (value("full_name") !== user.full_name) input.full_name = value("full_name");
    if (value("email").toLowerCase() !== user.email) input.email = value("email");
    if (value("username").toLowerCase() !== user.username) input.username = value("username");
    if ((value("dni") || null) !== user.dni) input.dni = value("dni") || null;
    if ((value("phone") || null) !== user.phone) input.phone = value("phone") || null;
    if (value("role_id") !== user.role_id) input.role_id = value("role_id");
    if (canMoveScope && value("scope") !== scopeValue(user)) Object.assign(input, parseScope(value("scope")));
    const active = form.get("active") === "on";
    if (active !== user.active) input.active = active;
    if (value("password")) input.password = String(form.get("password"));
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    const text = input.password ? "Usuario actualizado: deberá cambiar la contraseña temporal al ingresar" : undefined;
    if (await run(updateUser(user.id, input), text)) onSaved();
  }

  return (
    <Modal title={`Editar a ${user.full_name}`} description={`${roleTitle(user.role)} · ${scopeLabel(user)}`} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormGrid>
          <Field label="Nombre completo *">
            <Input name="full_name" required maxLength={200} defaultValue={user.full_name} />
          </Field>
          <Field label="Correo *">
            <Input name="email" type="email" required maxLength={255} defaultValue={user.email} />
          </Field>
          <Field label="Usuario *">
            <Input name="username" required maxLength={100} pattern="\S+" title="Sin espacios" defaultValue={user.username} />
          </Field>
          <Field label="DNI">
            <Input name="dni" inputMode="numeric" pattern="[0-9]{8}" title="8 dígitos" maxLength={8} defaultValue={user.dni ?? ""} />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" maxLength={30} defaultValue={user.phone ?? ""} />
          </Field>
          <Field label="Rol *">
            <NativeSelect className="w-full" name="role_id" required defaultValue={user.role_id}>
              {!roles.some((r) => r.id === user.role_id) && <NativeSelectOption value={user.role_id}>{roleTitle(user.role)}</NativeSelectOption>}
              {roles.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {roleTitle(r.name)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {canMoveScope && (
            <Field label="Microred o establecimiento" className="sm:col-span-2">
              <NativeSelect className="w-full" name="scope" defaultValue={scopeValue(user)}>
                <ScopeOptions networks={networks} facilities={facilities} allowNetwork={allowNetwork} />
              </NativeSelect>
            </Field>
          )}
        </FormGrid>

        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-1 text-sm font-semibold">Acceso y seguridad</legend>
          <Field label="Nueva contraseña temporal" hint="(déjala vacía para no cambiarla)">
            <Input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
          </Field>
          <p className="text-xs text-muted-foreground">Al cambiarla se cierran sus sesiones y deberá crear una propia al ingresar.</p>
          {canDelete && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={user.active} className="size-4 accent-primary" />
              Cuenta activa (desmárcala para darla de baja)
            </label>
          )}
          {!canDelete && <input type="hidden" name="active" value={user.active ? "on" : ""} />}
          {user.mfa_enabled && (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onResetMfa}>
              <ShieldOff /> Restablecer verificación en dos pasos
            </Button>
          )}
        </fieldset>

        <FormActions className="mt-0 border-t pt-5">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
