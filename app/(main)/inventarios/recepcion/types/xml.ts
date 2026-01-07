/**
 * Tipos e interfaces para el procesamiento de XML (CFDI)
 * Usados por todos los proveedores: PANAM, CACHORRO, MUNDO
 */

// ============================================
// INTERFACES DEL XML PARSEADO
// ============================================

/** Datos del comprobante CFDI */
export interface DatosComprobante {
  serie: string
  folio: string
  fecha: string
  total: number
  subtotal: number
  emisor: string
  emisorRFC: string
  receptor: string
  receptorRFC: string
}

/** Concepto individual del XML (línea de producto) */
export interface ConceptoXML {
  claveProdServ: string
  noIdentificacion: string
  descripcion: string
  cantidad: number
  valorUnitario: number
  importe: number
  unidad?: string
}

/** Resultado del parsing del XML */
export interface XMLParseResult {
  ok: boolean
  error?: string
  comprobante?: DatosComprobante
  conceptos?: ConceptoXML[]
}

// ============================================
// INTERFACES DEL PRODUCTO PROCESADO
// ============================================

/** Producto procesado listo para escaneo */
export interface ProductoXML {
  /** Código normalizado (8 dígitos para Cachorro, completo para otros) */
  CLAVE: string
  /** Código original del XML (NoIdentificacion) */
  CLAVE_ORIGINAL: string
  /** Descripción del producto */
  DESCRIPCION: string
  /** Cantidad requerida */
  CANTIDAD: number
  /** Valor unitario del XML */
  VALOR_UNITARIO: number
  /** Importe total de la línea */
  IMPORTE: number
  /** Piezas empacadas manualmente */
  packed: number
  /** Piezas escaneadas */
  scanned: number
  /** Indica si se encontró en la BD */
  _foundInDB?: boolean
  /** Clave resuelta desde BD (PANAM) */
  _resolvedClave?: string
  /** Rol del producto (PANAM) */
  _role?: string
  /** Lista de códigos largos (CACHORRO - tallas) */
  _codigosLargos?: string[]
}

// ============================================
// INTERFACES POR PROVEEDOR
// ============================================

/** Tipos de proveedor soportados */
export type ProveedorXML = 'panam' | 'cachorro' | 'mundo'

/** Metadatos del XML procesado */
export interface XMLMeta {
  provider: ProveedorXML
  folio: string
  serie: string
  fecha: string
  total: number
  emisor: string
  receptor: string
  totalProductos: number
  totalPiezas: number
  /** Códigos que no se encontraron en BD (PANAM) */
  codigosNoEncontrados?: string[]
}

// ============================================
// INTERFACES ESPECÍFICAS CACHORRO
// ============================================

/** Mapa de tallas escaneadas por producto (CACHORRO) */
export type CachorroTallasMap = Record<string, Record<string, number>>
// { "12345678": { "12345678XL": 2, "123456782X": 3 } }

/** Resultado de cargar códigos alternos (CACHORRO) */
export interface CodigosAlternosResult {
  /** Map<codigoLargo, claveMicrosip> */
  codigosMap: Map<string, string>
  /** Map<codigoLargo, codigoXML> */
  largoToXmlMap: Map<string, string>
  /** Map<claveMicrosip, codigoXML> */
  skuToXmlMap: Map<string, string>
  totalCargados: number
}

// ============================================
// INTERFACES ESPECÍFICAS PANAM
// ============================================

/** Respuesta de resolve-role (PANAM) */
export interface ResolveRoleResponse {
  ok: boolean
  claveArticulo?: string
  role?: string
  message?: string
}

// ============================================
// INTERFACES PARA GUARDAR RECEPCIÓN
// ============================================

/** Detalle de una línea para guardar en BD */
export interface DetalleRecepcion {
  /** Clave del artículo (SKU Microsip para Cachorro, código XML para otros) */
  CLAVE: string
  /** Código original del XML */
  CLAVE_XML: string
  /** Clave Microsip (solo Cachorro) */
  CLAVE_MICROSIP: string | null
  /** Cantidad recibida */
  CANTIDAD: number
  /** Costo unitario del XML */
  COSTO_UNITARIO: number
}

/** Payload completo para enviar recepción */
export interface RecepcionPayload {
  P_SISTEMA: string
  P_CONCEPTO_ID: number
  P_SUCURSAL_ID: number
  P_ALMACEN_ID: number
  P_DESCRIPCION: string
  P_NATURALEZA_CONCEPTO: string
  detalles: DetalleRecepcion[]
}

/** Respuesta del servidor al guardar recepción */
export interface RecepcionResponse {
  ok: boolean
  message?: string
  folio?: string
  doctoId?: number
  inserted?: number
}

// ============================================
// INTERFACES PARA NAVEGACIÓN
// ============================================

/** Datos que se pasan a la pantalla de escaneo */
export interface XMLNavigationParams {
  productos: ProductoXML[]
  meta: XMLMeta
  folio: string
}

// ============================================
// INTERFACES PARA BORRADORES
// ============================================

/** Borrador guardado en AsyncStorage */
export interface XMLDraft {
  productos: ProductoXML[]
  meta: XMLMeta
  folio: string
  elapsedSeconds: number
  requireScan: boolean
  cachorroTallas?: CachorroTallasMap
  savedAt: number
}
