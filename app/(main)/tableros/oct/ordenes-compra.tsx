import { SkeletonOCTList } from "@/components/Skeleton";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { apiRequest } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OrdenCompra {
  FOLIO_FORMATEADO: string;
  FECHA_ENTREGA: string;
  PROVEEDOR: string;
  DOCTO_CM_ID: number;
  NUMERO_ARTICULOS: number;
}

interface Estadisticas {
  total: number;
  pendientes: number;
  enProceso: number;
  completadas: number;
}

export default function OrdenesCompraTablero() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { selectedDatabase } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenCompra[]>([]);
  const [stats, setStats] = useState<Estadisticas | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const month = months[date.getMonth()];
      return `${day} ${month}`;
    } catch (e) {
      return "--";
    }
  };

  const fetchData = async () => {
    try {
      setError(null);
      const response = await apiRequest<any>("/api/tableros-ordenes-compra.php");
      if (response.success) {
        const data = response.data?.ordenes || [];
        setOrdenes(data);
        setFilteredOrdenes(data);
        setStats(response.data?.estadisticas || null);
      } else {
        setError(response.message || "Error al obtener datos");
      }
    } catch (err: any) {
      console.error("Error fetching OC data:", err);
      setError(err?.message || "Error de conexión con el servidor");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const filtered = ordenes.filter((o) =>
      o.FOLIO_FORMATEADO.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.PROVEEDOR.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredOrdenes(filtered);
  }, [searchQuery, ordenes]);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // No habilitamos el loader central si es refresh para no romper el feeling
  const showSkeletons = loading && !refreshing;

  // Referencias para controlar que solo una orden esté abierta a la vez
  const swipeableRefs = React.useRef<{ [key: string]: Swipeable | null }>({});

  const closeOthers = (currentId: string) => {
    Object.keys(swipeableRefs.current).forEach((id) => {
      if (id !== currentId && swipeableRefs.current[id]) {
        swipeableRefs.current[id]?.close();
      }
    });
  };

  return (
    <View style={[s.main, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Custom Header */}
      <View style={s.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backButton, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Órdenes Pendientes</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 20 }]}
        stickyHeaderIndices={[2]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Apple Style Widgets */}
        <View style={s.widgetsGrid}>
          <View style={[s.widget, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow }]}>
            <View style={[s.widgetIcon, { backgroundColor: colors.accent + "15" }]}>
              <Ionicons name="documents" size={20} color={colors.accent} />
            </View>
            <View>
              <Text style={[s.widgetValue, { color: colors.text }]}>{stats?.total || 0}</Text>
              <Text style={[s.widgetLabel, { color: colors.textTertiary }]}>Órdenes</Text>
            </View>
          </View>

          <View style={[s.widget, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow }]}>
            <View style={[s.widgetIcon, { backgroundColor: "#FF950015" }]}>
              <Ionicons name="time" size={20} color="#FF9500" />
            </View>
            <View>
              <Text style={[s.widgetValue, { color: "#FF9500" }]}>{stats?.pendientes || 0}</Text>
              <Text style={[s.widgetLabel, { color: colors.textTertiary }]}>Pendientes</Text>
            </View>
          </View>
        </View>

        {/* Section Description */}
        <Text style={[s.sectionSubtitle, { color: colors.textTertiary, paddingHorizontal: 4, marginBottom: 16 }]}>
          Escanea el código QR de la carátula para iniciar el proceso de recibo.
        </Text>

        {/* Search Bar Widget */}
        <View style={[s.searchContainer, { backgroundColor: colors.background }]}>
          <View style={[s.searchInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Buscar por folio o proveedor..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Orders List */}
        {error ? (
          <View style={s.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={[s.emptyText, { color: "#FF3B30", textAlign: "center" }]}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.accent, fontWeight: "700" }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : showSkeletons ? (
          <View style={{ marginTop: 20 }}>
            <SkeletonOCTList count={3} />
          </View>
        ) : filteredOrdenes.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? "No se encontraron resultados" : "No hay órdenes pendientes"}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            {filteredOrdenes.map((item, idx) => {
              const itemKey = `${item.DOCTO_CM_ID}-${idx}`;
              const renderRightActions = () => (
                <View style={[s.swipeActionContainer]}>
                  <TouchableOpacity
                    style={[s.swipeBtn, { backgroundColor: colors.accent }]}
                    onPress={() => router.push({ pathname: "/(main)/procesos/recibo", params: { folio: item.FOLIO_FORMATEADO } })}
                  >
                    <Ionicons name="barcode" size={22} color="#FFF" />
                    <Text style={s.swipeBtnText}>Recibir</Text>
                  </TouchableOpacity>
                </View>
              );

              return (
                <Swipeable
                  key={itemKey}
                  ref={(ref) => {
                    swipeableRefs.current[itemKey] = ref;
                  }}
                  onSwipeableWillOpen={() => closeOthers(itemKey)}
                  renderRightActions={renderRightActions}
                  containerStyle={s.swipeableWrapper}
                >
                  <TouchableOpacity
                    style={[
                      s.orderCard,
                      { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: "/(main)/tableros/oct/detalle", params: { folio: item.FOLIO_FORMATEADO } })}
                  >
                    <View style={s.cardBody}>
                      {/* Info Section */}
                      <View style={s.infoSide}>
                        <View style={[s.folioBadge, { backgroundColor: colors.accent + "12" }]}>
                          <Text style={[s.folioText, { color: colors.accent }]}>{item.FOLIO_FORMATEADO}</Text>
                        </View>

                        <Text style={[s.providerName, { color: colors.text }]} numberOfLines={1}>
                          {item.PROVEEDOR}
                        </Text>

                        <View style={s.metaContainer}>
                          <View style={s.metaItem}>
                            <Ionicons name="calendar-clear-outline" size={12} color={colors.textTertiary} />
                            <Text style={[s.metaText, { color: colors.textSecondary }]}>{formatDate(item.FECHA_ENTREGA)}</Text>
                          </View>
                          <View style={s.metaItem}>
                            <Ionicons name="layers-outline" size={12} color={colors.textTertiary} />
                            <Text style={[s.metaText, { color: colors.textSecondary }]}>{item.NUMERO_ARTICULOS} arts.</Text>
                          </View>
                        </View>
                      </View>

                      {/* QR Section - Compact Apple Style */}
                      <View style={s.qrSide}>
                        <View
                          style={[
                            s.qrWrapper,
                            {
                              backgroundColor: "#FFF",
                              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                            },
                          ]}
                        >
                          <Image
                            source={{
                              uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.FOLIO_FORMATEADO}`,
                            }}
                            style={s.qrImage}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={[s.cardFooter, { borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                      <Text style={[s.footerText, { color: colors.textTertiary }]}>Desliza para recibir</Text>
                      <View style={{ flex: 1 }} />
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  main: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Custom Header
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  // iOS Widgets
  widgetsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  widget: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  widgetIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  widgetValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  widgetLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },

  // Search Bar
  searchContainer: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },

  sectionSubtitle: { fontSize: 13, fontWeight: "500" },

  // iOS Style Order Card
  orderCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "transparent",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  swipeableWrapper: { marginBottom: 14 },
  cardBody: {
    flexDirection: "row",
    gap: 16,
  },
  infoSide: {
    flex: 1,
  },
  folioBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  folioText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  providerName: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  qrSide: {
    justifyContent: "center",
  },
  qrWrapper: {
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 14,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Swipe Actions
  swipeActionContainer: {
    width: 100,
    flexDirection: "row",
    marginLeft: 12,
  },
  swipeBtn: {
    flex: 1,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  swipeBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },

  emptyState: { alignItems: "center", marginTop: 80, gap: 16 },
  emptyText: { fontSize: 16, fontWeight: "600" },
});
