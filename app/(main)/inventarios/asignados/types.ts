// ─── Types para Inventarios Asignados ────────────────────────────────────────

export interface InventarioAsignado {
  INVENTARIO_ID: number;
  USER_ID: number;
  USUARIO_NOMBRE: string;
  NOMBRE_COMPLETO: string;
  SUCURSAL_ID: number;
  SUCURSAL_NOMBRE: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
  FECHA_PROGRAMADA: string;
  FECHA_ASIGNACION: string;
  FECHA_INICIO: string | null;
  TIPO_CONTEO: string;
  ESTATUS: string;
  ASIGNADO_POR: string;
  OBSERVACIONES: string;
  FOLIO: string;
  UBICACIONES: { LOCALIZACION: string; CANTIDAD_ARTICULOS: number }[];
}

export interface StatsData {
  pendientes: number;
  enProceso: number;
  completados: number;
}

export interface UserKrkn {
  USER_ID: number;
  USERNAME: string;
  NOMBRE_COMPLETO: string;
  ROLE_NAME: string;
}

export interface SucursalAlmacen {
  SUCURSAL_ID: number;
  SUCURSAL_NOMBRE: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
}

export interface UbicacionItem {
  localizacion: string;
  cantidadArticulos: number;
}

export type FilterType = "TODOS" | "PENDIENTE" | "TRABAJANDO";

export type WizardStep =
  | "usuario"
  | "sucursal"
  | "fecha"
  | "tipo"
  | "ubicaciones"
  | "confirmar";
