// Tipos para el módulo de Inventarios

// Tipos compartidos para movimientos
export interface ArticuloDetalle {
  clave: string;
  descripcion: string;
  nombre?: string;
  umed: string | null;
  cantidad: number;
  _key: string;
  articuloId?: number;
  localizacion?: string;
  precio?: number;
  precioLista?: number;
  precioDistribuidor?: number;
}

export type MovementType = 'entrada' | 'salida' | 'recepcion';

export const MOVEMENT_COLORS: Record<MovementType, string> = {
  entrada: '#22C55E',   // Verde
  salida: '#EF4444',    // Rojo
  recepcion: '#3B82F6', // Azul
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  recepcion: 'Recepción',
};

export interface Sucursal {
  id: number;
  nombre: string;
}

export interface Almacen {
  id: number;
  nombre: string;
  sucursalId: number;
}

export interface SucursalAlmacenRaw {
  SUCURSAL_ID: number;
  NOMBRE_SUCURSAL: string;
  ALMACEN_ID: number;
  NOMBRE_ALMACEN: string;
}

export interface EntradaHeader {
  id?: number;
  sucursalId: number;
  almacenId: number;
  fecha: string;
  referencia?: string;
  observaciones?: string;
  estatus: 'borrador' | 'confirmada' | 'cancelada';
}

export interface EntradaDetalle {
  id?: number;
  entradaId?: number;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  unidad: string;
  lote?: string;
  fechaCaducidad?: string;
}

export interface Entrada extends EntradaHeader {
  detalles: EntradaDetalle[];
}

export interface SalidaHeader {
  id?: number;
  sucursalId: number;
  almacenId: number;
  fecha: string;
  referencia?: string;
  tipoSalida: 'venta' | 'traspaso' | 'ajuste' | 'merma';
  observaciones?: string;
  estatus: 'borrador' | 'confirmada' | 'cancelada';
}

export interface SalidaDetalle {
  id?: number;
  salidaId?: number;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  unidad: string;
  lote?: string;
}

export interface Salida extends SalidaHeader {
  detalles: SalidaDetalle[];
}

export interface RecepcionHeader {
  id?: number;
  sucursalId: number;
  almacenId: number;
  fecha: string;
  proveedorId?: number;
  proveedorNombre?: string;
  ordenCompra?: string;
  observaciones?: string;
  estatus: 'pendiente' | 'parcial' | 'completa' | 'cancelada';
}

export interface RecepcionDetalle {
  id?: number;
  recepcionId?: number;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  cantidadEsperada: number;
  cantidadRecibida: number;
  unidad: string;
  lote?: string;
  fechaCaducidad?: string;
}

export interface Recepcion extends RecepcionHeader {
  detalles: RecepcionDetalle[];
}
