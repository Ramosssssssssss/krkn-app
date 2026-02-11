import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
        // Si hay sucursalNombre, filtrar solo esa sucursal
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          detalles = detalles.filter((d: any) => {
            const sucName = d.sucursal?.toLowerCase().trim() || "";
            // Excluir CEDIS y buscar coincidencia
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: `${colors.accent}15` },
                ]}
              >
                <Ionicons name="cube" size={20} color={colors.accent} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Existencias
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {articulo.sku}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Total Summary Card */}
          {!loading && existencias.length > 0 && (
            <View
              style={[styles.summaryCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Stock Total Disponible
                </Text>
                <View
                  style={[
                    styles.totalBadge,
                    { backgroundColor: `${getStockColor(totalStock)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.totalValue,
                      { color: getStockColor(totalStock) },
                    ]}
                  >
                    {totalStock % 1 === 0 ? totalStock : totalStock.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.totalUnit,
                      { color: getStockColor(totalStock) },
                    ]}
                  >
                    unidades
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <View
                  style={[
                    styles.loadingBox,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text
                    style={[styles.loadingText, { color: colors.textTertiary }]}
                  >
                    Consultando almacenes...
                  </Text>
                </View>
              </View>
            ) : existencias.length > 0 ? (
              <View style={styles.listContainer}>
                {existencias.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.stockCard,
                      { backgroundColor: colors.surface },
                      idx === existencias.length - 1 && styles.lastCard,
                    ]}
                  >
                    <View style={styles.stockCardContent}>
                      <View
                        style={[
                          styles.stockIcon,
                          { backgroundColor: `${getStockColor(item.stock)}12` },
                        ]}
                      >
                        <Ionicons
                          name={
                            item.stock > 0 ? "checkmark-circle" : "alert-circle"
                          }
                          size={18}
                          color={getStockColor(item.stock)}
                        />
                      </View>
                      <View style={styles.stockInfo}>
                        <Text
                          style={[
                            styles.stockSucursal,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {item.sucursal}
                        </Text>
                        <Text
                          style={[styles.stockAlmacen, { color: colors.text }]}
                        >
                          {item.almacen}
                        </Text>
                      </View>
                      <View style={styles.stockValueContainer}>
                        <Text
                          style={[
                            styles.stockValue,
                            { color: getStockColor(item.stock) },
                          ]}
                        >
                          {item.stock % 1 === 0
                            ? item.stock
                            : item.stock.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={32}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Sin existencias
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  totalUnit: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    gap: 8,
  },
  stockCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  lastCard: {
    marginBottom: 0,
  },
  stockCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  stockIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockSucursal: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stockAlmacen: {
    fontSize: 15,
    fontWeight: "600",
  },
  stockValueContainer: {
    alignItems: "flex-end",
  },
  stockValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
