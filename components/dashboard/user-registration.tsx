"use client";

import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { ErrorState } from "@/components/common/feedback";
import { PageHeading } from "@/components/common/page-heading";
import { Panel } from "@/components/common/panel";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createUser, loadUserFormOptions } from "@/lib/actions/users";
import type { User } from "@/lib/api/types";
import { roleTitle } from "@/lib/format";
import { useSession } from "./session";
import styles from "./forms.module.css";

export function UserRegistration() {
  const { profile } = useSession();
  const options = useBackendQuery("user-form-options", loadUserFormOptions);
  const scope = profile.health_facility_id;
  const facilities = (options.data?.facilities ?? []).filter((f) => !scope || f.id === scope);
  const { run, pending } = useBackendAction();
  const [created, setCreated] = useState<User | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const result = await run(
      createUser({
        full_name: value("full_name"),
        email: value("email"),
        username: value("username") || null,
        role_id: value("role_id"),
        password: String(form.get("password") ?? ""),
        dni: value("dni") || null,
        phone: value("phone") || null,
        health_facility_id: scope ?? (value("health_facility_id") || null),
      }),
    );
    if (result) {
      setCreated(result.data);
      setFormKey((k) => k + 1);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="GESTIÓN DE ACCESOS"
        title="Registrar usuario"
        subtitle="Solo puedes asignar roles cuyos permisos también tienes."
      />
      <Panel className={styles.card}>
        <h2 style={{ margin: "22px 0 5px" }}>Datos del nuevo usuario</h2>
        <p style={{ margin: "0 0 18px", fontSize: 11, color: "#9aa7ae" }}>
          Completa la información y asigna un rol. La persona deberá cambiar la contraseña temporal al ingresar.
        </p>
        {created && (
          <div className={styles.notice}>
            Usuario <b>{created.username}</b> ({created.full_name}) registrado con rol {roleTitle(created.role)}.
          </div>
        )}
        {options.error && <ErrorState error={options.error} onRetry={options.reload} />}
        <form key={formKey} onSubmit={onSubmit}>
          <div className={styles.grid}>
            <label>
              Nombre completo *
              <input name="full_name" required maxLength={200} placeholder="Ej. Ana García" />
            </label>
            <label>
              Correo electrónico *
              <input name="email" type="email" required maxLength={255} placeholder="usuario@salud.gob.pe" />
            </label>
            <label>
              Usuario <span className={styles.hint}>(opcional, por defecto el correo)</span>
              <input name="username" maxLength={100} pattern="\S+" title="Sin espacios" placeholder="agarcia" />
            </label>
            <label>
              Rol *
              <select name="role_id" required defaultValue="">
                <option value="" disabled>
                  {options.loading ? "Cargando roles..." : "Selecciona un rol"}
                </option>
                {options.data?.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {roleTitle(role.name)}
                    {role.description ? ` — ${role.description}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Establecimiento{" "}
              <span className={styles.hint}>
                {scope ? "(solo puedes registrar usuarios de tu establecimiento)" : "(limita lo que la persona puede ver)"}
              </span>
              {scope ? (
                <input value={profile.health_facility_name ?? ""} disabled readOnly />
              ) : (
                <select name="health_facility_id" defaultValue="">
                  <option value="">Todos los establecimientos</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label>
              DNI
              <input name="dni" inputMode="numeric" pattern="[0-9]{8}" title="8 dígitos" maxLength={8} />
            </label>
            <label>
              Teléfono
              <input name="phone" maxLength={30} />
            </label>
            <label>
              Contraseña temporal *
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres, letras y números"
              />
            </label>
          </div>
          <div className={styles.actions} style={{ justifyContent: "flex-start", marginBottom: 24 }}>
            <button className={buttons.primary} disabled={pending}>
              <UserPlus size={16} /> {pending ? "Registrando..." : "Registrar usuario"}
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
