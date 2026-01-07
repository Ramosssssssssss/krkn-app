/**
 * Procesador de XML para proveedor GRUPO PANAM
 * 
 * Características específicas:
 * - Usa el NoIdentificacion completo del XML
 * - Valida cada código en BD usando /resolve-role
 * - Detecta códigos que no existen en la base de datos
 * - No agrupa por modelo, cada línea es independiente
 */

import type {
    ConceptoXML,
    DatosComprobante,
    ProductoXML,
    XMLMeta
} from '../types/xml'
import { resolverCodigosPanamBatch } from '../utils/api'
import { normalizarCodigo } from '../utils/xml-parser'

/**
 * Procesa los conceptos del XML para PANAM
 * Mantiene cada línea independiente (no agrupa)
 * @param conceptos - Conceptos extraídos del XML
 * @returns Productos sin procesar (se validarán después)
 */
export function procesarConceptosPanam(
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
      _foundInDB: false, // Se actualizará después de validar
    })
  }
  
  return productos
}

/**
 * Valida los productos de PANAM contra la base de datos
 * Usa el endpoint /resolve-role para verificar cada código
 * 
 * @param baseURL - URL base del servidor
 * @param productos - Productos a validar
 * @returns Productos actualizados con info de BD + lista de no encontrados
 */
export async function validarProductosPanam(
  baseURL: string,
  productos: ProductoXML[]
): Promise<{
  productos: ProductoXML[]
  codigosNoEncontrados: string[]
}> {
  // Obtener códigos únicos
  const codigosUnicos = [...new Set(productos.map(p => p.CLAVE))]
  
  // Consultar BD en batch
  const resultados = await resolverCodigosPanamBatch(baseURL, codigosUnicos)
  
  // Actualizar productos con resultados
  const productosActualizados = productos.map(producto => {
    const resultado = resultados.get(producto.CLAVE)
    
    if (resultado?.ok && resultado.claveArticulo) {
      return {
        ...producto,
        _foundInDB: true,
        _resolvedClave: resultado.claveArticulo,
        _role: resultado.role,
      }
    }
    
    return {
      ...producto,
      _foundInDB: false,
    }
  })
  
  // Identificar códigos no encontrados
  const codigosNoEncontrados = codigosUnicos.filter(codigo => {
    const resultado = resultados.get(codigo)
    return !resultado?.ok
  })
  
  return {
    productos: productosActualizados,
    codigosNoEncontrados,
  }
}

/**
 * Genera los metadatos del XML para PANAM
 */
export function generarMetaPanam(
  comprobante: DatosComprobante,
  productos: ProductoXML[],
  codigosNoEncontrados: string[]
): XMLMeta {
  return {
    provider: 'panam',
    folio: `${comprobante.serie || 'SN'}-${comprobante.folio || 'SF'}`,
    serie: comprobante.serie,
    fecha: comprobante.fecha,
    total: comprobante.total,
    emisor: comprobante.emisor,
    receptor: comprobante.receptor,
    totalProductos: productos.length,
    totalPiezas: productos.reduce((sum, p) => sum + p.CANTIDAD, 0),
    codigosNoEncontrados,
  }
}

/**
 * Normaliza un código escaneado para buscar en la lista de productos
 * Para PANAM: usa el código completo
 */
export function normalizarCodigoEscaneadoPanam(codigo: string): string {
  return normalizarCodigo(codigo)
}

/**
 * Procesa un escaneo para PANAM
 * Búsqueda directa en la lista de productos
 */
export function procesarEscaneoPanam(
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
export function convertirADetallesPanam(
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
    
    // Para PANAM: usar el código ORIGINAL completo
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

/**
 * Filtra productos que no se encontraron en BD
 */
export function filtrarProductosNoEncontrados(
  productos: ProductoXML[]
): ProductoXML[] {
  return productos.filter(p => !p._foundInDB)
}

/**
 * Filtra productos que sí se encontraron en BD
 */
export function filtrarProductosEncontrados(
  productos: ProductoXML[]
): ProductoXML[] {
  return productos.filter(p => p._foundInDB)
}
