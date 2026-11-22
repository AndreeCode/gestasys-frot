"use client";

import { useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { Modal } from "@/components/common/modal";
import { useBackendAction } from "@/hooks/use-backend";
import { createPregnancy, updatePregnancy } from "@/lib/actions/pregnancies";
import type { HealthFacility, Pregnancy, PregnancyInput, PregnancyStatus, RiskLevel } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS } from "@/lib/format";
import styles from "./forms.module.css";

const text = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
};
const int = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === null ? null : Number.parseInt(value, 10);
};

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
      <form onSubmit={onSubmit}>
        <div className={`${styles.grid} ${styles.three}`}>
          <label>
            Nombres *
            <input name="first_names" required maxLength={120} defaultValue={record?.first_names} />
          </label>
          <label>
            Apellidos *
            <input name="last_names" required maxLength={120} defaultValue={record?.last_names} />
          </label>
          <label>
            DNI
            <input name="dni" inputMode="numeric" pattern="[0-9]{8}" title="8 dígitos" maxLength={8} defaultValue={record?.dni ?? ""} />
          </label>
          <label>
            Fecha de nacimiento *
            <input name="birth_date" type="date" required defaultValue={record?.birth_date} />
          </label>
          <label>
            Teléfono
            <input name="phone" maxLength={30} defaultValue={record?.phone ?? ""} />
          </label>
          <label>
            Establecimiento *
            <select name="health_facility_id" required defaultValue={record?.health_facility_id ?? ""}>
              <option value="" disabled>
                Selecciona una sede
              </option>
              {facilityOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.full}>
            Dirección
            <input name="address" defaultValue={record?.address ?? ""} />
          </label>
          <label>
            FUM <span className={styles.hint}>(última menstruación)</span>
            <input name="last_menstrual_period" type="date" defaultValue={record?.last_menstrual_period ?? ""} />
          </label>
          <label>
            FPP <span className={styles.hint}>(probable de parto)</span>
            <input name="expected_delivery_date" type="date" defaultValue={record?.expected_delivery_date ?? ""} />
          </label>
          <label>
            Riesgo
            <select name="risk_level" defaultValue={record?.risk_level ?? "low"}>
              {(Object.keys(RISK_LABELS) as RiskLevel[]).map((r) => (
                <option key={r} value={r}>
                  {RISK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gestaciones (G)
            <input name="gravida" type="number" min={1} max={30} defaultValue={record?.gravida ?? ""} />
          </label>
          <label>
            Partos (P)
            <input name="parity" type="number" min={0} max={30} defaultValue={record?.parity ?? ""} />
          </label>
          <label>
            Estado
            <select name="status" value={status} onChange={(e) => setStatus(e.target.value as PregnancyStatus)}>
              {(Object.keys(STATUS_LABELS) as PregnancyStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {status === "completed" && (
            <label>
              Fecha de parto
              <input name="delivery_date" type="date" defaultValue={record?.delivery_date ?? ""} />
            </label>
          )}
          <label className={styles.full}>
            Observaciones
            <textarea name="notes" defaultValue={record?.notes ?? ""} />
          </label>
        </div>
        <div className={styles.actions}>
          <button type="button" className={buttons.outline} onClick={onClose}>
            Cancelar
          </button>
          <button className={buttons.primary} disabled={pending}>
            {pending ? "Guardando..." : record ? "Guardar cambios" : "Crear registro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
