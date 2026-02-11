import { CameraScannerPicking } from "@/components/CameraScannerPicking";
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
import { ArticleCardPicking } from "./_components/ArticleCardPicking";

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

export default function SurtePedidoScreen() {
  const { folio, doctoVeId } = useLocalSearchParams();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [alert, setAlert] = useState<{ visible: boolean; message: string }>({
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

  // Camera Scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraScanMessage, setCameraScanMessage] = useState<string | null>(
    null,
  );
  const [cameraScanSuccess, setCameraScanSuccess] = useState(true);
  const cameraScanLock = useRef(false);

  // Ventanilla Notifications (Uber-style)
  const [ventanillaVisible, setVentanillaVisible] = useState(false);
  const [ventanillaLoading, setVentanillaLoading] = useState(false);
  const [ventanillaDetalles, setVentanillaDetalles] = useState<any[]>([]);
  const [ventanillaDetallesModal, setVentanillaDetallesModal] = useState(false);
  const { nuevoTraspaso, clearNuevoTraspaso, marcarComoTomado } =
    useVentanillaPolling({
      enabled: pickingStarted, // Solo pollean mientras están pickeando
      onNewVentanilla: (ventanilla) => {
        console.log(
          "[VENTANILLA] Nueva ventanilla detectada:",
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
      const response = await fetch(`${API_URL}/api/detalle-pedido.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, doctoVeId }),
      });
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
  }, [doctoVeId]);

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
    } catch (e) {
      console.error("Error fetching boxes:", e);
    }
  }, []);

  useEffect(() => {
    fetchDetalles();
    fetchAvailableBoxes();
  }, [fetchDetalles, fetchAvailableBoxes]);

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
        message:
          `Error técnico en ${API_URL}: ` + (e.message || "Error de conexión"),
      });
    } finally {
      setValidatingBox(false);
      setBoxScannerText("");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!alert.visible) {
        if (!pickingStarted) {
          boxInputRef.current?.focus();
        } else {
          scannerRef.current?.focus();
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [alert.visible, pickingStarted]);

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

      // Buscar artículo o ubicación
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
        art.CONFIRMADO = false;
      }
      return newArticulos;
    });
  };

  const incrementarSurtido = (index: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      const art = newArticulos[index];
      if (art.SURTIDAS < art.UNIDADES) {
        art.SURTIDAS += 1;
      }
      art.CONFIRMADO = false;
      return newArticulos;
    });
  };

  const setSurtidoManual = (index: number, qty: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      newArticulos[index].SURTIDAS = Math.min(
        qty,
        newArticulos[index].UNIDADES,
      );
      newArticulos[index].CONFIRMADO = false;
      return newArticulos;
    });
  };

  const handleConfirm = (index: number) => {
    setArticulos((prev) => {
      const newArticulos = [...prev];
      newArticulos[index].CONFIRMADO = !newArticulos[index].CONFIRMADO;
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

      const response = await fetch(`${API_URL}/api/pedido-enviado.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          doctoId: doctoVeId,
          folio: folio, // Importante para liberar la caja de apartado
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
      console.log("[PICKING] Respuesta pedido-enviado:", data);

      if (data.success) {
        // Si se liberó una caja, mostrar mensaje especial
        if (data.CAJA_LIBERADA) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setAlert({
            visible: true,
            message: `🎉 ¡Pedido completado!\n\n📦 ${data.CAJA_LIBERADA.codigo} liberada`,
          });
        } else {
          setAlert({ visible: true, message: "¡Pedido finalizado con éxito!" });
        }

        setTimeout(() => {
          router.replace("/(main)/procesos/picking/pedidos");
        }, 2000);
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al finalizar pedido.",
        });
      }
    } catch (e) {
      setAlert({ visible: true, message: "Error de red al finalizar pedido." });
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  if (!pickingStarted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />
        <View style={[styles.headerSimple, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
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
              Para empezar a pickear necesitas asignar un espacio de
              almacenamiento (carrito o caja). Escanea el código o selecciona de
              la lista.
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
              value={boxScannerText}
              onChangeText={setBoxScannerText}
              onSubmitEditing={() => handleConfirmBoxSelection(boxScannerText)}
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
              Picking Pedido
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

        <View style={styles.progressTrackGlobal}>
          <Animated.View
            style={[
              styles.progressFillGlobal,
              { width: `${progress * 100}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <View style={styles.deckWrapper}>
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
            keyExtractor={(item) => item.ARTICULO_ID}
            renderItem={({ item, index }) => {
              const isLocked = !!(
                item.LOCALIZACION &&
                item.LOCALIZACION !== "NA" &&
                !unlockedLocations.has(item.LOCALIZACION)
              );

              // Simple transformations for premium feel
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
            showSoftInputOnFocus={false}
            value={tempBarcode}
            onChangeText={setTempBarcode}
            onSubmitEditing={() => handleBarcodeScanned(tempBarcode)}
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
                <Text style={styles.finishBtnText}>FINALIZAR PEDIDO</Text>
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
      )}

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
              <Text style={[styles.modalBtnTextAlt, { color: colors.accent }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚀 Ventanilla Uber-style Notification */}
      <VentanillaBanner
        visible={ventanillaVisible}
        onAccept={handleAcceptVentanilla}
        onDismiss={handleDismissVentanilla}
        ventanilla={nuevoTraspaso}
        loading={ventanillaLoading}
        colors={colors}
        duration={30}
      />

      {/* � Camera Scanner Modal */}
      <CameraScannerPicking
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onBarcodeScanned={handleCameraScan}
        topInset={insets.top}
        title="Escanear Artículo"
        lastScanMessage={cameraScanMessage}
        lastScanSuccess={cameraScanSuccess}
      />

      {/* �📋 Modal de Detalles de Ventanilla */}
      <Modal
        visible={ventanillaDetallesModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlayFull}>
          <BlurView
            intensity={30}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[
              styles.ventanillaModal,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Header del modal */}
            <View style={styles.ventanillaModalHeader}>
              <View>
                <Text
                  style={[styles.ventanillaModalTitle, { color: colors.text }]}
                >
                  📦 Ventanilla
                </Text>
                <Text
                  style={[
                    styles.ventanillaModalFolio,
                    { color: colors.accent },
                  ]}
                >
                  {nuevoTraspaso?.FOLIO}
                </Text>
              </View>
              <View
                style={[
                  styles.ventanillaModalBadge,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Ionicons name="cube-outline" size={16} color={colors.accent} />
                <Text
                  style={[
                    styles.ventanillaModalBadgeText,
                    { color: colors.accent },
                  ]}
                >
                  {ventanillaDetalles.length} artículo
                  {ventanillaDetalles.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            {/* Almacén destino */}
            <View
              style={[
                styles.ventanillaAlmacen,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.ventanillaAlmacenText,
                  { color: colors.textSecondary },
                ]}
              >
                {nuevoTraspaso?.ALMACEN}
              </Text>
            </View>

            {/* Lista de artículos */}
            <ScrollView
              style={styles.ventanillaListScroll}
              showsVerticalScrollIndicator={false}
            >
              {ventanillaDetalles.map((item, idx) => (
                <View
                  key={`${item.ARTICULO_ID}-${idx}`}
                  style={[
                    styles.ventanillaItem,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.ventanillaItemLeft}>
                    <Text
                      style={[
                        styles.ventanillaItemName,
                        { color: colors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {item.NOMBRE}
                    </Text>
                    <View style={styles.ventanillaItemMeta}>
                      <Text
                        style={[
                          styles.ventanillaItemCode,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {item.CODIGO}
                      </Text>
                      <View style={styles.ventanillaItemDot} />
                      <Text
                        style={[
                          styles.ventanillaItemLoc,
                          { color: colors.accent },
                        ]}
                      >
                        📍 {item.LOCALIZACION}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.ventanillaItemQty,
                      { backgroundColor: colors.accent + "15" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ventanillaItemQtyText,
                        { color: colors.accent },
                      ]}
                    >
                      {item.UNIDADES}
                    </Text>
                    <Text
                      style={[
                        styles.ventanillaItemQtyLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {item.UNIDAD_VENTA}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Botones de acción */}
            <View style={styles.ventanillaModalActions}>
              <TouchableOpacity
                onPress={handleCancelVentanillaDetalles}
                style={[
                  styles.ventanillaModalBtnSecondary,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.ventanillaModalBtnSecondaryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmVentanilla}
                style={[
                  styles.ventanillaModalBtnPrimary,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.ventanillaModalBtnPrimaryText}>
                  Surtir Ahora
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 15 },
  headerSimple: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { marginRight: 20 },
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
  progressTrackGlobal: {
    height: 3,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFillGlobal: { height: "100%" },
  boxBadgeText: { fontSize: 11, fontWeight: "700" },
  boxesRow: { marginBottom: 10 },
  boxesScroll: { gap: 8, paddingRight: 20 },
  boxBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  removeBoxBtn: { marginLeft: 2 },
  addBoxBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBoxText: { fontSize: 11, fontWeight: "800" },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  skipBtnText: { fontSize: 13, fontWeight: "700" },
  boxSelectionContent: { padding: 25 },
  welcomeInfo: { alignItems: "center", marginBottom: 40 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeTitle: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  welcomeSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  scanArea: {
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  scanLabel: { fontSize: 13, fontWeight: "600", marginTop: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 15,
  },
  boxGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  boxCard: {
    width: "48%",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  boxCardCode: { fontSize: 14, fontWeight: "800", marginTop: 5 },
  boxCardName: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  deckWrapper: { flex: 1, position: "relative" },
  footerAction: {
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  // Estilos para modal de detalles de ventanilla
  modalOverlayFull: {
    flex: 1,
    justifyContent: "flex-end",
  },
  ventanillaModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  ventanillaModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  ventanillaModalTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  ventanillaModalFolio: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  ventanillaModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ventanillaModalBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ventanillaAlmacen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 15,
  },
  ventanillaAlmacenText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ventanillaListScroll: {
    maxHeight: 300,
    marginBottom: 20,
  },
  ventanillaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  ventanillaItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  ventanillaItemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  ventanillaItemMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  ventanillaItemCode: {
    fontSize: 12,
    fontWeight: "500",
  },
  ventanillaItemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    marginHorizontal: 8,
  },
  ventanillaItemLoc: {
    fontSize: 12,
    fontWeight: "600",
  },
  ventanillaItemQty: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
  },
  ventanillaItemQtyText: {
    fontSize: 18,
    fontWeight: "800",
  },
  ventanillaItemQtyLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  ventanillaModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  ventanillaModalBtnSecondary: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  ventanillaModalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  ventanillaModalBtnPrimary: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ventanillaModalBtnPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
