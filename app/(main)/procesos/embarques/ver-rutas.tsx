import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Parada {
  det_id: number;
  orden: number;
  folio: string;
  cliente: string;
  calle: string;
  latitud: number;
  longitud: number;
  estatus: string;
}

interface Ruta {
  ruta_id: number;
  nombre_ruta: string;
  conductor: string;
  estatus: string;
  fecha_creacion: string;
  total_paradas: number;
  paradas_completadas: number;
  usuario_creacion: string;
  paradas: Parada[];
}

interface DriverInfo {
  id_samsara: string;
  nombre_completo: string;
}


// ─── Badge de estatus ─────────────────────────────────────────────────────────
function EstatusBadge({ estatus, colors }: { estatus: string; colors: any }) {
  const config: Record<string, { color: string; label: string; icon: any }> = {
    PENDIENTE:   { color: "#FF9500", label: "Pendiente",   icon: "time-outline" },
    EN_RUTA:     { color: "#3B82F6", label: "En Ruta",     icon: "navigate-outline" },
    COMPLETADA:  { color: "#10B981", label: "Completada",  icon: "checkmark-circle-outline" },
  };
  const cfg = config[estatus] ?? { color: colors.textSecondary, label: estatus, icon: "ellipse-outline" };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + "18" }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Card de ruta ─────────────────────────────────────────────────────────────
function RutaCard({
  ruta,
  colors,
  index,
  expanded,
  onToggle,
  onTomar,
}: {
  ruta: Ruta;
  colors: any;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onTomar?: (ruta: Ruta) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 80, 400),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 10,
        delay: Math.min(index * 80, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const progreso = ruta.total_paradas > 0
    ? ruta.paradas_completadas / ruta.total_paradas
    : 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (ruta.conductor === "POR TOMAR") {
            router.push({
              pathname: "/(main)/procesos/embarques/detalle-ruta-disponible",
              params: { rutaId: ruta.ruta_id, nombreRuta: ruta.nombre_ruta }
            });
          } else {
            onToggle();
          }
        }}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* ── Cabecera ── */}
        <View style={styles.cardHeader}>
          {/* Ícono */}
          <View style={[styles.routeIcon, { backgroundColor: colors.accent + "15" }]}>
            <Ionicons name="map" size={22} color={colors.accent} />
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={[styles.routeName, { color: colors.text }]} numberOfLines={1}>
              {ruta.nombre_ruta}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {ruta.conductor}
              </Text>
              <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {ruta.fecha_creacion}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textTertiary}
          />
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <EstatusBadge estatus={ruta.estatus} colors={colors} />
          <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="location-outline" size={11} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {ruta.total_paradas} parada{ruta.total_paradas !== 1 ? "s" : ""}
            </Text>
          </View>
          {ruta.paradas_completadas > 0 && (
            <View style={[styles.badge, { backgroundColor: "#10B98115" }]}>
              <Ionicons name="checkmark-outline" size={11} color="#10B981" />
              <Text style={[styles.badgeText, { color: "#10B981" }]}>
                {ruta.paradas_completadas}/{ruta.total_paradas}
              </Text>
            </View>
          )}
        </View>

        {/* ── Barra de progreso ── */}
        {ruta.total_paradas > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: progreso === 1 ? "#10B981" : colors.accent,
                  width: `${progreso * 100}%` as any,
                },
              ]}
            />
          </View>
        )}

        {/* ── Paradas expandidas ── */}
        {expanded && (
          <View style={[styles.paradasWrap, { borderTopColor: colors.border }]}>
            {ruta.paradas.map((parada) => (
              <View
                key={parada.det_id}
                style={[styles.paradaRow, { borderBottomColor: colors.border }]}
              >
                {/* Número de orden */}
                <View style={[styles.ordenBubble, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.ordenText, { color: colors.accent }]}>{parada.orden}</Text>
                </View>
                <View style={styles.paradaInfo}>
                  <Text style={[styles.paradaFolio, { color: colors.text }]}>{parada.folio}</Text>
                  <Text style={[styles.paradaCliente, { color: colors.textSecondary }]} numberOfLines={1}>
                    {parada.cliente}
                  </Text>
                  <Text style={[styles.paradaDireccion, { color: colors.textTertiary }]} numberOfLines={1}>
                    {parada.calle}
                  </Text>
                </View>
                {/* Estatus parada */}
                <View
                  style={[
                    styles.paradaEstatus,
                    {
                      backgroundColor:
                        parada.estatus === "COMPLETADA" ? "#10B98120" : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={parada.estatus === "COMPLETADA" ? "checkmark" : "ellipse-outline"}
                    size={14}
                    color={parada.estatus === "COMPLETADA" ? "#10B981" : colors.textTertiary}
                  />
                </View>
              </View>
            ))}
            
            {ruta.conductor === "POR TOMAR" && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onTomar?.(ruta);
                }}
                style={[styles.tomarBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="hand-right-outline" size={18} color="#fff" />
                <Text style={styles.tomarBtnText}>Tomar esta ruta</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function VerRutasScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filtroEstatus, setFiltroEstatus] = useState<"PENDIENTE" | "EN_RUTA" | "COMPLETADA" | "TODAS">("TODAS");
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [taking, setTaking] = useState(false);

  const FILTROS = [
    { key: "TODAS",      label: "Todas" },
    { key: "PENDIENTE",  label: "Pendientes" },
    { key: "EN_RUTA",    label: "En Ruta" },
    { key: "COMPLETADA", label: "Completadas" },
  ] as const;

  // ── Fetch rutas ────────────────────────────────────────────────────────────
  const fetchRutas = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const dbId = await getCurrentDatabaseId();
      const hoy = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_URL}/api/rutas-embarque.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: dbId,
          fecha: hoy,
          estatus: filtroEstatus,
        }),
      });
      const data = await res.json();
      if (data.success) setRutas(data.rutas ?? []);
    } catch (e) {
      console.error("Error fetching rutas:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtroEstatus]);

  useEffect(() => {
    (async () => {
      const idS = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("id_samsara"));
      const nom = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("nombre_completo"));
      if (idS && nom) setDriverInfo({ id_samsara: idS, nombre_completo: nom });
    })();
    fetchRutas(); 
  }, [filtroEstatus]);

  const handleTomarRuta = async (ruta: Ruta) => {
    if (!driverInfo) return Alert.alert("Error", "No se encontró información del conductor logueado.");

    Alert.alert(
      "Confirmar Asignación",
      `¿Deseas tomar la ruta "${ruta.nombre_ruta}"?\n\nAl aceptarla, se enviará automáticamente a tu app de Samsara.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Tomar Ruta",
          onPress: async () => {
            setTaking(true);
            try {
              const dbId = await getCurrentDatabaseId();
              const res = await fetch(`${API_URL}/api/tomar-ruta.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  rutaId: ruta.ruta_id,
                  driverId: driverInfo.id_samsara,
                  nombreOperador: driverInfo.nombre_completo,
                  databaseId: dbId,
                }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("✓ Éxito", "La ruta ha sido asignada. Ya puedes verla en tu App de Samsara.");
                fetchRutas();
              } else {
                throw new Error(data.error || "Error al tomar ruta.");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message);
            } finally {
              setTaking(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 100}
        tint={colors.isDark ? "dark" : "light"}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Rutas Disponibles</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {rutas.length} ruta{rutas.length !== 1 ? "s" : ""} hoy
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchRutas()}
            style={styles.backBtn}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={styles.filtrosRow}>
          {FILTROS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFiltroEstatus(f.key)}
              style={[
                styles.filtroBtn,
                {
                  backgroundColor:
                    filtroEstatus === f.key ? colors.accent : colors.surface,
                  borderColor:
                    filtroEstatus === f.key ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filtroText,
                  { color: filtroEstatus === f.key ? "#fff" : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>

      {/* ── Lista ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando rutas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={rutas}
          keyExtractor={(item) => String(item.ruta_id)}
          contentContainerStyle={{
            paddingTop: insets.top + 118,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 16,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRutas(true); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="map-outline" size={52} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin rutas hoy</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                No hay rutas {filtroEstatus !== "TODAS" ? filtroEstatus.toLowerCase() + "s" : ""} para hoy.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(main)/procesos/embarques/crear-ruta")}
                style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Crear primera ruta</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <RutaCard
              ruta={item}
              colors={colors}
              index={index}
              expanded={expandedId === item.ruta_id}
              onToggle={() =>
                setExpandedId(expandedId === item.ruta_id ? null : item.ruta_id)
              }
              onTomar={handleTomarRuta}
            />
          )}
        />
      )}

      {/* Loading Overlay cuando está tomando una ruta */}
      {taking && (
        <View style={styles.takingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 15, fontWeight: "600" }}>Asignando y creando ruta en Samsara...</Text>
        </View>
      )}

      {/* ── FAB nueva ruta ── */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => router.push("/(main)/procesos/embarques/crear-ruta")}
          style={[styles.fabSmall, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },
  filtrosRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  filtroBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  filtroText: { fontSize: 12, fontWeight: "600" },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1, gap: 3 },
  routeName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  metaDot: { fontSize: 12 },

  // Stats
  statsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Progress
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },

  // Paradas
  paradasWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 0,
  },
  paradaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ordenBubble: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ordenText: { fontSize: 12, fontWeight: "700" },
  paradaInfo: { flex: 1, gap: 1 },
  paradaFolio: { fontSize: 13, fontWeight: "600" },
  paradaCliente: { fontSize: 12 },
  paradaDireccion: { fontSize: 11 },
  paradaEstatus: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", maxWidth: 260 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Loading
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },

  // FAB
  fabWrap: {
    position: "absolute",
    bottom: 0, right: 20,
  },
  fabSmall: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tomarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 15,
  },
  tomarBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  takingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
});
