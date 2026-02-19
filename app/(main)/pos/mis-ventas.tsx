import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Venta {
  ID: string;
  FOLIO: string;
  CLIENTE: string;
  TOTAL: number;
  ITEMS_COUNT: number;
  PIEZAS_COUNT: number;
  FECHA: string;
  METODO: "efectivo" | "tarjeta" | "transferencia";
  ESTADO: "completada" | "cancelada" | "pendiente";
  AHORRO?: number;
}

const fmt = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_VENTAS: Venta[] = [
  { ID: '1', FOLIO: 'V-2024-001', CLIENTE: 'JUAN PEREZ GARCIA', TOTAL: 1250.50, ITEMS_COUNT: 3, PIEZAS_COUNT: 4, FECHA: '2026-02-13 10:15', METODO: 'efectivo', ESTADO: 'completada' },
  { ID: '2', FOLIO: 'V-2024-002', CLIENTE: 'CLIENTE GENERAL', TOTAL: 450.00, ITEMS_COUNT: 1, PIEZAS_COUNT: 1, FECHA: '2026-02-13 11:20', METODO: 'tarjeta', ESTADO: 'completada' },
  { ID: '3', FOLIO: 'V-2024-003', CLIENTE: 'ABARROTES EL PASO', TOTAL: 8420.00, ITEMS_COUNT: 12, PIEZAS_COUNT: 24, FECHA: '2026-02-13 12:05', METODO: 'transferencia', ESTADO: 'completada', AHORRO: 420 },
  { ID: '4', FOLIO: 'V-2024-004', CLIENTE: 'MARIA LOPEZ', TOTAL: 320.00, ITEMS_COUNT: 2, PIEZAS_COUNT: 2, FECHA: '2026-02-13 12:45', METODO: 'efectivo', ESTADO: 'completada' },
  { ID: '5', FOLIO: 'V-2024-005', CLIENTE: 'CONSTRUCTORA ALPHA', TOTAL: 15700.00, ITEMS_COUNT: 8, PIEZAS_COUNT: 100, FECHA: '2026-02-13 09:30', METODO: 'transferencia', ESTADO: 'completada' },
];

export default function MisVentasScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>(MOCK_VENTAS);
  const [filter, setFilter] = useState<'hoy' | 'semana' | 'mes'>('hoy');
  const [search, setSearch] = useState("");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = {
    total: ventas.reduce((acc, v) => acc + v.TOTAL, 0),
    count: ventas.length,
    pzas: ventas.reduce((acc, v) => acc + v.PIEZAS_COUNT, 0),
  };

  const filteredVentas = ventas.filter(v => 
    v.FOLIO.toLowerCase().includes(search.toLowerCase()) || 
    v.CLIENTE.toLowerCase().includes(search.toLowerCase())
  );

  const glassBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.85)";
  const glassBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const subtleText = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";

  const renderVenta = ({ item, index }: { item: Venta; index: number }) => {
    const iconName = item.METODO === 'efectivo' ? 'cash' : item.METODO === 'tarjeta' ? 'card' : 'swap-horizontal';
    const methodColor = item.METODO === 'efectivo' ? '#34C759' : item.METODO === 'tarjeta' ? '#5856D6' : '#007AFF';

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 40).duration(400)}
        layout={Layout.springify()}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          style={[st.card, { backgroundColor: cardBg, borderColor: glassBorder }]}
        >
          <View style={st.cardLeft}>
            <View style={[st.methodIcon, { backgroundColor: methodColor + '12' }]}>
              <Ionicons name={iconName} size={20} color={methodColor} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={st.row}>
                <Text style={[st.cardFolio, { color: colors.primary }]}>{item.FOLIO}</Text>
                <Text style={[st.cardTime, { color: subtleText }]}>{item.FECHA.split(' ')[1]}</Text>
              </View>
              <Text style={[st.cardClient, { color: colors.text }]} numberOfLines={1}>
                {item.CLIENTE}
              </Text>
              <View style={st.cardMeta}>
                <Text style={[st.metaTxt, { color: subtleText }]}>
                  {item.ITEMS_COUNT} {item.ITEMS_COUNT === 1 ? 'art' : 'arts'} · {item.PIEZAS_COUNT} pzas
                </Text>
                {item.AHORRO && item.AHORRO > 0 && (
                  <View style={st.saveBadge}>
                    <Text style={st.saveTxt}>-${Math.round(item.AHORRO)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={st.cardRight}>
            <Text style={[st.cardTotal, { color: colors.text }]}>{fmt(item.TOTAL)}</Text>
            <View style={[st.statusPill, { backgroundColor: '#34C75914' }]}>
              <Text style={[st.statusTxt, { color: '#34C759' }]}>Completada</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <BlurView intensity={isDark ? 60 : 80} tint={isDark ? "dark" : "light"} style={[st.headerBlur, { paddingTop: insets.top }]}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.headerTitle, { color: colors.text }]}>Mis Ventas</Text>
            <Text style={[st.headerSub, { color: subtleText }]}>Terminal: CAJA-01 · {sessionStorage.getItem('pos_cajero') || 'Cajero'}</Text>
          </View>
          <TouchableOpacity style={[st.filterBtn, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={st.searchWrap}>
          <View style={[st.searchBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="search" size={16} color={subtleText} />
            <TextInput 
              placeholder="Buscar por folio o cliente..."
              placeholderTextColor={subtleText}
              style={[st.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Segmented Filter */}
        <View style={st.segmented}>
          {(['hoy', 'semana', 'mes'] as const).map((opt) => (
            <TouchableOpacity 
              key={opt}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(opt);
              }}
              style={[
                st.segBtn,
                filter === opt && { backgroundColor: isDark ? "#fff" : colors.primary }
              ]}
            >
              <Text style={[
                st.segTxt, 
                { color: filter === opt ? (isDark ? "#000" : "#fff") : subtleText }
              ]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>

      <FlatList
        data={filteredVentas}
        keyExtractor={item => item.ID}
        renderItem={renderVenta}
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingTop: 180, // Offset for sticky header
          paddingBottom: insets.bottom + 100 
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(600)} style={st.statsGrid}>
            <LinearGradient 
              colors={['#6366F1', '#4F46E5']} 
              start={{ x:0, y:0 }} 
              end={{ x:1, y:1 }}
              style={st.statMain}
            >
              <View>
                <Text style={st.statMainLabel}>Ventas Hoy</Text>
                <Text style={st.statMainValue}>{fmt(stats.total)}</Text>
              </View>
              <View style={st.statMainIcon}>
                <Ionicons name="trending-up" size={32} color="#fff" />
              </View>
            </LinearGradient>

            <View style={st.statRow}>
              <View style={[st.statSmall, { backgroundColor: cardBg, borderColor: glassBorder }]}>
                <Text style={[st.statSmallLabel, { color: subtleText }]}>Tickets</Text>
                <Text style={[st.statSmallValue, { color: colors.text }]}>{stats.count}</Text>
              </View>
              <View style={[st.statSmall, { backgroundColor: cardBg, borderColor: glassBorder }]}>
                <Text style={[st.statSmallLabel, { color: subtleText }]}>Promedio</Text>
                <Text style={[st.statSmallValue, { color: colors.text }]}>{fmt(stats.total / (stats.count || 1))}</Text>
              </View>
            </View>
          </Animated.View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="receipt-outline" size={64} color={subtleText} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>No hay ventas</Text>
            <Text style={[st.emptyDesc, { color: subtleText }]}>Realiza una venta para verla aquí</Text>
          </View>
        }
      />

      {/* ── Footer Action ────────────────────────────────────────────────────── */}
      <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[st.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={[st.corteBtn, { backgroundColor: colors.text }]}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Action for Corte de Caja
          }}
        >
          <Ionicons name="lock-closed" size={18} color={isDark ? "#000" : "#fff"} />
          <Text style={[st.corteTxt, { color: isDark ? "#000" : "#fff" }]}>Corte de Caja (Z-Report)</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  segTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  
  /* Stats */
  statsGrid: {
    marginBottom: 20,
    gap: 12,
  },
  statMain: {
    padding: 24,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statMainLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statMainValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  statMainIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statSmall: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statSmallLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSmallValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },

  /* Cards */
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFolio: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardClient: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaTxt: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveBadge: {
    backgroundColor: '#FF950014',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveTxt: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  corteBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  corteTxt: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  }
});
