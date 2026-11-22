"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useState, type FormEvent } from "react";

import buttons from "@/components/common/buttons.module.css";
import { ErrorState, LoadingState } from "@/components/common/feedback";
import { Modal } from "@/components/common/modal";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import {
  createControl,
  deleteControl,
  deletePregnancy,
  loadPregnancyDetail,
  updateControl,
} from "@/lib/actions/pregnancies";
import type { HealthFacility, Pregnancy, PrenatalControl, PrenatalControlInput } from "@/lib/api/types";
import { RISK_LABELS, STATUS_LABELS, formatDate, gestationalAge, todayISO } from "@/lib/format";
import { RecordForm } from "./record-form";
import { useSession } from "./session";
import styles from "./record-detail.module.css";
import forms from "./forms.module.css";

const num = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
};
const str = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
};

function ControlForm({
  pregnancyId,
  control,
  onCancel,
  onSaved,
}: {
  pregnancyId: string;
  control?: PrenatalControl;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { run, pending } = useBackendAction();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: PrenatalControlInput = {
      control_date: str(form, "control_date") ?? todayISO(),
      gestational_weeks: num(form, "gestational_weeks"),
      weight_kg: num(form, "weight_kg"),
      systolic_bp: num(form, "systolic_bp"),
      diastolic_bp: num(form, "diastolic_bp"),
      fetal_heart_rate: num(form, "fetal_heart_rate"),
      uterine_height_cm: num(form, "uterine_height_cm"),
      hemoglobin: num(form, "hemoglobin"),
      next_appointment: str(form, "next_appointment"),
      notes: str(form, "notes"),
    };
    const result = await run(control ? updateControl(control.id, input) : createControl(pregnancyId, input));
    if (result) onSaved();
  }

  return (
    <form className={styles.controlForm} onSubmit={onSubmit}>
      <h4>{control ? `Editar control del ${formatDate(control.control_date)}` : "Registrar control prenatal"}</h4>
      <div className={`${forms.grid} ${forms.three}`}>
        <label>
          Fecha del control *
          <input name="control_date" type="date" required max={todayISO()} defaultValue={control?.control_date ?? todayISO()} />
        </label>
        <label>
          Semanas de gestación <span className={forms.hint}>(se calcula si se deja vacío)</span>
          <input name="gestational_weeks" type="number" step="0.1" min={0} max={45} defaultValue={control?.gestational_weeks ?? ""} />
        </label>
        <label>
          Peso (kg)
          <input name="weight_kg" type="number" step="0.1" min={25} max={250} defaultValue={control?.weight_kg ?? ""} />
        </label>
        <label>
          Presión sistólica
          <input name="systolic_bp" type="number" min={50} max={260} defaultValue={control?.systolic_bp ?? ""} />
        </label>
        <label>
          Presión diastólica
          <input name="diastolic_bp" type="number" min={30} max={180} defaultValue={control?.diastolic_bp ?? ""} />
        </label>
        <label>
          FCF (lpm)
          <input name="fetal_heart_rate" type="number" min={60} max={220} defaultValue={control?.fetal_heart_rate ?? ""} />
        </label>
        <label>
          Altura uterina (cm)
          <input name="uterine_height_cm" type="number" step="0.1" min={0} max={60} defaultValue={control?.uterine_height_cm ?? ""} />
        </label>
        <label>
          Hemoglobina (g/dL)
          <input name="hemoglobin" type="number" step="0.1" min={3} max={25} defaultValue={control?.hemoglobin ?? ""} />
        </label>
        <label>
          Próxima cita
          <input name="next_appointment" type="date" defaultValue={control?.next_appointment ?? ""} />
        </label>
        <label className={forms.full}>
          Observaciones
          <textarea name="notes" defaultValue={control?.notes ?? ""} />
        </label>
      </div>
      <div className={forms.actions}>
        <button type="button" className={buttons.outline} onClick={onCancel}>
          Cancelar
        </button>
        <button className={buttons.primary} disabled={pending}>
          {pending ? "Guardando..." : control ? "Guardar control" : "Registrar control"}
        </button>
      </div>
    </form>
  );
}

export function RecordDetail({
  pregnancyId,
  facilities,
  onClose,
  onChanged,
}: {
  pregnancyId: string;
  facilities: HealthFacility[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { can } = useSession();
  const { run, pending } = useBackendAction();
  const { data, error, loading, reload } = useBackendQuery(`detail:${pregnancyId}`, () => loadPregnancyDetail(pregnancyId));
  const [editing, setEditing] = useState(false);
  const [controlForm, setControlForm] = useState<PrenatalControl | "new" | null>(null);

  const refresh = () => {
    reload();
    onChanged();
  };

  async function removeRecord(record: Pregnancy) {
    if (!window.confirm(`¿Eliminar el registro ${record.code}? Dejará de aparecer en las listas.`)) return;
    if (await run(deletePregnancy(record.id))) {
      onChanged();
      onClose();
    }
  }

  async function removeControl(control: PrenatalControl) {
    if (!window.confirm(`¿Eliminar el control del ${formatDate(control.control_date)}?`)) return;
    if (await run(deleteControl(control.id))) refresh();
  }

  const record = data?.pregnancy;

  if (editing && record) {
    return (
      <RecordForm
        record={record}
        facilities={facilities}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          refresh();
        }}
      />
    );
  }

  return (
    <Modal
      title={record ? `${record.code} · ${record.full_name}` : "Registro de gestante"}
      description={record ? `${record.health_facility_name} · ${STATUS_LABELS[record.status]}` : undefined}
      onClose={onClose}
      wide
    >
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <LoadingState />}
      {record && data && (
        <>
          <div className={styles.toolbar}>
            <h3>Datos de la gestante</h3>
            <div className={styles.buttons}>
              {can("pregnancy.put") && (
                <button className={buttons.outline} onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Editar
                </button>
              )}
              {can("pregnancy.delete") && (
                <button className={`${buttons.danger} ${buttons.inline}`} disabled={pending} onClick={() => removeRecord(record)}>
                  <Trash size={14} /> Eliminar
                </button>
              )}
            </div>
          </div>
          <div className={styles.summary}>
            <div><span>DNI</span><strong>{record.dni ?? "—"}</strong></div>
            <div><span>Edad</span><strong>{record.age} años</strong></div>
            <div><span>Nacimiento</span><strong>{formatDate(record.birth_date)}</strong></div>
            <div><span>Teléfono</span><strong>{record.phone ?? "—"}</strong></div>
            <div><span>FUM</span><strong>{formatDate(record.last_menstrual_period)}</strong></div>
            <div><span>FPP</span><strong>{formatDate(record.expected_delivery_date)}</strong></div>
            <div><span>Edad gestacional</span><strong>{gestationalAge(record.gestational_age)}</strong></div>
            <div><span>Riesgo</span><strong>{RISK_LABELS[record.risk_level]}</strong></div>
            <div><span>G / P</span><strong>{record.gravida ?? "—"} / {record.parity ?? "—"}</strong></div>
            <div><span>Próxima cita</span><strong>{formatDate(record.next_appointment)}</strong></div>
            <div><span>Fecha de parto</span><strong>{formatDate(record.delivery_date)}</strong></div>
            <div><span>Dirección</span><strong>{record.address ?? "—"}</strong></div>
            {record.notes && (
              <div className={styles.notes}><span>Observaciones</span><strong>{record.notes}</strong></div>
            )}
          </div>

          <div className={styles.toolbar}>
            <h3>Controles prenatales ({data.controls.length})</h3>
            {can("prenatal_control.post") && record.status !== "completed" && controlForm === null && (
              <button className={buttons.primary} onClick={() => setControlForm("new")}>
                <Plus size={14} /> Nuevo control
              </button>
            )}
          </div>
          {controlForm !== null && (
            <ControlForm
              key={controlForm === "new" ? "new" : controlForm.id}
              pregnancyId={record.id}
              control={controlForm === "new" ? undefined : controlForm}
              onCancel={() => setControlForm(null)}
              onSaved={() => {
                setControlForm(null);
                refresh();
              }}
            />
          )}
          <div className={styles.tableWrap} style={{ marginTop: controlForm ? 16 : 0 }}>
            {data.controls.length === 0 ? (
              <div className={styles.empty}>Todavía no hay controles registrados.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>SEMANAS</th>
                    <th>PESO</th>
                    <th>PRESIÓN</th>
                    <th>FCF</th>
                    <th>AU</th>
                    <th>HB</th>
                    <th>PRÓXIMA CITA</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.controls.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {formatDate(c.control_date)}
                        {c.alerts.map((a) => (
                          <span key={a} className={styles.alert}>⚠ {a}</span>
                        ))}
                      </td>
                      <td>{c.gestational_weeks ?? "—"}</td>
                      <td>{c.weight_kg != null ? `${c.weight_kg} kg` : "—"}</td>
                      <td>{c.systolic_bp != null ? `${c.systolic_bp}/${c.diastolic_bp ?? "—"}` : "—"}</td>
                      <td>{c.fetal_heart_rate ?? "—"}</td>
                      <td>{c.uterine_height_cm ?? "—"}</td>
                      <td>{c.hemoglobin ?? "—"}</td>
                      <td>{formatDate(c.next_appointment)}</td>
                      <td>
                        {can("prenatal_control.put") && (
                          <button className={buttons.ghost} onClick={() => setControlForm(c)}>
                            Editar
                          </button>
                        )}
                        {can("prenatal_control.delete") && (
                          <button className={`${buttons.ghost} ${buttons.red}`} onClick={() => removeControl(c)}>
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
