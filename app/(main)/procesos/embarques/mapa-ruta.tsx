import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
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
  articulos?: any[];
}

interface Operador {
  usuario_id: number;
  usuario: string;
  nombre_completo: string;
  id_samsara?: string;
}

interface OperadorSamsara extends Operador {
  latitud: number | null;
  longitud: number | null;
  velocidad: number;
  distancia_km: number;
  en_linea: boolean;
  ultima_vez: string | null;
  foto: string | null;
  vehiculo?: string;
  ubicacion?: string;
}

// ─── Colores de paradas ───────────────────────────────────────────────────────
const STOP_COLORS = [
  "#6C63FF", "#FF6B6B", "#4ECDC4", "#FFE66D",
  "#A8E6CF", "#FF8B94", "#B4A7D6", "#F9CA24",
];

const GOOGLE_MAPS_KEY = "AIzaSyClQbiCobSmUl3R-RDq8u5stNkPyYVV7pM";

// ─── CEDIS Totolcingo (punto de inicio de todas las rutas) ────────────────────
const CEDIS = { lat: 19.6142927, lon: -98.9685955, nombre: "CEDIS Totolcingo" };

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
  const [showDriverDetailModal, setShowDriverDetailModal] = useState(false);
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
  const [mapMode, setMapMode] = useState<"half" | "full" | "hidden">("half");
  const [routeStats, setRouteStats] = useState<{ distance: number; duration: number } | null>(null);

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

  // ── Fetch ubicaciones Samsara (polling cada 15s) ──
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSamsara = useCallback(async (lat: number, lon: number, dbId: number, isFirst = false) => {
    if (isFirst) setCargandoSamsara(true);
    try {
      const res = await fetch(`${API_URL}/api/samsara-ubicaciones.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, latRuta: lat, lonRuta: lon }),
      });
      const data = await res.json();
      if (data.success && data.operadores?.length > 0) {
        setOperadoresSamsara(data.operadores);
        setLastUpdated(new Date());
        if (isFirst) {
          // Ya no seleccionamos automáticamente al más cercano para permitir crear rutas disponibles por defecto
        }
      }
    } catch (e) {
      console.log("[Samsara] Error:", e);
    } finally {
      if (isFirst) setCargandoSamsara(false);
    }
  }, [operadorSeleccionado]);

  useEffect(() => {
    if (paradas.length === 0) return;
    // Distancia de conductores al CEDIS (de ahí salen los pedidos)
    const dbId = getCurrentDatabaseId() ?? 2;

    // Primera llamada inmediata
    fetchSamsara(CEDIS.lat, CEDIS.lon, dbId, true);

    // Polling cada 15 segundos — se actualiza solo en vivo
    pollingRef.current = setInterval(() => {
      fetchSamsara(CEDIS.lat, CEDIS.lon, dbId, false);
    }, 15000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paradas]);

  // ── Ajustar mapa ──
  useEffect(() => {
    if (mapReady && paradas.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: CEDIS.lat, longitude: CEDIS.lon },
            ...paradas
              .filter(p => p.latitud !== 0 && p.longitud !== 0 && p.latitud != null && p.longitud != null)
              .map(p => ({ latitude: p.latitud, longitude: p.longitud })),
          ],
          { edgePadding: { top: 100, right: 50, bottom: 50, left: 50 }, animated: true }
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

  // ── Generar Pre-Embarque (API) ──
  const handleGenerarPreEmbarque = async () => {
    const idSamsaraDriver = (operadorSeleccionado as any)?.id_samsara;
    const esDisponible = !operadorSeleccionado;

    setGuardando(true);
    try {
      const dbId = await getCurrentDatabaseId();

      // 1) Crear Registro Local
      const resCrearLocal = await fetch(`${API_URL}/api/crear-ruta.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCompleto: operadorSeleccionado ? operadorSeleccionado.nombre_completo : "RUTA DISPONIBLE",
          databaseId: dbId,
          idSamsara: idSamsaraDriver || null,
        }),
      });
      const dataCrearLocal = await resCrearLocal.json();
      if (!dataCrearLocal.success) throw new Error(dataCrearLocal.error || "Error al validar ruta local.");

      const localNombreRuta = dataCrearLocal.nombreRuta;

      if (esDisponible) {
        // FLUJO RUTA DISPONIBLE (Sin Samsara todavía)
        const resDisponible = await fetch(`${API_URL}/api/guardar-ruta-disponible.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombreRuta: localNombreRuta,
            databaseId: dbId,
            stops: paradas.map(p => ({
              cliente: p.cliente,
              folio: p.folio,
              latitud: p.latitud,
              longitud: p.longitud,
              articulos: p.articulos || []
            }))
          }),
        });
        const dataDisp = await resDisponible.json();
        if (!dataDisp.success) throw new Error(dataDisp.error || "Error al guardar ruta disponible.");

        Alert.alert("✓ Disponible", `La ruta "${localNombreRuta}" ha quedado pendiente para que un operador la tome.`);
        router.back();
        return;
      }

      // FLUJO NORMAL CON OPERADOR (SAMSARA)
      const resSamsara = await fetch(`${API_URL}/api/v1-samsara-crear-ruta.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: idSamsaraDriver,
          routeName: localNombreRuta,
          stops: paradas.map(p => ({
            cliente: p.cliente,
            folio: p.folio,
            latitud: p.latitud,
            longitud: p.longitud,
            articulos: p.articulos || []
          }))
        }),
      });
      const dataSamsara = await resSamsara.json();
      if (!dataSamsara.success) throw new Error(dataSamsara.error || "Error al crear ruta en Samsara.");

      const samsaraRouteId = dataSamsara.samsaraId; // EJ: "6071363370"

      // 3) Guardar Historial y QR (Formato oficial solicitado)
      // Formato: ID_RUTA:6071363370,FOLIO1,FOLIO2|Nombre:NOMBRE_CONDUCTOR
      const foliosStr = paradas.map(p => p.folio).join(",");
      const qrFinal = `ID_RUTA:${samsaraRouteId},${foliosStr}|Nombre:${operadorSeleccionado.nombre_completo}`;

      const resHistorial = await fetch(`${API_URL}/api/guardar-ruta-historial.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idRuta: samsaraRouteId,           // ID de Samsara (6071363370)
          idConductorSamsara: idSamsaraDriver, // ID del conductor (54501007)
          qrTexto: qrFinal,                 // String formateado para el QR
          nombreRuta: localNombreRuta,      // Alias local para referencia
          databaseId: dbId,
        }),
      });
      const dataHistorial = await resHistorial.json();
      if (!dataHistorial.success) throw new Error(dataHistorial.error || "Error al guardar historial.");

      Alert.alert("✓ Completado", `Ruta "${localNombreRuta}" creada exitosamente en Samsara (ID: ${samsaraRouteId})`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error("Error al crear ruta:", e);
      Alert.alert("Error", e.message || "No se pudo procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  // Polilínea: CEDIS → parada 1 → parada 2 → ... → última parada
  // Filtra paradas sin coordenadas válidas
  const polylineCoords = [
    { latitude: CEDIS.lat, longitude: CEDIS.lon },
    ...paradas
      .filter(p => p.latitud !== 0 && p.longitud !== 0 && p.latitud != null && p.longitud != null)
      .map(p => ({ latitude: p.latitud, longitude: p.longitud })),
  ];

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

      {/* ══ Header Flotante Premium ══ */}
      <View style={styles.header}>
        <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint={colors.isDark ? "dark" : "light"} style={[styles.headerBlur, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Pre-Embarque</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {paradas.length} paradas · {cargandoSamsara ? "Sincronizando..." : "Samsara Live"}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setMostrarOperadoresMapa(!mostrarOperadoresMapa)}
                style={[styles.backBtn, { backgroundColor: mostrarOperadoresMapa ? colors.accent + "15" : "transparent" }]}
              >
                <Ionicons
                  name={mostrarOperadoresMapa ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={mostrarOperadoresMapa ? colors.accent : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMapMode(mapMode === "full" ? "half" : "full")}
                style={[styles.backBtn, { backgroundColor: mapMode === "full" ? colors.accent + "15" : "transparent" }]}
              >
                <Ionicons
                  name={mapMode === "full" ? "contract-outline" : "expand-outline"}
                  size={20}
                  color={mapMode === "full" ? colors.accent : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>

      {/* ══ Mapa ══ */}
      {mapMode !== "hidden" && (
      <View style={[
        styles.mapContainer,
        { marginTop: insets.top + 56 },
        mapMode === "full" && { flex: 999 },
      ]}>
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
            <MapViewDirections
              origin={{ latitude: CEDIS.lat, longitude: CEDIS.lon }}
              destination={{ latitude: CEDIS.lat, longitude: CEDIS.lon }}
              waypoints={polylineCoords.slice(1)}
              apikey={GOOGLE_MAPS_KEY}
              strokeWidth={4}
              strokeColor={colors.accent}
              mode="DRIVING"
              optimizeWaypoints={false}
              precision="high"
              onReady={(result) => {
                setRouteStats({
                  distance: result.distance,
                  duration: result.duration,
                });
              }}
              onError={(errorMessage) => {
                console.warn("Directions Error: ", errorMessage);
              }}
            />
          )}

          {/* Marcador CEDIS */}
          <Marker
            coordinate={{ latitude: CEDIS.lat, longitude: CEDIS.lon }}
            title={CEDIS.nombre}
          >
            <View style={styles.cedisMarker}>
              <Ionicons name="business" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Marcadores de Paradas */}
          {paradas.map((p, idx) => (
            <Marker
              key={`stop-${p.docto_ve_id}`}
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
                setShowDriverDetailModal(true);
              }}
            >
              <View style={[
                styles.driverMarker,
                {
                  borderColor: (operadorSeleccionado as any)?.usuario_id === op.usuario_id
                    ? colors.accent : "#FF9500",
                },
              ]}>
                {op.foto ? (
                  <Image source={{ uri: op.foto }} style={styles.driverPhoto} />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#8E8E93" }}>
                    {op.nombre_completo?.charAt(0)?.toUpperCase()}
                  </Text>
                )}
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Modal Detalle Conductor Premium */}
        <Modal
          visible={showDriverDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDriverDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
             <TouchableOpacity 
               style={{ flex: 1 }} 
               activeOpacity={1} 
               onPress={() => setShowDriverDetailModal(false)} 
             />
             <BlurView
               intensity={Platform.OS === 'ios' ? 90 : 100}
               tint={colors.isDark ? 'dark' : 'light'}
               style={[styles.driverDetailSheet, { backgroundColor: colors.surface + "F2" }]}
             >
               <View style={styles.modalHandle} />
               
               {operadorSeleccionado && (operadorSeleccionado as OperadorSamsara).latitud ? (
                 <>
                   <View style={styles.driverHeader}>
                     <View style={[styles.avatarStats, { backgroundColor: colors.accent + "20" }]}>
                       {(operadorSeleccionado as OperadorSamsara).foto ? (
                         <Image source={{ uri: (operadorSeleccionado as OperadorSamsara).foto! }} style={styles.largeAvatar} />
                       ) : (
                         <Text style={[styles.largeInitial, { color: colors.accent }]}>
                           {operadorSeleccionado.nombre_completo.charAt(0)}
                         </Text>
                       )}
                       <View style={styles.onlineIndicator} />
                     </View>
                     
                     <View style={{ flex: 1 }}>
                       <Text style={[styles.driverNameLarge, { color: colors.text }]}>
                         {operadorSeleccionado.nombre_completo}
                       </Text>
                       <Text style={[styles.driverSubText, { color: colors.textSecondary }]}>
                         Conductor Samsara Live
                       </Text>
                     </View>
                   </View>

                   <View style={styles.driverStatsGrid}>
                     <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                       <Ionicons name="car-sport" size={20} color={colors.accent} />
                       <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Vehículo</Text>
                       <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                        {(operadorSeleccionado as OperadorSamsara).vehiculo || "No asignado"}
                       </Text>
                     </View>
                     <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                       <Ionicons name="speedometer" size={20} color="#34C759" />
                       <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Velocidad</Text>
                       <Text style={[styles.statValue, { color: colors.text }]}>
                        {(operadorSeleccionado as OperadorSamsara).velocidad} km/h
                       </Text>
                     </View>
                     <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                       <Ionicons name="navigate" size={20} color="#FF9500" />
                       <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Distancia</Text>
                       <Text style={[styles.statValue, { color: colors.text }]}>
                        {(operadorSeleccionado as OperadorSamsara).distancia_km} km
                       </Text>
                     </View>
                   </View>

                   <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                     <View style={styles.locationHeader}>
                       <Ionicons name="location" size={18} color={colors.accent} />
                       <Text style={[styles.locationTitle, { color: colors.textSecondary }]}>Ubicación Actual</Text>
                     </View>
                     <Text style={[styles.locationText, { color: colors.text }]}>
                       {(operadorSeleccionado as OperadorSamsara).ubicacion || "Buscando ubicación..."}
                     </Text>
                   </View>

                   <View style={styles.modalActions}>
                     <TouchableOpacity 
                       style={[styles.modalActionBtn, { backgroundColor: colors.accent }]}
                       onPress={() => {
                         if (operadorSeleccionado) {
                           setOperadorSeleccionado(operadorSeleccionado);
                           setShowDriverDetailModal(false);
                           setShowOperadorModal(false);
                           setOperadorSearch("");
                         }
                       }}
                     >
                        <Text style={styles.modalActionBtnText}>Asignar a esta Ruta</Text>
                     </TouchableOpacity>
                     
                     <TouchableOpacity 
                       style={[styles.modalActionBtnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                       onPress={() => setShowDriverDetailModal(false)}
                     >
                        <Text style={[styles.modalActionBtnTextSecondary, { color: colors.textSecondary }]}>Cerrar Detalle</Text>
                     </TouchableOpacity>
                   </View>
                 </>
               ) : (
                 <View style={{ padding: 40, alignItems: 'center' }}>
                   <ActivityIndicator size="large" color={colors.accent} />
                   <Text style={{ marginTop: 12, color: colors.textSecondary }}>Cargando datos del conductor...</Text>
                 </View>
               )}
               <View style={{ height: insets.bottom + 20 }} />
             </BlurView>
          </View>
        </Modal>

        {/* Controles del Mapa Flotantes */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            onPress={() => mapRef.current?.fitToCoordinates(polylineCoords, {
              edgePadding: { top: 120, right: 60, bottom: 60, left: 60 }, animated: true,
            })}
            style={styles.mapControlBtn}
          >
            <Ionicons name="navigate-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
             onPress={() => {
               const dbId = getCurrentDatabaseId() ?? 2;
               fetchSamsara(CEDIS.lat, CEDIS.lon, dbId, false);
             }}
             style={styles.mapControlBtn}
          >
            <Ionicons name="refresh" size={24} color="#34C759" />
          </TouchableOpacity>
        </View>

        {/* Badge de Estimación de Ruta (Top Right) */}
        {routeStats && (
          <View style={[styles.statsBadge, { backgroundColor: colors.surface + "EE" }]}>
            <View style={styles.statsRow}>
              <Ionicons name="time" size={16} color="#FF9500" />
              <Text style={[styles.statsText, { color: colors.text }]}>
                {routeStats.duration > 60 
                  ? `${Math.floor(routeStats.duration / 60)}h ${Math.round(routeStats.duration % 60)}m` 
                  : `${Math.round(routeStats.duration)} min`}
              </Text>
            </View>
            <View style={[styles.statsRow, { marginTop: 4 }]}>
              <Ionicons name="navigate" size={16} color="#3B82F6" />
              <Text style={[styles.statsText, { color: colors.text }]}>{routeStats.distance.toFixed(1)} km</Text>
            </View>
          </View>
        )}

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
                    borderColor: selectedIdx === idx ? STOP_COLORS[idx % STOP_COLORS.length] : "transparent",
                    borderWidth: selectedIdx === idx ? 2 : 0,
                  },
                ]}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: STOP_COLORS[idx % STOP_COLORS.length], justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                </View>
                <Text style={[styles.miniChipText, { color: colors.text }]} numberOfLines={1}>{p.folio}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      )}

      {mapMode !== "full" && (
      <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.formHandleContainer}>
          <View style={[styles.formHandle, { backgroundColor: colors.border }]} />
        </View>
        
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Detalles del Viaje</Text>

          {/* Nombre Ruta */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Identificador</Text>
            <View style={[styles.formInputWrapper, { backgroundColor: colors.background }]}>
              <Ionicons name="bookmark-outline" size={18} color={colors.accent} />
              <TextInput
                style={[styles.formInputText, { color: colors.text }]}
                value={nombreRuta}
                onChangeText={setNombreRuta}
                placeholder="Ej. Ruta Norte Mañana"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Conductor Asignado</Text>
            <TouchableOpacity
              onPress={() => setShowOperadorModal(true)}
              activeOpacity={0.7}
              style={[styles.formInputWrapper, { backgroundColor: colors.background }]}
            >
              <Ionicons name="person-outline" size={18} color={colors.accent} />
              <Text
                style={[
                  styles.formInputText,
                  { color: operadorSeleccionado ? colors.text : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {operadorSeleccionado?.nombre_completo ?? "Seleccionar operador..."}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Fecha */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fecha de Operación</Text>
            <View style={[styles.formInputWrapper, { backgroundColor: colors.background }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
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
            <Text style={styles.formLabel}>Observaciones</Text>
            <View style={[styles.formInputMulti, { backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.formInputText, { color: colors.text, minHeight: 60 }]}
                value={comentarios}
                onChangeText={setComentarios}
                placeholder="Notas adicionales..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
          </View>

          {/* Botones de navegación externos */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={abrirGoogleMaps} style={styles.navBtn} activeOpacity={0.85}>
              <LinearGradient colors={["#4285F4", "#34A853"]} style={styles.navBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Maps</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={abrirWaze} style={styles.navBtn} activeOpacity={0.85}>
              <LinearGradient colors={["#33CCFF", "#0099CC"]} style={styles.navBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="car" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Waze</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Botón Crear */}
          <TouchableOpacity
            onPress={() => {
              if (!operadorSeleccionado) {
                Alert.alert(
                  "Ruta sin Conductor",
                  "No has seleccionado un conductor. ¿Deseas crear esta ruta como 'Disponible' para que un operador la tome después?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    { 
                      text: "SÍ, CREAR DISPONIBLE", 
                      onPress: handleGenerarPreEmbarque 
                    },
                  ]
                );
                return;
              }

              Alert.alert(
                "Confirmar Envío",
                `¿Deseas crear el pre-embarque con ${paradas.length} paradas asignado a ${operadorSeleccionado.nombre_completo}?`,
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "SÍ, CREAR",
                    onPress: handleGenerarPreEmbarque,
                  },
                ]
              );
            }}
            disabled={guardando}
            activeOpacity={0.8}
            style={styles.createBtn}
          >
            <LinearGradient
              colors={[colors.accent, colors.accent + "DD"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.createBtnGrad}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.createBtnText}>Generar Pre-Embarque</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
      )}

      {/* ══ Modal Selector de Operador Premium ══ */}
      <Modal visible={showOperadorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === "ios" ? 80 : 100} tint={colors.isDark ? "dark" : "light"} style={[styles.modalContent, { backgroundColor: colors.surface + "F2" }]}>
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Asignar Conductor</Text>

            {/* Buscador */}
            <View style={[styles.modalSearch, { backgroundColor: colors.background }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Buscar por nombre o usuario..."
                placeholderTextColor={colors.textTertiary}
                value={operadorSearch}
                onChangeText={setOperadorSearch}
              />
              {operadorSearch !== "" && (
                <TouchableOpacity onPress={() => setOperadorSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {cargandoOps || cargandoSamsara ? (
              <View style={{ alignItems: "center", marginVertical: 40, gap: 12 }}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sincronizando flota...</Text>
              </View>
            ) : (
              <FlatList
                data={operadoresFiltrados}
                keyExtractor={(item) => item.usuario_id.toString()}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => {
                  const isSelected = (operadorSeleccionado as any)?.usuario_id === item.usuario_id;
                  const enLinea = (item as any).en_linea;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setOperadorSeleccionado(item);
                        setShowOperadorModal(false);
                        setOperadorSearch("");
                      }}
                      style={[styles.operadorItem, isSelected && styles.operadorSelected]}
                    >
                      <View style={[styles.operadorAvatar, { backgroundColor: isSelected ? colors.accent : enLinea ? "#34C75930" : colors.background }]}>
                        {enLinea ? (
                           <Ionicons name="car-sport" size={20} color={isSelected ? "#fff" : "#34C759"} />
                        ) : (
                          <Text style={[styles.operadorInitial, { color: isSelected ? "#fff" : colors.textSecondary }]}>
                            {item.nombre_completo?.charAt(0)?.toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.operadorNombre, { color: isSelected ? colors.accent : colors.text }]}>
                          {item.nombre_completo}
                        </Text>
                        <Text style={[styles.operadorUser, { color: colors.textTertiary }]}>
                          @{item.usuario} · {enLinea ? "Live" : "Sin señal"}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", color: colors.textTertiary, marginVertical: 40 }}>
                    No se encontraron resultados
                  </Text>
                }
              />
            )}

            {/* Cerrar */}
            <TouchableOpacity
              onPress={() => { setShowOperadorModal(false); setOperadorSearch(""); }}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>

            <View style={{ height: insets.bottom + 10 }} />
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // --- Header Flotante Premium ---
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerBlur: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },

  // --- Mapa ---
  mapContainer: {
    flex: 1,
  },

  // --- Custom Map Controls (Floating) ---
  mapControls: {
    position: "absolute",
    right: 16,
    bottom: 85,
    gap: 12,
    zIndex: 10,
  },
  mapControlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  // --- Marcadores ---
  markerWrap: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  markerSelected: { 
    width: 38, height: 38, borderRadius: 19, borderWidth: 3,
    shadowOpacity: 0.5, shadowRadius: 6,
  },
  markerNum: { color: "#fff", fontSize: 13, fontWeight: "900" },

  // --- Marcador CEDIS ---
  cedisMarker: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowRadius: 5,
    shadowOpacity: 0.3,
    elevation: 6,
  },

  // --- Driver Marker (Samsara) ---
  driverMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowRadius: 4,
    shadowOpacity: 0.2,
    elevation: 5,
  },
  driverPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // --- Badges ---
  statsBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  // --- Form Section ---
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  formHandleContainer: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  formHandle: {
    width: 36, height: 5, borderRadius: 2.5,
  },
  formScroll: { paddingHorizontal: 24, paddingTop: 4 },

  formTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 24,
    textAlign: 'center'
  },

  formGroup: { marginBottom: 20 },
  formLabel: { 
    fontSize: 13, 
    fontWeight: "600", 
    marginBottom: 8, 
    color: "#8E8E93",
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  formInputWrapper: {
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formInputText: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: "500",
    padding: 0,
  },
  formInputMulti: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  // --- Action Buttons ---
  navRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  navBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
  navBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
  },
  navBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  createBtn: { 
    borderRadius: 22, 
    overflow: "hidden", 
    marginBottom: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  createBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, paddingVertical: 20,
  },
  createBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },

  // --- Modal Operators ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    maxHeight: "90%",
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 36, height: 5, borderRadius: 2.5,
    backgroundColor: "rgba(0,0,0,0.1)",
    alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 26, 
    fontWeight: "800", 
    letterSpacing: -1,
    marginBottom: 20,
    textAlign: 'center'
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalSearchInput: { flex: 1, fontSize: 16, fontWeight: "500", padding: 0 },
  
  operadorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  operadorSelected: {
    borderColor: "rgba(0,122,255,0.1)",
    backgroundColor: "rgba(0,122,255,0.05)",
  },
  operadorAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
  },
  operadorInitial: { fontSize: 20, fontWeight: "800" },
  operadorNombre: { fontSize: 17, fontWeight: "700" },
  operadorUser: { fontSize: 13, marginTop: 2, fontWeight: "500" },

  modalCloseBtn: {
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseBtnText: { fontSize: 17, fontWeight: "700", color: "#8E8E93" },

  // --- Driver Detail Modal (Premium) ---
  driverDetailSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarStats: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  largeInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverNameLarge: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  driverSubText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  driverStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  locationCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  modalActionBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalActionBtnSecondary: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Chips (Stops) ---
  chipsOverlay: {
    position: "absolute",
    bottom: 24, left: 0, right: 0,
  },
  chipsScroll: { paddingHorizontal: 16, gap: 12 },
  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  miniChipText: { fontSize: 13, fontWeight: "700", letterSpacing: -0.2 },
});
