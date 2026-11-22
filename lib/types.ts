export type Section =
  | "Resumen"
  | "Registros"
  | "Importar datos"
  | "Registrar usuario"
  | "Usuarios"
  | "Roles y permisos"
  | "Backups"
  | "Configuración";

/** Permiso del backend que habilita cada sección; `null` = cualquier usuario con sesión. */
export const SECTION_PERMISSION: Record<Section, string | null> = {
  Resumen: "dashboard.get",
  Registros: "pregnancy.get",
  "Importar datos": "pregnancy.import",
  "Registrar usuario": "user.post",
  Usuarios: "user.get",
  "Roles y permisos": "role.get",
  Backups: "backup.get",
  Configuración: null,
};
