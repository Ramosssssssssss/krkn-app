import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { SkeletonCardList } from "@/components/Skeleton";
import { API_URL } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// ==================== TIPOS ====================
interface OrdenPacking {
  R_DOCTO_ID: number;
  R_FOLIO: string;
  R_ALMACEN: string;
  R_DESCRIPCION: string;
  R_FECHA: string;
  R_HORA: string;
  R_SISTEMA: string;
}

type TabMode = "scan" | "list";

export default function PackingScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Mode ───────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TabMode>("scan");
  const tabAnim = useRef(new Animated.Value(0)).current; // 0=scan, 1=list
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Data ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordenes, setOrdenes] = useState<OrdenPacking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    type: "warning" | "error" | "success";
  }>({
    visible: false,
    message: "",
    type: "warning",
  });

  // ── Scan mode ──────────────────────────────────────────────────────────
  const [scannerVisible, setScannerVisible] = useState(false);
  const [pdaValue, setPdaValue] = useState("");
  const [scanResult, setScanResult] = useState<{
    found: boolean;
    orden?: OrdenPacking;
    folio?: string;
    nombreCaja?: string;
    picker?: string;
    errorMsg?: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const pdaRef = useRef<TextInput>(null);
  const scanLock = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  // ── Helpers ────────────────────────────────────────────────────────────
  const limpiarFolio = (folio: string) => {
    if (!folio) return "";
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/);
    return match ? `${match[1]}${match[2]}` : folio;
  };

  // ── Tab switch animation ───────────────────────────────────────────────
  const switchTab = (tab: TabMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "scan" ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
    if (tab === "scan") {
      setTimeout(() => pdaRef.current?.focus(), 300);
    }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchOrdenes = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/ordenes-packing.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.ordenes)) {
        const sorted = data.ordenes.sort((a: OrdenPacking, b: OrdenPacking) => {
          const dateA = `${a.R_FECHA} ${a.R_HORA}`;
          const dateB = `${b.R_FECHA} ${b.R_HORA}`;
          return dateB.localeCompare(dateA);
        });
        setOrdenes(sorted);
      } else {
        setOrdenes([]);
      }
    } catch (e) {
      console.error("Error fetching ordenes packing:", e);
      setOrdenes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdenes();
  };

  // ── Navigate to detail ─────────────────────────────────────────────────
  const handleSelectOrden = (orden: OrdenPacking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: "/(main)/procesos/packing/detalle-orden",
      params: {
        folio: limpiarFolio(orden.R_FOLIO),
        doctoId: String(orden.R_DOCTO_ID),
        almacen: orden.R_ALMACEN,
        sistema: orden.R_SISTEMA,
        descripcion: orden.R_DESCRIPCION,
      },
    });
  };

  // ── Scan logic — busca por código de caja en el backend ──────────────
  const processScannedBox = useCallback(
    async (rawCode: string) => {
      if (scanLock.current || searching) return;
      const code = rawCode.trim().toUpperCase();
      if (!code) return;

      scanLock.current = true;
      setSearching(true);
      Keyboard.dismiss();

      try {
        const databaseId = getCurrentDatabaseId();
        const res = await fetch(`${API_URL}/api/buscar-orden-por-caja.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId, codigoCaja: code }),
        });
        const data = await res.json();

        if (data.success && data.found && data.orden) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setScanResult({
            found: true,
            orden: data.orden as OrdenPacking,
            folio: code,
            nombreCaja: data.nombreCaja,
            picker: data.picker,
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setScanResult({
            found: false,
            folio: code,
            errorMsg: data.message || "No se encontró orden para esta caja",
          });
        }
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setScanResult({
          found: false,
          folio: code,
          errorMsg: "Error de conexión",
        });
      } finally {
        setSearching(false);
        scanLock.current = false;
        setPdaValue("");
      }
    },
    [searching],
  );

  // ── Pulse animation para "esperando escaneo" ─────────────────────
  useEffect(() => {
    if (mode === "scan" && !scanResult && !searching) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mode, scanResult, searching, pulseAnim]);

  const handleCameraScan = (data: string) => {
    if (scanLock.current) return;
    setScannerVisible(false);
    processScannedBox(data);
  };

  const openCamera = async () => {
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
    setScannerVisible(true);
  };

  // ── Filtered list ──────────────────────────────────────────────────────
  const filtered = ordenes.filter(
    (o) =>
      (o.R_FOLIO || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.R_DESCRIPCION || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (o.R_ALMACEN || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ── UI helpers ─────────────────────────────────────────────────────────
  const getSistemaColor = (sistema: string) => {
    switch (sistema?.toUpperCase()) {
      case "PEDIDO":
        return "#3B82F6";
      case "TRASPASO":
        return "#8B5CF6";
      default:
        return "#10B981";
    }
  };

  const getSistemaIcon = (sistema: string): keyof typeof Ionicons.glyphMap => {
    switch (sistema?.toUpperCase()) {
      case "PEDIDO":
        return "cart-outline";
      case "TRASPASO":
        return "swap-horizontal-outline";
      default:
        return "cube-outline";
    }
  };

  const pillBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  // ── Tab indicator position ─────────────────────────────────────────────
  const TAB_BAR_W = Math.min(SCREEN_W - 48, 280);
  const TAB_W = TAB_BAR_W / 2;

  const indicatorTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_W],
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── Render: Order Card ─────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  const renderOrden = ({ item }: { item: OrdenPacking }) => {
    const sistemaColor = getSistemaColor(item.R_SISTEMA);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectOrden(item)}
        disabled={loading}
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          },
        ]}
      >
        <View style={styles.orderHeader}>
          <View
            style={[
              styles.sistemaPill,
              { backgroundColor: `${sistemaColor}15` },
            ]}
          >
            <Ionicons
              name={getSistemaIcon(item.R_SISTEMA)}
              size={12}
              color={sistemaColor}
            />
            <Text style={[styles.sistemaPillText, { color: sistemaColor }]}>
              {item.R_SISTEMA}
            </Text>
          </View>
          <View style={styles.orderFolioRow}>
            <Text style={[styles.orderFolio, { color: colors.text }]}>
              {limpiarFolio(item.R_FOLIO)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </View>
        <Text
          style={[styles.orderDesc, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.R_DESCRIPCION || "Sin descripción"}
        </Text>
        <View style={styles.orderMeta}>
          <View style={[styles.metaPill, { backgroundColor: pillBg }]}>
            <Ionicons name="location" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.R_ALMACEN}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: pillBg }]}>
            <Ionicons name="calendar" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.R_FECHA}
            </Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: pillBg }]}>
            <Ionicons name="time" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.R_HORA}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // ── Render: Scan Mode ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  const renderScanMode = () => (
    <View style={styles.scanContainer}>
      {/* Ilustración / zona principal */}
      <View style={styles.scanHero}>
        <View
          style={[
            styles.scanIconCircle,
            {
              backgroundColor: isDark
                ? "rgba(59,130,246,0.1)"
                : "rgba(59,130,246,0.06)",
            },
          ]}
        >
          <View
            style={[
              styles.scanIconInner,
              {
                backgroundColor: isDark
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(59,130,246,0.1)",
              },
            ]}
          >
            <Ionicons name="cube" size={44} color="#3B82F6" />
          </View>
        </View>
        <Text style={[styles.scanTitle, { color: colors.text }]}>
          Escanear Caja
        </Text>
        <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>
          Escanea el código de la caja de picking para encontrar la orden
          asociada
        </Text>
      </View>

      {/* Hidden PDA Input — captura escaneos PDA sin teclado */}
      <TextInput
        ref={pdaRef}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        value={pdaValue}
        onChangeText={setPdaValue}
        style={{
          position: "absolute",
          top: -100,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0,
        }}
        onSubmitEditing={() => {
          const code = pdaValue.trim();
          setPdaValue("");
          if (code) {
            processScannedBox(code);
          }
        }}
        blurOnSubmit={false}
        onBlur={() => {
          if (mode === "scan") {
            setTimeout(() => pdaRef.current?.focus(), 50);
          }
        }}
      />

      {/* Estado visual de escaneo */}
      <View style={styles.scanInputSection}>
        {searching ? (
          <View
            style={[
              styles.scanStatusCard,
              {
                backgroundColor: isDark
                  ? "rgba(59,130,246,0.08)"
                  : "rgba(59,130,246,0.04)",
                borderColor: isDark
                  ? "rgba(59,130,246,0.2)"
                  : "rgba(59,130,246,0.12)",
              },
            ]}
          >
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={[styles.scanStatusText, { color: "#3B82F6" }]}>
              Buscando orden...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.scanStatusCard,
              {
                opacity: pulseAnim,
                backgroundColor: isDark
                  ? "rgba(16,185,129,0.06)"
                  : "rgba(16,185,129,0.03)",
                borderColor: isDark
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(16,185,129,0.1)",
              },
            ]}
          >
            <View style={styles.scanPulseRow}>
              <View
                style={[styles.scanPulseDot, { backgroundColor: "#10B981" }]}
              />
              <Text style={[styles.scanStatusText, { color: "#10B981" }]}>
                Esperando escaneo PDA
              </Text>
            </View>
            <Text
              style={[styles.scanStatusHint, { color: colors.textTertiary }]}
            >
              Apunta la PDA al código de la caja
            </Text>
          </Animated.View>
        )}

        {/* Botón cámara alternativo */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={openCamera}
          style={[
            styles.cameraAltBtn,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <Ionicons
            name="camera-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.cameraAltBtnText, { color: colors.textSecondary }]}
          >
            O usa la cámara
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resultado del escaneo */}
      {scanResult && (
        <View style={styles.scanResultSection}>
          {scanResult.found && scanResult.orden ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                handleSelectOrden(scanResult.orden!);
                setScanResult(null);
              }}
              style={[
                styles.resultCard,
                styles.resultCardSuccess,
                {
                  backgroundColor: isDark
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(16,185,129,0.05)",
                  borderColor: isDark
                    ? "rgba(16,185,129,0.2)"
                    : "rgba(16,185,129,0.15)",
                },
              ]}
            >
              <View style={styles.resultCardHeader}>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: "rgba(16,185,129,0.12)" },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultLabel, { color: "#10B981" }]}>
                    Orden encontrada
                  </Text>
                  <Text style={[styles.resultFolio, { color: colors.text }]}>
                    {limpiarFolio(scanResult.orden.R_FOLIO)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.resultSistemaPill,
                    {
                      backgroundColor: `${getSistemaColor(scanResult.orden.R_SISTEMA)}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultSistemaText,
                      { color: getSistemaColor(scanResult.orden.R_SISTEMA) },
                    ]}
                  >
                    {scanResult.orden.R_SISTEMA}
                  </Text>
                </View>
              </View>
              {/* Info de la caja y picker */}
              {(scanResult.nombreCaja || scanResult.picker) && (
                <View
                  style={[
                    styles.resultCajaInfo,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)",
                    },
                  ]}
                >
                  {scanResult.nombreCaja ? (
                    <View style={styles.resultCajaRow}>
                      <Ionicons
                        name="cube"
                        size={13}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.resultCajaMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {scanResult.nombreCaja}
                      </Text>
                    </View>
                  ) : null}
                  {scanResult.picker ? (
                    <View style={styles.resultCajaRow}>
                      <Ionicons
                        name="person"
                        size={13}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.resultCajaMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Surtió: {scanResult.picker}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
              <Text
                style={[styles.resultDesc, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {scanResult.orden.R_DESCRIPCION || "Sin descripción"}
              </Text>
              <View style={styles.resultFooter}>
                <Text
                  style={[styles.resultMeta, { color: colors.textTertiary }]}
                >
                  {scanResult.orden.R_ALMACEN} · {scanResult.orden.R_FECHA}
                </Text>
                <View style={styles.resultGoRow}>
                  <Text style={[styles.resultGoText, { color: "#10B981" }]}>
                    Ir a empacar
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#10B981" />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.resultCard,
                styles.resultCardError,
                {
                  backgroundColor: isDark
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(239,68,68,0.04)",
                  borderColor: isDark
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(239,68,68,0.12)",
                },
              ]}
            >
              <View style={styles.resultCardHeader}>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: "rgba(239,68,68,0.12)" },
                  ]}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultLabel, { color: "#EF4444" }]}>
                    No encontrada
                  </Text>
                  <Text style={[styles.resultFolio, { color: colors.text }]}>
                    {scanResult.folio}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.resultDesc, { color: colors.textSecondary }]}
              >
                {scanResult.errorMsg ||
                  "No se encontró una orden asociada a esta caja."}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setScanResult(null);
                  setTimeout(() => pdaRef.current?.focus(), 200);
                }}
                style={[
                  styles.resultRetryBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Ionicons name="refresh" size={16} color={colors.text} />
                <Text style={[styles.resultRetryText, { color: colors.text }]}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Mini lista reciente (muestra las 3 primeros) */}
      {!scanResult && ordenes.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.recentTitle, { color: colors.textTertiary }]}>
            RECIENTES · {ordenes.length} pendientes
          </Text>
          {ordenes.slice(0, 3).map((o) => {
            const sc = getSistemaColor(o.R_SISTEMA);
            return (
              <TouchableOpacity
                key={`${o.R_SISTEMA}-${o.R_DOCTO_ID}`}
                activeOpacity={0.7}
                onPress={() => handleSelectOrden(o)}
                style={[
                  styles.recentItem,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <View style={[styles.recentDot, { backgroundColor: sc }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentFolio, { color: colors.text }]}>
                    {limpiarFolio(o.R_FOLIO)}
                  </Text>
                  <Text
                    style={[styles.recentMeta, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {o.R_SISTEMA} · {o.R_ALMACEN}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  // ════════════════════════════════════════════════════════════════════════
  // ── Main Render ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header (siempre visible) ──────────────────────────────────── */}
      <View style={[styles.pageHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
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
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Packing
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              {ordenes.length} órdenes pendientes
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={[
              styles.headerRefreshBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {mode === "scan" ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderScanMode}
          contentContainerStyle={[
            styles.scanScrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderOrden}
          keyExtractor={(item) => `${item.R_SISTEMA}-${item.R_DOCTO_ID}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          ListHeaderComponent={
            <View style={styles.searchWrap}>
              <View
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                  placeholder="Buscar folio, almacén o descripción"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchTerm("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <SkeletonCardList count={4} />
            ) : (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIcon,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={40}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Sin órdenes
                </Text>
                <Text
                  style={[styles.emptyDesc, { color: colors.textSecondary }]}
                >
                  No hay órdenes pendientes de packing
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
        />
      )}

      {/* ══ Floating Tab Bar ═════════════════════════════════════════════ */}
      <View style={[styles.tabBarOuter, { bottom: insets.bottom + 16 }]}>
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: isDark
                ? "rgba(30,30,30,0.95)"
                : "rgba(255,255,255,0.95)",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
              width: TAB_BAR_W,
            },
          ]}
        >
          {/* Animated indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                width: TAB_W - 6,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
                transform: [
                  { translateX: Animated.add(indicatorTranslateX, 3) },
                ],
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => switchTab("scan")}
            style={[styles.tabBtn, { width: TAB_W }]}
          >
            <Ionicons
              name="scan-outline"
              size={19}
              color={
                mode === "scan"
                  ? isDark
                    ? "#fff"
                    : "#1E293B"
                  : colors.textTertiary
              }
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    mode === "scan"
                      ? isDark
                        ? "#fff"
                        : "#1E293B"
                      : colors.textTertiary,
                  fontWeight: mode === "scan" ? "700" : "500",
                },
              ]}
            >
              Escanear
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => switchTab("list")}
            style={[styles.tabBtn, { width: TAB_W }]}
          >
            <Ionicons
              name="list-outline"
              size={19}
              color={
                mode === "list"
                  ? isDark
                    ? "#fff"
                    : "#1E293B"
                  : colors.textTertiary
              }
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    mode === "list"
                      ? isDark
                        ? "#fff"
                        : "#1E293B"
                      : colors.textTertiary,
                  fontWeight: mode === "list" ? "700" : "500",
                },
              ]}
            >
              Lista
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Camera Scanner Modal ─────────────────────────────────────── */}
      <CameraScannerPicking
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleCameraScan}
        topInset={insets.top}
        title="Escanear Caja"
      />

      {/* ── iOS Alert ────────────────────────────────────────────────── */}
      <Modal visible={alert.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <BlurView
            intensity={80}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.alertIconWrap,
                {
                  backgroundColor: isDark
                    ? "rgba(251,191,36,0.12)"
                    : "rgba(251,191,36,0.08)",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={28} color="#F59E0B" />
            </View>
            <Text style={[styles.alertTitle, { color: colors.text }]}>
              Atención
            </Text>
            <Text
              style={[styles.alertMessage, { color: colors.textSecondary }]}
            >
              {alert.message}
            </Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: colors.accent }]}
              onPress={() =>
                setAlert({ visible: false, message: "", type: "warning" })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.alertBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── Header ──────────────────────────────────────────────────────────
  pageHeader: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitles: { flex: 1, marginLeft: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── List ────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16 },
  searchWrap: { marginBottom: 14 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  // ─── Order Card ──────────────────────────────────────────────────────
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: { marginBottom: 10 },
  sistemaPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  sistemaPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  orderFolioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderFolio: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  orderDesc: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
    marginBottom: 12,
  },
  orderMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: "45%",
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },

  // ─── Scan Mode ───────────────────────────────────────────────────────
  scanScrollContent: { paddingHorizontal: 16 },
  scanContainer: { gap: 24 },
  scanHero: {
    alignItems: "center",
    paddingTop: 24,
    gap: 10,
  },
  scanIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  scanIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  scanSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  scanInputSection: { gap: 12 },
  scanStatusCard: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  scanPulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanStatusText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  scanStatusHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  cameraAltBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 13,
    gap: 8,
    borderWidth: 1,
  },
  cameraAltBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ─── Scan Result ─────────────────────────────────────────────────────
  scanResultSection: {},
  resultCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  resultCardSuccess: {},
  resultCardError: {},
  resultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resultFolio: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 1,
  },
  resultSistemaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  resultSistemaText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  resultDesc: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  resultFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  resultGoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultGoText: {
    fontSize: 13,
    fontWeight: "700",
  },
  resultRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  resultRetryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultCajaInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resultCajaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultCajaMeta: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ─── Recent ──────────────────────────────────────────────────────────
  recentSection: { gap: 8 },
  recentTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    gap: 12,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentFolio: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  recentMeta: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },

  // ─── Floating Tab Bar ────────────────────────────────────────────────
  tabBarOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    left: 0,
    height: "100%",
    borderRadius: 13,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 13,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: -0.1,
  },

  // ─── Empty State ─────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // ─── iOS Alert ───────────────────────────────────────────────────────
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  alertCard: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  alertBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
