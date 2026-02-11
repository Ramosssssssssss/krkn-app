import { useThemeColors } from "@/context/theme-context";
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
  }, [visible, articulo]);

  const fetchLocations = async (articuloId: number) => {
    setLoading(true);
    const { getCurrentDatabaseId } = require("@/services/api");
    const { API_CONFIG } = require("@/config/api");

    const databaseId = getCurrentDatabaseId();
    const url = `${API_CONFIG.BASE_URL}/api/ubicaciones-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        let ubicacionesList = data.ubicaciones || [];
        // Si hay sucursalNombre, filtrar solo esa sucursal/almacén
        if (sucursalNombre) {
          const searchName = sucursalNombre.toLowerCase().trim();
          ubicacionesList = ubicacionesList.filter((u: LocationInfo) => {
            const almName = u.almacen?.toLowerCase().trim() || "";
            // Excluir CEDIS y buscar coincidencia
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

    const { getCurrentDatabaseId } = require("@/services/api");
    const { API_CONFIG } = require("@/config/api");
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

        // Mostrar modal de éxito
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 1200);
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
      {/* Main Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <BlurView
            intensity={20}
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
              styles.container,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.handleBar}>
              <View
                style={[styles.handle, { backgroundColor: colors.border }]}
              />
            </View>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[styles.headerIcon, { backgroundColor: "#6366f115" }]}
                >
                  <Ionicons name="location" size={20} color="#6366f1" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Ubicaciones
                  </Text>
                  <Text
                    style={[styles.subtitle, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {articulo.sku} · Toca para editar
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <View
                    style={[
                      styles.loadingBox,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text
                      style={[
                        styles.loadingText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Consultando ubicaciones...
                    </Text>
                  </View>
                </View>
              ) : ubicaciones.length > 0 ? (
                <View style={styles.listContainer}>
                  {ubicaciones.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.locationCard,
                        { backgroundColor: colors.surface },
                      ]}
                    >
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
                            style={[
                              styles.almacenText,
                              { color: colors.accent },
                            ]}
                          >
                            {item.almacen}
                          </Text>
                        </View>
                      </View>

                      {editingIndex === idx ? (
                        <View style={styles.editContainer}>
                          <TextInput
                            style={[
                              styles.editInput,
                              {
                                backgroundColor: colors.background,
                                color: colors.text,
                                borderColor: "#6366f1",
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
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={[
                                styles.editBtn,
                                styles.cancelBtn,
                                { borderColor: colors.border },
                              ]}
                              onPress={handleCancelEdit}
                            >
                              <Text
                                style={[
                                  styles.editBtnText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Cancelar
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.editBtn,
                                styles.saveBtn,
                                { backgroundColor: "#6366f1" },
                              ]}
                              onPress={() => handleSave(idx)}
                              disabled={saving}
                            >
                              {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text
                                  style={[
                                    styles.editBtnText,
                                    { color: "#fff" },
                                  ]}
                                >
                                  Guardar
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.locationMain}
                          onPress={() => handleEdit(idx)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.locationIconBox,
                              { backgroundColor: "#6366f110" },
                            ]}
                          >
                            <Ionicons
                              name="navigate"
                              size={22}
                              color="#6366f1"
                            />
                          </View>
                          <View style={styles.locationTextBox}>
                            <Text
                              style={[
                                styles.locationLabel,
                                { color: colors.textTertiary },
                              ]}
                            >
                              Localización
                            </Text>
                            <Text
                              style={[
                                styles.locationValue,
                                { color: colors.text },
                              ]}
                            >
                              {item.ubicacion || "Sin asignar"}
                            </Text>
                          </View>
                          <Ionicons
                            name="pencil"
                            size={18}
                            color={colors.textTertiary}
                          />
                        </TouchableOpacity>
                      )}
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
                      name="location-outline"
                      size={32}
                      color={colors.textTertiary}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Sin ubicaciones
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: colors.textTertiary }]}
                  >
                    No hay ubicaciones asignadas
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
        <View style={styles.successBackdrop}>
          <View
            style={[styles.successCard, { backgroundColor: colors.background }]}
          >
            <LottieView
              ref={lottieRef}
              source={require("@/assets/animations/success.json")}
              autoPlay
              loop={false}
              style={styles.successLottie}
            />
            <Text style={[styles.successText, { color: colors.text }]}>
              ¡Ubicación actualizada!
            </Text>
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: "80%",
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
  locationCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  almacenBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
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
  locationMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  locationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  locationTextBox: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  locationValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  editContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  editInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    borderWidth: 2,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {},
  editBtnText: {
    fontSize: 15,
    fontWeight: "600",
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
  // Success Modal Styles
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
  successLottie: {
    width: 100,
    height: 100,
  },
  successText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
});
