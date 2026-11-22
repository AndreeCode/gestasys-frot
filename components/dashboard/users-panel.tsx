"use client";

import { KeyRound, Lock, LockOpen, UserCheck, UserX, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/feedback";
import { Modal } from "@/components/common/modal";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { deleteUser, loadUsers, resetUserMfa, updateUser } from "@/lib/actions/users";
import type { User } from "@/lib/api/types";
import { formatDateTime, roleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "./session";
import forms from "./forms.module.css";
import styles from "./permissions.module.css";

type Dialog = { kind: "block" | "password" | "role" | "facility"; user: User } | null;

export function UsersPanel({ onRegister }: { onRegister?: () => void }) {
  const { profile, can } = useSession();
  const canMoveFacility = !profile.health_facility_id;
  const { data, error, loading, reload } = useBackendQuery("users", loadUsers);
  const { run, pending } = useBackendAction();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.users ?? []).filter((u) => {
      if (status === "active" && (!u.active || u.blocked)) return false;
      if (status === "inactive" && u.active) return false;
      if (status === "blocked" && !u.blocked) return false;
      return !q || [u.full_name, u.username, u.email, u.dni ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, query, status]);

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

  async function deactivate(user: User) {
    if (!window.confirm(`¿Desactivar la cuenta de ${user.full_name}? Se cerrarán sus sesiones.`)) return;
    if (await run(deleteUser(user.id))) reload();
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
      await save(dialog.user, { health_facility_id: String(form.get("health_facility_id") ?? "") || null });
    } else {
      await save(dialog.user, { role_id: String(form.get("role_id") ?? "") });
    }
  }

  const activeCount = (data?.users ?? []).filter((u) => u.active && !u.blocked).length;

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRACIÓN"
        title="Usuarios"
        subtitle="Administra las cuentas y roles del equipo."
        action={
          onRegister && (
            <button className={buttons.primary} onClick={onRegister}>
              <Users size={16} /> Registrar usuario
            </button>
          )
        }
      />
      <Panel>
        <PanelHeading
          title="Usuarios registrados"
          description={data ? `${activeCount} cuentas activas de ${data.users.length}` : "Cargando..."}
        />
        <div className={styles.toolbar}>
          <input placeholder="Buscar por nombre, usuario, correo o DNI..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <LoadingState />}
        {data && users.length === 0 && <EmptyState text="No hay usuarios que coincidan." />}
        <div className={styles.list}>
          {users.map((user) => {
            const self = user.id === profile.id;
            return (
              <div key={user.id} className={styles.userRow}>
                <div>
                  <strong>
                    {user.full_name}
                    {self ? " (tú)" : ""}
                  </strong>
                  <small>
                    {user.username} · {user.email}
                  </small>
                </div>
                <div>
                  <span>{roleTitle(user.role)}</span>
                  <small>{user.health_facility_name ?? "Todos los establecimientos"}</small>
                  <small>Último ingreso: {formatDateTime(user.last_login_at)}</small>
                </div>
                <div>
                  {!user.active ? (
                    <span className={cn(styles.badge, styles.off)}>Inactiva</span>
                  ) : user.blocked ? (
                    <span className={cn(styles.badge, styles.blocked)} title={user.blocked_reason ?? ""}>
                      Bloqueada
                    </span>
                  ) : (
                    <span className={styles.badge}>Activa</span>
                  )}
                  {user.must_change_password && <span className={cn(styles.badge, styles.temp)}>Contraseña temporal</span>}
                  {user.mfa_enabled && <span className={styles.badge}>2 pasos</span>}
                  {user.blocked && user.blocked_reason && <small>{user.blocked_reason}</small>}
                </div>
                {can("user.put") && !self ? (
                  <div className={styles.rowActions}>
                    <button className={buttons.ghost} title="Cambiar rol" onClick={() => setDialog({ kind: "role", user })}>
                      Rol
                    </button>
                    {canMoveFacility && (
                      <button
                        className={buttons.ghost}
                        title="Cambiar establecimiento"
                        onClick={() => setDialog({ kind: "facility", user })}
                      >
                        EESS
                      </button>
                    )}
                    <button className={buttons.ghost} title="Resetear contraseña" onClick={() => setDialog({ kind: "password", user })}>
                      <KeyRound size={13} />
                    </button>
                    {user.mfa_enabled && (
                      <button className={buttons.ghost} title="Restablecer verificación en dos pasos" disabled={pending} onClick={() => resetMfa(user)}>
                        2FA
                      </button>
                    )}
                    {user.blocked ? (
                      <button className={buttons.ghost} title="Desbloquear" disabled={pending} onClick={() => save(user, { blocked: false })}>
                        <LockOpen size={13} />
                      </button>
                    ) : (
                      <button className={cn(buttons.ghost, buttons.red)} title="Bloquear" onClick={() => setDialog({ kind: "block", user })}>
                        <Lock size={13} />
                      </button>
                    )}
                    {user.active ? (
                      can("user.delete") && (
                        <button className={cn(buttons.ghost, buttons.red)} title="Desactivar" disabled={pending} onClick={() => deactivate(user)}>
                          <UserX size={13} />
                        </button>
                      )
                    ) : (
                      <button className={buttons.ghost} title="Reactivar" disabled={pending} onClick={() => save(user, { active: true })}>
                        <UserCheck size={13} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {dialog && (
        <Modal
          title={
            dialog.kind === "block"
              ? `Bloquear a ${dialog.user.full_name}`
              : dialog.kind === "password"
                ? `Resetear contraseña de ${dialog.user.full_name}`
                : dialog.kind === "facility"
                  ? `Establecimiento de ${dialog.user.full_name}`
                  : `Cambiar rol de ${dialog.user.full_name}`
          }
          description={
            dialog.kind === "block"
              ? "Se cerrarán todas sus sesiones y no podrá ingresar hasta que la desbloquees."
              : dialog.kind === "password"
                ? "Se cerrarán sus sesiones y deberá cambiar esta contraseña temporal al ingresar."
                : dialog.kind === "facility"
                  ? "Con un establecimiento asignado solo verá y registrará gestantes de ese establecimiento."
                  : "Solo aparecen los roles que tú puedes asignar."
          }
          onClose={() => setDialog(null)}
        >
          <form onSubmit={onDialogSubmit}>
            <div className={forms.grid}>
              {dialog.kind === "block" && (
                <label className={forms.full}>
                  Motivo del bloqueo *
                  <input name="reason" required maxLength={300} autoFocus />
                </label>
              )}
              {dialog.kind === "password" && (
                <label className={forms.full}>
                  Nueva contraseña temporal *
                  <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" autoFocus />
                </label>
              )}
              {dialog.kind === "facility" && (
                <label className={forms.full}>
                  Establecimiento
                  <select name="health_facility_id" defaultValue={dialog.user.health_facility_id ?? ""}>
                    <option value="">Todos los establecimientos</option>
                    {dialog.user.health_facility_id &&
                      !data?.facilities.some((f) => f.id === dialog.user.health_facility_id) && (
                        <option value={dialog.user.health_facility_id}>{dialog.user.health_facility_name}</option>
                      )}
                    {data?.facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {dialog.kind === "role" && (
                <label className={forms.full}>
                  Rol
                  <select name="role_id" defaultValue={dialog.user.role_id} required>
                    {!data?.roles.some((r) => r.id === dialog.user.role_id) && (
                      <option value={dialog.user.role_id}>{roleTitle(dialog.user.role)}</option>
                    )}
                    {data?.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {roleTitle(r.name)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className={forms.actions}>
              <button type="button" className={buttons.outline} onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button className={buttons.primary} disabled={pending}>
                {pending ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
