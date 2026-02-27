import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import ImageGallery from "@/components/ImageGallery";
import { SkeletonPickingCard } from "@/components/SkeletonPickingCard";
import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_HEIGHT < 750;

interface ArticuloVentanilla {
  CODIGO_BARRAS: string;
  CODIGO: string;
  UNIDADES: number;
  ARTICULO_ID: number;
  TRASPASO_IN_ID: number;
  NOMBRE: string;
  LOCALIZACION: string;
  UNIDAD_VENTA: string;
  SURTIDAS?: number;
  CONFIRMADO?: boolean;
}

const SOUNDS = {
  check: require("../../../../../assets/sounds/check.wav"),
  error: require("../../../../../assets/sounds/wrong.mp3"),
};

export default function SurteVentanillaScreen() {
  const { folio, traspasoId, traspasoInId, almacen, articulos } =
    useLocalSearchParams();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Soporta tanto traspasoId (del modal) como traspasoInId (de la lista)
  const rawId = traspasoId || traspasoInId;
  const effectiveTraspasoId = Array.isArray(rawId) ? rawId[0] : rawId;

  const parsedArticulos: ArticuloVentanilla[] = articulos
    ? JSON.parse(articulos as string).map((art: any) => ({
        ...art,
        SURTIDAS: art.SURTIDAS || 0,
        CONFIRMADO: (art.SURTIDAS || 0) >= art.UNIDADES,
      }))
    : [];

  const [items, setItems] = useState<ArticuloVentanilla[]>(parsedArticulos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!articulos); // Si no hay articulos, cargar del API
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
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

  // Modal para ingresar cantidad manualmente
  const [qtyModal, setQtyModal] = useState<{
    visible: boolean;
    index: number;
    value: string;
  }>({
    visible: false,
    index: 0,
    value: "0",
  });

  // Candado de ubicaciones
  const [unlockedLocations, setUnlockedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [locationFeedback, setLocationFeedback] = useState({
    visible: false,
    loc: "",
  });
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);

  // Escaneo
  const [tempBarcode, setTempBarcode] = useState("");
  const scannerRef = useRef<TextInput>(null);
  const scanTimeoutRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastScanValue = useRef("");
  const listRef = useRef<any>(null);
  const lastProcessedRef = useRef({ code: "", time: 0 });
  const scrollX = useRef(new Animated.Value(0)).current;

  // Refs para escaneo ultra-rápido (evita cierres obsoletos/stale closures)
  const itemsRef = useRef<ArticuloVentanilla[]>([]);
  const currentIndexRef = useRef(0);

  // Sincronizar Refs con el estado
  const unlockedLocationsRef = useRef<Set<string>>(new Set());
  useEffect(() => { itemsRef.current = items; }, [items]);
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

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx !== null) {
        setCurrentIndex(idx);
      }
    }
  }).current;

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(err => console.log("Error setting audio mode", err));
  }, []);

  const playSound = useCallback(async (type: "check" | "error") => {
    console.log(`[VENTANILLA] Intentando reproducir sonido: ${type}`);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(SOUNDS[type], {
        shouldPlay: true,
        volume: 1.0,
      });
      soundRef.current = sound;
      console.log(`[VENTANILLA] Sonido ${type} reproducido correctamente`);
    } catch (e) {
      console.log("[VENTANILLA] Error al reproducir sonido:", e);
    }
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (lastInteractionIndex.current !== -1) {
      const idx = lastInteractionIndex.current;
      const item = items[idx];
      lastInteractionIndex.current = -1; // reset

      // Si el item que acabamos de tocar ya está completo/confirmado, mover al siguiente
      const surtidas = item?.SURTIDAS ?? 0;
      if (item && (surtidas >= item.UNIDADES || item.CONFIRMADO)) {
        // Buscar el siguiente incompleto
        const nextIdx = items.findIndex(
          (a, i) => i > idx && (a.SURTIDAS ?? 0) < a.UNIDADES && !a.CONFIRMADO
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
  }, [items]);

  // Camera Scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraScanMessage, setCameraScanMessage] = useState<string | null>(
    null,
  );
  const [cameraScanSuccess, setCameraScanSuccess] = useState(true);
  const cameraScanLock = useRef(false);

  // Cargar artículos del API si no vienen como parámetro (cuando se entra desde lista de ventanillas)
  useEffect(() => {
    const fetchDetalles = async () => {
      if (articulos) return; // Ya tenemos los artículos del modal

      try {
        const databaseId = getCurrentDatabaseId();
        const response = await fetch(`${API_URL}/api/detalle-ventanilla.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            traspasoInId: effectiveTraspasoId,
          }),
        });
        const data = await response.json();

        if (data.success && data.detalles) {
          const mappedItems = data.detalles.map((item: any) => ({
            CODIGO_BARRAS: item.CODBAR || item.CODIGO_BARRAS || "",
            CODIGO: item.CLAVE_ARTICULO || item.CODIGO || "",
            UNIDADES: Number(item.UNIDADES),
            ARTICULO_ID: item.ARTICULO_ID,
            TRASPASO_IN_ID: item.TRASPASO_IN_ID,
            NOMBRE: item.NOMBRE,
            LOCALIZACION: item.LOCALIZACION || "NA",
            UNIDAD_VENTA: item.UNIDAD_VENTA,
            SURTIDAS: Number(item.SURTIDAS || 0),
            CONFIRMADO: Number(item.SURTIDAS || 0) >= Number(item.UNIDADES),
          }));
          setItems(mappedItems);
        } else {
          setAlert({
            visible: true,
            message: data.message || "Error al cargar los artículos.",
          });
        }
      } catch (e) {
        setAlert({
          visible: true,
          message: "Error de red al obtener detalles.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetalles();
  }, [effectiveTraspasoId, articulos]);

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

  // Focus scanner
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        !alert.visible &&
        !exitModalVisible &&
        !showCameraScanner &&
        !qtyModal.visible
      ) {
        scannerRef.current?.focus();
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [alert.visible, exitModalVisible, showCameraScanner, qtyModal.visible]);



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

  const incrementarSurtido = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const art = {...newItems[index]};
      newItems[index] = art;

      const current = art.SURTIDAS ?? 0;
      if (current < art.UNIDADES) {
        art.SURTIDAS = current + 1;
        playSound("check");
      } else {
        playSound("error");
      }
      
      // Auto-confirm logic
      art.CONFIRMADO = (art.SURTIDAS ?? 0) >= art.UNIDADES;
      
      if (art.CONFIRMADO) {
         lastInteractionIndex.current = index;
      }
      
      return newItems;
    });
  };

  const decrementarSurtido = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const art = newItems[index];
      if ((art.SURTIDAS ?? 0) > 0) {
        art.SURTIDAS = (art.SURTIDAS ?? 0) - 1;
        art.CONFIRMADO = false;
      }
      return newItems;
    });
  };

  const setSurtidoManual = (index: number, qty: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const art = {...newItems[index]};
      newItems[index] = art;

      if (qty > (art.SURTIDAS ?? 0) && qty <= art.UNIDADES) {
        playSound("check");
      } else if (qty > art.UNIDADES) {
        playSound("error");
      }

      art.SURTIDAS = Math.min(qty, art.UNIDADES);
      
      art.CONFIRMADO = (art.SURTIDAS ?? 0) >= art.UNIDADES;
      if (art.CONFIRMADO) {
        lastInteractionIndex.current = index;
      }
      return newItems;
    });
  };

  const handleConfirm = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = {...newItems[index]};
      newItems[index] = item;

      item.CONFIRMADO = !item.CONFIRMADO;
      if (item.CONFIRMADO) {
          lastInteractionIndex.current = index;
      }
      return newItems;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const progress =
    items.length > 0
      ? items.reduce((acc, a) => acc + (a.SURTIDAS ?? 0), 0) /
        items.reduce((acc, a) => acc + a.UNIDADES, 0)
      : 0;

  const isOrderFinished =
    items.length > 0 && items.every((a) => a.CONFIRMADO);

  const handleFinish = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const databaseId = getCurrentDatabaseId();
      const ahora = new Date();
      const fechaFin = ahora.toISOString().split("T")[0];
      const horaFin = ahora.toTimeString().split(" ")[0].slice(0, 5);

      const response = await fetch(`${API_URL}/api/ventanilla-enviado.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoId: effectiveTraspasoId,
          nuevoEstatus: "S",
          fechaFin,
          horaFin,
          productos: items.map((item) => ({
            TRASPASO_IN_ID: effectiveTraspasoId,
            ARTICULO_ID: item.ARTICULO_ID,
            CLAVE_ARTICULO: item.CODIGO,
            UNIDADES: item.UNIDADES,
            SURTIDAS: item.SURTIDAS ?? 0,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAlert({
          visible: true,
          message:
            "🎉 ¡Ventanilla Completada!\n\nEl proceso ha finalizado correctamente.",
          success: true,
        });
        // La navegación la maneja el botón del modal
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al finalizar ventanilla.",
        });
      }
    } catch (e) {
      setAlert({ visible: true, message: "Error de red al finalizar." });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const cleanedCode = code.trim().toUpperCase();
    if (!cleanedCode) return;
    console.log("[VENTANILLA] Procesando:", cleanedCode);

    // Usar Refs para obtener el estado más reciente sin esperas de React
    const currentItems = itemsRef.current;
    const currIdx = currentIndexRef.current;
    const currentUnlocked = unlockedLocationsRef.current;
    const currentArt = currentItems[currIdx];

    // 1. PRIORIDAD: ¿Es la ubicación del artículo que estoy viendo?
    const currentLoc = (currentArt?.LOCALIZACION || "").toUpperCase().trim();
    if (currentArt && currentLoc === cleanedCode) {
      playSound("check");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(currentLoc));
      setLocationFeedback({ visible: true, loc: currentLoc });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      return;
    }

    // 2. PRIORIDAD: ¿Es el código del artículo que estoy viendo?
    if (
      currentArt &&
      (currentArt.CODIGO === cleanedCode ||
        currentArt.CODIGO_BARRAS === cleanedCode)
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
          message: `⚠️ Primero debes desbloquear la ubicación ${currentArt.LOCALIZACION} escaneando el código del pasillo.`,
        });
      } else if ((currentArt.SURTIDAS ?? 0) < currentArt.UNIDADES) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(currIdx);
      } else {
        playSound("error");
      }
      return;
    }

    // 3. FALLBACK: Ubicación en lista?
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

    // 4. FALLBACK: Artículo en lista?
    const foundIndex = currentItems.findIndex(
      (a) =>
        (a.CODIGO === cleanedCode || a.CODIGO_BARRAS === cleanedCode) &&
        (a.SURTIDAS ?? 0) < a.UNIDADES,
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
        setAlert({
          visible: true,
          message: `⚠️ Ubicación bloqueada. Desliza hacia ${art.LOCALIZACION} y escanea el pasillo.`,
        });
        listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
        setCurrentIndex(foundIndex);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(foundIndex);
        if (foundIndex !== currIdx) {
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
          setCurrentIndex(foundIndex);
        }
      }
    } else {
      playSound("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCameraScan = useCallback(
    (data: string) => {
      if (cameraScanLock.current) return;
      cameraScanLock.current = true;

      const cleanedCode = data.trim().toUpperCase();
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
        (currentArt.CODIGO === cleanedCode ||
          currentArt.CODIGO_BARRAS === cleanedCode)
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
          setCameraScanMessage(`+1 ${currentArt.CODIGO}`);
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

      // 3. Fallback: Ubicación en lista?
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

      // 4. Fallback: Artículo en lista?
      const foundIndex = currentItems.findIndex(
        (it) =>
          (it.CODIGO === cleanedCode || it.CODIGO_BARRAS === cleanedCode) &&
          (it.SURTIDAS ?? 0) < it.UNIDADES,
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(`Ubicación bloqueada: ${art.LOCALIZACION}`);
          setCameraScanSuccess(false);
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
          setCurrentIndex(foundIndex);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(foundIndex);
          setCameraScanMessage(`+1 ${currentItems[foundIndex].CODIGO}`);
          setCameraScanSuccess(true);
          setShowCameraScanner(false);
          if (foundIndex !== currIdx) {
            listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
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
    [incrementarSurtido],
  );

  const handleSaveProgress = async () => {
    setLoading(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/guardar-progreso-ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoId: effectiveTraspasoId,
          productos: items.map((item) => ({
            ARTICULO_ID: item.ARTICULO_ID,
            CLAVE_ARTICULO: item.CODIGO,
            UNIDADES: item.UNIDADES,
            SURTIDAS: item.SURTIDAS ?? 0,
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
      // Actualizar estatus a "P" (pendiente) de nuevo para liberar la ventanilla
      const databaseId = getCurrentDatabaseId();
      await fetch(`${API_URL}/api/update-ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId: effectiveTraspasoId,
          estatus: "P",
        }),
      });
    } catch (e) {
      console.error("Error al liberar ventanilla:", e);
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

  const handleExit = async () => {
    setExitModalVisible(false);
    setTimeout(() => {
        setSaveModalVisible(true);
    }, 300);
  };

  const currentItem = items[currentIndex];

  // Calcular progreso
  const totalUnidades = items.reduce((acc, a) => acc + a.UNIDADES, 0);
  const totalSurtidas = items.reduce((acc, a) => acc + (a.SURTIDAS ?? 0), 0);
  const progressPercent =
    totalUnidades > 0 ? (totalSurtidas / totalUnidades) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ocultar header de expo-router */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Scanner oculto */}
      <TextInput
        ref={scannerRef}
        style={{ position: "absolute", height: 1, width: 1, opacity: 0 }}
        autoFocus
        showSoftInputOnFocus={false}
        blurOnSubmit={false}
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
          if (
            !alert.visible &&
            !exitModalVisible &&
            !showCameraScanner &&
            !qtyModal.visible
          ) {
            setTimeout(() => scannerRef.current?.focus(), 100);
          }
        }}
      />

      {/* Header personalizado */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: colors.surface },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => setExitModalVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.background }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {folio}
            </Text>
            <View
              style={[
                styles.almacenBadge,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Ionicons name="business" size={14} color={colors.accent} />
              <Text style={[styles.almacenText, { color: colors.accent }]}>
                {almacen}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setOptionsModalVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Carrusel de Artículos con Skeleton Loading */}
      {loading ? (
        <View style={[styles.cardWrapper, { width: SCREEN_WIDTH }]}>
          <SkeletonPickingCard />
        </View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
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
          const isConfirmed = item.CONFIRMADO;
          const surtidas = item.SURTIDAS ?? 0;
          const locUpper = (item.LOCALIZACION || "").toUpperCase().trim();
          const isLocked = !!(
            item.LOCALIZACION &&
            locUpper !== "NA" &&
            locUpper !== "N/A" &&
            !unlockedLocations.has(locUpper)
          );

          return (
            <View style={[styles.cardWrapper, { width: SCREEN_WIDTH }]}>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {/* Imagen del artículo */}
                <View
                  style={[
                    styles.imageContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <ImageGallery
                    databaseId={getCurrentDatabaseId() || 1}
                    articuloId={Number(item.ARTICULO_ID || 0)}
                    clave={item.CODIGO || ""}
                    nombre={item.NOMBRE || ""}
                    unidadVenta={item.UNIDAD_VENTA || "PZA"}
                    height="100%"
                  />
                  {/* Badge de ubicación flotante */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.floatingLocationBadge,
                      {
                        backgroundColor: isLocked
                          ? "#F59E0B"
                          : isConfirmed
                            ? "#10B981"
                            : colors.accent,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isLocked
                          ? "lock-closed"
                          : isConfirmed
                            ? "checkmark-circle"
                            : "location"
                      }
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.floatingLocationText}>
                      {item.LOCALIZACION}
                    </Text>
                  </View>
                </View>

                {/* Nombre */}
                <View style={styles.cardContent}>
                  <Text style={[styles.productCode, { color: colors.accent }]}>
                    {item.CODIGO}
                  </Text>
                  <Text
                    style={[styles.productName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.NOMBRE}
                  </Text>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        PEDIDO
                      </Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {item.UNIDADES}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statItem,
                        styles.statDivider,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        SURTIDO
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setQtyModal({
                            visible: true,
                            index: index,
                            value: String(surtidas),
                          });
                        }}
                        disabled={isConfirmed}
                        style={[
                          styles.surtidoIndicator,
                          {
                            backgroundColor:
                              surtidas >= item.UNIDADES
                                ? "#10B98120"
                                : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statValue,
                            {
                              color:
                                surtidas >= item.UNIDADES
                                  ? "#10B981"
                                  : colors.text,
                            },
                          ]}
                        >
                          {surtidas}
                        </Text>
                        <Ionicons
                          name="create-outline"
                          size={12}
                          color={
                            surtidas >= item.UNIDADES
                              ? "#10B981"
                              : colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        UNIDAD
                      </Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {item.UNIDAD_VENTA}
                      </Text>
                    </View>
                  </View>

                  {/* Controles de cantidad */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => decrementarSurtido(index)}
                      style={[
                        styles.qtyBtn,
                        { backgroundColor: colors.border },
                      ]}
                      disabled={isConfirmed}
                    >
                      <Ionicons name="remove" size={24} color={colors.text} />
                    </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleConfirm(index)}
                        style={[
                          styles.confirmCircle,
                          {
                            backgroundColor: isConfirmed
                              ? surtidas === 0
                                ? "#F59E0B"
                                : "#6B7280"
                              : surtidas >= item.UNIDADES
                                ? "#10B981"
                                : colors.accent,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isConfirmed
                              ? surtidas === 0
                                ? "alert-circle-outline"
                                : "refresh-outline"
                              : "checkmark"
                          }
                          size={32}
                          color="#fff"
                        />
                      </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => incrementarSurtido(index)}
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor:
                            surtidas >= item.UNIDADES
                              ? colors.border
                              : colors.accent,
                        },
                      ]}
                      disabled={isConfirmed || surtidas >= item.UNIDADES}
                    >
                      <Ionicons
                        name="add"
                        size={24}
                        color={surtidas >= item.UNIDADES ? colors.text : "#fff"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Barra de progreso del artículo */}
                <View style={styles.cardProgressTrack}>
                  <View
                    style={[
                      styles.cardProgressFill,
                      {
                        width: `${Math.min((surtidas / item.UNIDADES) * 100, 100)}%`,
                        backgroundColor:
                          surtidas >= item.UNIDADES ? "#10B981" : colors.accent,
                      },
                    ]}
                  />
                </View>

                {/* Overlay confirmado (Blur Completo) */}
                {isConfirmed && (
                  <View style={styles.confirmedOverlay}>
                    <BlurView
                      intensity={95}
                      style={StyleSheet.absoluteFill}
                      tint="systemMaterialDark"
                    />
                    <View style={styles.confirmedContent}>
                      <View
                        style={[
                          styles.confirmedCircleOverlay,
                          {
                            backgroundColor:
                              surtidas === 0 ? "#F59E0B" : "#10B981",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            surtidas === 0
                              ? "alert-outline"
                              : "checkmark-done-outline"
                          }
                          size={40}
                          color="#fff"
                        />
                      </View>
                      <Text
                        style={[
                          styles.confirmedTitle,
                          { color: surtidas === 0 ? "#F59E0B" : "#10B981" },
                        ]}
                      >
                        {surtidas === 0
                          ? "CONFIRMADO EN CERO"
                          : surtidas >= item.UNIDADES
                            ? "COMPLETADO"
                            : "CONFIRMADO PARCIAL"}
                      </Text>
                      <Text style={styles.confirmedSub}>
                        {surtidas} de {item.UNIDADES} piezas surtidas
                      </Text>

                      <TouchableOpacity
                        style={styles.editBtnOverlay}
                        onPress={() => handleConfirm(index)}
                      >
                        <Ionicons name="pencil" size={16} color="#fff" />
                        <Text style={styles.editBtnSimpleText}>EDITAR</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
      )}

      {/* Feedback de ubicación desbloqueada */}
      {locationFeedback.visible && (
        <Animated.View style={styles.locationUnlockedBanner}>
          <Ionicons name="lock-open" size={20} color="#10B981" />
          <Text style={styles.locationUnlockedText}>
            🔓 Ubicación {locationFeedback.loc} desbloqueada
          </Text>
        </Animated.View>
      )}

      {/* Footer / Scrubber */}
      <View style={[styles.footerAction, { paddingBottom: 5 }]}>
        {!isOrderFinished && items.length > 1 && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.scrubLabel, { opacity: scrubOpacity }]}
            >
              <View style={styles.scrubPreviewCard}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.scrubPreviewImageWrapper}>
                  <Image
                    source={{
                      uri: `${API_URL}/api/imagen-articulo.php?databaseId=${getCurrentDatabaseId() || 1}&articuloId=${items[scrubIndex]?.ARTICULO_ID}&pos=0`,
                    }}
                    style={styles.scrubPreviewImage}
                    contentFit="cover"
                  />
                  <View style={styles.imageOverlay} />
                </View>
                <View style={styles.scrubPreviewInfo}>
                  <Text style={styles.scrubPreviewClave} numberOfLines={1}>
                    {items[scrubIndex]?.CODIGO || ''}
                  </Text>
                  <Text style={styles.scrubPreviewName} numberOfLines={2}>
                    {items[scrubIndex]?.NOMBRE || ''}
                  </Text>
                  <View style={styles.scrubPreviewFooter}>
                    <Text style={styles.scrubPreviewCounter}>
                      {scrubIndex + 1} / {items.length}
                    </Text>
                    <View style={styles.scrubStats}>
                      <Ionicons name="cart" size={10} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.scrubStatsText}>
                        {items[scrubIndex]?.SURTIDAS || 0} / {items[scrubIndex]?.UNIDADES || 0}
                      </Text>
                    </View>
                    {items[scrubIndex]?.CONFIRMADO && (
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    )}
                  </View>

                  {/* Mini progress bar */}
                  <View style={styles.scrubMiniTrack}>
                    <View
                      style={[
                        styles.scrubMiniFill,
                        {
                          width: `${Math.min(100, ((items[scrubIndex]?.SURTIDAS || 0) / (items[scrubIndex]?.UNIDADES || 1)) * 100)}%`,
                          backgroundColor: items[scrubIndex]?.CONFIRMADO ? "#10B981" : colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            <View
              style={styles.scrubberBar}
              onLayout={(e) => (scrubberWidth.current = e.nativeEvent.layout.width)}
              {...scrubberPanResponder.panHandlers}
            >
              {items.map((it, i) => (
                <View
                  key={i}
                  style={[
                    styles.scrubDot,
                    {
                      backgroundColor: it.CONFIRMADO
                        ? "#10B981"
                        : i === (isScrubbing ? scrubIndex : currentIndex)
                          ? colors.accent
                          : colors.border,
                      transform: [{ scale: i === (isScrubbing ? scrubIndex : currentIndex) ? 1.6 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {isOrderFinished && (
          <TouchableOpacity
            onPress={handleFinish}
            style={[styles.finishBtn, { backgroundColor: "#10B981", marginBottom: 30 }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.finishBtnText}>ENVIAR VENTANILLA</Text>
                <Ionicons name="send-outline" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

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

      {/* Modal Cantidad */}
      <Modal visible={qtyModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cantidad surtida
            </Text>
            <TextInput
              style={[
                styles.qtyInput,
                {
                  backgroundColor: colors.border,
                  color: colors.text,
                  borderColor: colors.accent,
                },
              ]}
              keyboardType="numeric"
              value={qtyModal.value}
              onChangeText={(text) =>
                setQtyModal((prev) => ({ ...prev, value: text }))
              }
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() =>
                  setQtyModal({ visible: false, index: 0, value: "0" })
                }
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const qty = parseInt(qtyModal.value, 10);
                  if (!isNaN(qty) && qty >= 0) {
                    const maxQty = items[qtyModal.index]?.UNIDADES || 0;
                    setSurtidoManual(qtyModal.index, Math.min(qty, maxQty));
                  }
                  setQtyModal({ visible: false, index: 0, value: "0" });
                }}
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
              <Text style={styles.successTitle}>¡PROCESO COMPLETADO!</Text>
              <Text style={styles.successMessage}>{alert.message}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                onPress={() => {
                  setAlert({ visible: false, message: "" });
                  // Misma lógica de salida segura
                  if (articulos && router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/(main)/procesos/picking");
                  }
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.successBtnText}>CONTINUAR</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint="dark"
            />
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {alert.message.includes("éxito") ? "🎉" : "⚠️"}
              </Text>
              <Text
                style={[styles.modalMessage, { color: colors.textSecondary }]}
              >
                {alert.message}
              </Text>
              <TouchableOpacity
                onPress={() => setAlert({ visible: false, message: "" })}
                style={[
                  styles.modalBtnFull,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {/* MODAL DE OPCIONES */}
      <Modal visible={optionsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlayFull}>
           <TouchableOpacity 
             style={StyleSheet.absoluteFill} 
             onPress={() => setOptionsModalVisible(false)} 
           />
           <View style={[styles.ventanillaModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.ventanillaModalTitle, { color: colors.text, marginBottom: 20 }]}>Opciones</Text>
              
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hiddenInput: { position: "absolute", width: 0, height: 0, opacity: 0 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  almacenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  almacenText: { fontSize: 12, fontWeight: "600" },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: "center", fontWeight: "600" },

  // Cards
  cardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  imageContainer: {
    height: isSmallDevice ? 150 : 250, 
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  productImage: {
    width: "70%",
    height: "85%",
  },
  floatingLocationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  floatingLocationText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  cardContent: {
    padding: isSmallDevice ? 8 : 12, 
  },
  productCode: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: isSmallDevice ? 12 : 14, 
    fontWeight: "700",
    marginBottom: isSmallDevice ? 4 : 8, 
    lineHeight: isSmallDevice ? 15 : 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: isSmallDevice ? 6 : 8, 
    borderRadius: 14,
    marginBottom: isSmallDevice ? 6 : 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 4,
  },
  statValue: {
    fontSize: isSmallDevice ? 13 : 16,
    fontWeight: "900",
  },
  surtidoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardProgressTrack: {
    height: 5,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardProgressFill: {
    height: "100%",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  locationText: { fontSize: 14, fontWeight: "700" },
  lockHint: {
    fontSize: 10,
    color: "#EF4444",
    marginLeft: 6,
    fontStyle: "italic",
  },
  locationUnlockedBanner: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 100,
  },
  locationUnlockedText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(128,128,128,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: { fontSize: 11, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  qtyBtn: {
    width: isSmallDevice ? 42 : 52,
    height: isSmallDevice ? 42 : 52,
    borderRadius: isSmallDevice ? 21 : 26,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCircle: {
    width: isSmallDevice ? 50 : 70,
    height: isSmallDevice ? 50 : 70,
    borderRadius: isSmallDevice ? 25 : 35,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyDisplay: {
    minWidth: 80,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  qtyText: { fontSize: 28, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  // Nuevos estilos para overlay de confirmación
  confirmedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 900,
    borderRadius: 20,
    overflow: "hidden",
  },
  confirmedContent: {
    alignItems: "center",
  },
  confirmedCircleOverlay: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  confirmedSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
  },
  editBtnOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editBtnSimpleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  confirmedIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 16,
    borderRadius: 40,
    marginBottom: 10,
  },
  editBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
  },
  footer: { paddingHorizontal: 20 },
  cardContainer: {
    flex: 1,
    padding: 15,
    justifyContent: "center",
  },

  // Scrubber Dock styles
  footerAction: {
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 25,
    width: "100%",
    elevation: 10,
    zIndex: 10,
  },
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
    backgroundColor: "rgba(0,0,0,0.6)",
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
  
  finishBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  finishBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  
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
  deckInfo: {
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  deckCount: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  deckDots: { flexDirection: "row", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  modalMessage: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnFull: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 16, fontWeight: "600" },
  qtyInput: {
    width: "100%",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  ventanillaModal: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 24,
    padding: 24,
  },
  ventanillaModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  ventanillaItem: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  ventanillaItemName: {
    fontSize: 14,
    fontWeight: "700",
  },
  ventanillaItemCode: {
    fontSize: 12,
    fontWeight: "500",
  },
  ventanillaModalBtnSecondary: {
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
  modalOverlayFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});
