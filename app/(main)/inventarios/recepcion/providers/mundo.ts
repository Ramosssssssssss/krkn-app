/**
 * Procesador de XML para proveedor MUNDO
 * 
 * Características específicas:
 * - Usa el NoIdentificacion completo del XML
 * - Similar a PANAM pero sin validación en BD
 * - Procesamiento directo sin consultas adicionales
 */

import type {
  ConceptoXML,
  DatosComprobante,
  ProductoXML,
  XMLMeta,
} from '../types/xml'
import { normalizarCodigo } from '../utils/xml-parser'

/**
 * Procesa los conceptos del XML para MUNDO
 * Mantiene cada línea independiente (no agrupa)
 * @param conceptos - Conceptos extraídos del XML
 * @returns Productos procesados
 */
export function procesarConceptosMundo(
  conceptos: ConceptoXML[]
): ProductoXML[] {
  const productos: ProductoXML[] = []
  
  for (const concepto of conceptos) {
    const codigo = normalizarCodigo(concepto.noIdentificacion)
    
    if (!codigo) continue
    
    productos.push({
      CLAVE: codigo,
      CLAVE_ORIGINAL: codigo,
      DESCRIPCION: concepto.descripcion,
      CANTIDAD: concepto.cantidad,
      VALOR_UNITARIO: concepto.valorUnitario,
      IMPORTE: concepto.importe,
      packed: 0,
      scanned: 0,
      _foundInDB: true, // Asumimos que existe (sin validación)
    })
  }
  
  return productos
}

/**
 * Genera los metadatos del XML para MUNDO
 */
export function generarMetaMundo(
  comprobante: DatosComprobante,
  productos: ProductoXML[]
): XMLMeta {
  return {
    provider: 'mundo',
    folio: `${comprobante.serie || 'SN'}-${comprobante.folio || 'SF'}`,
    serie: comprobante.serie,
    fecha: comprobante.fecha,
    total: comprobante.total,
    emisor: comprobante.emisor,
    receptor: comprobante.receptor,
    totalProductos: productos.length,
    totalPiezas: productos.reduce((sum, p) => sum + p.CANTIDAD, 0),
  }
}

/**
 * Normaliza un código escaneado para buscar en la lista de productos
 * Para MUNDO: usa el código completo
 */
export function normalizarCodigoEscaneadoMundo(codigo: string): string {
  return normalizarCodigo(codigo)
}

/**
 * Procesa un escaneo para MUNDO
 * Búsqueda directa en la lista de productos
 */
export function procesarEscaneoMundo(
  codigoEscaneado: string,
  productos: ProductoXML[]
): {
  encontrado: boolean
  indice: number
  producto: ProductoXML | null
} {
  const codigo = normalizarCodigo(codigoEscaneado)
  
  const indice = productos.findIndex(p => p.CLAVE === codigo)
  
  if (indice !== -1) {
    return {
      encontrado: true,
      indice,
      producto: productos[indice],
    }
  }
  
  return {
    encontrado: false,
    indice: -1,
    producto: null,
  }
}

/**
 * Convierte los productos escaneados al formato de detalle para guardar
 */
export function convertirADetallesMundo(
  productos: ProductoXML[],
  requireScan: boolean
): {
  CLAVE: string
  CLAVE_XML: string
  CLAVE_MICROSIP: string | null
  CANTIDAD: number
  COSTO_UNITARIO: number
}[] {
  const detalles: {
    CLAVE: string
    CLAVE_XML: string
    CLAVE_MICROSIP: string | null
    CANTIDAD: number
    COSTO_UNITARIO: number
  }[] = []

  for (const producto of productos) {
    const totalEscaneado = requireScan ? producto.scanned : producto.packed
    
    if (totalEscaneado <= 0) continue
    
    detalles.push({
      CLAVE: producto.CLAVE_ORIGINAL,
      CLAVE_XML: producto.CLAVE_ORIGINAL,
      CLAVE_MICROSIP: null,
      CANTIDAD: totalEscaneado,
      COSTO_UNITARIO: producto.VALOR_UNITARIO,
    })
  }

  return detalles
}
