/**
 * Procesador de XML para proveedor EL CACHORRO
 * 
 * Características específicas:
 * - Agrega productos por los primeros 8 dígitos (modelo)
 * - El código largo incluye la talla (ej: "12345678XL")
 * - Maneja tallas escaneadas individualmente
 * - Usa codigosAlternos de BD para mapear SKU Microsip
 */

import type {
  CachorroTallasMap,
  CodigosAlternosResult,
  ConceptoXML,
  DatosComprobante,
  ProductoXML,
  XMLMeta,
} from '../types/xml'
import { extraerModelo, normalizarCodigo } from '../utils/xml-parser'

/** Longitud del modelo para Cachorro (primeros 8 caracteres) */
const LONGITUD_MODELO = 8

/**
 * Procesa los conceptos del XML agrupándolos por modelo (8 dígitos)
 * @param conceptos - Conceptos extraídos del XML
 * @returns Productos agrupados por modelo
 */
export function procesarConceptosCachorro(
  conceptos: ConceptoXML[]
): ProductoXML[] {
  // Map para agrupar por modelo (primeros 8 dígitos)
  const productosPorModelo = new Map<string, {
    clave: string
    claveOriginal: string
    descripcion: string
    cantidad: number
    valorUnitario: number
    importe: number
    codigosLargos: string[]
  }>()

  for (const concepto of conceptos) {
    const codigoLargo = normalizarCodigo(concepto.noIdentificacion)
    const modelo = extraerModelo(codigoLargo, LONGITUD_MODELO)
    
    if (!modelo) continue
    
    const existing = productosPorModelo.get(modelo)
    
    if (existing) {
      // Agregar al modelo existente
      existing.cantidad += concepto.cantidad
      existing.importe += concepto.importe
      
      // Guardar código largo si no existe
      if (!existing.codigosLargos.includes(codigoLargo)) {
        existing.codigosLargos.push(codigoLargo)
      }
    } else {
      // Crear nuevo modelo
      productosPorModelo.set(modelo, {
        clave: modelo,
        claveOriginal: codigoLargo,
        descripcion: concepto.descripcion,
        cantidad: concepto.cantidad,
        valorUnitario: concepto.valorUnitario,
        importe: concepto.importe,
        codigosLargos: [codigoLargo],
      })
    }
  }

  // Convertir a array de ProductoXML
  const productos: ProductoXML[] = []
  
  for (const [modelo, data] of productosPorModelo) {
    productos.push({
      CLAVE: modelo,
      CLAVE_ORIGINAL: data.claveOriginal,
      DESCRIPCION: data.descripcion,
      CANTIDAD: data.cantidad,
      VALOR_UNITARIO: data.valorUnitario,
      IMPORTE: data.importe,
      packed: 0,
      scanned: 0,
      _foundInDB: true, // Se validará después con códigos alternos
      _codigosLargos: data.codigosLargos,
    })
  }

  return productos
}

/**
 * Genera los metadatos del XML para Cachorro
 */
export function generarMetaCachorro(
  comprobante: DatosComprobante,
  productos: ProductoXML[]
): XMLMeta {
  return {
    provider: 'cachorro',
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
 * Para Cachorro: extrae los primeros 8 dígitos
 */
export function normalizarCodigoEscaneadoCachorro(codigo: string): string {
  return extraerModelo(codigo, LONGITUD_MODELO)
}

/**
 * Procesa un escaneo para Cachorro
 * Busca en el mapa de códigos alternos y retorna el código de búsqueda
 * 
 * @param codigoEscaneado - Código tal cual lo lee el scanner
 * @param codigosAlternosMap - Map<codigoLargo, claveMicrosip>
 * @param codigoLargoToXml - Map<codigoLargo, codigoXML>
 * @param claveMicrosipToXml - Map<claveMicrosip, codigoXML>
 * 
 * @returns Objeto con la información de búsqueda
 */
export function procesarEscaneoCachorro(
  codigoEscaneado: string,
  codigosAlternosMap: Map<string, string>,
  codigoLargoToXml: Map<string, string>,
  claveMicrosipToXml: Map<string, string>
): {
  encontrado: boolean
  codigoBusqueda: string
  claveMicrosip: string | null
  requiereAsignacion: boolean
  codigoXmlAsociado: string | null
} {
  const codigo = normalizarCodigo(codigoEscaneado)
  
  // 1. Buscar por código largo en mapa de alternos
  const claveMicrosipPorLargo = codigosAlternosMap.get(codigo) || null
  
  if (claveMicrosipPorLargo) {
    // Encontrado por código largo - buscar XML asociado
    const codigoXml = codigoLargoToXml.get(codigo)
    
    if (codigoXml) {
      return {
        encontrado: true,
        codigoBusqueda: extraerModelo(codigoXml, LONGITUD_MODELO),
        claveMicrosip: claveMicrosipPorLargo,
        requiereAsignacion: false,
        codigoXmlAsociado: codigoXml,
      }
    }
    
    // Buscar si el SKU ya fue asignado a algún XML
    const xmlAsignado = claveMicrosipToXml.get(claveMicrosipPorLargo)
    
    if (xmlAsignado) {
      return {
        encontrado: true,
        codigoBusqueda: extraerModelo(xmlAsignado, LONGITUD_MODELO),
        claveMicrosip: claveMicrosipPorLargo,
        requiereAsignacion: false,
        codigoXmlAsociado: xmlAsignado,
      }
    }
  }
  
  // 2. Buscar directamente por clave Microsip (si escanearon el SKU)
  const xmlPorMicrosip = claveMicrosipToXml.get(codigo)
  
  if (xmlPorMicrosip) {
    return {
      encontrado: true,
      codigoBusqueda: extraerModelo(xmlPorMicrosip, LONGITUD_MODELO),
      claveMicrosip: codigo, // El código escaneado ES la clave microsip
      requiereAsignacion: false,
      codigoXmlAsociado: xmlPorMicrosip,
    }
  }
  
  // 3. No encontrado - requiere asignación manual
  return {
    encontrado: false,
    codigoBusqueda: '',
    claveMicrosip: claveMicrosipPorLargo,
    requiereAsignacion: true,
    codigoXmlAsociado: null,
  }
}

/**
 * Registra una talla escaneada en el mapa de tallas
 */
export function registrarTallaEscaneada(
  cachorroTallas: CachorroTallasMap,
  codigoModelo: string,
  claveMicrosip: string
): CachorroTallasMap {
  const updated = { ...cachorroTallas }
  
  if (!updated[codigoModelo]) {
    updated[codigoModelo] = {}
  }
  
  const currentCount = updated[codigoModelo][claveMicrosip] || 0
  updated[codigoModelo][claveMicrosip] = currentCount + 1
  
  return updated
}

/**
 * Obtiene el resumen de tallas escaneadas para un producto
 */
export function obtenerResumenTallas(
  cachorroTallas: CachorroTallasMap,
  codigoModelo: string
): { claveMicrosip: string; cantidad: number }[] {
  const tallas = cachorroTallas[codigoModelo] || {}
  
  return Object.entries(tallas).map(([claveMicrosip, cantidad]) => ({
    claveMicrosip,
    cantidad,
  }))
}

/**
 * Convierte los productos y tallas escaneadas al formato de detalle para guardar
 */
export function convertirADetallesCachorro(
  productos: ProductoXML[],
  cachorroTallas: CachorroTallasMap,
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
    const tallasEscaneadas = cachorroTallas[producto.CLAVE] || {}
    const totalEscaneado = requireScan ? producto.scanned : producto.packed
    
    if (totalEscaneado <= 0) continue
    
    // Si tiene tallas de Microsip, crear una línea por cada SKU
    if (Object.keys(tallasEscaneadas).length > 0) {
      for (const [claveMicrosip, cantidad] of Object.entries(tallasEscaneadas)) {
        detalles.push({
          CLAVE: claveMicrosip, // SKU de Microsip es la clave
          CLAVE_XML: producto.CLAVE_ORIGINAL,
          CLAVE_MICROSIP: claveMicrosip,
          CANTIDAD: cantidad,
          COSTO_UNITARIO: producto.VALOR_UNITARIO,
        })
      }
    } else {
      // Sin tallas específicas - usar código del XML
      detalles.push({
        CLAVE: producto.CLAVE,
        CLAVE_XML: producto.CLAVE_ORIGINAL,
        CLAVE_MICROSIP: null,
        CANTIDAD: totalEscaneado,
        COSTO_UNITARIO: producto.VALOR_UNITARIO,
      })
    }
  }

  return detalles
}

/**
 * Valida productos de Cachorro contra la tabla CODIGO_ALTERNO
 * Marca cuáles tienen códigos alternos y cuáles no
 * 
 * @param productos - Productos procesados del XML
 * @param codigosResult - Resultado de cargarCodigosAlternosBatch
 * @returns Productos actualizados con _foundInDB y lista de no encontrados
 */
export function validarProductosCachorro(
  productos: ProductoXML[],
  codigosResult: CodigosAlternosResult
): {
  productos: ProductoXML[]
  codigosNoEncontrados: string[]
  codigosAlternosMap: Map<string, string>
  largoToXmlMap: Map<string, string>
  skuToXmlMap: Map<string, string>
} {
  const codigosNoEncontrados: string[] = []
  
  // Crear set de códigos XML que tienen alternos
  // largoToXmlMap es: codigoLargo → codigoXML
  // Necesitamos los valores (codigoXML) que SÍ tienen alternos
  const codigosXmlConAlternos = new Set<string>()
  for (const codigoXml of codigosResult.largoToXmlMap.values()) {
    codigosXmlConAlternos.add(codigoXml)
  }
  
  // Actualizar productos
  const productosActualizados = productos.map(p => {
    // _codigosLargos contiene los códigos XML (ej: 10027390T180A)
    // Verificar si alguno de sus códigos del XML tiene alternos registrados
    const tieneAlternos = p._codigosLargos?.some(codigoXml => 
      codigosXmlConAlternos.has(codigoXml)
    ) || codigosXmlConAlternos.has(p.CLAVE_ORIGINAL)
    
    if (!tieneAlternos) {
      // Agregar los códigos que no tienen alternos
      if (p._codigosLargos && p._codigosLargos.length > 0) {
        for (const cl of p._codigosLargos) {
          if (!codigosNoEncontrados.includes(cl)) {
            codigosNoEncontrados.push(cl)
          }
        }
      } else {
        codigosNoEncontrados.push(p.CLAVE_ORIGINAL)
      }
    }
    
    return {
      ...p,
      _foundInDB: tieneAlternos,
    }
  })
  
  return {
    productos: productosActualizados,
    codigosNoEncontrados,
    codigosAlternosMap: codigosResult.codigosMap,
    largoToXmlMap: codigosResult.largoToXmlMap,
    skuToXmlMap: codigosResult.skuToXmlMap,
  }
}
