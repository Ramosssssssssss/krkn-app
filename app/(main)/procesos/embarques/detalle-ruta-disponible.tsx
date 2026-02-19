import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOOGLE_MAPS_KEY = "AIzaSyClQbiCobSmUl3R-RDq8u5stNkPyYVV7pM";
const CEDIS = { lat: 19.6142927, lon: -98.9685955, nombre: "CEDIS Totolcingo" };

export default function DetalleRutaDisponibleScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const { rutaId, nombreRuta } = useLocalSearchParams<{ rutaId: string; nombreRuta: string }>();
    const mapRef = useRef<MapView>(null);

    const [paradas, setParadas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [taking, setTaking] = useState(false);
    const [routeStats, setRouteStats] = useState<{ distance: number; duration: number; legs: any[] } | null>(null);
    const [selectedStop, setSelectedStop] = useState<any | null>(null);
    const [showList, setShowList] = useState(false);

    useEffect(() => {
        fetchDetalle();
    }, []);

    const fetchDetalle = async () => {
        try {
            const dbId = await getCurrentDatabaseId();
            const res = await fetch(`${API_URL}/api/obtener-detalle-ruta.php?rutaId=${rutaId}&databaseId=${dbId}`);
            const data = await res.json();
            if (data.success) {
                setParadas(data.paradas);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTomarRuta = async () => {
        const idS = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("id_samsara"));
        const nom = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("nombre_completo"));

        if (!idS || !nom) return Alert.alert("Error", "No se encontró información del conductor.");

        Alert.alert(
            "Confirmar Asignación",
            `¿Estás seguro de tomar la ruta "${nombreRuta}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "SÍ, TOMAR RUTA",
                    onPress: async () => {
                        setTaking(true);
                        try {
                            const dbId = await getCurrentDatabaseId();
                            const res = await fetch(`${API_URL}/api/tomar-ruta.php`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    rutaId,
                                    driverId: idS,
                                    nombreOperador: nom,
                                    databaseId: dbId,
                                }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                Alert.alert("✓ Asignada", "La ruta ya está en tu Samsara.");
                                router.replace("/(main)/procesos/embarques/ver-rutas");
                            } else {
                                throw new Error(data.error);
                            }
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        } finally {
                            setTaking(false);
                        }
                    }
                }
            ]
        );
    };

    const getStopETA = (index: number, isItinerary: boolean = false) => {
      if (!routeStats || !routeStats.legs) return "--:--";
      
      // En el itinerario, index 0 es Inicio (Sólamente Now)
      if (isItinerary && index === 0) return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

      let totalDurationMinutes = 0;
      // Si es del mapa (0-indexed paradas), sumamos legs[0...index]
      // Si es del itinerario (1-indexed paradas), sumamos legs[0...(index-1)]
      const legLimit = isItinerary ? index - 1 : index;

      for (let i = 0; i <= legLimit; i++) {
        totalDurationMinutes += routeStats.legs[i]?.duration || 0;
      }

      const now = new Date();
      now.setMinutes(now.getMinutes() + totalDurationMinutes);
      return now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    };

    if (loading) return (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Cargando mapa...</Text>
        </View>
    );

    const points = [
        { latitude: CEDIS.lat, longitude: CEDIS.lon },
        ...paradas.map(p => ({ latitude: Number(p.LATITUD), longitude: Number(p.LONGITUD) }))
    ];

    const handleFocusStop = (p: any, i: number) => {
      // Si es el inicio o fin del itinerario, no seleccionamos parada detalle
      if (p.type === 'start' || p.type === 'end') {
        setShowList(false);
        mapRef.current?.animateToRegion({
          latitude: Number(p.LATITUD),
          longitude: Number(p.LONGITUD),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
        return;
      }
      setSelectedStop({ ...p, index: i - 1 }); // Desfasamos porque index 0 fue el CEDIS
      setShowList(false);
      mapRef.current?.animateToRegion({
        latitude: Number(p.LATITUD),
        longitude: Number(p.LONGITUD),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    };

    const itinerary = [
      { type: 'start', CLIENTE: CEDIS.nombre, LATITUD: CEDIS.lat, LONGITUD: CEDIS.lon, FOLIO: 'PUNTO DE PARTIDA' },
      ...paradas.map(p => ({ ...p, type: 'stop' })),
      { type: 'end', CLIENTE: CEDIS.nombre, LATITUD: CEDIS.lat, LONGITUD: CEDIS.lon, FOLIO: 'REGRESO A SUCURSAL' }
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: CEDIS.lat,
                    longitude: CEDIS.lon,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                onPress={() => setSelectedStop(null)}
                onMapReady={() => {
                    mapRef.current?.fitToCoordinates(points, {
                        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                        animated: true
                    });
                }}
            >
                <Marker coordinate={{ latitude: CEDIS.lat, longitude: CEDIS.lon }} title="CEDIS">
                    <View style={styles.cedisMarker}><Ionicons name="business" size={20} color="#fff" /></View>
                </Marker>

                {paradas.map((p, i) => (
                    <Marker 
                        key={i} 
                        coordinate={{ latitude: Number(p.LATITUD), longitude: Number(p.LONGITUD) }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedStop({ ...p, index: i });
                        }}
                    >
                        <View style={[
                          styles.stopMarker, 
                          selectedStop?.index === i && { transform: [{ scale: 1.2 }], backgroundColor: colors.accent }
                        ]}>
                          <Text style={styles.stopText}>{i + 1}</Text>
                        </View>
                    </Marker>
                ))}

                <MapViewDirections
                    origin={points[0]}
                    destination={points[0]}
                    waypoints={points.slice(1)}
                    apikey={GOOGLE_MAPS_KEY}
                    strokeWidth={4}
                    strokeColor={colors.accent}
                    mode="DRIVING"
                    onReady={(result) => {
                      setRouteStats({
                        distance: result.distance,
                        duration: result.duration,
                        legs: result.legs
                      });
                    }}
                />
            </MapView>

            {/* Header Sólido */}
            <View style={[
              styles.header, 
              { 
                paddingTop: insets.top, 
                backgroundColor: colors.surface,
                borderBottomColor: colors.border
              }
            ]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={colors.accent} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.title, { color: colors.text }]}>{nombreRuta}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{paradas.length} paradas pendientes</Text>
                </View>
                <TouchableOpacity onPress={() => setShowList(true)} style={styles.backBtn}>
                    <Ionicons name="list" size={24} color={colors.accent} />
                </TouchableOpacity>
            </View>

            {/* Stats Badge */}
            {routeStats && (
              <View style={[styles.statsBadge, { top: insets.top + 70, backgroundColor: colors.surface + "EE" }]}>
                <View style={styles.statsRow}>
                  <Ionicons name="time" size={14} color="#FF9500" />
                  <Text style={[styles.statsText, { color: colors.text }]}>{Math.round(routeStats.duration)} min</Text>
                </View>
                <View style={[styles.statsRow, { marginTop: 4 }]}>
                  <Ionicons name="navigate" size={14} color="#3B82F6" />
                  <Text style={[styles.statsText, { color: colors.text }]}>{routeStats.distance.toFixed(1)} km</Text>
                </View>
              </View>
            )}

            {/* Panel de Información / Botón Tomar */}
            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
                {selectedStop ? (
                  <View style={styles.stopDetail}>
                    <View style={styles.detailHeader}>
                      <View style={[styles.stopBadge, { backgroundColor: colors.accent + "20" }]}>
                        <Text style={[styles.stopBadgeText, { color: colors.accent }]}>PARADA {selectedStop.index + 1}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedStop(null)}>
                        <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.detailFolio, { color: colors.text }]}>{selectedStop.FOLIO}</Text>
                    <Text style={[styles.detailCliente, { color: colors.textSecondary }]}>{selectedStop.CLIENTE}</Text>
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>{selectedStop.CALLE}</Text>
                    </View>

                    <View style={styles.gridInfo}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>COORDENADAS</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>{Number(selectedStop.LATITUD).toFixed(5)}, {Number(selectedStop.LONGITUD).toFixed(5)}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>LLEGADA EST.</Text>
                        <Text style={[styles.gridValue, { color: "#34C759" }]}>{getStopETA(selectedStop.index)} hrs</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                      onPress={handleTomarRuta} 
                      disabled={taking}
                      style={[styles.takeBtn, { backgroundColor: colors.accent }]}
                  >
                      {taking ? <ActivityIndicator color="#fff" /> : (
                          <>
                              <Ionicons name="hand-right-outline" size={24} color="#fff" />
                              <Text style={styles.takeBtnText}>TOMAR ESTA RUTA</Text>
                          </>
                      )}
                  </TouchableOpacity>
                )}
            </View>

            {/* Modal de Lista de Puntos */}
            <Modal visible={showList} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <BlurView intensity={100} tint={colors.isDark ? "dark" : "light"} style={[styles.modalContent, { backgroundColor: colors.surface + "F9" }]}>
                  <View style={styles.modalHandle} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Itinerario</Text>
                  
                  <FlatList
                    data={itinerary}
                    keyExtractor={(_: any, i: number) => i.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }: { item: any; index: number }) => {
                      const isSpecial = item.type === 'start' || item.type === 'end';
                      return (
                        <TouchableOpacity 
                          onPress={() => handleFocusStop(item, index)}
                          style={[styles.listItem, { borderBottomColor: colors.border }]}
                        >
                          <View style={[
                            styles.listIndex, 
                            { backgroundColor: isSpecial ? "#1c1c1e" : colors.accent }
                          ]}>
                            {item.type === 'start' ? <Ionicons name="play" size={12} color="#fff" /> : 
                             item.type === 'end' ? <Ionicons name="flag" size={12} color="#fff" /> :
                             <Text style={styles.listIndexText}>{index}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.listFolio, { color: colors.text, fontSize: isSpecial ? 14 : 16 }]}>{item.FOLIO}</Text>
                            <Text style={[styles.listCliente, { color: colors.textSecondary }]} numberOfLines={1}>{item.CLIENTE}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.listEta, { color: isSpecial ? colors.textTertiary : "#34C759" }]}>
                              {getStopETA(index, true)}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textTertiary }}>{index === 0 ? 'Salida' : 'Llegada'}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <TouchableOpacity 
                    onPress={() => setShowList(false)}
                    style={[styles.closeModalBtn, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                  >
                    <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Cerrar</Text>
                  </TouchableOpacity>
                  <View style={{ height: insets.bottom + 10 }} />
                </BlurView>
              </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        flexDirection: 'row', alignItems: 'center', paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700' },
    
    // Stats Badge
    statsBadge: {
      position: 'absolute', right: 16, padding: 10, borderRadius: 15,
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', zIndex: 10,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statsText: { fontSize: 13, fontWeight: '700' },

    bottomCard: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: "#000", shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1, shadowRadius: 15, elevation: 15
    },
    takeBtn: {
        height: 60, borderRadius: 20, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 12
    },
    takeBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
    
    // Stop Detail
    stopDetail: { gap: 8 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    stopBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    stopBadgeText: { fontSize: 11, fontWeight: '800' },
    detailFolio: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    detailCliente: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
    infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
    gridInfo: { flexDirection: 'row', gap: 20, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    gridItem: { flex: 1 },
    gridLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', marginBottom: 2 },
    gridValue: { fontSize: 14, fontWeight: '600' },

    // Modal List
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 12, maxHeight: '80%' },
    modalHandle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
    listIndex: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    listIndexText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    listFolio: { fontSize: 16, fontWeight: '700' },
    listCliente: { fontSize: 13, fontWeight: '500' },
    listEta: { fontSize: 14, fontWeight: '700' },
    closeModalBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 20 },

    cedisMarker: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    stopMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    stopText: { color: '#fff', fontWeight: '900', fontSize: 14 }
});

