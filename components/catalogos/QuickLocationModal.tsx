import { Bone } from "@/components/Skeleton";
import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LocationInfo {
  almacenId: number;
  almacen: string;
  ubicacion: string;
  maximo: number;
  minimo: number;
  puntoReorden: number;
}

interface QuickLocationModalProps {
  visible: boolean;
  articulo: { id: number; nombre: string; sku: string } | null;
  onClose: () => void;
  sucursalNombre?: string;
}

const ACCENT = "#6366f1";

export default function QuickLocationModal({
  visible,
  articulo,
  onClose,
  sucursalNombre,
}: QuickLocationModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [ubicaciones, setUbicaciones] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      if (articulo) {
        fetchLocations(articulo.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      slideAnim.setValue(300);
      setUbicaciones([]);
      setEditingIndex(null);
      setEditValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, articulo]);

  const fetchLocations = async (articuloId: number) => {
    setLoading(true);
    const databaseId = getCurrentDatabaseId();
    const url = `${API_CONFIG.BASE_URL}/api/ubicaciones-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        let ubicacionesList = data.ubicaciones || [];
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          ubicacionesList = ubicacionesList.filter((u: LocationInfo) => {
            const almName = u.almacen?.toLowerCase().trim() || "";
            if (almName.includes("cedis")) return false;
            return almName === searchName || almName.includes(searchName);
          });
        }
        setUbicaciones(ubicacionesList);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingIndex(index);
    setEditValue(ubicaciones[index].ubicacion);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
    Keyboard.dismiss();
  };

  const handleSave = async (index: number) => {
    if (!articulo) return;

    const item = ubicaciones[index];
    const newValue = editValue.trim();

    if (newValue === item.ubicacion) {
      handleCancelEdit();
      return;
    }

    setSaving(true);
    Keyboard.dismiss();
    const databaseId = getCurrentDatabaseId();

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/actualizar-ubicacion.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            articuloId: articulo.id,
            almacenId: item.almacenId,
            ubicacion: newValue,
          }),
        },
      );

      const data = await response.json();

      if (data.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated = [...ubicaciones];
        updated[index] = { ...updated[index], ubicacion: newValue };
        setUbicaciones(updated);
        setEditingIndex(null);
        setEditValue("");

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);
      } else {
        Alert.alert("Error", data.message || "No se pudo actualizar");
      }
    } catch (err) {
      console.error("Error saving location:", err);
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (editingIndex !== null) {
      handleCancelEdit();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!articulo) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={s.backdrop}>
          <BlurView
            intensity={25}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
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
                Ubicaciones
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
              keyboardShouldPersistTaps="handled"
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
                      <View style={s.locIconWrap}>
                        <Bone width={36} height={36} radius={10} />
                      </View>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Bone width={90} height={10} radius={3} />
                        <Bone width={120} height={16} radius={4} />
                      </View>
                      <Bone width={28} height={28} radius={8} />
                    </View>
                  ))}
                </View>
              ) : ubicaciones.length > 0 ? (
                <View
                  style={[s.groupedCard, { backgroundColor: colors.surface }]}
                >
                  {ubicaciones.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        { borderBottomColor: colors.border },
                        idx < ubicaciones.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      {editingIndex === idx ? (
                        /* ─── Edit Mode ─── */
                        <View style={s.editWrap}>
                          <View style={s.editHeader}>
                            <Text
                              style={[
                                s.editAlmacen,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {item.almacen}
                            </Text>
                          </View>
                          <TextInput
                            style={[
                              s.editInput,
                              {
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: ACCENT,
                              },
                            ]}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholder="Ingresa ubicación..."
                            placeholderTextColor={colors.textTertiary}
                            autoFocus
                            autoCapitalize="characters"
                            selectTextOnFocus
                          />
                          <View style={s.editActions}>
                            <TouchableOpacity
                              style={[
                                s.editBtn,
                                { borderColor: colors.border, borderWidth: 1 },
                              ]}
                              onPress={handleCancelEdit}
                            >
                              <Text
                                style={[
                                  s.editBtnText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Cancelar
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.editBtn, { backgroundColor: ACCENT }]}
                              onPress={() => handleSave(idx)}
                              disabled={saving}
                            >
                              {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text
                                  style={[s.editBtnText, { color: "#fff" }]}
                                >
                                  Guardar
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* ─── Display Mode ─── */
                        <TouchableOpacity
                          style={s.row}
                          onPress={() => handleEdit(idx)}
                          activeOpacity={0.6}
                        >
                          <View
                            style={[
                              s.locIconWrap,
                              { backgroundColor: `${ACCENT}10` },
                            ]}
                          >
                            <Ionicons
                              name="navigate"
                              size={18}
                              color={ACCENT}
                            />
                          </View>
                          <View style={s.locInfo}>
                            <Text
                              style={[
                                s.locAlmacen,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {item.almacen}
                            </Text>
                            <Text style={[s.locValue, { color: colors.text }]}>
                              {item.ubicacion || "Sin asignar"}
                            </Text>
                          </View>
                          <View
                            style={[
                              s.editIcon,
                              { backgroundColor: colors.background },
                            ]}
                          >
                            <Ionicons
                              name="pencil"
                              size={13}
                              color={colors.textTertiary}
                            />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.emptyWrap}>
                  <View
                    style={[s.emptyCircle, { backgroundColor: colors.surface }]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={28}
                      color={colors.textTertiary}
                    />
                  </View>
                  <Text style={[s.emptyTitle, { color: colors.text }]}>
                    Sin ubicaciones
                  </Text>
                  <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                    No hay ubicaciones asignadas a este artículo
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={s.successBackdrop}>
          <View style={[s.successCard, { backgroundColor: colors.background }]}>
            <LottieView
              ref={lottieRef}
              source={require("@/assets/animations/success.json")}
              autoPlay
              loop={false}
              style={s.successLottie}
            />
            <Text style={[s.successText, { color: colors.text }]}>
              ¡Ubicación actualizada!
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
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

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locInfo: { flex: 1 },
  locAlmacen: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  locValue: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  editIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Edit mode
  editWrap: { padding: 16 },
  editHeader: { marginBottom: 10 },
  editAlmacen: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editInput: {
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
    borderWidth: 2,
    marginBottom: 12,
  },
  editActions: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "600" },

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

  // Success
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    width: 200,
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  successLottie: { width: 100, height: 100 },
  successText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
});
