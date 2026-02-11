import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
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

// Color palette for price list icons
const ICON_COLORS = [
  "#0D9488", // teal
  "#3B82F6", // blue
  "#EF4444", // red
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#10B981", // emerald
  "#06B6D4", // cyan
];

const PRICE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "pricetag",
  "pricetag-outline",
  "cash-outline",
  "card-outline",
  "wallet-outline",
  "trending-up-outline",
  "stats-chart-outline",
  "receipt-outline",
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
    } catch (error) {
      console.error("Error loading precios:", error);
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
  }, [selectedDatabase]);

  const handleNewList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  const getIconColor = (index: number) => {
    return ICON_COLORS[index % ICON_COLORS.length];
  };

  const getIcon = (index: number): keyof typeof Ionicons.glyphMap => {
    return PRICE_ICONS[index % PRICE_ICONS.length];
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PrecioEmpresa;
    index: number;
  }) => {
    const isFirst = index === 0;
    const isLast = index === filteredPrecios.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          { backgroundColor: colors.surface },
          isFirst && styles.firstItem,
          isLast && styles.lastItem,
        ]}
        activeOpacity={0.6}
        onPress={() => {
          Haptics.selectionAsync();
          // Could navigate to price list detail
        }}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getIconColor(index) },
          ]}
        >
          <Ionicons name={getIcon(index)} size={18} color="#fff" />
        </View>

        <View style={styles.itemContent}>
          <Text
            style={[styles.listName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.nombre}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
        />

        {!isLast && (
          <View
            style={[styles.separator, { backgroundColor: colors.border }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetag-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Sin listas de precios
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        No se encontraron listas de precios en esta empresa
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Back */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>Atrás</Text>
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
      <Text style={[styles.title, { color: colors.text }]}>
        Listas de Precios
      </Text>

      {/* Search Bar */}
      <View
        style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}
      >
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
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

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando listas de precios...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPrecios}
          keyExtractor={(item, index) => `${item.nombre}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredPrecios.length === 0 && styles.emptyContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            filteredPrecios.length > 0
              ? () => (
                  <Text
                    style={[styles.footerNote, { color: colors.textTertiary }]}
                  >
                    Mostrando {filteredPrecios.length} de {precios.length}{" "}
                    listas
                  </Text>
                )
              : null
          }
        />
      )}

      {/* New List Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.newListBtn, { backgroundColor: colors.accent }]}
          onPress={handleNewList}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newListBtnText}>Nueva Lista de Precios</Text>
        </TouchableOpacity>
      </View>

      {/* Create Price List Modal */}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    fontSize: 17,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    marginBottom: 20,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 15 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    position: "relative",
  },
  firstItem: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastItem: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  separator: {
    position: "absolute",
    left: 68,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 16,
    fontWeight: "400",
    flexShrink: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  footerNote: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  newListBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  newListBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
