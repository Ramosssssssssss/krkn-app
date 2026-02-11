import { Bone } from "@/components/Skeleton";
import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NuevaPrecioModal } from "./components";

interface PrecioEmpresa {
  nombre: string;
}

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_SIZE = (width - 32 - GRID_GAP) / 2;

// Card configs — each price list card gets a unique look
const CARD_THEMES = [
  { bg: "#0D9488", icon: "pricetag" as const, label: "Lista" },
  { bg: "#3B82F6", icon: "cash-outline" as const, label: "Lista" },
  { bg: "#8B5CF6", icon: "wallet-outline" as const, label: "Lista" },
  { bg: "#EF4444", icon: "trending-up-outline" as const, label: "Lista" },
  { bg: "#F59E0B", icon: "card-outline" as const, label: "Lista" },
  { bg: "#EC4899", icon: "stats-chart-outline" as const, label: "Lista" },
  { bg: "#10B981", icon: "receipt-outline" as const, label: "Lista" },
  { bg: "#06B6D4", icon: "pricetag-outline" as const, label: "Lista" },
];

export default function PreciosScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedDatabase } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [precios, setPrecios] = useState<PrecioEmpresa[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadPrecios();
  }, [selectedDatabase]);

  const loadPrecios = async () => {
    if (!selectedDatabase) return;
    setLoading(true);
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRECIOS_EMPRESA}?empresa_id=${selectedDatabase.id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.data?.precios) {
        setPrecios(data.data.precios);
      } else {
        setPrecios([]);
      }
    } catch {
      setPrecios([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrecios = precios.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadPrecios();
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase]);

  const handleNewList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  const getTheme = (index: number) => CARD_THEMES[index % CARD_THEMES.length];

  /* ─── Skeleton Grid ─── */
  const renderSkeleton = () => (
    <View style={s.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.card, { backgroundColor: colors.surface }]}>
          <Bone width={40} height={40} radius={12} />
          <Bone width={CARD_SIZE * 0.65} height={12} radius={4} />
          <Bone width={CARD_SIZE * 0.45} height={10} radius={3} />
        </View>
      ))}
    </View>
  );

  /* ─── Empty State ─── */
  const renderEmpty = () => (
    <View style={s.empty}>
      <View style={[s.emptyCircle, { backgroundColor: colors.surface }]}>
        <Ionicons
          name="pricetag-outline"
          size={32}
          color={colors.textTertiary}
        />
      </View>
      <Text style={[s.emptyTitle, { color: colors.text }]}>
        Sin listas de precios
      </Text>
      <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
        No se encontraron listas de precios para esta empresa
      </Text>
    </View>
  );

  /* ─── Card Grid ─── */
  const renderGrid = () => (
    <View style={s.grid}>
      {filteredPrecios.map((item, index) => {
        const theme = getTheme(index);
        return (
          <TouchableOpacity
            key={`${item.nombre}-${index}`}
            style={[s.card, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={() => Haptics.selectionAsync()}
          >
            <View style={[s.cardIcon, { backgroundColor: `${theme.bg}18` }]}>
              <Ionicons name={theme.icon} size={20} color={theme.bg} />
            </View>
            <Text
              style={[s.cardName, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.nombre}
            </Text>
            <View style={s.cardFooter}>
              <Text style={[s.cardLabel, { color: theme.bg }]}>
                {theme.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textTertiary}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={[s.backText, { color: colors.accent }]}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons
            name="refresh-outline"
            size={22}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[s.title, { color: colors.text }]}>Listas de Precios</Text>

      {/* Count badge */}
      {!loading && precios.length > 0 && (
        <Text style={[s.countBadge, { color: colors.textTertiary }]}>
          {filteredPrecios.length}{" "}
          {filteredPrecios.length === 1 ? "lista" : "listas"}
          {searchQuery ? ` encontradas` : ""}
        </Text>
      )}

      {/* Search Bar */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Buscar lista..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          !loading && filteredPrecios.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {loading
          ? renderSkeleton()
          : filteredPrecios.length === 0
            ? renderEmpty()
            : renderGrid()}
      </ScrollView>

      {/* FAB — New List */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.accent }]}
          onPress={handleNewList}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabText}>Nueva Lista de Precios</Text>
        </TouchableOpacity>
      </View>

      {/* Create Modal */}
      <NuevaPrecioModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(data) => {
          console.log("New price list:", data);
          setShowCreateModal(false);
          loadPrecios();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: { fontSize: 17 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    letterSpacing: -0.5,
  },
  countBadge: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 15 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  // ─── Grid ───
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 18,
    padding: 16,
    justifyContent: "space-between",
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // ─── Empty ───
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  // ─── Footer ───
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  fab: {
    flexDirection: "row",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
