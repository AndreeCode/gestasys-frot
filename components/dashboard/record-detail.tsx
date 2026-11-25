"use client";

import { AlertTriangle, ClipboardList, FileSpreadsheet, History, Pencil, Plus, Trash, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Pill, RiskBadge, StatusBadge } from "@/components/common/badges";
import { ColorMark, colorName } from "@/components/common/color-mark";
import { ErrorState, LoadingState } from "@/components/common/feedback";
import { Field, FormActions, FormGrid, full } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { InfoGrid, InfoItem } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBackendAction, useBackendQuery } from "@/hooks/use-backend";
import {
  createControl,
  deleteControl,
  deletePregnancy,
  loadPregnancyDetail,
  loadPregnancyHistory,
  updateControl,
} from "@/lib/actions/pregnancies";
import type { AuditLog, ClinicalSection, HealthFacility, Pregnancy, PrenatalControl, PrenatalControlInput } from "@/lib/api/types";
import { formatDate, formatDateTime, gestationalAge, todayISO } from "@/lib/format";
import { AuditDetail, AuditTable } from "./audit";
import { RecordForm } from "./record-form";
import { useSession } from "./session";

const num = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
};
const str = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
};

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

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
      supplementation: str(form, "supplementation"),
      risk_factor: str(form, "risk_factor"),
      performed_at: str(form, "performed_at"),
    };
    const result = await run(control ? updateControl(control.id, input) : createControl(pregnancyId, input));
    if (result) onSaved();
  }

  return (
    <form className="mb-4 rounded-xl border border-primary/25 bg-accent/40 p-4 sm:p-5" onSubmit={onSubmit}>
      <h4 className="mb-4 text-sm font-semibold">
        {control ? `Editar control del ${formatDate(control.control_date)}` : "Registrar control prenatal"}
      </h4>
      <FormGrid cols={3}>
        <Field label="Fecha del control *">
          <Input name="control_date" type="date" required max={todayISO()} defaultValue={control?.control_date ?? todayISO()} />
        </Field>
        <Field label="Semanas de gestación" hint="(se calcula si se deja vacío)">
          <Input name="gestational_weeks" type="number" step="0.1" min={0} max={45} defaultValue={control?.gestational_weeks ?? ""} />
        </Field>
        <Field label="Peso (kg)">
          <Input name="weight_kg" type="number" step="0.1" min={25} max={250} defaultValue={control?.weight_kg ?? ""} />
        </Field>
        <Field label="Presión sistólica">
          <Input name="systolic_bp" type="number" min={50} max={260} defaultValue={control?.systolic_bp ?? ""} />
        </Field>
        <Field label="Presión diastólica">
          <Input name="diastolic_bp" type="number" min={30} max={180} defaultValue={control?.diastolic_bp ?? ""} />
        </Field>
        <Field label="FCF (lpm)">
          <Input name="fetal_heart_rate" type="number" min={60} max={220} defaultValue={control?.fetal_heart_rate ?? ""} />
        </Field>
        <Field label="Altura uterina (cm)">
          <Input name="uterine_height_cm" type="number" step="0.1" min={0} max={60} defaultValue={control?.uterine_height_cm ?? ""} />
        </Field>
        <Field label="Hemoglobina (g/dL)">
          <Input name="hemoglobin" type="number" step="0.1" min={3} max={25} defaultValue={control?.hemoglobin ?? ""} />
        </Field>
        <Field label="Próxima cita">
          <Input name="next_appointment" type="date" defaultValue={control?.next_appointment ?? ""} />
        </Field>
        <Field label="Suplementación" hint="(AF, SOF...)">
          <Input name="supplementation" maxLength={60} defaultValue={control?.supplementation ?? ""} />
        </Field>
        <Field label="EE.SS. que realizó la APN">
          <Input name="performed_at" maxLength={150} defaultValue={control?.performed_at ?? ""} />
        </Field>
        <Field label="Factor de riesgo identificado">
          <Input name="risk_factor" maxLength={500} defaultValue={control?.risk_factor ?? ""} />
        </Field>
        <Field label="Observaciones" className={full}>
          <Textarea name="notes" defaultValue={control?.notes ?? ""} />
        </Field>
      </FormGrid>
      <FormActions className="mt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : control ? "Guardar control" : "Registrar control"}
        </Button>
      </FormActions>
    </form>
  );
}

function ClinicalData({ sections }: { sections: ClinicalSection[] }) {
  if (!sections?.length) {
    return (
      <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        Sin ficha MINSA: se completa al importar el Excel de seguimiento de gestantes.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <section key={section.section} className="rounded-xl border p-4">
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-primary uppercase">{section.section}</h4>
          <dl className="space-y-2">
            {section.items.map((item, i) => (
              <div key={`${item.label}-${i}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="flex items-start gap-1.5 font-medium break-words">
                  {item.color && (
                    <span
                      className="mt-0.5 size-3.5 shrink-0 rounded-[4px] ring-1 ring-foreground/15"
                      style={{ background: `#${item.color}` }}
                      title={`Celda pintada de ${colorName(item.color)} (1)`}
                    />
                  )}
                  {item.value || (item.color ? <span className="text-muted-foreground">marcada (1)</span> : "—")}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Traceability({ pregnancyId, record }: { pregnancyId: string; record: Pregnancy }) {
  const history = useBackendQuery(`history:${pregnancyId}`, () => loadPregnancyHistory(pregnancyId));
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const created = history.data?.findLast((log) => log.action === "INSERT" && log.affected_table === "pregnancies");
  return (
    <div className="space-y-4">
      <InfoGrid>
        <InfoItem label="Registrado por">{record.registered_by_name ?? created?.user_name ?? "—"}</InfoItem>
        <InfoItem label="Fecha de registro">{formatDateTime(record.created_at)}</InfoItem>
        <InfoItem label="Origen">{record.source === "import_minsa" ? "Importación Excel MINSA" : "Registro manual"}</InfoItem>
        <InfoItem label="Desde (IP · EE.SS.)">
          {created ? `${created.ip_address ?? "—"} · ${created.actor_health_facility_name ?? "nivel red/microred"}` : "—"}
        </InfoItem>
      </InfoGrid>
      {history.error && <ErrorState error={history.error} onRetry={history.reload} />}
      {!history.data && !history.error && <LoadingState />}
      {history.data && history.data.length === 0 && (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Sin eventos de auditoría.</p>
      )}
      {history.data && history.data.length > 0 && <AuditTable items={history.data} onSelect={setSelected} compact />}
      {selected && <AuditDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
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
      description={
        record ? (
          <span className="flex flex-wrap items-center gap-2">
            {record.health_facility_name}
            <StatusBadge status={record.status} />
            <RiskBadge level={record.risk_level} prefix />
          </span>
        ) : undefined
      }
      onClose={onClose}
      wide
    >
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <LoadingState />}
      {record && data && (
        <Tabs defaultValue="data" className="gap-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="data">
              <UserRound /> Datos
            </TabsTrigger>
            <TabsTrigger value="controls">
              <ClipboardList /> Controles ({data.controls.length})
            </TabsTrigger>
            <TabsTrigger value="clinical">
              <FileSpreadsheet /> Ficha MINSA
            </TabsTrigger>
            {can("audit_log.get") && (
              <TabsTrigger value="history">
                <History /> Trazabilidad
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="data">
            <SectionTitle
              title="Datos de la gestante"
              action={
                <>
                  {can("pregnancy.put") && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil /> Editar
                    </Button>
                  )}
                  {can("pregnancy.delete") && (
                    <Button variant="destructive" size="sm" disabled={pending} onClick={() => removeRecord(record)}>
                      <Trash /> Eliminar
                    </Button>
                  )}
                </>
              }
            />
            <InfoGrid>
              <InfoItem label="DNI">{record.dni ?? "—"}</InfoItem>
              <InfoItem label="Historia clínica">{record.clinical_record ?? "—"}</InfoItem>
              <InfoItem label="Edad">
                {record.age} años
                {record.birth_date_estimated && <span className="ml-1 text-xs font-normal text-warning">(estimada)</span>}
              </InfoItem>
              <InfoItem label="Nacimiento">{record.birth_date_estimated ? "—" : formatDate(record.birth_date)}</InfoItem>
              <InfoItem label="Teléfono">{record.phone ?? "—"}</InfoItem>
              <InfoItem label="Seguro">{record.insurance ?? "—"}</InfoItem>
              <InfoItem label="Fórmula obstétrica">{record.obstetric_formula ?? `G${record.gravida ?? "—"} P${record.parity ?? "—"}`}</InfoItem>
              <InfoItem label="Edad gestacional">{gestationalAge(record.gestational_age)}</InfoItem>
              <InfoItem label="FUM">{formatDate(record.last_menstrual_period)}</InfoItem>
              <InfoItem label="FPP">{formatDate(record.expected_delivery_date)}</InfoItem>
              <InfoItem label="Próxima cita">{formatDate(record.next_appointment)}</InfoItem>
              <InfoItem label="Fecha de parto">{formatDate(record.delivery_date)}</InfoItem>
              <InfoItem label="Marca de fila (Excel)">
                <ColorMark color={record.row_color} showName />
                {Object.keys(record.cell_marks ?? {}).length > 0 && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {Object.keys(record.cell_marks).length} celdas pintadas distinto
                  </span>
                )}
              </InfoItem>
              <InfoItem label="Establecimiento">
                {record.health_facility_name}
                {record.micro_network_name && <span className="block text-xs font-normal text-muted-foreground">{record.micro_network_name}</span>}
              </InfoItem>
              <InfoItem label="Ubicación">{[record.locality, record.district, record.province].filter(Boolean).join(", ") || "—"}</InfoItem>
              <InfoItem label="Dirección" className="sm:col-span-2">
                {record.address ?? "—"}
              </InfoItem>
              {record.notes && (
                <InfoItem label="Observaciones" className="sm:col-span-full">
                  <span className="font-normal whitespace-pre-line">{record.notes}</span>
                </InfoItem>
              )}
            </InfoGrid>
          </TabsContent>

          <TabsContent value="controls">
            <SectionTitle
              title="Atenciones prenatales (APN)"
              action={
                can("prenatal_control.post") &&
                record.status !== "completed" &&
                controlForm === null && (
                  <Button size="sm" onClick={() => setControlForm("new")}>
                    <Plus /> Nuevo control
                  </Button>
                )
              }
            />
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
            {data.controls.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                Todavía no hay controles registrados.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>APN</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Sem.</TableHead>
                      <TableHead>Suplem.</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Presión</TableHead>
                      <TableHead>Hb</TableHead>
                      <TableHead>EE.SS.</TableHead>
                      <TableHead>Cita</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.controls.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="align-top font-medium tabular-nums">{c.control_number ?? "—"}</TableCell>
                        <TableCell className="align-top">
                          <span className="font-medium tabular-nums">{formatDate(c.control_date)}</span>
                          {c.risk_factor && <span className="block max-w-48 text-xs whitespace-normal text-warning">{c.risk_factor}</span>}
                          {c.alerts.length > 0 && (
                            <span className="mt-1 flex flex-col items-start gap-1">
                              {c.alerts.map((a) => (
                                <Pill key={a} tone="danger" className="h-5 px-2 text-[11px]">
                                  <AlertTriangle className="size-3" /> {a}
                                </Pill>
                              ))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top tabular-nums">{c.gestational_weeks ?? "—"}</TableCell>
                        <TableCell className="align-top text-xs">{c.supplementation ?? "—"}</TableCell>
                        <TableCell className="align-top tabular-nums">{c.weight_kg != null ? `${c.weight_kg} kg` : "—"}</TableCell>
                        <TableCell className="align-top tabular-nums">
                          {c.systolic_bp != null ? `${c.systolic_bp}/${c.diastolic_bp ?? "—"}` : "—"}
                        </TableCell>
                        <TableCell className="align-top tabular-nums">{c.hemoglobin ?? "—"}</TableCell>
                        <TableCell className="max-w-40 align-top text-xs whitespace-normal">
                          {c.performed_at ?? "—"}
                          {c.registered_by_name && <span className="block text-muted-foreground">por {c.registered_by_name}</span>}
                        </TableCell>
                        <TableCell className="align-top tabular-nums">{formatDate(c.next_appointment)}</TableCell>
                        <TableCell className="text-right align-top">
                          <div className="flex justify-end gap-1">
                            {can("prenatal_control.put") && (
                              <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setControlForm(c)}>
                                <Pencil />
                              </Button>
                            )}
                            {can("prenatal_control.delete") && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Eliminar"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeControl(c)}
                              >
                                <Trash />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clinical">
            <ClinicalData sections={record.clinical_data} />
          </TabsContent>

          {can("audit_log.get") && (
            <TabsContent value="history">
              <Traceability pregnancyId={record.id} record={record} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </Modal>
  );
}
