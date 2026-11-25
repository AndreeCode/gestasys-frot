"use client";

import { CheckCircle2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ErrorState, Notice } from "@/components/common/feedback";
import { Field, FormActions, FormGrid } from "@/components/common/form";
import { PageHeading } from "@/components/common/page-heading";
import { Panel, PanelHeading } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import { createUser, loadUserFormOptions } from "@/lib/actions/users";
import type { User } from "@/lib/api/types";
import { roleTitle } from "@/lib/format";
import { useSession } from "./session";
import { ScopeOptions, parseScope } from "./users-panel";

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
        ...(scope ? { health_facility_id: scope } : parseScope(value("scope"))),
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
        eyebrow="Gestión de accesos"
        title="Registrar usuario"
        subtitle="Solo puedes asignar roles cuyos permisos también tienes."
      />
      <Panel className="max-w-4xl">
        <PanelHeading
          title="Datos del nuevo usuario"
          description="Completa la información y asigna un rol. La persona deberá cambiar la contraseña temporal al ingresar."
          icon={<UserPlus className="size-[18px]" />}
        />
        {created && (
          <Notice tone="success" className="mb-5 flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>
              Usuario <b>{created.username}</b> ({created.full_name}) registrado con rol {roleTitle(created.role)}.
            </span>
          </Notice>
        )}
        {options.error && <ErrorState error={options.error} onRetry={options.reload} />}
        <form key={formKey} onSubmit={onSubmit}>
          <FormGrid>
            <Field label="Nombre completo *">
              <Input name="full_name" required maxLength={200} placeholder="Ej. Ana García" />
            </Field>
            <Field label="Correo electrónico *">
              <Input name="email" type="email" required maxLength={255} placeholder="usuario@salud.gob.pe" />
            </Field>
            <Field label="Usuario" hint="(opcional, por defecto el correo)">
              <Input name="username" maxLength={100} pattern="\S+" title="Sin espacios" placeholder="agarcia" />
            </Field>
            <Field label="Rol *">
              <NativeSelect className="w-full" name="role_id" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  {options.loading ? "Cargando roles..." : "Selecciona un rol"}
                </NativeSelectOption>
                {options.data?.roles.map((role) => (
                  <NativeSelectOption key={role.id} value={role.id}>
                    {roleTitle(role.name)}
                    {role.description ? ` — ${role.description}` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Ámbito"
              hint={scope ? "(solo puedes registrar usuarios de tu establecimiento)" : "(qué gestantes podrá ver)"}
            >
              {scope ? (
                <Input value={profile.health_facility_name ?? ""} disabled readOnly />
              ) : (
                <NativeSelect className="w-full" name="scope" required={profile.scope_level !== "network"} defaultValue="">
                  {profile.scope_level !== "network" && (
                    <NativeSelectOption value="" disabled>
                      Elige la microred o el EE.SS.
                    </NativeSelectOption>
                  )}
                  <ScopeOptions
                    networks={options.data?.networks ?? []}
                    facilities={facilities}
                    allowNetwork={profile.scope_level === "network"}
                  />
                </NativeSelect>
              )}
            </Field>
            <Field label="DNI">
              <Input name="dni" inputMode="numeric" pattern="[0-9]{8}" title="8 dígitos" maxLength={8} />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" maxLength={30} />
            </Field>
            <Field label="Contraseña temporal *">
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres; mejor una frase larga"
              />
            </Field>
          </FormGrid>
          <FormActions className="justify-start border-t pt-5">
            <Button type="submit" size="lg" disabled={pending}>
              <UserPlus /> {pending ? "Registrando..." : "Registrar usuario"}
            </Button>
          </FormActions>
        </form>
      </Panel>
    </>
  );
}
