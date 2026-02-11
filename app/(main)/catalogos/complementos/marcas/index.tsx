import { Bone } from "@/components/Skeleton";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MarcaDetailModal, NuevaMarcaModal } from "./components";
import { MARCAS_DATA, PRODUCTOS_EJEMPLO } from "./data";
import { Marca, NuevaMarcaData } from "./types";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_SIZE = (width - 32 - GRID_GAP) / 2;

// Color basado en el nombre
const getAvatarColor = (nombre: string) => {
  const colorsArr = [
    "#9D4EDD",
    "#7C3AED",
    "#6366F1",
    "#3B82F6",
    "#0EA5E9",
    "#14B8A6",
  ];
  const index = nombre.charCodeAt(0) % colorsArr.length;
  return colorsArr[index];
};

const getInitials = (nombre: string) => nombre.substring(0, 2).toUpperCase();

export default function MarcasScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const { activas } = useMemo(() => {
    const filtered = MARCAS_DATA.filter(
      (m) =>
        m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.categorias.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return {
      activas: filtered.filter((m) => m.activa),
      archivadas: filtered.filter((m) => !m.activa),
    };
  }, [searchQuery]);

  const openMarcaDetail = (marca: Marca) => {
    Haptics.selectionAsync();
    setSelectedMarca(marca);
    setShowDetailModal(true);
  };

  const handleSaveNewMarca = (marcaData: NuevaMarcaData) => {
    console.log("Nueva marca:", marcaData);
  };

  const handleEditMarca = (marca: Marca) => {
    console.log("Editar marca:", marca);
  };

  const handleAddProduct = () => {
    console.log("Agregar producto a marca:", selectedMarca?.nombre);
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 800);
  };

  /* ─── Skeleton ─── */
  const renderSkeleton = () => (
    <View style={s.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.card, { backgroundColor: colors.surface }]}>
          <Bone width={44} height={44} radius={12} />
          <Bone width={CARD_SIZE * 0.65} height={12} radius={4} />
          <Bone width={CARD_SIZE * 0.4} height={10} radius={3} />
        </View>
      ))}
    </View>
  );

  /* ─── Empty ─── */
  const renderEmpty = () => (
    <View style={s.empty}>
      <View style={[s.emptyCircle, { backgroundColor: colors.surface }]}>
        <Ionicons
          name="bookmark-outline"
          size={32}
          color={colors.textTertiary}
        />
      </View>
      <Text style={[s.emptyTitle, { color: colors.text }]}>Sin marcas</Text>
      <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
        No se encontraron marcas con ese criterio
      </Text>
    </View>
  );

  /* ─── Grid ─── */
  const renderGrid = () => (
    <View style={s.grid}>
      {activas.map((item) => {
        const avatarColor = getAvatarColor(item.nombre);
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.card, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={() => openMarcaDetail(item)}
          >
            <View
              style={[s.cardAvatar, { backgroundColor: `${avatarColor}20` }]}
            >
              {item.logo ? (
                <Image source={{ uri: item.logo }} style={s.cardLogo} />
              ) : (
                <Text style={[s.cardInitials, { color: avatarColor }]}>
                  {getInitials(item.nombre)}
                </Text>
              )}
            </View>
            <Text
              style={[s.cardName, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.nombre}
            </Text>
            <View style={s.cardFooter}>
              <Text style={[s.cardLabel, { color: avatarColor }]}>
                {item.skus} SKUs
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
      <Text style={[s.title, { color: colors.text }]}>Marcas</Text>

      {/* Count */}
      {!loading && (
        <Text style={[s.countBadge, { color: colors.textTertiary }]}>
          {activas.length} {activas.length === 1 ? "marca" : "marcas"}
          {searchQuery ? " encontradas" : ""}
        </Text>
      )}

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Buscar marcas..."
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
          !loading && activas.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {loading && !refreshing
          ? renderSkeleton()
          : activas.length === 0
            ? renderEmpty()
            : renderGrid()}
      </ScrollView>

      {/* FAB */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.accent }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.fabText}>Nueva Marca</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <NuevaMarcaModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveNewMarca}
      />
      <MarcaDetailModal
        visible={showDetailModal}
        marca={selectedMarca}
        productos={PRODUCTOS_EJEMPLO}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEditMarca}
        onAddProduct={handleAddProduct}
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
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  cardInitials: {
    fontSize: 16,
    fontWeight: "700",
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
