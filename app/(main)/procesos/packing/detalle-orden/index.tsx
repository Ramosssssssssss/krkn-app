import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { API_URL } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArticleCardPacking,
  ArticleCardPackingHandle,
} from "../_components/ArticleCardPacking";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Caratula {
  R_FOLIO: string;
  R_FECHA: string;
  R_DESTINO: string;
  R_PICKER: string;
}

interface Articulo {
  ARTICULO_ID: number;
  NOMBRE: string;
  CODIGO: string;
  CODBAR: string;
  UNIDADES: number;
  ALL_CODES: string;
  empacado: number;
}

interface CajaCarton {
  CAJA_ID: number;
  NOMBRE: string;
  TIPO: string;
  CODIGO: string;
  CANT_USOS: number;
}

interface CajaInstancia {
  instanciaId: string;
  caja: CajaCarton;
  articulos: { articuloId: number; codigo: string; cantidad: number }[];
}

// ─── Sounds ──────────────────────────────────────────────────────────────────

const SOUNDS = {
  scan: require("../../../../../assets/sounds/check.wav"),
  done: require("../../../../../assets/sounds/done.mp3"),
  error: require("../../../../../assets/sounds/wrong.mp3"),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DetalleOrdenPackingScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const soundRef = useRef<Audio.Sound | null>(null);
  const scanLock = useRef(false);
  const pdaInputRef = useRef<TextInput>(null);
  const pdaArticuloInputRef = useRef<TextInput>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { onCameraTrigger } = useAssistive();

  const params = useLocalSearchParams<{
    folio: string;
    doctoId: string;
    almacen: string;
    sistema: string;
    descripcion: string;
  }>();

  // ─── State ───────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [caratula, setCaratula] = useState<Caratula | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  // Phases
  const [esperandoCaja, setEsperandoCaja] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState<"caja" | "articulo">("caja");

  // Cajas
  const [cajas, setCajas] = useState<CajaInstancia[]>([]);
  const [cajaActiva, setCajaActiva] = useState<string | null>(null);
  const [modoAgregarCaja, setModoAgregarCaja] = useState(false);
  const [validandoCaja, setValidandoCaja] = useState(false);

  // Filters & UI
  const [showFaltantes, setShowFaltantes] = useState(false);
  const [lastScanMessage, setLastScanMessage] = useState<string | null>(null);
  const [lastScanSuccess, setLastScanSuccess] = useState(true);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [pdaCajaValue, setPdaCajaValue] = useState("");
  const [pdaArticuloValue, setPdaArticuloValue] = useState("");

  // Función para abrir cámara con permisos
  const openScanner = async (mode: "caja" | "articulo") => {
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
    setScanMode(mode);
    scanLock.current = false;
    setScannerVisible(true);
  };

  // Completion
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [processingRemision, setProcessingRemision] = useState(false);
  const [completionModal, setCompletionModal] = useState(false);
  const [folioRemision, setFolioRemision] = useState<string | null>(null);

  // Caja detail modal
  const [cajaDetailModal, setCajaDetailModal] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Quick add caja modal
  const [showQuickCajaModal, setShowQuickCajaModal] = useState(false);

  // Swipeable cards refs
  const cardRefs = useRef<Map<number, ArticleCardPackingHandle>>(new Map());
  const [openCardId, setOpenCardId] = useState<number | null>(null);

  // Animations
  const flashAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ─── Derived State ───────────────────────────────────────────────────────

  const totalPiezas = Math.floor(
    articulos.reduce((s, a) => s + (a.UNIDADES || 0), 0),
  );
  const totalEmpacados = Math.floor(
    articulos.reduce((s, a) => s + (a.empacado || 0), 0),
  );
  const progreso = totalPiezas > 0 ? (totalEmpacados / totalPiezas) * 100 : 0;
  const lineasCompletas = articulos.filter(
    (a) => a.empacado >= a.UNIDADES,
  ).length;
  const todoListo =
    articulos.length > 0 && lineasCompletas === articulos.length;

  const sistemaColor =
    params.sistema?.toUpperCase() === "PEDIDO"
      ? "#3B82F6"
      : params.sistema?.toUpperCase() === "TRASPASO"
        ? "#8B5CF6"
        : "#10B981";

  // ─── Sound Helpers ───────────────────────────────────────────────────────

  const playSound = async (type: keyof typeof SOUNDS) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(SOUNDS[type], {
        shouldPlay: true,
        volume: type === "error" ? 1.0 : 0.8,
      });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.warn("Sound error:", e);
    }
  };

  // ─── Flash Animation ────────────────────────────────────────────────────

  const triggerFlash = (success: boolean) => {
    flashAnim.setValue(success ? 1 : -1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const flashBgColor = flashAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [
      "rgba(239,68,68,0.15)",
      "rgba(0,0,0,0)",
      "rgba(16,185,129,0.15)",
    ],
  });

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const [caratulaRes, detallesRes] = await Promise.all([
        fetch(`${API_URL}/api/caratula-packing.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            doctoId: params.doctoId,
            sistema: params.sistema,
          }),
        }),
        fetch(`${API_URL}/api/detalle-packing.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            doctoId: params.doctoId,
            sistema: params.sistema,
          }),
        }),
      ]);

      const caratulaData = await caratulaRes.json();
      const detallesData = await detallesRes.json();

      if (caratulaData.success && caratulaData.caratula?.length > 0) {
        setCaratula(caratulaData.caratula[0]);
      }

      if (detallesData.success && Array.isArray(detallesData.detalles)) {
        setArticulos(
          detallesData.detalles.map((a: any) => ({ ...a, empacado: 0 })),
        );
      }
    } catch (e) {
      console.error("Error fetching packing data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.doctoId, params.sistema]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progreso,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progreso, progressAnim]);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // ─── Assistive Touch Camera Trigger ─────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onCameraTrigger(async () => {
      // Si estamos esperando caja, escanear caja, si no, escanear artículo
      const mode = esperandoCaja ? "caja" : "articulo";
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
      setScanMode(mode);
      scanLock.current = false;
      setScannerVisible(true);
    });
    return unsubscribe;
  }, [onCameraTrigger, permission, requestPermission, esperandoCaja]);

  // ─── Box Validation ──────────────────────────────────────────────────────

  const validarCaja = async (codigo: string) => {
    // Evitar doble validación
    if (validandoCaja) return;

    // Normalizar: limpiar espacios y caracteres ocultos, convertir a mayúsculas
    const codigoLimpio = codigo
      .trim()
      .replace(/[\\r\\n\\t]/g, "")
      .toUpperCase();
    console.log(
      "Validando caja:",
      JSON.stringify(codigoLimpio),
      "length:",
      codigoLimpio.length,
    );

    if (!codigoLimpio) {
      return;
    }

    setValidandoCaja(true);

    try {
      const databaseId = getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/validar-caja-carton.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, codigo: codigoLimpio }),
      });
      const data = await res.json();
      console.log("Respuesta validar caja:", data);

      if (data.success && data.caja) {
        const caja: CajaCarton = data.caja;
        const instanciaId = `${caja.CAJA_ID}-${Date.now()}`;
        const nuevaCaja: CajaInstancia = {
          instanciaId,
          caja,
          articulos: [],
        };

        setCajas((prev) => [...prev, nuevaCaja]);
        setCajaActiva(instanciaId);
        setEsperandoCaja(false);
        setModoAgregarCaja(false);
        setScanMode("articulo");

        playSound("done");
        Vibration.vibrate(100);
        setLastScanMessage(`Caja: ${caja.NOMBRE}`);
        setLastScanSuccess(true);
        triggerFlash(true);
      } else {
        playSound("error");
        Vibration.vibrate([0, 100, 50, 100]);
        setLastScanMessage("Caja no encontrada");
        setLastScanSuccess(false);
        triggerFlash(false);
      }
    } catch (_e) {
      playSound("error");
      setLastScanMessage("Error al validar caja");
      setLastScanSuccess(false);
    } finally {
      setValidandoCaja(false);
    }
  };

  // ─── Article Scanning ────────────────────────────────────────────────────

  const procesarScanArticulo = (code: string) => {
    const codeLower = code.toLowerCase().trim();

    const artIdx = articulos.findIndex((a) => {
      if ((a.CODIGO || "").toLowerCase() === codeLower) return true;
      if ((a.CODBAR || "").toLowerCase() === codeLower) return true;
      if (a.ALL_CODES) {
        const allCodes = a.ALL_CODES.split("|").map((c) =>
          c.toLowerCase().trim(),
        );
        if (allCodes.includes(codeLower)) return true;
      }
      return false;
    });

    if (artIdx === -1) {
      playSound("error");
      Vibration.vibrate([0, 100, 50, 100]);
      setLastScanMessage(`No encontrado: ${code}`);
      setLastScanSuccess(false);
      triggerFlash(false);
      return;
    }

    const art = articulos[artIdx];

    if (art.empacado >= art.UNIDADES) {
      playSound("error");
      Vibration.vibrate([0, 100, 50, 100]);
      setLastScanMessage(`${art.CODIGO} ya completado`);
      setLastScanSuccess(false);
      triggerFlash(false);
      return;
    }

    // Increment packed count
    const updated = [...articulos];
    updated[artIdx] = { ...art, empacado: art.empacado + 1 };
    setArticulos(updated);

    // Add to active box
    if (cajaActiva) {
      setCajas((prev) =>
        prev.map((c) => {
          if (c.instanciaId !== cajaActiva) return c;
          const existing = c.articulos.find(
            (ca) => ca.articuloId === art.ARTICULO_ID,
          );
          if (existing) {
            return {
              ...c,
              articulos: c.articulos.map((ca) =>
                ca.articuloId === art.ARTICULO_ID
                  ? { ...ca, cantidad: ca.cantidad + 1 }
                  : ca,
              ),
            };
          }
          return {
            ...c,
            articulos: [
              ...c.articulos,
              {
                articuloId: art.ARTICULO_ID,
                codigo: art.CODIGO,
                cantidad: 1,
              },
            ],
          };
        }),
      );
    }

    playSound("scan");
    Vibration.vibrate(50);
    setLastScanMessage(
      `✓ ${art.CODIGO} (${Math.floor(art.empacado + 1)}/${Math.floor(art.UNIDADES)})`,
    );
    setLastScanSuccess(true);
    triggerFlash(true);
  };

  // ─── Handle Barcode Scanned ──────────────────────────────────────────────

  const handleBarcodeScan = (data: string) => {
    // Prevenir escaneos duplicados
    if (scanCooldown || scanLock.current) return;

    scanLock.current = true;
    setScanCooldown(true);

    // Liberar lock después de cooldown
    setTimeout(() => {
      setScanCooldown(false);
      scanLock.current = false;
    }, 800);

    if (scanMode === "caja" || esperandoCaja || modoAgregarCaja) {
      validarCaja(data);
      setScannerVisible(false);
    } else {
      procesarScanArticulo(data);
    }
  };

  // ─── Manual increment/decrement ──────────────────────────────────────────

  const incrementArticulo = (articuloId: number) => {
    const art = articulos.find((a) => a.ARTICULO_ID === articuloId);
    if (!art || art.empacado >= art.UNIDADES) return;

    setArticulos((prev) =>
      prev.map((a) =>
        a.ARTICULO_ID === articuloId ? { ...a, empacado: a.empacado + 1 } : a,
      ),
    );

    if (cajaActiva) {
      setCajas((prev) =>
        prev.map((c) => {
          if (c.instanciaId !== cajaActiva) return c;
          const existing = c.articulos.find(
            (ca) => ca.articuloId === articuloId,
          );
          if (existing) {
            return {
              ...c,
              articulos: c.articulos.map((ca) =>
                ca.articuloId === articuloId
                  ? { ...ca, cantidad: ca.cantidad + 1 }
                  : ca,
              ),
            };
          }
          return {
            ...c,
            articulos: [
              ...c.articulos,
              { articuloId, codigo: art.CODIGO, cantidad: 1 },
            ],
          };
        }),
      );
    }
    playSound("scan");
    Vibration.vibrate(50);
  };

  const decrementArticulo = (articuloId: number) => {
    setArticulos((prev) =>
      prev.map((a) => {
        if (a.ARTICULO_ID !== articuloId) return a;
        if (a.empacado <= 0) return a;
        return { ...a, empacado: a.empacado - 1 };
      }),
    );
    if (cajaActiva) {
      setCajas((prev) =>
        prev.map((c) => {
          if (c.instanciaId !== cajaActiva) return c;
          return {
            ...c,
            articulos: c.articulos
              .map((ca) =>
                ca.articuloId === articuloId
                  ? { ...ca, cantidad: ca.cantidad - 1 }
                  : ca,
              )
              .filter((ca) => ca.cantidad > 0),
          };
        }),
      );
    }
  };

  const fillArticulo = (articuloId: number) => {
    const art = articulos.find((a) => a.ARTICULO_ID === articuloId);
    if (!art || art.empacado >= art.UNIDADES) return;

    const diff = art.UNIDADES - art.empacado;
    setArticulos((prev) =>
      prev.map((a) =>
        a.ARTICULO_ID === articuloId ? { ...a, empacado: a.UNIDADES } : a,
      ),
    );

    if (cajaActiva) {
      setCajas((prev) =>
        prev.map((c) => {
          if (c.instanciaId !== cajaActiva) return c;
          const existing = c.articulos.find(
            (ca) => ca.articuloId === articuloId,
          );
          if (existing) {
            return {
              ...c,
              articulos: c.articulos.map((ca) =>
                ca.articuloId === articuloId
                  ? { ...ca, cantidad: ca.cantidad + diff }
                  : ca,
              ),
            };
          }
          return {
            ...c,
            articulos: [
              ...c.articulos,
              { articuloId, codigo: art.CODIGO, cantidad: diff },
            ],
          };
        }),
      );
    }
    playSound("done");
    Vibration.vibrate(100);
  };

  // ─── Confirm Packing ─────────────────────────────────────────────────────

  const confirmarPacking = async () => {
    if (!todoListo) {
      Alert.alert(
        "Incompleto",
        "Aún no completas todas las líneas o piezas requeridas.",
      );
      return;
    }
    // Igual que en web: ir directo al modal de confirmación sin verificar disponible
    setConfirmModalVisible(true);
  };

  // ─── Remisionar ──────────────────────────────────────────────────────────

  const handleRemisionar = async () => {
    setProcessingRemision(true);

    try {
      const databaseId = getCurrentDatabaseId();
      const folio = caratula?.R_FOLIO || params.folio;
      const tipoDocumento = params.sistema?.toUpperCase();

      // Determine endpoint based on document type
      const endpoint =
        tipoDocumento === "TRASPASO" || folio?.startsWith("T")
          ? "remisionar-traspaso"
          : "remisionar-pedido";

      const remisionRes = await fetch(`${API_URL}/api/${endpoint}.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, folio }),
      });
      const remisionData = await remisionRes.json();

      if (!remisionData.success) {
        throw new Error(remisionData.message || "Error al remisionar");
      }

      // Save packing record
      const detalleCajasJSON = JSON.stringify(
        cajas.map((c) => ({
          instanciaId: c.instanciaId,
          nombre: c.caja.NOMBRE,
          tipo: c.caja.TIPO,
          articulos: c.articulos,
        })),
      );

      await fetch(`${API_URL}/api/registrar-packing.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          usuario: user?.USERNAME || "MOVIL",
          folioOrden: folio,
          tipoDocumento,
          destino: caratula?.R_DESTINO || params.almacen,
          totalLineas: articulos.length,
          totalPiezas: totalEmpacados,
          cantidadCajas: cajas.length,
          detalleCajas: detalleCajasJSON,
          folioRemision: remisionData.folio || folio,
          estado: "COMPLETADO",
        }),
      });

      setFolioRemision(remisionData.folio || folio);
      setConfirmModalVisible(false);
      setCompletionModal(true);
      playSound("done");
      Vibration.vibrate(200);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Error al remisionar");
    } finally {
      setProcessingRemision(false);
    }
  };

  // ─── Filtered articles ───────────────────────────────────────────────────

  const articulosFiltrados = showFaltantes
    ? articulos.filter((a) => a.empacado < a.UNIDADES)
    : articulos;

  // ─── Handle Swipe Open ───────────────────────────────────────────────────

  const handleSwipeOpen = (articuloId: number) => {
    // Close previously opened card
    if (openCardId !== null && openCardId !== articuloId) {
      cardRefs.current.get(openCardId)?.close();
    }
    setOpenCardId(articuloId);
  };

  // ─── Handle Set Quantity (for swipe modal) ───────────────────────────────

  const setQuantityArticulo = (articuloId: number, qty: number) => {
    const art = articulos.find((a) => a.ARTICULO_ID === articuloId);
    if (!art) return;

    const oldEmpacado = art.empacado;
    const newEmpacado = Math.min(qty, art.UNIDADES);
    const diff = newEmpacado - oldEmpacado;

    setArticulos((prev) =>
      prev.map((a) =>
        a.ARTICULO_ID === articuloId ? { ...a, empacado: newEmpacado } : a,
      ),
    );

    // Update active box if there's one active
    if (cajaActiva && diff !== 0) {
      setCajas((prev) =>
        prev.map((c) => {
          if (c.instanciaId !== cajaActiva) return c;
          const existing = c.articulos.find(
            (ca) => ca.articuloId === articuloId,
          );
          if (existing) {
            const newCantidad = existing.cantidad + diff;
            if (newCantidad <= 0) {
              return {
                ...c,
                articulos: c.articulos.filter(
                  (ca) => ca.articuloId !== articuloId,
                ),
              };
            }
            return {
              ...c,
              articulos: c.articulos.map((ca) =>
                ca.articuloId === articuloId
                  ? { ...ca, cantidad: newCantidad }
                  : ca,
              ),
            };
          } else if (diff > 0) {
            return {
              ...c,
              articulos: [
                ...c.articulos,
                { articuloId, codigo: art.CODIGO, cantidad: diff },
              ],
            };
          }
          return c;
        }),
      );
    }

    playSound("scan");
    Vibration.vibrate(50);
  };

  // ─── Render Article Card ─────────────────────────────────────────────────

  const renderArticulo = ({
    item,
    index,
  }: {
    item: Articulo;
    index: number;
  }) => {
    return (
      <ArticleCardPacking
        ref={(ref) => {
          if (ref) {
            cardRefs.current.set(item.ARTICULO_ID, ref);
          } else {
            cardRefs.current.delete(item.ARTICULO_ID);
          }
        }}
        item={item}
        index={index}
        colors={colors}
        sistemaColor={sistemaColor}
        disabled={esperandoCaja}
        onIncrement={incrementArticulo}
        onDecrement={decrementArticulo}
        onFill={fillArticulo}
        onSetQuantity={setQuantityArticulo}
        onSwipeOpen={handleSwipeOpen}
      />
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={sistemaColor} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando orden...
        </Text>
      </View>
    );
  }

  // ─── Waiting for Box Scan ───────────────────────────────────────────────

  if (esperandoCaja) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 8, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.headerBackBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <View
                style={[
                  styles.sistemaBadge,
                  { backgroundColor: `${sistemaColor}18` },
                ]}
              >
                <Text
                  style={[styles.sistemaBadgeText, { color: sistemaColor }]}
                >
                  {params.sistema}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {params.folio}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>

        {/* Waiting card */}
        {/* Input invisible para PDA scanner - captura agresiva pero sin bloquear UI */}
        <TextInput
          ref={pdaInputRef}
          autoFocus
          showSoftInputOnFocus={false}
          caretHidden
          value={pdaCajaValue}
          onChangeText={setPdaCajaValue}
          style={{
            position: "absolute",
            top: -100,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
          }}
          onSubmitEditing={() => {
            const code = pdaCajaValue.trim();
            setPdaCajaValue("");
            if (code) {
              validarCaja(code);
            }
          }}
          blurOnSubmit={false}
          onBlur={() => {
            setTimeout(() => pdaInputRef.current?.focus(), 50);
          }}
        />
        <View style={styles.esperandoCajaContainer}>
          <View
            style={[
              styles.esperandoCajaCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.esperandoCajaIcon,
                { backgroundColor: `${sistemaColor}12` },
              ]}
            >
              <Ionicons name="cube-outline" size={44} color={sistemaColor} />
            </View>
            <Text style={[styles.esperandoCajaTitle, { color: colors.text }]}>
              {validandoCaja ? "Validando..." : "Escanea una Caja"}
            </Text>
            <Text
              style={[
                styles.esperandoCajaDesc,
                { color: colors.textSecondary },
              ]}
            >
              {validandoCaja
                ? "Espera un momento..."
                : "Escanea el código de una caja de cartón\npara comenzar a empacar"}
            </Text>

            {validandoCaja ? (
              <View
                style={[
                  styles.scanCajaBtn,
                  { backgroundColor: sistemaColor, opacity: 0.7 },
                ]}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.scanCajaBtnText}>Procesando...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.scanCajaBtn, { backgroundColor: sistemaColor }]}
                onPress={() => openScanner("caja")}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={20} color="#fff" />
                <Text style={styles.scanCajaBtnText}>Abrir Escáner</Text>
              </TouchableOpacity>
            )}

            {/* Quick shortcut buttons (1, 2, 3) */}
            <View
              style={[styles.shortcutRow, validandoCaja && { opacity: 0.5 }]}
            >
              {["1", "2", "3"].map((code) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.shortcutBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)",
                    },
                  ]}
                  onPress={() => validarCaja(code)}
                  activeOpacity={0.7}
                  disabled={validandoCaja}
                >
                  <Ionicons
                    name="cube"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.shortcutBtnText, { color: colors.text }]}
                  >
                    Caja {code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <CameraScannerPicking
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onBarcodeScanned={handleBarcodeScan}
          topInset={insets.top}
          title="Escanear Caja"
          lastScanMessage={lastScanMessage}
          lastScanSuccess={lastScanSuccess}
        />
      </View>
    );
  }

  // ─── Main Packing View ──────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        { backgroundColor: flashBgColor },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Input invisible para PDA scanner - captura agresiva de artículos */}
      <TextInput
        ref={pdaArticuloInputRef}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        value={pdaArticuloValue}
        onChangeText={setPdaArticuloValue}
        style={{
          position: "absolute",
          top: -100,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0,
        }}
        onSubmitEditing={() => {
          const code = pdaArticuloValue.trim();
          setPdaArticuloValue("");
          if (code) {
            procesarScanArticulo(code);
          }
        }}
        blurOnSubmit={false}
        onBlur={() => {
          setTimeout(() => pdaArticuloInputRef.current?.focus(), 50);
        }}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerBackBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View
              style={[
                styles.sistemaBadge,
                { backgroundColor: `${sistemaColor}18` },
              ]}
            >
              <Text style={[styles.sistemaBadgeText, { color: sistemaColor }]}>
                {params.sistema}
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {params.folio}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openScanner("articulo")}
            style={[styles.headerScanBtn, { backgroundColor: sistemaColor }]}
            activeOpacity={0.8}
          >
            <Ionicons name="scan" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Caratula inline pills */}
        {caratula && (
          <View style={styles.caratulaContainer}>
            <View
              style={[
                styles.caratulaPill,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Ionicons name="location" size={12} color={colors.textTertiary} />
              <Text
                style={[
                  styles.caratulaPillText,
                  { color: colors.textSecondary },
                ]}
              >
                {caratula.R_DESTINO || params.almacen}
              </Text>
            </View>
            <View
              style={[
                styles.caratulaPill,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Ionicons name="person" size={12} color={colors.textTertiary} />
              <Text
                style={[
                  styles.caratulaPillText,
                  { color: colors.textSecondary },
                ]}
              >
                {caratula.R_PICKER || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Compact Progress + Info */}
        <View
          style={[
            styles.compactProgressRow,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.02)",
              borderColor: colors.border,
            },
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.compactProgressLabels}>
              <Text
                style={[
                  styles.compactProgressPct,
                  { color: todoListo ? colors.success : colors.text },
                ]}
              >
                {Math.round(progreso)}%
              </Text>
              <Text
                style={[
                  styles.compactProgressText,
                  { color: colors.textTertiary },
                ]}
              >
                {lineasCompletas}/{articulos.length} líneas · {totalEmpacados}/
                {totalPiezas} pzas
              </Text>
            </View>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: todoListo ? colors.success : sistemaColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.compactBtnGroup}>
            <TouchableOpacity
              onPress={() => setShowInfoModal(true)}
              style={[
                styles.compactIconBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="stats-chart"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowQuickCajaModal(true)}
              style={[
                styles.compactIconBtn,
                { backgroundColor: `${sistemaColor}12` },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="cube" size={15} color={sistemaColor} />
              <View
                style={[styles.compactBadge, { backgroundColor: sistemaColor }]}
              >
                <Text style={styles.compactBadgeText}>{cajas.length}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cajas Chips - Horizontal Scroll (Grouped) */}
        {cajas.length > 0 &&
          (() => {
            // Group cajas by CAJA_ID
            const grouped = cajas.reduce(
              (acc, c) => {
                const key = c.caja.CAJA_ID;
                if (!acc[key]) {
                  acc[key] = {
                    nombre: c.caja.NOMBRE,
                    cajaId: c.caja.CAJA_ID,
                    instancias: [],
                    totalPiezas: 0,
                  };
                }
                acc[key].instancias.push(c);
                acc[key].totalPiezas += c.articulos.reduce(
                  (s, a) => s + a.cantidad,
                  0,
                );
                return acc;
              },
              {} as Record<
                number,
                {
                  nombre: string;
                  cajaId: number;
                  instancias: typeof cajas;
                  totalPiezas: number;
                }
              >,
            );

            const groups = Object.values(grouped);

            return (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cajasChipsScroll}
                contentContainerStyle={styles.cajasChipsContent}
              >
                {groups.map((g) => {
                  const isActiveGroup = g.instancias.some(
                    (i) => i.instanciaId === cajaActiva,
                  );
                  const activeInstance =
                    g.instancias.find((i) => i.instanciaId === cajaActiva) ||
                    g.instancias[0];

                  return (
                    <TouchableOpacity
                      key={g.cajaId}
                      style={[
                        styles.cajaChip,
                        {
                          backgroundColor: isActiveGroup
                            ? sistemaColor
                            : colors.surface,
                          borderColor: isActiveGroup
                            ? sistemaColor
                            : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        setCajaActiva(activeInstance.instanciaId);
                        setCajaDetailModal(activeInstance.instanciaId);
                      }}
                    >
                      <Ionicons
                        name="cube"
                        size={12}
                        color={isActiveGroup ? "#fff" : colors.text}
                      />
                      <Text
                        style={[
                          styles.cajaChipText,
                          { color: isActiveGroup ? "#fff" : colors.text },
                        ]}
                      >
                        {g.nombre}{" "}
                        {g.instancias.length > 1
                          ? `×${g.instancias.length}`
                          : ""}{" "}
                        ({g.totalPiezas})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            );
          })()}

        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              showFaltantes && {
                backgroundColor: `${sistemaColor}15`,
                borderColor: sistemaColor,
              },
              !showFaltantes && { borderColor: colors.border },
            ]}
            onPress={() => setShowFaltantes(!showFaltantes)}
          >
            <Ionicons
              name={showFaltantes ? "eye" : "eye-outline"}
              size={14}
              color={showFaltantes ? sistemaColor : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterBtnText,
                {
                  color: showFaltantes ? sistemaColor : colors.textSecondary,
                },
              ]}
            >
              Faltantes
            </Text>
          </TouchableOpacity>

          {lastScanMessage && (
            <View
              style={[
                styles.lastScanBadge,
                {
                  backgroundColor: lastScanSuccess
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(239,68,68,0.1)",
                },
              ]}
            >
              <Ionicons
                name={lastScanSuccess ? "checkmark-circle" : "alert-circle"}
                size={12}
                color={lastScanSuccess ? "#10B981" : "#EF4444"}
              />
              <Text
                style={[
                  styles.lastScanText,
                  { color: lastScanSuccess ? "#10B981" : "#EF4444" },
                ]}
                numberOfLines={1}
              >
                {lastScanMessage}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Articles List */}
      <FlatList
        data={articulosFiltrados}
        renderItem={renderArticulo}
        keyExtractor={(item) => String(item.ARTICULO_ID)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={sistemaColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {showFaltantes
                ? "¡Todos los artículos están completos!"
                : "No hay artículos"}
            </Text>
          </View>
        }
      />

      {/* Footer */}
      {todoListo && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 12,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.success }]}
            onPress={confirmarPacking}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirmar Packing</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Camera Scanner */}
      <CameraScannerPicking
        visible={scannerVisible}
        onClose={() => {
          setScannerVisible(false);
          setModoAgregarCaja(false);
        }}
        onBarcodeScanned={handleBarcodeScan}
        topInset={insets.top}
        title={scanMode === "caja" ? "Escanear Caja" : "Escanear Artículo"}
        lastScanMessage={lastScanMessage}
        lastScanSuccess={lastScanSuccess}
      />

      {/* ─── Info Stats Modal (iOS Bottom Sheet) ───────────────────── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={{ flex: 1 }} />
          <View
            style={[styles.sheetContainer, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            {/* iOS pill handle */}
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                },
              ]}
            />

            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Resumen de Orden
            </Text>

            {/* Progress */}
            <View
              style={[
                styles.sheetStatRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.sheetStatIconWrap,
                  { backgroundColor: `${sistemaColor}12` },
                ]}
              >
                <Ionicons name="pie-chart" size={18} color={sistemaColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetStatLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  Progreso
                </Text>
                <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                  {Math.round(progreso)}%
                </Text>
              </View>
              <View
                style={[
                  styles.sheetProgressMini,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.sheetProgressMiniFill,
                    {
                      backgroundColor: todoListo
                        ? colors.success
                        : sistemaColor,
                      width: `${Math.min(progreso, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Líneas */}
            <View
              style={[
                styles.sheetStatRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.sheetStatIconWrap,
                  { backgroundColor: "rgba(59,130,246,0.1)" },
                ]}
              >
                <Ionicons name="list" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetStatLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  Líneas Completas
                </Text>
                <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                  {lineasCompletas} de {articulos.length}
                </Text>
              </View>
              {lineasCompletas === articulos.length && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />
              )}
            </View>

            {/* Piezas */}
            <View
              style={[
                styles.sheetStatRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.sheetStatIconWrap,
                  { backgroundColor: "rgba(245,158,11,0.1)" },
                ]}
              >
                <Ionicons name="cube" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetStatLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  Piezas Empacadas
                </Text>
                <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                  {totalEmpacados} de {totalPiezas}
                </Text>
              </View>
              {totalEmpacados >= totalPiezas && totalPiezas > 0 && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />
              )}
            </View>

            {/* Cajas */}
            <View style={[styles.sheetStatRow, { borderBottomWidth: 0 }]}>
              <View
                style={[
                  styles.sheetStatIconWrap,
                  { backgroundColor: "rgba(139,92,246,0.1)" },
                ]}
              >
                <Ionicons name="archive" size={18} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetStatLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  Cajas Utilizadas
                </Text>
                <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                  {cajas.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowInfoModal(false);
                  setShowQuickCajaModal(true);
                }}
                style={[
                  styles.sheetInlineBtn,
                  { backgroundColor: `${sistemaColor}12` },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={15} color={sistemaColor} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: sistemaColor,
                  }}
                >
                  Agregar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Destino + Picker */}
            {caratula && (
              <View
                style={[
                  styles.sheetFooterInfo,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <View style={styles.sheetFooterRow}>
                  <Ionicons
                    name="location"
                    size={13}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      fontWeight: "500",
                    }}
                  >
                    {caratula.R_DESTINO || params.almacen}
                  </Text>
                </View>
                <View style={styles.sheetFooterRow}>
                  <Ionicons
                    name="person"
                    size={13}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      fontWeight: "500",
                    }}
                  >
                    {caratula.R_PICKER || "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={[
                styles.sheetCloseBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
              onPress={() => setShowInfoModal(false)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sheetCloseBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Confirm Packing Modal (iOS Alert Style) ─────────────── */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <BlurView
            intensity={60}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[
              styles.alertCard,
              { backgroundColor: isDark ? colors.surface : "#fff" },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.alertIconRing,
                { backgroundColor: `${sistemaColor}08` },
              ]}
            >
              <View
                style={[
                  styles.alertIconCircle,
                  { backgroundColor: `${sistemaColor}15` },
                ]}
              >
                <Ionicons name="cube" size={28} color={sistemaColor} />
              </View>
            </View>

            <Text style={[styles.alertTitle, { color: colors.text }]}>
              Confirmar Packing
            </Text>
            <Text
              style={[styles.alertSubtitle, { color: colors.textSecondary }]}
            >
              {params.folio}
            </Text>

            {/* Stats Row */}
            <View style={styles.alertStatsRow}>
              {[
                { value: articulos.length, label: "Líneas" },
                { value: totalEmpacados, label: "Piezas" },
                { value: cajas.length, label: "Cajas" },
              ].map((stat, i) => (
                <View
                  key={i}
                  style={[
                    styles.alertStatPill,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                >
                  <Text
                    style={[styles.alertStatValue, { color: sistemaColor }]}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={[
                      styles.alertStatLabel,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View
              style={[styles.alertDivider, { backgroundColor: colors.border }]}
            />

            {/* iOS-style stacked buttons */}
            <TouchableOpacity
              style={[
                styles.alertPrimaryBtn,
                { backgroundColor: colors.success },
              ]}
              onPress={handleRemisionar}
              disabled={processingRemision}
              activeOpacity={0.8}
            >
              {processingRemision ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.alertPrimaryText}>Remisionar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alertCancelBtn}
              onPress={() => setConfirmModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.alertCancelText, { color: colors.error }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Completion Modal (iOS Success Sheet) ──────────────────── */}
      <Modal
        visible={completionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.sheetOverlay}>
          <BlurView
            intensity={80}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                },
              ]}
            />

            {/* Success checkmark animation */}
            <View style={styles.successRingOuter}>
              <View style={styles.successRingMiddle}>
                <View style={styles.successRingInner}>
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
              </View>
            </View>

            <Text
              style={[styles.sheetTitle, { color: colors.text, marginTop: 16 }]}
            >
              ¡Remisión Completa!
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: colors.textSecondary }]}
            >
              {folioRemision || params.folio}
            </Text>

            {/* Stats */}
            <View style={styles.successStatsRow}>
              <View
                style={[
                  styles.successStatBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(16,185,129,0.06)",
                  },
                ]}
              >
                <Ionicons name="cube" size={22} color={colors.success} />
                <Text
                  style={[styles.successStatValue, { color: colors.success }]}
                >
                  {totalEmpacados}
                </Text>
                <Text
                  style={[
                    styles.successStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Piezas
                </Text>
              </View>
              <View
                style={[
                  styles.successStatBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(16,185,129,0.06)",
                  },
                ]}
              >
                <Ionicons name="archive" size={22} color={colors.success} />
                <Text
                  style={[styles.successStatValue, { color: colors.success }]}
                >
                  {cajas.length}
                </Text>
                <Text
                  style={[
                    styles.successStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cajas
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.successDoneBtn,
                { backgroundColor: colors.success },
              ]}
              onPress={() => {
                setCompletionModal(false);
                router.back();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.successDoneBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Caja Detail Modal (iOS Bottom Sheet) ───────────────────── */}
      <Modal
        visible={!!cajaDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCajaDetailModal(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setCajaDetailModal(null)}
        >
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
                maxHeight: "75%",
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                },
              ]}
            />
            {(() => {
              const caja = cajas.find((c) => c.instanciaId === cajaDetailModal);
              if (!caja) return null;
              const piezasEnCaja = caja.articulos.reduce(
                (s, a) => s + a.cantidad,
                0,
              );
              const isActive = caja.instanciaId === cajaActiva;
              return (
                <>
                  {/* Header */}
                  <View style={styles.cajaSheetHeader}>
                    <View
                      style={[
                        styles.cajaSheetIconWrap,
                        { backgroundColor: `${sistemaColor}12` },
                      ]}
                    >
                      <Ionicons name="archive" size={20} color={sistemaColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[styles.cajaSheetName, { color: colors.text }]}
                      >
                        {caja.caja.NOMBRE}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textTertiary,
                            fontWeight: "500",
                          }}
                        >
                          {caja.caja.TIPO}
                        </Text>
                        <View
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: 1.5,
                            backgroundColor: colors.textTertiary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textTertiary,
                            fontWeight: "500",
                          }}
                        >
                          {piezasEnCaja} pzas
                        </Text>
                        {isActive && (
                          <View
                            style={[
                              styles.cajaActivePill,
                              { backgroundColor: `${sistemaColor}15` },
                            ]}
                          >
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 2.5,
                                backgroundColor: sistemaColor,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: sistemaColor,
                              }}
                            >
                              Activa
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.cajaSheetDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  {caja.articulos.length === 0 ? (
                    <View style={styles.cajaSheetEmpty}>
                      <View
                        style={[
                          styles.cajaSheetEmptyIcon,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(0,0,0,0.03)",
                          },
                        ]}
                      >
                        <Ionicons
                          name="cube-outline"
                          size={28}
                          color={colors.textTertiary}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.textSecondary,
                        }}
                      >
                        Caja vacía
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: colors.textTertiary }}
                      >
                        Escanea artículos para agregar
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={caja.articulos}
                      keyExtractor={(item) => String(item.articuloId)}
                      renderItem={({ item, index }) => {
                        const artFull = articulos.find(
                          (a) => a.ARTICULO_ID === item.articuloId,
                        );
                        return (
                          <View
                            style={[
                              styles.cajaArtRow,
                              index === caja.articulos.length - 1 && {
                                borderBottomWidth: 0,
                              },
                              { borderBottomColor: colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.cajaArtIndex,
                                { backgroundColor: `${sistemaColor}08` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.cajaArtIndexText,
                                  { color: sistemaColor },
                                ]}
                              >
                                {index + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[
                                  styles.cajaArtName,
                                  { color: colors.text },
                                ]}
                                numberOfLines={1}
                              >
                                {artFull?.NOMBRE || item.codigo}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "500",
                                  color: colors.textTertiary,
                                  marginTop: 1,
                                }}
                              >
                                {item.codigo}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.cajaArtQtyBadge,
                                { backgroundColor: `${sistemaColor}10` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.cajaArtQty,
                                  { color: sistemaColor },
                                ]}
                              >
                                ×{item.cantidad}
                              </Text>
                            </View>
                          </View>
                        );
                      }}
                      style={{ maxHeight: 260 }}
                      showsVerticalScrollIndicator={false}
                    />
                  )}

                  {!isActive && (
                    <TouchableOpacity
                      style={[
                        styles.cajaActivateBtn,
                        { backgroundColor: sistemaColor },
                      ]}
                      onPress={() => {
                        setCajaActiva(caja.instanciaId);
                        setCajaDetailModal(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="radio-button-on" size={15} color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        Establecer como Activa
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.sheetCloseBtn,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => setCajaDetailModal(null)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sheetCloseBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Quick Add Caja Modal (iOS Action Sheet) ──────────────── */}
      <Modal
        visible={showQuickCajaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickCajaModal(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickCajaModal(false)}
        >
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                },
              ]}
            />

            <View
              style={[
                styles.quickCajaHeaderIcon,
                { backgroundColor: `${sistemaColor}10` },
              ]}
            >
              <Ionicons name="add-circle" size={24} color={sistemaColor} />
            </View>

            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Agregar Caja
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: colors.textSecondary }]}
            >
              Selecciona un tipo de caja
            </Text>

            <View style={styles.quickCajaGrid}>
              {["1", "2", "3"].map((code) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.quickCajaItem,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                    },
                  ]}
                  onPress={() => {
                    setShowQuickCajaModal(false);
                    validarCaja(code);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.quickCajaItemIcon,
                      { backgroundColor: `${sistemaColor}10` },
                    ]}
                  >
                    <Ionicons name="cube" size={18} color={sistemaColor} />
                  </View>
                  <Text
                    style={[styles.quickCajaItemText, { color: colors.text }]}
                  >
                    Caja {code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={[
                styles.quickCajaOrDivider,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                o escanea
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.quickCajaScanAction,
                { backgroundColor: sistemaColor },
              ]}
              onPress={() => {
                setShowQuickCajaModal(false);
                setModoAgregarCaja(true);
                openScanner("caja");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={17} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                Escanear otra caja
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sheetCloseBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
              onPress={() => setShowQuickCajaModal(false)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sheetCloseBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: "500" },

  // ─── Header ──────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { flex: 1, alignItems: "center" },
  sistemaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  sistemaBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  headerScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── Caratula (inline pills) ─────────────────────────────────────────
  caratulaContainer: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  caratulaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  caratulaPillText: { fontSize: 12, fontWeight: "500" },

  // ─── Compact Progress Row ────────────────────────────────────────────
  compactProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compactProgressLabels: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  compactProgressPct: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  compactProgressText: {
    fontSize: 11,
    fontWeight: "500",
  },
  compactBtnGroup: {
    flexDirection: "row",
    gap: 6,
  },
  compactIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  compactBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  compactBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },

  // ─── Progress ────────────────────────────────────────────────────────
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },

  // ─── Cajas Chips ─────────────────────────────────────────────────────
  cajasChipsScroll: {
    marginTop: 10,
    marginHorizontal: -16,
  },
  cajasChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cajaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  cajaChipText: { fontSize: 11, fontWeight: "600" },

  // ─── Filters ─────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontWeight: "600" },
  lastScanBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  lastScanText: { fontSize: 11, fontWeight: "600", flex: 1 },

  // ─── List ────────────────────────────────────────────────────────────
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: { fontSize: 15, fontWeight: "500", textAlign: "center" },

  // ─── Footer ──────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  scanButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ─── Waiting for Box ─────────────────────────────────────────────────
  esperandoCajaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  esperandoCajaCard: {
    width: "100%",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  esperandoCajaIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  esperandoCajaTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  esperandoCajaDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  scanCajaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    width: "100%",
  },
  scanCajaBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  shortcutRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  shortcutBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  shortcutBtnText: { fontSize: 12, fontWeight: "600" },

  // ═══════════════════════════════════════════════════════════════════════
  // iOS SHEET (Bottom Sheet) — shared across Info, Caja Detail, Quick Add
  // ═══════════════════════════════════════════════════════════════════════
  sheetOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
    opacity: 0.6,
  },
  sheetCloseBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetCloseBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // ─── Sheet Stat Rows (Info Modal) ────────────────────────────────────
  sheetStatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sheetStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sheetStatValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },
  sheetProgressMini: {
    width: 48,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  sheetProgressMiniFill: {
    height: "100%",
    borderRadius: 3,
  },
  sheetInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sheetFooterInfo: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  sheetFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // iOS ALERT — centered card (Confirm Packing)
  // ═══════════════════════════════════════════════════════════════════════
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  alertCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  alertIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  alertSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 18,
    opacity: 0.6,
  },
  alertStatsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 18,
  },
  alertStatPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  alertStatValue: { fontSize: 20, fontWeight: "800" },
  alertStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  alertDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  alertPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    marginBottom: 6,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  alertPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  alertCancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  alertCancelText: { fontSize: 15, fontWeight: "600" },

  // ═══════════════════════════════════════════════════════════════════════
  // Success (Completion Modal)
  // ═══════════════════════════════════════════════════════════════════════
  successRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(16,185,129,0.06)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 8,
  },
  successRingMiddle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(16,185,129,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  successRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  successStatsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 20,
  },
  successStatBox: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
  },
  successStatValue: { fontSize: 24, fontWeight: "800" },
  successStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  successDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  successDoneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ═══════════════════════════════════════════════════════════════════════
  // Caja Detail Sheet
  // ═══════════════════════════════════════════════════════════════════════
  cajaSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cajaSheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cajaSheetName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  cajaActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cajaSheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  cajaSheetEmpty: { alignItems: "center", paddingVertical: 28, gap: 6 },
  cajaSheetEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  cajaArtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cajaArtIndex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cajaArtIndexText: { fontSize: 11, fontWeight: "700" },
  cajaArtName: { fontSize: 13, fontWeight: "600" },
  cajaArtQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  cajaArtQty: { fontSize: 14, fontWeight: "800" },
  cajaActivateBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Quick Add Caja Sheet
  // ═══════════════════════════════════════════════════════════════════════
  quickCajaHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  quickCajaGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  quickCajaItem: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  quickCajaItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickCajaItemText: {
    fontSize: 12,
    fontWeight: "700",
  },
  quickCajaOrDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    alignItems: "center",
    paddingBottom: 8,
  },
  quickCajaScanAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
  },
});
