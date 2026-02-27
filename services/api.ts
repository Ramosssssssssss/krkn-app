// Configuración base de la API
import { API_CONFIG } from "@/config/api";

const API_BASE_URL = API_CONFIG.BASE_URL;

// Variable global para el database ID seleccionado
let currentDatabaseId: number | null = null;

/**
 * Establece el ID de la base de datos actual para todas las peticiones
 */
export function setCurrentDatabaseId(databaseId: number | null) {
  currentDatabaseId = databaseId;
  console.log("Current Database ID set to:", databaseId);
}

/**
 * Obtiene el ID de la base de datos actual
 */
export function getCurrentDatabaseId(): number | null {
  return currentDatabaseId;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Función base para hacer peticiones a la API
 * Maneja errores y retries automáticamente
 * Incluye automáticamente el databaseId en los parámetros
 */
export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {} } = options;

  // Agregar databaseId a la URL si está configurado y no está ya presente
  let finalEndpoint = endpoint;
  if (currentDatabaseId !== null && !endpoint.includes("databaseId=")) {
    const separator = endpoint.includes("?") ? "&" : "?";
    finalEndpoint = `${endpoint}${separator}databaseId=${currentDatabaseId}`;
  }

  const config: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const urlPath = finalEndpoint.startsWith("/") ? finalEndpoint : `/${finalEndpoint}`;
    const response = await fetch(`${API_BASE_URL}${urlPath}`, config);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error?.message);
    throw error;
  }
}

/**
 * Función con reintentos automáticos
 */
export async function apiRequestWithRetry<T>(
  endpoint: string,
  options: FetchOptions = {},
  maxRetries: number = 3,
  onRetry?: (attempt: number) => void,
): Promise<ApiResponse<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1);
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export { API_BASE_URL };

// ==================== DATABASES ====================

export interface Database {
  id: number;
  nombre: string;
  ip_servidor: string;
  puerto_bd: number;
  ubicacion: string;
  usuario_bd: string;
  password_bd: string;
}

export interface GetDatabasesResponse {
  ok: boolean;
  company?: {
    EMPRESA_ID: number;
    USUARIO: string;
    NOMBRE: string;
  };
  databases?: Database[];
  message?: string;
}

export async function getDatabases(
  companyCode: string,
): Promise<GetDatabasesResponse> {
  try {
    const code = companyCode.trim().toUpperCase();
    const url = `https://app.krkn.mx/api/get-databases.php?companyCode=${encodeURIComponent(code)}`;

    const response = await fetch(url, {
      method: "GET",
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching databases:", error);
    return {
      ok: false,
      message: error.message || "Error al obtener bases de datos",
    };
  }
}
// ==================== ARTICULOS ====================

export interface Articulo {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  PRECIO: number;
  IMPUESTO: number;
  LINEA_ID: number;
  LINEA_NOMBRE?: string;
}

export async function getArticulos(): Promise<Articulo[]> {
  try {
    const response = await apiRequest<Articulo[]>(
      API_CONFIG.ENDPOINTS.ARTICULOS,
    );
    if (response?.success && response?.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    return [];
  }
}

// ==================== CONTEO COMEX ====================

export interface ConteoComexItem {
  CODIGO: string;
  CANTIDAD: number;
}

export interface CompletarConteoComexResponse {
  ok: boolean;
  message: string;
  procesados?: number;
  total?: number;
  errores_count?: number;
  errores?: { CODIGO: string; error: string }[];
}

export async function completarConteoComex(
  articulos: ConteoComexItem[],
): Promise<CompletarConteoComexResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMPLETAR_CONTEO_COMEX}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articulos }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Response no es JSON:", text.substring(0, 500));
      return {
        ok: false,
        message: `Error del servidor (respuesta no válida). Status: ${response.status}`,
      };
    }
  } catch (error: any) {
    console.error("Error in completarConteoComex:", error);
    return {
      ok: false,
      message:
        error.name === "AbortError"
          ? "Timeout: el servidor tardó demasiado (>2 min)"
          : error.message || "Error al completar el conteo Comex",
    };
  }
}
export async function getConteoComex(): Promise<{
  ok: boolean;
  message?: string;
  contenido?: string;
  datos?: ConteoComexItem[];
  total?: number;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_CONTEO_COMEX}`,
    );
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error in getConteoComex:", error);
    return {
      ok: false,
      message: error.message || "Error al obtener el conteo Comex",
    };
  }
}

export async function actualizarConteoComex(
  codigo: string,
  cantidad: number,
): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACTUALIZAR_CONTEO_COMEX}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, cantidad, accion: "update" }),
      },
    );

    return await response.json();
  } catch (error: any) {
    console.error("Error updating Comex count:", error);
    return {
      ok: false,
      message: error.message || "Error al actualizar cantidad",
    };
  }
}

export async function eliminarConteoComex(
  codigo: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACTUALIZAR_CONTEO_COMEX}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, accion: "delete" }),
      },
    );

    return await response.json();
  } catch (error: any) {
    console.error("Error deleting Comex item:", error);
    return {
      ok: false,
      message: error.message || "Error al eliminar artículo",
    };
  }
}

export async function limpiarConteoComex(): Promise<{
  ok: boolean;
  message: string;
  eliminados?: number;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LIMPIAR_CONTEO_COMEX}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    return await response.json();
  } catch (error: any) {
    console.error("Error clearing Comex table:", error);
    return { ok: false, message: error.message || "Error al limpiar la tabla" };
  }
}

export interface SolicitudTraspasoData {
  usuario: string;
  descripcion: string;
  sucursalOrigenId: number;
  sucursalDestinoId: number;
  almacenDestinoId: number;
  articulos: {
    clave: string;
    articulo_id: number;
    cantidad: number;
  }[];
}

export async function crearSolicitudTraspaso(
  data: SolicitudTraspasoData,
): Promise<{
  ok: boolean;
  message: string;
  solicitud_id?: number;
  folio?: string;
}> {
  try {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) throw new Error("No hay base de datos seleccionada");

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREAR_SOLICITUD_TRASPASO}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          databaseId,
        }),
      },
    );

    return await response.json();
  } catch (error: any) {
    console.error("Error in crearSolicitudTraspaso:", error);
    return {
      ok: false,
      message: error.message || "Error al crear la solicitud",
    };
  }
}

// ==================== SOLICITUDES HISTORIAL ====================

export interface SolicitudTraspaso {
  id: number;
  folio: string;
  fecha: string;
  descripcion: string;
  estatus: string;
  usuario: string;
  fecha_creacion: string;
  sucursal_origen: string;
  sucursal_destino: string;
  almacen_destino: string;
  total_articulos: number;
  total_unidades: number;
}

export interface SolicitudDetalleArticulo {
  det_id: number;
  clave: string;
  articulo_id: number;
  nombre: string;
  unidades: number;
  surtidas: number;
  por_surtir: number;
}

export interface SolicitudDetalle {
  header: {
    id: number;
    folio: string;
    fecha: string;
    descripcion: string;
    estatus: string;
    usuario: string;
    fecha_creacion: string;
    sucursal_origen: string;
    sucursal_destino: string;
    almacen_destino: string;
  };
  articulos: SolicitudDetalleArticulo[];
  totales: {
    articulos: number;
    unidades: number;
    surtidas: number;
  };
}

export async function getSolicitudesTraspaso(limit: number = 50): Promise<{
  ok: boolean;
  solicitudes?: SolicitudTraspaso[];
  message?: string;
}> {
  try {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) throw new Error("No hay base de datos seleccionada");

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_SOLICITUDES_TRASPASO}?databaseId=${databaseId}&limit=${limit}`,
    );
    return await response.json();
  } catch (error: any) {
    console.error("Error fetching solicitudes:", error);
    return {
      ok: false,
      message: error.message || "Error al obtener solicitudes",
    };
  }
}

export async function getSolicitudDetalle(solicitudId: number): Promise<{
  ok: boolean;
  header?: SolicitudDetalle["header"];
  articulos?: SolicitudDetalleArticulo[];
  totales?: SolicitudDetalle["totales"];
  message?: string;
}> {
  try {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) throw new Error("No hay base de datos seleccionada");

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_SOLICITUD_DETALLE}?databaseId=${databaseId}&solicitudId=${solicitudId}`,
    );
    return await response.json();
  } catch (error: any) {
    console.error("Error fetching solicitud detail:", error);
    return { ok: false, message: error.message || "Error al obtener detalle" };
  }
}
