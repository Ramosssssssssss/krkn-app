import { SkeletonOCTDetailList } from "@/components/Skeleton";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { apiRequest } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ArticuloDetalle {
  CLAVE: string;
  DESCRIPCION: string;
  CANTIDAD: number;
  UNIDADES_YA_RECIBIDAS: number;
  UNIDAD: string;
  EXISTENCIA: number;
  PUNTO_REORDEN: number;
}

export default function DetalleOCTScreen() {
  const { folio } = useLocalSearchParams<{ folio: string }>();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ caratula: any; detalles: ArticuloDetalle[] } | null>(null);

  // Referencias para controlar que solo uno esté abierto a la vez
  const swipeableRefs = React.useRef<{ [key: string]: Swipeable | null }>({});

  const closeOthers = (currentKey: string) => {
    Object.keys(swipeableRefs.current).forEach((key) => {
      if (key !== currentKey && swipeableRefs.current[key]) {
        swipeableRefs.current[key]?.close();
      }
    });
  };

  const fetchDetalle = async () => {
    try {
      // Usamos la misma API que Recibo para consistencia total
      const response = (await apiRequest<any>(
        `/api/detalle-orden-compra.php?folioOC=${encodeURIComponent(folio)}`
      )) as any;
      if (response.success) {
        setData({
          caratula: response.caratula,
          detalles: response.detalles,
        });
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalle();
  }, [folio]);

  const renderArticulo = ({ item, index }: { item: ArticuloDetalle; index: number }) => {
    const isCrisis = item.EXISTENCIA <= item.PUNTO_REORDEN;
    const itemKey = `${item.CLAVE}-${index}`;

    const renderRightActions = () => (
      <View style={[s.swipeContainer, { backgroundColor: isCrisis ? "#FF3B3020" : "#34C75920" }]}>
        <View style={s.swipeAction}>
          <Text style={[s.swipeLabel, { color: colors.textTertiary }]}>Stock</Text>
          <Text style={[s.swipeValue, { color: isCrisis ? "#FF3B30" : "#34C759" }]}>{item.EXISTENCIA}</Text>
        </View>
        <View style={[s.swipeDivider, { backgroundColor: colors.border }]} />
        <View style={s.swipeAction}>
          <Text style={[s.swipeLabel, { color: colors.textTertiary }]}>Reorden</Text>
          <Text style={[s.swipeValue, { color: colors.text }]}>{item.PUNTO_REORDEN}</Text>
        </View>
      </View>
    );

    return (
      <Swipeable
        ref={(ref) => {
          swipeableRefs.current[itemKey] = ref;
        }}
        onSwipeableWillOpen={() => closeOthers(itemKey)}
        renderRightActions={renderRightActions}
        containerStyle={s.swipeableWrapper}
        friction={2}
      >
        <View style={[s.itemCard, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow }]}>
          <View style={s.itemHeader}>
            <View style={s.claveBadge}>
              <Text style={[s.itemClave, { color: colors.accent }]}>{item.CLAVE}</Text>
            </View>
            <View style={s.qtyWrapper}>
              <Text style={[s.itemQty, { color: colors.text }]}>{item.CANTIDAD}</Text>
              <Text style={[s.uMedLabel, { color: colors.textTertiary }]}>{item.UNIDAD}</Text>
            </View>
          </View>

          <Text style={[s.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.DESCRIPCION}
          </Text>

          <View style={s.cardFooterMeta}>
            {item.UNIDADES_YA_RECIBIDAS > 0 ? (
              <View style={s.receivedBadge}>
                <Ionicons name="checkmark-done" size={14} color="#34C759" />
                <Text style={s.receivedText}>RECIBIDO: {item.UNIDADES_YA_RECIBIDAS}</Text>
              </View>
            ) : (
              <View />
            )}

            <View style={s.dragHint}>
              <Text style={[s.dragText, { color: colors.textTertiary }]}>Stock</Text>
              <Ionicons name="chevron-back" size={10} color={colors.textTertiary} />
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={[s.main, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Dynamic Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backAction, { backgroundColor: colors.surface, shadowColor: isDark ? "#000" : colors.cardShadow }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {folio}
          </Text>
          <Text style={[s.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {data?.caratula?.PROVEEDOR || "Cargando proveedor..."}
          </Text>
        </View>
      </View>

      <FlatList
        data={data?.detalles}
        keyExtractor={(item, index) => `${item.CLAVE}-${index}`}
        renderItem={renderArticulo}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDetalle} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <>
            <View style={s.providerWidget}>
              <View style={s.widgetHeader}>
                <Text style={[s.widgetLabel, { color: colors.textTertiary }]}>PROVEEDOR</Text>
                <Ionicons name="business" size={14} color={colors.accent} />
              </View>
              <Text style={[s.providerTitle, { color: colors.text }]}>
                {data?.caratula?.PROVEEDOR || "Cargando..."}
              </Text>

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: colors.textSecondary }]}>{data?.caratula?.ALMACEN || "--"}</Text>
                  <Text style={[s.statLab, { color: colors.textTertiary }]}>Almacén</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: colors.textSecondary }]}>{data?.detalles?.length || 0}</Text>
                  <Text style={[s.statLab, { color: colors.textTertiary }]}>SKUs</Text>
                </View>
              </View>
            </View>

            <View style={s.infoListHeader}>
              <Text style={[s.listTitle, { color: colors.text }]}>Contenido de la Orden</Text>
              <View style={[s.titleDivider, { backgroundColor: colors.accent }]} />
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonOCTDetailList count={6} />
          ) : (
            <View style={s.emptyContainer}>
              <View style={[s.emptyIconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No se encontraron artículos</Text>
              <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                Ocurrió un error al obtener la información o la orden está vacía.
              </Text>
            </View>
          )
        }
      />

      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={[s.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <TouchableOpacity
          style={[s.mainButton, { backgroundColor: colors.accent, opacity: !data?.detalles?.length ? 0.6 : 1 }]}
          disabled={!data?.detalles?.length}
          onPress={() =>
            router.push({
              pathname: "/(main)/procesos/recibo",
              params: { folio: data?.caratula?.FOLIO || folio },
            })
          }
        >
          <Ionicons name="barcode" size={20} color="#FFF" />
          <Text style={s.buttonText}>INICIAR RECEPCIÓN</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const s = StyleSheet.create({
  main: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 16,
  },
  backAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8 },
  headerSubtitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: -2 },

  // New Provider Widget
  providerWidget: {
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    marginBottom: 10,
  },
  widgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  widgetLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  providerTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24, marginBottom: 18 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  statItem: { flex: 1 },
  statVal: { fontSize: 15, fontWeight: "800" },
  statLab: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 25, backgroundColor: "rgba(0,0,0,0.1)" },

  list: { paddingHorizontal: 16 },
  infoListHeader: { marginTop: 25, marginBottom: 15 },
  listTitle: { fontSize: 17, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  titleDivider: { width: 40, height: 3, borderRadius: 2, marginTop: 4 },

  itemCard: {
    padding: 18,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "center" },
  claveBadge: { backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  itemClave: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  qtyWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  itemQty: { fontSize: 18, fontWeight: "900" },
  uMedLabel: { fontSize: 10, fontWeight: "700", marginBottom: 2 },
  itemDesc: { fontSize: 14, fontWeight: "500", lineHeight: 20, marginBottom: 14 },

  cardFooterMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  receivedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#34C75915",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  receivedText: { fontSize: 10, fontWeight: "800", color: "#34C759" },

  dragHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  dragText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },

  swipeableWrapper: { marginBottom: 14 },
  swipeContainer: {
    width: 130,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  swipeAction: { flex: 1, alignItems: "center", justifyContent: "center" },
  swipeLabel: { fontSize: 9, fontWeight: "800", marginBottom: 4, textTransform: "uppercase" },
  swipeValue: { fontSize: 18, fontWeight: "900" },
  swipeDivider: { width: 1, height: 30, opacity: 0.2 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    overflow: "hidden",
    borderTopWidth: 0,
  },
  mainButton: {
    height: 60,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1 },

  emptyContainer: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  emptyDesc: { fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20, color: "#999" },
});
