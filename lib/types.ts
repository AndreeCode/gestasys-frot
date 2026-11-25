export type Section =
  | "Resumen"
  | "Registros"
  | "Importar datos"
  | "Red de salud"
  | "Registrar usuario"
  | "Usuarios"
  | "Roles y permisos"
  | "Auditoría"
  | "Backups"
  | "Configuración";

/** Permiso del backend que habilita cada sección; `null` = cualquier usuario con sesión. */
export const SECTION_PERMISSION: Record<Section, string | null> = {
  Resumen: "dashboard.get",
  Registros: "pregnancy.get",
  "Importar datos": "pregnancy.import",
  "Red de salud": "micro_network.get",
  "Registrar usuario": "user.post",
  Usuarios: "user.get",
  "Roles y permisos": "role.get",
  Auditoría: "audit_log.get",
  Backups: "backup.get",
  Configuración: null,
};
