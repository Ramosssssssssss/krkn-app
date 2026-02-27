import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { SkeletonPickingCard } from "@/components/SkeletonPickingCard";
import { VentanillaBanner } from "@/components/VentanillaBanner";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useVentanillaPolling } from "@/hooks/useVentanillaPolling";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Modal,
    PanResponder,
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

const SOUNDS = {
  check: require("../../../../../assets/sounds/check.wav"),
  error: require("../../../../../assets/sounds/wrong.mp3"),
};

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
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    success?: boolean;
  }>({
    visible: false,
    message: "",
  });
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

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
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const scanTimeoutRef = useRef<any>(null);
  const boxScanTimeoutRef = useRef<any>(null);
  const lastScanValue = useRef("");
  const lastBoxScanValue = useRef("");
  const lastProcessedRef = useRef({ code: "", time: 0 });
  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const soundRef = useRef<Audio.Sound | null>(null);

  const scannerRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);

  // Refs para escaneo ultra-rápido (evita cierres obsoletos/stale closures)
  const itemsRef = useRef<Articulo[]>([]);
  const currentIndexRef = useRef(0);
  const unlockedLocationsRef = useRef<Set<string>>(new Set());

  // Sincronizar Refs con el estado
  useEffect(() => { itemsRef.current = articulos; }, [articulos]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { unlockedLocationsRef.current = unlockedLocations; }, [unlockedLocations]);
  const lastInteractionIndex = useRef<number>(-1);

  // Scrubber (dock-style navigation)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const scrubberWidth = useRef(SCREEN_WIDTH - 40);
  const scrubOpacity = useRef(new Animated.Value(0)).current;

  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        Animated.spring(scrubOpacity, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
        const x = evt.nativeEvent.locationX;
        const count = itemsRef.current.length;
        if (count > 0) {
          const idx = Math.max(0, Math.min(count - 1, Math.floor((x / scrubberWidth.current) * count)));
          setScrubIndex(idx);
          setCurrentIndex(idx);
          listRef.current?.scrollToIndex({ index: idx, animated: true });
          Haptics.selectionAsync();
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const count = itemsRef.current.length;
        if (count > 0) {
          const idx = Math.max(0, Math.min(count - 1, Math.floor((x / scrubberWidth.current) * count)));
          if (idx !== currentIndexRef.current) {
            setScrubIndex(idx);
            setCurrentIndex(idx);
            listRef.current?.scrollToIndex({ index: idx, animated: true });
            Haptics.selectionAsync();
          }
        }
      },
      onPanResponderRelease: () => {
        setIsScrubbing(false);
        Animated.timing(scrubOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (!isScrubbing) setScrubIndex(currentIndex);
  }, [currentIndex, isScrubbing]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(err => console.log("Error setting audio mode", err));
  }, []);

  const playSound = useCallback(async (type: "check" | "error") => {
    console.log(`[PEDIDO] Intentando reproducir sonido: ${type}`);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(SOUNDS[type], {
        shouldPlay: true,
        volume: 1.0,
      });
      soundRef.current = sound;
      console.log(`[PEDIDO] Sonido ${type} reproducido correctamente`);
    } catch (e) {
      console.log("[PEDIDO] Error al reproducir sonido:", e);
    }
  }, []);

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

  // Bloquear botón atrás
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setExitModalVisible(true);
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

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
          SURTIDAS: Number(item.SURTIDAS || 0),
          CONFIRMADO: Number(item.SURTIDAS || 0) >= Number(item.UNIDADES),
        }));
        setArticulos(items);
        if (items.some((a: any) => a.SURTIDAS > 0)) {
          setPickingStarted(true);
        }
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
      if (!alert.visible && !exitModalVisible && !showCameraScanner) {
        if (!pickingStarted) {
          boxInputRef.current?.focus();
        } else {
          scannerRef.current?.focus();
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [alert.visible, exitModalVisible, pickingStarted, showCameraScanner]);



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
      const art = {...newArticulos[index]};
      newArticulos[index] = art;
      const nuevaCant = art.SURTIDAS + delta;

      if (nuevaCant >= 0 && nuevaCant <= art.UNIDADES) {
        if (delta > 0) {
          playSound("check");
        }
        art.SURTIDAS = nuevaCant;
        // Auto-confirmar si completó
        if (art.SURTIDAS === art.UNIDADES) {
          art.CONFIRMADO = true;
          lastInteractionIndex.current = index;
        }
      } else if (delta > 0) {
        playSound("error");
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
        playSound("check");
      } else {
        playSound("error");
      }
      // Auto-confirmar si completó
      if (art.SURTIDAS === art.UNIDADES) {
        art.CONFIRMADO = true;
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

      if (qty > art.SURTIDAS && qty <= art.UNIDADES) {
        playSound("check");
      } else if (qty > art.UNIDADES) {
        playSound("error");
      }
      art.SURTIDAS = Math.min(qty, art.UNIDADES);
      // Auto-confirmar si completó
      if (art.SURTIDAS === art.UNIDADES) {
        art.CONFIRMADO = true;
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
    articulos.length > 0 && articulos.every((a) => a.CONFIRMADO);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAlert({
          visible: true,
          message:
            "¡Pedido Completado!\n\nEl pedido ha sido surtido correctamente.",
          success: true,
        });
        // La navegación ahora la maneja el botón del modal de éxito
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

  const handleBarcodeScanned = (code: string) => {
    const cleanedCode = code.trim().toUpperCase();
    if (!cleanedCode) return;
    console.log("[PEDIDO] Procesando:", cleanedCode);

    // Usar Refs para obtener el estado más reciente sin esperas de React
    const currentItems = itemsRef.current;
    const currIdx = currentIndexRef.current;
    const currentUnlocked = unlockedLocationsRef.current;
    const currentArt = currentItems[currIdx];

    // 1. Ubicación actual?
    const currentLoc = (currentArt?.LOCALIZACION || "").toUpperCase().trim();
    if (currentArt && currentLoc === cleanedCode) {
      playSound("check");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(currentLoc));
      setLocationFeedback({ visible: true, loc: currentLoc });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      return;
    }

    // 2. Artículo actual?
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
        !currentUnlocked.has(locUpper)
      );
      if (isLocked) {
        playSound("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Primero debes desbloquear la ubicación ${currentArt.LOCALIZACION}`,
        });
      } else if (currentArt.SURTIDAS < currentArt.UNIDADES) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(currIdx);
      } else {
        playSound("error");
      }
      return;
    }

    // 3. Ubicación en lista?
    const matchLocIdx = currentItems.findIndex(
      (a) => (a.LOCALIZACION || "").toUpperCase().trim() === cleanedCode,
    );
    if (matchLocIdx !== -1) {
      const matchedLoc = (currentItems[matchLocIdx].LOCALIZACION || "").toUpperCase().trim();
      playSound("check");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(matchedLoc));
      setLocationFeedback({ visible: true, loc: matchedLoc });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
      setCurrentIndex(matchLocIdx);
      return;
    }

    // 4. Artículo en lista?
    const foundIdx = currentItems.findIndex(
      (a) =>
        (a.CLAVE_ARTICULO === cleanedCode || a.CODBAR === cleanedCode) &&
        a.SURTIDAS < a.UNIDADES,
    );

    if (foundIdx !== -1) {
      const art = currentItems[foundIdx];
      const artLocUpper = (art.LOCALIZACION || "").toUpperCase().trim();
      const isLocked = !!(
        art.LOCALIZACION &&
        artLocUpper !== "NA" &&
        artLocUpper !== "N/A" &&
        !currentUnlocked.has(artLocUpper)
      );

      if (isLocked) {
        playSound("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Ubicación bloqueada: ${art.LOCALIZACION}`,
        });
        listRef.current?.scrollToIndex({ index: foundIdx, animated: true });
        setCurrentIndex(foundIdx);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(foundIdx);
        if (foundIdx !== currIdx) {
          listRef.current?.scrollToIndex({ index: foundIdx, animated: true });
          setCurrentIndex(foundIdx);
        }
      }
    } else {
      playSound("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Handler para escaneo con cámara
  const handleCameraScan = useCallback(
    (data: string) => {
      if (cameraScanLock.current) return;
      cameraScanLock.current = true;

      const cleanedCode = data.trim().toUpperCase();

      // Usar Refs para evitar cierres obsoletos durante ráfagas
      const currentItems = itemsRef.current;
      const currIdx = currentIndexRef.current;
      const currentUnlocked = unlockedLocationsRef.current;
      const currentArt = currentItems[currIdx];

      // 1. ¿Es la ubicación del artículo actual?
      const currentLoc = (currentArt?.LOCALIZACION || "").toUpperCase().trim();
      if (currentArt && currentLoc === cleanedCode) {
        playSound("check");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(currentLoc));
        setCameraScanMessage(`Ubicación ${currentLoc} desbloqueada`);
        setCameraScanSuccess(true);
        setShowCameraScanner(false);
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
          !currentUnlocked.has(locUpper)
        );

        if (isLocked) {
          playSound("error");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(
            `Primero escanea ubicación ${currentArt.LOCALIZACION}`,
          );
          setCameraScanSuccess(false);
        } else if ((currentArt.SURTIDAS ?? 0) < currentArt.UNIDADES) {
          // playSound is inside incrementarSurtido
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(currIdx);
          setCameraScanMessage(`+1 ${currentArt.CLAVE_ARTICULO}`);
          setCameraScanSuccess(true);
          setShowCameraScanner(false);
        } else {
          playSound("error");
        }
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1200);
        return;
      }

      // 3. Buscar en toda la lista
      const matchLocIdx = currentItems.findIndex(
        (a) => (a.LOCALIZACION || "").toUpperCase().trim() === cleanedCode,
      );
      if (matchLocIdx !== -1) {
        const matchedLoc = (currentItems[matchLocIdx].LOCALIZACION || "").toUpperCase().trim();
        playSound("check");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(matchedLoc));
        setCameraScanMessage(`Ubicación ${matchedLoc} desbloqueada`);
        setCameraScanSuccess(true);
        setShowCameraScanner(false);
        listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
        setCurrentIndex(matchLocIdx); // Sincronizar estado
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1500);
        return;
      }

      const foundIndex = currentItems.findIndex(
        (a) =>
          (a.CLAVE_ARTICULO === cleanedCode || a.CODBAR === cleanedCode) &&
          a.SURTIDAS < a.UNIDADES,
      );

      if (foundIndex !== -1) {
        const art = currentItems[foundIndex];
        const artLocUpper = (art.LOCALIZACION || "").toUpperCase().trim();
        const isLocked = !!(
          art.LOCALIZACION &&
          artLocUpper !== "NA" &&
          artLocUpper !== "N/A" &&
          !currentUnlocked.has(artLocUpper)
        );

        if (isLocked) {
          playSound("error");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(`Ubicación bloqueada: ${art.LOCALIZACION}`);
          setCameraScanSuccess(false);
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
          setCurrentIndex(foundIndex);
        } else {
          playSound("check");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(foundIndex);
          setCameraScanMessage(`+1 ${currentItems[foundIndex].CLAVE_ARTICULO}`);
          setCameraScanSuccess(true);
          setShowCameraScanner(false);
          if (foundIndex !== currIdx) {
            listRef.current?.scrollToIndex({
              index: foundIndex,
              animated: true,
            });
            setCurrentIndex(foundIndex);
          }
        }
      } else {
        playSound("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCameraScanMessage(`No encontrado: ${cleanedCode}`);
        setCameraScanSuccess(false);
      }

      setTimeout(() => {
        cameraScanLock.current = false;
        setCameraScanMessage(null);
      }, 1200);
    },
    [incrementarSurtido], // Simplificado para usar Refs internos
  );

  const handleSaveProgress = async () => {
    setLoading(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/guardar-progreso-pedido.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          doctoId: doctoVeId,
          productos: articulos.map((art) => ({
            ARTICULO_ID: art.ARTICULO_ID,
            CLAVE_ARTICULO: art.CLAVE_ARTICULO,
            UNIDADES: art.UNIDADES,
            SURTIDAS: art.SURTIDAS ?? 0,
          })),
        }),
      });
      const data = await response.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Error al guardar progreso:", e);
    } finally {
      setLoading(false);
      setSaveModalVisible(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)/procesos/picking");
      }
    }
  };

  const handleExitWithoutSaving = async () => {
    setLoading(true);
    try {
      // Actualizar estatus a "P" (pendiente)
      const databaseId = getCurrentDatabaseId();
      await fetch(`${API_URL}/api/update-pedido.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          doctoId: doctoVeId,
          estatus: "P",
        }),
      });
    } catch (e) {
      console.error("Error al liberar pedido:", e);
    } finally {
      setLoading(false);
      setSaveModalVisible(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)/procesos/picking");
      }
    }
  };

  const handleExit = () => {
    setExitModalVisible(false);
    setTimeout(() => {
        setSaveModalVisible(true);
    }, 300);
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

        <ScrollView contentContainerStyle={styles.boxSelectionContent} keyboardShouldPersistTaps="handled">
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
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              onChangeText={(text) => {
                if (!text) return;
                if (boxScanTimeoutRef.current) clearTimeout(boxScanTimeoutRef.current);
                lastBoxScanValue.current = text;
                boxScanTimeoutRef.current = setTimeout(() => {
                  const code = lastBoxScanValue.current.trim();
                  if (code) {
                    boxInputRef.current?.clear();
                    lastBoxScanValue.current = "";
                    handleConfirmBoxSelection(code);
                  }
                }, 25);
              }}
              onSubmitEditing={(e) => {
                if (boxScanTimeoutRef.current) clearTimeout(boxScanTimeoutRef.current);
                const code = e.nativeEvent.text.trim();
                boxInputRef.current?.clear();
                lastBoxScanValue.current = "";
                if (code) handleConfirmBoxSelection(code);
              }}
              onBlur={() => {
                if (!alert.visible) {
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />

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
              Picking Pedido
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {folio}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setOptionsModalVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.deckWrapper}>
          <View style={styles.cardContainer}>
            <SkeletonPickingCard />
          </View>
        </View>
      ) : (
        <View style={styles.deckWrapper}>
          <Animated.FlatList
            ref={listRef}
            data={articulos}
            horizontal
            pagingEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={(item, idx) => `${item.ARTICULO_ID}-${idx}`}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const locUpper = (item.LOCALIZACION || "").toUpperCase().trim();
              const isLocked = !!(
                item.LOCALIZACION &&
                locUpper !== "NA" &&
                locUpper !== "N/A" &&
                !unlockedLocations.has(locUpper)
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
            style={{ position: "absolute", height: 1, width: 1, opacity: 0 }}
            autoFocus
            showSoftInputOnFocus={false}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            onChangeText={(text) => {
              if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

              if (text.includes("\n") || text.includes("\r")) {
                scannerRef.current?.setNativeProps({ text: "" });
                scannerRef.current?.clear();

                const parts = text.split(/[\r\n]+/).filter(p => p.trim() !== "");
                parts.forEach(code => handleBarcodeScanned(code.trim()));

                setTempBarcode("");
                return;
              }

              setTempBarcode(text);
              scanTimeoutRef.current = setTimeout(() => {
                if (text.trim().length > 0) {
                  scannerRef.current?.setNativeProps({ text: "" });
                  scannerRef.current?.clear();
                  handleBarcodeScanned(text.trim());
                  setTempBarcode("");
                }
              }, 100);
            }}
            onBlur={() => {
              if (!alert.visible && !showCameraScanner) {
                setTimeout(() => scannerRef.current?.focus(), 100);
              }
            }}
          />

          {/* Scrubber Dock */}
          {!isOrderFinished && articulos.length > 1 && (
            <View style={[styles.footerAction, { paddingBottom: 5 }]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.scrubLabel,
                  { opacity: scrubOpacity },
                ]}
              >
                <View style={styles.scrubPreviewCard}>
                  <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.scrubPreviewImageWrapper}>
                    <Image
                      source={{
                        uri: `${API_URL}/api/imagen-articulo.php?databaseId=${getCurrentDatabaseId()}&articuloId=${articulos[scrubIndex]?.ARTICULO_ID}&pos=0`,
                      }}
                      style={styles.scrubPreviewImage}
                      contentFit="cover"
                    />
                    <View style={styles.imageOverlay} />
                  </View>
                  <View style={styles.scrubPreviewInfo}>
                    <Text style={styles.scrubPreviewClave} numberOfLines={1}>
                      {articulos[scrubIndex]?.CLAVE_ARTICULO || ''}
                    </Text>
                    <Text style={styles.scrubPreviewName} numberOfLines={2}>
                      {articulos[scrubIndex]?.NOMBRE || ''}
                    </Text>
                    <View style={styles.scrubPreviewFooter}>
                      <Text style={styles.scrubPreviewCounter}>
                        {scrubIndex + 1} / {articulos.length}
                      </Text>
                      <View style={styles.scrubStats}>
                        <Ionicons name="cart" size={10} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.scrubStatsText}>
                          {articulos[scrubIndex]?.SURTIDAS || 0} / {articulos[scrubIndex]?.UNIDADES || 0}
                        </Text>
                      </View>
                      {articulos[scrubIndex]?.CONFIRMADO && (
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      )}
                    </View>

                    {/* Small progress bar */}
                    <View style={styles.scrubMiniTrack}>
                       <View 
                         style={[
                           styles.scrubMiniFill, 
                           { 
                             width: `${Math.min(100, ((articulos[scrubIndex]?.SURTIDAS || 0) / (articulos[scrubIndex]?.UNIDADES || 1)) * 100)}%`,
                             backgroundColor: articulos[scrubIndex]?.CONFIRMADO ? "#10B981" : colors.accent
                           }
                         ]} 
                       />
                    </View>
                  </View>
                </View>
              </Animated.View>
              <View
                style={styles.scrubberBar}
                onLayout={(e) => { scrubberWidth.current = e.nativeEvent.layout.width; }}
                {...scrubberPanResponder.panHandlers}
              >
                {articulos.map((art, i) => (
                  <View
                    key={i}
                    style={[
                      styles.scrubDot,
                      {
                        backgroundColor: art.CONFIRMADO
                          ? '#10B981'
                          : i === (isScrubbing ? scrubIndex : currentIndex)
                            ? colors.accent
                            : colors.border,
                        transform: [{ scale: i === (isScrubbing ? scrubIndex : currentIndex) ? 1.6 : 1 }],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {isOrderFinished && (
            <View style={[styles.footerAction, { paddingBottom: 5 }]}>
              <TouchableOpacity
                onPress={handleFinish}
                style={[styles.finishBtn, { backgroundColor: "#10B981", marginBottom: 30 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>FINALIZAR PEDIDO</Text>
                <Ionicons name="send-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* MODAL DE OPCIONES */}
      <Modal visible={optionsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlayFull}>
           <TouchableOpacity 
             style={StyleSheet.absoluteFill} 
             onPress={() => setOptionsModalVisible(false)} 
           />
           <View style={[styles.ventanillaModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ventanillaModalTitle, { color: colors.text, marginBottom: 20 }]}>Opciones de Picking</Text>
              
              <TouchableOpacity 
                style={[styles.ventanillaItem, { backgroundColor: colors.accent + "10" }]}
                onPress={() => {
                  setOptionsModalVisible(false);
                  setPickingStarted(false);
                }}
              >
                <Ionicons name="cube-outline" size={24} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ventanillaItemName, { color: colors.text }]}>Gestionar Cajas</Text>
                  <Text style={[styles.ventanillaItemCode, { color: colors.textSecondary }]}>Asignar o cambiar cajas de picking</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.ventanillaItem, { backgroundColor: "#3B82F610" }]}
                onPress={() => {
                  setOptionsModalVisible(false);
                  openCameraScanner();
                }}
              >
                <Ionicons name="camera-outline" size={24} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ventanillaItemName, { color: colors.text }]}>Escanear con Cámara</Text>
                  <Text style={[styles.ventanillaItemCode, { color: colors.textSecondary }]}>Usar ráfaga de cámara</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.ventanillaModalBtnSecondary, { marginTop: 10, borderColor: colors.border }]}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={[styles.ventanillaModalBtnSecondaryText, { color: colors.text }]}>Cerrar</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      <Modal
        visible={alert.visible}
        transparent
        animationType={alert.success ? "slide" : "fade"}
      >
        {alert.success ? (
          <View style={styles.successOverlay}>
            <BlurView
              intensity={80} // Increased blur for premium feel
              style={StyleSheet.absoluteFill}
              tint="systemMaterialDark" // Using material dark for better blur
            />
            {/* Capa extra para asegurar oscuridad */}
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
              <Text style={styles.successTitle}>¡PROCESO COMPLETADO!</Text>
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

      {/*  Camera Scanner Modal */}
      <CameraScannerPicking
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onBarcodeScanned={handleCameraScan}
        topInset={insets.top}
        title="Escanear Artículo"
        lastScanMessage={cameraScanMessage}
        lastScanSuccess={cameraScanSuccess}
      />

      {/* 📋 Modal de Detalles de Ventanilla */}
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

      {/* Modal Salir */}
      <Modal visible={exitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="warning-outline" size={48} color="#F59E0B" />
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
              ¿Estás seguro que deseas salir?
            </Text>
            <Text
              style={[styles.modalMessage, { color: colors.textSecondary }]}
            >
              El jefe de picking tiene que liberarte para seguir trabajando.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setExitModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExit}
                style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Guardar Progreso */}
      <Modal visible={saveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="save-outline" size={48} color={colors.accent} />
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
              ¿Deseas guardar el progreso de tu orden?
            </Text>
            <Text
              style={[styles.modalMessage, { color: colors.textSecondary, textAlign: 'center' }]}
            >
              Podrás retomar este pedido más tarde desde la lista de pendientes.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleExitWithoutSaving}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  No guardar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProgress}
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Guardar
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
    bottom: 25,
    width: "100%",
    elevation: 10,
    zIndex: 10,
  },
  cardContainer: {
    flex: 1,
    padding: 15,
    justifyContent: "center",
  },

  // Scrubber Dock styles
  scrubLabel: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    width: SCREEN_WIDTH * 0.85,
  },
  scrubPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    overflow: "hidden",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  scrubPreviewImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  scrubPreviewImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  scrubPreviewInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  scrubPreviewClave: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  scrubPreviewName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 16,
  },
  scrubPreviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  scrubPreviewCounter: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
  },
  scrubStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginLeft: "auto",
  },
  scrubStatsText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  scrubMiniTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  scrubMiniFill: {
    height: "100%",
    borderRadius: 2,
  },

  scrubberBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scrubDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  modalOverlayFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  ventanillaModal: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  ventanillaModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  ventanillaModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  ventanillaModalFolio: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  ventanillaModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  ventanillaModalBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  ventanillaAlmacen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  ventanillaAlmacenText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ventanillaListScroll: {
    marginBottom: 24,
  },
  ventanillaItem: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  ventanillaItemLeft: {
    flex: 1,
  },
  ventanillaItemName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  ventanillaItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ventanillaItemCode: {
    fontSize: 12,
    fontWeight: "500",
  },
  ventanillaItemDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  ventanillaItemLoc: {
    fontSize: 12,
    fontWeight: "700",
  },
  ventanillaItemQty: {
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    minWidth: 50,
  },
  ventanillaItemQtyText: {
    fontSize: 16,
    fontWeight: "900",
  },
  ventanillaItemQtyLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ventanillaModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  ventanillaModalBtnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ventanillaModalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  ventanillaModalBtnPrimary: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  ventanillaModalBtnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
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
