import { API_URL } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const BANNER_W = SCREEN_W - 48;
const BANNER_GAP = 14;
const BANNER_SNAP = BANNER_W + BANNER_GAP;

// ── Paleta refinada ──────────────────────────────────────────────────────────
const PALETTE = {
  indigo: ["#4F46E5", "#818CF8"] as const,
  sky: ["#0369A1", "#38BDF8"] as const,
  emerald: ["#059669", "#6EE7B7"] as const,
  amber: ["#D97706", "#FCD34D"] as const,
  slate: ["#334155", "#94A3B8"] as const,
  rose: ["#BE123C", "#FDA4AF"] as const,
};

// ── Banners ──────────────────────────────────────────────────────────────────
interface BannerItem {
  id: string;
  title: string;
  body: string;
  gradient: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  tag?: string;
}

const BANNERS_SOURCE: BannerItem[] = [
  {
    id: "1",
    title: "Punto de Venta\nInteligente",
    body: "Escanea, cobra y cotiza. Todo desde un mismo lugar, diseñado para velocidad.",
    gradient: PALETTE.indigo,
    icon: "flash",
    accent: "#818CF8",
    tag: "POS",
  },
  {
    id: "2",
    title: "Cotizaciones\nal Instante",
    body: "Genera, comparte por WhatsApp y convierte cotizaciones en ventas reales.",
    gradient: PALETTE.sky,
    icon: "document-text",
    accent: "#38BDF8",
  },
  {
    id: "3",
    title: "Clientes\nSincronizados",
    body: "Directorio empresarial conectado a tu ERP. Busca y asigna en un toque.",
    gradient: PALETTE.emerald,
    icon: "people",
    accent: "#6EE7B7",
  },
  {
    id: "4",
    title: "Control\nTotal",
    body: "Historial de ventas, métricas y reportes. Toda tu operación en la palma.",
    gradient: PALETTE.slate,
    icon: "stats-chart",
    accent: "#94A3B8",
  },
];

// Triplicar para loop infinito
const BANNERS = [...BANNERS_SOURCE, ...BANNERS_SOURCE, ...BANNERS_SOURCE];
const REAL_COUNT = BANNERS_SOURCE.length;
const START_INDEX = REAL_COUNT; // Empezar en el set del medio

// ── Acciones ─────────────────────────────────────────────────────────────────
interface MenuAction {
  key: string;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route?: string;
  disabled?: boolean;
}

const ACTIONS: MenuAction[] = [
  {
    key: "nueva-venta",
    label: "Nueva Venta",
    sub: "Crear ticket de venta",
    icon: "bag-handle-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
    route: "/(main)/pos/nueva-venta",
  },
  {
    key: "nuevo-cliente",
    label: "Nuevo Cliente",
    sub: "Registrar en catálogo",
    icon: "person-add-outline",
    color: "#0369A1",
    bg: "#E0F2FE",
    disabled: true,
  },
  {
    key: "mis-ventas",
    label: "Mis Ventas",
    sub: "Historial y tickets",
    icon: "receipt-outline",
    color: "#059669",
    bg: "#ECFDF5",
    disabled: true,
  },
  {
    key: "mis-clientes",
    label: "Mis Clientes",
    sub: "Directorio completo",
    icon: "people-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    route: "/(main)/pos/mis-clientes",
  },
];

// ── Tipos de Sesión ──────────────────────────────────────────────────────────
interface CajaItem {
  CAJA_ID: number;
  NOMBRE: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
}

interface CajeroItem {
  CAJERO_ID: number;
  NOMBRE: string;
}

export default function POSMenuScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Carousel state ─────────────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  const [realIndex, setRealIndex] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offsetRef = useRef(START_INDEX * BANNER_SNAP);
  const touchingRef = useRef(false);

  // ── Sesión de caja ────────────────────────────────────────────────────
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionStep, setSessionStep] = useState<"caja" | "cajero">("caja");
  const [cajas, setCajas] = useState<CajaItem[]>([]);
  const [cajeros, setCajeros] = useState<CajeroItem[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [loadingCajeros, setLoadingCajeros] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<CajaItem | null>(null);
  const [selectedCajero, setSelectedCajero] = useState<CajeroItem | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const fetchCajas = useCallback(async () => {
    setLoadingCajas(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/POS/sesion-caja.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, action: "cajas" }),
      });
      const json = await res.json();
      if (json.success) setCajas(json.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingCajas(false);
    }
  }, []);

  const fetchCajeros = useCallback(async (cajaId: number) => {
    setLoadingCajeros(true);
    setCajeros([]);
    try {
      const databaseId = getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/POS/sesion-caja.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, action: "cajeros", cajaId }),
      });
      const json = await res.json();
      if (json.success) setCajeros(json.data || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingCajeros(false);
    }
  }, []);

  const openSessionModal = useCallback(() => {
    setSessionStep("caja");
    setSessionModal(true);
    fetchCajas();
  }, [fetchCajas]);

  const handleSelectCaja = useCallback(
    (caja: CajaItem) => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCaja(caja);
      setSessionStep("cajero");
      fetchCajeros(caja.CAJA_ID);
    },
    [fetchCajeros],
  );

  const handleSelectCajero = useCallback((cajero: CajeroItem) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCajero(cajero);
    setSessionActive(true);
    setSessionModal(false);
  }, []);

  const handleActionPress = useCallback(
    (action: MenuAction) => {
      if (!action.route) return;
      if (!sessionActive) {
        openSessionModal();
        return;
      }
      router.push(action.route as any);
    },
    [sessionActive, openSessionModal],
  );

  const handleEndSession = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSessionActive(false);
    setSelectedCaja(null);
    setSelectedCajero(null);
  }, []);

  // Scroll al set del medio al montar
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: START_INDEX * BANNER_SNAP,
        animated: false,
      });
    }, 50);
  }, []);

  // Autoplay
  const startAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      if (touchingRef.current) return;
      offsetRef.current += BANNER_SNAP;
      scrollRef.current?.scrollTo({ x: offsetRef.current, animated: true });
    }, 3800);
  }, []);

  useEffect(() => {
    startAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [startAuto]);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    offsetRef.current = x;
    const idx = Math.round(x / BANNER_SNAP) % REAL_COUNT;
    if (idx !== realIndex) setRealIndex(idx < 0 ? 0 : idx);
  };

  const handleScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const totalIdx = Math.round(x / BANNER_SNAP);

    // Si salimos del rango del set del medio, saltar silenciosamente
    if (totalIdx < REAL_COUNT || totalIdx >= REAL_COUNT * 2) {
      const mapped = totalIdx % REAL_COUNT;
      const newX = (REAL_COUNT + mapped) * BANNER_SNAP;
      offsetRef.current = newX;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: newX, animated: false });
      }, 30);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const glass = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.92)";
  const glassBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const cardShadow = isDark ? "transparent" : "rgba(0,0,0,0.06)";
  const subtleText = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";

  return (
    <View
      style={[
        st.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ Header ══════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.duration(600)} style={st.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[st.backBtn, { backgroundColor: glassBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.headerSub, { color: subtleText }]}>Kraken</Text>
            <Text style={[st.headerTitle, { color: colors.text }]}>
              Punto de Venta
            </Text>
          </View>
          <View
            style={[
              st.livePill,
              {
                backgroundColor: sessionActive
                  ? isDark
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(5,150,105,0.08)"
                  : isDark
                    ? "rgba(251,191,36,0.12)"
                    : "rgba(217,119,6,0.08)",
              },
            ]}
          >
            <View
              style={[
                st.liveDot,
                {
                  backgroundColor: sessionActive ? "#10B981" : "#F59E0B",
                },
              ]}
            />
            <Text
              style={[
                st.liveText,
                { color: sessionActive ? "#10B981" : "#F59E0B" },
              ]}
            >
              {sessionActive ? "Sesión activa" : "Sin sesión"}
            </Text>
          </View>
        </Animated.View>

        {/* ══ Banner Carousel ═════════════════════════════════════════════ */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(550)}
          style={{ marginTop: 16 }}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled={false}
            snapToInterval={BANNER_SNAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollEnd}
            onTouchStart={() => {
              touchingRef.current = true;
              if (autoRef.current) clearInterval(autoRef.current);
            }}
            onTouchEnd={() => {
              touchingRef.current = false;
              startAuto();
            }}
          >
            {BANNERS.map((b, i) => (
              <View
                key={`${b.id}-${i}`}
                style={[
                  st.slide,
                  {
                    width: BANNER_W,
                    marginRight: i < BANNERS.length - 1 ? BANNER_GAP : 0,
                  },
                ]}
              >
                <LinearGradient
                  colors={b.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.slideGrad}
                >
                  {/* Orbs decorativos */}
                  <View
                    style={[
                      st.orb,
                      {
                        width: 200,
                        height: 200,
                        top: -60,
                        right: -50,
                        backgroundColor: "rgba(255,255,255,0.06)",
                      },
                    ]}
                  />
                  <View
                    style={[
                      st.orb,
                      {
                        width: 120,
                        height: 120,
                        bottom: -40,
                        left: -30,
                        backgroundColor: "rgba(255,255,255,0.04)",
                      },
                    ]}
                  />
                  <View
                    style={[
                      st.orb,
                      {
                        width: 80,
                        height: 80,
                        top: 20,
                        right: 40,
                        backgroundColor: "rgba(255,255,255,0.05)",
                      },
                    ]}
                  />

                  {/* Contenido */}
                  <View style={st.slideBody}>
                    <View style={{ flex: 1, gap: 8 }}>
                      {b.tag && (
                        <View style={st.slideTag}>
                          <Text style={st.slideTagText}>{b.tag}</Text>
                        </View>
                      )}
                      <Text style={st.slideTitle}>{b.title}</Text>
                      <Text style={st.slideDesc}>{b.body}</Text>
                    </View>
                    <View style={st.slideIconBox}>
                      <Ionicons
                        name={b.icon}
                        size={30}
                        color="rgba(255,255,255,0.85)"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          {/* Indicadores */}
          <View style={st.indicators}>
            {BANNERS_SOURCE.map((_, i) => {
              const active = i === realIndex;
              return (
                <View
                  key={i}
                  style={[
                    st.indicator,
                    {
                      width: active ? 24 : 6,
                      backgroundColor: active
                        ? isDark
                          ? "#fff"
                          : "#1E293B"
                        : isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.12)",
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* ══ Quick Actions ═══════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <Text style={[st.sectionTitle, { color: subtleText }]}>Acciones</Text>

          <View style={st.grid}>
            {ACTIONS.map((a, idx) => {
              const actionBg = isDark ? "rgba(255,255,255,0.04)" : a.bg;
              const iconBg = isDark ? a.color + "18" : a.color + "14";
              return (
                <Animated.View
                  key={a.key}
                  entering={FadeInUp.delay(300 + idx * 60).duration(400)}
                  style={st.gridCell}
                >
                  <TouchableOpacity
                    activeOpacity={0.75}
                    disabled={a.disabled}
                    onPress={() => handleActionPress(a)}
                    style={[
                      st.actionCard,
                      {
                        backgroundColor: actionBg,
                        borderColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : a.color + "12",
                        opacity: a.disabled ? 0.45 : 1,
                      },
                    ]}
                  >
                    {/* Icon */}
                    <View style={[st.actionIcon, { backgroundColor: iconBg }]}>
                      <Ionicons name={a.icon} size={22} color={a.color} />
                    </View>

                    {/* Labels */}
                    <Text
                      style={[st.actionLabel, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {a.label}
                    </Text>
                    <Text
                      style={[st.actionSub, { color: subtleText }]}
                      numberOfLines={1}
                    >
                      {a.sub}
                    </Text>

                    {/* Arrow */}
                    <View
                      style={[
                        st.actionArrow,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : a.color + "08",
                        },
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={a.color + "80"}
                      />
                    </View>

                    {/* Próximamente badge */}
                    {a.disabled && (
                      <View
                        style={[
                          st.soon,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.03)",
                          },
                        ]}
                      >
                        <Text style={[st.soonText, { color: subtleText }]}>
                          Pronto
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* ══ Session Info Card ═════════════════════════════════════════ */}
        {sessionActive && selectedCaja && selectedCajero && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={[
              st.sessionCard,
              {
                backgroundColor: isDark
                  ? "rgba(79,70,229,0.08)"
                  : "rgba(79,70,229,0.04)",
                borderColor: isDark
                  ? "rgba(79,70,229,0.18)"
                  : "rgba(79,70,229,0.12)",
              },
            ]}
          >
            <View style={st.sessionCardBody}>
              <View
                style={[
                  st.sessionIconBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(79,70,229,0.15)"
                      : "rgba(79,70,229,0.08)",
                  },
                ]}
              >
                <Ionicons name="desktop-outline" size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    st.sessionLabel,
                    { color: isDark ? "#A5B4FC" : "#4338CA" },
                  ]}
                >
                  {selectedCaja.NOMBRE}
                </Text>
                <Text
                  style={[st.sessionSub, { color: subtleText }]}
                  numberOfLines={1}
                >
                  {selectedCajero.NOMBRE} · {selectedCaja.ALMACEN_NOMBRE}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleEndSession}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  st.sessionClose,
                  {
                    backgroundColor: isDark
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(239,68,68,0.06)",
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={isDark ? "#FCA5A5" : "#DC2626"}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ══ Tip ═════════════════════════════════════════════════════════ */}
        <Animated.View
          entering={FadeInDown.delay(550).duration(400)}
          style={[st.tip, { backgroundColor: glass, borderColor: glassBorder }]}
        >
          <View
            style={[
              st.tipIcon,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
              },
            ]}
          >
            <Ionicons
              name="bulb-outline"
              size={16}
              color={isDark ? "#FCD34D" : "#D97706"}
            />
          </View>
          <Text style={[st.tipText, { color: subtleText }]}>
            {sessionActive
              ? "Sesión activa. Toca la ✕ en la tarjeta de sesión para cerrarla."
              : "Selecciona una Caja y Cajero antes de iniciar una venta."}
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ══ Session Modal ═══════════════════════════════════════════════ */}
      <Modal
        visible={sessionModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSessionModal(false)}
      >
        <View style={st.modalOverlay}>
          <View
            style={[
              st.modalSheet,
              {
                backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Handle */}
            <View style={st.modalHandle}>
              <View
                style={[
                  st.modalHandleBar,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.12)",
                  },
                ]}
              />
            </View>

            {/* Header */}
            <View style={st.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[st.modalTitle, { color: colors.text }]}>
                  {sessionStep === "caja"
                    ? "Seleccionar Caja"
                    : "Seleccionar Cajero"}
                </Text>
                <Text style={[st.modalSubtitle, { color: subtleText }]}>
                  {sessionStep === "caja"
                    ? "Elige la caja donde operarás"
                    : `Caja: ${selectedCaja?.NOMBRE}`}
                </Text>
              </View>
              {sessionStep === "cajero" && (
                <TouchableOpacity
                  onPress={() => {
                    setSessionStep("caja");
                    setCajeros([]);
                    setSelectedCaja(null);
                  }}
                  style={[
                    st.modalBackBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F1F5F9",
                    },
                  ]}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSessionModal(false)}
                style={[
                  st.modalCloseBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "#F1F5F9",
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Step indicator */}
            <View style={st.stepRow}>
              <View
                style={[
                  st.stepDot,
                  {
                    backgroundColor: "#6366F1",
                    width: sessionStep === "caja" ? 24 : 8,
                  },
                ]}
              />
              <View
                style={[
                  st.stepDot,
                  {
                    backgroundColor:
                      sessionStep === "cajero"
                        ? "#6366F1"
                        : isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.08)",
                    width: sessionStep === "cajero" ? 24 : 8,
                  },
                ]}
              />
            </View>

            {/* Content */}
            <ScrollView
              style={st.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {sessionStep === "caja" && (
                <>
                  {loadingCajas ? (
                    <View style={st.modalLoader}>
                      <ActivityIndicator color="#6366F1" size="small" />
                      <Text style={[st.modalLoaderText, { color: subtleText }]}>
                        Cargando cajas…
                      </Text>
                    </View>
                  ) : cajas.length === 0 ? (
                    <View style={st.modalEmpty}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={32}
                        color={subtleText}
                      />
                      <Text style={[st.modalEmptyText, { color: subtleText }]}>
                        No hay cajas disponibles
                      </Text>
                    </View>
                  ) : (
                    cajas.map((c) => (
                      <TouchableOpacity
                        key={c.CAJA_ID}
                        activeOpacity={0.7}
                        onPress={() => handleSelectCaja(c)}
                        style={[
                          st.optionCard,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "#F8FAFC",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            st.optionIcon,
                            {
                              backgroundColor: isDark
                                ? "rgba(99,102,241,0.15)"
                                : "rgba(99,102,241,0.08)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="desktop-outline"
                            size={18}
                            color="#6366F1"
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[st.optionTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {c.NOMBRE}
                          </Text>
                          <Text
                            style={[st.optionSub, { color: subtleText }]}
                            numberOfLines={1}
                          >
                            {c.ALMACEN_NOMBRE}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={subtleText}
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}

              {sessionStep === "cajero" && (
                <>
                  {loadingCajeros ? (
                    <View style={st.modalLoader}>
                      <ActivityIndicator color="#6366F1" size="small" />
                      <Text style={[st.modalLoaderText, { color: subtleText }]}>
                        Cargando cajeros…
                      </Text>
                    </View>
                  ) : cajeros.length === 0 ? (
                    <View style={st.modalEmpty}>
                      <Ionicons
                        name="person-outline"
                        size={32}
                        color={subtleText}
                      />
                      <Text style={[st.modalEmptyText, { color: subtleText }]}>
                        No hay cajeros autorizados para esta caja
                      </Text>
                    </View>
                  ) : (
                    cajeros.map((c) => (
                      <TouchableOpacity
                        key={c.CAJERO_ID}
                        activeOpacity={0.7}
                        onPress={() => handleSelectCajero(c)}
                        style={[
                          st.optionCard,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "#F8FAFC",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                      >
                        <View
                          style={[
                            st.optionIcon,
                            {
                              backgroundColor: isDark
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(16,185,129,0.08)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={18}
                            color="#10B981"
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[st.optionTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {c.NOMBRE}
                          </Text>
                          <Text
                            style={[st.optionSub, { color: subtleText }]}
                            numberOfLines={1}
                          >
                            ID: {c.CAJERO_ID}
                          </Text>
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#10B981"
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 0,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 0.2,
  },

  /* Carousel */
  slide: {
    borderRadius: 20,
    overflow: "hidden",
  },
  slideGrad: {
    padding: 24,
    paddingBottom: 22,
    minHeight: 170,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  orb: { position: "absolute", borderRadius: 999 },
  slideBody: { flexDirection: "row", alignItems: "flex-end", gap: 16 },
  slideTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slideTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  slideTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  slideDesc: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
  },
  slideIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Indicators */
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 16,
  },
  indicator: {
    height: 5,
    borderRadius: 3,
  },

  /* Actions */
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 18,
    gap: 10,
  },
  gridCell: {
    width: (SCREEN_W - 46) / 2,
  },
  actionCard: {
    borderRadius: 18,
    padding: 16,
    paddingBottom: 14,
    borderWidth: 1,
    minHeight: 148,
    justifyContent: "flex-end",
    gap: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  actionLabel: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  actionSub: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  actionArrow: {
    position: "absolute",
    top: 15,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  soon: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  soonText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  /* Tip */
  tip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 24,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    gap: 10,
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: "500" },

  /* Session card */
  sessionCard: {
    marginHorizontal: 22,
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sessionCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  sessionSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  sessionClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    minHeight: 380,
  },
  modalHandle: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  modalBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Step indicator */
  stepRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  stepDot: {
    height: 5,
    borderRadius: 3,
  },

  /* Modal content */
  modalContent: {
    flex: 1,
    paddingHorizontal: 18,
  },
  modalLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  modalLoaderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  /* Option cards */
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  optionSub: {
    fontSize: 11,
    fontWeight: "500",
  },
});
