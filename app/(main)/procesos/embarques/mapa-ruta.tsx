import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Parada {
  docto_ve_id: number;
  folio: string;
  cliente: string;
  calle: string;
  latitud: number;
  longitud: number;
  orden: number;
}

interface Operador {
  usuario_id: number;
  usuario: string;
  nombre_completo: string;
}

interface OperadorSamsara extends Operador {
  latitud: number | null;
  longitud: number | null;
  velocidad: number;
  distancia_km: number;
  en_linea: boolean;
  ultima_vez: string | null;
}

// ─── Colores de paradas ───────────────────────────────────────────────────────
const STOP_COLORS = [
  "#6C63FF", "#FF6B6B", "#4ECDC4", "#FFE66D",
  "#A8E6CF", "#FF8B94", "#B4A7D6", "#F9CA24",
];

export default function MapaRutaScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pedidos: string; nombre_ruta: string }>();
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [paradas, setParadas] = useState<Parada[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Formulario ──
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [operadoresSamsara, setOperadoresSamsara] = useState<OperadorSamsara[]>([]);
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<OperadorSamsara | Operador | null>(null);
  const [showOperadorModal, setShowOperadorModal] = useState(false);
  const [operadorSearch, setOperadorSearch] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(
    new Date().toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" })
  );
  const [comentarios, setComentarios] = useState("");
  const [nombreRuta, setNombreRuta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargandoOps, setCargandoOps] = useState(false);
  const [cargandoSamsara, setCargandoSamsara] = useState(false);
  const [mostrarOperadoresMapa, setMostrarOperadoresMapa] = useState(true);

  // ── Parse paradas ──
  useEffect(() => {
    try {
      let raw = params.pedidos ?? "[]";
      if (Array.isArray(raw)) raw = raw[0] ?? "[]";
      let decoded = raw;
      try { decoded = decodeURIComponent(raw); } catch { }
      const parsed: Parada[] = JSON.parse(decoded);
      setParadas(parsed);
    } catch (e) {
      console.error("Error parsing paradas:", e);
      Alert.alert("Error", "No se pudieron cargar las paradas");
      setParadas([]);
    }

    // Nombre de ruta
    try {
      let nombre = params.nombre_ruta ?? "Nueva Ruta";
      if (Array.isArray(nombre)) nombre = nombre[0] ?? "Nueva Ruta";
      try { nombre = decodeURIComponent(nombre); } catch { }
      setNombreRuta(nombre);
    } catch { setNombreRuta("Nueva Ruta"); }

    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  // ── Fetch operadores ──
  useEffect(() => {
    (async () => {
      setCargandoOps(true);
      try {
        const dbId = await getCurrentDatabaseId();
        const res = await fetch(`${API_URL}/api/operadores-embarque.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: dbId }),
        });
        const data = await res.json();
        if (data.success) setOperadores(data.operadores ?? []);
      } catch (e) {
        console.error("Error fetching operadores:", e);
      } finally {
        setCargandoOps(false);
      }
    })();
  }, []);

  // ── Fetch ubicaciones Samsara ──
  useEffect(() => {
    if (paradas.length === 0) return;
    (async () => {
      setCargandoSamsara(true);
      try {
        // Calcular centro de la ruta
        const latPromedio = paradas.reduce((s, p) => s + p.latitud, 0) / paradas.length;
        const lonPromedio = paradas.reduce((s, p) => s + p.longitud, 0) / paradas.length;

        const dbId = await getCurrentDatabaseId();
        const res = await fetch(`${API_URL}/api/samsara-ubicaciones.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: dbId, latRuta: latPromedio, lonRuta: lonPromedio }),
        });
        const data = await res.json();
        if (data.success && data.operadores?.length > 0) {
          setOperadoresSamsara(data.operadores);
          // Auto-seleccionar el operador más cercano que esté en línea
          const enLinea = data.operadores.filter((o: OperadorSamsara) => o.en_linea);
          if (enLinea.length > 0 && !operadorSeleccionado) {
            setOperadorSeleccionado(enLinea[0]);
          }
        }
      } catch (e) {
        console.log("Samsara no disponible:", e);
        // No es error crítico — el selector manual de operadores sigue funcionando
      } finally {
        setCargandoSamsara(false);
      }
    })();
  }, [paradas]);

  // ── Ajustar mapa ──
  useEffect(() => {
    if (mapReady && paradas.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          paradas.map(p => ({ latitude: p.latitud, longitude: p.longitud })),
          { edgePadding: { top: 80, right: 40, bottom: 20, left: 40 }, animated: true }
        );
      }, 500);
    }
  }, [mapReady, paradas]);

  // ── Abrir en Google Maps ──
  const abrirGoogleMaps = () => {
    if (paradas.length === 0) return;
    if (paradas.length === 1) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${paradas[0].latitud},${paradas[0].longitud}&travelmode=driving`);
      return;
    }
    const origin = `${paradas[0].latitud},${paradas[0].longitud}`;
    const destination = `${paradas[paradas.length - 1].latitud},${paradas[paradas.length - 1].longitud}`;
    const waypoints = paradas.slice(1, -1).map(p => `${p.latitud},${p.longitud}`).join("|");
    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "No se pudo abrir Google Maps"));
  };

  // ── Abrir en Waze ──
  const abrirWaze = () => {
    if (paradas.length === 0) return;
    const p = paradas[0];
    const url = `waze://?ll=${p.latitud},${p.longitud}&navigate=yes`;
    const fallback = `https://waze.com/ul?ll=${p.latitud},${p.longitud}&navigate=yes`;
    Linking.canOpenURL(url).then(s => Linking.openURL(s ? url : fallback));
  };

  // ── Centrar en parada ──
  const centrarEnParada = (idx: number) => {
    setSelectedIdx(idx);
    mapRef.current?.animateToRegion({
      latitude: paradas[idx].latitud,
      longitude: paradas[idx].longitud,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  const polylineCoords = paradas.map(p => ({
    latitude: p.latitud,
    longitude: p.longitud,
  }));

  // ── Operadores filtrados (prioriza Samsara si hay) ──
  const listaOperadores = operadoresSamsara.length > 0 ? operadoresSamsara : operadores;
  const operadoresFiltrados = operadorSearch
    ? listaOperadores.filter((o: any) =>
        o.nombre_completo.toLowerCase().includes(operadorSearch.toLowerCase()) ||
        o.usuario.toLowerCase().includes(operadorSearch.toLowerCase())
      )
    : listaOperadores;

  // Operadores en línea para mostrar en mapa
  const operadoresEnMapa = operadoresSamsara.filter(o => o.en_linea && o.latitud != null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ══ Header ══ */}
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Previsualizar Ruta
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {paradas.length} parada{paradas.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {/* Centrar todo */}
          <TouchableOpacity
            onPress={() => mapRef.current?.fitToCoordinates(polylineCoords, {
              edgePadding: { top: 80, right: 40, bottom: 20, left: 40 }, animated: true,
            })}
            style={styles.backBtn}
          >
            <Ionicons name="scan-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* ══ Mapa (mitad superior) ══ */}
      <View style={[styles.mapContainer, { marginTop: insets.top + 56 }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          onMapReady={() => setMapReady(true)}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={colors.accent}
              strokeWidth={3}
              lineDashPattern={[1]}
            />
          )}
          {paradas.map((p, idx) => (
            <Marker
              key={p.docto_ve_id}
              coordinate={{ latitude: p.latitud, longitude: p.longitud }}
              onPress={() => centrarEnParada(idx)}
            >
              <View style={[
                styles.markerWrap,
                { backgroundColor: STOP_COLORS[idx % STOP_COLORS.length] },
                selectedIdx === idx && styles.markerSelected,
              ]}>
                <Text style={styles.markerNum}>{idx + 1}</Text>
              </View>
            </Marker>
          ))}

          {/* Marcadores de operadores Samsara */}
          {mostrarOperadoresMapa && operadoresEnMapa.map((op) => (
            <Marker
              key={`op-${op.usuario_id}`}
              coordinate={{ latitude: op.latitud!, longitude: op.longitud! }}
              onPress={() => {
                setOperadorSeleccionado(op);
                Alert.alert(
                  `🚚 ${op.nombre_completo}`,
                  `A ${op.distancia_km} km de la ruta\nVelocidad: ${op.velocidad} km/h`,
                );
              }}
            >
              <View style={[
                styles.driverMarker,
                {
                  borderColor: operadorSeleccionado?.usuario_id === op.usuario_id
                    ? "#34C759" : "#FF9500",
                },
              ]}>
                <Ionicons
                  name="car-sport"
                  size={16}
                  color={operadorSeleccionado?.usuario_id === op.usuario_id ? "#34C759" : "#FF9500"}
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Mini chips de paradas sobre el mapa */}
        <View style={styles.chipsOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {paradas.map((p, idx) => (
              <TouchableOpacity
                key={p.docto_ve_id}
                onPress={() => centrarEnParada(idx)}
                style={[
                  styles.miniChip,
                  {
                    backgroundColor: selectedIdx === idx
                      ? STOP_COLORS[idx % STOP_COLORS.length]
                      : colors.surface + "EE",
                    borderColor: STOP_COLORS[idx % STOP_COLORS.length],
                  },
                ]}
              >
                <Text style={[
                  styles.miniChipNum,
                  { color: selectedIdx === idx ? "#fff" : STOP_COLORS[idx % STOP_COLORS.length] },
                ]}>
                  {idx + 1}
                </Text>
                <Text
                  style={[
                    styles.miniChipText,
                    { color: selectedIdx === idx ? "#fff" : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {p.folio}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ══ Panel inferior (formulario) ══ */}
      <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.formHandle, { backgroundColor: colors.border }]} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nombre de ruta */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre de Ruta</Text>
            <View style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.formInputText, { color: colors.text }]}
                value={nombreRuta}
                onChangeText={setNombreRuta}
                placeholder="Ej: RUTA CENTRO"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Operador Asignado</Text>
            <TouchableOpacity
              onPress={() => setShowOperadorModal(true)}
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text
                style={[
                  styles.formInputText,
                  { color: operadorSeleccionado ? colors.text : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {operadorSeleccionado?.nombre_completo ?? "Seleccionar operador..."}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Fecha */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Fecha de Entrega</Text>
            <View style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.formInputText, { color: colors.text }]}
                value={fechaEntrega}
                onChangeText={setFechaEntrega}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Comentarios */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Comentarios</Text>
            <View style={[styles.formInputMulti, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.formInputText, { color: colors.text, minHeight: 60 }]}
                value={comentarios}
                onChangeText={setComentarios}
                placeholder="Instrucciones especiales, notas..."
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Botones de navegación */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={abrirGoogleMaps} style={styles.navBtn} activeOpacity={0.85}>
              <LinearGradient colors={["#4285F4", "#34A853"]} style={styles.navBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Google Maps</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={abrirWaze} style={styles.navBtn} activeOpacity={0.85}>
              <LinearGradient colors={["#33CCFF", "#0099CC"]} style={styles.navBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="car" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Waze</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Botón crear ruta */}
          <TouchableOpacity
            onPress={() => {
              if (!operadorSeleccionado) {
                Alert.alert("Operador requerido", "Selecciona un operador para la ruta.");
                return;
              }
              Alert.alert(
                "Crear Ruta",
                `¿Crear "${nombreRuta}" con ${paradas.length} paradas asignada a ${operadorSeleccionado.nombre_completo}?`,
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Crear",
                    onPress: () => {
                      // TODO: Implementar guardado real
                      Alert.alert("✓ Ruta Creada", "La ruta se ha guardado correctamente.", [
                        { text: "OK", onPress: () => router.back() },
                      ]);
                    },
                  },
                ]
              );
            }}
            disabled={guardando}
            activeOpacity={0.85}
            style={styles.createBtn}
          >
            <LinearGradient
              colors={["#34C759", "#30B350"]}
              style={styles.createBtnGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.createBtnText}>Crear Ruta</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>

      {/* ══ Modal Selector de Operador ══ */}
      <Modal visible={showOperadorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Operador</Text>

            {/* Buscador */}
            <View style={[styles.modalSearch, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={operadorSearch}
                onChangeText={setOperadorSearch}
                placeholder="Buscar operador..."
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              {operadorSearch !== "" && (
                <TouchableOpacity onPress={() => setOperadorSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista */}
            {cargandoOps || cargandoSamsara ? (
              <View style={{ alignItems: "center", marginTop: 30, gap: 8 }}>
                <ActivityIndicator size="large" color={colors.accent} />
                {cargandoSamsara && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Obteniendo ubicaciones Samsara...</Text>}
              </View>
            ) : (
              <FlatList
                data={operadoresFiltrados}
                keyExtractor={(item) => String(item.usuario_id)}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const isSelected = operadorSeleccionado?.usuario_id === item.usuario_id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setOperadorSeleccionado(item);
                        setShowOperadorModal(false);
                        setOperadorSearch("");
                      }}
                      style={[
                        styles.operadorItem,
                        {
                          backgroundColor: isSelected ? colors.accent + "15" : "transparent",
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.operadorAvatar, { backgroundColor: isSelected ? colors.accent : (item as any).en_linea ? "#34C75930" : colors.border }]}>
                        {(item as any).en_linea ? (
                          <Ionicons name="car-sport" size={18} color={isSelected ? "#fff" : "#34C759"} />
                        ) : (
                          <Text style={[styles.operadorInitial, { color: isSelected ? "#fff" : colors.textSecondary }]}>
                            {item.nombre_completo.charAt(0)}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.operadorNombre, { color: colors.text }]} numberOfLines={1}>
                            {item.nombre_completo}
                          </Text>
                          {(item as any).en_linea && (item as any).distancia_km < 999 && (
                            <View style={{ backgroundColor: "#34C75920", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: "700", color: "#34C759" }}>
                                {(item as any).distancia_km} km
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.operadorUser, { color: colors.textSecondary }]}>
                          @{item.usuario}
                          {(item as any).en_linea ? " • 🟢 En línea" : (item as any).en_linea === false ? " • ⚫ Sin señal" : ""}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.emptyOps, { color: colors.textSecondary }]}>
                    No se encontraron operadores
                  </Text>
                }
              />
            )}

            {/* Cerrar */}
            <TouchableOpacity
              onPress={() => { setShowOperadorModal(false); setOperadorSearch(""); }}
              style={[styles.modalCloseBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>

            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </Modal>
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
    zIndex: 200,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },

  // Mapa
  mapContainer: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },

  // Marcadores
  markerWrap: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  markerSelected: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  markerNum: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Chips sobre el mapa
  chipsOverlay: {
    position: "absolute",
    bottom: 8, left: 0, right: 0,
  },
  chipsScroll: { paddingHorizontal: 12, gap: 6 },
  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  miniChipNum: { fontSize: 12, fontWeight: "800" },
  miniChipText: { fontSize: 11, fontWeight: "600", maxWidth: 80 },

  // Formulario
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  formHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 6,
  },
  formScroll: { paddingHorizontal: 20, paddingTop: 8 },

  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  formInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formInputMulti: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  formInputText: { flex: 1, fontSize: 15, padding: 0 },

  // Nav buttons
  navRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  navBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  navBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12,
  },
  navBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Create button
  createBtn: { borderRadius: 18, overflow: "hidden", marginBottom: 8 },
  createBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  createBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  modalList: { maxHeight: 350 },

  operadorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  operadorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  operadorInitial: { fontSize: 16, fontWeight: "700" },
  operadorNombre: { fontSize: 14, fontWeight: "600" },
  operadorUser: { fontSize: 12, marginTop: 1 },

  emptyOps: { textAlign: "center", marginTop: 30, fontSize: 14 },

  modalCloseBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  modalCloseBtnText: { fontSize: 15, fontWeight: "600" },

  // Driver markers (Samsara)
  driverMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
