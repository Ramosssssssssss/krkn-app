// Servicios específicos del módulo de Inventarios

import {
    Entrada,
    Recepcion,
    Salida,
    SucursalAlmacenRaw
} from '@/types/inventarios';
import { apiRequest, apiRequestWithRetry } from './api';

// ============================================
// SUCURSALES Y ALMACENES
// ============================================

export async function getSucursalesAlmacenes(
  onRetry?: (attempt: number) => void
): Promise<SucursalAlmacenRaw[]> {
  const response = await apiRequestWithRetry<SucursalAlmacenRaw[]>(
    '/sucursales-almacenes.php',
    { method: 'GET' },
    3,
    onRetry
  );

  if (response?.success && response?.data && Array.isArray(response.data)) {
    return response.data;
  }

  throw new Error('Formato de datos inválido');
}

// ============================================
// ENTRADAS
// ============================================

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
