import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { SkeletonPickingCard } from "@/components/SkeletonPickingCard";
import { VentanillaBanner } from "@/components/VentanillaBanner";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useVentanillaPolling } from "@/hooks/useVentanillaPolling";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArticleCardPicking } from "../surte-pedido/_components/ArticleCardPicking";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ==================== TIPOS ====================
interface Articulo {
  ARTICULO_ID: string;
  CLAVE_ARTICULO: string;
  CODBAR: string;
  NOMBRE: string;
  UNIDADES: number;
  LOCALIZACION: string;
  UNIDAD_VENTA: string;
  SURTIDAS: number;
  IMAGEN_BASE64?: string;
  CONFIRMADO?: boolean;
}

interface CajaSimple {
  CODIGO_CAJA: string;
  NOMBRE_CAJA: string;
}

export default function SurteTraspasoScreen() {
  const { folio, traspasoInId, almacenOrigen, almacenDestino } =
    useLocalSearchParams();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    success?: boolean;
  }>({
    visible: false,
    message: "",
  });

  // Caja / Carrito
  const [assignedBoxes, setAssignedBoxes] = useState<string[]>([]);
  const [pickingStarted, setPickingStarted] = useState(false);
  const [validatingBox, setValidatingBox] = useState(false);
  const [availableBoxes, setAvailableBoxes] = useState<CajaSimple[]>([]);
  const [boxScannerText, setBoxScannerText] = useState("");
  const boxInputRef = useRef<TextInput>(null);

  // Validación de Ubicaciones
  const [unlockedLocations, setUnlockedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [locationFeedback, setLocationFeedback] = useState<{
    visible: boolean;
    loc: string;
  }>({ visible: false, loc: "" });

  // Escaneo Artículos
  const [tempBarcode, setTempBarcode] = useState("");
  const scannerRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);

  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastInteractionIndex = useRef<number>(-1);

  // Auto-scroll effect
  useEffect(() => {
    if (lastInteractionIndex.current !== -1) {
      const idx = lastInteractionIndex.current;
      const art = articulos[idx];
      lastInteractionIndex.current = -1; // reset

      // Si el item que acabamos de tocar ya está completo/confirmado, mover al siguiente
      if (art && (art.SURTIDAS >= art.UNIDADES || art.CONFIRMADO)) {
        // Buscar el siguiente incompleto
        const nextIdx = articulos.findIndex(
          (a, i) => i > idx && a.SURTIDAS < a.UNIDADES && !a.CONFIRMADO
        );

        if (nextIdx !== -1) {
             // Pequeño delay para que el usuario vea el check verde
             setTimeout(() => {
                listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
                // setCurrentIndex se actualiza vía onViewableItemsChanged
             }, 500);
        }
      }
    }
  }, [articulos]);

  // Camera Scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraScanMessage, setCameraScanMessage] = useState<string | null>(
    null,
  );
  const [cameraScanSuccess, setCameraScanSuccess] = useState(true);
  const cameraScanLock = useRef(false);

  // Modal de salida
  const [exitModalVisible, setExitModalVisible] = useState(false);

  // Ventanilla Notifications (Uber-style)
  const [ventanillaVisible, setVentanillaVisible] = useState(false);
  const [ventanillaLoading, setVentanillaLoading] = useState(false);
  const [ventanillaDetalles, setVentanillaDetalles] = useState<any[]>([]);
  const [ventanillaDetallesModal, setVentanillaDetallesModal] = useState(false);
  const { nuevoTraspaso, clearNuevoTraspaso, marcarComoTomado } =
    useVentanillaPolling({
      enabled: !loading, // Solo pollean mientras están pickeando
      onNewVentanilla: (ventanilla) => {
        console.log(
          "[VENTANILLA] Nueva ventanilla detectada en traspasos:",
          ventanilla.FOLIO,
        );
        setVentanillaVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    });

  // Al tocar "Tomar" en el banner, primero tomar (P→T), luego obtener detalles
  const handleAcceptVentanilla = async () => {
    if (!nuevoTraspaso) return;

    setVentanillaLoading(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const ahora = new Date();
      const fechaIni = ahora.toISOString().split("T")[0];
      const horaIni = ahora.toTimeString().split(" ")[0].slice(0, 5);

      // 1. Primero tomar la ventanilla (cambiar P→T)
      const tomarResponse = await fetch(`${API_URL}/api/tomar-ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId: nuevoTraspaso.TRASPASO_IN_ID,
          pikerId: user?.USUARIO_ID || 0,
          pickerName: user?.NOMBRE || "Picker",
          fechaIni,
          horaIni,
        }),
      });

      const tomarData = await tomarResponse.json();

      if (!tomarData.success) {
        setAlert({
          visible: true,
          message: tomarData.message || "No se pudo tomar la ventanilla.",
        });
        setVentanillaLoading(false);
        clearNuevoTraspaso();
        return;
      }

      // 2. Obtener detalles del traspaso
      const response = await fetch(`${API_URL}/api/detalle-traspaso.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId: nuevoTraspaso.TRASPASO_IN_ID,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.detalles || data.detalles.length === 0) {
        setAlert({
          visible: true,
          message:
            data.message || "No se pudo obtener el detalle del traspaso.",
        });
        setVentanillaLoading(false);
        return;
      }

      // Guardar detalles y mostrar modal
      setVentanillaDetalles(data.detalles);
      setVentanillaVisible(false);
      setVentanillaDetallesModal(true);
    } catch (e) {
      console.error("[VENTANILLA] Error obteniendo detalles:", e);
      setAlert({
        visible: true,
        message: "Error al obtener detalles de la ventanilla.",
      });
    } finally {
      setVentanillaLoading(false);
    }
  };

  // Confirmar desde el modal de detalles → navegar a surtir
  const handleConfirmVentanilla = () => {
    if (!nuevoTraspaso) return;

    // Marcar como tomado
    marcarComoTomado(nuevoTraspaso.EVENTO_ID);
    setVentanillaDetallesModal(false);

    // Navegar a la pantalla de surtido de ventanilla
    router.push({
      pathname: "/(main)/procesos/picking/surte-ventanilla",
      params: {
        folio: nuevoTraspaso.FOLIO,
        traspasoId: String(nuevoTraspaso.TRASPASO_IN_ID),
        almacen: nuevoTraspaso.ALMACEN,
        articulos: JSON.stringify(ventanillaDetalles),
      },
    });
  };

  // Cancelar desde el modal de detalles
  const handleCancelVentanillaDetalles = () => {
    setVentanillaDetallesModal(false);
    setVentanillaDetalles([]);
    // Volver a mostrar el banner
    setVentanillaVisible(true);
  };

  const handleDismissVentanilla = () => {
    if (nuevoTraspaso) {
      marcarComoTomado(nuevoTraspaso.EVENTO_ID);
    }
    setVentanillaVisible(false);
    clearNuevoTraspaso();
  };

  const fetchDetalles = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(
        `${API_URL}/api/detalle-traspaso-picking.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId, traspasoInId }),
        },
      );
      const data = await response.json();

      if (data.success) {
        const items = data.detalles.map((item: any) => ({
          ...item,
          UNIDADES: Number(item.UNIDADES),
          SURTIDAS: 0,
        }));
        setArticulos(items);
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al cargar los artículos.",
        });
      }
    } catch (e) {
      setAlert({ visible: true, message: "Error de red al obtener detalles." });
    } finally {
      setLoading(false);
    }
  }, [traspasoInId]);

  const fetchAvailableBoxes = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/cajas-disponibles.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, limit: 10 }),
      });
      const data = await response.json();
      if (data.success) {
        const flatBoxes: CajaSimple[] = [];
        data.grupos.forEach((g: any) => {
          g.cajas.forEach((c: any) => flatBoxes.push(c));
        });
        setAvailableBoxes(flatBoxes.slice(0, 8));
      }
    } catch (_e) {
      console.error("Error fetching boxes:", _e);
    }
  }, []);

  const handleConfirmBoxSelection = async (codigo: string) => {
    setValidatingBox(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/validar-caja-picking.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, codigo }),
      });
      const data = await response.json();

      if (data && data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAssignedBoxes((prev) => [...prev, codigo]);
        setPickingStarted(true);

        // Crear apartado (CJ_APARTADO_KRKN) e implantar folio
        try {
          await fetch(`${API_URL}/api/crear-apartado.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              databaseId,
              codigoCaja: codigo,
              folio: folio as string,
              pickerId: user?.USUARIO_ID || 0,
              nombrePicker: user?.NOMBRE || "PICKER",
            }),
          })
            .then((r) => r.json())
            .then((res) => {
              console.log("[PICKING] Apartado creado:", res);
            });
        } catch (err) {
          console.error("[PICKING] Error al crear apartado:", err);
        }
      } else {
        setAlert({
          visible: true,
          message:
            (data && data.message) || "La caja no está disponible o no existe.",
        });
      }
    } catch (e: any) {
      console.error("Error validating box:", e);
      setAlert({
        visible: true,
        message: "Error al validar caja: " + (e.message || "Error de conexión"),
      });
    } finally {
      setValidatingBox(false);
      setBoxScannerText("");
    }
  };

  useEffect(() => {
    fetchDetalles();
    fetchAvailableBoxes();
  }, [fetchDetalles, fetchAvailableBoxes]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!alert.visible && !exitModalVisible && !showCameraScanner) {
        if (!pickingStarted) {
          boxInputRef.current?.focus();
        } else {
          scannerRef.current?.focus();
        }
      }
    }, 300);
    return () => clearInterval(interval);
  }, [alert.visible, exitModalVisible, pickingStarted, showCameraScanner]);

  const handleBarcodeScanned = (code: string) => {
    const cleanedCode = code.trim();
    if (!cleanedCode) return;

    // 1. PRIORIDAD: ¿Es la ubicación del artículo que estoy viendo?
    const currentArt = articulos[currentIndex];
    if (currentArt && currentArt.LOCALIZACION === cleanedCode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
      setLocationFeedback({ visible: true, loc: cleanedCode });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      setTempBarcode("");
      return;
    }

    // 2. PRIORIDAD: ¿Es el código de barras del artículo que estoy viendo?
    if (
      currentArt &&
      (currentArt.CLAVE_ARTICULO === cleanedCode ||
        currentArt.CODBAR === cleanedCode)
    ) {
      const locUpper = (currentArt.LOCALIZACION || "").toUpperCase().trim();
      const isLocked = !!(
        currentArt.LOCALIZACION &&
        locUpper !== "NA" &&
        locUpper !== "N/A" &&
        !unlockedLocations.has(currentArt.LOCALIZACION)
      );
      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Primero debes desbloquear la ubicación ${currentArt.LOCALIZACION} escaneando el código del pasillo.`,
        });
      } else if (currentArt.SURTIDAS < currentArt.UNIDADES) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(currentIndex);
      }
      setTempBarcode("");
      return;
    }

    // 3. FALLBACK: Buscar en toda la lista y navegar si se encuentra
    const matchLocIdx = articulos.findIndex(
      (a) => a.LOCALIZACION === cleanedCode,
    );
    if (matchLocIdx !== -1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
      setLocationFeedback({ visible: true, loc: cleanedCode });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
      setTempBarcode("");
      return;
    }

    const foundIndex = articulos.findIndex(
      (a) =>
        (a.CLAVE_ARTICULO === cleanedCode || a.CODBAR === cleanedCode) &&
        a.SURTIDAS < a.UNIDADES,
    );

    if (foundIndex !== -1) {
      const art = articulos[foundIndex];
      const artLocUpper = (art.LOCALIZACION || "").toUpperCase().trim();
      const isLocked = !!(
        art.LOCALIZACION &&
        artLocUpper !== "NA" &&
        artLocUpper !== "N/A" &&
        !unlockedLocations.has(art.LOCALIZACION)
      );

      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Ubicación bloqueada. Desliza hacia ${art.LOCALIZACION} y escanea el pasillo.`,
        });
        listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(foundIndex);
        if (foundIndex !== currentIndex) {
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
        }
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTempBarcode("");
  };

  // Handler para escaneo con cámara
  const handleCameraScan = useCallback(
    (data: string) => {
      if (cameraScanLock.current) return;
      cameraScanLock.current = true;

      const cleanedCode = data.trim().toUpperCase();

      const currentArt = articulos[currentIndex];

      // 1. ¿Es la ubicación del artículo actual?
      if (currentArt && currentArt.LOCALIZACION === cleanedCode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
        setCameraScanMessage(`Ubicación ${cleanedCode} desbloqueada`);
        setCameraScanSuccess(true);
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1500);
        return;
      }

      // 2. ¿Es el código del artículo actual?
      if (
        currentArt &&
        (currentArt.CLAVE_ARTICULO === cleanedCode ||
          currentArt.CODBAR === cleanedCode)
      ) {
        const locUpper = (currentArt.LOCALIZACION || "").toUpperCase().trim();
        const isLocked = !!(
          currentArt.LOCALIZACION &&
          locUpper !== "NA" &&
          locUpper !== "N/A" &&
          !unlockedLocations.has(currentArt.LOCALIZACION)
        );

        if (isLocked) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(
            `Primero escanea ubicación ${currentArt.LOCALIZACION}`,
          );
          setCameraScanSuccess(false);
        } else if (currentArt.SURTIDAS < currentArt.UNIDADES) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(currentIndex);
          setCameraScanMessage(`+1 ${currentArt.CLAVE_ARTICULO}`);
          setCameraScanSuccess(true);
        }
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1200);
        return;
      }

      // 3. Buscar en toda la lista
      const matchLocIdx = articulos.findIndex(
        (a) => a.LOCALIZACION === cleanedCode,
      );
      if (matchLocIdx !== -1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
        setCameraScanMessage(`Ubicación ${cleanedCode} desbloqueada`);
        setCameraScanSuccess(true);
        listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1500);
        return;
      }

      const foundIndex = articulos.findIndex(
        (a) =>
          (a.CLAVE_ARTICULO === cleanedCode || a.CODBAR === cleanedCode) &&
          a.SURTIDAS < a.UNIDADES,
      );

      if (foundIndex !== -1) {
        const art = articulos[foundIndex];
        const artLocUpper = (art.LOCALIZACION || "").toUpperCase().trim();
        const isLocked = !!(
          art.LOCALIZACION &&
          artLocUpper !== "NA" &&
          artLocUpper !== "N/A" &&
          !unlockedLocations.has(art.LOCALIZACION)
        );

        if (isLocked) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(`Ubicación bloqueada: ${art.LOCALIZACION}`);
          setCameraScanSuccess(false);
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(foundIndex);
          setCameraScanMessage(`+1 ${art.CLAVE_ARTICULO}`);
          setCameraScanSuccess(true);
          if (foundIndex !== currentIndex) {
            listRef.current?.scrollToIndex({
              index: foundIndex,
              animated: true,
            });
          }
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCameraScanMessage(`No encontrado: ${cleanedCode}`);
        setCameraScanSuccess(false);
      }

      setTimeout(() => {
        cameraScanLock.current = false;
        setCameraScanMessage(null);
      }, 1200);
    },
    [articulos, currentIndex, unlockedLocations],
  );

  // Abrir cámara
  const openCameraScanner = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setAlert({
          visible: true,
          message: "Se requiere acceso a la cámara para escanear.",
        });
        return;
      }
    }
    cameraScanLock.current = false;
    setCameraScanMessage(null);
    setShowCameraScanner(true);
  };

  const actualizarSurtidoDelta = (index: number, delta: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      const art = newArticulos[index];
      const nuevaCant = art.SURTIDAS + delta;

      if (nuevaCant >= 0 && nuevaCant <= art.UNIDADES) {
        art.SURTIDAS = nuevaCant;
        // Auto-confirmar si completó
        art.CONFIRMADO = art.SURTIDAS === art.UNIDADES;
        if (art.CONFIRMADO) {
            lastInteractionIndex.current = index;
        }
      }
      return newArticulos;
    });
  };

  const incrementarSurtido = (index: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      const art = {...newArticulos[index]}; // shallow copy
      newArticulos[index] = art;

      if (art.SURTIDAS < art.UNIDADES) {
        art.SURTIDAS += 1;
      }
      // Auto-confirmar si completó
      art.CONFIRMADO = art.SURTIDAS === art.UNIDADES;
      if (art.CONFIRMADO) {
         lastInteractionIndex.current = index;
      }
      return newArticulos;
    });
  };

  const setSurtidoManual = (index: number, qty: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      const art = {...newArticulos[index]};
      newArticulos[index] = art;

      art.SURTIDAS = Math.min(qty, art.UNIDADES);
      // Auto-confirmar si completó
      art.CONFIRMADO = art.SURTIDAS === art.UNIDADES;
      if (art.CONFIRMADO) {
          lastInteractionIndex.current = index;
      }
      return newArticulos;
    });
  };

  const handleConfirm = (index: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      const art = {...newArticulos[index]};
      newArticulos[index] = art;

      art.CONFIRMADO = !art.CONFIRMADO;
      if (art.CONFIRMADO) {
          lastInteractionIndex.current = index;
      }
      return newArticulos;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const progress =
    articulos.length > 0
      ? articulos.reduce((acc, a) => acc + a.SURTIDAS, 0) /
        articulos.reduce((acc, a) => acc + a.UNIDADES, 0)
      : 0;

  const isOrderFinished =
    articulos.length > 0 &&
    articulos.every((a) => a.SURTIDAS === a.UNIDADES || a.CONFIRMADO);

  const handleFinish = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const databaseId = getCurrentDatabaseId();
      const ahora = new Date();
      const fechaFin = ahora.toISOString().split("T")[0];
      const horaFin = ahora.toTimeString().split(" ")[0].slice(0, 5);

      const response = await fetch(`${API_URL}/api/traspaso-enviado.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoId: traspasoInId,
          folio: folio as string,
          nuevoEstatus: "S",
          fechaFin,
          horaFin,
          productos: articulos.map((item) => ({
            ARTICULO_ID: item.ARTICULO_ID,
            CLAVE_ARTICULO: item.CLAVE_ARTICULO,
            UNIDADES: item.UNIDADES,
            SURTIDAS: item.SURTIDAS,
          })),
        }),
      });

      const data = await response.json();
      console.log("[TRASPASO] Respuesta traspaso-enviado:", data);

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAlert({
          visible: true,
          message: "🎉 ¡Traspaso Completado!\n\nCaja lista para packing.",
          success: true,
        });
        // La navegación ahora la maneja el botón del modal de éxito
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al finalizar traspaso.",
        });
      }
    } catch (e) {
      setAlert({
        visible: true,
        message: "Error de red al finalizar traspaso.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    setLoading(true);
    try {
      const databaseId = getCurrentDatabaseId();
      await fetch(`${API_URL}/api/update-traspaso-picking.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId,
          estatus: "P",
        }),
      });
    } catch (e) {
      console.error("Error al liberar traspaso:", e);
    } finally {
      setLoading(false);
      setExitModalVisible(false);
      router.back();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // ─── Caja selection screen (before picking) ─────────────────────────
  if (!pickingStarted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />
        <View style={[styles.headerSimple, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            onPress={() => setExitModalVisible(true)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, flex: 1 }]}>
            Espacio de Picking
          </Text>
          <TouchableOpacity
            onPress={() => setPickingStarted(true)}
            style={[styles.skipBtn, { backgroundColor: colors.border }]}
          >
            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>
              Omitir
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.boxSelectionContent}>
          <View style={styles.welcomeInfo}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.accent + "10" },
              ]}
            >
              <Ionicons
                name="archive-outline"
                size={60}
                color={colors.accent}
              />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Asignar Almacenamiento
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              Escanea el código de la caja para comenzar a surtir el traspaso{" "}
              <Text style={{ fontWeight: "800" }}>{folio}</Text>.
            </Text>
          </View>

          <View
            style={[
              styles.scanArea,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="barcode-outline" size={30} color={colors.accent} />
            <Text style={[styles.scanLabel, { color: colors.textSecondary }]}>
              {validatingBox ? "Validando..." : "Esperando escaneo de caja..."}
            </Text>
            {validatingBox && (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={{ marginTop: 10 }}
              />
            )}
            <TextInput
              ref={boxInputRef}
              style={styles.hiddenInput}
              autoFocus
              showSoftInputOnFocus={false}
              blurOnSubmit={false}
              value={boxScannerText}
              onChangeText={setBoxScannerText}
              onSubmitEditing={() => {
                const code = boxScannerText.trim();
                setBoxScannerText("");
                if (code) handleConfirmBoxSelection(code);
              }}
              onBlur={() => {
                if (!alert.visible && !exitModalVisible) {
                  setTimeout(() => boxInputRef.current?.focus(), 100);
                }
              }}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DISPONIBLES RECIENTEMENTE
          </Text>

          <View style={styles.boxGrid}>
            {availableBoxes.map((box) => (
              <TouchableOpacity
                key={box.CODIGO_CAJA}
                style={[styles.boxCard, { backgroundColor: colors.surface }]}
                onPress={() => handleConfirmBoxSelection(box.CODIGO_CAJA)}
              >
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.boxCardCode, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {box.CODIGO_CAJA}
                </Text>
                <Text
                  style={[styles.boxCardName, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {box.NOMBRE_CAJA}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Exit Modal (also needed here) */}
        <Modal visible={exitModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlayAlt}>
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint="dark"
            />
            <View
              style={[
                styles.modalContentAlt,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={{ padding: 20, alignItems: "center" }}>
                <Ionicons name="warning-outline" size={48} color="#F59E0B" />
                <Text
                  style={[
                    styles.modalTitleAlt,
                    { color: colors.text, marginTop: 10 },
                  ]}
                >
                  ¿Seguro que quieres salir?
                </Text>
                <Text
                  style={[
                    styles.modalMessageAlt,
                    { color: colors.textSecondary },
                  ]}
                >
                  Se perderá el progreso de este traspaso.
                </Text>
              </View>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.modalBtnHalf,
                    { backgroundColor: colors.border },
                  ]}
                  onPress={() => setExitModalVisible(false)}
                >
                  <Text
                    style={[styles.modalBtnTextAlt, { color: colors.text }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnHalf, { backgroundColor: "#EF4444" }]}
                  onPress={handleExit}
                >
                  <Text style={[styles.modalBtnTextAlt, { color: "#fff" }]}>
                    Salir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Alert modal */}
        <Modal visible={alert.visible} transparent animationType="fade">
          <View style={styles.modalOverlayAlt}>
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint="dark"
            />
            <View
              style={[
                styles.modalContentAlt,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={[styles.modalTitleAlt, { color: colors.text }]}>
                  Atención
                </Text>
                <Text
                  style={[
                    styles.modalMessageAlt,
                    { color: colors.textSecondary },
                  ]}
                >
                  {alert.message}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalBtnAlt, { borderTopColor: colors.border }]}
                onPress={() => setAlert({ visible: false, message: "" })}
              >
                <Text
                  style={[styles.modalBtnTextAlt, { color: colors.accent }]}
                >
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />

      {/* VENTANILLA BANNER */}
      <VentanillaBanner
        visible={ventanillaVisible}
        ventanilla={nuevoTraspaso}
        loading={ventanillaLoading}
        onAccept={handleAcceptVentanilla}
        onDismiss={handleDismissVentanilla}
        colors={colors}
        duration={30}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => setExitModalVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
              Traspaso
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {folio}
            </Text>
          </View>
          <View style={styles.headerBtn}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isOrderFinished
                    ? "#10B98120"
                    : colors.accent + "15",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isOrderFinished ? "#10B981" : colors.accent },
                ]}
              >
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Boxes row */}
        <View style={styles.boxesRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.boxesScroll}
          >
            {assignedBoxes.map((box, idx) => (
              <View
                key={`${box}-${idx}`}
                style={[
                  styles.boxBadgeSmall,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="cube-outline" size={12} color={colors.accent} />
                <Text style={[styles.boxBadgeText, { color: colors.text }]}>
                  {box}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setAssignedBoxes((prev) => prev.filter((_, i) => i !== idx))
                  }
                  style={styles.removeBoxBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[
                styles.addBoxBtn,
                {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent + "10",
                },
              ]}
              onPress={() => setPickingStarted(false)}
            >
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={[styles.addBoxText, { color: colors.accent }]}>
                Caja
              </Text>
            </TouchableOpacity>
            {/* Botón de cámara */}
            <TouchableOpacity
              style={[
                styles.addBoxBtn,
                {
                  borderColor: "#3B82F6",
                  backgroundColor: "#3B82F610",
                },
              ]}
              onPress={openCameraScanner}
            >
              <Ionicons name="camera" size={16} color="#3B82F6" />
              <Text style={[styles.addBoxText, { color: "#3B82F6" }]}>
                Cámara
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Info del traspaso */}
        <View style={styles.traspasoRow}>
          <View
            style={[
              styles.traspasoInfo,
              { backgroundColor: colors.surface, flex: 1 },
            ]}
          >
            <View style={styles.traspasoInfoItem}>
              <Ionicons
                name="arrow-back-circle"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                style={[
                  styles.traspasoInfoText,
                  { color: colors.textSecondary },
                ]}
              >
                {almacenOrigen || "Origen"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            <View style={styles.traspasoInfoItem}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={[styles.traspasoInfoText, { color: colors.text }]}>
                {almacenDestino || "Destino"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressTrackGlobal}>
          <Animated.View
            style={[
              styles.progressFillGlobal,
              { width: `${progress * 100}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
      </View>

      <View style={styles.deckWrapper}>
        {loading ? (
          <View style={styles.cardContainer}>
            <SkeletonPickingCard />
          </View>
        ) : (
          <Animated.FlatList
            ref={listRef}
            data={articulos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={(item, idx) => `${item.ARTICULO_ID}-${idx}`}
            renderItem={({ item, index }) => {
              const locUpper = (item.LOCALIZACION || "").toUpperCase().trim();
              const isLocked = !!(
                item.LOCALIZACION &&
                locUpper !== "NA" &&
                locUpper !== "N/A" &&
                !unlockedLocations.has(item.LOCALIZACION)
              );

              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.92, 1, 0.92],
                extrapolate: "clamp",
              });

              const rotate = scrollX.interpolate({
                inputRange,
                outputRange: ["-2deg", "0deg", "2deg"],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  style={{
                    width: SCREEN_WIDTH,
                    alignItems: "center",
                    transform: [{ scale }, { rotate }],
                  }}
                >
                  <ArticleCardPicking
                    item={item}
                    colors={colors}
                    isLocked={isLocked}
                    onConfirm={() => handleConfirm(index)}
                    onUpdateQuantity={(delta) =>
                      actualizarSurtidoDelta(index, delta)
                    }
                    onSetQuantity={(qty) => setSurtidoManual(index, qty)}
                  />
                </Animated.View>
              );
            }}
          />
        )}

          {locationFeedback.visible && (
            <View style={[styles.locToast, { backgroundColor: colors.accent }]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.locToastText}>
                Ubicación {locationFeedback.loc} confirmada
              </Text>
            </View>
          )}

          <TextInput
            ref={scannerRef}
            style={styles.hiddenInput}
            autoFocus
            showSoftInputOnFocus={false}
            blurOnSubmit={false}
            value={tempBarcode}
            onChangeText={setTempBarcode}
            onSubmitEditing={() => {
              const code = tempBarcode.trim();
              setTempBarcode("");
              if (code) handleBarcodeScanned(code);
            }}
            onBlur={() => {
              if (!alert.visible && !exitModalVisible && !showCameraScanner) {
                setTimeout(() => scannerRef.current?.focus(), 100);
              }
            }}
          />

          <View
            style={[styles.footerAction, { paddingBottom: insets.bottom + 15 }]}
          >
            {isOrderFinished ? (
              <TouchableOpacity
                onPress={handleFinish}
                style={[styles.finishBtn, { backgroundColor: "#10B981" }]}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>FINALIZAR TRASPASO</Text>
                <Ionicons name="send-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <View
                style={[styles.deckInfo, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[styles.deckCount, { color: colors.textSecondary }]}
                >
                  Artículo {currentIndex + 1} de {articulos.length}
                </Text>
                <View style={styles.deckDots}>
                  {articulos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            i === currentIndex ? colors.accent : colors.border,
                        },
                        i === currentIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

      {/* Modal Alert */}
      <Modal
        visible={alert.visible}
        transparent
        animationType={alert.success ? "slide" : "fade"}
      >
        {alert.success ? (
          <View style={styles.successOverlay}>
            <BlurView
              intensity={80}
              style={StyleSheet.absoluteFill}
              tint="systemMaterialDark"
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.4)" },
              ]}
            />
            <View style={styles.successContent}>
              <Animated.View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </Animated.View>
              <Text style={styles.successTitle}>¡TRASPASO COMPLETADO!</Text>
              <Text style={styles.successMessage}>{alert.message}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                onPress={() => {
                  setAlert({ visible: false, message: "" });
                  router.replace("/(main)/procesos/picking");
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.successBtnText}>CONTINUAR</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.modalOverlayAlt}>
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint="dark"
            />
            <View
              style={[
                styles.modalContentAlt,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={[styles.modalTitleAlt, { color: colors.text }]}>
                  Atención
                </Text>
                <Text
                  style={[
                    styles.modalMessageAlt,
                    { color: colors.textSecondary },
                  ]}
                >
                  {alert.message}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalBtnAlt, { borderTopColor: colors.border }]}
                onPress={() => setAlert({ visible: false, message: "" })}
              >
                <Text
                  style={[styles.modalBtnTextAlt, { color: colors.accent }]}
                >
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Modal Salir */}
      <Modal visible={exitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayAlt}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[
              styles.modalContentAlt,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={{ padding: 20, alignItems: "center" }}>
              <Ionicons name="warning-outline" size={48} color="#F59E0B" />
              <Text
                style={[
                  styles.modalTitleAlt,
                  { color: colors.text, marginTop: 10 },
                ]}
              >
                ¿Seguro que quieres salir?
              </Text>
              <Text
                style={[
                  styles.modalMessageAlt,
                  { color: colors.textSecondary },
                ]}
              >
                Se perderá el progreso de este traspaso.
              </Text>
            </View>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.modalBtnHalf,
                  { backgroundColor: colors.border },
                ]}
                onPress={() => setExitModalVisible(false)}
              >
                <Text style={[styles.modalBtnTextAlt, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnHalf, { backgroundColor: "#EF4444" }]}
                onPress={handleExit}
              >
                <Text style={[styles.modalBtnTextAlt, { color: "#fff" }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalles Ventanilla */}
      <Modal
        visible={ventanillaDetallesModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlayAlt}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[
              styles.modalContentAlt,
              { backgroundColor: colors.surface, maxHeight: "80%" },
            ]}
          >
            <View style={{ padding: 20, alignItems: "center" }}>
              <Ionicons name="flash" size={48} color="#EC4899" />
              <Text
                style={[
                  styles.modalTitleAlt,
                  { color: colors.text, marginTop: 10 },
                ]}
              >
                📦 Ventanilla
              </Text>
              <Text
                style={[
                  styles.modalMessageAlt,
                  { color: colors.textSecondary },
                ]}
              >
                {nuevoTraspaso?.FOLIO} - {ventanillaDetalles.length} artículo
                {ventanillaDetalles.length !== 1 ? "s" : ""}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                📍 {nuevoTraspaso?.ALMACEN}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 300, paddingHorizontal: 20 }}>
              {ventanillaDetalles.map((item: any, idx: number) => (
                <View
                  key={`${item.ARTICULO_ID}-${idx}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: colors.text, fontWeight: "600" }}
                      numberOfLines={2}
                    >
                      {item.NOMBRE}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{ color: colors.textTertiary, fontSize: 12 }}
                      >
                        {item.CODIGO}
                      </Text>
                      <Text
                        style={{
                          color: colors.accent,
                          fontSize: 12,
                          marginLeft: 10,
                        }}
                      >
                        📍 {item.LOCALIZACION}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: colors.accent + "15",
                      borderRadius: 8,
                      padding: 8,
                      minWidth: 50,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accent,
                        fontWeight: "700",
                        fontSize: 16,
                      }}
                    >
                      {item.UNIDADES}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
                      {item.UNIDAD_VENTA}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalButtonsRow, { marginTop: 15 }]}>
              <TouchableOpacity
                style={[
                  styles.modalBtnHalf,
                  { backgroundColor: colors.border },
                ]}
                onPress={handleCancelVentanillaDetalles}
              >
                <Text style={[styles.modalBtnTextAlt, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnHalf, { backgroundColor: "#EC4899" }]}
                onPress={handleConfirmVentanilla}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text
                  style={[
                    styles.modalBtnTextAlt,
                    { color: "#fff", marginLeft: 5 },
                  ]}
                >
                  Surtir Ahora
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📷 Camera Scanner Modal */}
      <CameraScannerPicking
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onBarcodeScanned={handleCameraScan}
        topInset={insets.top}
        title="Escanear Artículo"
        lastScanMessage={cameraScanMessage}
        lastScanSuccess={cameraScanSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 15 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { flex: 1, alignItems: "center" },
  headerSub: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "800" },
  traspasoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  traspasoInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  traspasoInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  traspasoInfoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrackGlobal: {
    height: 3,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFillGlobal: { height: "100%" },
  deckWrapper: { flex: 1, position: "relative" },
  footerAction: {
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 20,
    width: "100%",
    elevation: 10,
    zIndex: 10,
  },
  cardContainer: {
    flex: 1,
    padding: 15,
    justifyContent: "center",
  },
  
  // Estilos Success Premium
  successOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successContent: {
    alignItems: "center",
    padding: 40,
    width: "100%",
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#10B981",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  successMessage: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    maxWidth: "80%",
  },
  successBtn: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1.05 }],
  },
  successBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  finishBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  finishBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  deckInfo: {
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  deckCount: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  deckDots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 15,
  },
  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  hiddenInput: { position: "absolute", width: 0, height: 0, opacity: 0 },
  modalOverlayAlt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalContentAlt: { width: 270, borderRadius: 14, overflow: "hidden" },
  modalTitleAlt: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  modalMessageAlt: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  modalBtnAlt: {
    height: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnTextAlt: { fontSize: 17, fontWeight: "600" },
  modalButtonsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  modalBtnHalf: {
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  locToast: {
    position: "absolute",
    bottom: 120,
    left: 40,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  locToastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  // ─── Box Selection Screen ────────────────────────────────────────────
  headerSimple: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  boxSelectionContent: {
    padding: 20,
    paddingBottom: 60,
  },
  welcomeInfo: {
    alignItems: "center",
    marginBottom: 30,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  scanArea: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 24,
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  boxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  boxCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  boxCardCode: {
    fontSize: 14,
    fontWeight: "800",
  },
  boxCardName: {
    fontSize: 11,
    fontWeight: "500",
  },

  // ─── Boxes Row (picking header) ──────────────────────────────────────
  boxesRow: {
    marginBottom: 8,
  },
  boxesScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  boxBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  boxBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  removeBoxBtn: {
    marginLeft: 2,
  },
  addBoxBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBoxText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
