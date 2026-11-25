import type { PregnancyStatus, RiskLevel } from "@/lib/api/types";

export const STATUS_LABELS: Record<PregnancyStatus, string> = {
  pending: "Pendiente",
  in_followup: "En seguimiento",
  completed: "Completado",
};

export const RISK_LABELS: Record<RiskLevel, string> = { low: "Bajo", medium: "Medio", high: "Alto" };

export const ROLE_TITLES: Record<string, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  registrador: "Registrador",
  coordinador: "Coordinador",
  consulta: "Consulta",
};

/** Ámbito de un usuario: toda la red, una microred o un establecimiento. */
export function scopeLabel(user: {
  health_facility_name: string | null;
  micro_network_name: string | null;
  health_facility_id: string | null;
  micro_network_id: string | null;
}): string {
  if (user.health_facility_id) return user.health_facility_name ?? "Establecimiento";
  if (user.micro_network_id) return user.micro_network_name ?? "Microred";
  return "Toda la red de salud";
}

const AVATAR_COLORS = ["#e6a35d", "#5b9bd5", "#8b78c8", "#4fb093", "#d97a8a", "#6c8fa8"];

export function roleTitle(name: string | null | undefined): string {
  if (!name) return "Sin rol";
  return ROLE_TITLES[name] ?? name.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

const dateTime = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTime.format(date);
}

export function relativeTime(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return formatDateTime(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("es-PE");
}

export function gestationalAge(ga: { weeks: number; days: number } | null): string {
  return ga ? `${ga.weeks} sem ${ga.days} d` : "—";
}

export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const TABLE_LABELS: Record<string, string> = {
  pregnancies: "Gestante",
  prenatal_controls: "Control prenatal",
  data_imports: "Importación",
  users: "Usuario",
  roles: "Rol",
  role_permission: "Permiso de rol",
  health_facilities: "Establecimiento",
  micro_networks: "Microred",
  backups: "Backup",
  sessions: "Sesión",
  devices: "Dispositivo",
  permissions: "Permiso",
};

export const ACTION_LABELS: Record<string, string> = {
  INSERT: "Registró",
  UPDATE: "Modificó",
  DELETE: "Eliminó",
  LOGIN: "Inició sesión",
  LOGIN_FAILED: "Intento fallido",
  LOGOUT: "Cerró sesión",
  PASSWORD_CHANGED: "Cambió contraseña",
  MFA_ENABLED: "Activó 2FA",
  MFA_DISABLED: "Desactivó 2FA",
  MFA_RESET: "Restableció 2FA",
  MFA_FAILED: "Código 2FA fallido",
  SESSION_IDLE: "Sesión expirada",
  SESSION_REVOKED: "Sesión cerrada",
  ACCESS_DENIED: "Acceso denegado",
};

/** "Chrome · Windows" a partir del User-Agent (solo para mostrar; el texto completo queda en la auditoría). */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconocido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /python|curl|httpx|node/i.test(ua)
              ? "Script"
              : "Navegador";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}
