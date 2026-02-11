/**
 * API para operaciones de recepción XML
 * Incluye validación de códigos, resolución de roles y envío de recepción
 */

import { API_CONFIG } from '@/config/api'
import { getCurrentDatabaseId } from '@/services/api'

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
 * @param baseURL - URL base del servidor (legacy, ya no se usa)
 * @param codigo - Código NoIdentificacion del XML
 * @returns Datos del artículo si existe
 */
export async function resolverCodigoPanam(
  baseURL: string,
  codigo: string
): Promise<ResolveRoleResponse> {
  try {
    // Usar el nuevo endpoint PHP con databaseId
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      return { ok: false, message: 'No hay base de datos seleccionada' }
    }

    const url = `${API_CONFIG.BASE_URL}/api/resolve-role.php?noid=${encodeURIComponent(codigo)}&provider=panam&databaseId=${databaseId}`
    
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
 * Resuelve múltiples códigos PANAM en UNA SOLA petición (batch)
 * @param baseURL - URL base del servidor (legacy, ya no se usa)
 * @param codigos - Array de códigos a resolver
 * @returns Map de código -> respuesta
 */
export async function resolverCodigosPanamBatch(
  baseURL: string,
  codigos: string[]
): Promise<Map<string, ResolveRoleResponse>> {
  const resultados = new Map<string, ResolveRoleResponse>()
  const codigosUnicos = [...new Set(codigos)]
  
  if (codigosUnicos.length === 0) {
    return resultados
  }
  
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      // Si no hay databaseId, marcar todos como no encontrados
      for (const codigo of codigosUnicos) {
        resultados.set(codigo, { ok: false, message: 'No hay base de datos seleccionada' })
      }
      return resultados
    }
    
    const url = `${API_CONFIG.BASE_URL}/api/resolve-role-batch.php`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigos: codigosUnicos,
        provider: 'panam',
        databaseId,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.ok && data.resultados) {
      // Mapear resultados
      for (const codigo of codigosUnicos) {
        const resultado = data.resultados[codigo]
        if (resultado) {
          resultados.set(codigo, {
            ok: resultado.ok === true,
            claveArticulo: resultado.claveArticulo,
            role: resultado.role,
            message: resultado.message,
          })
        } else {
          resultados.set(codigo, { ok: false, message: 'Sin respuesta' })
        }
      }
    } else {
      // Error general, marcar todos como no encontrados
      for (const codigo of codigosUnicos) {
        resultados.set(codigo, { ok: false, message: data.message || 'Error en batch' })
      }
    }
    
  } catch (error) {
    console.error('Error en batch PANAM:', error)
    // En caso de error, marcar todos como no encontrados
    for (const codigo of codigosUnicos) {
      resultados.set(codigo, { ok: false, message: 'Error de conexión' })
    }
  }
  
  return resultados
}

// ============================================
// CACHORRO: Códigos alternos
// ============================================

/**
 * Consulta la clave Microsip para un código largo (CACHORRO)
 * Usa nuestro endpoint PHP que consulta la tabla CODIGO_ALTERNO
 * 
 * @param _baseURL - URL base del servidor (legacy, se ignora)
 * @param codigoLargo - Código largo escaneado
 * @returns Clave Microsip si existe
 */
export async function consultarClaveMicrosip(
  _baseURL: string,
  codigoLargo: string
): Promise<{ ok: boolean; claveMicrosip?: string }> {
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      return { ok: false }
    }
    
    const url = `${API_CONFIG.BASE_URL}/api/codigo-largo.php?codigo=${encodeURIComponent(codigoLargo)}&databaseId=${databaseId}`
    
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
      claveMicrosip: data.claveMicrosip,
    }
  } catch (error) {
    console.error('Error consultando clave Microsip:', error)
    return { ok: false }
  }
}

/**
 * Carga códigos alternos desde la BD para productos Cachorro
 * Usa nuestro endpoint PHP que consulta la tabla CODIGO_ALTERNO
 * 
 * @param _baseURL - URL base del servidor (legacy, se ignora)
 * @param codigosXML - Lista de códigos originales del XML
 * @returns Mapas de relaciones entre códigos
 */
export async function cargarCodigosAlternosBatch(
  _baseURL: string,
  codigosXML: string[]
): Promise<CodigosAlternosResult> {
  const codigosMap = new Map<string, string>()
  const largoToXmlMap = new Map<string, string>()
  const skuToXmlMap = new Map<string, string>()
  let totalCargados = 0
  
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      console.error('No hay databaseId seleccionado')
      return { codigosMap, largoToXmlMap, skuToXmlMap, totalCargados }
    }
    
    // Usar nuestro endpoint PHP
    const url = `${API_CONFIG.BASE_URL}/api/codigos-alternos-batch.php`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        codigos: codigosXML,
        databaseId,
      }),
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
        
        // Normalizar claves a mayúsculas para búsqueda consistente
        const codigoLargoUpper = (codigoLargo || '').toUpperCase().trim()
        const claveMicrosipUpper = (claveMicrosip || '').toUpperCase().trim()
        const codigoXMLUpper = (codigoXML || '').toUpperCase().trim()
        
        if (codigoLargoUpper && claveMicrosip) {
          // Guardar con clave normalizada pero valor original (para mostrar/enviar)
          codigosMap.set(codigoLargoUpper, claveMicrosip)
          totalCargados++
        }
        
        if (codigoLargoUpper && codigoXML) {
          largoToXmlMap.set(codigoLargoUpper, codigoXML)
        }
        
        if (claveMicrosipUpper && codigoXML) {
          skuToXmlMap.set(claveMicrosipUpper, codigoXML)
        }
      }
    }
    
    console.log(`📦 Códigos alternos: ${totalCargados} cargados de ${codigosXML.length} solicitados`)
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
 * @param baseURL - URL base del servidor (legacy, se ignora)
 * @param payload - Datos de la recepción
 * @returns Resultado con folio generado
 */
export async function enviarRecepcion(
  _baseURL: string,
  payload: RecepcionPayload
): Promise<RecepcionResponse> {
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      return { ok: false, message: 'No hay base de datos seleccionada' }
    }
    
    const url = `${API_CONFIG.BASE_URL}/api/recibo-xml.php`
    
    // Agregar databaseId al payload
    const fullPayload = {
      ...payload,
      databaseId,
    }
    
    console.log('📤 Enviando a recibo-xml.php:', JSON.stringify(fullPayload, null, 2))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    
    // Intentar leer el body aunque sea error
    const text = await response.text()
    console.log('📥 Respuesta raw:', text)
    
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, message: `Error ${response.status}: ${text.substring(0, 200)}` }
    }
    
    if (!response.ok) {
      return { ok: false, message: data.message || `HTTP ${response.status}` }
    }
    
    console.log('📥 Respuesta recibo-xml.php:', data)
    
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

// ============================================
// CREAR ARTÍCULO
// ============================================

import type { CrearArticuloPayload, CrearArticuloResponse, LineaArticulo } from '../types/xml'

/**
 * Obtiene las líneas de artículos para el dropdown
 */
export async function obtenerLineasArticulos(): Promise<LineaArticulo[]> {
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) return []
    
    const url = `${API_CONFIG.BASE_URL}/api/lineas-articulos.php?databaseId=${databaseId}`
    
    const response = await fetch(url)
    
    if (!response.ok) return []
    
    const data = await response.json()
    
    if (data.ok && data.lineas) {
      return data.lineas.map((l: any) => ({
        id: l.LINEA_ARTICULO_ID,
        nombre: l.NOMBRE
      }))
    }
    return []
  } catch (error) {
    console.error('Error obteniendo líneas:', error)
    return []
  }
}

/**
 * Crea un artículo nuevo en la BD
 */
export async function crearArticulo(
  payload: Omit<CrearArticuloPayload, 'databaseId'>
): Promise<CrearArticuloResponse> {
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      return { ok: false, message: 'No hay base de datos seleccionada' }
    }
    
    const url = `${API_CONFIG.BASE_URL}/api/crear-articulo.php`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        databaseId,
      }),
    })
    
    // Obtener el texto primero para debug
    const text = await response.text()
    
    if (!text || text.trim() === '') {
      return { ok: false, message: 'Respuesta vacía del servidor' }
    }
    
    // Intentar parsear JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error('Error parseando respuesta:', text.substring(0, 500))
      return { ok: false, message: 'Error en respuesta del servidor: ' + text.substring(0, 100) }
    }
    
    return {
      ok: data.ok === true,
      message: data.message || 'Error desconocido',
      clave: data.clave,
      codigoBarras: data.codigoBarras,
    }
  } catch (error) {
    console.error('Error creando artículo:', error)
    return { ok: false, message: 'Error de conexión' }
  }
}

// ============================================
// CATÁLOGOS: Marcas, Proveedores, Tallas
// ============================================

export interface CatalogoItem {
  id: number
  nombre: string
}

export interface CatalogosResult {
  ok: boolean
  marcas?: CatalogoItem[]
  proveedores?: CatalogoItem[]
  tallas?: CatalogoItem[]
}

/**
 * Obtiene catálogos de marcas, proveedores y tallas
 */
export async function obtenerCatalogosArticulos(): Promise<CatalogosResult> {
  try {
    const databaseId = getCurrentDatabaseId()
    if (!databaseId) {
      return { ok: false }
    }

    const url = `${API_CONFIG.BASE_URL}/api/catalogos-articulos.php?tipo=all&databaseId=${databaseId}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    return {
      ok: data.ok === true,
      marcas: data.marcas || [],
      proveedores: data.proveedores || [],
      tallas: data.tallas || [],
    }
  } catch (error) {
    console.error('Error obteniendo catálogos:', error)
    return { ok: false }
  }
}

