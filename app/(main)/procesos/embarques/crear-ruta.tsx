import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pedido {
  docto_ve_id: number;
  folio: string;
  cliente: string;
  telefono: string;
  calle: string;
  colonia: string;
  ciudad: string;
  latitud: number | null;
  longitud: number | null;
  tiene_coordenadas: boolean;
  total_articulos: number;
  total_unidades: number;
  total_documento: number;
  fecha: string;
  vendedor: string;
  estatus: string;
  aplicado: string;
}

// ─── Card de pedido ───────────────────────────────────────────────────────────
function PedidoCard({
  pedido,
  selected,
  onToggle,
  colors,
  index,
}: {
  pedido: Pedido;
  selected: boolean;
  onToggle: () => void;
  colors: any;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 50, 400),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        delay: Math.min(index * 50, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onToggle}
        style={[
          styles.card,
          {
            backgroundColor: selected ? colors.accent + "12" : colors.surface,
            borderColor: selected ? colors.accent : colors.border,
          },
        ]}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.accent : "transparent",
              borderColor: selected ? colors.accent : colors.border,
            },
          ]}
        >
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.folio, { color: colors.text }]}>{pedido.folio}</Text>
            <Text style={[styles.monto, { color: colors.accent }]}>
              ${pedido.total_documento.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </Text>
          </View>
          <Text style={[styles.cliente, { color: colors.text }]} numberOfLines={1}>
            {pedido.cliente}
          </Text>
          <Text style={[styles.direccion, { color: colors.textSecondary }]} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />{" "}
            {pedido.calle || "Sin dirección"}
            {pedido.colonia ? `, ${pedido.colonia}` : ""}
          </Text>
          <View style={styles.cardFooter}>
            <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="cube-outline" size={11} color={colors.accent} />
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                {pedido.total_articulos} art · {pedido.total_unidades} uds
              </Text>
            </View>
            {!pedido.tiene_coordenadas && (
              <View style={[styles.badge, { backgroundColor: "#FF950015" }]}>
                <Ionicons name="warning-outline" size={11} color="#FF9500" />
                <Text style={[styles.badgeText, { color: "#FF9500" }]}>Sin coords</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function CrearRutaScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [sinCoords, setSinCoords] = useState<Pedido[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarSinCoords, setMostrarSinCoords] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ruta acumulada (se van stackeando pedidos) ─────────────────────────────
  const [rutaAcumulada, setRutaAcumulada] = useState<Pedido[]>([]);

  // Registro de TODOS los pedidos que hemos visto (no se pierden al buscar)
  const pedidosVistosRef = useRef<Map<number, Pedido>>(new Map());

  // Guardar pedidos vistos cada vez que cambian
  const registrarPedidos = (lista: Pedido[]) => {
    lista.forEach((p) => pedidosVistosRef.current.set(p.docto_ve_id, p));
  };

  // Todos los pedidos juntos para mostrar en lista
  const todosLosPedidos = [...pedidos, ...sinCoords];

  // ── Fetch pedidos ──────────────────────────────────────────────────────────
  const fetchPedidos = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const dbId = await getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/pedidos-listos-embarque.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId }),
      });
      const data = await res.json();
      if (data.success) {
        const todos = [...(data.pedidos ?? []), ...(data.sin_coordenadas ?? [])];
        setPedidos(todos);
        setSinCoords(data.sin_coordenadas ?? []);
        registrarPedidos(todos);
      }
    } catch (e) {
      console.error("Error fetching pedidos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const buscarEnServidor = useCallback(async (termino: string) => {
    setSearching(true);
    try {
      const dbId = await getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/pedidos-listos-embarque.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, buscar: termino }),
      });
      const text = await res.text();
      console.log("Respuesta búsqueda:", text);
      let data;
      try { data = JSON.parse(text); } catch { 
        Alert.alert("Error de búsqueda", "Respuesta no válida del servidor:\n" + text.substring(0, 300));
        return;
      }
      if (data.success) {
        const todos = [...(data.pedidos ?? []), ...(data.sin_coordenadas ?? [])];
        setPedidos(todos);
        setSinCoords(data.sin_coordenadas ?? []);
        registrarPedidos(todos);
      } else {
        Alert.alert("Error de búsqueda", data.error ?? "Error desconocido");
      }
    } catch (e: any) {
      console.error("Error buscando:", e);
      Alert.alert("Error de red", e.message ?? "No se pudo conectar al servidor");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = useCallback((texto: string) => {
    setSearch(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.trim() === "") {
      fetchPedidos();
      return;
    }
    debounceRef.current = setTimeout(() => buscarEnServidor(texto.trim()), 400);
  }, [fetchPedidos, buscarEnServidor]);

  useEffect(() => { fetchPedidos(); }, []);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Toggle selección ───────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const aptos = pedidosFiltrados.filter((p) => p.tiene_coordenadas);
    if (selected.size === aptos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(aptos.map((p) => p.docto_ve_id)));
    }
  }, [selected, pedidos, search]);

  // ── Filtro búsqueda ────────────────────────────────────────────────────────
  // El servidor filtra — pedidosFiltrados = resultado del fetch
  const pedidosFiltrados = pedidos;

  // ── Haversine distance (km) ─────────────────────────────────────────────
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Nearest-neighbor sort ───────────────────────────────────────────────
  const ordenarPorCercania = (paradas: Pedido[]): Pedido[] => {
    if (paradas.length <= 1) return paradas;
    const pendientes = [...paradas];
    const ordenadas: Pedido[] = [pendientes.shift()!];
    while (pendientes.length > 0) {
      const ultimo = ordenadas[ordenadas.length - 1];
      let menorDist = Infinity;
      let menorIdx = 0;
      for (let i = 0; i < pendientes.length; i++) {
        const d = haversine(
          ultimo.latitud ?? 0, ultimo.longitud ?? 0,
          pendientes[i].latitud ?? 0, pendientes[i].longitud ?? 0
        );
        if (d < menorDist) { menorDist = d; menorIdx = i; }
      }
      ordenadas.push(pendientes.splice(menorIdx, 1)[0]);
    }
    return ordenadas;
  };

  // ── Agregar seleccionados a la ruta ────────────────────────────────────
  const agregarARuta = useCallback(() => {
    if (selected.size === 0) {
      Alert.alert("Sin selección", "Selecciona al menos un pedido.");
      return;
    }
    // Buscar en el registro histórico de todos los pedidos vistos
    const nuevos: Pedido[] = [];
    selected.forEach((id) => {
      const p = pedidosVistosRef.current.get(id);
      if (p) nuevos.push(p);
    });
    if (nuevos.length === 0) return;

    setRutaAcumulada((prev) => {
      // Evitar duplicados
      const idsExistentes = new Set(prev.map((p) => p.docto_ve_id));
      const sinDuplicar = nuevos.filter((p) => !idsExistentes.has(p.docto_ve_id));
      if (sinDuplicar.length === 0) {
        Alert.alert("Ya agregados", "Esos pedidos ya están en la ruta.");
        return prev;
      }
      const todos = [...prev, ...sinDuplicar];
      // Separar: los que tienen coords → ordenar por cercanía; los que no → al final
      const conCoords = todos.filter((p) => p.tiene_coordenadas);
      const sinCoordsRuta = todos.filter((p) => !p.tiene_coordenadas);
      const optimizada = [...ordenarPorCercania(conCoords), ...sinCoordsRuta];
      Alert.alert(
        "✓ Agregados",
        `${sinDuplicar.length} pedido${sinDuplicar.length > 1 ? "s" : ""} agregado${sinDuplicar.length > 1 ? "s" : ""}. Total en ruta: ${optimizada.length}`,
      );
      return optimizada;
    });
    setSelected(new Set());
  }, [selected, pedidos, sinCoords]);

  // ── Quitar de la ruta ──────────────────────────────────────────────────
  const limpiarRuta = useCallback(() => {
    Alert.alert("Limpiar ruta", `¿Quitar los ${rutaAcumulada.length} pedidos de la ruta?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpiar", style: "destructive", onPress: () => setRutaAcumulada([]) },
    ]);
  }, [rutaAcumulada]);

  // ── Ver ruta optimizada en mapa ────────────────────────────────────────
  const verRutaOptimizada = useCallback(() => {
    if (rutaAcumulada.length === 0) return;
    const paradas = rutaAcumulada.map((p, idx) => ({
      docto_ve_id: p.docto_ve_id,
      folio: p.folio,
      cliente: p.cliente,
      calle: p.calle,
      latitud: p.latitud ?? 0,
      longitud: p.longitud ?? 0,
      orden: idx + 1,
    }));
    const nombreRuta = `RUTA ${new Date().toLocaleDateString("es-MX", {
      day: "2-digit", month: "2-digit",
    })}`;
    const pedidosStr = encodeURIComponent(JSON.stringify(paradas));
    const nombreStr  = encodeURIComponent(nombreRuta);
    router.push(
      `/(main)/procesos/embarques/mapa-ruta?pedidos=${pedidosStr}&nombre_ruta=${nombreStr}` as any
    );
  }, [rutaAcumulada]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const aptosCount = pedidosFiltrados.filter((p) => p.tiene_coordenadas).length;

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Crear Ruta</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {selected.size > 0 ? `${selected.size} seleccionados` : `${todosLosPedidos.length} facturas (últ. 15 días)`}
            </Text>
          </View>
          {/* Seleccionar todos */}
          <TouchableOpacity onPress={toggleAll} style={styles.backBtn}>
            <Ionicons
              name={selected.size === aptosCount && aptosCount > 0 ? "checkmark-circle" : "checkmark-circle-outline"}
              size={26}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={searching ? colors.accent : colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar en toda la BD: folio, cliente..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (search.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                buscarEnServidor(search.trim());
              }
            }}
          />
          {search.length > 0 && !searching && (
            <TouchableOpacity onPress={() => handleSearch("")} style={{ padding: 2 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {searching && <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 4 }} />}
          {/* Botón forzar búsqueda */}
          <TouchableOpacity
            onPress={() => {
              if (search.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                buscarEnServidor(search.trim());
              }
            }}
            disabled={searching || search.trim().length === 0}
            style={[
              styles.searchBtn,
              { backgroundColor: search.trim().length > 0 ? colors.accent : colors.border },
            ]}
          >
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* ── Lista ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando pedidos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...pedidosFiltrados, ...(mostrarSinCoords ? sinCoords.filter(p => {
            if (!search) return true;
            const q = search.toLowerCase();
            return p.folio.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.calle.toLowerCase().includes(q);
          }) : [])]}
          keyExtractor={(item) => String(item.docto_ve_id)}
          contentContainerStyle={{
            paddingTop: insets.top + 120,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 16,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPedidos(true); }}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            sinCoords.length > 0 ? (
              <TouchableOpacity
                onPress={() => setMostrarSinCoords(!mostrarSinCoords)}
                style={[styles.warningBanner, { backgroundColor: "#FF950015", borderColor: "#FF950030" }]}
              >
                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                <Text style={[styles.warningText, { color: "#FF9500" }]}>
                  {sinCoords.length} pedido{sinCoords.length !== 1 ? "s" : ""} sin coordenadas (no aptos para ruta)
                </Text>
                <Ionicons name={mostrarSinCoords ? "chevron-up" : "chevron-down"} size={14} color="#FF9500" />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin facturas</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                No se encontraron facturas en los últimos 15 días.{sinCoords.length > 0 ? `\n${sinCoords.length} sin coordenadas (toca el banner de arriba).` : ""}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <PedidoCard
              pedido={item}
              selected={selected.has(item.docto_ve_id)}
              onToggle={() => toggleSelect(item.docto_ve_id)}
              colors={colors}
              index={index}
            />
          )}
        />
      )}

      {/* ── Barra inferior: Agregar + Ver Ruta ── */}
      {(selected.size > 0 || rutaAcumulada.length > 0) && (
        <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 12 }]}>
          {/* Chip de ruta acumulada */}
          {rutaAcumulada.length > 0 && (
            <View style={[styles.rutaChip, { backgroundColor: colors.surface, borderColor: colors.accent + "40" }]}>
              <Ionicons name="navigate" size={14} color={colors.accent} />
              <Text style={[styles.rutaChipText, { color: colors.text }]}>
                Ruta: {rutaAcumulada.length} parada{rutaAcumulada.length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity onPress={limpiarRuta} style={styles.rutaChipX}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.fabRow}>
            {/* Botón agregar */}
            {selected.size > 0 && (
              <TouchableOpacity onPress={agregarARuta} activeOpacity={0.85} style={[styles.fab, { flex: 1 }]}>
                <LinearGradient
                  colors={[colors.accent, colors.accent + "CC"]}
                  style={styles.fabGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.fabText}>
                    Agregar {selected.size} a ruta
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {/* Botón ver ruta */}
            {rutaAcumulada.length > 0 && (
              <TouchableOpacity onPress={verRutaOptimizada} activeOpacity={0.85} style={[styles.fab, { flex: selected.size > 0 ? 0.7 : 1 }]}>
                <LinearGradient
                  colors={["#34C759", "#30B350"]}
                  style={styles.fabGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="eye" size={20} color="#fff" />
                  <Text style={styles.fabText}>Previsualizar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 4,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folio: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3 },
  monto: { fontSize: 13, fontWeight: "600" },
  cliente: { fontSize: 13, fontWeight: "500" },
  direccion: { fontSize: 12, lineHeight: 16 },
  cardFooter: { flexDirection: "row", gap: 6, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: "500" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", maxWidth: 260 },

  // Loading
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },

  // FAB
  fabWrap: {
    position: "absolute",
    bottom: 0, left: 16, right: 16,
  },
  fab: { borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  fabRow: { flexDirection: "row", gap: 8 },
  rutaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  rutaChipText: { flex: 1, fontSize: 13, fontWeight: "600" },
  rutaChipX: { padding: 2 },
});
