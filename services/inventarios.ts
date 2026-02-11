// Servicios específicos del módulo de Inventarios

import { API_CONFIG } from '@/config/api';
import {
  Entrada,
  Recepcion,
  Salida,
  SucursalAlmacenRaw
} from '@/types/inventarios';
import { apiRequest, apiRequestWithRetry, getCurrentDatabaseId } from './api';

// ============================================
// TIPOS PARA ENTRADAS/SALIDAS
// ============================================

export interface DetalleMovimiento {
  CLAVE: string;
  CANTIDAD: number;
}

export interface CrearEntradaParams {
  P_SUCURSAL_ID: number;
  P_ALMACEN_ID: number;
  P_DESCRIPCION: string;
  P_USUARIO: string;
  detalles: DetalleMovimiento[];
}

export interface CrearSalidaParams {
  P_SUCURSAL_ID: number;
  P_ALMACEN_ID: number;
  P_CENTRO_COSTO_ID?: number | null;
  P_DESCRIPCION: string;
  P_USUARIO: string;
  detalles: DetalleMovimiento[];
}

export interface CrearInventarioFisicoParams {
  P_SUCURSAL_ID: number;
  P_ALMACEN_ID: number;
  P_DESCRIPCION: string;
  P_USUARIO: string;
  detalles: DetalleMovimiento[];
}

export interface CrearEntradaResponse {
  ok: boolean;
  folio?: string;
  doctoInId?: number;
  inserted?: number;
  warnings?: Array<{ CLAVE: string; error: string }>;
  message?: string;
}

export interface CrearSalidaResponse {
  ok: boolean;
  folio?: string;
  doctoInId?: number;
  inserted?: number;
  warnings?: Array<{ CLAVE: string; error: string }>;
  message?: string;
}

export interface CrearInventarioFisicoResponse {
  ok: boolean;
  folio?: string;
  doctoInvfisId?: number;
  inserted?: number;
  warnings?: Array<{ CLAVE: string; error: string }>;
  message?: string;
}

// Tipos para Centros de Costo
export interface CentroCosto {
  CENTRO_COSTO_ID: number;
  NOMBRE: string;
}

export interface CentrosCostoResponse {
  success: boolean;
  centrosCosto: CentroCosto[];
  total: number;
}

// Tipos para Documentos de Inventario Físico
export interface DoctoInvfis {
  DOCTO_INVFIS_ID: number;
  FOLIO: string;
  FECHA: string;
  ALMACEN_ID: number;
  ALMACEN: string;
  DESCRIPCION: string;
  APLICADO: string;
  USUARIO: string;
}

export interface GetDoctosInvfisResponse {
  ok: boolean;
  count: number;
  data: DoctoInvfis[];
  range: { start: string; end: string };
  message?: string;
}

export interface DoctoEntrada {
  folio: string;
  fecha: string;
  concepto: string;
  almacen: string;
  sucursal: string;
  total_articulos: number;
  total_importe: number;
  aplicado: boolean;
  cancelado: boolean;
}

export interface GetDoctosEntradasResponse {
  success: boolean;
  entradas: DoctoEntrada[];
  total: number;
  error?: string;
}

export interface GetDoctosSalidasResponse {
  success: boolean;
  salidas: DoctoEntrada[];
  total: number;
  error?: string;
}

export interface DoctoInDetalleArticulo {
  id: number;
  id_articulo: number;
  clave: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
}

export interface DoctoInDetalle {
  header: {
    folio: string;
    fecha: string;
    descripcion: string;
    concepto: string;
    almacen: string;
    sucursal: string;
    cancelado: boolean;
    aplicado: boolean;
    usuario: string;
    fecha_creacion: string;
  };
  articulos: DoctoInDetalleArticulo[];
  totales: {
    cantidad_articulos: number;
    total_unidades: number;
    importe_total: number;
  };
}

export interface GetDoctoInDetalleResponse {
  success: boolean;
  data: DoctoInDetalle;
  error?: string;
}

export interface GetDoctosParams {
  limit?: number;
  startDate?: string;
  endDate?: string;
}

// Tipos para Detalle de Inventario Físico
export interface DetalleArticulo {
  DOCTO_INVFIS_DET_ID: number;
  CLAVE_ARTICULO: string;
  ARTICULO_ID: number;
  NOMBRE_ARTICULO: string;
  UMED: string;
  LOCALIZACION: string;
  UNIDADES_FISICAS: number;
  EXISTENCIA_SISTEMA: number;
  DIFERENCIA: number;
  COINCIDE: boolean;
}

export interface CaratulaInvfis {
  DOCTO_INVFIS_ID: number;
  FOLIO: string;
  FECHA: string;
  DESCRIPCION: string;
  APLICADO: string;
  USUARIO: string;
  ALMACEN: string;
  SUCURSAL: string;
}

export interface DetalleInvfisResponse {
  ok: boolean;
  caratula: CaratulaInvfis;
  detalles: DetalleArticulo[];
  estadisticas: {
    totalArticulos: number;
    coincidencias: number;
    faltantes: number;
    sobrantes: number;
  };
  message?: string;
}

// ============================================
// SUCURSALES Y ALMACENES
// ============================================

export async function getSucursalesAlmacenes(
  onRetry?: (attempt: number) => void
): Promise<SucursalAlmacenRaw[]> {
  const response = await apiRequestWithRetry<SucursalAlmacenRaw[]>(
    '/api/sucursales-almacenes.php',
    { method: 'GET' },
    3,
    onRetry
  );

  // Aceptar tanto "success" como "ok" del backend
  const isSuccess = response?.success || (response as any)?.ok;

  if (isSuccess && response?.data && Array.isArray(response.data)) {
    return response.data;
  }

  throw new Error(response?.message || response?.error || 'Formato de datos inválido');
}

// ============================================
// CENTROS DE COSTO
// ============================================

/**
 * Obtiene los centros de costo disponibles para salidas
 */
export async function getCentrosCosto(): Promise<CentroCosto[]> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CENTROS_COSTO}?databaseId=${databaseId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: CentrosCostoResponse = await response.json();

  if (!data.success) {
    throw new Error('Error al obtener centros de costo');
  }

  return data.centrosCosto || [];
}

// ============================================
// ENTRADAS
// ============================================

/**
 * Crea una entrada de inventario
 * Envía los artículos escaneados al backend para crear el documento
 */
export async function crearEntradaInventario(
  params: CrearEntradaParams
): Promise<CrearEntradaResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREAR_ENTRADA}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      databaseId,
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: CrearEntradaResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al crear la entrada');
  }

  return data;
}

export async function getEntradas(
  sucursalId?: number,
  almacenId?: number,
  fechaInicio?: string,
  fechaFin?: string
): Promise<Entrada[]> {
  let endpoint = '/inventarios/entradas.php?';
  const params = new URLSearchParams();

  if (sucursalId) params.append('sucursal_id', sucursalId.toString());
  if (almacenId) params.append('almacen_id', almacenId.toString());
  if (fechaInicio) params.append('fecha_inicio', fechaInicio);
  if (fechaFin) params.append('fecha_fin', fechaFin);

  const response = await apiRequest<Entrada[]>(endpoint + params.toString());

  if (response?.success && response?.data) {
    return response.data;
  }

  return [];
}

export async function getEntrada(id: number): Promise<Entrada | null> {
  const response = await apiRequest<Entrada>(`/inventarios/entradas.php?id=${id}`);

  if (response?.success && response?.data) {
    return response.data;
  }

  return null;
}

export async function createEntrada(entrada: Omit<Entrada, 'id'>): Promise<Entrada> {
  const response = await apiRequest<Entrada>('/inventarios/entradas.php', {
    method: 'POST',
    body: entrada,
  });

  if (response?.success && response?.data) {
    return response.data;
  }

  throw new Error(response?.message || 'Error al crear la entrada');
}

export async function updateEntrada(id: number, entrada: Partial<Entrada>): Promise<Entrada> {
  const response = await apiRequest<Entrada>('/inventarios/entradas.php', {
    method: 'PUT',
    body: { id, ...entrada },
  });

  if (response?.success && response?.data) {
    return response.data;
  }

  throw new Error(response?.message || 'Error al actualizar la entrada');
}

// ============================================
// SALIDAS
// ============================================

/**
 * Crea una salida de inventario
 * Envía los artículos escaneados al backend para crear el documento
 * Requiere P_CENTRO_COSTO_ID
 */
export async function crearSalidaInventario(
  params: CrearSalidaParams
): Promise<CrearSalidaResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREAR_SALIDA}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      databaseId,
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: CrearSalidaResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al crear la salida');
  }

  return data;
}

export async function getSalidas(
  sucursalId?: number,
  almacenId?: number
): Promise<Salida[]> {
  let endpoint = '/inventarios/salidas.php?';
  const params = new URLSearchParams();

  if (sucursalId) params.append('sucursal_id', sucursalId.toString());
  if (almacenId) params.append('almacen_id', almacenId.toString());

  const response = await apiRequest<Salida[]>(endpoint + params.toString());

  if (response?.success && response?.data) {
    return response.data;
  }

  return [];
}

export async function createSalida(salida: Omit<Salida, 'id'>): Promise<Salida> {
  const response = await apiRequest<Salida>('/inventarios/salidas.php', {
    method: 'POST',
    body: salida,
  });

  if (response?.success && response?.data) {
    return response.data;
  }

  throw new Error(response?.message || 'Error al crear la salida');
}

// ============================================
// RECEPCIONES
// ============================================

export async function getRecepciones(
  sucursalId?: number,
  almacenId?: number
): Promise<Recepcion[]> {
  let endpoint = '/inventarios/recepciones.php?';
  const params = new URLSearchParams();

  if (sucursalId) params.append('sucursal_id', sucursalId.toString());
  if (almacenId) params.append('almacen_id', almacenId.toString());

  const response = await apiRequest<Recepcion[]>(endpoint + params.toString());

  if (response?.success && response?.data) {
    return response.data;
  }

  return [];
}

export async function createRecepcion(recepcion: Omit<Recepcion, 'id'>): Promise<Recepcion> {
  const response = await apiRequest<Recepcion>('/inventarios/recepciones.php', {
    method: 'POST',
    body: recepcion,
  });

  if (response?.success && response?.data) {
    return response.data;
  }

  throw new Error(response?.message || 'Error al crear la recepción');
}

/**
 * Crea un inventario físico
 * Envía los artículos escaneados al backend para crear el documento de inventario físico
 */
export async function crearInventarioFisico(
  params: CrearInventarioFisicoParams
): Promise<CrearInventarioFisicoResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREAR_INVENTARIO_FISICO}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      databaseId,
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: CrearInventarioFisicoResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al crear el inventario físico');
  }

  return data;
}

/**
 * Obtiene documentos de inventario físico por rango de fechas
 */
export async function getDoctosInvfisSemana(
  start?: string,
  end?: string,
  pending?: boolean
): Promise<DoctoInvfis[]> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  if (start) queryParams.append('start', start);
  if (end) queryParams.append('end', end);
  if (pending !== undefined) queryParams.append('pending', pending.toString());

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOS_INVFIS_SEMANA}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: GetDoctosInvfisResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al consultar documentos');
  }

  return data.data || [];
}

/**
 * Obtiene el detalle de un inventario físico por folio
 */
export async function getDetalleInvfis(folio: string): Promise<DetalleInvfisResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  queryParams.append('folio', folio);

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DETALLE_INVFIS}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: DetalleInvfisResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al consultar detalle');
  }

  return data;
}

/**
 * Aplicar un inventario físico
 */
export interface AplicarInvfisResponse {
  ok: boolean;
  message: string;
  folio: string;
  fecha: string;
}

export async function aplicarInventarioFisico(
  folio: string,
  usuario?: string
): Promise<AplicarInvfisResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APLICAR_INVFIS}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      databaseId,
      folio,
      usuario: usuario || 'APP_MOVIL'
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: AplicarInvfisResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.message || 'Error al aplicar inventario');
  }

  return data;
}

// --- LINEAS DE ARTICULOS ---

export interface LineaArticulo {
  id: number;
  nombre: string;
}

export async function getLineasArticulos(
  search: string = ''
): Promise<LineaArticulo[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const response = await apiRequest<{ success: boolean; data: any[] }>(
    `${API_CONFIG.ENDPOINTS.LINEAS_ARTICULOS}?${params.toString()}`,
    { method: 'GET' }
  );

  if (response.success && Array.isArray(response.data)) {
    return response.data.map(item => ({
      id: item.id,
      nombre: item.nombre
    }));
  }

  throw new Error('Error al cargar líneas de artículos');
}

/**
 * Obtiene el historial de entradas de inventario
 */
/**
 * Obtiene el historial de entradas de inventario
 */
export async function getDoctosEntradas(params?: GetDoctosParams): Promise<DoctoEntrada[]> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  queryParams.append('limit', params?.limit?.toString() || '50');
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOS_ENTRADAS}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: GetDoctosEntradasResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error al consultar historial de entradas');
  }

  return data.entradas || [];
}

/**
 * Obtiene el historial de salidas de inventario
 */
/**
 * Obtiene el historial de salidas de inventario
 */
export async function getDoctosSalidas(params?: GetDoctosParams): Promise<DoctoEntrada[]> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  queryParams.append('limit', params?.limit?.toString() || '50');
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOS_SALIDAS}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: GetDoctosSalidasResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error al consultar historial de salidas');
  }

  return data.salidas || [];
}

/**
 * Obtiene el detalle de un documento de inventario (Entrada/Salida)
 */
export async function getDoctoInDetalle(folio: string): Promise<DoctoInDetalle> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  queryParams.append('folio', folio);

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTO_IN_DETALLE}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: GetDoctoInDetalleResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'No se pudo obtener el detalle del documento');
  }

  return data.data;
}

export async function createLineaArticulo(
  nombre: string,
  grupoLineaId: number
): Promise<{ success: boolean; message: string }> {

  const response = await apiRequest<{ success: boolean; message: string }>(
    API_CONFIG.ENDPOINTS.LINEAS_ARTICULOS,
    {
      method: 'POST',
      body: JSON.stringify({ nombre, grupoLineaId })
    }
  );

  if (response.success) {
    return {
      success: response.success,
      message: response.message || 'Línea creada correctamente'
    };
  }

  throw new Error(response.message || 'Error al crear la línea de artículos');
}

// ============================================
// CONTEO POR UBICACIÓN
// ============================================

export interface ArticuloUbicacion {
  ARTICULO_ID: number;
  CLAVE_ARTICULO: string;
  NOMBRE: string;
  UMED: string;
  LOCALIZACION: string;
}

export interface BuscarArticulosUbicacionResponse {
  ok: boolean;
  articulos: ArticuloUbicacion[];
  count: number;
  localizacion: string;
  almacen_id: number;
  ubicaciones_encontradas: string[];
  busqueda_tipo: string;
  error?: string;
}

/**
 * Busca artículos por ubicación en un almacén específico
 * Usa STARTING WITH para buscar con profundidad (prefijos)
 */
export async function buscarArticulosPorUbicacion(
  localizacion: string,
  almacenId: number
): Promise<BuscarArticulosUbicacionResponse> {
  const databaseId = getCurrentDatabaseId();

  if (!databaseId) {
    throw new Error('No hay base de datos seleccionada');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('databaseId', databaseId.toString());
  queryParams.append('localizacion', localizacion);
  queryParams.append('almacen_id', almacenId.toString());

  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BUSCAR_ARTICULOS_UBICACION}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: BuscarArticulosUbicacionResponse = await response.json();

  if (!data.ok) {
    throw new Error(data.error || 'Error al buscar artículos por ubicación');
  }

  return data;
}
