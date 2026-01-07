/**
 * API para operaciones de recepción XML
 * Incluye validación de códigos, resolución de roles y envío de recepción
 */

import type {
    CodigosAlternosResult,
    RecepcionPayload,
    RecepcionResponse,
    ResolveRoleResponse,
} from '../types/xml'

// ============================================
// PANAM: Resolver código en BD
// ============================================

/**
 * Resuelve un código de PANAM consultando la BD
 * @param baseURL - URL base del servidor
 * @param codigo - Código NoIdentificacion del XML
 * @returns Datos del artículo si existe
 */
export async function resolverCodigoPanam(
  baseURL: string,
  codigo: string
): Promise<ResolveRoleResponse> {
  try {
    const url = `${baseURL}/resolve-role?noid=${encodeURIComponent(codigo)}&provider=panam`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      return { ok: false, message: `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    
    return {
      ok: data.ok === true,
      claveArticulo: data.claveArticulo || data.clave_articulo,
      role: data.role,
      message: data.message,
    }
  } catch (error) {
    console.error('Error resolviendo código PANAM:', error)
    return { ok: false, message: 'Error de conexión' }
  }
}

/**
 * Resuelve múltiples códigos PANAM en paralelo
 * @param baseURL - URL base del servidor
 * @param codigos - Array de códigos a resolver
 * @returns Map de código -> respuesta
 */
export async function resolverCodigosPanamBatch(
  baseURL: string,
  codigos: string[]
): Promise<Map<string, ResolveRoleResponse>> {
  const resultados = new Map<string, ResolveRoleResponse>()
  const codigosUnicos = [...new Set(codigos)]
  
  // Procesar en lotes de 10 para no saturar el servidor
  const BATCH_SIZE = 10
  
  for (let i = 0; i < codigosUnicos.length; i += BATCH_SIZE) {
    const batch = codigosUnicos.slice(i, i + BATCH_SIZE)
    
    const promesas = batch.map(async (codigo) => {
      const resultado = await resolverCodigoPanam(baseURL, codigo)
      return { codigo, resultado }
    })
    
    const resultadosBatch = await Promise.all(promesas)
    
    for (const { codigo, resultado } of resultadosBatch) {
      resultados.set(codigo, resultado)
    }
  }
  
  return resultados
}

// ============================================
// CACHORRO: Códigos alternos
// ============================================

/**
 * Consulta la clave Microsip para un código largo (CACHORRO)
 * @param baseURL - URL base del servidor
 * @param codigoLargo - Código largo escaneado
 * @returns Clave Microsip si existe
 */
export async function consultarClaveMicrosip(
  baseURL: string,
  codigoLargo: string
): Promise<{ ok: boolean; claveMicrosip?: string }> {
  try {
    const url = `${baseURL}/buscar-clave-microsip?codigo=${encodeURIComponent(codigoLargo)}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      return { ok: false }
    }
    
    const data = await response.json()
    
    return {
      ok: data.ok === true,
      claveMicrosip: data.claveMicrosip || data.clave_microsip,
    }
  } catch (error) {
    console.error('Error consultando clave Microsip:', error)
    return { ok: false }
  }
}

/**
 * Carga códigos alternos desde la BD para productos Cachorro
 * @param baseURL - URL base del servidor
 * @param codigosXML - Lista de códigos originales del XML
 * @returns Mapas de relaciones entre códigos
 */
export async function cargarCodigosAlternosBatch(
  baseURL: string,
  codigosXML: string[]
): Promise<CodigosAlternosResult> {
  const codigosMap = new Map<string, string>()
  const largoToXmlMap = new Map<string, string>()
  const skuToXmlMap = new Map<string, string>()
  let totalCargados = 0
  
  try {
    // Llamar endpoint que devuelve todos los códigos alternos
    const url = `${baseURL}/codigos-alternos-batch`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigos: codigosXML }),
    })
    
    if (!response.ok) {
      console.error('Error cargando códigos alternos:', response.status)
      return { codigosMap, largoToXmlMap, skuToXmlMap, totalCargados }
    }
    
    const data = await response.json()
    
    if (data.ok && data.alternos) {
      // data.alternos = [{ codigoXML, codigoLargo, claveMicrosip }, ...]
      for (const item of data.alternos) {
        const { codigoXML, codigoLargo, claveMicrosip } = item
        
        if (codigoLargo && claveMicrosip) {
          codigosMap.set(codigoLargo, claveMicrosip)
          totalCargados++
        }
        
        if (codigoLargo && codigoXML) {
          largoToXmlMap.set(codigoLargo, codigoXML)
        }
        
        if (claveMicrosip && codigoXML) {
          skuToXmlMap.set(claveMicrosip, codigoXML)
        }
      }
    }
  } catch (error) {
    console.error('Error cargando códigos alternos:', error)
  }
  
  return { codigosMap, largoToXmlMap, skuToXmlMap, totalCargados }
}

// ============================================
// VALIDACIÓN GENERAL
// ============================================

/**
 * Valida que los códigos existan en la base de datos
 * @param baseURL - URL base del servidor
 * @param codigos - Array de códigos a validar
 * @returns Lista de códigos no encontrados
 */
export async function validarCodigosEnBase(
  baseURL: string,
  codigos: string[]
): Promise<{ ok: boolean; codigosNoEncontrados?: string[] }> {
  try {
    const url = `${baseURL}/validar-codigos`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigos }),
    })
    
    if (!response.ok) {
      return { ok: false, codigosNoEncontrados: [] }
    }
    
    const data = await response.json()
    
    return {
      ok: data.ok === true,
      codigosNoEncontrados: data.codigosNoEncontrados || data.no_encontrados || [],
    }
  } catch (error) {
    console.error('Error validando códigos:', error)
    return { ok: false, codigosNoEncontrados: [] }
  }
}

// ============================================
// ENVÍO DE RECEPCIÓN
// ============================================

/**
 * Envía la recepción completa al servidor
 * @param baseURL - URL base del servidor
 * @param payload - Datos de la recepción
 * @returns Resultado con folio generado
 */
export async function enviarRecepcion(
  baseURL: string,
  payload: RecepcionPayload
): Promise<RecepcionResponse> {
  try {
    const url = `${baseURL}/recepcion-xml`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    if (!response.ok) {
      return { ok: false, message: `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    
    return {
      ok: data.ok === true,
      message: data.message,
      folio: data.folio,
      doctoId: data.doctoId || data.docto_id,
      inserted: data.inserted || data.lineas_insertadas,
    }
  } catch (error) {
    console.error('Error enviando recepción:', error)
    return { ok: false, message: 'Error de conexión al servidor' }
  }
}

// ============================================
// BÚSQUEDA DE ARTÍCULO (COMÚN)
// ============================================

/**
 * Busca un artículo por código en la BD
 * @param baseURL - URL base del servidor
 * @param codigo - Código a buscar
 * @returns Datos del artículo si existe
 */
export async function buscarArticulo(
  baseURL: string,
  codigo: string
): Promise<{
  ok: boolean
  articulo?: {
    clave: string
    descripcion: string
    existencia?: number
  }
}> {
  try {
    const url = `${baseURL}/buscar-articulo-recibo.php?codigo=${encodeURIComponent(codigo)}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      return { ok: false }
    }
    
    const data = await response.json()
    
    if (data.ok && data.articulo) {
      return {
        ok: true,
        articulo: {
          clave: data.articulo.clave || data.articulo.CLAVE,
          descripcion: data.articulo.descripcion || data.articulo.DESCRIPCION,
          existencia: data.articulo.existencia || data.articulo.EXISTENCIA,
        },
      }
    }
    
    return { ok: false }
  } catch (error) {
    console.error('Error buscando artículo:', error)
    return { ok: false }
  }
}
