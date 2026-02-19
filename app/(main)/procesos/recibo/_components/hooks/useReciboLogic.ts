import { API_URL } from "@/config/api";
import { useSystemSounds } from "@/hooks/use-system-sounds";
import { getCurrentDatabaseId } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CodigoInner,
  CombinedOrder,
  DetalleArticulo,
  Devolucion,
  Incidencia,
  OrdenCompra,
  ScanResult,
  SuccessDataRecibo,
  TipoIncidencia,
  ViewMode,
} from "../types";

// Key para AsyncStorage
const RECIBO_DRAFT_KEY = "@recibo_draft_v1";

// Interfaz para el borrador guardado
interface ReciboDraft {
  caratula: OrdenCompra;
  detalles: DetalleArticulo[];
  codigosInner: CodigoInner[];
  devoluciones: Devolucion[];
  incidencias: Incidencia[];
  combinedOrders: CombinedOrder[];
  unidadesApartado: [number, number][];
  timestamp: number;
  databaseId: number | null;
}

export function useReciboLogic() {
  const { playSound } = useSystemSounds();

  // Estado para borrador guardado
  const [savedDraft, setSavedDraft] = useState<ReciboDraft | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref para mantener estado actual (para guardado en cleanup)
  const stateRef = useRef<{
    viewMode: ViewMode;
    caratula: OrdenCompra | null;
    detalles: DetalleArticulo[];
    codigosInner: CodigoInner[];
    devoluciones: Devolucion[];
    incidencias: Incidencia[];
    combinedOrders: CombinedOrder[];
    unidadesApartado: Map<number, number>;
  }>({
    viewMode: "search",
    caratula: null,
    detalles: [],
    codigosInner: [],
    devoluciones: [],
    incidencias: [],
    combinedOrders: [],
    unidadesApartado: new Map(),
  });

  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Estado para detalle directo
  const [viewMode, setViewMode] = useState<ViewMode>("search");
  const [caratula, setCaratula] = useState<OrdenCompra | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [codigosInner, setCodigosInner] = useState<CodigoInner[]>([]);

  // Escaneo
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scannerValue, setScannerValue] = useState("");
  const entersCountRef = useRef(0);

  // Map de códigos para búsqueda instantánea O(1)
  const codigosMapRef = useRef<Map<string, { id: number; qty: number }>>(
    new Map(),
  );

  // Incidencias
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Devoluciones
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);

  // Modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<SuccessDataRecibo>({
    folioRecepcion: null,
    folioDevolucion: null,
    totalArticulos: 0,
    totalUnidadesRecibidas: 0,
    totalDevoluciones: 0,
    unidadesDevueltas: 0,
  });
  const [cantidadDevolucionInput, setCantidadDevolucionInput] = useState("");

  // Estado de recepción
  const [recibiendoOrden, setRecibiendoOrden] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Backorders
  const [backorderIds, setBackorderIds] = useState<Set<number>>(new Set());

  // Estado para modal de destino (apartado)
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [codigoApartado, setCodigoApartado] = useState<string | null>(null);
  const [destinoInfo, setDestinoInfo] = useState<{
    RESULTADO: string;
    MENSAJE: string;
    FOLIO_SUGERIDO: string;
    CAJA_ASIGNADA: string;
    NECESITA_SELECCION_CAJA: boolean;
    UNIDADES_PENDIENTES: number;
    ARTICULOS_PENDIENTES: string;
  } | null>(null);

  // Estado para pedido completado
  const [showPedidoCompletado, setShowPedidoCompletado] = useState(false);
  const [pedidoCompletadoInfo, setPedidoCompletadoInfo] = useState<{
    folio: string;
    caja: string;
  } | null>(null);
  const [asignandoAuto, setAsignandoAuto] = useState(false);

  // Estado para artículo asignado (cuando se auto-asigna pero NO está completo)
  const [showArticuloAsignado, setShowArticuloAsignado] = useState(false);
  const [articuloAsignadoInfo, setArticuloAsignadoInfo] = useState<{
    clave: string;
    caja: string;
    folio: string;
  } | null>(null);

  // Señal para ir directo a seleccionar caja (sin preguntar)
  const [solicitarSeleccionCaja, setSolicitarSeleccionCaja] = useState(false);

  // Mapa para trackear cuántas unidades de cada artículo fueron asignadas a apartado
  // Key: ARTICULO_ID, Value: cantidad de unidades comprometidas
  const [unidadesApartado, setUnidadesApartado] = useState<Map<number, number>>(
    new Map(),
  );

  // Caché de artículos sin destino (SOBRANTE) para evitar consultas repetidas
  // Key: codigo, Value: timestamp de cuando se consultó (expira en 5 minutos)
  const articulosSinDestinoCache = useRef<Map<string, number>>(new Map());

  // ==================== PRE-CARGA BULK DE DESTINOS ====================
  // Caché de destinos pre-cargados al seleccionar la orden
  // Key: codigo (uppercase), Value: datos del destino completos
  const destinosBulkCache = useRef<Map<string, any>>(new Map());
  const [precargandoDestinos, setPrecargandoDestinos] = useState(false);

  // ==================== ÓRDENES COMBINADAS ====================
  // Lista de órdenes combinadas para recibo múltiple
  const [combinedOrders, setCombinedOrders] = useState<CombinedOrder[]>([]);
  // Loading para agregar orden adicional
  const [loadingOrdenAdicional, setLoadingOrdenAdicional] = useState(false);

  // ==================== MONITOR DE URGENCIAS ====================
  // Items que tienen pedidos urgentes detectados por el monitor
  const [urgencias, setUrgencias] = useState<any[]>([]);
  const [monitoreandoUrgencias, setMonitoreandoUrgencias] = useState(false);
  const urgenciasDescartadasRef = useRef<Set<string>>(new Set());
  const urgenciasSilenciadasPorEscaneoRef = useRef<Set<string>>(new Set());

  // Monitoreo de escaneo para scroll automático
  const [lastScannedItem, setLastScannedItem] = useState<{
    articuloId: number;
    doctoId: number;
    timestamp: number;
  } | null>(null);

  // Actualizar el Map cuando cambian los detalles
  useEffect(() => {
    const map = new Map<string, { id: number; qty: number }>();
    detalles.forEach((d) => {
      if (d.CLAVE)
        map.set(d.CLAVE.toUpperCase(), { id: d.ARTICULO_ID, qty: 1 });
      if (d.CODIGO_BARRAS)
        map.set(d.CODIGO_BARRAS.toUpperCase(), { id: d.ARTICULO_ID, qty: 1 });
    });
    codigosInner.forEach((c) => {
      if (c.CODIGO_INNER) {
        map.set(c.CODIGO_INNER.toUpperCase(), {
          id: c.ARTICULO_ID,
          qty: c.CONTENIDO_EMPAQUE || 1,
        });
      }
    });
    codigosMapRef.current = map;
    console.log("[MAP] Cargados", map.size, "códigos");
  }, [detalles, codigosInner]);

  // Asignar artículo automáticamente a caja ya asignada (para pedidos o traspasos)
  const autoAsignarACaja = useCallback(
    async (
      codigo: string,
      folio: string,
      caja: string,
      tipo: string = "PEDIDO", // PEDIDO o TRASPASO
      traspasoId?: number,
      sucursalDestino?: string,
      unidades: number = 1, // Cantidad de unidades a asignar
    ): Promise<{ success: boolean; pedidoCompleto: boolean }> => {
      const databaseId = getCurrentDatabaseId();
      console.log(
        `[AUTO-ASIGNAR] Asignando ${unidades}x ${codigo} a caja ${caja} - Tipo: ${tipo}`,
      );

      try {
        // 1. Asignar el artículo a la caja
        const responseAsignar = await fetch(`${API_URL}/api/asignar-caja.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            clave: codigo,
            folio,
            caja,
            pickerId: 1,
            nombrePicker: "APP",
            unidades: unidades, // Usar el parámetro
            tipo: tipo,
            traspasoId: traspasoId || 0,
            sucursalDestino: sucursalDestino || "",
          }),
        });

        const dataAsignar = await responseAsignar.json();
        console.log("[AUTO-ASIGNAR] Respuesta asignar:", dataAsignar);

        if (!dataAsignar.success) {
          return { success: false, pedidoCompleto: false };
        }

        // Para TRASPASO, el completado viene directo de la respuesta
        if (tipo === "TRASPASO") {
          const completado =
            dataAsignar.data?.COMPLETADO ||
            dataAsignar.data?.TRASPASO_COMPLETADO ||
            false;
          console.log("[AUTO-ASIGNAR] TRASPASO completado:", completado);

          if (completado) {
            // Liberar la caja
            const responseLiberar = await fetch(
              `${API_URL}/api/liberar-caja.php`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ databaseId, codigoCaja: caja }),
              },
            );
            const dataLiberar = await responseLiberar.json();
            console.log("[AUTO-ASIGNAR] Respuesta liberar:", dataLiberar);
          }

          return { success: true, pedidoCompleto: completado };
        }

        // Para PEDIDO, el completado también viene en dataAsignar.data si el SP está actualizado
        // Si no viene, usamos detalle-apartado pero solo si creemos que podría estar completo
        let pedidoCompleto =
          dataAsignar.data?.COMPLETADO ||
          dataAsignar.data?.PEDIDO_COMPLETADO ||
          false;

        console.log("[AUTO-ASIGNAR] ¿Pedido completo inicial?:", pedidoCompleto);

        // Si el backend no nos dijo si está completo, solo ahí consultamos el detalle
        // para no saturar con una petición extra en cada escaneo
        if (!pedidoCompleto) {
          // Opcional: Podríamos decidir NO consultar el detalle aquí y confiar en el SP
          // o consultar solo cada N escaneos. Por ahora, si no viene en la respuesta, 
          // hacemos el fallback pero marcando por qué.
          console.log("[AUTO-ASIGNAR] Backend no retornó completado, verificando por seguridad...");
          const responseDetalle = await fetch(
            `${API_URL}/api/detalle-apartado.php`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ databaseId, folio }),
            },
          );

          const dataDetalle = await responseDetalle.json();
          if (dataDetalle.success) {
            const pendientes = dataDetalle.resumen?.totalArticulosPendientes ?? -1;
            const unidadesFaltantes = dataDetalle.resumen?.totalUnidadesFaltantes ?? -1;
            pedidoCompleto = pendientes === 0 || unidadesFaltantes === 0;
          }
        }

        console.log("[AUTO-ASIGNAR] ¿Pedido completo?:", pedidoCompleto);

        if (pedidoCompleto) {
          console.log("[AUTO-ASIGNAR] ¡Pedido completo! Liberando caja...");

          // 3. Liberar la caja
          const responseLiberar = await fetch(
            `${API_URL}/api/liberar-caja.php`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ databaseId, codigoCaja: caja }),
            },
          );

          const dataLiberar = await responseLiberar.json();
          console.log("[AUTO-ASIGNAR] Respuesta liberar:", dataLiberar);
        } else {
          console.log("[AUTO-ASIGNAR] Faltan artículos o no se realizó verificación.");
        }

        return { success: true, pedidoCompleto };
      } catch (error) {
        console.error("[AUTO-ASIGNAR] Error:", error);
        return { success: false, pedidoCompleto: false };
      }
    },
    [],
  );

  // Consultar destino del artículo (apartado/traspaso)
  // Retorna: { tieneDestino, unidadesAsignadas, unidadesSobrantes }
  const consultarDestinoArticulo = useCallback(
    async (
      codigo: string,
      unidadesEscaneadas: number = 1,
    ): Promise<{
      tieneDestino: boolean;
      unidadesAsignadas: number;
      unidadesSobrantes: number;
    }> => {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId || !codigo) {
        return { tieneDestino: false, unidadesAsignadas: 0, unidadesSobrantes: unidadesEscaneadas };
      }

      const codigoUpper = codigo.trim().toUpperCase();
      let destinoData: any = null;

      // ===== PASO 0: Verificar BULK CACHE (pre-cargado al cargar orden) =====
      const bulkCached = destinosBulkCache.current.get(codigoUpper);
      if (bulkCached) {
        console.log("[DESTINO] ⚡ BULK cache hit:", codigoUpper, bulkCached.RESULTADO);
        destinoData = bulkCached;

        // Si es destino real, lo quitamos para que el siguiente escaneo sea real-time (las unidades bajan)
        if (bulkCached.TIPO !== "NINGUNO" && bulkCached.RESULTADO !== "SOBRANTE") {
          destinosBulkCache.current.delete(codigoUpper);
        }
      }

      // ===== PASO 1: Verificar cache de artículos sin destino (sobrantes rápidos) =====
      if (!destinoData) {
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        const cachedTime = articulosSinDestinoCache.current.get(codigoUpper);
        if (cachedTime && Date.now() - cachedTime < CACHE_DURATION) {
          console.log("[DESTINO] Cache hit (sin destino):", codigoUpper);
          return {
            tieneDestino: false,
            unidadesAsignadas: 0,
            unidadesSobrantes: unidadesEscaneadas,
          };
        }
      }

      // ===== PASO 2: Consultar a RED si no tenemos la data en cache =====
      if (!destinoData) {
        try {
          const bodyData = {
            databaseId,
            codigo: codigo.trim(),
            pickerId: 1,
            almacenOrigenId: 188104,
            unidades: unidadesEscaneadas,
            autoAssign: true, // <--- OPTIMIZACIÓN: Hacer todo en un viaje
          };

          const response = await fetch(`${API_URL}/api/consultar-destino.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
          });

          const data = await response.json();
          if (data.success && data.data) {
            destinoData = data.data;
          }
        } catch (error) {
          console.error("[DESTINO] Error al consultar red:", error);
        }
      }

      // ===== PASO 3: Procesar los datos (vengan de cache o de red) =====
      if (destinoData) {
        const resultado = destinoData.RESULTADO;
        const cajaAsignada = destinoData.CAJA_ASIGNADA;
        const folioSugerido = destinoData.FOLIO_SUGERIDO;
        const tipo = destinoData.TIPO || "PEDIDO";
        const traspasoId = destinoData.TRASPASO_ID || 0;
        const sucursalDestino = destinoData.SUCURSAL_DESTINO || "";
        const unidadesPendientes = destinoData.UNIDADES_PENDIENTES || 0;

        console.log("[DESTINO] RESULTADO:", resultado, "TIPO:", tipo, "Pendientes:", unidadesPendientes);

        // Calcular split: cuántas van al apartado y cuántas sobran
        const unidadesAApartado = Math.min(unidadesEscaneadas, unidadesPendientes);
        const unidadesSobrantes = unidadesEscaneadas - unidadesAApartado;

        console.log(`[DESTINO] Split: ${unidadesAApartado} al apartado, ${unidadesSobrantes} sobrantes`);

        // NUEVO: El backend puede haber hecho la auto-asignación en un solo viaje
        if (destinoData.AUTO_ASIGNADO_LOGRADO && unidadesAApartado > 0) {
          console.log("[DESTINO] ⚡ Auto-asignación lograda en un solo viaje!");
          const folioMostrar = tipo === "TRASPASO" ? `TRASPASO: ${folioSugerido}` : folioSugerido;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          playSound("add");

          // Nota: Aquí perdemos el flag de 'pedidoCompleto' que venía del detalle-apartado
          // pero ganamos muchísima velocidad. Si es crítico, el SP debería retornarlo.
          // Por ahora, asumimos éxito.
          setArticuloAsignadoInfo({ clave: codigo.trim(), caja: cajaAsignada, folio: folioMostrar });
          setShowArticuloAsignado(true);

          return {
            tieneDestino: true,
            unidadesAsignadas: unidadesAApartado,
            unidadesSobrantes,
          };
        }

        // Si es SOBRANTE, no tiene destino
        if (tipo === "NINGUNO" || resultado === "SOBRANTE") {
          articulosSinDestinoCache.current.set(codigoUpper, Date.now());
          return {
            tieneDestino: false,
            unidadesAsignadas: 0,
            unidadesSobrantes: unidadesEscaneadas,
          };
        }

        // AUTO_ASIGNADO: Ya hay caja asignada -> asignar automáticamente
        if (resultado === "AUTO_ASIGNADO" && cajaAsignada) {
          console.log(`[DESTINO] Auto-asignando ${unidadesAApartado} unidades a caja ${cajaAsignada}`);
          setAsignandoAuto(true);

          const { success, pedidoCompleto } = await autoAsignarACaja(
            codigo.trim(),
            folioSugerido,
            cajaAsignada,
            tipo,
            traspasoId,
            sucursalDestino,
            unidadesAApartado,
          );

          setAsignandoAuto(false);

          if (success) {
            const folioMostrar = tipo === "TRASPASO" ? `TRASPASO: ${folioSugerido}` : folioSugerido;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound("add");

            if (pedidoCompleto) {
              setPedidoCompletadoInfo({ folio: folioMostrar, caja: cajaAsignada });
              setShowPedidoCompletado(true);
            } else {
              setArticuloAsignadoInfo({ clave: codigo.trim(), caja: cajaAsignada, folio: folioMostrar });
              setShowArticuloAsignado(true);
            }
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playSound("error");
          }

          return {
            tieneDestino: true,
            unidadesAsignadas: unidadesAApartado,
            unidadesSobrantes,
          };
        }

        // SELECCION_CAJA: Necesita elegir caja -> IR DIRECTO a selección de caja
        if (resultado === "SELECCION_CAJA") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          playSound("warning");

          // Guardar info adicional para el modal de cajas
          setCodigoApartado(codigo.trim());
          setDestinoInfo({
            ...destinoData,
            UNIDADES_ESCANEADAS: unidadesEscaneadas,
            UNIDADES_A_APARTADO: unidadesAApartado,
            UNIDADES_SOBRANTES: unidadesSobrantes,
          });
          // Ir directo a selección de caja (sin preguntar)
          setSolicitarSeleccionCaja(true);
          return {
            tieneDestino: true,
            unidadesAsignadas: unidadesAApartado,
            unidadesSobrantes,
          };
        }
      }

      // Fallback (error de red o datos no encontrados)
      return {
        tieneDestino: false,
        unidadesAsignadas: 0,
        unidadesSobrantes: unidadesEscaneadas,
      };
    },
    [playSound, autoAsignarACaja],
  );

  // ==================== PRE-CARGAR DESTINOS BULK ====================
  // Llama al endpoint bulk para pre-cargar todos los destinos de los artículos
  const precargarDestinos = useCallback(
    async (articulos: DetalleArticulo[], codigosInnerList: CodigoInner[]) => {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId || articulos.length === 0) return;

      // Recopilar únicamente las CLAVES principales (SKUs) de los artículos en pantalla
      // Recopilar CLAVES y CODIGOS_BARRAS para que el cache cubra ambos
      const codigos = new Set<string>();
      articulos.forEach((d) => {
        if (d.CLAVE) codigos.add(d.CLAVE.trim());
        if (d.CODIGO_BARRAS) codigos.add(d.CODIGO_BARRAS.trim());
      });

      const codigosUnicos = Array.from(codigos);
      if (codigosUnicos.length === 0) return;

      console.log(
        `[BULK-DESTINOS] Pre-cargando destinos para ${codigosUnicos.length} códigos...`,
      );
      setPrecargandoDestinos(true);

      try {
        const response = await fetch(
          `${API_URL}/api/consultar-destinos-bulk.php`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              databaseId,
              codigos: codigosUnicos,
              pickerId: 1,
              almacenOrigenId: 188104,
            }),
          },
        );

        const data = await response.json();

        if (data.success && data.destinos) {
          const cache = new Map<string, any>();
          for (const [codigo, destino] of Object.entries(data.destinos)) {
            cache.set(codigo.toUpperCase(), destino);
          }
          destinosBulkCache.current = cache;

          // También poblar el cache de sin-destino para los SOBRANTES
          cache.forEach((destino: any, codigo: string) => {
            if (
              destino.TIPO === "NINGUNO" ||
              destino.RESULTADO === "SOBRANTE"
            ) {
              articulosSinDestinoCache.current.set(codigo, Date.now());
            }
          });

          console.log(
            `[BULK-DESTINOS] Cargados ${cache.size} destinos: ${data.conDestino} con destino, ${data.sinDestino} sin destino`,
          );
        } else {
          console.warn("[BULK-DESTINOS] Error en respuesta:", data.error);
        }
      } catch (error) {
        console.error("[BULK-DESTINOS] Error de red:", error);
        // No es crítico - el fallback individual sigue funcionando
      } finally {
        setPrecargandoDestinos(false);
      }
    },
    [],
  );

  // Buscar órdenes
  const buscarOrdenes = useCallback(async (folio: string) => {
    const databaseId = getCurrentDatabaseId();

    if (!folio.trim() || !databaseId) {
      return;
    }

    setLoading(true);
    setHasSearched(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const url = `${API_URL}/api/buscar-ordenes-compra.php?databaseId=${databaseId}&folio=${encodeURIComponent(folio)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (data.detalles && data.caratula) {
          setCaratula(data.caratula);
          const detallesConEscaneo = data.detalles.map(
            (d: DetalleArticulo) => ({
              ...d,
              cantidadEscaneada: 0,
              ordenOrigen: data.caratula.FOLIO,
              doctoId: data.caratula.DOCTO_CM_ID,
            }),
          );
          setDetalles(detallesConEscaneo);
          const innerCodes = data.codigosInner || [];
          setCodigosInner(innerCodes);
          setViewMode("detail");
          setOrdenes([]);
          // Limpiar el estado previo por completo
          setDevoluciones([]);
          setIncidencias([]);
          setBackorderIds(new Set());
          setUnidadesApartado(new Map());
          // Limpiar órdenes combinadas al cargar nueva orden
          setCombinedOrders([]);
          // Limpiar cache bulk anterior
          destinosBulkCache.current = new Map();
          articulosSinDestinoCache.current = new Map();
          // Pre-cargar destinos en background (no bloquea la UI)
          precargarDestinos(detallesConEscaneo, innerCodes);
        } else {
          setOrdenes(data.ordenes || []);
          setViewMode("search");
        }
      } else {
        setOrdenes([]);
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== AGREGAR ORDEN ADICIONAL ====================
  // Función para agregar otra orden de compra a la actual (combinar)
  const agregarOrdenAdicional = useCallback(
    async (
      folioAdicional: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const databaseId = getCurrentDatabaseId();
      const normalizedFolio = folioAdicional.trim().toUpperCase();

      if (!normalizedFolio || !databaseId) {
        return { success: false, error: "Folio inválido" };
      }

      // Validar que no sea la misma orden principal
      if (caratula?.FOLIO?.toUpperCase() === normalizedFolio) {
        return { success: false, error: "Este folio ya está cargado" };
      }

      // Validar que no esté ya en órdenes combinadas
      if (
        combinedOrders.some((o) => o.folio.toUpperCase() === normalizedFolio)
      ) {
        return { success: false, error: "Esta orden ya está combinada" };
      }

      setLoadingOrdenAdicional(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const url = `${API_URL}/api/buscar-ordenes-compra.php?databaseId=${databaseId}&folio=${encodeURIComponent(normalizedFolio)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success || !data.detalles || !data.caratula) {
          throw new Error(data.error || "No se encontró la orden");
        }

        // Si es la primera combinación, agregar la orden principal a combinedOrders
        if (combinedOrders.length === 0 && caratula) {
          const mainOrder: CombinedOrder = {
            folio: caratula.FOLIO,
            doctoId: caratula.DOCTO_CM_ID,
            productCount: detalles.length,
            caratula: caratula,
          };
          setCombinedOrders([mainOrder]);
        }

        // Preparar nuevos detalles con origen marcado
        const newDetalles: DetalleArticulo[] = data.detalles.map(
          (d: DetalleArticulo) => ({
            ...d,
            cantidadEscaneada: 0,
            ordenOrigen: data.caratula.FOLIO,
            doctoId: data.caratula.DOCTO_CM_ID,
          }),
        );

        // Agregar nuevos detalles al listado existente
        setDetalles((prev) => [...prev, ...newDetalles]);

        // Agregar códigos inner adicionales
        if (data.codigosInner && Array.isArray(data.codigosInner)) {
          setCodigosInner((prev) => [...prev, ...data.codigosInner]);
        }

        // Agregar a órdenes combinadas
        const newOrder: CombinedOrder = {
          folio: data.caratula.FOLIO,
          doctoId: data.caratula.DOCTO_CM_ID,
          productCount: data.detalles.length,
          caratula: data.caratula,
        };
        setCombinedOrders((prev) => [...prev, newOrder]);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSound("add");
        console.log(
          `[COMBINAR] Orden ${normalizedFolio} agregada. Total productos: ${detalles.length + newDetalles.length}`,
        );

        // Pre-cargar destinos para los nuevos artículos
        const newInnerCodes = data.codigosInner || [];
        precargarDestinos(newDetalles, newInnerCodes);

        return { success: true };
      } catch (error: any) {
        console.error("[COMBINAR] Error:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return {
          success: false,
          error: error.message || "Error al buscar orden",
        };
      } finally {
        setLoadingOrdenAdicional(false);
      }
    },
    [caratula, combinedOrders, detalles.length, playSound],
  );

  // Actualizar cantidad escaneada
  const handleUpdateQuantity = useCallback(
    (articuloId: number, delta: number, doctoId?: number) => {
      setDetalles((prev) => {
        let soundPlayed = false;
        // Si hay doctoId, buscar el índice exacto
        let targetIndex = -1;
        if (doctoId) {
          targetIndex = prev.findIndex(
            (d) =>
              d.ARTICULO_ID === articuloId &&
              (d.doctoId || caratula?.DOCTO_CM_ID) === doctoId,
          );
        } else {
          // Si no hay doctoId, usar el primer incompleto (o el primero si todos están llenos)
          const coincidentes = prev
            .map((d, i) => ({ d, i }))
            .filter((item) => item.d.ARTICULO_ID === articuloId);

          if (coincidentes.length === 0) return prev;

          const incompleto = coincidentes.find((item) => {
            const dev =
              devoluciones.find((dev) => dev.articuloId === item.d.ARTICULO_ID)
                ?.cantidad || 0;
            return item.d.cantidadEscaneada < item.d.CANTIDAD - dev;
          });

          targetIndex = incompleto ? incompleto.i : coincidentes[0].i;
        }

        if (targetIndex === -1) return prev;

        return prev.map((d, index) => {
          if (index === targetIndex) {
            const devolucion = devoluciones.find(
              (dev) => dev.articuloId === d.ARTICULO_ID,
            );
            const cantDevolucion = devolucion ? devolucion.cantidad : 0;
            const maxAllowed = d.CANTIDAD - cantDevolucion;

            if (delta > 0) {
              if (d.cantidadEscaneada >= maxAllowed) {
                if (!soundPlayed) {
                  playSound("error");
                  soundPlayed = true;
                }
                return d;
              } else {
                const newQty = Math.min(
                  d.cantidadEscaneada + delta,
                  maxAllowed,
                );
                if (!soundPlayed) {
                  playSound("scan");
                  soundPlayed = true;
                }
                return { ...d, cantidadEscaneada: newQty };
              }
            } else {
              const newQty = Math.max(0, d.cantidadEscaneada + delta);
              if (newQty < d.cantidadEscaneada && !soundPlayed) {
                playSound("error");
                soundPlayed = true;
              }
              return { ...d, cantidadEscaneada: newQty };
            }
          }
          return d;
        });
      });
    },
    [devoluciones, playSound, caratula],
  );

  // Establecer cantidad específica
  const handleSetQuantity = useCallback(
    (articuloId: number, qty: number, doctoId?: number) => {
      setDetalles((prev) => {
        let targetIndex = -1;
        if (doctoId) {
          targetIndex = prev.findIndex(
            (d) =>
              d.ARTICULO_ID === articuloId &&
              (d.doctoId || caratula?.DOCTO_CM_ID) === doctoId,
          );
        } else {
          targetIndex = prev.findIndex((d) => d.ARTICULO_ID === articuloId);
        }

        if (targetIndex === -1) return prev;

        return prev.map((d, index) => {
          if (index === targetIndex) {
            const limitedQty = Math.min(Math.max(0, qty), d.CANTIDAD);
            return { ...d, cantidadEscaneada: limitedQty };
          }
          return d;
        });
      });
    },
    [caratula],
  );

  // Actualizar cantidad con consulta de destino (para botones +)
  // Verifica si hay apartado antes de incrementar
  const handleUpdateQuantityWithDestino = useCallback(
    async (
      articuloId: number,
      delta: number,
      codigo: string,
      doctoId?: number,
    ) => {
      // Solo consultar destino si estamos INCREMENTANDO
      if (delta > 0 && codigo) {
        console.log("[UPDATE+DESTINO] Consultando destino para:", codigo);

        // Consultar destino antes de incrementar
        const resultado = await consultarDestinoArticulo(codigo.trim(), delta);

        // Si tiene destino, incrementar las unidades asignadas al apartado
        if (resultado.tieneDestino && resultado.unidadesAsignadas > 0) {
          console.log(
            `[UPDATE+DESTINO] ${resultado.unidadesAsignadas} unidades asignadas al apartado`,
          );
          // Incrementar en la orden las unidades asignadas al apartado
          handleUpdateQuantity(
            articuloId,
            resultado.unidadesAsignadas,
            doctoId,
          );

          // Registrar en el mapa de apartados
          const map = codigosMapRef.current;
          const match = map.get(codigo.toUpperCase());
          if (match) {
            setUnidadesApartado((prev) => {
              const newMap = new Map(prev);
              const current = newMap.get(match.id) || 0;
              newMap.set(match.id, current + resultado.unidadesAsignadas);
              console.log(
                `[APARTADO] Artículo ${match.id}: ${current} + ${resultado.unidadesAsignadas} = ${current + resultado.unidadesAsignadas} unidades comprometidas`,
              );
              return newMap;
            });
          }
        }

        // Si hay unidades sobrantes, incrementar en la orden
        if (resultado.unidadesSobrantes > 0) {
          console.log(
            `[UPDATE+DESTINO] ${resultado.unidadesSobrantes} unidades sobrantes -> a la orden`,
          );
          handleUpdateQuantity(
            articuloId,
            resultado.unidadesSobrantes,
            doctoId,
          );
        }
      } else {
        // Si estamos decrementando, solo actualizar cantidad
        handleUpdateQuantity(articuloId, delta, doctoId);
      }
    },
    [consultarDestinoArticulo, handleUpdateQuantity],
  );

  // Incrementar cantidad por código (para uso después de asignar apartado)
  const incrementarPorCodigo = useCallback(
    (codigo: string, cantidad: number = 1, doctoId?: number) => {
      const map = codigosMapRef.current;
      const match = map.get(codigo.toUpperCase());

      if (match) {
        setDetalles((prev) => {
          let targetIndex = -1;
          if (doctoId) {
            targetIndex = prev.findIndex(
              (d) =>
                d.ARTICULO_ID === match.id &&
                (d.doctoId || caratula?.DOCTO_CM_ID) === doctoId,
            );
          } else {
            // Lógica inteligente por defecto
            const coincidentes = prev
              .map((d, i) => ({ d, i }))
              .filter((item) => item.d.ARTICULO_ID === match.id);

            if (coincidentes.length === 0) return prev;

            const incompleto = coincidentes.find((item) => {
              const dev =
                devoluciones.find(
                  (dev) => dev.articuloId === item.d.ARTICULO_ID,
                )?.cantidad || 0;
              return item.d.cantidadEscaneada < item.d.CANTIDAD - dev;
            });

            targetIndex = incompleto ? incompleto.i : coincidentes[0].i;
          }

          if (targetIndex === -1) return prev;

          return prev.map((d, index) => {
            if (index === targetIndex) {
              const devolucion = devoluciones.find(
                (dev) => dev.articuloId === d.ARTICULO_ID,
              );
              const cantDevolucion = devolucion ? devolucion.cantidad : 0;
              const maxAllowed = d.CANTIDAD - cantDevolucion;
              const current = d.cantidadEscaneada;

              if (current >= maxAllowed) {
                return d; // Ya está completo
              }

              const newQty = Math.min(current + cantidad, maxAllowed);
              return { ...d, cantidadEscaneada: newQty };
            }
            return d;
          });
        });
        return true;
      }
      return false;
    },
    [devoluciones, caratula],
  );

  // Incrementar unidades asignadas a apartado para un artículo
  const incrementarUnidadesApartado = useCallback(
    (codigo: string, cantidad: number = 1) => {
      const map = codigosMapRef.current;
      const match = map.get(codigo.toUpperCase());

      if (match) {
        setUnidadesApartado((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(match.id) || 0;
          newMap.set(match.id, current + cantidad);
          console.log(
            `[APARTADO] Artículo ${match.id}: ${current} + ${cantidad} = ${current + cantidad} unidades comprometidas`,
          );
          return newMap;
        });
        return true;
      }
      return false;
    },
    [],
  );

  // Obtener unidades de apartado para un artículo
  const getUnidadesApartado = useCallback(
    (articuloId: number) => {
      return unidadesApartado.get(articuloId) || 0;
    },
    [unidadesApartado],
  );

  // Procesar código escaneado - verifica destino (pedidos y traspasos), luego procesa
  // Soporta split de unidades: si inner=8 y apartado=5, mete 5 al apartado y 3 a la orden
  const processScannedCode = useCallback(
    async (code: string) => {
      console.log("=== PROCESS SCANNED CODE ===");
      console.log("[SCAN] Código recibido:", code);

      if (!code) {
        console.log("[SCAN] Código vacío, saliendo");
        return;
      }

      const codeToUpper = code.trim().toUpperCase();

      // Silenciar urgencia inmediatamente si este artículo era urgente
      // Esto hace que el sonido pare al INSTANTE del escaneo, no después de asignar
      if (urgencias.some((u) => u.clave === codeToUpper)) {
        console.log(
          `[MONITOR] Silenciando urgencia para ${codeToUpper} por escaneo`,
        );
        urgenciasSilenciadasPorEscaneoRef.current.add(codeToUpper);
        setUrgencias((prev) => prev.filter((u) => u.clave !== codeToUpper));
      }

      // Obtener cantidad de unidades del código (inner = qty, normal = 1)
      const map = codigosMapRef.current;
      const match = map.get(code.toUpperCase());
      const unidadesEscaneadas = match?.qty || 1;
      console.log("[SCAN] Unidades del código:", unidadesEscaneadas);

      // Verificar si el artículo tiene PEDIDO o TRASPASO pendiente
      // Pasamos las unidades escaneadas para calcular el split
      const resultado = await consultarDestinoArticulo(
        code,
        unidadesEscaneadas,
      );
      console.log("[SCAN] Resultado destino:", resultado);

      // Si tiene destino, incrementar las unidades asignadas al apartado
      if (resultado.tieneDestino && resultado.unidadesAsignadas > 0) {
        console.log(
          `[SCAN] ${resultado.unidadesAsignadas} unidades asignadas al apartado`,
        );
        incrementarPorCodigo(code.trim(), resultado.unidadesAsignadas);
        incrementarUnidadesApartado(code.trim(), resultado.unidadesAsignadas);

        // Disparar scroll hacia este artículo si existe en la orden
        if (match) {
          setLastScannedItem({
            articuloId: match.id,
            doctoId: 0, // En apartado no siempre sabemos la orden destino exacta aquí, pero match.id ayuda
            timestamp: Date.now(),
          });
        }
      }

      // Si hay unidades sobrantes, procesarlas en la orden
      if (resultado.unidadesSobrantes > 0 && match) {
        console.log(
          `[SCAN] ${resultado.unidadesSobrantes} unidades sobrantes -> a la orden`,
        );

        setDetalles((prev) => {
          // ==================== ESCANEO INTELIGENTE MULTI-ORDEN ====================
          // Buscar el PRIMER detalle incompleto con este ARTICULO_ID
          // Esto permite que cuando hay órdenes combinadas, el escaneo vaya a la orden que falta
          const detallesConEsteArticulo = prev
            .map((d, index) => ({ detalle: d, index }))
            .filter((item) => item.detalle.ARTICULO_ID === match.id);

          if (detallesConEsteArticulo.length === 0) return prev;

          // Calcular cuál detalle tiene espacio disponible
          let targetIndex = -1;
          for (const item of detallesConEsteArticulo) {
            const d = item.detalle;
            const devolucion = devoluciones.find(
              (dev) => dev.articuloId === d.ARTICULO_ID,
            );
            const cantDevolucion = devolucion ? devolucion.cantidad : 0;
            const unidadesApartadoArt =
              unidadesApartado.get(d.ARTICULO_ID) || 0;
            const maxAllowed = d.CANTIDAD - cantDevolucion;

            // Si este detalle aún no está completo, usarlo
            if (d.cantidadEscaneada < maxAllowed) {
              targetIndex = item.index;
              break;
            }
          }

          // Si todos están completos, usar el primero para mostrar mensaje de límite
          if (targetIndex === -1) {
            targetIndex = detallesConEsteArticulo[0].index;
          }

          // Ahora actualizar solo el detalle objetivo
          return prev.map((d, index) => {
            if (index !== targetIndex) return d;

            // Disparar scroll hacia este artículo
            setLastScannedItem({
              articuloId: d.ARTICULO_ID,
              doctoId: d.doctoId || caratula?.DOCTO_CM_ID || 0,
              timestamp: Date.now(),
            });

            const devolucion = devoluciones.find(
              (dev) => dev.articuloId === d.ARTICULO_ID,
            );
            const cantDevolucion = devolucion ? devolucion.cantidad : 0;
            const unidadesApartadoArt =
              unidadesApartado.get(d.ARTICULO_ID) || 0;
            const maxAllowed = d.CANTIDAD - cantDevolucion;

            const current = d.cantidadEscaneada;
            const unidadesAAgregar = resultado.unidadesSobrantes;

            if (current >= maxAllowed) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              playSound("error");
              setLastScanResult({
                success: false,
                message:
                  cantDevolucion > 0
                    ? `Límite alcanzado (${cantDevolucion} devueltos)`
                    : `Completo (${d.ordenOrigen || "orden principal"})`,
                articulo: d.CLAVE,
              });
              return d;
            } else {
              const newQty = Math.min(current + unidadesAAgregar, maxAllowed);
              const unidadesAgregadas = newQty - current;

              if (unidadesAgregadas > 0) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                playSound("scan");

                // Mostrar mensaje con info del split si hubo apartado
                const ordenInfo = d.ordenOrigen ? ` → ${d.ordenOrigen}` : "";
                const mensaje =
                  resultado.unidadesAsignadas > 0
                    ? `+${resultado.unidadesAsignadas} apartado | +${unidadesAgregadas}${ordenInfo}`
                    : `+${unidadesAgregadas}${ordenInfo}`;

                setLastScanResult({
                  success: true,
                  message: mensaje,
                  articulo: d.CLAVE,
                });
                setTimeout(() => setLastScanResult(null), 2000);
                return { ...d, cantidadEscaneada: newQty };
              }
            }
            return d;
          });
        });
      } else if (!resultado.tieneDestino && match) {
        // No tiene destino, procesar todas las unidades en la orden
        setDetalles((prev) => {
          // ==================== ESCANEO INTELIGENTE MULTI-ORDEN ====================
          const detallesConEsteArticulo = prev
            .map((d, index) => ({ detalle: d, index }))
            .filter((item) => item.detalle.ARTICULO_ID === match.id);

          if (detallesConEsteArticulo.length === 0) return prev;

          // Buscar el primer detalle incompleto
          let targetIndex = -1;
          for (const item of detallesConEsteArticulo) {
            const d = item.detalle;
            const devolucion = devoluciones.find(
              (dev) => dev.articuloId === d.ARTICULO_ID,
            );
            const cantDevolucion = devolucion ? devolucion.cantidad : 0;
            const unidadesApartadoArt =
              unidadesApartado.get(d.ARTICULO_ID) || 0;
            const maxAllowed = d.CANTIDAD - cantDevolucion;

            if (d.cantidadEscaneada < maxAllowed) {
              targetIndex = item.index;
              break;
            }
          }

          if (targetIndex === -1) {
            targetIndex = detallesConEsteArticulo[0].index;
          }

          return prev.map((d, index) => {
            if (index !== targetIndex) return d;

            // Disparar scroll hacia este artículo
            setLastScannedItem({
              articuloId: d.ARTICULO_ID,
              doctoId: d.doctoId || caratula?.DOCTO_CM_ID || 0,
              timestamp: Date.now(),
            });

            const devolucion = devoluciones.find(
              (dev) => dev.articuloId === d.ARTICULO_ID,
            );
            const cantDevolucion = devolucion ? devolucion.cantidad : 0;
            const unidadesApartadoArt =
              unidadesApartado.get(d.ARTICULO_ID) || 0;
            const maxAllowed = d.CANTIDAD - cantDevolucion;

            const current = d.cantidadEscaneada;
            if (current >= maxAllowed) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              playSound("error");
              setLastScanResult({
                success: false,
                message:
                  cantDevolucion > 0
                    ? `Límite alcanzado (${cantDevolucion} devueltos)`
                    : `Completo (${d.ordenOrigen || "orden principal"})`,
                articulo: d.CLAVE,
              });
              return d;
            } else {
              const newQty = Math.min(current + match.qty, maxAllowed);
              const ordenInfo = d.ordenOrigen ? ` → ${d.ordenOrigen}` : "";
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              playSound("scan");
              setLastScanResult({
                success: true,
                message: `+${match.qty}${ordenInfo}`,
                articulo: d.CLAVE,
              });
              setTimeout(() => setLastScanResult(null), 1500);
              return { ...d, cantidadEscaneada: newQty };
            }
          });
        });
      } else if (!match && !resultado.tieneDestino) {
        // Código no encontrado en la orden y no tiene apartado ni traspaso
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playSound("error");
        setLastScanResult({ success: false, message: "No encontrado" });
        setTimeout(() => setLastScanResult(null), 1500);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      devoluciones,
      playSound,
      unidadesApartado,
      consultarDestinoArticulo,
      incrementarPorCodigo,
      incrementarUnidadesApartado,
    ],
  );

  // Calcular progreso total
  const getTotalProgress = useCallback(() => {
    const totalEsperado = detalles.reduce((acc, d) => acc + d.CANTIDAD, 0);
    const totalEscaneado = detalles.reduce(
      (acc, d) => acc + d.cantidadEscaneada,
      0,
    );
    const totalDevuelto = devoluciones.reduce((acc, d) => acc + d.cantidad, 0);
    const totalEnBackorder = detalles.reduce((acc, d) => {
      if (backorderIds.has(d.ARTICULO_ID)) {
        return acc + Math.max(0, d.CANTIDAD - d.cantidadEscaneada);
      }
      return acc;
    }, 0);

    return {
      totalEsperado,
      totalEscaneado: totalEscaneado + totalDevuelto + totalEnBackorder,
    };
  }, [detalles, devoluciones, backorderIds]);

  // Agregar incidencia
  const agregarIncidencia = useCallback(
    (articuloId: number, tipo: TipoIncidencia) => {
      const existente = incidencias.find(
        (i) => i.articuloId === articuloId && i.tipo === tipo,
      );

      if (!existente) {
        setIncidencias((prev) => [...prev, { articuloId, tipo }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [incidencias],
  );

  // Verificar si tiene incidencia
  const tieneIncidencia = useCallback(
    (articuloId: number) => {
      return incidencias.some((i) => i.articuloId === articuloId);
    },
    [incidencias],
  );

  // Guardar devolución
  const guardarDevolucion = useCallback(
    (
      articuloId: number,
      cantidad: number,
      clave: string,
      maxCantidad: number,
    ) => {
      if (cantidad < 0) return false;
      if (cantidad > maxCantidad) return false;

      if (cantidad === 0) {
        setDevoluciones((prev) =>
          prev.filter((d) => d.articuloId !== articuloId),
        );
      } else {
        setDevoluciones((prev) => {
          const existente = prev.find((d) => d.articuloId === articuloId);
          if (existente) {
            return prev.map((d) =>
              d.articuloId === articuloId ? { ...d, cantidad } : d,
            );
          } else {
            return [...prev, { articuloId, cantidad, clave }];
          }
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    },
    [],
  );

  // Obtener cantidad de devolución
  const getCantidadDevolucion = useCallback(
    (articuloId: number) => {
      const dev = devoluciones.find((d) => d.articuloId === articuloId);
      return dev ? dev.cantidad : 0;
    },
    [devoluciones],
  );

  // Total de devoluciones
  const getTotalDevoluciones = useCallback(() => {
    return devoluciones.reduce((acc, d) => acc + d.cantidad, 0);
  }, [devoluciones]);

  // Manejar backorder
  const handleBackorder = useCallback((articuloId: number) => {
    setBackorderIds((prev) => {
      const next = new Set(prev);
      if (next.has(articuloId)) {
        next.delete(articuloId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        next.add(articuloId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, []);

  const isBackorder = useCallback(
    (articuloId: number) => {
      return backorderIds.has(articuloId);
    },
    [backorderIds],
  );

  // Verificar si está completo
  const isReciboCompleto = useCallback(() => {
    if (detalles.length === 0) return false;
    return detalles.every((d) => {
      if (backorderIds.has(d.ARTICULO_ID)) return true;
      const dev = getCantidadDevolucion(d.ARTICULO_ID);
      const meta = d.CANTIDAD - dev;
      return d.cantidadEscaneada >= meta;
    });
  }, [detalles, backorderIds, getCantidadDevolucion]);

  // Ejecutar recepción
  // Soporta órdenes combinadas: agrupa artículos por doctoId y procesa cada orden por separado
  const ejecutarRecepcion = useCallback(async () => {
    if (!caratula) return;
    setShowConfirmModal(false);
    setRecibiendoOrden(true);

    const hayDevoluciones = devoluciones.length > 0;
    const totalDevolucion = getTotalDevoluciones();

    try {
      const databaseId = getCurrentDatabaseId();

      // Calcular totales para logging
      const totalEscaneado = detalles.reduce(
        (acc, d) => acc + d.cantidadEscaneada,
        0,
      );
      const totalApartado = Array.from(unidadesApartado.values()).reduce(
        (acc, v) => acc + v,
        0,
      );

      // Preparar artículos a recibir
      const articulosRecibir = detalles
        .filter((d) => d.cantidadEscaneada > 0)
        .map((d) => {
          console.log(
            `[RECEPCION] ${d.CLAVE}: escaneadas=${d.cantidadEscaneada}, doctoId=${d.doctoId}, origen=${d.ordenOrigen}`,
          );
          return {
            clave: d.CLAVE,
            unidades: d.cantidadEscaneada,
            articuloId: d.ARTICULO_ID,
            doctoId: d.doctoId || caratula.DOCTO_CM_ID,
            ordenOrigen: d.ordenOrigen || caratula.FOLIO,
          };
        });

      if (articulosRecibir.length === 0) {
        throw new Error("No hay artículos escaneados para recibir");
      }

      console.log(
        `[RECEPCION] Total escaneado: ${totalEscaneado}, Total apartado: ${totalApartado}, Artículos: ${articulosRecibir.length}`,
      );

      // ==================== ÓRDENES COMBINADAS ====================
      // Agrupar artículos por doctoId para procesar cada orden por separado
      const articulosPorDoctoId = new Map<number, typeof articulosRecibir>();
      articulosRecibir.forEach((art) => {
        const doctoId = art.doctoId;
        if (!articulosPorDoctoId.has(doctoId)) {
          articulosPorDoctoId.set(doctoId, []);
        }
        articulosPorDoctoId.get(doctoId)!.push(art);
      });

      console.log(
        `[RECEPCION] Órdenes a procesar: ${articulosPorDoctoId.size}`,
      );

      let folioRecepcionPrincipal: string | null = null;
      const foliosRecepcion: string[] = [];

      // Procesar cada orden por separado
      for (const [doctoId, articulos] of articulosPorDoctoId) {
        // Buscar info de la orden (de combinedOrders o de caratula principal)
        const ordenInfo =
          combinedOrders.find((o) => o.doctoId === doctoId)?.caratula ||
          (caratula.DOCTO_CM_ID === doctoId ? caratula : null);

        if (!ordenInfo) {
          console.warn(
            `[RECEPCION] No se encontró info para doctoId ${doctoId}, usando caratula principal`,
          );
        }

        const folioOrden = ordenInfo?.FOLIO || caratula.FOLIO;
        const hayBackorderAuto = articulos.some((art) => {
          const detalle = detalles.find(
            (d) => d.ARTICULO_ID === art.articuloId && d.doctoId === doctoId,
          );
          if (!detalle) return false;
          const devolucion = devoluciones.find(
            (dev) => dev.articuloId === detalle.ARTICULO_ID,
          );
          const tieneDevolucion = devolucion && devolucion.cantidad > 0;
          return (
            detalle.cantidadEscaneada < detalle.CANTIDAD && !tieneDevolucion
          );
        });

        console.log(
          `[RECEPCION] Procesando orden ${folioOrden} (doctoId: ${doctoId}) con ${articulos.length} artículos`,
        );

        const response = await fetch(`${API_URL}/api/recibo-parcial.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            folioOrden,
            doctoOctId: doctoId,
            articulos: articulos.map((a) => ({
              clave: a.clave,
              unidades: a.unidades,
              articuloId: a.articuloId,
            })),
            almacenId: 188104,
            sucursalId: 9606947,
            hayBackorderUsuario: hayBackorderAuto,
          }),
        });

        const resultText = await response.text();
        const jsonMatch = resultText.match(/\{[\s\S]*\}$/);
        if (!jsonMatch) {
          throw new Error(
            `Respuesta no válida del servidor para orden ${folioOrden}`,
          );
        }
        const result = JSON.parse(jsonMatch[0]);

        if (!result.ok) {
          throw new Error(
            result.message || `Error al recibir orden ${folioOrden}`,
          );
        }

        if (result.folioRecepcion) {
          foliosRecepcion.push(result.folioRecepcion);
          if (!folioRecepcionPrincipal) {
            folioRecepcionPrincipal = result.folioRecepcion;
          }
        }

        console.log(
          `[RECEPCION] Orden ${folioOrden} recibida. Folio RCT: ${result.folioRecepcion}`,
        );
      }

      // PASO 2: Si hay devoluciones, crear DRC (solo para la orden principal)
      let folioDevolucion: string | null = null;

      if (hayDevoluciones && folioRecepcionPrincipal) {
        const articulosDevolver = devoluciones.map((d) => ({
          clave: d.clave,
          unidades: d.cantidad,
        }));

        const drcResponse = await fetch(
          `${API_URL}/api/crear-devolucion-v5.php`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              databaseId,
              folioRecepcion: folioRecepcionPrincipal,
              articulos: articulosDevolver,
            }),
          },
        );

        try {
          const drcText = await drcResponse.text();
          const drcJsonMatch = drcText.match(/\{[\s\S]*\}$/);
          if (drcJsonMatch) {
            const drcResult = JSON.parse(drcJsonMatch[0]);
            if (drcResult.success) {
              folioDevolucion = drcResult.folioDevolucion;
            }
          }
        } catch (parseError) {
          console.warn(
            "[RECIBO] Error parseando respuesta devolución:",
            parseError,
          );
        }
      }

      // PASO 3: Mostrar resultado
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("add");

      // Si hay múltiples folios, mostrar el primero con indicación
      const folioMostrar =
        foliosRecepcion.length > 1
          ? `${folioRecepcionPrincipal} (+${foliosRecepcion.length - 1})`
          : folioRecepcionPrincipal;

      setSuccessData({
        folioRecepcion: folioMostrar,
        folioDevolucion: folioDevolucion,
        totalArticulos: detalles.length,
        totalUnidadesRecibidas: totalEscaneado,
        totalDevoluciones: devoluciones.length,
        unidadesDevueltas: totalDevolucion,
      });
      setShowSuccessModal(true);

      // Borrar el draft automáticamente al finalizar con éxito
      await AsyncStorage.removeItem(RECIBO_DRAFT_KEY);
      console.log("[RECEPCION] Draft eliminado automáticamente tras éxito");
    } catch (error: any) {
      console.error("[RECIBO] Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    } finally {
      setRecibiendoOrden(false);
    }
  }, [
    caratula,
    detalles,
    devoluciones,
    getTotalDevoluciones,
    playSound,
    unidadesApartado,
    combinedOrders,
  ]);

  // ==================== RECIBIR ORDEN INDIVIDUAL ====================
  // Cuando hay múltiples órdenes combinadas, permite recibir solo una y continuar con las demás
  const [recibiendoOrdenIndividual, setRecibiendoOrdenIndividual] =
    useState(false);

  const recibirOrdenIndividual = useCallback(
    async (
      doctoIdARecibir: number,
      folioOrden: string,
    ): Promise<{
      success: boolean;
      folioRecepcion?: string;
      folioDevolucion?: string;
      error?: string;
    }> => {
      if (!caratula) {
        return { success: false, error: "No hay orden cargada" };
      }

      setRecibiendoOrdenIndividual(true);

      try {
        const databaseId = getCurrentDatabaseId();

        // Filtrar solo los artículos de esta orden específica
        const articulosDeEstaOrden = detalles
          .filter(
            (d) =>
              (d.doctoId || caratula.DOCTO_CM_ID) === doctoIdARecibir &&
              d.cantidadEscaneada > 0,
          )
          .map((d) => ({
            clave: d.CLAVE,
            unidades: d.cantidadEscaneada,
            articuloId: d.ARTICULO_ID,
          }));

        if (articulosDeEstaOrden.length === 0) {
          setRecibiendoOrdenIndividual(false);
          return {
            success: false,
            error: "No hay artículos escaneados en esta orden",
          };
        }

        console.log(
          `[RECEPCION INDIVIDUAL] Procesando orden ${folioOrden} (doctoId: ${doctoIdARecibir}) con ${articulosDeEstaOrden.length} artículos`,
        );

        // Verificar si hay backorder
        const hayBackorder = detalles.some((d) => {
          if ((d.doctoId || caratula.DOCTO_CM_ID) !== doctoIdARecibir)
            return false;
          const devolucion = devoluciones.find(
            (dev) => dev.articuloId === d.ARTICULO_ID,
          );
          const tieneDevolucion = devolucion && devolucion.cantidad > 0;
          return d.cantidadEscaneada < d.CANTIDAD && !tieneDevolucion;
        });

        const response = await fetch(`${API_URL}/api/recibo-parcial.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            folioOrden,
            doctoOctId: doctoIdARecibir,
            articulos: articulosDeEstaOrden,
            almacenId: 188104,
            sucursalId: 9606947,
            hayBackorderUsuario: hayBackorder,
          }),
        });

        const resultText = await response.text();
        const jsonMatch = resultText.match(/\{[\s\S]*\}$/);
        if (!jsonMatch) {
          throw new Error(
            `Respuesta no válida del servidor para orden ${folioOrden}`,
          );
        }
        const result = JSON.parse(jsonMatch[0]);

        if (!result.ok) {
          throw new Error(
            result.message || `Error al recibir orden ${folioOrden}`,
          );
        }

        console.log(
          `[RECEPCION INDIVIDUAL] Orden ${folioOrden} recibida. Folio RCT: ${result.folioRecepcion}`,
        );

        // ==================== PROCESAR DEVOLUCIONES ====================
        // Verificar si hay devoluciones para artículos de esta orden
        const articulosDeEstaOrdenIds = articulosDeEstaOrden.map(
          (a) => a.articuloId,
        );
        const devolucionesDeEstaOrden = devoluciones.filter((d) =>
          articulosDeEstaOrdenIds.includes(d.articuloId),
        );

        let folioDevolucion: string | null = null;

        if (devolucionesDeEstaOrden.length > 0 && result.folioRecepcion) {
          console.log(
            `[RECEPCION INDIVIDUAL] Procesando ${devolucionesDeEstaOrden.length} devoluciones...`,
          );

          const articulosDevolver = devolucionesDeEstaOrden.map((d) => ({
            clave: d.clave,
            unidades: d.cantidad,
          }));

          const drcResponse = await fetch(
            `${API_URL}/api/crear-devolucion-v5.php`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                databaseId,
                folioRecepcion: result.folioRecepcion,
                articulos: articulosDevolver,
              }),
            },
          );

          try {
            const drcText = await drcResponse.text();
            const drcJsonMatch = drcText.match(/\{[\s\S]*\}$/);
            if (drcJsonMatch) {
              const drcResult = JSON.parse(drcJsonMatch[0]);
              if (drcResult.success) {
                folioDevolucion = drcResult.folioDevolucion;
                console.log(
                  `[RECEPCION INDIVIDUAL] DRC creado: ${folioDevolucion}`,
                );
              }
            }
          } catch (drcError) {
            console.error(
              "[RECEPCION INDIVIDUAL] Error procesando DRC:",
              drcError,
            );
          }

          // Eliminar las devoluciones procesadas
          setDevoluciones((prev) =>
            prev.filter((d) => !articulosDeEstaOrdenIds.includes(d.articuloId)),
          );
        }

        // Eliminar los artículos de esta orden de la lista
        setDetalles((prev) =>
          prev.filter(
            (d) => (d.doctoId || caratula.DOCTO_CM_ID) !== doctoIdARecibir,
          ),
        );

        // 1. Eliminar de combinedOrders
        setCombinedOrders((prev) => {
          const nuevaLista = prev.filter((o) => o.doctoId !== doctoIdARecibir);

          // 2. Si era la orden principal (caratula), promover la siguiente de la nueva lista
          if (doctoIdARecibir === caratula.DOCTO_CM_ID) {
            if (nuevaLista.length > 0) {
              setCaratula(nuevaLista[0].caratula);
            } else {
              // Si no quedan órdenes adicionales, pero aún teníamos la principal...
              // Esto no debería pasar mucho si usamos combinedOrders para todo,
              // pero por seguridad si no hay más, reseteamos.
              // resetState(); // No reseteamos aquí para evitar cierres abruptos, el SuccessModal lo hará si es necesario.
            }
          }
          return nuevaLista;
        });

        // 2. Eliminar los artículos de esta orden de la lista de detalles
        setDetalles((prev) =>
          prev.filter(
            (d) => (d.doctoId || caratula.DOCTO_CM_ID) !== doctoIdARecibir,
          ),
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSound("add");

        setRecibiendoOrdenIndividual(false);
        return {
          success: true,
          folioRecepcion: result.folioRecepcion,
          folioDevolucion: folioDevolucion || undefined,
        };
      } catch (error: any) {
        console.error("[RECEPCION INDIVIDUAL] Error:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setRecibiendoOrdenIndividual(false);
        return { success: false, error: error.message };
      }
    },
    [caratula, detalles, devoluciones, combinedOrders, playSound],
  );

  // Procesar texto del scanner PDA
  // Ahora también limpia el input para evitar que se sature
  const processScannerText = useCallback(
    (text: string) => {
      // Si no hay saltos de línea, solo guardamos el progreso actual
      if (!text.includes("\n") && !text.includes("\r")) {
        setScannerValue(text);
        return;
      }

      // Separar por líneas (saltos de línea)
      const lineas = text.split(/[\n\r]+/);

      // La última parte puede ser un código incompleto que se sigue escribiendo
      // Si el texto termina en salto de línea, procesamos todo.
      // Si no, dejamos la última parte en el input.
      const terminaEnSalto = /[\n\r]$/.test(text);
      const completas = terminaEnSalto ? lineas : lineas.slice(0, -1);
      const incompleta = terminaEnSalto ? "" : lineas[lineas.length - 1];

      completas.forEach((linea) => {
        const codigo = linea.trim();
        if (codigo) {
          console.log("[SCANNER PDA] Procesando código:", codigo);
          processScannedCode(codigo);
        }
      });

      // Limpiar el buffer pero dejar lo incompleto si existe
      setScannerValue(incompleta);
    },
    [processScannedCode],
  );

  // ==================== AUTOGUARDADO ====================

  // Guardar borrador en AsyncStorage
  const saveDraft = useCallback(async () => {
    if (!caratula || detalles.length === 0) return;

    // Solo guardar si hay progreso (al menos un artículo escaneado)
    const hayProgreso = detalles.some((d) => d.cantidadEscaneada > 0);
    if (!hayProgreso) return;

    try {
      const draft: ReciboDraft = {
        caratula,
        detalles,
        codigosInner,
        devoluciones,
        incidencias,
        combinedOrders,
        unidadesApartado: Array.from(unidadesApartado.entries()),
        timestamp: Date.now(),
        databaseId: getCurrentDatabaseId(),
      };
      await AsyncStorage.setItem(RECIBO_DRAFT_KEY, JSON.stringify(draft));
      console.log("[AUTOGUARDADO] Borrador guardado:", caratula.FOLIO);
    } catch (error) {
      console.error("[AUTOGUARDADO] Error al guardar:", error);
    }
  }, [
    caratula,
    detalles,
    codigosInner,
    devoluciones,
    incidencias,
    combinedOrders,
    unidadesApartado,
  ]);

  // Cargar borrador de AsyncStorage
  const loadDraft = useCallback(async (): Promise<ReciboDraft | null> => {
    try {
      const data = await AsyncStorage.getItem(RECIBO_DRAFT_KEY);
      if (!data) return null;

      const draft: ReciboDraft = JSON.parse(data);

      // Verificar que sea de la misma base de datos
      const currentDb = getCurrentDatabaseId();
      if (draft.databaseId !== currentDb) {
        console.log("[AUTOGUARDADO] Borrador de otra base de datos, ignorando");
        await clearDraft();
        return null;
      }

      // Verificar que no sea muy viejo (24 horas max)
      const horasDesdeGuardado =
        (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (horasDesdeGuardado > 24) {
        console.log("[AUTOGUARDADO] Borrador muy viejo, eliminando");
        await clearDraft();
        return null;
      }

      return draft;
    } catch (error) {
      console.error("[AUTOGUARDADO] Error al cargar:", error);
      return null;
    }
  }, []);

  // Limpiar borrador
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECIBO_DRAFT_KEY);
      console.log("[AUTOGUARDADO] Borrador eliminado");
    } catch (error) {
      console.error("[AUTOGUARDADO] Error al limpiar:", error);
    }
  }, []);

  // Restaurar borrador
  const restoreDraft = useCallback((draft: ReciboDraft) => {
    setCaratula(draft.caratula);
    setDetalles(draft.detalles);
    setCodigosInner(draft.codigosInner);
    setDevoluciones(draft.devoluciones);
    setIncidencias(draft.incidencias);
    setCombinedOrders(draft.combinedOrders);
    setUnidadesApartado(new Map(draft.unidadesApartado));
    setViewMode("detail");
    setSavedDraft(null);
    setShowDraftModal(false);

    // Reconstruir el mapa de códigos
    const map = new Map<string, { id: number; qty: number }>();
    draft.detalles.forEach((d) => {
      if (d.CLAVE)
        map.set(d.CLAVE.toUpperCase(), { id: d.ARTICULO_ID, qty: d.CANTIDAD });
      if (d.CODIGO_BARRAS)
        map.set(d.CODIGO_BARRAS.toUpperCase(), {
          id: d.ARTICULO_ID,
          qty: d.CANTIDAD,
        });
    });
    codigosMapRef.current = map;

    console.log("[AUTOGUARDADO] Borrador restaurado:", draft.caratula.FOLIO);
  }, []);

  // Descartar borrador
  const discardDraft = useCallback(async () => {
    await clearDraft();
    setSavedDraft(null);
    setShowDraftModal(false);
  }, [clearDraft]);

  // Verificar si hay borrador al montar
  useEffect(() => {
    const checkDraft = async () => {
      const draft = await loadDraft();
      if (draft) {
        setSavedDraft(draft);
        // NO mostrar el modal si ya entramos directo a detalle (ej. por parámetros folio)
        // Usamos un pequeño delay para asegurar que el viewMode se haya actualizado si hubo una búsqueda inmediata
        setTimeout(() => {
          if (stateRef.current.viewMode === "search") {
            setShowDraftModal(true);
          }
        }, 500);
      }
    };
    checkDraft();
  }, [loadDraft]);

  // Mantener ref actualizado con el estado actual
  useEffect(() => {
    stateRef.current = {
      viewMode,
      caratula,
      detalles,
      codigosInner,
      devoluciones,
      incidencias,
      combinedOrders,
      unidadesApartado,
    };
  }, [
    viewMode,
    caratula,
    detalles,
    codigosInner,
    devoluciones,
    incidencias,
    combinedOrders,
    unidadesApartado,
  ]);

  // Autoguardar cuando hay cambios (con debounce)
  useEffect(() => {
    if (viewMode !== "detail" || !caratula) return;

    // Cancelar timeout anterior
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Guardar después de 2 segundos de inactividad
    autoSaveTimeout.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [viewMode, caratula, detalles, devoluciones, incidencias, saveDraft]);

  // Guardar inmediatamente al desmontar el componente
  useEffect(() => {
    return () => {
      const state = stateRef.current;
      if (
        state.viewMode !== "detail" ||
        !state.caratula ||
        state.detalles.length === 0
      )
        return;

      const hayProgreso = state.detalles.some((d) => d.cantidadEscaneada > 0);
      if (!hayProgreso) return;

      // Guardar sincrónicamente (no podemos await en cleanup)
      const draft: ReciboDraft = {
        caratula: state.caratula,
        detalles: state.detalles,
        codigosInner: state.codigosInner,
        devoluciones: state.devoluciones,
        incidencias: state.incidencias,
        combinedOrders: state.combinedOrders,
        unidadesApartado: Array.from(state.unidadesApartado.entries()),
        timestamp: Date.now(),
        databaseId: getCurrentDatabaseId(),
      };
      AsyncStorage.setItem(RECIBO_DRAFT_KEY, JSON.stringify(draft))
        .then(() => console.log("[AUTOGUARDADO] Guardado al salir"))
        .catch((err) =>
          console.error("[AUTOGUARDADO] Error al guardar al salir:", err),
        );
    };
  }, []);

  // Reset completo (borra borrador - usar cuando se completa la recepción)
  const resetState = useCallback(async () => {
    // Limpiar borrador al hacer reset
    await clearDraft();

    setViewMode("search");
    setCaratula(null);
    setDetalles([]);
    setCodigosInner([]);
    setDevoluciones([]);
    setBackorderIds(new Set());
    setIncidencias([]);
    setUnidadesApartado(new Map());
    setCombinedOrders([]); // Limpiar órdenes combinadas
    articulosSinDestinoCache.current.clear(); // Limpiar caché de destinos
    entersCountRef.current = 0;
  }, [clearDraft]);

  // Regresar a búsqueda sin borrar el borrador (guarda progreso)
  const goBackToSearch = useCallback(async () => {
    // Guardar borrador antes de regresar
    await saveDraft();

    // Solo cambiar vista sin limpiar estado
    setViewMode("search");
  }, [saveDraft]);

  // Quitar una orden de la lista (cancelar su trabajo actual)
  const quitarOrden = useCallback(
    (doctoIdAQuitar: number) => {
      if (!caratula) return;

      // 1. Quitar de combinedOrders
      setCombinedOrders((prev) =>
        prev.filter((o) => o.doctoId !== doctoIdAQuitar),
      );

      // 2. Quitar artículos vinculados a esta orden de 'detalles'
      setDetalles((prev) =>
        prev.filter(
          (d) => (d.doctoId || caratula.DOCTO_CM_ID) !== doctoIdAQuitar,
        ),
      );

      // 3. Si era la carátula principal, promover otra o resetear
      if (doctoIdAQuitar === caratula.DOCTO_CM_ID) {
        if (combinedOrders.length > 0) {
          // Encontrar la primera orden que NO sea la que estamos quitando
          const otraOrden = combinedOrders.find(
            (o) => o.doctoId !== doctoIdAQuitar,
          );
          if (otraOrden) {
            setCaratula(otraOrden.caratula);
          } else {
            resetState();
          }
        } else {
          resetState();
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("add");
    },
    [caratula, combinedOrders, resetState, playSound],
  );

  // Obtener inner codes de un artículo
  const getInnerCodes = useCallback(
    (articuloId: number) => {
      return codigosInner.filter((c) => c.ARTICULO_ID === articuloId);
    },
    [codigosInner],
  );

  // Función para revisar urgencias de los SKUs actuales
  const checkUrgentNeeds = useCallback(async () => {
    if (detalles.length === 0 || monitoreandoUrgencias) return;

    const databaseId = getCurrentDatabaseId();
    if (!databaseId) return;

    // Obtener SKUs únicos de los detalles pero solo los que no están completos
    const skus = Array.from(
      new Set(
        detalles
          .filter((d) => d.cantidadEscaneada < d.CANTIDAD)
          .map((d) => d.CLAVE),
      ),
    );

    if (skus.length === 0) return;

    try {
      setMonitoreandoUrgencias(true);
      const response = await fetch(`${API_URL}/api/check-urgencias.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, skus }),
      });

      const data = await response.json();
      if (data.success && data.urgencias) {
        // Filtrar las que el usuario ya descartó manualmente O silenció por escaneo
        const nuevasUrgencias = data.urgencias.filter((u: any) => {
          const key = `${u.clave}-${u.folio}`;
          const isDiscarded = urgenciasDescartadasRef.current.has(key);
          const isSilencedByScan =
            urgenciasSilenciadasPorEscaneoRef.current.has(u.clave);
          return !isDiscarded && !isSilencedByScan;
        });

        // Solo actualizar el estado si realmente hay un cambio en el contenido
        // para evitar disparar efectos de sonido innecesarios
        const currentKeys = urgencias
          .map((u) => `${u.clave}-${u.folio}`)
          .sort()
          .join("|");
        const nextKeys = nuevasUrgencias
          .map((u: any) => `${u.clave}-${u.folio}`)
          .sort()
          .join("|");

        if (currentKeys !== nextKeys) {
          setUrgencias(nuevasUrgencias);
          if (nuevasUrgencias.length > 0) {
            console.log(
              `[MONITOR] Detectadas ${nuevasUrgencias.length} urgencias nuevas`,
            );
          }
        }
      }
    } catch (error) {
      console.error("[MONITOR] Error consultando urgencias:", error);
    } finally {
      setMonitoreandoUrgencias(false);
    }
  }, [detalles, monitoreandoUrgencias]);

  // Función para descartar/silenciar una urgencia manualmente
  const descartarUrgencias = useCallback(() => {
    // Guardar las actuales en el set de descartadas
    urgencias.forEach((u) => {
      urgenciasDescartadasRef.current.add(`${u.clave}-${u.folio}`);
    });
    setUrgencias([]);
  }, [urgencias]);

  // Limpiar descartadas cuando cambian los detalles (nueva orden o se limpia)
  useEffect(() => {
    if (detalles.length === 0) {
      urgenciasDescartadasRef.current.clear();
      urgenciasSilenciadasPorEscaneoRef.current.clear();
    }
  }, [detalles.length]);

  return {
    // Estados
    searchQuery,
    setSearchQuery,
    ordenes,
    refreshing,
    setRefreshing,
    loading,
    hasSearched,
    viewMode,
    setViewMode,
    caratula,
    detalles,
    codigosInner,
    // Autoguardado
    savedDraft,
    showDraftModal,
    setShowDraftModal,
    restoreDraft,
    discardDraft,
    lastScanResult,
    setLastScanResult,
    scannerValue,
    lastScannedItem,
    devoluciones,
    showSuccessModal,
    setShowSuccessModal,
    successData,
    setSuccessData,
    setCaratula,
    cantidadDevolucionInput,
    setCantidadDevolucionInput,
    recibiendoOrden,
    showConfirmModal,
    setShowConfirmModal,
    codigosMapRef,
    // Estados de destino (apartado)
    showDestinoModal,
    setShowDestinoModal,
    codigoApartado,
    setCodigoApartado,
    destinoInfo,
    setDestinoInfo,
    // Ir directo a selección de caja
    solicitarSeleccionCaja,
    setSolicitarSeleccionCaja,
    // Pedido completado
    showPedidoCompletado,
    setShowPedidoCompletado,
    pedidoCompletadoInfo,
    asignandoAuto,
    // Artículo asignado (sin completar pedido)
    showArticuloAsignado,
    setShowArticuloAsignado,
    articuloAsignadoInfo,

    // Funciones
    processScannedCode,
    consultarDestinoArticulo,
    buscarOrdenes,
    handleUpdateQuantity,
    handleUpdateQuantityWithDestino,
    handleSetQuantity,
    incrementarPorCodigo,
    incrementarUnidadesApartado,
    getUnidadesApartado,
    getTotalProgress,
    agregarIncidencia,
    tieneIncidencia,
    guardarDevolucion,
    getCantidadDevolucion,
    getTotalDevoluciones,
    handleBackorder,
    isBackorder,
    isReciboCompleto,
    ejecutarRecepcion,
    processScannerText,
    resetState,
    goBackToSearch,
    getInnerCodes,
    // Órdenes combinadas
    combinedOrders,
    loadingOrdenAdicional,
    agregarOrdenAdicional,
    quitarOrden,
    // Recepción por orden individual
    recibirOrdenIndividual,
    recibiendoOrdenIndividual,
    urgencias,
    setUrgencias,
    checkUrgentNeeds,
    monitoreandoUrgencias,
    descartarUrgencias,
    precargandoDestinos,
    playSound,
  };
}
