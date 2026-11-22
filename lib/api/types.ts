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
  /** Establecimiento al que está limitado; `null` = ve todos. */
  health_facility_id: string | null;
  health_facility_name: string | null;
  active: boolean;
  blocked: boolean;
  blocked_reason: string | null;
  must_change_password: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = User & {
  permissions: string[];
  session: { session_id: string; device_id: string; expires_at?: string };
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
  active: boolean;
  pregnancy_count: number;
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
};

export type ImportRowError = { line: number; code?: string; message: string };

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
  created_at: string | null;
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

export type DashboardData = {
  stats: Stats;
  by_facility: { health_facility_id: string; health_facility_name: string; total: number }[];
  recent_activity: Activity[];
  upcoming_appointments: Upcoming[];
  due_soon: Upcoming[];
  system: {
    database: "ok" | "error";
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
