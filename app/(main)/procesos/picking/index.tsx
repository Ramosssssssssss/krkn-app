import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ==================== TIPOS ====================
interface PickerMetrics {
  totalScore: number;
  rank: number | null;
  totalPickers: number;
  totalUnidades: number;
  totalPartidas: number;
  totalDocumentos: number;
  periodo: {
    fechaInicio: string;
    fechaFin: string;
    semana: string;
  };
  detalle: {
    traspasos: { unidades: number; partidas: number; documentos: number; score: number };
    ventanilla: { unidades: number; partidas: number; documentos: number; score: number };
    pedidos: { unidades: number; partidas: number; documentos: number; score: number };
  };
}

// ==================== COMPONENTES VISUALES ====================

const ActivityRing = ({ size, strokeWidth, progress, color, backgroundColor }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} fill="transparent" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

const DistributionChart = ({ data, colors }: { data: any; colors: any }) => {
  const pS = data?.pedidos?.score || 0;
  const tS = data?.traspasos?.score || 0;
  const vS = data?.ventanilla?.score || 0;
  const max = Math.max(pS, tS, vS, 1);
  
  const items = [
    { label: "Pedidos", val: pS, color: colors.accent },
    { label: "Traspasos", val: tS, color: "#8B5CF6" },
    { label: "Ventanilla", val: vS, color: "#EC4899" },
  ];

  return (
    <View style={styles.chartContainer}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.chartRow}>
          <View style={styles.chartLabelRow}>
            <Text style={[styles.chartBarLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.chartBarValue, { color: colors.text }]}>{item.val.toLocaleString()}</Text>
          </View>
          <View style={[styles.chartBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.chartBarFill, { width: `${(item.val / max) * 100}%`, backgroundColor: item.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
export default function PickingHomeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<PickerMetrics | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMetrics = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const pikerId = (user as any)?.PIKER_ID || user?.USUARIO_ID || 1;
      const response = await fetch(`${API_URL}/api/picking-metrics.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, pikerId }),
      });
      const data = await response.json();
      if (data.success) {
        setMetrics({
          totalScore: data.resumen?.totalScore || 0,
          rank: data.rank,
          totalPickers: data.totalPickers || 0,
          totalUnidades: data.resumen?.totalUnidades || 0,
          totalPartidas: data.resumen?.totalPartidas || 0,
          totalDocumentos: data.resumen?.totalDocumentos || 0,
          periodo: data.periodo,
          detalle: data.detalle,
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const rankLabel = metrics?.rank ? (metrics.rank === 1 ? 'LÍDER' : metrics.rank <= 3 ? 'TOP 3' : `RANK #${metrics.rank}`) : 'PENDIENTE';
  const rankColor = metrics?.rank && metrics.rank <= 1 ? '#FFD700' : colors.accent;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* APPLE HEADER */}
      <BlurView intensity={30} tint={colors.dark ? 'dark' : 'light'} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Picking</Text>
          <View style={{ width: 44 }} />
        </View>
      </BlurView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 100 + insets.top / 2 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* CAROUSEL SECTION (User Info -> Stats) */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setActiveIndex(Math.round(x / (SCREEN_WIDTH - 32)));
            }}
            scrollEventThrottle={16}
          >
            {/* PAGE 1: USER INFO */}
            <View style={[styles.carouselPage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <View style={styles.userPageContent}>
                  <View style={styles.userPageTop}>
                     <Image source={{ uri: user?.AVATAR_URL || "https://via.placeholder.com/100" }} style={[styles.bigAvatar, { borderColor: colors.border }]} />
                     <View style={styles.userPageInfo}>
                        <Text style={[styles.userPageName, { color: colors.text }]}>{user?.NOMBRE || "Picker"}</Text>
                        <Text style={[styles.userPageId, { color: colors.textSecondary }]}>ID: {(user as any)?.PIKER_ID || user?.USUARIO_ID}</Text>
                        <View style={[styles.rankTag, { backgroundColor: rankColor + '15' }]}>
                           <Text style={[styles.rankTagText, { color: rankColor }]}>{rankLabel}</Text>
                        </View>
                     </View>
                  </View>
                  <View style={styles.userPageStats}>
                     <View style={styles.uStat}>
                        <Text style={[styles.uStatVal, { color: colors.text }]}>{metrics?.totalUnidades}</Text>
                        <Text style={[styles.uStatLabel, { color: colors.textTertiary }]}>Unidades</Text>
                     </View>
                     <View style={[styles.vSep, { backgroundColor: colors.border }]} />
                     <View style={styles.uStat}>
                        <Text style={[styles.uStatVal, { color: colors.text }]}>{metrics?.totalPartidas}</Text>
                        <Text style={[styles.uStatLabel, { color: colors.textTertiary }]}>Partidas</Text>
                     </View>
                     <View style={[styles.vSep, { backgroundColor: colors.border }]} />
                     <View style={styles.uStat}>
                        <Text style={[styles.uStatVal, { color: colors.text }]}>#{metrics?.rank || '-'}</Text>
                        <Text style={[styles.uStatLabel, { color: colors.textTertiary }]}>Rank</Text>
                     </View>
                  </View>
               </View>
            </View>

            {/* PAGE 2: DASHBOARD RING */}
            <View style={[styles.carouselPage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <View style={styles.statsPageContent}>
                  <View style={styles.statsLeft}>
                     <Text style={[styles.statsLabel, { color: colors.textTertiary }]}>PUNTAJE SEMANAL</Text>
                     <Text style={[styles.statsValue, { color: colors.text }]}>{metrics?.totalScore.toLocaleString()}</Text>
                     <Text style={[styles.statsSub, { color: colors.accent }]}>PROGRESO ACTUAL</Text>
                  </View>
                  <View style={styles.statsRight}>
                     <View style={styles.ringContainer}>
                        <ActivityRing size={90} strokeWidth={10} progress={70} color={colors.accent} backgroundColor={colors.border} />
                        <View style={styles.ringCenter}>
                           <Ionicons name="trending-up" size={20} color={colors.accent} />
                        </View>
                     </View>
                  </View>
               </View>
            </View>
          </ScrollView>

          {/* DOTS INDICATOR */}
          <View style={styles.dotsRow}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === activeIndex ? colors.accent : colors.border }]} />
            ))}
          </View>
        </View>

        {/* DISTRIBUTION GRAPH */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen por Área</Text>
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DistributionChart data={metrics?.detalle} colors={colors} />
          </View>
        </Animated.View>

        {/* WEEKLY TREND */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actividad Diaria</Text>
          <View style={[styles.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.barsContainer}>
              {[30, 50, 40, 70, 60, 45, 85].map((h, i) => (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: h, backgroundColor: i === 6 ? colors.accent : colors.accent + '25' }]} />
                  <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{['L','M','M','J','V','S','D'][i]}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Semana {metrics?.periodo.semana.split(' ')[1]} • Actualizado hoy
          </Text>
        </View>
      </ScrollView>

      {/* APPLE DOCK */}
      <View style={[styles.dockContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.dockShadow}>
          <BlurView 
            intensity={Platform.OS === 'ios' ? 95 : 100} 
            tint={colors.dark ? 'dark' : 'light'} 
            style={[styles.dockBase, { borderColor: colors.border, backgroundColor: colors.surface + 'F2' }]} 
          />
          <View style={styles.dockContent}>
            <TouchableOpacity style={styles.dockItem} onPress={() => router.push("/(main)/procesos/picking/traspasos")}>
              <View style={[styles.dockIconBox, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="swap-horizontal" size={24} color={colors.text} />
              </View>
              <Text style={[styles.dockLabel, { color: colors.text, fontWeight: '700' }]}>Traspasos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockItemMain} onPress={() => router.push("/(main)/procesos/picking/ventanilla")}>
              <LinearGradient colors={[colors.accent, colors.accent]} style={styles.dockMainButton}>
                <Ionicons name="flash" size={30} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.dockLabel, { color: colors.text, fontWeight: '900' }]}>Ventanilla</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockItem} onPress={() => router.push("/(main)/procesos/picking/pedidos")}>
              <View style={[styles.dockIconBox, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.text} />
              </View>
              <Text style={[styles.dockLabel, { color: colors.text, fontWeight: '700' }]}>Pedidos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8,
  },
  headerIconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 140 },
  
  // Carousel
  carouselContainer: { marginBottom: 24 },
  carouselPage: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 24, padding: 20, 
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 0,
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Page 1: User
  userPageContent: { gap: 20 },
  userPageTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2 },
  userPageInfo: { flex: 1 },
  userPageName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  userPageId: { fontSize: 13, marginTop: 2 },
  rankTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  rankTagText: { fontSize: 10, fontWeight: '800' },
  userPageStats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  uStat: { alignItems: 'center' },
  uStatVal: { fontSize: 18, fontWeight: '700' },
  uStatLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  vSep: { width: StyleSheet.hairlineWidth, height: 25, alignSelf: 'center' },

  // Page 2: Stats
  statsPageContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsLeft: { flex: 1 },
  statsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  statsValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statsSub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  statsRight: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  ringContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  ringCenter: { position: 'absolute' },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginBottom: 12, marginLeft: 4 },
  contentCard: { borderRadius: 20, padding: 20, borderWidth: StyleSheet.hairlineWidth },
  chartContainer: { gap: 14 },
  chartRow: { gap: 6 },
  chartLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chartBarLabel: { fontSize: 13, fontWeight: '500' },
  chartBarValue: { fontSize: 13, fontWeight: '700' },
  chartBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  chartBarFill: { height: '100%', borderRadius: 4 },

  trendCard: { borderRadius: 24, padding: 20, borderWidth: StyleSheet.hairlineWidth },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barWrap: { alignItems: 'center', gap: 6 },
  bar: { width: 22, borderRadius: 5 },
  barLabel: { fontSize: 10, fontWeight: '600' },

  footer: { alignItems: 'center', marginBottom: 20 },
  footerText: { fontSize: 11, fontWeight: '500' },

  // Dock
  dockContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, zIndex: 1000 },
  dockShadow: { height: 80, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dockBase: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  dockContent: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 10 },
  dockItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  dockIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dockItemMain: { alignItems: 'center', justifyContent: 'center', flex: 1.2, marginTop: -32 },
  dockMainButton: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, marginBottom: 6, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  dockLabel: { fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
});
