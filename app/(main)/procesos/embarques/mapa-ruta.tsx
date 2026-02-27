import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarModal } from "./Mapa-Ruta/CalendarModal";
import { DriverDetailModal } from "./Mapa-Ruta/DriverDetailModal";
import { Header } from "./Mapa-Ruta/Header";
import { MapControls } from "./Mapa-Ruta/MapControls";
import { OperadorModal } from "./Mapa-Ruta/OperadorModal";
import { RouteStats } from "./Mapa-Ruta/RouteStats";
import { StopChips } from "./Mapa-Ruta/StopChips";
import { getStyles } from "./Mapa-Ruta/styles";
import { TripForm } from "./Mapa-Ruta/TripForm";

import { CEDIS, GOOGLE_MAPS_KEY, Operador, OperadorSamsara, Parada, STOP_COLORS } from "./Mapa-Ruta/types";

export default function MapaRutaScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [comentarios, setComentarios] = useState("");
  const [nombreRuta, setNombreRuta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargandoOps, setCargandoOps] = useState(false);
  const [cargandoSamsara, setCargandoSamsara] = useState(false);
  const [mostrarOperadoresMapa, setMostrarOperadoresMapa] = useState(true);
  const [mapMode, setMapMode] = useState<"half" | "full" | "hidden">("half");
  const [routeStats, setRouteStats] = useState<{ distance: number; duration: number } | null>(null);

  // ── Agrupar paradas por ubicación para evitar encimamiento ──
  const paradasAgrupadas = React.useMemo(() => {
    const groups: { [key: string]: { lat: number, lon: number, items: Parada[], firstIdx: number, color: string } } = {};
    paradas.forEach((p, idx) => {
      const key = `${p.latitud.toFixed(6)}|${p.longitud.toFixed(6)}`;
      if (!groups[key]) {
        groups[key] = { 
          lat: p.latitud, 
          lon: p.longitud, 
          items: [], 
          firstIdx: idx,
          color: STOP_COLORS[idx % STOP_COLORS.length]
        };
      }
      groups[key].items.push(p);
    });
    return Object.values(groups);
  }, [paradas]);

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
      <Header
        onBack={() => router.back()}
        title="Pre-Embarque"
        numParadas={paradas.length}
        loadingSamsara={cargandoSamsara}
        mostrarOperadoresMapa={mostrarOperadoresMapa}
        setMostrarOperadoresMapa={setMostrarOperadoresMapa}
        mapMode={mapMode}
        setMapMode={setMapMode}
        colors={colors}
        styles={styles}
        insets={insets}
      />

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
          {/* Marcadores de Paradas Agrupados */}
          {paradasAgrupadas.map((grupo, gIdx) => {
            const isSelected = selectedIdx !== null && grupo.items.some(item => paradas.indexOf(item) === selectedIdx);
            const count = grupo.items.length;
            
            // Calculamos dimensiones explicitas para evitar bugs de renderizado en Android
            const size = count > 1 ? 52 : (isSelected ? 44 : 32);
            const br = size / 2;

            return (
              <Marker
                key={`group-${gIdx}-${isSelected ? 's' : 'n'}-${count}`}
                coordinate={{ latitude: grupo.lat, longitude: grupo.lon }}
                onPress={() => centrarEnParada(grupo.firstIdx)}
                zIndex={isSelected ? 100 : 1}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={{ width: 80, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
                  <View style={[
                    styles.markerWrap,
                    { 
                      width: size, 
                      height: size, 
                      borderRadius: size / 2, 
                      backgroundColor: grupo.color,
                      borderWidth: isSelected || count > 1 ? 3 : 2,
                      elevation: 5, // Secret sauce for Android circles
                    }
                  ]}>
                    <Text style={[
                      styles.markerNum, 
                      { fontSize: count > 1 ? 16 : (isSelected ? 18 : 13) }
                    ]}>
                      {count > 1 ? count : grupo.firstIdx + 1}
                    </Text>
                    
                    {count > 1 && (
                      <View style={styles.markerBadge}>
                        <Ionicons name="documents" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              </Marker>
            );
          })}

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

        {/* ══ Modal Detalle Conductor Premium ══ */}
        <DriverDetailModal
          visible={showDriverDetailModal}
          onClose={() => setShowDriverDetailModal(false)}
          colors={colors}
          styles={styles}
          operadorSeleccionado={operadorSeleccionado}
          onAssign={(op) => {
            setOperadorSeleccionado(op);
            setShowDriverDetailModal(false);
            setShowOperadorModal(false);
            setOperadorSearch("");
          }}
        />

        {/* Controles del Mapa Flotantes */}
        {/* Controles del Mapa Flotantes */}
        <MapControls
          visible={mostrarOperadoresMapa}
          onRecenter={() => mapRef.current?.fitToCoordinates(polylineCoords, {
            edgePadding: { top: 120, right: 60, bottom: 60, left: 60 }, animated: true,
          })}
          onRefreshSamsara={() => {
            const dbId = getCurrentDatabaseId() ?? 2;
            fetchSamsara(CEDIS.lat, CEDIS.lon, dbId, false);
          }}
          colors={colors}
          styles={styles}
        />

        {/* Badge de Estimación de Ruta (Top Right) */}
        <RouteStats
          visible={mostrarOperadoresMapa && routeStats !== null}
          routeStats={routeStats}
          colors={colors}
          styles={styles}
        />

        {/* Mini chips de paradas sobre el mapa */}
        <StopChips
          paradas={paradas}
          selectedIdx={selectedIdx}
          onSelect={centrarEnParada}
          colors={colors}
          styles={styles}
        />
      </View>
      )}

      {mapMode !== "full" && (
        <TripForm
          colors={colors}
          styles={styles}
          insets={insets}
          nombreRuta={nombreRuta}
          setNombreRuta={setNombreRuta}
          operadorSeleccionado={operadorSeleccionado}
          setShowOperadorModal={setShowOperadorModal}
          selectedDate={selectedDate}
          setShowCalendarModal={setShowCalendarModal}
          comentarios={comentarios}
          setComentarios={setComentarios}
          guardando={guardando}
          onGenerate={handleGenerarPreEmbarque}
          numParadas={paradas.length}
        />
      )}

      {/* ══ Modal Selector de Operador Premium ══ */}
      <OperadorModal
        visible={showOperadorModal}
        onClose={() => { setShowOperadorModal(false); setOperadorSearch(""); }}
        colors={colors}
        styles={styles}
        insets={insets}
        searchText={operadorSearch}
        onSearchChange={setOperadorSearch}
        loading={cargandoOps || cargandoSamsara}
        data={operadoresFiltrados}
        selectedOperador={operadorSeleccionado}
        onSelect={(item) => {
          setOperadorSeleccionado(item);
          setShowOperadorModal(false);
          setOperadorSearch("");
        }}
      />

      {/* ══ Modal de Calendario Premium ══ */}
      <CalendarModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        colors={colors}
        styles={styles}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setFechaEntrega(date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" }));
        }}
        calendarViewDate={calendarViewDate}
        onViewDateChange={setCalendarViewDate}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
