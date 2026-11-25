"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Field, FormActions, FormGrid, full } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useBackendAction } from "@/hooks/use-backend";
import { createPregnancy, updatePregnancy } from "@/lib/actions/pregnancies";
import type { HealthFacility, Pregnancy, PregnancyInput, PregnancyStatus, RiskLevel } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS } from "@/lib/format";

const text = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
};
const int = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === null ? null : Number.parseInt(value, 10);
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function RecordForm({
  record,
  facilities,
  onClose,
  onSaved,
}: {
  record?: Pregnancy;
  facilities: HealthFacility[];
  onClose: () => void;
  onSaved: (saved: Pregnancy) => void;
}) {
  const { run, pending } = useBackendAction();
  const [status, setStatus] = useState<PregnancyStatus>(record?.status ?? "pending");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: PregnancyInput = {
      dni: text(form, "dni"),
      first_names: text(form, "first_names") ?? "",
      last_names: text(form, "last_names") ?? "",
      birth_date: text(form, "birth_date") ?? "",
      phone: text(form, "phone"),
      address: text(form, "address"),
      clinical_record: text(form, "clinical_record"),
      insurance: text(form, "insurance"),
      district: text(form, "district"),
      locality: text(form, "locality"),
      health_facility_id: text(form, "health_facility_id") ?? "",
      last_menstrual_period: text(form, "last_menstrual_period"),
      expected_delivery_date: text(form, "expected_delivery_date"),
      gravida: int(form, "gravida"),
      parity: int(form, "parity"),
      risk_level: (text(form, "risk_level") ?? "low") as RiskLevel,
      status,
      delivery_date: status === "completed" ? text(form, "delivery_date") : null,
      notes: text(form, "notes"),
    };
    const result = await run(record ? updatePregnancy(record.id, input) : createPregnancy(input));
    if (result) onSaved(result.data);
  }

  const facilityOptions = record && !facilities.some((f) => f.id === record.health_facility_id)
    ? [...facilities, { id: record.health_facility_id, name: record.health_facility_name } as HealthFacility]
    : facilities;

  return (
    <Modal
      title={record ? `Editar ${record.code}` : "Nuevo registro de gestante"}
      description="Los campos marcados con * son obligatorios. La FPP se calcula desde la FUM si la dejas vacía."
      onClose={onClose}
      wide
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <Section title="Datos personales">
          <FormGrid cols={3}>
            <Field label="Nombres *">
              <Input name="first_names" required maxLength={120} defaultValue={record?.first_names} />
            </Field>
            <Field label="Apellidos *">
              <Input name="last_names" required maxLength={120} defaultValue={record?.last_names} />
            </Field>
            <Field label="DNI">
              <Input name="dni" inputMode="numeric" pattern="[0-9]{8}" title="8 dígitos" maxLength={8} defaultValue={record?.dni ?? ""} />
            </Field>
            <Field label="Fecha de nacimiento *">
              <Input name="birth_date" type="date" required defaultValue={record?.birth_date} />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" maxLength={30} defaultValue={record?.phone ?? ""} />
            </Field>
            <Field label="Establecimiento *">
              <NativeSelect
                className="w-full"
                name="health_facility_id"
                required
                defaultValue={record?.health_facility_id ?? (facilityOptions.length === 1 ? facilityOptions[0].id : "")}
              >
                <NativeSelectOption value="" disabled>
                  Selecciona una sede
                </NativeSelectOption>
                {facilityOptions.map((f) => (
                  <NativeSelectOption key={f.id} value={f.id}>
                    {f.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Historia clínica">
              <Input name="clinical_record" maxLength={30} defaultValue={record?.clinical_record ?? ""} />
            </Field>
            <Field label="Seguro">
              <NativeSelect className="w-full" name="insurance" defaultValue={record?.insurance ?? ""}>
                <NativeSelectOption value="">—</NativeSelectOption>
                {["SIS", "ESSALUD", "Otro", "Ninguno"]
                  .concat(record?.insurance && !["SIS", "ESSALUD", "Otro", "Ninguno"].includes(record.insurance) ? [record.insurance] : [])
                  .map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {value}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Distrito">
              <Input name="district" maxLength={100} defaultValue={record?.district ?? ""} />
            </Field>
            <Field label="Localidad / sector">
              <Input name="locality" maxLength={150} defaultValue={record?.locality ?? ""} />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <Input name="address" defaultValue={record?.address ?? ""} />
            </Field>
          </FormGrid>
        </Section>

        <Section title="Embarazo">
          <FormGrid cols={3}>
            <Field label="FUM" hint="(última menstruación)">
              <Input name="last_menstrual_period" type="date" defaultValue={record?.last_menstrual_period ?? ""} />
            </Field>
            <Field label="FPP" hint="(probable de parto)">
              <Input name="expected_delivery_date" type="date" defaultValue={record?.expected_delivery_date ?? ""} />
            </Field>
            <Field label="Riesgo">
              <NativeSelect className="w-full" name="risk_level" defaultValue={record?.risk_level ?? "low"}>
                {(Object.keys(RISK_LABELS) as RiskLevel[]).map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {RISK_LABELS[r]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Gestaciones (G)">
              <Input name="gravida" type="number" min={1} max={30} defaultValue={record?.gravida ?? ""} />
            </Field>
            <Field label="Partos (P)">
              <Input name="parity" type="number" min={0} max={30} defaultValue={record?.parity ?? ""} />
            </Field>
            <Field label="Estado">
              <NativeSelect
                className="w-full"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PregnancyStatus)}
              >
                {(Object.keys(STATUS_LABELS) as PregnancyStatus[]).map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {status === "completed" && (
              <Field label="Fecha de parto">
                <Input name="delivery_date" type="date" defaultValue={record?.delivery_date ?? ""} />
              </Field>
            )}
            <Field label="Observaciones" className={full}>
              <Textarea name="notes" defaultValue={record?.notes ?? ""} />
            </Field>
          </FormGrid>
        </Section>

        <FormActions className="mt-0 border-t pt-5">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : record ? "Guardar cambios" : "Crear registro"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
