import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const CEDIS = { lat: 19.6142927, lon: -98.9685955, nombre: "CEDIS Totolcingo" };

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={styles.cameraImage} />;
}

interface OperadorSamsara {
  id_samsara: string;
  nombre_completo: string;
  lat: number;
  lon: number;
  en_linea: boolean;
  ultima_actualizacion: string;
  usuario_id: number;
  usuario: string;
  foto_url?: string;
  vehiculo?: string;
  id_vehiculo?: string;
}

export default function MonitoreoOperadoresScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [operadores, setOperadores] = useState<OperadorSamsara[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<OperadorSamsara | null>(null);

  // Cámara
  const [showCamera, setShowCamera] = useState(false);
  const [loadingCamara, setLoadingCamara] = useState(false);
  const [cameraData, setCameraData] = useState<{ url: string; time: string; type: 'video' | 'image' } | null>(null);

  // Live Stream Web
  const [showLiveWeb, setShowLiveWeb] = useState(false);



  useEffect(() => {
    fetchSamsara(true);
    const interval = setInterval(() => fetchSamsara(false), 30000); // Cada 30 seg
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleVerCamara = async (vId: string) => {
    setLoadingCamara(true);
    setCameraData(null);
    setShowCamera(true);
    try {
      const res = await fetch(`${API_URL}/api/samsara-camara.php?vehicleId=${vId}`);
      const data = await res.json();
      if (data.success) {
        setCameraData({ 
          url: data.url, 
          time: data.captureTime, 
          type: data.mediaType === 'video' ? 'video' : 'image' 
        });
      } else {
        Alert.alert("Cámara no disponible", data.error || "No se pudo obtener la imagen o video.");
        setShowCamera(false);
      }
    } catch (err) {
      Alert.alert("Error", "Error al conectar con el servidor de video.");
      setShowCamera(false);
    } finally {
      setLoadingCamara(false);
    }
  };

  const fetchSamsara = async (isFirst: boolean) => {
    try {
      const dbId = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("current_db_id")).then(id => id ? parseInt(id) : 2);
      
      const res = await fetch(`${API_URL}/api/samsara-ubicaciones.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, latRuta: CEDIS.lat, lonRuta: CEDIS.lon }),
      });
      const data = await res.json();
      if (data.success && data.operadores?.length > 0) {
        // Normalizar nombres de campos si es necesario
        const normalizados = data.operadores.map((o: any) => ({
          ...o,
          lat: o.latitud,
          lon: o.longitud,
          foto_url: o.foto,
          ultima_actualizacion: o.ultima_vez
        }));
        setOperadores(normalizados);
        setLastUpdated(new Date());
        
        if (isFirst) {
          const points = [
            { latitude: CEDIS.lat, longitude: CEDIS.lon },
            ...normalizados.filter((o: any) => o.lat && o.lon).map((o: any) => ({ latitude: o.lat, longitude: o.lon }))
          ];
          if (points.length > 1) {
            mapRef.current?.fitToCoordinates(points, {
              edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
              animated: true
            });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching Samsara GPS:", e);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  const driversInLine = operadores.filter(o => o.en_linea).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      >
        {/* CEDIS */}
        <Marker coordinate={{ latitude: CEDIS.lat, longitude: CEDIS.lon }} title="CEDIS">
          <View style={styles.cedisMarker}>
            <Ionicons name="business" size={20} color="#fff" />
          </View>
        </Marker>

        {/* Operadores (Filtrar los que no tienen coordenadas válidas) */}
        {operadores
          .filter(op => op.lat != null && op.lon != null && !isNaN(op.lat) && !isNaN(op.lon))
          .map((op) => (
          <Marker
            key={op.id_samsara || op.usuario_id.toString()}
            coordinate={{ latitude: Number(op.lat), longitude: Number(op.lon) }}
            onPress={() => setSelectedDriver(op)}
          >
            <View style={[
              styles.driverMarker,
              { borderColor: op.en_linea ? "#34C759" : colors.textTertiary }
            ]}>
              {op.foto_url ? (
                <Image source={{ uri: op.foto_url }} style={styles.driverPhoto} />
              ) : (
                <View style={[styles.driverPhoto, { backgroundColor: op.en_linea ? "#34C75930" : "#8E8E9330", justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: op.en_linea ? "#34C759" : "#8E8E93" }}>
                    {op.nombre_completo?.charAt(0)}
                  </Text>
                </View>
              )}
              {op.en_linea && <View style={styles.onlineDot} />}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header Sólido */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Monitoreo Flota</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {driversInLine} conductores en línea
          </Text>
        </View>
        <TouchableOpacity onPress={() => fetchSamsara(false)} style={styles.backBtn}>
          <Ionicons name="refresh" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Driver Detail Card */}
      {selectedDriver && (
        <View style={[styles.detailCard, { backgroundColor: colors.surface, bottom: insets.bottom + 20 }]}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.driverName, { color: colors.text }]}>{selectedDriver.nombre_completo}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>@{selectedDriver.usuario}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDriver(null)}>
              <Ionicons name="close-circle" size={26} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="car" size={16} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedDriver.vehiculo || "Sin vehículo"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color="#FF9500" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedDriver.ultima_actualizacion || "Revisando..."}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.trackBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              mapRef.current?.animateToRegion({
                latitude: selectedDriver.lat,
                longitude: selectedDriver.lon,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }}
          >
            <Ionicons name="locate" size={18} color="#fff" />
            <Text style={styles.trackBtnText}>ENFOCAR CONDUCTOR</Text>
          </TouchableOpacity>

          {selectedDriver.id_vehiculo && (
            <TouchableOpacity 
              style={[styles.cameraBtn, { borderColor: colors.accent, borderWidth: 1.5, marginTop: 12 }]}
              onPress={() => handleVerCamara(selectedDriver.id_vehiculo!)}
            >
              <Ionicons name="videocam" size={18} color={colors.accent} />
              <Text style={[styles.cameraBtnText, { color: colors.accent }]}>VER HISTORIAL (SNAPSHOT)</Text>
            </TouchableOpacity>
          )}

          {selectedDriver.id_vehiculo && (
            <TouchableOpacity 
              style={[styles.liveBtn, { backgroundColor: "#FF3B30", marginTop: 12 }]}
              onPress={() => setShowLiveWeb(true)}
            >
              <Ionicons name="flame" size={18} color="#fff" />
              <Text style={styles.liveBtnText}>TRANSMISIÓN EN VIVO (DASHBOARD)</Text>
            </TouchableOpacity>
          )}

        </View>
      )}

      {/* Modal Live Stream WebView */}
      <Modal visible={showLiveWeb} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={[styles.webHeader, { paddingTop: insets.top, backgroundColor: '#1c1c1e' }]}>
            <TouchableOpacity onPress={() => setShowLiveWeb(false)} style={styles.webBack}>
               <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Live Stream: {selectedDriver?.nombre_completo}</Text>
            <View style={{ width: 44 }} />
          </View>
          {selectedDriver?.id_vehiculo && (
            <WebView 
              source={{ uri: `https://cloud.samsara.com/dashboard/fleet/vehicles/${selectedDriver.id_vehiculo}/live` }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              injectedJavaScript={`
                (function() {
                  function autoClickLive() {
                    const elements = document.querySelectorAll('span');
                    for (const el of elements) {
                      if (el.textContent.includes('Ver transmisión en vivo')) {
                        // Encontró el texto, ahora buscamos el botón padre para clickear
                        let parent = el;
                        while (parent && parent.tagName !== 'BUTTON' && parent.parentElement) {
                          parent = parent.parentElement;
                        }
                        if (parent) {
                          parent.click();
                          console.log('Botón Live presionado automáticamente');
                          return true;
                        }
                      }
                    }
                    return false;
                  }

                  // Intentar cada segundo hasta que aparezca el botón (máximo 15 seg)
                  let attempts = 0;
                  const interval = setInterval(() => {
                    attempts++;
                    if (autoClickLive() || attempts > 15) {
                      clearInterval(interval);
                    }
                  }, 1000);
                })();
                true;
              `}
              renderLoading={() => (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                  <ActivityIndicator size="large" color="#FF3B30" />
                  <Text style={{ color: '#fff', marginTop: 10 }}>Iniciando Transmisión Live...</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Modal Cámara */}
      <Modal visible={showCamera} animationType="fade" transparent>
        <View style={styles.cameraOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <View>
                <Text style={styles.cameraTitle}>Dash Cam - {selectedDriver?.nombre_completo}</Text>
                {cameraData && <Text style={styles.cameraTime}>{new Date(cameraData.time).toLocaleString()}</Text>}
              </View>
              <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraClose}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraFrame}>
              {loadingCamara ? (
                <View style={styles.cameraLoading}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={{ color: "#fff", marginTop: 15 }}>Cargando media de Samsara...</Text>
                </View>
              ) : cameraData ? (
                cameraData.type === 'video' ? (
                  <VideoPlayer url={cameraData.url} />
                ) : (
                  <Image 
                    source={{ uri: cameraData.url }} 
                    style={styles.cameraImage} 
                    resizeMode="contain" 
                  />
                )
              ) : (
                <Text style={{ color: "#fff" }}>Error al cargar contenido</Text>
              )}
            </View>

            <TouchableOpacity 
              onPress={() => selectedDriver?.id_vehiculo && handleVerCamara(selectedDriver.id_vehiculo)}
              style={styles.refreshCamBtn}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshCamText}>ACTUALIZAR VISTA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + "99" }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Sincronizando GPS...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  
  cedisMarker: { 
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#1c1c1e', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, 
    borderColor: '#fff', elevation: 5 
  },
  driverMarker: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2.5,
    elevation: 5, overflow: 'hidden'
  },
  driverPhoto: { width: 40, height: 40, borderRadius: 20 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2, width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#34C759', borderWidth: 1.5, borderColor: '#fff'
  },

  detailCard: {
    position: 'absolute', left: 20, right: 20, borderRadius: 24,
    padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 15, elevation: 12
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  driverName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12 },
  infoText: { fontSize: 13, fontWeight: '600' },
  trackBtn: { height: 50, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  trackBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  cameraBtn: {
    height: 50, borderRadius: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10
  },
  cameraBtnText: { fontSize: 14, fontWeight: '700' },

  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraContainer: { width: '90%', gap: 20 },
  cameraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cameraTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  cameraClose: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  cameraFrame: { 
    aspectRatio: 16/9, backgroundColor: '#000', borderRadius: 20, 
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  cameraImage: { width: '100%', height: '100%' },
  cameraLoading: { alignItems: 'center' },
  refreshCamBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, alignSelf: 'center', paddingHorizontal: 20
  },
  refreshCamText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  liveBtn: {
    height: 50, borderRadius: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10
  },
  liveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  webHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333'
  },
  webBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },


  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 20 }
});
