import { SkeletonCardList } from "@/components/Skeleton";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ==================== TIPOS ====================
interface Ventanilla {
  TRASPASO_IN_ID: string;
  FOLIO: string;
  ALMACEN: string;
  FECHA: string;
  HORA: string;
  ARTICULOS?: number;
  ESTATUS?: string;
}

export default function VentanillaScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ventanillas, setVentanillas] = useState<Ventanilla[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });
  const [sessionsExpanded, setSessionsExpanded] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const limpiarFolio = (folio: string) => {
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/);
    return match ? `${match[1]}${match[2]}` : folio;
  };

  const fetchVentanillas = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const pikerId = user?.USUARIO_ID || 1;
      const response = await fetch(`${API_URL}/api/ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, pikerId }),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.pendientes)) {
        const sorted = data.pendientes.sort((a: Ventanilla, b: Ventanilla) =>
          a.FOLIO.localeCompare(b.FOLIO, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
        setVentanillas(sorted);
      } else {
        setVentanillas([]);
      }
    } catch (e) {
      setVentanillas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVentanillas();
  }, [fetchVentanillas]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVentanillas();
  };

  const handleTakeVentanilla = async (ventanilla: Ventanilla) => {
    const pikerId = user?.USUARIO_ID || 1;

    // Si ya está tomada por mí, ir directo al surtido
    if (ventanilla.ESTATUS === 'T') {
      router.push({
        pathname: "/(main)/procesos/picking/surte-ventanilla",
        params: {
          folio: limpiarFolio(ventanilla.FOLIO),
          traspasoInId: ventanilla.TRASPASO_IN_ID,
          almacen: ventanilla.ALMACEN || "",
        },
      });
      setLoading(false);
      return;
    }

    try {
      const databaseId = getCurrentDatabaseId();
      const ahora = new Date();
      const fechaIni = ahora.toISOString().split("T")[0];
      const horaIni = ahora.toTimeString().split(" ")[0].slice(0, 5);

      const response = await fetch(`${API_URL}/api/tomar-ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId: ventanilla.TRASPASO_IN_ID,
          pikerId,
          fechaIni,
          horaIni,
        }),
      });
      const data = await response.json();
      if (data.success) {
        router.push({
          pathname: "/(main)/procesos/picking/surte-ventanilla",
          params: {
            folio: limpiarFolio(ventanilla.FOLIO),
            traspasoInId: ventanilla.TRASPASO_IN_ID,
            almacen: ventanilla.ALMACEN || "",
          },
        });
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al tomar la ventanilla.",
        });
      }
    } catch (e) {
      setAlert({
        visible: true,
        message: "Error de red al intentar tomar la ventanilla.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resumableOrders = ventanillas.filter(v => v.ESTATUS === 'T');
  const pendingOrders = ventanillas.filter(v => v.ESTATUS === 'P' || !v.ESTATUS);

  const filtered = pendingOrders.filter(
    (v) =>
      (v.FOLIO || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.ALMACEN || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const renderVentanilla = ({ item }: { item: Ventanilla }) => {
    const ventanillaColor = "#EC4899";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleTakeVentanilla(item)}
        disabled={loading}
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          },
        ]}
      >
        {/* Sistema Badge + Folio */}
        <View style={styles.orderHeader}>
          <View
            style={[
              styles.sistemaPill,
              { backgroundColor: `${ventanillaColor}15` },
            ]}
          >
            <Ionicons name="flash" size={12} color={ventanillaColor} />
            <Text style={[styles.sistemaPillText, { color: ventanillaColor }]}>
              VENTANILLA
            </Text>
          </View>
          <View style={styles.orderFolioRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[styles.orderFolio, { color: colors.text }]}>
                {limpiarFolio(item.FOLIO)}
                </Text>
                {item.ESTATUS === 'T' && (
                    <View style={styles.retomarBadge}>
                        <Text style={styles.retomarBadgeText}>RETOMAR</Text>
                    </View>
                )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </View>

        {/* Almacén */}
        <Text
          style={[styles.orderDesc, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.ALMACEN || "Sin almacén"}
        </Text>

        {/* Meta pills */}
        <View style={styles.orderMeta}>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="calendar" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.FECHA}
            </Text>
          </View>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="time" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.HORA}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />

      <Animated.FlatList
        data={filtered}
        renderItem={renderVentanilla}
        keyExtractor={(item) => item.TRASPASO_IN_ID}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 10 },
        ]}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            {/* iOS-style Header */}
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
                  Ventanilla
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {pendingOrders.length} disponibles
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Resumable Picks Section (Collapsible Dropdown) */}
            {resumableOrders.length > 0 && (
                <View style={styles.activeSessionsContainer}>
                    <TouchableOpacity 
                        style={[styles.activeSessionsHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12 }]}
                        onPress={() => setSessionsExpanded(!sessionsExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={styles.activeIndicator} />
                            <Text style={[styles.activeSessionsTitle, { color: colors.text }]}>
                                Sesiones activas ({resumableOrders.length})
                            </Text>
                        </View>
                        <Ionicons 
                            name={sessionsExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={colors.textTertiary} 
                        />
                    </TouchableOpacity>

                    {sessionsExpanded && (
                        <View style={[styles.activePillsRow, { marginTop: 10 }]}>
                            {resumableOrders.map((order) => (
                                <TouchableOpacity
                                    key={order.TRASPASO_IN_ID}
                                    style={[styles.activePillCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}
                                    onPress={() => handleTakeVentanilla(order)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.activePillInfo}>
                                        <View style={[styles.activeIconCircle, { backgroundColor: colors.accent + '20' }]}>
                                            <Ionicons name="play" size={16} color={colors.accent} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.activePillFolio, { color: colors.text }]} numberOfLines={1}>
                                                {limpiarFolio(order.FOLIO)}
                                            </Text>
                                            <Text style={[styles.activePillSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {order.ALMACEN}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Search */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  marginTop: 16,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                placeholder="Buscar folio o almacén"
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
                  name="flash-outline"
                  size={40}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Sin ventanillas
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                No hay ventanillas pendientes por surtir
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />

      {/* iOS Alert */}
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
              onPress={() => setAlert({ visible: false, message: "" })}
              activeOpacity={0.8}
            >
              <Text style={styles.alertBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transition Loading Overlay */}
      <Modal visible={loading && ventanillas.length > 0} transparent animationType="fade">
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loaderText}>Abriendo orden...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── List ────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // ─── Header ──────────────────────────────────────────────────────────
  pageHeader: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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

  // ─── Search ──────────────────────────────────────────────────────────
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

  // ─── Order Card (iOS Style) ──────────────────────────────────────────
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
  orderHeader: {
    marginBottom: 10,
  },
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
  retomarBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  retomarBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
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

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loaderContent: {
    alignItems: 'center',
    gap: 15,
  },
  loaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
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
    marginBottom: 16,
  },
  // ─── Active Sessions ────────────────────────────────────────────────
  activeSessionsContainer: {
    marginTop: 8,
    paddingBottom: 8,
  },
  activeSessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeSessionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  activePillsRow: {
    gap: 10,
  },
  activePillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  activePillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  activeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePillFolio: {
    fontSize: 16,
    fontWeight: '800',
  },
  activePillSub: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 200,
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
