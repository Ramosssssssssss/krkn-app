import SuccessModal from "@/components/inventarios/SuccessModal";
import { API_URL } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useThemeColors } from "@/context/theme-context";
import { useSystemSounds } from "@/hooks/use-system-sounds";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SectionList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes y hooks modularizados
import {
    ArticleCardRecibo,
    ArticleCardReciboHandle,
} from "./_components/ArticleCardRecibo";
import { useReciboLogic } from "./_components/hooks";
import {
    AgregarOrdenModal,
    ArticleDetailModal,
    ArticuloAsignadoModal,
    CajasModal,
    CameraScannerModal,
    ConfirmReciboModal,
    DestinoAlertModal,
    DetalleCajaModal,
    DevolucionModal,
    DraftModal,
    IncidenciaModal,
    PedidoCompletadoModal,
} from "./_components/modals";
import type { CajaOcupada } from "./_components/modals/CajasModal";
import { styles } from "./_components/styles";
import { CodigoInner, DetalleArticulo, OrdenCompra } from "./_components/types";

export default function ReciboScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hook con toda la lógica de negocio
  const logic = useReciboLogic();
  const { playSound } = useSystemSounds();

  // Assistive Touch & Camera
  const { onCameraTrigger } = useAssistive();
  const [permission, requestPermission] = useCameraPermissions();
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const scanLock = useRef(false);

  // Modal de detalles del artículo (UI local)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedArticle, setSelectedArticle] =
    useState<DetalleArticulo | null>(null);
  const [selectedInnerCodes, setSelectedInnerCodes] = useState<CodigoInner[]>(
    [],
  );

  // Modales de incidencia y devolución (UI local)
  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [articuloIncidencia, setArticuloIncidencia] =
    useState<DetalleArticulo | null>(null);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [articuloDevolucion, setArticuloDevolucion] =
    useState<DetalleArticulo | null>(null);

  // Modal de cajas (apartado)
  const [showCajasModal, setShowCajasModal] = useState(false);
  const [modoSeleccionCaja, setModoSeleccionCaja] = useState(false);
  const [cajaSeleccionada, setCajaSeleccionada] = useState<string | null>(null);
  const [asignandoCaja, setAsignandoCaja] = useState(false);

  // Modal detalle de caja ocupada
  const [showDetalleCajaModal, setShowDetalleCajaModal] = useState(false);
  const [detalleCajaInfo, setDetalleCajaInfo] = useState<{
    folio: string;
    codigoCaja: string;
    nombreCaja: string;
  } | null>(null);

  // Estado local para pedido completado (cuando se asigna manualmente)
  const [pedidoCompletadoLocal, setPedidoCompletadoLocal] = useState<{
    folio: string;
    caja: string;
  } | null>(null);

  // Estado local para artículo asignado (cuando se asigna manualmente pero NO está completo)
  const [articuloAsignadoLocal, setArticuloAsignadoLocal] = useState<{
    clave: string;
    caja: string;
    folio: string;
  } | null>(null);

  // Ref para input de escaneo
  const scanInputRef = useRef<TextInput>(null);

  // Refs para cerrar swipeables anteriores
  const swipeableRefs = useRef<Map<number, ArticleCardReciboHandle>>(new Map());
  const openSwipeableId = useRef<number | null>(null);

  // Modal para agregar órdenes adicionales
  const [showAgregarOrdenModal, setShowAgregarOrdenModal] = useState(false);

  // ==================== RECEPCIÓN INDIVIDUAL ====================
  // Estado para confirmar recepción de una orden específica
  const [ordenARecibirIndividual, setOrdenARecibirIndividual] = useState<{
    doctoId: number;
    folio: string;
  } | null>(null);

  // Estado para saber si el modal de éxito actual es de una individual
  const [fueRecepcionIndividual, setFueRecepcionIndividual] = useState(false);

  const handleRecibirIndividualConfirm = async () => {
    if (!ordenARecibirIndividual) return;

    const currentOrden = ordenARecibirIndividual;
    const resultado = await logic.recibirOrdenIndividual(
      currentOrden.doctoId,
      currentOrden.folio,
    );

    setOrdenARecibirIndividual(null);

    if (resultado.success) {
      setFueRecepcionIndividual(true);
      // Calcular estadísticas de lo recibido de esta orden específica
      const articulosOrden = logic.detalles.filter(
        (d) =>
          (d.doctoId || logic.caratula?.DOCTO_CM_ID) === currentOrden.doctoId,
      );
      const totalUnidades = articulosOrden.reduce(
        (acc, d) => acc + d.cantidadEscaneada,
        0,
      );

      logic.setSuccessData({
        folioRecepcion: resultado.folioRecepcion || "",
        folioDevolucion: resultado.folioDevolucion || null,
        totalArticulos: articulosOrden.length,
        totalUnidadesRecibidas: totalUnidades,
        totalDevoluciones: resultado.folioDevolucion ? 1 : 0,
        unidadesDevueltas: infoConfirmIndividual?.unidadesDevueltas || 0,
      });
      logic.setShowSuccessModal(true);
    } else {
      Alert.alert("Error", resultado.error || "No se pudo recibir la orden");
    }
  };

  const soundIntervalRef = useRef<any>(null);

  // ==================== MONITOR DE URGENCIAS ====================
  useEffect(() => {
    // Solo monitorear si estamos en la vista de detalle y hay productos
    if (logic.viewMode !== "detail" || logic.detalles.length === 0) return;

    // Primera revisión inmediata
    logic.checkUrgentNeeds();

    // Luego cada 5 segundos (modo prueba)
    const interval = setInterval(() => {
      logic.checkUrgentNeeds();
    }, 5000);

    return () => clearInterval(interval);
  }, [logic.viewMode, logic.detalles.length]);

  // Alerta sonora repetitiva cuando hay urgencias activas
  useEffect(() => {
    // Si no hay urgencias, limpiar intervalo y salir
    if (logic.urgencias.length === 0) {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
      return;
    }

    // Si ya existe un intervalo, no crear otro (evita encimamiento)
    if (soundIntervalRef.current) return;

    // Reproducir cada 4 segundos (un poco más de espacio para evitar saturar)

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [logic.urgencias.length, playSound]);

  // Cuando se detecta un artículo con apartado, ir directo a selección de caja
  useEffect(() => {
    if (logic.solicitarSeleccionCaja) {
      // Resetear la señal
      logic.setSolicitarSeleccionCaja(false);
      // Abrir modal de cajas en modo selección
      setModoSeleccionCaja(true);
      setShowCajasModal(true);
    }
  }, [logic.solicitarSeleccionCaja]);

  // Información para el modal de confirmación individual
  const infoConfirmIndividual = useMemo(() => {
    if (!ordenARecibirIndividual) return null;

    // Filtrar artículos de esta orden que tienen devoluciones
    const articulosOrden = logic.detalles.filter(
      (d) =>
        (d.doctoId || logic.caratula?.DOCTO_CM_ID) ===
        ordenARecibirIndividual.doctoId,
    );
    const articulosIds = articulosOrden.map((a) => a.ARTICULO_ID);

    const devsOrden = logic.devoluciones.filter((d) =>
      articulosIds.includes(d.articuloId),
    );
    const unidadesDevs = devsOrden.reduce((acc, d) => acc + d.cantidad, 0);

    return {
      totalDevoluciones: devsOrden.length,
      unidadesDevueltas: unidadesDevs,
    };
  }, [
    ordenARecibirIndividual,
    logic.detalles,
    logic.devoluciones,
    logic.caratula,
  ]);

  // ==================== AGRUPAR ARTÍCULOS POR ORDEN ====================
  // Cuando hay órdenes combinadas, agrupar artículos por ordenOrigen
  const articulosSections = useMemo(() => {
    // Si no hay órdenes combinadas, no usar secciones
    if (logic.combinedOrders.length === 0) {
      return null;
    }

    // Agrupar por ordenOrigen y doctoId
    const grupos = new Map<
      string,
      { doctoId: number; items: DetalleArticulo[] }
    >();

    logic.detalles.forEach((detalle) => {
      const folio = detalle.ordenOrigen || logic.caratula?.FOLIO || "Sin orden";
      const doctoId = detalle.doctoId || logic.caratula?.DOCTO_CM_ID || 0;
      if (!grupos.has(folio)) {
        grupos.set(folio, { doctoId, items: [] });
      }
      grupos.get(folio)!.items.push(detalle);
    });

    // Convertir a formato de SectionList con info de progreso
    const sections: {
      title: string;
      doctoId: number;
      productCount: number;
      escaneadas: number;
      meta: number;
      isComplete: boolean;
      isPartial: boolean;
      data: DetalleArticulo[];
    }[] = [];

    grupos.forEach((grupo, folio) => {
      const escaneadas = grupo.items.reduce(
        (acc, d) => acc + d.cantidadEscaneada,
        0,
      );
      const meta = grupo.items.reduce((acc, d) => acc + d.CANTIDAD, 0);

      const isComplete = grupo.items.every((d) => {
        if (logic.isBackorder(d.ARTICULO_ID)) return true;
        const dev = logic.getCantidadDevolucion(d.ARTICULO_ID);
        return d.cantidadEscaneada >= d.CANTIDAD - dev;
      });

      sections.push({
        title: folio,
        doctoId: grupo.doctoId,
        productCount: grupo.items.length,
        escaneadas,
        meta,
        isComplete,
        isPartial: escaneadas > 0 && !isComplete,
        data: grupo.items,
      });
    });

    return sections;
  }, [
    logic.detalles,
    logic.combinedOrders,
    logic.caratula,
    logic.isBackorder,
    logic.getCantidadDevolucion,
  ]);

  // Handler para el scanner de cámara
  const handleCameraScan = useCallback(
    ({ data }: { data: string }) => {
      console.log("=== CAMERA SCAN ===");
      console.log("[CAMERA] data escaneado:", data);
      console.log("[CAMERA] isScanning:", isScanning);
      console.log("[CAMERA] scanLock.current:", scanLock.current);

      if (!isScanning || scanLock.current) {
        console.log("[CAMERA] BLOQUEADO - saliendo");
        return;
      }
      scanLock.current = true;

      const match = logic.codigosMapRef.current.get(data.toUpperCase());
      console.log("[CAMERA] Match en mapa:", match);

      if (match) {
        console.log("[CAMERA] Match encontrado - procesando y cerrando");
        setIsScanning(false);
        logic.processScannedCode(data);
        setShowCameraScanner(false);
      } else {
        console.log(
          "[CAMERA] NO match - llamando processScannedCode para consultar destino",
        );
        setIsScanning(false);
        logic.processScannedCode(data);
        setTimeout(() => {
          setIsScanning(true);
          scanLock.current = false;
        }, 1200);
      }
    },
    [isScanning, logic],
  );

  // Escuchar gatillo de cámara (Assistive Touch)
  useEffect(() => {
    const unsubscribe = onCameraTrigger(async () => {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permiso requerido",
            "Se requiere acceso a la cámara para escanear.",
          );
          return;
        }
      }
      scanLock.current = false;
      setShowCameraScanner(true);
      setIsScanning(true);
    });
    return unsubscribe;
  }, [onCameraTrigger, permission, requestPermission]);

  // Handlers locales para UI
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (logic.viewMode === "detail") {
      // Usar goBackToSearch para guardar el borrador antes de regresar
      logic.goBackToSearch();
    } else {
      router.back();
    }
  };

  // Asignar artículo a caja (apartado)
  const handleAsignarCaja = async (codigoCaja: string) => {
    if (!logic.codigoApartado || !logic.destinoInfo?.FOLIO_SUGERIDO) {
      Alert.alert("Error", "Faltan datos para asignar la caja");
      return;
    }

    const folio = logic.destinoInfo.FOLIO_SUGERIDO;
    setAsignandoCaja(true);

    try {
      const databaseId = getCurrentDatabaseId();

      // 1. Asignar el artículo a la caja
      const response = await fetch(`${API_URL}/api/asignar-caja.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          clave: logic.codigoApartado,
          folio: folio,
          caja: codigoCaja,
          pickerId: 1,
          nombrePicker: "APP",
          unidades: 1,
        }),
      });

      const data = await response.json();
      console.log("[ASIGNAR-CAJA] Respuesta:", data);

      if (data.success) {
        // Guardar el código antes de limpiar para usarlo en el modal
        const codigoAsignado = logic.codigoApartado;

        if (codigoAsignado) {
          // Incrementar +1 en el contador del artículo
          logic.incrementarPorCodigo(codigoAsignado);
          // Registrar que esta unidad va a apartado (no a existencias normales)
          logic.incrementarUnidadesApartado(codigoAsignado, 1);
          console.log(
            "[ASIGNAR-CAJA] Sumado +1 al artículo y registrado en apartado:",
            codigoAsignado,
          );
        }

        // Limpiar estados de apartado
        logic.setCodigoApartado(null);
        logic.setDestinoInfo(null);

        // 2. Verificar si el pedido está completo
        console.log("[ASIGNAR-CAJA] Verificando pendientes...");
        const responseDetalle = await fetch(
          `${API_URL}/api/detalle-apartado.php`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ databaseId, folio }),
          },
        );

        const dataDetalle = await responseDetalle.json();
        console.log(
          "[ASIGNAR-CAJA] Detalle apartado completo:",
          JSON.stringify(dataDetalle, null, 2),
        );
        console.log("[ASIGNAR-CAJA] Resumen:", dataDetalle.resumen);
        console.log(
          "[ASIGNAR-CAJA] totalArticulosPendientes:",
          dataDetalle.resumen?.totalArticulosPendientes,
        );
        console.log(
          "[ASIGNAR-CAJA] totalUnidadesFaltantes:",
          dataDetalle.resumen?.totalUnidadesFaltantes,
        );

        // Verificar usando ambos campos para mayor robustez
        const pendientes = dataDetalle.resumen?.totalArticulosPendientes ?? -1;
        const unidadesFaltantes =
          dataDetalle.resumen?.totalUnidadesFaltantes ?? -1;

        const pedidoCompleto =
          dataDetalle.success && (pendientes === 0 || unidadesFaltantes === 0);

        console.log("[ASIGNAR-CAJA] ¿Pedido completo?:", pedidoCompleto);

        if (pedidoCompleto) {
          console.log("[ASIGNAR-CAJA] ¡Pedido completo! Liberando caja...");

          // 3. Liberar la caja
          const responseLiberar = await fetch(
            `${API_URL}/api/liberar-caja.php`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ databaseId, codigoCaja }),
            },
          );

          const dataLiberar = await responseLiberar.json();
          console.log("[ASIGNAR-CAJA] Respuesta liberar:", dataLiberar);

          // Mostrar modal de pedido completado
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          playSound("add"); // Sonido done.mp3
          logic.setShowPedidoCompletado(true);
          // Nota: necesitamos pasar la info al hook
          // Por ahora usamos un workaround con el estado local
          setPedidoCompletadoLocal({ folio, caja: codigoCaja });
        } else {
          // Asignado pero faltan más - mostrar modal en lugar de Alert
          console.log(
            "[ASIGNAR-CAJA] Faltan artículos. Pendientes:",
            pendientes,
            "Unidades faltantes:",
            unidadesFaltantes,
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          playSound("add"); // Sonido done.mp3
          setArticuloAsignadoLocal({
            clave: codigoAsignado || "",
            caja: codigoCaja,
            folio: folio,
          });
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", data.error || "No se pudo asignar la caja");
      }
    } catch (error: any) {
      console.error("[ASIGNAR-CAJA] Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Error de conexión");
    } finally {
      setAsignandoCaja(false);
      setShowCajasModal(false);
      setModoSeleccionCaja(false);
      setCajaSeleccionada(null);
    }
  };

  // Abrir cámara para escaneo
  const handleOpenCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permiso requerido",
          "Se requiere acceso a la cámara para escanear.",
        );
        return;
      }
    }
    scanLock.current = false;
    setShowCameraScanner(true);
    setIsScanning(true);
  };

  const handleOrderPress = (orden: OrdenCompra) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logic.setSearchQuery(orden.FOLIO);
    logic.buscarOrdenes(orden.FOLIO);
  };

  const handleSearch = () => {
    if (logic.searchQuery.trim()) {
      logic.buscarOrdenes(logic.searchQuery);
    }
  };

  const onRefresh = useCallback(() => {
    logic.setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (logic.searchQuery.trim()) {
      logic
        .buscarOrdenes(logic.searchQuery)
        .finally(() => logic.setRefreshing(false));
    } else {
      logic.setRefreshing(false);
    }
  }, [logic]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Mostrar modal de detalles
  const handleShowDetails = (
    item: DetalleArticulo,
    innerCodes: CodigoInner[],
  ) => {
    setSelectedArticle(item);
    setSelectedInnerCodes(innerCodes);
    setShowDetailModal(true);
  };

  // Manejar incidencia
  const handleIncidencia = (item: DetalleArticulo) => {
    setArticuloIncidencia(item);
    setShowIncidenciaModal(true);
  };

  // Manejar devolución
  const handleDevolucion = (item: DetalleArticulo) => {
    setArticuloDevolucion(item);
    const devExistente = logic.getCantidadDevolucion(item.ARTICULO_ID);
    if (devExistente > 0) {
      logic.setCantidadDevolucionInput(devExistente.toString());
    } else {
      const sugerido = Math.max(0, item.CANTIDAD - item.cantidadEscaneada);
      logic.setCantidadDevolucionInput(sugerido.toString());
    }
    setShowDevolucionModal(true);
  };

  // Guardar devolución desde modal
  const handleGuardarDevolucion = () => {
    if (!articuloDevolucion) return;
    const cantidad = parseInt(logic.cantidadDevolucionInput, 10);

    if (isNaN(cantidad) || cantidad < 0) {
      Alert.alert("Error", "Ingresa una cantidad válida");
      return;
    }

    if (cantidad > articuloDevolucion.CANTIDAD) {
      Alert.alert(
        "Error",
        "La devolución no puede ser mayor a la cantidad esperada",
      );
      return;
    }

    logic.guardarDevolucion(
      articuloDevolucion.ARTICULO_ID,
      cantidad,
      articuloDevolucion.CLAVE,
      articuloDevolucion.CANTIDAD,
    );

    setShowDevolucionModal(false);
    setArticuloDevolucion(null);
    logic.setCantidadDevolucionInput("");
  };

  // Recibir orden
  const handleRecibirOrden = async () => {
    try {
      setFueRecepcionIndividual(false);
      await logic.ejecutarRecepcion();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo recibir la orden");
    }
  };

  // Manejar apertura de swipeable - cerrar el anterior
  const handleSwipeOpen = useCallback((articuloId: number) => {
    // Cerrar el swipeable anterior si hay uno abierto
    if (openSwipeableId.current && openSwipeableId.current !== articuloId) {
      const prevRef = swipeableRefs.current.get(openSwipeableId.current);
      prevRef?.close();
    }
    openSwipeableId.current = articuloId;
  }, []);

  // Render de artículo
  const renderArticulo = ({ item }: { item: DetalleArticulo }) => {
    const innerCodes = logic.getInnerCodes(item.ARTICULO_ID);
    const itemDoctoId = item.doctoId || logic.caratula?.DOCTO_CM_ID;

    return (
      <ArticleCardRecibo
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.ARTICULO_ID, ref);
          } else {
            swipeableRefs.current.delete(item.ARTICULO_ID);
          }
        }}
        item={item}
        colors={colors}
        innerCodes={innerCodes}
        onUpdateQuantity={(id, delta) =>
          logic.handleUpdateQuantity(id, delta, itemDoctoId)
        }
        onUpdateQuantityWithDestino={(id, delta, codigo) =>
          logic.handleUpdateQuantityWithDestino(id, delta, codigo, itemDoctoId)
        }
        onSetQuantity={(id, qty) =>
          logic.handleSetQuantity(id, qty, itemDoctoId)
        }
        onShowDetails={handleShowDetails}
        onIncidencia={handleIncidencia}
        onDevolucion={handleDevolucion}
        onBackorder={logic.handleBackorder}
        tieneIncidencia={logic.tieneIncidencia(item.ARTICULO_ID)}
        cantidadDevolucion={logic.getCantidadDevolucion(item.ARTICULO_ID)}
        isBackorder={logic.isBackorder(item.ARTICULO_ID)}
        onSwipeOpen={handleSwipeOpen}
      />
    );
  };

  // Render de orden
  const renderOrderCard = ({ item }: { item: OrdenCompra }) => {
    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.surface }]}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.orderLabel, { color: colors.textTertiary }]}>
            Orden de Compra
          </Text>
        </View>
        <Text style={[styles.orderNumber, { color: colors.text }]}>
          {item.FOLIO_DISPLAY || item.FOLIO}
        </Text>
        <View style={styles.providerRow}>
          <View
            style={[
              styles.truckIcon,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <Ionicons
              name="business-outline"
              size={16}
              color={colors.textTertiary}
            />
          </View>
          <View style={styles.providerInfo}>
            <Text
              style={[styles.providerName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.PROVEEDOR || item.CLAVE_PROV || "Sin proveedor"}
            </Text>
            <Text style={[styles.deliveryInfo, { color: colors.textTertiary }]}>
              {formatDate(item.FECHA)} • {item.ALMACEN || ""}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ===================== VISTA DE DETALLE =====================
  if (logic.viewMode === "detail" && logic.caratula) {
    const { totalEsperado, totalEscaneado } = logic.getTotalProgress();
    const progressPercent =
      totalEsperado > 0
        ? Math.min(100, (totalEscaneado / totalEsperado) * 100)
        : 0;
    const isComplete = totalEscaneado >= totalEsperado;
    const isOver = totalEscaneado > totalEsperado;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>
              Orden de Compra
            </Text>
            <Text
              style={[styles.headerFolio, { color: colors.text }]}
              numberOfLines={1}
            >
              {logic.caratula.FOLIO_DISPLAY || logic.caratula.FOLIO}
            </Text>
            <Text
              style={[styles.headerProveedor, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {logic.caratula.PROVEEDOR || logic.caratula.CLAVE_PROV}
            </Text>
            {logic.precargandoDestinos && (
              <View
                style={[
                  styles.bulkOptimizingIndicator,
                  { backgroundColor: colors.accent + "15" },
                ]}
              >
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[styles.bulkOptimizingText, { color: colors.accent }]}
                >
                  Optimizando destinos...
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerButtons}>
            {/* Botón +1 para agregar órdenes */}
            <TouchableOpacity
              style={[
                styles.addOrderBtn,
                {
                  backgroundColor:
                    logic.combinedOrders.length > 0
                      ? "#F59E0B"
                      : colors.surface,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAgregarOrdenModal(true);
              }}
            >
              <Ionicons
                name="add"
                size={20}
                color={logic.combinedOrders.length > 0 ? "#fff" : colors.accent}
              />
              <Text
                style={[
                  styles.addOrderBtnText,
                  {
                    color:
                      logic.combinedOrders.length > 0 ? "#fff" : colors.accent,
                  },
                ]}
              >
                +1
              </Text>
              {logic.combinedOrders.length > 0 && (
                <View style={styles.ordersBadge}>
                  <Text style={styles.ordersBadgeText}>
                    {logic.combinedOrders.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Botón de Cajas */}
            <TouchableOpacity
              style={[styles.cajasBtn, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCajasModal(true);
              }}
            >
              <Ionicons name="cube-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Input para escaneo */}
        <TextInput
          ref={scanInputRef}
          style={styles.hiddenScanInput}
          onChangeText={logic.processScannerText}
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          showSoftInputOnFocus={false}
          multiline={true}
          autoFocus
        />

        {/* Feedback del escaneo flotante */}
        {logic.lastScanResult && (
          <View
            style={[
              styles.scanFeedbackFloating,
              {
                backgroundColor: logic.lastScanResult.success
                  ? "#10B981"
                  : "#EF4444",
              },
            ]}
          >
            <Ionicons
              name={
                logic.lastScanResult.success
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={18}
              color="#fff"
            />
            <Text style={styles.scanFeedbackFloatingText}>
              {logic.lastScanResult.articulo &&
                `${logic.lastScanResult.articulo}: `}
              {logic.lastScanResult.message}
            </Text>
          </View>
        )}

        {/* Monitor de Urgencias Banner */}
        {logic.urgencias.length > 0 && (
          <View style={styles.urgenciaBanner}>
            <View style={styles.urgenciaIconContainer}>
              <Ionicons name="flash" size={18} color="#fff" />
            </View>
            <View style={styles.urgenciaTextContainer}>
              <Text style={styles.urgenciaTitle}>¡URGENCIA DETECTADA!</Text>
              <Text style={styles.urgenciaDesc}>
                {logic.urgencias.length === 1
                  ? `El artículo ${logic.urgencias[0].clave} se requiere para el pedido ${logic.urgencias[0].folio}`
                  : `Se detectaron ${logic.urgencias.length} artículos requeridos para pedidos urgentes.`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.urgenciaClose}
              onPress={() => logic.descartarUrgencias()}
            >
              <Ionicons
                name="close-circle"
                size={24}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Barra de progreso */}
        <View
          style={[styles.progressCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.progressHeader}>
            <Text
              style={[styles.progressLabel, { color: colors.textTertiary }]}
            >
              Progreso de escaneo
            </Text>
            <Text
              style={[
                styles.progressValue,
                {
                  color: isOver
                    ? "#EF4444"
                    : isComplete
                      ? "#10B981"
                      : colors.accent,
                },
              ]}
            >
              {totalEscaneado} / {totalEsperado}
            </Text>
          </View>
          <View
            style={[styles.progressBar, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isOver
                    ? "#EF4444"
                    : isComplete
                      ? "#10B981"
                      : colors.accent,
                },
              ]}
            />
          </View>
        </View>

        {/* Carátula Info */}
        <View
          style={[styles.caratulaCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.caratulaRow}>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Almacén
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.text }]}>
                {logic.caratula.ALMACEN}
              </Text>
            </View>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Fecha
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.text }]}>
                {formatDate(logic.caratula.FECHA)}
              </Text>
            </View>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Artículos
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.accent }]}>
                {logic.detalles.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Lista de artículos */}
        {/* Si hay órdenes combinadas, mostrar con secciones */}
        {articulosSections ? (
          <SectionList
            sections={articulosSections}
            keyExtractor={(item: DetalleArticulo, index: number) =>
              `${item.ARTICULO_ID}-${item.doctoId || 0}-${index}`
            }
            renderItem={renderArticulo}
            renderSectionHeader={({
              section,
            }: {
              section: {
                title: string;
                doctoId: number;
                productCount: number;
                escaneadas: number;
                meta: number;
                isComplete: boolean;
                isPartial: boolean;
                data: DetalleArticulo[];
              };
            }) => (
              <View style={{ backgroundColor: colors.background }}>
                <View
                  style={[
                    styles.sectionHeaderContent,
                    {
                      backgroundColor: section.isComplete
                        ? "#10B98115"
                        : section.isPartial
                          ? "#F59E0B15"
                          : colors.accent + "15",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      section.isComplete ? "checkmark-circle" : "document-text"
                    }
                    size={16}
                    color={
                      section.isComplete
                        ? "#10B981"
                        : section.isPartial
                          ? "#F59E0B"
                          : colors.accent
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.sectionHeaderTitle,
                        {
                          color: section.isComplete
                            ? "#10B981"
                            : section.isPartial
                              ? "#F59E0B"
                              : colors.accent,
                        },
                      ]}
                    >
                      {section.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: section.isComplete
                          ? "#10B981"
                          : section.isPartial
                            ? "#F59E0B"
                            : colors.textTertiary,
                        marginTop: 2,
                      }}
                    >
                      {section.escaneadas}/{section.meta} unidades
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* Botón para quitar orden */}
                    <TouchableOpacity
                      style={{ padding: 4 }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          "Quitar Orden",
                          `¿Deseas quitar la orden ${section.title} de la lista de trabajo?\n\nLos artículos escaneados de esta orden se perderán.`,
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Quitar",
                              style: "destructive",
                              onPress: () => logic.quitarOrden(section.doctoId),
                            },
                          ],
                        );
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#EF4444"
                      />
                    </TouchableOpacity>

                    {section.isComplete || section.isPartial ? (
                      <TouchableOpacity
                        style={[
                          styles.sectionRecibirBtn,
                          section.isPartial && { backgroundColor: "#F59E0B" },
                          logic.recibiendoOrdenIndividual &&
                            styles.sectionRecibirBtnDisabled,
                        ]}
                        onPress={() => {
                          if (logic.recibiendoOrdenIndividual) return;
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );

                          setOrdenARecibirIndividual({
                            doctoId: section.doctoId,
                            folio: section.title,
                          });
                        }}
                        disabled={logic.recibiendoOrdenIndividual}
                      >
                        {logic.recibiendoOrdenIndividual &&
                        ordenARecibirIndividual?.doctoId === section.doctoId ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name={
                                section.isComplete
                                  ? "checkmark"
                                  : "timer-outline"
                              }
                              size={14}
                              color="#fff"
                            />
                            <Text style={styles.sectionRecibirBtnText}>
                              {section.isComplete ? "Recibir" : "Parcial"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={[
                          styles.sectionBadge,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text style={styles.sectionBadgeText}>
                          {section.productCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={true}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  No hay artículos en las órdenes
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={logic.detalles}
            keyExtractor={(item, index) => `${item.ARTICULO_ID}-${index}`}
            renderItem={renderArticulo}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  No hay artículos en esta orden
                </Text>
              </View>
            }
          />
        )}

        {/* Botón de Recibir */}
        {logic.detalles.length > 0 && (
          <TouchableOpacity
            style={[
              styles.recibirButton,
              logic.recibiendoOrden && styles.recibirButtonDisabled,
              !logic.isReciboCompleto() && {
                backgroundColor: "#F59E0B",
                shadowColor: "#F59E0B",
              },
              logic.isReciboCompleto() && {
                backgroundColor: "#10B981",
                shadowColor: "#10B981",
              },
            ]}
            onPress={() => {
              logic.setShowConfirmModal(true);
            }}
            disabled={logic.recibiendoOrden}
            activeOpacity={0.8}
          >
            {logic.recibiendoOrden ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={
                    logic.isReciboCompleto()
                      ? "checkmark-done"
                      : "alert-circle-outline"
                  }
                  size={24}
                  color="#fff"
                />
                <Text style={styles.recibirButtonText}>
                  {logic.isReciboCompleto()
                    ? logic.devoluciones.length > 0
                      ? "Recibir (con devoluciones)"
                      : "Recibir Orden"
                    : "Recibir Parcialmente"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Modales */}
        <ArticleDetailModal
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          article={selectedArticle}
          innerCodes={selectedInnerCodes}
          colors={colors}
        />

        <IncidenciaModal
          visible={showIncidenciaModal}
          onClose={() => setShowIncidenciaModal(false)}
          articulo={articuloIncidencia}
          onSelectTipo={(tipo) => {
            if (articuloIncidencia) {
              logic.agregarIncidencia(articuloIncidencia.ARTICULO_ID, tipo);
            }
            setShowIncidenciaModal(false);
            setArticuloIncidencia(null);
          }}
          colors={colors}
        />

        <DevolucionModal
          visible={showDevolucionModal}
          onClose={() => {
            setShowDevolucionModal(false);
            setArticuloDevolucion(null);
            logic.setCantidadDevolucionInput("");
          }}
          articulo={articuloDevolucion}
          cantidadInput={logic.cantidadDevolucionInput}
          onCantidadChange={logic.setCantidadDevolucionInput}
          onGuardar={handleGuardarDevolucion}
          colors={colors}
        />

        <ConfirmReciboModal
          visible={
            !!ordenARecibirIndividual && !logic.recibiendoOrdenIndividual
          }
          onClose={() => setOrdenARecibirIndividual(null)}
          onConfirm={handleRecibirIndividualConfirm}
          folio={ordenARecibirIndividual?.folio || ""}
          totalDevoluciones={infoConfirmIndividual?.totalDevoluciones || 0}
          unidadesDevueltas={infoConfirmIndividual?.unidadesDevueltas || 0}
          colors={colors}
        />

        <ConfirmReciboModal
          visible={logic.showConfirmModal}
          onClose={() => logic.setShowConfirmModal(false)}
          onConfirm={handleRecibirOrden}
          folio={logic.caratula?.FOLIO_DISPLAY || logic.caratula?.FOLIO || ""}
          totalDevoluciones={logic.devoluciones.length}
          unidadesDevueltas={logic.getTotalDevoluciones()}
          colors={colors}
        />

        <SuccessModal
          visible={logic.showSuccessModal}
          onClose={() => {
            logic.setShowSuccessModal(false);
            if (!fueRecepcionIndividual) {
              logic.resetState();
            }
          }}
          folio={logic.successData.folioRecepcion}
          secondaryFolio={logic.successData.folioDevolucion}
          secondaryFolioLabel="DEVOLUCIÓN"
          inserted={logic.successData.totalUnidadesRecibidas}
          title={
            logic.successData.folioDevolucion
              ? "¡Recepción con Devolución!"
              : "¡Recepción Exitosa!"
          }
          subtitle={
            logic.successData.folioDevolucion
              ? `Recepción completada con devolución`
              : `Todos los artículos fueron recibidos correctamente`
          }
          type="entrada"
          primaryButtonText="Continuar"
          onPrimaryAction={() => {
            logic.setShowSuccessModal(false);
            if (!fueRecepcionIndividual) {
              logic.resetState();
            }
          }}
          secondaryButtonText={
            logic.successData.folioDevolucion ? "Ver detalles" : undefined
          }
          onSecondaryAction={
            logic.successData.folioDevolucion
              ? () => {
                  Alert.alert(
                    `Devolución ${logic.successData.folioDevolucion}`,
                    `Artículos devueltos: ${logic.successData.totalDevoluciones}\nUnidades devueltas: ${logic.successData.unidadesDevueltas}\n\nRecepción: ${logic.successData.folioRecepcion}`,
                    [{ text: "OK" }],
                  );
                }
              : undefined
          }
        />

        <CameraScannerModal
          visible={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onBarcodeScanned={handleCameraScan}
          lastScanResult={logic.lastScanResult}
          topInset={insets.top}
        />

        <CajasModal
          visible={showCajasModal}
          onClose={() => {
            setShowCajasModal(false);
            setModoSeleccionCaja(false);
            setCajaSeleccionada(null);
          }}
          colors={colors}
          apiBase={`${API_URL}/api`}
          selectionMode={modoSeleccionCaja}
          selectedCaja={cajaSeleccionada}
          onSelectCaja={(codigo: string) => setCajaSeleccionada(codigo)}
          onConfirmSelection={(codigo: string) => {
            handleAsignarCaja(codigo);
          }}
          loading={asignandoCaja}
          onVerCaja={(caja: CajaOcupada) => {
            setDetalleCajaInfo({
              folio: caja.FOLIO,
              codigoCaja: caja.CODIGO_CAJA,
              nombreCaja: caja.NOMBRE_CAJA,
            });
            setShowDetalleCajaModal(true);
          }}
          onValidateScan={async (codigo: string) => {
            // Validar que la caja esté disponible antes de asignar
            try {
              const databaseId = getCurrentDatabaseId();
              const response = await fetch(
                `${API_URL}/api/validar-caja-picking.php`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ databaseId, codigo }),
                },
              );
              const data = await response.json();

              if (data.success) {
                // Caja válida, esperar a que la asignación complete
                await handleAsignarCaja(codigo);
                return true;
              } else {
                return false;
              }
            } catch (error) {
              console.error("Error validando caja:", error);
              return false;
            }
          }}
        />

        {detalleCajaInfo && (
          <DetalleCajaModal
            visible={showDetalleCajaModal}
            onClose={() => {
              setShowDetalleCajaModal(false);
              setDetalleCajaInfo(null);
            }}
            colors={colors}
            apiBase={`${API_URL}/api`}
            folio={detalleCajaInfo.folio}
            codigoCaja={detalleCajaInfo.codigoCaja}
            nombreCaja={detalleCajaInfo.nombreCaja}
            onLiberarCaja={async (codigoCaja: string) => {
              // Debug: Liberar caja directamente
              try {
                const databaseId = getCurrentDatabaseId();
                const response = await fetch(
                  `${API_URL}/api/liberar-caja.php`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ databaseId, codigoCaja }),
                  },
                );
                const data = await response.json();
                console.log("[DEBUG] Liberar caja:", data);
                if (data.success) {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  Alert.alert(
                    "✅ Caja Liberada",
                    `La ${codigoCaja} ha sido liberada`,
                  );
                  // Recargar cajas ocupadas
                  setShowCajasModal(false);
                } else {
                  Alert.alert("Error", data.error || "No se pudo liberar");
                }
              } catch (err: any) {
                Alert.alert("Error", err.message);
              }
            }}
          />
        )}

        <DestinoAlertModal
          visible={logic.showDestinoModal}
          onClose={() => logic.setShowDestinoModal(false)}
          onSelectCaja={() => {
            logic.setShowDestinoModal(false);
            setModoSeleccionCaja(true);
            setShowCajasModal(true);
          }}
          destinoInfo={logic.destinoInfo}
          colors={colors}
        />

        {/* Modal Pedido Completado - desde hook (auto-asignación) */}
        {logic.pedidoCompletadoInfo && (
          <PedidoCompletadoModal
            visible={logic.showPedidoCompletado}
            onClose={() => logic.setShowPedidoCompletado(false)}
            colors={colors}
            folio={logic.pedidoCompletadoInfo.folio}
            caja={logic.pedidoCompletadoInfo.caja}
          />
        )}

        {/* Modal Pedido Completado - desde asignación manual */}
        {pedidoCompletadoLocal && (
          <PedidoCompletadoModal
            visible={!!pedidoCompletadoLocal}
            onClose={() => {
              setPedidoCompletadoLocal(null);
              logic.setShowPedidoCompletado(false);
            }}
            colors={colors}
            folio={pedidoCompletadoLocal.folio}
            caja={pedidoCompletadoLocal.caja}
          />
        )}

        {/* Modal Artículo Asignado - cuando se auto-asigna pero NO está completo */}
        {logic.articuloAsignadoInfo && (
          <ArticuloAsignadoModal
            visible={logic.showArticuloAsignado}
            onClose={() => logic.setShowArticuloAsignado(false)}
            colors={colors}
            clave={logic.articuloAsignadoInfo.clave}
            caja={logic.articuloAsignadoInfo.caja}
            folio={logic.articuloAsignadoInfo.folio}
          />
        )}

        {/* Modal Artículo Asignado - desde asignación manual */}
        {articuloAsignadoLocal && (
          <ArticuloAsignadoModal
            visible={!!articuloAsignadoLocal}
            onClose={() => setArticuloAsignadoLocal(null)}
            colors={colors}
            clave={articuloAsignadoLocal.clave}
            caja={articuloAsignadoLocal.caja}
            folio={articuloAsignadoLocal.folio}
          />
        )}

        {/* Modal para agregar órdenes adicionales */}
        <AgregarOrdenModal
          visible={showAgregarOrdenModal}
          onClose={() => setShowAgregarOrdenModal(false)}
          onAgregarOrden={logic.agregarOrdenAdicional}
          loadingOrdenAdicional={logic.loadingOrdenAdicional}
          combinedOrders={logic.combinedOrders}
          caratula={logic.caratula}
          detallesCount={logic.detalles.length}
          colors={colors}
        />

        {/* FAB de Cámara - COMENTADO TEMPORALMENTE
        <TouchableOpacity
          style={[styles.fabCamera, { backgroundColor: colors.accent }]}
          onPress={handleOpenCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#fff" />
        </TouchableOpacity>
        */}
      </View>
    );
  }

  // ===================== VISTA DE BÚSQUEDA =====================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Recibo</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar folio de orden..."
            placeholderTextColor={colors.textTertiary}
            value={logic.searchQuery}
            onChangeText={logic.setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {logic.searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Ionicons
                name="arrow-forward-circle"
                size={28}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section Header */}
      {logic.hasSearched && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            RESULTADOS
          </Text>
          <Text style={[styles.sectionCount, { color: colors.accent }]}>
            {logic.ordenes.length} órdenes
          </Text>
        </View>
      )}

      {/* Loading */}
      {logic.loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Buscando órdenes...
          </Text>
        </View>
      )}

      {/* Orders List */}
      {!logic.loading && (
        <FlatList
          data={logic.ordenes}
          keyExtractor={(item) => item.DOCTO_CM_ID.toString()}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={logic.refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  logic.hasSearched ? "document-text-outline" : "search-outline"
                }
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {logic.hasSearched
                  ? "No se encontraron órdenes de compra"
                  : "Ingresa un folio para buscar órdenes"}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de borrador guardado */}
      {logic.savedDraft && (
        <DraftModal
          visible={logic.showDraftModal}
          folio={logic.savedDraft.caratula?.FOLIO || ""}
          timestamp={logic.savedDraft.timestamp}
          articulosTotal={logic.savedDraft.detalles?.length || 0}
          articulosEscaneados={
            logic.savedDraft.detalles?.filter((d) => d.cantidadEscaneada > 0)
              .length || 0
          }
          colors={colors}
          onRestore={() => logic.restoreDraft(logic.savedDraft!)}
          onDiscard={logic.discardDraft}
        />
      )}
    </View>
  );
}
