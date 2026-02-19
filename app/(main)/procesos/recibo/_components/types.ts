// Tipos e interfaces para el módulo de Recibo

export interface OrdenCompra {
  DOCTO_CM_ID: number;
  FOLIO: string;
  FOLIO_DISPLAY?: string; // Folio sin ceros para mostrar
  FECHA: string;
  CLAVE_PROV: string;
  ALMACEN: string;
  PROVEEDOR: string;
}

export interface DetalleArticulo {
  ARTICULO_ID: number;
  CLAVE: string;
  CODIGO_BARRAS: string;
  DESCRIPCION: string;
  UNIDAD: string;
  CANTIDAD: number;
  UNIDADES_YA_RECIBIDAS?: number;
  IMAGEN_BASE64: string | null;
  // Estado local para escaneo
  cantidadEscaneada: number;
  // Campos para órdenes combinadas
  ordenOrigen?: string; // Folio de la orden de donde viene
  doctoId?: number; // DOCTO_CM_ID de la orden
}

// Orden combinada para recibo múltiple
export interface CombinedOrder {
  folio: string;
  doctoId: number;
  productCount: number;
  caratula: OrdenCompra;
}

export interface CodigoInner {
  CODIGO_INNER: string;
  CONTENIDO_EMPAQUE: number;
  ARTICULO_ID: number;
}

export type ViewMode = "search" | "detail";

// Tipos de incidencia
export const TIPOS_INCIDENCIA = [
  { id: "dañado", label: "Producto dañado", icon: "warning" },
  { id: "faltante", label: "Producto faltante", icon: "remove-circle" },
  { id: "sobrante", label: "Producto sobrante", icon: "add-circle" },
  { id: "equivocado", label: "Producto equivocado", icon: "swap-horizontal" },
  { id: "caducado", label: "Producto caducado", icon: "time" },
  { id: "otro", label: "Otra incidencia", icon: "ellipsis-horizontal" },
] as const;

export type TipoIncidencia = (typeof TIPOS_INCIDENCIA)[number]["id"];

export interface Incidencia {
  articuloId: number;
  tipo: TipoIncidencia;
  notas?: string;
}

// Devoluciones por artículo
export interface Devolucion {
  articuloId: number;
  cantidad: number; // Cantidad a devolver
  clave: string;
}

// Props para ArticleCardRecibo
export interface ArticleCardReciboProps {
  item: DetalleArticulo;
  colors: any;
  innerCodes: CodigoInner[];
  onUpdateQuantity: (articuloId: number, delta: number) => void;
  onUpdateQuantityWithDestino: (
    articuloId: number,
    delta: number,
    codigo: string,
  ) => void;
  onSetQuantity: (articuloId: number, qty: number) => void;
  onShowDetails: (item: DetalleArticulo, innerCodes: CodigoInner[]) => void;
  onIncidencia: (item: DetalleArticulo) => void;
  onDevolucion: (item: DetalleArticulo) => void;
  tieneIncidencia?: boolean;
  cantidadDevolucion?: number;
  isBackorder?: boolean;
  onBackorder: (articuloId: number) => void;
  onSwipeOpen?: (articuloId: number) => void;
  isHighlighted?: boolean;
}

// Datos del modal de éxito
export interface SuccessDataRecibo {
  folioRecepcion: string | null;
  folioDevolucion: string | null;
  totalArticulos: number;
  totalUnidadesRecibidas: number; // Total de unidades que entraron (existencias + apartado)
  totalDevoluciones: number;
  unidadesDevueltas: number;
}

// Resultado del escaneo
export interface ScanResult {
  success: boolean;
  message: string;
  articulo?: string;
}
