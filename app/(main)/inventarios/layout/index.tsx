import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { getCurrentDatabaseId } from "@/services/api";
import { buscarArticulosPorUbicacion, getClasesPorUbicacion, getInventarioPorUbicacion, getQuiebresPorUbicacion } from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  Gesture,
  GestureDetector
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// ─── Types ──────────────────────────────────────────────────
interface ArticuloUbic {
  ARTICULO_ID: number;
  CLAVE_ARTICULO: string;
  CODIGO_BARRAS?: string;
  NOMBRE: string;
  LOCALIZACION: string;
  EXISTENCIA: number;
  CLASE: string;
  ESTATUS: string;
  INV_MIN: number;
  PUNTO_REORDEN: number;
  DIAS_QUIEBRE: number;
}

interface GavetaData {
  number: number;
  fullCode: string;
  articulos: ArticuloUbic[];
}

interface LineData {
  gavetas: GavetaData[];
}

interface LevelData {
  level: number;
  lines: LineData[];
}

interface RackData {
  code: string;
  levels: LevelData[];
  totalUbicaciones: number;
  totalArticulos: number;
}

// ─── Constants ──────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get("window").width;
const RACK_MARGIN = 12;
const POST_W = 10;
const BEAM_H = 7;
const RACK_CONTENT_W = SCREEN_WIDTH - RACK_MARGIN * 2 - POST_W * 2;

// Colors matching the real rack photo
const RACK_POST = "#D1D5DB";
const RACK_POST_BG = "#E5E7EB";
const RACK_BEAM = "#2563EB";
const RACK_BEAM_DARK = "#1D4ED8";
const BIN_EMPTY = "#94A3B8";

// Stock status colors (for Inventory mode)
const STOCK_STATUS_COLORS: Record<string, { bg: string; dark: string; label: string }> = {
  SOBRESTOCK:     { bg: "#8B5CF6", dark: "#7C3AED", label: "Sobrestock" },   // Morado
  NORMAL:         { bg: "#22C55E", dark: "#16A34A", label: "Normal" },       // Verde
  BAJO:           { bg: "#F59E0B", dark: "#D97706", label: "Bajo" },         // Amarillo
  CRITICO:        { bg: "#EF4444", dark: "#DC2626", label: "Crítico" },      // Rojo
  SIN_EXISTENCIA: { bg: "#727880cc", dark: "#1E293B", label: "Sin Exist." },   // Gris Oscuro
};

// Stock-out (Quiebres) duration colors
const STOCK_OUT_COLORS = {
  SHORT: { bg: "#3B82F6", dark: "#1D4ED8", label: "1-2 Días" }, // Azul
  MEDIUM: { bg: "#71717A", dark: "#3F3F46", label: "2-5 Días" }, // Gris
  LONG: { bg: "#EF4444", dark: "#B91C1C", label: "+5 Días" },  // Rojo
};

// Class colors (for Clases mode: A, B, C, D)
const CLASS_COLORS: Record<string, { bg: string; dark: string; label: string }> = {
  A: { bg: "#EF4444", dark: "#DC2626", label: "Clase A" },   // Alta
  B: { bg: "#F59E0B", dark: "#D97706", label: "Clase B" },   // Media
  C: { bg: "#22C55E", dark: "#16A34A", label: "Clase C" },   // Baja
  D: { bg: "#78350F", dark: "#451A03", label: "Clase D" },   // Muy Baja (Café)
};

type StockStatus = "SOBRESTOCK" | "NORMAL" | "BAJO" | "CRITICO" | "SIN_EXISTENCIA";
type RotationClass = "A" | "B" | "C" | "D";
type ViewMode = "clases" | "inventario" | "quiebres";

// Get status from real article data
const getGavetaStatus = (gaveta: GavetaData): StockStatus => {
  if (gaveta.articulos.length === 0) return "NORMAL";
  const st = gaveta.articulos[0].ESTATUS;
  // Map backend names if needed or return directly
  if (st === "SIN_EXISTENCIA") return "SIN_EXISTENCIA";
  if (st === "SOBRESTOCK") return "SOBRESTOCK";
  if (st === "BAJO") return "BAJO";
  if (st === "CRITICO") return "CRITICO";
  return "NORMAL";
};

// Get rotation class from real article data
const getGavetaClass = (gaveta: GavetaData): RotationClass => {
  if (gaveta.articulos.length === 0) return "D";
  const cls = (gaveta.articulos[0].CLASE || "D").toUpperCase();
  if (["A", "B", "C", "D"].includes(cls)) return cls as RotationClass;
  return "D";
};

// ─── Parse locations into rack structure ────────────────────
function buildRackFromLocations(
  rackCode: string,
  articulos: ArticuloUbic[],
  ubicaciones: string[]
): RackData {
  // Parse all unique locations: N1-09-02-15 → level=2, gaveta=15
  const levelMap = new Map<number, Map<number, ArticuloUbic[]>>();

  for (const art of articulos) {
    const loc = art.LOCALIZACION.trim().toUpperCase();
    const parts = loc.split("-");
    if (parts.length < 4) continue;

    const level = parseInt(parts[2], 10);
    const gaveta = parseInt(parts[3], 10);
    if (isNaN(level) || isNaN(gaveta)) continue;

    if (!levelMap.has(level)) levelMap.set(level, new Map());
    const gm = levelMap.get(level)!;
    if (!gm.has(gaveta)) gm.set(gaveta, []);
    gm.get(gaveta)!.push(art);
  }

  // Also parse from ubicaciones_encontradas for bins that exist but have no articles
  for (const ub of ubicaciones) {
    const parts = ub.trim().toUpperCase().split("-");
    if (parts.length < 4) continue;
    const level = parseInt(parts[2], 10);
    const gaveta = parseInt(parts[3], 10);
    if (isNaN(level) || isNaN(gaveta)) continue;
    if (!levelMap.has(level)) levelMap.set(level, new Map());
    if (!levelMap.get(level)!.has(gaveta)) levelMap.get(level)!.set(gaveta, []);
  }

  // ── Fill in missing levels and gavetas so the rack looks complete ──
  const allLevelNums = [...levelMap.keys()];
  const maxLevel = allLevelNums.length > 0 ? Math.max(...allLevelNums) : 0;
  const minLevel = allLevelNums.length > 0 ? Math.min(...allLevelNums) : 1;

  let globalMaxGaveta = 0;
  for (const [, gm] of levelMap) {
    if (gm.size === 0) continue;
    const maxG = Math.max(...gm.keys());
    if (maxG > globalMaxGaveta) globalMaxGaveta = maxG;
  }

  for (let lvl = minLevel; lvl <= maxLevel; lvl++) {
    if (!levelMap.has(lvl)) {
      levelMap.set(lvl, new Map());
    }
  }

  for (const [lvl, gm] of levelMap) {
    for (let g = 1; g <= globalMaxGaveta; g++) {
      if (!gm.has(g)) {
        gm.set(g, []);
      }
    }
  }

  // Build level structure
  const sortedLevels = [...levelMap.keys()].sort((a, b) => a - b);
  const levels: LevelData[] = sortedLevels.map((lvl) => {
    const gm = levelMap.get(lvl)!;
    const sortedGavetas = [...gm.keys()].sort((a, b) => a - b);

    const allGavetas: GavetaData[] = sortedGavetas.map((g) => ({
      number: g,
      fullCode: `${rackCode}-${String(lvl).padStart(2, "0")}-${String(g).padStart(2, "0")}`,
      articulos: gm.get(g) || [],
    }));

    // Split in two lines: line1(Bottom), line2(Top)
    const mid = Math.ceil(allGavetas.length / 2);
    const line1 = { gavetas: allGavetas.slice(0, mid) }; // 1..22 (Bottom)
    const line2 = { gavetas: allGavetas.slice(mid) };    // 23..44 (Top)

    // In JSX they render top to bottom, so we return [top, bottom]
    return { level: lvl, lines: [line2, line1] };
  });

  // Count totals
  let totalUbic = 0;
  let totalArt = 0;
  for (const lvl of levels) {
    for (const line of lvl.lines) {
      totalUbic += line.gavetas.length;
      totalArt += line.gavetas.filter((g) => g.articulos.length > 0).length;
    }
  }

  return {
    code: rackCode.toUpperCase(),
    levels,
    totalUbicaciones: totalUbic,
    totalArticulos: articulos.length,
  };
}

// ─── Gaveta component (plastic bin) ────────────────────────
const GavetaBin = React.memo(({
  gaveta,
  binWidth,
  isSelected,
  onPress,
  viewMode,
}: {
  gaveta: GavetaData;
  binWidth: number;
  isSelected: boolean;
  onPress: (g: GavetaData) => void;
  viewMode: ViewMode;
}) => {
  const hasArticle = gaveta.articulos.length > 0;

  let binColor = BIN_EMPTY;
  let binDark = "#64748B";
  let dimmed = false;

  if (hasArticle) {
    if (viewMode === "clases") {
      const cls = getGavetaClass(gaveta);
      binColor = CLASS_COLORS[cls].bg;
      binDark = CLASS_COLORS[cls].dark;
    } else if (viewMode === "inventario") {
      const status = getGavetaStatus(gaveta);
      binColor = STOCK_STATUS_COLORS[status].bg;
      binDark = STOCK_STATUS_COLORS[status].dark;
    } else if (viewMode === "quiebres") {
      const art = gaveta.articulos[0];
      const dias = art?.DIAS_QUIEBRE || 0;
      if (dias > 0) {
        if (dias >= 5) {
          binColor = STOCK_OUT_COLORS.LONG.bg;
          binDark = STOCK_OUT_COLORS.LONG.dark;
        } else if (dias >= 2) {
          binColor = STOCK_OUT_COLORS.MEDIUM.bg;
          binDark = STOCK_OUT_COLORS.MEDIUM.dark;
        } else {
          binColor = STOCK_OUT_COLORS.SHORT.bg;
          binDark = STOCK_OUT_COLORS.SHORT.dark;
        }
      } else {
        dimmed = true;
      }
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(gaveta);
      }}
      style={[
        styles.gaveta,
        {
          width: binWidth - 2,
          borderColor: isSelected ? "#F59E0B" : "transparent",
          borderWidth: isSelected ? 2 : 0,
          opacity: dimmed ? 0.25 : 1,
        },
      ]}
    >
      <View style={[styles.gavetaBody, { backgroundColor: binColor }]}>
        <View style={[styles.gavetaLip, { backgroundColor: binDark }]} />
        <View style={styles.gavetaLabelArea}>
          {binWidth > 18 && (
            <Text style={styles.gavetaNumber} numberOfLines={1}>
              {gaveta.number}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Rack Line (row of bins) ───────────────────────────────
const RackLineRow = React.memo(({
  line,
  rackWidth,
  selectedGaveta,
  onGavetaPress,
  viewMode,
}: {
  line: LineData;
  rackWidth: number;
  selectedGaveta: string | null;
  onGavetaPress: (g: GavetaData) => void;
  viewMode: ViewMode;
}) => {
  if (line.gavetas.length === 0) return null;
  const binWidth = rackWidth / Math.max(line.gavetas.length, 1);

  return (
    <View style={styles.rackLine}>
      {line.gavetas.map((g) => (
        <GavetaBin
          key={g.number}
          gaveta={g}
          binWidth={binWidth}
          isSelected={selectedGaveta === g.fullCode}
          onPress={onGavetaPress}
          viewMode={viewMode}
        />
      ))}
    </View>
  );
});

// ─── Rack Level ────────────────────────────────────────────
const RackLevelView = React.memo(({
  levelData,
  rackWidth,
  selectedGaveta,
  onGavetaPress,
  colors,
  viewMode,
}: {
  levelData: LevelData;
  rackWidth: number;
  selectedGaveta: string | null;
  onGavetaPress: (g: GavetaData) => void;
  colors: any;
  viewMode: ViewMode;
}) => {
  const totalGavetas = levelData.lines.reduce((s, l) => s + l.gavetas.length, 0);

  return (
    <View style={styles.levelContainer}>
      {/* Blue beam on top */}
      <View style={styles.beam}>
        <View style={[styles.beamMain, { backgroundColor: RACK_BEAM }]} />
        <View style={[styles.beamHighlight, { backgroundColor: RACK_BEAM_DARK }]} />
      </View>

      {/* Level body */}
      <View style={styles.levelBody}>
        {/* Level number label */}
        <View style={styles.levelLabel}>
          <Text style={[styles.levelLabelText, { color: colors.textSecondary }]}>
            {levelData.level}
          </Text>
        </View>

        {/* Bins area */}
        <View style={styles.levelBinsArea}>
          {levelData.lines.map((line, idx) => (
            <RackLineRow
              key={idx}
              line={line}
              rackWidth={rackWidth - 24}
              selectedGaveta={selectedGaveta}
              onGavetaPress={onGavetaPress}
              viewMode={viewMode}
            />
          ))}
        </View>

        {/* Gaveta count */}
        <View style={styles.levelCount}>
          <Text style={[styles.levelCountText, { color: colors.textTertiary }]}>
            {totalGavetas}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ─── Main Component ─────────────────────────────────────────
export default function LayoutScreen() {
  const colors = useThemeColors();
  const [inputValue, setInputValue] = useState("");
  const [rackData, setRackData] = useState<RackData | null>(null);
  const [selectedGaveta, setSelectedGaveta] = useState<GavetaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlmacenPicker, setShowAlmacenPicker] = useState(false);
  const [modalGaveta, setModalGaveta] = useState<GavetaData | null>(null);
  const [gdImgLoaded, setGdImgLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("clases");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingQuiebres, setLoadingQuiebres] = useState(false);
  const [loadingClases, setLoadingClases] = useState(false);
  const [hasLoadedStatus, setHasLoadedStatus] = useState(false);
  const [hasLoadedQuiebres, setHasLoadedQuiebres] = useState(false);
  const [hasLoadedClases, setHasLoadedClases] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Zoom Logic (Gesture Handler v2) ───────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const isZoomed = useSharedValue(0); // 0 = normal, 1 = immersive

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
      // If scale > 1.1, start hiding other elements
      if (scale.value > 1.1) {
        isZoomed.value = withSpring(1);
      } else {
        isZoomed.value = withSpring(0);
      }
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        isZoomed.value = withSpring(0);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const rRackStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: scale.value > 1.1 ? 1000 : 1,
    };
  });

  const rFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(1 - isZoomed.value),
      transform: [{ translateY: withSpring(isZoomed.value * -50) }],
      display: isZoomed.value > 0.9 ? 'none' : 'flex'
    };
  });

  const rOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(isZoomed.value),
      display: isZoomed.value > 0.1 ? 'flex' : 'none',
      backgroundColor: colors.background,
    };
  });

  const rMainStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(1 - isZoomed.value),
      transform: [
        { translateY: withSpring(isZoomed.value * -30) },
        { scale: withSpring(1 - isZoomed.value * 0.05) }
      ],
    };
  });

  const resetZoom = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    isZoomed.value = withSpring(0);
  };


  const {
    almacenes,
    almacenesFiltrados,
    selectedSucursal,
    selectedAlmacen,
    setSelectedAlmacen,
    isLoading: loadingAlmacenes,
  } = useSucursalesAlmacenes();

  // Auto-seleccionar CEDIS Totolcingo al cargar
  useEffect(() => {
    if (!selectedAlmacen && almacenes.length > 0) {
      const cedis = almacenes.find((a) =>
        a.nombre.toUpperCase().includes("CEDIS")
      );
      if (cedis) {
        setSelectedAlmacen(cedis.id);
      } else {
        setSelectedAlmacen(almacenes[0].id);
      }
    }
  }, [almacenes, selectedAlmacen, setSelectedAlmacen]);

  const almacenActual = almacenes.find((a) => a.id === selectedAlmacen);
  // selectedAlmacen ya es el ALMACEN_ID real de Microsip
  // Fallback a 19 = CEDIS Totolcingo (mismo patrón que Acomodo)
  const almacenIdReal = selectedAlmacen || 19;

  const handleSearch = useCallback(async () => {
    const cleaned = inputValue.trim().toUpperCase().replace(/\//g, "-");
    if (!cleaned) return;

    setIsLoading(true);
    setHasLoadedStatus(false);
    setHasLoadedQuiebres(false);
    setHasLoadedClases(false);
    setSelectedGaveta(null);
    inputRef.current?.blur();

    console.log(`[Layout] Buscando rack: ${cleaned}, almacen_id: ${almacenIdReal}`);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await buscarArticulosPorUbicacion(cleaned, almacenIdReal);

      if (response.ubicaciones_encontradas && response.ubicaciones_encontradas.length > 0) {
        const initialRack = buildRackFromLocations(
          cleaned,
          response.articulos,
          response.ubicaciones_encontradas
        );
        setRackData(initialRack);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Sin resultados", `No se encontraron ubicaciones para "${cleaned}"`);
        setRackData(null);
      }
    } catch (err: any) {
      console.error("Error buscando rack:", err);
      Alert.alert("Error", err.message || "No se pudo cargar el rack");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, almacenIdReal]);

  // ─── Deferred Loading Logic ────────────────────────
  useEffect(() => {
    if (!rackData || isLoading) return;

    const cleaned = inputValue.trim().toUpperCase().replace(/\//g, "-");

    const loadStatus = async () => {
      if (viewMode === "inventario" && !hasLoadedStatus && !loadingStatus) {
        setLoadingStatus(true);
        try {
          const res = await getInventarioPorUbicacion(cleaned, almacenIdReal);
          if (res.ok && res.inventario) {
            setRackData(prev => {
              if (!prev) return prev;
              const updatedLevels = prev.levels.map(lvl => ({
                ...lvl,
                lines: lvl.lines.map(line => ({
                  ...line,
                  gavetas: line.gavetas.map(gav => ({
                    ...gav,
                    articulos: gav.articulos.map(art => ({
                      ...art,
                      EXISTENCIA: res.inventario[art.CLAVE_ARTICULO]?.EXISTENCIA || 0,
                      ESTATUS: res.inventario[art.CLAVE_ARTICULO]?.ESTATUS || "SIN_DATOS"
                    }))
                  }))
                }))
              }));
              return { ...prev, levels: updatedLevels };
            });
            setHasLoadedStatus(true);
          }
        } catch (err) {
          console.error("Error loading status:", err);
        } finally {
          setLoadingStatus(false);
        }
      }
    };

    const loadQuiebres = async () => {
      if (viewMode === "quiebres" && !hasLoadedQuiebres && !loadingQuiebres) {
        setLoadingQuiebres(true);
        try {
          const res = await getQuiebresPorUbicacion(cleaned, almacenIdReal);
          if (res.ok && res.quiebres) {
            setRackData(prev => {
              if (!prev) return prev;
              const updatedLevels = prev.levels.map(lvl => ({
                ...lvl,
                lines: lvl.lines.map(line => ({
                  ...line,
                  gavetas: line.gavetas.map(gav => ({
                    ...gav,
                    articulos: gav.articulos.map(art => ({
                      ...art,
                      DIAS_QUIEBRE: res.quiebres[art.CLAVE_ARTICULO] || 0
                    }))
                  }))
                }))
              }));
              return { ...prev, levels: updatedLevels };
            });
            setHasLoadedQuiebres(true);
          }
        } catch (err) {
          console.error("Error loading quiebres:", err);
        } finally {
          setLoadingQuiebres(false);
        }
      }
    };

    const loadClases = async () => {
      if (viewMode === "clases" && !hasLoadedClases && !loadingClases) {
        setLoadingClases(true);
        try {
          const res = await getClasesPorUbicacion(cleaned, almacenIdReal);
          if (res.ok && res.clases) {
            setRackData(prev => {
              if (!prev) return prev;
              const updatedLevels = prev.levels.map(lvl => ({
                ...lvl,
                lines: lvl.lines.map(line => ({
                  ...line,
                  gavetas: line.gavetas.map(gav => ({
                    ...gav,
                    articulos: gav.articulos.map(art => ({
                      ...art,
                      CLASE: res.clases[art.ARTICULO_ID] || "D"
                    }))
                  }))
                }))
              }));
              return { ...prev, levels: updatedLevels };
            });
            setHasLoadedClases(true);
          }
        } catch (err) {
          console.error("Error loading clases:", err);
        } finally {
          setLoadingClases(false);
        }
      }
    };

    loadStatus();
    loadQuiebres();
    loadClases();
  }, [viewMode, rackData, hasLoadedStatus, hasLoadedQuiebres, hasLoadedClases, loadingStatus, loadingQuiebres, loadingClases, inputValue, almacenIdReal, isLoading]);

  const handleGavetaPress = useCallback((g: GavetaData) => {
    setSelectedGaveta((prev) => (prev?.fullCode === g.fullCode ? null : g));
    // Reset image loaded and open modal
    setGdImgLoaded(false);
    setModalGaveta(g);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const getImageUri = (articuloId: number) => {
    const databaseId = getCurrentDatabaseId();
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${articuloId}&thumb=0`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Layout",
          headerTitleAlign: "center",
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* UI that fades when zooming */}
        <Animated.View style={rFadeStyle}>
          {/* ── Compact search bar with almacén ── */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.almBadge, { backgroundColor: `${RACK_BEAM}12` }]}
              onPress={() => setShowAlmacenPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="business" size={12} color={RACK_BEAM} />
              <Text style={[styles.almBadgeText, { color: RACK_BEAM }]} numberOfLines={1}>
                {loadingAlmacenes ? "..." : (almacenActual?.nombre || "Almacén").split(" ").slice(0, 2).join(" ")}
              </Text>
              <Ionicons name="chevron-down" size={10} color={RACK_BEAM} />
            </TouchableOpacity>
            <View style={styles.searchInputRow}>
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="N1-09"
                placeholderTextColor={colors.textTertiary}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSearch}
                autoCapitalize="characters"
                returnKeyType="search"
              />
              {inputValue.length > 0 && (
                <TouchableOpacity onPress={() => { setInputValue(""); setRackData(null); setSelectedGaveta(null); }} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.searchGoBtn, { backgroundColor: RACK_BEAM, opacity: isLoading ? 0.6 : 1 }]}
                onPress={handleSearch}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Quick access (only when empty) ── */}
          {!rackData && !isLoading && (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
                {["N1-01", "N1-05", "N1-09", "N2-02", "N2-06", "N3-01"].map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.quickChip, { borderColor: colors.border }]}
                    onPress={() => {
                      setInputValue(code);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickChipText, { color: colors.text }]}>{code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.emptyArea}>
                <View style={[styles.emptyIconWrap, { backgroundColor: `${RACK_BEAM}08` }]}>
                  <Ionicons name="grid-outline" size={44} color={`${RACK_BEAM}30`} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Visualizador de Racks</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Ingresa un código para ver la estructura del rack y sus artículos.
                </Text>
              </View>
            </View>
          )}

          {/* ── Loading ─────────────────────── */}
          {isLoading && (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color={RACK_BEAM} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Cargando {inputValue.toUpperCase()}...
              </Text>
            </View>
          )}

          {/* ── Rack Stats & Stats Header ────────────────── */}
          {rackData && !isLoading && (
            <>
              {/* Rack stats header */}
              <View style={[styles.rackStatsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.rackStatsTop}>
                  <View style={styles.rackStatsLeft}>
                    <Text style={[styles.rackCode, { color: colors.text }]}>{rackData.code}</Text>
                    <Text style={[styles.rackLabel, { color: colors.textSecondary }]}>Rack activo</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.rackReloadBtn, { borderColor: colors.border }]}
                    onPress={handleSearch}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.rackStatsPills}>
                  <View style={[styles.rackPill, { backgroundColor: `${RACK_BEAM}10` }]}>
                    <Text style={[styles.rackPillNum, { color: RACK_BEAM }]}>{rackData.levels.length}</Text>
                    <Text style={[styles.rackPillLabel, { color: RACK_BEAM }]}>Niveles</Text>
                  </View>
                  <View style={[styles.rackPill, { backgroundColor: "#22C55E10" }]}>
                    <Text style={[styles.rackPillNum, { color: "#22C55E" }]}>{rackData.totalUbicaciones}</Text>
                    <Text style={[styles.rackPillLabel, { color: "#22C55E" }]}>Ubicaciones</Text>
                  </View>
                  <View style={[styles.rackPill, { backgroundColor: "#F59E0B10" }]}>
                    <Text style={[styles.rackPillNum, { color: "#F59E0B" }]}>{rackData.totalArticulos}</Text>
                    <Text style={[styles.rackPillLabel, { color: "#F59E0B" }]}>Artículos</Text>
                  </View>
                </View>
              </View>

              {/* ── Selected Gaveta Info ────── */}
              {selectedGaveta && (
                <View style={[styles.selCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: RACK_BEAM, borderLeftWidth: 3 }]}>
                  <View style={styles.selTop}>
                    <View style={styles.selTopLeft}>
                      <Text style={[styles.selUbicLabel, { color: colors.textSecondary }]}>Ubicación seleccionada</Text>
                      <Text style={[styles.selUbicCode, { color: colors.text }]}>{selectedGaveta.fullCode}</Text>
                    </View>
                    <View style={styles.selTopRight}>
                      {selectedGaveta.articulos.length > 0 ? (
                        <View style={[styles.selCountBadge, { backgroundColor: `${RACK_BEAM}15` }]}>
                          <Text style={[styles.selCountText, { color: RACK_BEAM }]}>
                            {selectedGaveta.articulos.length} art.
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.selCountBadge, { backgroundColor: "#F59E0B15" }]}>
                          <Text style={[styles.selCountText, { color: "#F59E0B" }]}>Vacía</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => setSelectedGaveta(null)} style={{ paddingLeft: 8 }}>
                        <Ionicons name="close" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Article list inline */}
                  {selectedGaveta.articulos.length > 0 && (
                    <View style={styles.selArticles}>
                      {selectedGaveta.articulos.map((art, idx) => (
                        <View key={`${art.ARTICULO_ID}-${idx}`} style={[styles.selArtRow, { borderTopColor: colors.border }]}>
                          <View style={[styles.selArtNum, { backgroundColor: `${RACK_BEAM}10` }]}>
                            <Text style={[styles.selArtNumText, { color: RACK_BEAM }]}>{idx + 1}</Text>
                          </View>
                          <View style={styles.selArtInfo}>
                            <Text style={[styles.selArtClave, { color: colors.text }]}>{art.CLAVE_ARTICULO}</Text>
                            <Text style={[styles.selArtNombre, { color: colors.textSecondary }]} numberOfLines={1}>{art.NOMBRE}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* ── THE RACK (Always visible, Pannable/Zoomable) ── */}
        {rackData && !isLoading && (
          <View style={styles.rackContainer}>
            <GestureDetector gesture={composed}>
              <Animated.View style={rRackStyle}>
                {/* Blur overlay for loading specific data */}
                {(loadingStatus || loadingQuiebres || loadingClases) && (
                  <BlurView 
                    intensity={Platform.OS === 'ios' ? 40 : 80} 
                    tint={colors.background === '#000000' ? 'dark' : 'light'}
                    style={styles.modeLoadingOverlay}
                  >
                    <LottieView
                      source={{ uri: "https://lottie.host/8cd766d0-4828-4ce6-905c-372551532053/43WzGgP0rQ.json" }}
                      autoPlay
                      loop
                      style={{ width: 120, height: 120 }}
                    />
                    <Text style={[styles.modeLoadingText, { color: colors.text }]}>
                      {viewMode === "inventario" ? "Actualizando Inventario" : (viewMode === "quiebres" ? "Calculando Quiebres" : "Clasificando Rack")}
                    </Text>
                  </BlurView>
                )}
                
                {/* Top rail */}
                <View style={styles.topRail}>
                  <View style={[styles.topRailPost, styles.topRailPostL, { backgroundColor: RACK_POST }]} />
                  <View style={[styles.topRailBeam, { backgroundColor: RACK_BEAM }]}>
                    <Text style={styles.topRailText}>{rackData.code}</Text>
                  </View>
                  <View style={[styles.topRailPost, styles.topRailPostR, { backgroundColor: RACK_POST }]} />
                </View>

                {/* Rack body */}
                <View style={styles.rackBody}>
                  <View style={[styles.post, { backgroundColor: RACK_POST_BG }]}>
                    <View style={[styles.postInner, { backgroundColor: RACK_POST }]} />
                    {Array.from({ length: 30 }, (_, i) => (
                      <View key={i} style={[styles.postHole, { backgroundColor: "#B0B8C4" }]} />
                    ))}
                  </View>

                  <View style={styles.levelsWrap}>
                    {[...rackData.levels].reverse().map((lvl) => (
                      <RackLevelView
                        key={lvl.level}
                        levelData={lvl}
                        rackWidth={RACK_CONTENT_W}
                        selectedGaveta={selectedGaveta?.fullCode ?? null}
                        onGavetaPress={handleGavetaPress}
                        colors={colors}
                        viewMode={viewMode}
                      />
                    ))}
                    <View style={styles.beam}>
                      <View style={[styles.beamMain, { backgroundColor: RACK_BEAM }]} />
                      <View style={[styles.beamHighlight, { backgroundColor: RACK_BEAM_DARK }]} />
                    </View>
                  </View>

                  <View style={[styles.post, { backgroundColor: RACK_POST_BG }]}>
                    <View style={[styles.postInner, { backgroundColor: RACK_POST }]} />
                    {Array.from({ length: 30 }, (_, i) => (
                      <View key={i} style={[styles.postHole, { backgroundColor: "#B0B8C4" }]} />
                    ))}
                  </View>
                </View>

                {/* Base / feet */}
                <View style={styles.rackFeet}>
                  <View style={[styles.foot, styles.footL, { backgroundColor: RACK_POST }]} />
                  <View style={styles.footSpacer} />
                  <View style={[styles.foot, styles.footR, { backgroundColor: RACK_POST }]} />
                </View>
              </Animated.View>
            </GestureDetector>

            {/* Reset Zoom Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={resetZoom}
              style={[styles.zoomResetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="contract" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Legend (Also fades when zoomed) ── */}
        {rackData && !isLoading && (
          <Animated.View style={rFadeStyle}>
            <View style={[styles.legendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {viewMode === "clases" ? (
                <>
                  {Object.entries(CLASS_COLORS).map(([key, val]) => (
                    <View key={key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: val.bg }]} />
                      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{val.label}</Text>
                    </View>
                  ))}
                </>
              ) : viewMode === "inventario" ? (
                <>
                  {Object.entries(STOCK_STATUS_COLORS).map(([key, val]) => (
                    <View key={key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: val.bg }]} />
                      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{val.label}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  {Object.entries(STOCK_OUT_COLORS).map(([key, val]) => (
                    <View key={key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: val.bg }]} />
                      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{val.label}</Text>
                    </View>
                  ))}
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: BIN_EMPTY }]} />
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Correcto</Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Layer that appears when zoomed to dark out the background */}
      <Animated.View 
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { zIndex: 900 },
          rOverlayStyle
        ]} 
      />


      {/* ── Floating View Mode Tab Bar ─────── */}
      {rackData && (
        <View style={[styles.classBar, { backgroundColor: `${colors.surface}F8`, borderColor: colors.border }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.classBarScroll}
            scrollEnabled={false} // Since we only have 3 tabs, no need to scroll
          >
            {/* Clases Tab */}
            <TouchableOpacity
              style={[styles.classTab, viewMode === "clases" && { backgroundColor: RACK_BEAM }]}
              onPress={() => { setViewMode("clases"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="stats-chart" size={18} color={viewMode === "clases" ? "#fff" : colors.textSecondary} />
              <Text style={[styles.classTabText, { color: viewMode === "clases" ? "#fff" : colors.textSecondary }]}>CLASS</Text>
            </TouchableOpacity>

            {/* Inventario Tab */}
            <TouchableOpacity
              style={[styles.classTab, viewMode === "inventario" && { backgroundColor: STOCK_STATUS_COLORS.SOBRESTOCK.bg }]}
              onPress={() => { setViewMode("inventario"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="cube" size={18} color={viewMode === "inventario" ? "#fff" : colors.textSecondary} />
              <Text style={[styles.classTabText, { color: viewMode === "inventario" ? "#fff" : colors.textSecondary }]}>STOCK</Text>
            </TouchableOpacity>

            {/* Quiebres Tab */}
            <TouchableOpacity
              style={[styles.classTab, viewMode === "quiebres" && { backgroundColor: STOCK_STATUS_COLORS.CRITICO.bg }]}
              onPress={() => { setViewMode("quiebres"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="alert-circle" size={18} color={viewMode === "quiebres" ? "#fff" : colors.textSecondary} />
              <Text style={[styles.classTabText, { color: viewMode === "quiebres" ? "#fff" : colors.textSecondary }]}>STOCK-OUT</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── Gaveta Detail Modal ──────────── */}
      <Modal
        visible={!!modalGaveta}
        transparent
        animationType="slide"
        onRequestClose={() => setModalGaveta(null)}
      >
        <View style={styles.gdOverlay}>
          <TouchableOpacity style={styles.gdDismiss} activeOpacity={1} onPress={() => setModalGaveta(null)} />
          <View style={[styles.gdSheet, { backgroundColor: colors.surface }]}>
            {/* Handle */}
            <View style={styles.gdHandle}>
              <View style={[styles.gdHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Location header */}
            <View style={styles.gdHeader}>
              <View style={[styles.gdLocBadge, { backgroundColor: `${RACK_BEAM}12` }]}>
                <Ionicons name="location" size={14} color={RACK_BEAM} />
                <Text style={[styles.gdLocText, { color: RACK_BEAM }]}>{modalGaveta?.fullCode || ""}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalGaveta(null)} style={[styles.gdCloseBtn, { backgroundColor: colors.background }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Full-modal spinner until image loads */}
            {!gdImgLoaded && modalGaveta && modalGaveta.articulos.length > 0 ? (
              <View style={styles.gdLoadingWrap}>
                <ActivityIndicator size="large" color={RACK_BEAM} />
                <Text style={[styles.gdLoadingText, { color: colors.textSecondary }]}>Cargando artículo...</Text>
                {/* Hidden image to trigger onLoad */}
                <Image
                  source={{ uri: getImageUri(modalGaveta.articulos[0].ARTICULO_ID) }}
                  style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}
                  onLoad={() => setGdImgLoaded(true)}
                />
              </View>
            ) : (

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* ── Solid 3D Gaveta ──────────────── */}
              {(() => {
                const hasArt = !!(modalGaveta && modalGaveta.articulos.length > 0);
                const status = modalGaveta ? getGavetaStatus(modalGaveta) : "NORMAL";
                const mainColor = hasArt ? STOCK_STATUS_COLORS[status].bg : BIN_EMPTY;
                const darkColor = hasArt ? STOCK_STATUS_COLORS[status].dark : "#64748B";
                const darkerColor = hasArt ? 
                  (status === "CRITICO" || status === "SIN_EXISTENCIA" ? "#991B1B" : 
                   status === "SOBRESTOCK" ? "#5B21B6" : 
                   status === "BAJO" ? "#92400E" : "#14532D") : "#475569";
                return (
                  <View style={styles.gdBinWrap}>
                    {/* Shadow base */}
                    <View style={[styles.gdShadow, { backgroundColor: "#00000012" }]} />
                    {/* Outer shell */}
                    <View style={[styles.gdShell, { backgroundColor: darkColor }]}>
                      {/* Top rim */}
                      <View style={[styles.gdRim, { backgroundColor: darkerColor }]}>
                        <View style={[styles.gdRimInner, { backgroundColor: mainColor }]} />
                      </View>
                      {/* Inner cavity */}
                      <View style={[styles.gdInner, { backgroundColor: mainColor }]}>
                        {/* Inner shadow at top */}
                        <View style={[styles.gdInnerShadow, { backgroundColor: darkColor }]} />
                        {/* Product image or empty */}
                        <View style={styles.gdBinContent}>
                          {hasArt && modalGaveta ? (
                            <View style={styles.gdImgWrap}>
                              <ActivityIndicator
                                size="large"
                                color="#fff"
                                style={styles.gdImgSpinner}
                              />
                              <Image
                                source={{ uri: getImageUri(modalGaveta.articulos[0].ARTICULO_ID) }}
                                style={styles.gdProductImg}
                                resizeMode="contain"
                                onLoad={() => setGdImgLoaded(true)}
                              />
                            </View>
                          ) : (
                            <View style={styles.gdEmptyBin}>
                              <Ionicons name="cube-outline" size={40} color="rgba(255,255,255,0.35)" />
                              <Text style={styles.gdEmptyText}>Vacía</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {/* Front panel */}
                      <View style={[styles.gdFrontPanel, { backgroundColor: darkColor }]}>
                        {/* Handle groove */}
                        <View style={[styles.gdHandle2, { backgroundColor: darkerColor }]} />
                      </View>
                      {/* Label plate */}
                      <View style={[styles.gdLabelPlate, { backgroundColor: darkerColor }]}>
                        <Text style={styles.gdBinLabelText}>
                          Gaveta {modalGaveta?.number || ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* ── Article details ──────────────── */}
              {modalGaveta && modalGaveta.articulos.length > 0 ? (
                <View style={styles.gdArticlesList}>
                  {modalGaveta.articulos.map((art, idx) => (
                    <View key={`${art.ARTICULO_ID}-${idx}`} style={[styles.gdArtCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      {/* Thumbnail with spinner */}
                      <View style={[styles.gdArtThumbWrap, { backgroundColor: colors.surface }]}>
                        <ActivityIndicator size="small" color={RACK_BEAM} style={styles.gdArtThumbSpinner} />
                        <Image
                          source={{ uri: getImageUri(art.ARTICULO_ID) }}
                          style={styles.gdArtThumb}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.gdArtInfo}>
                        <View style={[styles.gdArtClaveBadge, { backgroundColor: `${RACK_BEAM}10` }]}>
                          <Text style={[styles.gdArtClaveText, { color: RACK_BEAM }]}>{art.CLAVE_ARTICULO}</Text>
                        </View>
                        <Text style={[styles.gdArtName, { color: colors.text }]} numberOfLines={2}>{art.NOMBRE}</Text>
                        <View style={styles.gdArtMeta}>
                          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                          <Text style={[styles.gdArtMetaText, { color: colors.textTertiary }]}>{art.LOCALIZACION}</Text>
                        </View>

                        {/* Existence Badge */}
                        <View style={styles.gdArtMetaRow}>
                          <View style={[styles.gdArtStockBadge, { backgroundColor: `${STOCK_STATUS_COLORS[art.ESTATUS]?.bg || colors.border}15` }]}>
                            <Ionicons 
                              name={art.EXISTENCIA > 0 ? "cube" : "alert-circle"} 
                              size={14} 
                              color={STOCK_STATUS_COLORS[art.ESTATUS]?.bg || colors.textSecondary} 
                            />
                            <Text style={[styles.gdArtStockValue, { color: STOCK_STATUS_COLORS[art.ESTATUS]?.bg || colors.textSecondary }]}>
                              {art.EXISTENCIA} Pzs
                            </Text>
                            <Text style={[styles.gdArtStockLabel, { color: colors.textTertiary }]}>Disponibles</Text>
                          </View>

                          {art.DIAS_QUIEBRE > 0 && (
                            <View style={[styles.gdQuebradaBadge, { backgroundColor: `${STOCK_OUT_COLORS[art.DIAS_QUIEBRE >= 5 ? 'LONG' : (art.DIAS_QUIEBRE >= 2 ? 'MEDIUM' : 'SHORT')].bg}20` }]}>
                              <Text style={[styles.gdQuebradaText, { color: STOCK_OUT_COLORS[art.DIAS_QUIEBRE >= 5 ? 'LONG' : (art.DIAS_QUIEBRE >= 2 ? 'MEDIUM' : 'SHORT')].bg }]}>
                                {art.DIAS_QUIEBRE}D Quebrado
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.gdEmptyState}>
                  <Text style={[styles.gdEmptyStateTitle, { color: colors.text }]}>Sin artículos asignados</Text>
                  <Text style={[styles.gdEmptyStateDesc, { color: colors.textSecondary }]}>
                    Esta gaveta no tiene ningún artículo asignado en el sistema.
                  </Text>
                </View>
              )}
            </ScrollView>

            )}
          </View>
        </View>
      </Modal>

      {/* ── Almacén Picker Modal ────────── */}
      <Modal
        visible={showAlmacenPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlmacenPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlmacenPicker(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar almacén</Text>
            <ScrollView style={styles.modalScroll}>
              {almacenes.map((alm) => (
                <TouchableOpacity
                  key={alm.id}
                  style={[
                    styles.modalOption,
                    { backgroundColor: colors.background, borderColor: selectedAlmacen === alm.id ? RACK_BEAM : colors.border },
                    selectedAlmacen === alm.id && { borderWidth: 2 },
                  ]}
                  onPress={() => {
                    setSelectedAlmacen(alm.id);
                    setShowAlmacenPicker(false);
                    setRackData(null);
                    setSelectedGaveta(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons
                    name="cube-outline"
                    size={18}
                    color={selectedAlmacen === alm.id ? RACK_BEAM : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: selectedAlmacen === alm.id ? RACK_BEAM : colors.text },
                    ]}
                  >
                    {alm.nombre}
                  </Text>
                  {selectedAlmacen === alm.id && (
                    <Ionicons name="checkmark-circle" size={18} color={RACK_BEAM} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { borderColor: colors.border }]}
              onPress={() => setShowAlmacenPicker(false)}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: RACK_MARGIN, paddingBottom: 120 },

  // Search wrap
  searchWrap: { borderRadius: 14, padding: 10, borderWidth: 1, marginBottom: 12 },
  almBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  almBadgeText: { fontSize: 10, fontWeight: "700", maxWidth: 120 },
  searchInputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  searchInput: { flex: 1, fontSize: 18, fontWeight: "700", letterSpacing: 2, paddingVertical: Platform.OS === "ios" ? 6 : 2 },
  searchGoBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },

  // Quick
  quickScroll: { gap: 6, paddingBottom: 14 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  quickChipText: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },

  // Empty
  emptyArea: { alignItems: "center", paddingTop: 36, paddingBottom: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  emptySubtitle: { fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: 40 },

  // Loading
  loadingArea: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 13 },

  // Rack stats header
  rackStatsCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  rackStatsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rackStatsLeft: {},
  rackCode: { fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  rackLabel: { fontSize: 11, marginTop: 2 },
  rackReloadBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  rackStatsPills: { flexDirection: "row", gap: 8 },
  rackPill: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  rackPillNum: { fontSize: 18, fontWeight: "900" },
  rackPillLabel: { fontSize: 9, fontWeight: "600", marginTop: 2 },

  // Class filter tab bar
  classBar: { position: "absolute", bottom: 15, left: 10, right: 10, padding: 6, borderRadius: 24, elevation: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, borderWidth: 1 },
  classBarScroll: { flexGrow: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  classTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18 },
  classTabActive: { elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  classTabSep: { width: 1.5, height: 26, borderRadius: 1.5, marginHorizontal: 4 },
  classTabDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  classTabText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },

  // Selected gaveta
  selCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  selTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selTopLeft: { flex: 1 },
  selTopRight: { flexDirection: "row", alignItems: "center" },
  selUbicLabel: { fontSize: 10, fontWeight: "500" },
  selUbicCode: { fontSize: 16, fontWeight: "900", letterSpacing: 2, marginTop: 2 },
  selCountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  selCountText: { fontSize: 11, fontWeight: "700" },
  selArticles: { marginTop: 10 },
  selArtRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  selArtNum: { width: 24, height: 24, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  selArtNumText: { fontSize: 10, fontWeight: "800" },
  selArtInfo: { flex: 1 },
  selArtClave: { fontSize: 12, fontWeight: "700" },
  selArtNombre: { fontSize: 11, marginTop: 1 },

  // Rack container
  rackContainer: { marginBottom: 14 },

  // Top rail
  topRail: { flexDirection: "row", height: 14, alignItems: "flex-end" },
  topRailPost: { width: POST_W + 4, height: 14 },
  topRailPostL: { borderTopLeftRadius: 3, borderTopRightRadius: 1 },
  topRailPostR: { borderTopLeftRadius: 1, borderTopRightRadius: 3 },
  topRailBeam: { flex: 1, height: 10, justifyContent: "center", alignItems: "center", borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  topRailText: { color: "#fff", fontSize: 7, fontWeight: "700", letterSpacing: 2 },

  // Rack body
  rackBody: { flexDirection: "row" },

  // Posts
  post: { width: POST_W, overflow: "hidden", justifyContent: "space-evenly", paddingVertical: 6 },
  postInner: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  postHole: { width: 5, height: 2, borderRadius: 1, alignSelf: "center" },

  // Levels
  levelsWrap: { flex: 1 },

  // Level
  levelContainer: {},
  beam: { height: BEAM_H, position: "relative" },
  beamMain: { flex: 1, height: BEAM_H },
  beamHighlight: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2 },

  levelBody: { flexDirection: "row", paddingVertical: 4 },
  levelLabel: { width: 18, justifyContent: "center", alignItems: "center" },
  levelLabelText: { fontSize: 10, fontWeight: "800" },
  levelBinsArea: { flex: 1, gap: 2 },
  levelCount: { width: 18, justifyContent: "center", alignItems: "center" },
  levelCountText: { fontSize: 8, fontWeight: "600" },

  // Rack line
  rackLine: { flexDirection: "row", gap: 1, minHeight: 20 },

  // Gaveta bin
  gaveta: { borderRadius: 2, overflow: "hidden" },
  gavetaBody: { flex: 1, minHeight: 18, borderRadius: 2, overflow: "hidden", justifyContent: "flex-end" },
  gavetaLip: { height: 3, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  gavetaLabelArea: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 1 },
  gavetaNumber: { color: "#fff", fontSize: 7, fontWeight: "700" },

  // Feet
  rackFeet: { flexDirection: "row", height: 8 },
  foot: { width: POST_W + 6, height: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  footL: { marginLeft: -3 },
  footR: { marginRight: -3 },
  footSpacer: { flex: 1 },

  // Summary section
  summarySection: { marginBottom: 12 },
  summaryHeader: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  sumCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  sumLevelBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  sumLevelText: { fontSize: 10, fontWeight: "800" },
  sumBarArea: { flex: 1 },
  sumBarTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  sumBarFill: { height: 5, borderRadius: 3 },
  sumPctText: { fontSize: 13, fontWeight: "800", width: 34, textAlign: "right" },
  sumFraction: { fontSize: 9, width: 28, textAlign: "right" },

  // Legend
  legendCard: { flexDirection: "row", justifyContent: "center", gap: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 10, fontWeight: "500" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxHeight: "60%", borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 16 },
  modalScroll: { marginBottom: 12 },
  modalOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  modalOptionText: { flex: 1, fontSize: 14, fontWeight: "600" },
  modalCloseBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  modalCloseBtnText: { fontSize: 14, fontWeight: "600" },

  // Gaveta detail modal
  gdOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  gdDismiss: { flex: 1 },
  gdSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingHorizontal: 20 },
  gdHandle: { alignItems: "center", paddingVertical: 10 },
  gdHandleBar: { width: 40, height: 4, borderRadius: 2 },
  gdHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  gdLocBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  gdLocText: { fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  gdCloseBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  gdLoadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80, gap: 14 },
  gdLoadingText: { fontSize: 14, fontWeight: "600" },

  // Solid 3D Bin
  gdBinWrap: { alignItems: "center", marginBottom: 20 },
  gdShadow: { position: "absolute", bottom: -4, left: 50, right: 50, height: 10, borderRadius: 20 },
  gdShell: { width: SCREEN_WIDTH - 100, borderRadius: 12, overflow: "hidden", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  gdRim: { height: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  gdRimInner: { flex: 1, height: 4, marginHorizontal: 4, borderRadius: 2 },
  gdInner: { marginHorizontal: 6, marginTop: 0, borderRadius: 4, overflow: "hidden" },
  gdInnerShadow: { height: 6, opacity: 0.3 },
  gdBinContent: { minHeight: 160, justifyContent: "center", alignItems: "center", padding: 10 },
  gdImgWrap: { width: "100%", height: 140, justifyContent: "center", alignItems: "center", position: "relative" },
  gdImgSpinner: { position: "absolute" },
  gdProductImg: { width: "85%", height: "100%", borderRadius: 6 },
  gdEmptyBin: { alignItems: "center", gap: 6 },
  gdEmptyText: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "600" },
  gdFrontPanel: { height: 20, marginTop: 4, marginHorizontal: 6, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  gdHandle2: { width: 50, height: 6, borderRadius: 3 },
  gdLabelPlate: { marginHorizontal: 6, marginTop: 4, marginBottom: 6, paddingVertical: 5, borderRadius: 4, alignItems: "center" },
  gdBinLabelText: { color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" },

  // Article cards
  gdArticlesList: { gap: 10, paddingHorizontal: 2 },
  gdArtCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  gdArtThumbWrap: { width: 72, height: 72, justifyContent: "center", alignItems: "center", position: "relative", borderTopLeftRadius: 14, borderBottomLeftRadius: 14, overflow: "hidden" },
  gdArtThumbSpinner: { position: "absolute" },
  gdArtThumb: { width: 72, height: 72, position: "absolute", top: 0, left: 0 },
  gdArtInfo: { flex: 1, padding: 10, justifyContent: "center", gap: 4 },
  gdArtClaveBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  gdArtClaveText: { fontSize: 11, fontWeight: "800" },
  gdArtName: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  gdArtMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  gdArtMetaText: { fontSize: 10 },
  gdArtMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  gdArtStockBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginTop: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10,
  },
  gdArtStockValue: { fontSize: 13, fontWeight: "900" },
  gdArtStockLabel: { fontSize: 8, fontWeight: "600", textTransform: "uppercase", marginLeft: 2 },
  gdQuebradaBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gdQuebradaText: { fontSize: 10, fontWeight: "900" },

  // Mode loading overlay
  modeLoadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 100, 
    justifyContent: "center", 
    alignItems: "center",
    overflow: 'hidden'
  },
  modeLoadingText: { fontSize: 18, fontWeight: "700", marginTop: 0 },

  // Empty state
  gdEmptyState: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 30 },
  gdEmptyStateTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  gdEmptyStateDesc: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  zoomResetBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 110,
  }
});
