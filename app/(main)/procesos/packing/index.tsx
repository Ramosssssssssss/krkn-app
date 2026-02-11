import { SkeletonCardList } from "@/components/Skeleton";
import { API_URL } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ==================== TIPOS ====================
interface OrdenPacking {
  R_DOCTO_ID: number;
  R_FOLIO: string;
  R_ALMACEN: string;
  R_DESCRIPCION: string;
  R_FECHA: string;
  R_HORA: string;
  R_SISTEMA: string; // 'PEDIDO', 'TRASPASO', etc.
}

export default function PackingScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordenes, setOrdenes] = useState<OrdenPacking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  const limpiarFolio = (folio: string) => {
    if (!folio) return "";
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/);
    return match ? `${match[1]}${match[2]}` : folio;
  };

  const fetchOrdenes = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${API_URL}/api/ordenes-packing.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.ordenes)) {
        // Ordenar por fecha/hora descendente (más recientes primero)
        const sorted = data.ordenes.sort((a: OrdenPacking, b: OrdenPacking) => {
          const dateA = `${a.R_FECHA} ${a.R_HORA}`;
          const dateB = `${b.R_FECHA} ${b.R_HORA}`;
          return dateB.localeCompare(dateA);
        });
        setOrdenes(sorted);
      } else {
        setOrdenes([]);
      }
    } catch (e) {
      console.error("Error fetching ordenes packing:", e);
      setOrdenes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdenes();
  };

  const handleSelectOrden = (orden: OrdenPacking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: "/(main)/procesos/packing/detalle-orden",
      params: {
        folio: limpiarFolio(orden.R_FOLIO),
        doctoId: String(orden.R_DOCTO_ID),
        almacen: orden.R_ALMACEN,
        sistema: orden.R_SISTEMA,
        descripcion: orden.R_DESCRIPCION,
      },
    });
  };

  const filtered = ordenes.filter(
    (o) =>
      (o.R_FOLIO || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.R_DESCRIPCION || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (o.R_ALMACEN || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Color según tipo de sistema
  const getSistemaColor = (sistema: string) => {
    switch (sistema?.toUpperCase()) {
      case "PEDIDO":
        return "#3B82F6"; // Azul
      case "TRASPASO":
        return "#8B5CF6"; // Morado
      default:
        return "#10B981"; // Verde
    }
  };

  const getSistemaIcon = (sistema: string): keyof typeof Ionicons.glyphMap => {
    switch (sistema?.toUpperCase()) {
      case "PEDIDO":
        return "cart-outline";
      case "TRASPASO":
        return "swap-horizontal-outline";
      default:
        return "cube-outline";
    }
  };

  const renderOrden = ({ item }: { item: OrdenPacking }) => {
    const sistemaColor = getSistemaColor(item.R_SISTEMA);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectOrden(item)}
        disabled={loading}
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          },
        ]}
      >
        {/* Sistema Badge + Folio */}
        <View style={styles.orderHeader}>
          <View
            style={[
              styles.sistemaPill,
              { backgroundColor: `${sistemaColor}15` },
            ]}
          >
            <Ionicons
              name={getSistemaIcon(item.R_SISTEMA)}
              size={12}
              color={sistemaColor}
            />
            <Text style={[styles.sistemaPillText, { color: sistemaColor }]}>
              {item.R_SISTEMA}
            </Text>
          </View>
          <View style={styles.orderFolioRow}>
            <Text style={[styles.orderFolio, { color: colors.text }]}>
              {limpiarFolio(item.R_FOLIO)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </View>
        </View>

        {/* Descripción */}
        <Text
          style={[styles.orderDesc, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.R_DESCRIPCION || "Sin descripción"}
        </Text>

        {/* Meta pills */}
        <View style={styles.orderMeta}>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="location" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.R_ALMACEN}
            </Text>
          </View>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="calendar" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.R_FECHA}
            </Text>
          </View>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="time" size={11} color={colors.textTertiary} />
            <Text
              style={[styles.metaPillText, { color: colors.textSecondary }]}
            >
              {item.R_HORA}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.dark ? "light-content" : "dark-content"} />

      <FlatList
        data={filtered}
        renderItem={renderOrden}
        keyExtractor={(item) => `${item.R_SISTEMA}-${item.R_DOCTO_ID}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 10 },
        ]}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            {/* iOS-style Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[
                  styles.headerBackBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Packing
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {ordenes.length} órdenes pendientes
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                placeholder="Buscar folio, almacén o descripción"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonCardList count={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={40}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Sin órdenes
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                No hay órdenes pendientes de packing
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
      />

      {/* iOS Alert */}
      <Modal visible={alert.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <BlurView
            intensity={80}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.alertIconWrap,
                {
                  backgroundColor: isDark
                    ? "rgba(251,191,36,0.12)"
                    : "rgba(251,191,36,0.08)",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={28} color="#F59E0B" />
            </View>
            <Text style={[styles.alertTitle, { color: colors.text }]}>
              Atención
            </Text>
            <Text
              style={[styles.alertMessage, { color: colors.textSecondary }]}
            >
              {alert.message}
            </Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: colors.accent }]}
              onPress={() => setAlert({ visible: false, message: "" })}
              activeOpacity={0.8}
            >
              <Text style={styles.alertBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── List ────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // ─── Header ──────────────────────────────────────────────────────────
  pageHeader: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitles: { flex: 1, marginLeft: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  // ─── Search ──────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  // ─── Order Card (iOS Style) ──────────────────────────────────────────
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    marginBottom: 10,
  },
  sistemaPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  sistemaPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  orderFolioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderFolio: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  orderDesc: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
    marginBottom: 12,
  },
  orderMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: "45%",
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },

  // ─── Empty State ─────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // ─── Loading ─────────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1000,
  },

  // ─── iOS Alert ───────────────────────────────────────────────────────
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  alertCard: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  alertBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
