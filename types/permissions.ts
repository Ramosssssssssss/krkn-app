/**
 * Sistema de Roles y Permisos - KRKN Mobile
 * 
 * Alineado con las tablas de Kraken Web:
 * - ROLES
 * - MENU_ITEMS  
 * - ROLE_MENU_PERMISSIONS
 * - ROLE_PERMISSIONS
 * - PERMISSIONS (catálogo de acciones)
 */

// ─── Acciones CRUD + Export/Import ────────────────────────────────────
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import';

export const ALL_ACTIONS: PermissionAction[] = ['create', 'read', 'update', 'delete', 'export', 'import'];

// ─── Rol del usuario ──────────────────────────────────────────────────
export interface Role {
  ROLE_ID: number;
  NOMBRE: string;
  DESCRIPCION: string;
  ESTATUS: 'A' | 'I';
}

// ─── Item del menú (módulo / sub-módulo) ──────────────────────────────
export interface MenuItem {
  MENU_ID: number;
  NOMBRE: string;
  DESCRIPCION: string;
  ICONO: string;
  PARENT_ID: number | null;
  ORDEN: number;
  RUTA: string;
  ESTATUS: 'A' | 'I';
}

// ─── Permisos de acción por módulo ────────────────────────────────────
export interface ActionPermissions {
  menuId: number;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
}

// ─── Respuesta del login (parte de permisos) ──────────────────────────
export interface UserPermissionsPayload {
  ROLE_ID: number | null;
  ROLE_NAME: string | null;
  /** Array de MENU_IDs que el rol puede ver */
  ROLE_MENU_PERMISSIONS: number[];
}

// ─── Respuesta completa de role-permissions ───────────────────────────
export interface RolePermissionsResponse {
  ok: boolean;
  menuPermissions: number[];
  actionPermissions: ActionPermissions[];
}

// ─── Mapeo módulos del drawer ↔ MENU_IDs de BD ───────────────────────
/**
 * Mapea el `name` del menú del drawer (routes de expo-router)
 * al NOMBRE en la tabla MENU_ITEMS.
 * 
 * Esto permite que el filtrado del drawer use los mismos
 * MENU_IDs que Kraken web sin duplicar lógica.
 * 
 * La key es el route name del drawer, el value es el NOMBRE
 * tal como aparece en MENU_ITEMS en Firebird.
 */
export const DRAWER_TO_MENU_MAP: Record<string, string> = {
  aduana:       'ADUANA',
  aplicaciones: 'APLICACIONES',
  auditoria:    'AUDITORÍA',
  catalogos:    'CATÁLOGOS',
  control:      'CONTROL',
  integracion:  'INTEGRACIONES',
  inventarios:  'INVENTARIO',
  kpis:         'KPIS',
  masivos:      'MASIVOS',
  planeacion:   'PLANEACIÓN',
  procesos:     'PROCESOS',
  reportes:     'REPORTES',
  tableros:     'TABLEROS',
  chats:        'CHATS',
};

/**
 * Módulos que siempre son visibles sin importar permisos.
 * El home y configuración no se filtran.
 */
export const ALWAYS_VISIBLE_ROUTES = new Set(['index', 'configuracion']);

// ─── Estado del contexto de permisos ──────────────────────────────────
export interface PermissionsState {
  /** Datos del rol */
  role: Pick<Role, 'ROLE_ID' | 'NOMBRE'> | null;
  /** MENU_IDs que este rol puede ver */
  menuPermissions: number[];
  /** Permisos granulares por módulo */
  actionPermissions: ActionPermissions[];
  /** Map MENU_ID → MenuItem para búsquedas rápidas */
  menuItemsMap: Map<number, MenuItem>;
  /** Map NOMBRE (upper) → MENU_ID para resolver drawer routes */
  menuNameToIdMap: Map<string, number>;
  /** Si está cargando permisos */
  loading: boolean;
  /** Si ya se cargaron al menos una vez */
  initialized: boolean;
  /** Error de carga */
  error: string | null;
}
