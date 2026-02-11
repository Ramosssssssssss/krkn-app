import { Bone } from "@/components/Skeleton";
import { useThemeColors } from "@/context/theme-context";
import {
    createLineaArticulo,
    getLineasArticulos,
    LineaArticulo,
} from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
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

import NuevaLineaModal from "./components/NuevaLineaModal";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_SIZE = (width - 32 - GRID_GAP) / 2;

const CARD_THEMES = [
  { bg: "#3B82F6", icon: "list" as const },
  { bg: "#8B5CF6", icon: "git-merge-outline" as const },
  { bg: "#0D9488", icon: "layers-outline" as const },
  { bg: "#EF4444", icon: "grid-outline" as const },
  { bg: "#F59E0B", icon: "albums-outline" as const },
  { bg: "#EC4899", icon: "cube-outline" as const },
  { bg: "#10B981", icon: "film-outline" as const },
  { bg: "#06B6D4", icon: "server-outline" as const },
];

export default function LineasScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [lineas, setLineas] = useState<LineaArticulo[]>([]);
  const [filteredLineas, setFilteredLineas] = useState<LineaArticulo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLineas(lineas);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLineas(
        lineas.filter((l) => l.nombre.toLowerCase().includes(query)),
      );
    }
  }, [searchQuery, lineas]);

  const loadData = async () => {
    try {
      if (!refreshing) setIsLoading(true);
      const data = await getLineasArticulos("");
      setLineas(data);
      setFilteredLineas(data);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las líneas");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  const handleSaveLinea = async (data: any) => {
    try {
      if (!data.nombre || !data.grupoId) {
        Alert.alert("Error", "Faltan datos requeridos");
        return;
      }
      const grupoIdInt = parseInt(data.grupoId, 10);
      if (isNaN(grupoIdInt)) {
        Alert.alert("Error", "ID de grupo inválido");
        return;
      }
      const result = await createLineaArticulo(data.nombre, grupoIdInt);
      if (result.success) {
        Alert.alert("Éxito", "Línea creada correctamente");
        setShowCreateModal(false);
        loadData();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear la línea");
    }
  };

  const getTheme = (index: number) => CARD_THEMES[index % CARD_THEMES.length];

  /* ─── Skeleton Grid ─── */
  const renderSkeleton = () => (
    <View style={s.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.card, { backgroundColor: colors.surface }]}>
          <Bone width={40} height={40} radius={12} />
          <Bone width={CARD_SIZE * 0.65} height={12} radius={4} />
          <Bone width={CARD_SIZE * 0.4} height={10} radius={3} />
        </View>
      ))}
    </View>
  );

  /* ─── Empty State ─── */
  const renderEmpty = () => (
    <View style={s.empty}>
      <View style={[s.emptyCircle, { backgroundColor: colors.surface }]}>
        <Ionicons name="list-outline" size={32} color={colors.textTertiary} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.text }]}>Sin líneas</Text>
      <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
        No se encontraron líneas de artículos
      </Text>
    </View>
  );

  /* ─── Card Grid ─── */
  const renderGrid = () => (
    <View style={s.grid}>
      {filteredLineas.map((item, index) => {
        const theme = getTheme(index);
        return (
          <TouchableOpacity
            key={item.id.toString()}
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
                ID {item.id}
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
      <Text style={[s.title, { color: colors.text }]}>Líneas de Artículos</Text>

      {/* Count */}
      {!isLoading && lineas.length > 0 && (
        <Text style={[s.countBadge, { color: colors.textTertiary }]}>
          {filteredLineas.length}{" "}
          {filteredLineas.length === 1 ? "línea" : "líneas"}
          {searchQuery ? " encontradas" : ""}
        </Text>
      )}

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Buscar líneas..."
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
          !isLoading && filteredLineas.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {isLoading && !refreshing
          ? renderSkeleton()
          : filteredLineas.length === 0
            ? renderEmpty()
            : renderGrid()}
      </ScrollView>

      {/* FAB */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.accent }]}
          onPress={handleNewGroup}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabText}>Nueva Línea</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <NuevaLineaModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveLinea}
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
  backBtn: { padding: 4 },
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
