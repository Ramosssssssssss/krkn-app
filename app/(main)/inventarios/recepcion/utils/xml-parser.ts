/**
 * Parser XML para archivos CFDI
 * Extrae datos de comprobante y conceptos de facturas XML
 */

import type { ConceptoXML, DatosComprobante, XMLParseResult } from '../types/xml'

/**
 * Extrae un atributo de un tag XML usando regex
 */
function extractAttribute(xml: string, tagPattern: string, attrName: string): string {
  // Buscar el tag
  const tagRegex = new RegExp(`<${tagPattern}[^>]*>`, 'i')
  const tagMatch = xml.match(tagRegex)
  
  if (!tagMatch) return ''
  
  // Extraer el atributo del tag
  const attrRegex = new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`, 'i')
  const attrMatch = tagMatch[0].match(attrRegex)
  
  return attrMatch ? attrMatch[1].trim() : ''
}

/**
 * Extrae todos los conceptos (productos) del XML
 */
function extractConceptos(xml: string): ConceptoXML[] {
  const conceptos: ConceptoXML[] = []
  
  // Buscar todos los tags cfdi:Concepto
  const conceptoRegex = /<cfdi:Concepto[^>]*>/gi
  let match: RegExpExecArray | null
  
  while ((match = conceptoRegex.exec(xml)) !== null) {
    const tag = match[0]
    
    // Extraer atributos del concepto
    const getAttr = (name: string): string => {
      const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
      const m = tag.match(regex)
      return m ? m[1].trim() : ''
    }
    
    const concepto: ConceptoXML = {
      claveProdServ: getAttr('ClaveProdServ'),
      noIdentificacion: getAttr('NoIdentificacion'),
      descripcion: getAttr('Descripcion'),
      cantidad: parseFloat(getAttr('Cantidad')) || 0,
      valorUnitario: parseFloat(getAttr('ValorUnitario')) || 0,
      importe: parseFloat(getAttr('Importe')) || 0,
      unidad: getAttr('Unidad') || getAttr('ClaveUnidad'),
    }
    
    // Solo agregar si tiene NoIdentificacion válido
    if (concepto.noIdentificacion) {
      conceptos.push(concepto)
    }
  }
  
  return conceptos
}

/**
 * Extrae los datos del comprobante CFDI
 */
function extractComprobante(xml: string): DatosComprobante {
  return {
    serie: extractAttribute(xml, 'cfdi:Comprobante', 'Serie'),
    folio: extractAttribute(xml, 'cfdi:Comprobante', 'Folio'),
    fecha: extractAttribute(xml, 'cfdi:Comprobante', 'Fecha'),
    total: parseFloat(extractAttribute(xml, 'cfdi:Comprobante', 'Total')) || 0,
    subtotal: parseFloat(extractAttribute(xml, 'cfdi:Comprobante', 'SubTotal')) || 0,
    emisor: extractAttribute(xml, 'cfdi:Emisor', 'Nombre'),
    emisorRFC: extractAttribute(xml, 'cfdi:Emisor', 'Rfc'),
    receptor: extractAttribute(xml, 'cfdi:Receptor', 'Nombre'),
    receptorRFC: extractAttribute(xml, 'cfdi:Receptor', 'Rfc'),
  }
}

/**
 * Parsea un archivo XML CFDI completo
 * @param xmlContent - Contenido del archivo XML como string
 * @returns Resultado con comprobante y conceptos
 */
export function parseXML(xmlContent: string): XMLParseResult {
  try {
    // Validar que sea un XML CFDI
    if (!xmlContent.includes('cfdi:Comprobante')) {
      return {
        ok: false,
        error: 'El archivo no es un XML CFDI válido',
      }
    }
    
    // Extraer datos del comprobante
    const comprobante = extractComprobante(xmlContent)
    
    // Validar que tenga folio
    if (!comprobante.folio && !comprobante.serie) {
      return {
        ok: false,
        error: 'El XML no contiene Serie ni Folio',
      }
    }
    
    // Extraer conceptos
    const conceptos = extractConceptos(xmlContent)
    
    if (conceptos.length === 0) {
      return {
        ok: false,
        error: 'El XML no contiene productos (cfdi:Concepto)',
      }
    }
    
    return {
      ok: true,
      comprobante,
      conceptos,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Error al parsear XML: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    }
  }
}

/**
 * Genera un identificador único para el folio
 */
export function generarFolioId(comprobante: DatosComprobante): string {
  const serie = comprobante.serie || 'SN'
  const folio = comprobante.folio || Date.now().toString()
  return `${serie}-${folio}`
}

/**
 * Normaliza un código (quita caracteres especiales, pasa a mayúsculas)
 */
export function normalizarCodigo(codigo: string): string {
  return (codigo || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Extrae los primeros N caracteres de un código (para Cachorro = 8)
 */
export function extraerModelo(codigo: string, longitud: number = 8): string {
  const normalizado = normalizarCodigo(codigo)
  return normalizado.substring(0, longitud)
}
