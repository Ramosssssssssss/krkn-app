/**
 * Exportación de procesadores por proveedor
 */

// Cachorro
export {
    convertirADetallesCachorro, generarMetaCachorro,
    normalizarCodigoEscaneadoCachorro, obtenerResumenTallas, procesarConceptosCachorro, procesarEscaneoCachorro,
    registrarTallaEscaneada, validarProductosCachorro
} from './cachorro'

// Panam
export {
    convertirADetallesPanam, filtrarProductosEncontrados, filtrarProductosNoEncontrados, generarMetaPanam,
    normalizarCodigoEscaneadoPanam, procesarConceptosPanam, procesarEscaneoPanam, validarProductosPanam
} from './panam'

// Mundo
export {
    convertirADetallesMundo, generarMetaMundo,
    normalizarCodigoEscaneadoMundo, procesarConceptosMundo, procesarEscaneoMundo
} from './mundo'

