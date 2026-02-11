import { Bone } from "@/components/Skeleton";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          nivelesData = nivelesData.filter((n: NivelInfo) => {
            const almName = n.almacen?.toLowerCase().trim() || "";
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

  const getLevelColor = (type: "min" | "reorden" | "max") => {
    if (type === "min") return "#ef4444";
    if (type === "reorden") return colors.accent;
    return "#22c55e";
  };

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
              Puntos de Reorden
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

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            bounces={true}
          >
            {loading ? (
              <View
                style={[s.groupedCard, { backgroundColor: colors.surface }]}
              >
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      s.row,
                      { borderBottomColor: colors.border },
                      i === 2 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <Bone width={100} height={13} radius={4} />
                      <Bone width={60} height={10} radius={4} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 20 }}>
                      <View style={{ alignItems: "center", gap: 4 }}>
                        <Bone width={30} height={20} radius={5} />
                        <Bone width={24} height={8} radius={3} />
                      </View>
                      <View style={{ alignItems: "center", gap: 4 }}>
                        <Bone width={30} height={20} radius={5} />
                        <Bone width={24} height={8} radius={3} />
                      </View>
                      <View style={{ alignItems: "center", gap: 4 }}>
                        <Bone width={30} height={20} radius={5} />
                        <Bone width={24} height={8} radius={3} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : niveles.length > 0 ? (
              <View
                style={[s.groupedCard, { backgroundColor: colors.surface }]}
              >
                {niveles.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      s.row,
                      { borderBottomColor: colors.border },
                      idx === niveles.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Left — almacen + ubicacion */}
                    <View style={s.rowLeft}>
                      <Text
                        style={[s.almacenName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.almacen}
                      </Text>
                      {item.ubicacion ? (
                        <View style={s.ubicRow}>
                          <Ionicons
                            name="location-outline"
                            size={11}
                            color={colors.textTertiary}
                          />
                          <Text
                            style={[s.ubicText, { color: colors.textTertiary }]}
                          >
                            {item.ubicacion}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Right — 3 level columns */}
                    <View style={s.levelsRow}>
                      <View style={s.levelCol}>
                        <Text
                          style={[
                            s.levelValue,
                            { color: getLevelColor("min") },
                          ]}
                        >
                          {item.minimo}
                        </Text>
                        <Text
                          style={[s.levelLabel, { color: colors.textTertiary }]}
                        >
                          MIN
                        </Text>
                      </View>
                      <View
                        style={[
                          s.levelDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={s.levelCol}>
                        <Text
                          style={[
                            s.levelValue,
                            { color: getLevelColor("reorden") },
                          ]}
                        >
                          {item.puntoReorden}
                        </Text>
                        <Text
                          style={[s.levelLabel, { color: colors.textTertiary }]}
                        >
                          P.R.
                        </Text>
                      </View>
                      <View
                        style={[
                          s.levelDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={s.levelCol}>
                        <Text
                          style={[
                            s.levelValue,
                            { color: getLevelColor("max") },
                          ]}
                        >
                          {item.maximo}
                        </Text>
                        <Text
                          style={[s.levelLabel, { color: colors.textTertiary }]}
                        >
                          MÁX
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <View
                  style={[s.emptyCircle, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={28}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text }]}>
                  Sin niveles
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                  Este artículo no tiene puntos de reorden configurados
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  groupedCard: { borderRadius: 14, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  almacenName: { fontSize: 15, fontWeight: "600" },
  ubicRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  ubicText: { fontSize: 11, fontWeight: "500" },
  levelsRow: { flexDirection: "row", alignItems: "center" },
  levelCol: { alignItems: "center", width: 44 },
  levelValue: { fontSize: 17, fontWeight: "800" },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  levelDivider: { width: 1, height: 24, marginHorizontal: 6 },
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
