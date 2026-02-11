import { Bone } from "@/components/Skeleton";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface StockInfo {
  sucursal: string;
  almacen: string;
  stock: number;
}

interface QuickStockModalProps {
  visible: boolean;
  articulo: { id: number; nombre: string; sku: string } | null;
  onClose: () => void;
  sucursalNombre?: string;
}

export default function QuickStockModal({
  visible,
  articulo,
  onClose,
  sucursalNombre,
}: QuickStockModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [existencias, setExistencias] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalStock, setTotalStock] = useState(0);
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      if (articulo) {
        fetchStock(articulo.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      slideAnim.setValue(300);
      setExistencias([]);
      setTotalStock(0);
    }
  }, [visible, articulo]);

  const fetchStock = async (articuloId: number) => {
    setLoading(true);
    const { getCurrentDatabaseId } = require("@/services/api");
    const { API_CONFIG } = require("@/config/api");

    const databaseId = getCurrentDatabaseId();
    const url = `${API_CONFIG.BASE_URL}/api/existencias-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        let detalles = data.detalles || [];
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          detalles = detalles.filter((d: any) => {
            const sucName = d.sucursal?.toLowerCase().trim() || "";
            if (sucName.includes("cedis")) return false;
            return sucName === searchName || sucName.includes(searchName);
          });
        }
        setExistencias(detalles);
        setTotalStock(
          sucursalNombre
            ? detalles.reduce((sum: number, d: any) => sum + (d.stock || 0), 0)
            : data.total || 0,
        );
      }
    } catch (err) {
      console.error("Error fetching quick stock:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const getStockColor = (stock: number) => {
    if (stock <= 0) return "#ef4444";
    if (stock < 10) return "#f59e0b";
    return "#22c55e";
  };

  if (!articulo) return null;

  const formatStock = (n: number) =>
    n % 1 === 0 ? n.toString() : n.toFixed(2);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: colors.text }]}>
              Existencias
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={[s.closeBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Article info pill */}
          <View style={[s.articlePill, { backgroundColor: colors.surface }]}>
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={colors.textTertiary}
            />
            <Text
              style={[s.articleSku, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {articulo.sku}
            </Text>
            <Text style={{ color: colors.border }}>·</Text>
            <Text
              style={[s.articleName, { color: colors.text }]}
              numberOfLines={1}
            >
              {articulo.nombre}
            </Text>
          </View>

          {/* Total Summary */}
          {!loading && existencias.length > 0 && (
            <View style={[s.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                Stock Total
              </Text>
              <View style={s.summaryRight}>
                <Text
                  style={[s.summaryValue, { color: getStockColor(totalStock) }]}
                >
                  {formatStock(totalStock)}
                </Text>
                <Text style={[s.summaryUnit, { color: colors.textTertiary }]}>
                  uds
                </Text>
              </View>
            </View>
          )}

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            bounces={true}
          >
            {loading ? (
              <>
                {/* Summary skeleton */}
                <View
                  style={[
                    s.summaryCard,
                    {
                      backgroundColor: colors.surface,
                      marginHorizontal: 0,
                      marginBottom: 16,
                    },
                  ]}
                >
                  <Bone width={80} height={13} radius={4} />
                  <Bone width={56} height={24} radius={6} />
                </View>
                <View
                  style={[s.groupedCard, { backgroundColor: colors.surface }]}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        s.row,
                        { borderBottomColor: colors.border },
                        i === 3 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Bone width={32} height={32} radius={16} />
                      <View style={{ flex: 1, marginLeft: 12, gap: 5 }}>
                        <Bone width={70} height={10} radius={3} />
                        <Bone width={110} height={14} radius={4} />
                      </View>
                      <Bone width={36} height={22} radius={6} />
                    </View>
                  ))}
                </View>
              </>
            ) : existencias.length > 0 ? (
              <View
                style={[s.groupedCard, { backgroundColor: colors.surface }]}
              >
                {existencias.map((item, idx) => {
                  const stockColor = getStockColor(item.stock);
                  return (
                    <View
                      key={idx}
                      style={[
                        s.row,
                        { borderBottomColor: colors.border },
                        idx === existencias.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.stockDot,
                          { backgroundColor: `${stockColor}18` },
                        ]}
                      >
                        <View
                          style={[
                            s.stockDotInner,
                            { backgroundColor: stockColor },
                          ]}
                        />
                      </View>
                      <View style={s.stockInfo}>
                        <Text
                          style={[
                            s.stockSucursal,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {item.sucursal}
                        </Text>
                        <Text style={[s.stockAlmacen, { color: colors.text }]}>
                          {item.almacen}
                        </Text>
                      </View>
                      <Text style={[s.stockValue, { color: stockColor }]}>
                        {formatStock(item.stock)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <View
                  style={[s.emptyCircle, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={28}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text }]}>
                  Sin existencias
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                  No hay stock registrado en ningún almacén
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  articlePill: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 16,
  },
  articleSku: { fontSize: 12, fontWeight: "600" },
  articleName: { fontSize: 12, fontWeight: "500", flex: 1 },

  // Summary
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 14, fontWeight: "500" },
  summaryRight: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  summaryValue: { fontSize: 24, fontWeight: "800" },
  summaryUnit: { fontSize: 12, fontWeight: "600" },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  groupedCard: { borderRadius: 14, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Stock indicator
  stockDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stockDotInner: { width: 8, height: 8, borderRadius: 4 },
  stockInfo: { flex: 1 },
  stockSucursal: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  stockAlmacen: { fontSize: 15, fontWeight: "600" },
  stockValue: { fontSize: 18, fontWeight: "800" },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 44 },
  emptyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
