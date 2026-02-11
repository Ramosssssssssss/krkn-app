import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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

interface NivelInfo {
  almacenId: number;
  almacen: string;
  ubicacion: string;
  maximo: number;
  minimo: number;
  puntoReorden: number;
}

interface GanchoModalProps {
  visible: boolean;
  articulo: { id: number; nombre: string; sku: string } | null;
  onClose: () => void;
  sucursalNombre?: string;
}

export default function GanchoModal({
  visible,
  articulo,
  onClose,
  sucursalNombre,
}: GanchoModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [niveles, setNiveles] = useState<NivelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      if (articulo) {
        fetchNiveles(articulo.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      slideAnim.setValue(300);
      setNiveles([]);
    }
  }, [visible, articulo]);

  const fetchNiveles = async (articuloId: number) => {
    setLoading(true);
    const { getCurrentDatabaseId } = require("@/services/api");
    const { API_CONFIG } = require("@/config/api");

    const databaseId = getCurrentDatabaseId();
    const url = `${API_CONFIG.BASE_URL}/api/ubicaciones-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        let nivelesData = (data.ubicaciones || []).filter(
          (u: NivelInfo) => u.maximo > 0 || u.minimo > 0 || u.puntoReorden > 0,
        );
        // Si hay sucursalNombre, filtrar solo esa sucursal/almacén
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          nivelesData = nivelesData.filter((n: NivelInfo) => {
            const almName = n.almacen?.toLowerCase().trim() || "";
            // Excluir CEDIS y buscar coincidencia
            if (almName.includes("cedis")) return false;
            return almName === searchName || almName.includes(searchName);
          });
        }
        setNiveles(nivelesData);
      }
    } catch (err) {
      console.error("Error fetching niveles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
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
                <Ionicons name="analytics" size={20} color={colors.accent} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Gancho
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {articulo.sku} · Niveles de inventario
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
                    Consultando niveles...
                  </Text>
                </View>
              </View>
            ) : niveles.length > 0 ? (
              <View style={styles.listContainer}>
                {niveles.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.nivelCard,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    {/* Header del almacén */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.almacenBadge,
                          { backgroundColor: `${colors.accent}10` },
                        ]}
                      >
                        <Ionicons
                          name="business"
                          size={14}
                          color={colors.accent}
                        />
                        <Text
                          style={[styles.almacenText, { color: colors.accent }]}
                        >
                          {item.almacen}
                        </Text>
                      </View>
                      {item.ubicacion && (
                        <View
                          style={[
                            styles.ubicacionBadge,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <Ionicons
                            name="location"
                            size={12}
                            color={colors.textTertiary}
                          />
                          <Text
                            style={[
                              styles.ubicacionText,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {item.ubicacion}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Niveles en fila */}
                    <View style={styles.nivelesRow}>
                      {/* Mínimo */}
                      <View style={styles.nivelItem}>
                        <View
                          style={[
                            styles.nivelDot,
                            { backgroundColor: colors.warning || "#f59e0b" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.nivelLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Mínimo
                        </Text>
                        <Text
                          style={[styles.nivelValue, { color: colors.text }]}
                        >
                          {item.minimo}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.nivelDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />

                      {/* Reorden */}
                      <View style={styles.nivelItem}>
                        <View
                          style={[
                            styles.nivelDot,
                            { backgroundColor: colors.accent },
                          ]}
                        />
                        <Text
                          style={[
                            styles.nivelLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Reorden
                        </Text>
                        <Text
                          style={[styles.nivelValue, { color: colors.text }]}
                        >
                          {item.puntoReorden}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.nivelDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />

                      {/* Máximo */}
                      <View style={styles.nivelItem}>
                        <View
                          style={[
                            styles.nivelDot,
                            { backgroundColor: colors.success || "#22c55e" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.nivelLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Máximo
                        </Text>
                        <Text
                          style={[styles.nivelValue, { color: colors.text }]}
                        >
                          {item.maximo}
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
                    name="analytics-outline"
                    size={32}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Sin niveles configurados
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  Este artículo no tiene puntos de reorden
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
    gap: 12,
  },
  nivelCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  almacenBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  almacenText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ubicacionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ubicacionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  nivelesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nivelItem: {
    flex: 1,
    alignItems: "center",
  },
  nivelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  nivelLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  nivelValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  nivelDivider: {
    width: 1,
    marginHorizontal: 8,
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
