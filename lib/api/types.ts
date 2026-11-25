export type ApiOk<T> = { ok: true; data: T; msg: string; meta?: ApiMeta };
export type ApiFail = { ok: false; status: number; error: string };
export type ApiResult<T> = ApiOk<T> | ApiFail;

export type ApiMeta = { total?: number; limit?: number; offset?: number; [key: string]: unknown };

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export type PregnancyStatus = "pending" | "in_followup" | "completed";
export type RiskLevel = "low" | "medium" | "high";

export type User = {
  id: string;
  username: string;
  email: string;
  role_id: string;
  role: string;
  full_name: string;
  dni: string | null;
  phone: string | null;
  /** Establecimiento al que está limitado (registrador o admin de sede). */
  health_facility_id: string | null;
  health_facility_name: string | null;
  /** Microred a cargo (admin de microred). Sin microred ni establecimiento = toda la red (superadmin). */
  micro_network_id: string | null;
  micro_network_name: string | null;
  active: boolean;
  blocked: boolean;
  blocked_reason: string | null;
  must_change_password: boolean;
  mfa_enabled: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ScopeLevel = "network" | "micro_network" | "health_facility";

export type Profile = User & {
  permissions: string[];
  scope_level: ScopeLevel;
  session: { session_id: string; device_id: string; expires_at?: string };
  /** Tu rol exige verificación en dos pasos (MFA_REQUIRED + MFA_ROLES en el back). */
  mfa_required: boolean;
  /** Exigida y todavía sin activar: el back solo deja usar /auth/me, /auth/password y /auth/mfa/*. */
  mfa_setup_required: boolean;
  temp_password_expires_at: string | null;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  permission_ids: string[];
  permissions: string[];
  user_count: number;
};

export type Permission = { id: string; code: string; module: string; description: string | null };

export type HealthFacility = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  district: string | null;
  province: string | null;
  renaes: string | null;
  micro_network_id: string | null;
  micro_network_name: string | null;
  active: boolean;
  pregnancy_count: number;
  user_count: number;
};

export type MicroNetwork = {
  id: string;
  code: string;
  name: string;
  network: string;
  active: boolean;
  facility_count: number;
  pregnancy_count: number;
  user_count: number;
};

/** Sección de la ficha MINSA (laboratorio, vacunas, plan de parto...) importada del Excel. */
export type ClinicalSection = {
  section: string;
  items: { label: string; value: string; column?: string; color?: string }[];
};

export type Pregnancy = {
  id: string;
  code: string;
  dni: string | null;
  first_names: string;
  last_names: string;
  full_name: string;
  birth_date: string;
  age: number;
  phone: string | null;
  address: string | null;
  health_facility_id: string;
  health_facility_name: string;
  micro_network_name: string | null;
  clinical_record: string | null;
  insurance: string | null;
  province: string | null;
  district: string | null;
  locality: string | null;
  obstetric_formula: string | null;
  birth_date_estimated: boolean;
  clinical_data: ClinicalSection[];
  /** Color de la fila en el Excel MINSA (hex sin #); `row_marked` 1 = pintada, 0 = sin color. */
  row_color: string | null;
  row_marked: 0 | 1;
  cell_marks: Record<string, string>;
  source: "manual" | "import_minsa" | string;
  import_id: string | null;
  registered_by_name: string | null;
  last_menstrual_period: string | null;
  expected_delivery_date: string | null;
  gestational_age: { weeks: number; days: number } | null;
  gravida: number | null;
  parity: number | null;
  risk_level: RiskLevel;
  status: PregnancyStatus;
  delivery_date: string | null;
  notes: string | null;
  active: boolean;
  last_control_date: string | null;
  controls_count: number;
  next_appointment: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type PregnancyInput = {
  dni: string | null;
  first_names: string;
  last_names: string;
  birth_date: string;
  phone: string | null;
  address: string | null;
  health_facility_id: string;
  clinical_record: string | null;
  insurance: string | null;
  district: string | null;
  locality: string | null;
  last_menstrual_period: string | null;
  expected_delivery_date: string | null;
  gravida: number | null;
  parity: number | null;
  risk_level: RiskLevel;
  status: PregnancyStatus;
  delivery_date: string | null;
  notes: string | null;
};

export type PregnancyFilters = {
  q?: string;
  health_facility_id?: string;
  status?: PregnancyStatus | "";
  risk_level?: RiskLevel | "";
  /** "any" = filas pintadas (1), "none" = sin color (0), o un color hex. */
  mark?: string;
  micro_network_id?: string;
  age_group?: "teen" | "adult" | "older" | "";
  insurance?: string;
  controls?: "none" | "lt6" | "gte6" | "";
  missed?: boolean;
  due_from?: string;
  due_to?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
};

export type Stats = {
  total: number;
  in_followup: number;
  pending: number;
  completed: number;
  high_risk: number;
  new_this_month: number;
  new_last_month: number;
  total_prev_month: number;
  growth_percent: number;
  new_pending_week: number;
  due_next_30_days: number;
  in_followup_percent: number;
  completed_percent: number;
  pending_percent: number;
};

export type PrenatalControl = {
  id: string;
  pregnancy_id: string;
  pregnancy_code: string;
  control_date: string;
  gestational_weeks: number | null;
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  fetal_heart_rate: number | null;
  uterine_height_cm: number | null;
  hemoglobin: number | null;
  next_appointment: string | null;
  notes: string | null;
  control_number: number | null;
  supplementation: string | null;
  risk_factor: string | null;
  performed_at: string | null;
  registered_by_name: string | null;
  alerts: string[];
};

export type PrenatalControlInput = {
  control_date: string;
  gestational_weeks: number | null;
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  fetal_heart_rate: number | null;
  uterine_height_cm: number | null;
  hemoglobin: number | null;
  next_appointment: string | null;
  notes: string | null;
  supplementation?: string | null;
  risk_factor?: string | null;
  performed_at?: string | null;
};

export type ImportRowError = { line: number; sheet?: string; code?: string; level?: "error" | "warning"; message: string };

export type DataImport = {
  id: string | null;
  file_name: string;
  total_rows: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
  dry_run: boolean;
  imported_by_name: string | null;
  format: "csv" | "minsa_xlsx" | string;
  controls: number;
  warnings: number;
  created_facilities: string[];
  ip_address: string | null;
  user_agent: string | null;
  health_facility_name: string | null;
  micro_network_name: string | null;
  created_at: string | null;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  affected_table: string | null;
  record_id: string | null;
  record_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  result: "successful" | "failed" | "blocked";
  details: Record<string, unknown> | null;
  health_facility_name: string | null;
  micro_network_name: string | null;
  actor_health_facility_name: string | null;
  created_at: string;
};

export type AuditFilters = {
  q?: string;
  action?: string;
  affected_table?: string;
  result?: string;
  health_facility_id?: string;
  date_from?: string;
  date_to?: string;
  limit: number;
  offset: number;
};

export type Backup = {
  id: string;
  kind: "manual" | "automatic";
  status: "running" | "completed" | "failed";
  file_name: string | null;
  size_bytes: number | null;
  /** SHA-256 del archivo en disco; el back lo verifica antes de cada descarga. */
  sha256: string | null;
  tables: string[];
  priority: "high" | "normal" | "low";
  error: string | null;
  created_by_name: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
};

export type BackupStatus = {
  enabled: boolean;
  auto_enabled: boolean;
  schedule: string;
  next_run_at: string | null;
  keep: number;
  pg_dump_available: boolean;
  running: boolean;
  total_size_bytes: number;
  last_backup: Backup | null;
  last_failure: Backup | null;
};

export type Activity = {
  id: string;
  table: string;
  action: string;
  description: string;
  user_name: string | null;
  health_facility_name: string | null;
  ip_address: string | null;
  created_at: string;
};

export type Upcoming = {
  pregnancy_id: string;
  code: string;
  full_name: string;
  health_facility_name: string;
  date: string;
  risk_level: RiskLevel;
};

export type Breakdown = {
  total: number;
  in_followup: number;
  pending: number;
  completed: number;
  high_risk: number;
};

export type DashboardData = {
  scope: {
    level: ScopeLevel;
    health_facility_name: string | null;
    micro_network_name: string | null;
    facilities: number | null;
    active_users: number;
  };
  stats: Stats;
  /** Lo que registró el propio usuario dentro de su ámbito. */
  mine: Stats;
  by_facility: (Breakdown & { health_facility_id: string; health_facility_name: string; micro_network_name: string | null })[];
  /** Solo para el superadmin (toda la red). */
  by_micro_network: (Breakdown & { micro_network_id: string | null; micro_network_name: string; facilities: number })[];
  by_registrar: { user_id: string; full_name: string; role: string; health_facility_name: string | null; total: number; this_month: number; controls: number }[];
  by_month: { month: string; registered: number; controls: number }[];
  recent_activity: Activity[];
  upcoming_appointments: Upcoming[];
  due_soon: Upcoming[];
  system: {
    database: "ok" | "error";
    backup_enabled: boolean;
    backup_auto: boolean;
    backup_schedule: string;
    pg_dump_available: boolean;
    last_backup_at: string | null;
    last_backup_ok: boolean | null;
    server_time: string;
    /** Solo para usuarios sin establecimiento asignado (vista de toda la red). */
    failed_logins_24h?: number;
    locked_accounts?: number;
    /** Última verificación de la cadena de hashes de audit_log (null = aún no se verificó). */
    audit_chain_ok?: boolean | null;
    audit_chain_checked_at?: string | null;
    audit_chain_records?: number | null;
  };
};

export type MinsaSection = { id: string; title: string; fixed?: boolean };

export type MinsaView = {
  sections: MinsaSection[];
  columns: {
    key: string;
    section: string;
    group: string;
    label: string;
    /** Colores del encabezado original: [sección, grupo, campo] (hex sin #). */
    fills: (string | null)[];
    editable: boolean;
  }[];
  rows: string[][];
  fills: (string | null)[][];
  legend: { color: string; name: string | null }[];
  ids: string[];
  codes: string[];
  total: number;
  limit: number;
  offset: number;
};

export type MinsaRow = { id: string; code: string; keys: string[]; row: string[]; fills: (string | null)[] };

export type ReportIndicator = {
  id: string;
  label: string;
  detail: string;
  value: number;
  base: number;
  percent: number | null;
  /** true = mientras más bajo, mejor (inasistentes). */
  inverse?: boolean;
};

export type ReportSummary = {
  total: number;
  with_controls: number;
  active: number;
  completed: number;
  missed: number;
  risk_high: number;
  risk_medium: number;
  risk_low: number;
  status_pending: number;
  status_followup: number;
  age_teen: number;
  age_adult: number;
  age_older: number;
  avg_controls: number;
};

export type ReportData = {
  summary: ReportSummary;
  indicators: ReportIndicator[];
  by_facility: {
    health_facility_id: string;
    health_facility_name: string;
    micro_network_name: string | null;
    total: number;
    active: number;
    completed: number;
    risk_high: number;
    missed: number;
    avg_controls: number;
    early_capture: number | null;
    six_apn: number | null;
    completed_six_apn: number | null;
  }[];
  by_month: { month: string; registered: number; controls: number }[];
  by_registrar: DashboardData["by_registrar"];
  options: {
    networks: { id: string; name: string }[];
    facilities: { id: string; name: string; micro_network_id: string | null }[];
  };
  can_choose_network: boolean;
};

export type TemplateColumn = {
  key: string | null;
  kind: "id" | "fixed" | "apn" | "clinical" | "custom";
  position?: number;
  section: string;
  group: string;
  label: string;
  width: number;
  visible: boolean;
  fills: (string | null)[];
  aliases: string[];
  builtin: boolean;
};
