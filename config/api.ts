// Configuración de API
export const API_CONFIG = {
  BASE_URL: "https://app.krkn.mx",
  ENDPOINTS: {
    LOGIN: "/api/login.php",
    ARTICULOS: "/api/articulos.php",
    SUCURSALES_ALMACENES: "/api/sucursales-almacenes.php",
    GET_DATABASES: "/api/get-databases.php",
    CREAR_ENTRADA: "/api/crear-entrada.php",
    CREAR_SALIDA: "/api/crear-salida.php",
    CREAR_INVENTARIO_FISICO: "/api/crear-inventario-fisico.php",
    IMAGEN_ARTICULO: "/api/imagen-articulo.php",
    CENTROS_COSTO: "/api/centros-costo.php",
    DOCTOS_INVFIS_SEMANA: "/api/doctos-invfis-semana.php",
    DETALLE_INVFIS: "/api/detalle-invfis.php",
    APLICAR_INVFIS: "/api/aplicar-invfis.php",
    LINEAS_ARTICULOS: "/api/lineas-articulos.php",
    DOCTOS_ENTRADAS: "/api/doctos-entradas.php",
    DOCTOS_SALIDAS: "/api/doctos-salidas.php",
    DOCTO_IN_DETALLE: "/api/docto-in-detalle.php",
    BUSCAR_ARTICULOS_UBICACION: "/api/buscar-articulos-ubicacion.php",
    COMPLETAR_CONTEO_COMEX: "/api/completar-conteo-comex.php",
    GET_CONTEO_COMEX: "/api/get-conteo-comex.php",
    ACTUALIZAR_CONTEO_COMEX: "/api/actualizar-conteo-comex.php",
    LIMPIAR_CONTEO_COMEX: "/api/limpiar-conteo-comex.php",
    CREAR_SOLICITUD_TRASPASO: "/api/crear-solicitud-traspaso.php",
    GET_SOLICITUDES_TRASPASO: "/api/get-solicitudes-traspaso.php",
    GET_SOLICITUD_DETALLE: "/api/get-solicitud-detalle.php",
    ETIQUETAS_PISO: "/api/etiquetas-piso.php",
    UBICACIONES_ARTICULO: "/api/ubicaciones-articulo.php",
    BUSCAR_FOLIO: "/api/buscar-folio.php",
    EXISTENCIAS_ARTICULO: "/api/existencias-articulo.php",
    DASHBOARD_STATS: "/api/dashboard-stats.php",
    PRECIOS_EMPRESA: "/api/precios-empresa.php",
    // Packing
    ORDENES_PACKING: "/api/ordenes-packing.php",
    CARATULA_PACKING: "/api/caratula-packing.php",
    DETALLE_PACKING: "/api/detalle-packing.php",
    DISPONIBLE_PACKING: "/api/disponible-packing.php",
    REMISIONAR_PEDIDO: "/api/remisionar-pedido.php",
    REMISIONAR_TRASPASO: "/api/remisionar-traspaso.php",
    REGISTRAR_PACKING: "/api/registrar-packing.php",
    VALIDAR_CAJA_CARTON: "/api/validar-caja-carton.php",
    // Inventarios Asignados
    INVENTARIOS_ASIGNADOS: "/api/inventarios-asignados.php",
    ACTUALIZAR_ESTATUS_INVENTARIO: "/api/actualizar-estatus-inventario.php",
    MIS_INVENTARIOS_PENDIENTES: "/api/mis-inventarios-pendientes.php",
    USUARIOS_KRKN: "/api/usuarios-krkn.php",
    // COMEX (conexión directa, sin depender de empresa)
    BUSCAR_ARTICULO_COMEX: "/api/buscar-articulo-comex.php",
    CONSULTAR_ARTICULO_COMEX: "/api/consultar-articulo-comex.php",
    ACTUALIZAR_ARTICULO_COMEX: "/api/actualizar-articulo-comex.php",
    CREAR_ARTICULO_COMEX: "/api/crear-articulo-comex.php",
    CATALOGOS_COMEX: "/api/get-catalogos-comex.php",
  },
};

// Helper para construir URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// URL base exportada directamente
export const API_URL = API_CONFIG.BASE_URL;
