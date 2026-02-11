import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.45; // Card estilo Tinder grande

export default function AcomodoDetalleScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Params
  const params = useLocalSearchParams<{
    articuloId: string;
    clave: string;
    nombre: string;
    codigoBarras: string;
    unidadVenta: string;
    ubicacionActual: string;
    almacenId: string;
    almacenNombre: string;
  }>();

  const articuloId = parseInt(params.articuloId || "0", 10);
  const clave = params.clave || "";
  const nombre = params.nombre || "";
  const codigoBarras = params.codigoBarras || "";
  const unidadVenta = params.unidadVenta || "PZA";
  const ubicacionActual = params.ubicacionActual || "";
  const almacenId = parseInt(params.almacenId || "19", 10);
  const almacenNombre = params.almacenNombre || "CEDIS";

  // Image URL
  const databaseId = getCurrentDatabaseId();
  const imageUrl = `${API_URL}/api/imagen-articulo.php?databaseId=${databaseId}&articuloId=${articuloId}&pos=0`;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // States
  const [nuevaUbicacion, setNuevaUbicacion] = useState(ubicacionActual);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const hayCambios =
    nuevaUbicacion.trim().toUpperCase() !== ubicacionActual.toUpperCase();

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Guardar Ubicación ─────────────────────────────────────────────────────

  const guardarUbicacion = async () => {
    if (isSaving) return;
    Keyboard.dismiss();

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/actualizar-ubicacion.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          articuloId,
          almacenId,
          ubicacion: nuevaUbicacion.trim().toUpperCase(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        animateSuccess();

        // Guardar en historial de acomodos (fire & forget)
        fetch(`${API_URL}/api/historial-acomodos.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            usuarioId: user?.USUARIO_ID || 0,
            usuarioNombre: user
              ? `${user.NOMBRE} ${user.APELLIDO_PATERNO}`.trim()
              : "MOVIL",
            articuloId,
            clave,
            nombreArticulo: nombre,
            ubicacionAnterior: ubicacionActual,
            ubicacionNueva: nuevaUbicacion.trim().toUpperCase(),
            almacenId,
            almacenNombre,
          }),
        }).catch((err) => console.warn("[Historial] Error guardando:", err));
      } else {
        throw new Error(data.message || "Error al guardar");
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(e.message || "No se pudo guardar la ubicación");
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const animateSuccess = () => {
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSuccessClose = () => {
    Animated.parallel([
      Animated.timing(successScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccess(false);
      router.back();
    });
  };

  // Auto-close success after 2s
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(handleSuccessClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header fijo arriba */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
          <Text style={[styles.headerBtnText, { color: colors.accent }]}>
            Atrás
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {clave}
          </Text>
        </View>

        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TINDER STYLE CARD */}
          <Animated.View
            style={[
              styles.tinderCard,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Product Image */}
            <View style={styles.imageContainer}>
              {!imageLoaded && !imageError && (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              )}
              {imageError ? (
                <View
                  style={[
                    styles.imagePlaceholder,
                    { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
                  ]}
                >
                  <Ionicons name="cube" size={80} color={colors.textTertiary} />
                  <Text
                    style={[styles.noImageText, { color: colors.textTertiary }]}
                  >
                    Sin imagen
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  contentFit="cover"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}

              {/* Gradient overlay at bottom */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.imageGradient}
              />

              {/* Product info overlay on image */}
              <View style={styles.imageOverlay}>
                <Text style={styles.overlayNombre} numberOfLines={2}>
                  {nombre}
                </Text>
                <View style={styles.overlayMeta}>
                  {codigoBarras ? (
                    <View style={styles.overlayPill}>
                      <Ionicons name="barcode-outline" size={12} color="#fff" />
                      <Text style={styles.overlayPillText}>{codigoBarras}</Text>
                    </View>
                  ) : null}
                  <View style={styles.overlayPill}>
                    <Ionicons name="cube-outline" size={12} color="#fff" />
                    <Text style={styles.overlayPillText}>{unidadVenta}</Text>
                  </View>
                </View>
              </View>

              {/* Location badge on top-right */}
              <View style={styles.locationBadge}>
                <BlurView
                  intensity={90}
                  tint="dark"
                  style={styles.locationBadgeBlur}
                >
                  <Ionicons
                    name="location"
                    size={16}
                    color={ubicacionActual ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.locationBadgeText,
                      { color: ubicacionActual ? "#10B981" : "#9CA3AF" },
                    ]}
                  >
                    {ubicacionActual || "Sin ubicación"}
                  </Text>
                </BlurView>
              </View>
            </View>
          </Animated.View>

          {/* LOCATION INPUT SECTION */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.locationSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nueva Ubicación
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Ingresa la ubicación donde colocarás este artículo
              </Text>

              <View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: hayCambios ? colors.accent : colors.border,
                    borderWidth: hayCambios ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.inputRow}>
                  <View
                    style={[
                      styles.inputIcon,
                      {
                        backgroundColor: hayCambios
                          ? "rgba(99, 102, 241, 0.15)"
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="navigate"
                      size={22}
                      color={hayCambios ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <TextInput
                    style={[styles.ubicacionInput, { color: colors.text }]}
                    value={nuevaUbicacion}
                    onChangeText={setNuevaUbicacion}
                    placeholder="Ej: A1-01"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                  {nuevaUbicacion.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setNuevaUbicacion("")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Visual change indicator */}
              {hayCambios && (
                <View
                  style={[
                    styles.changePreview,
                    {
                      backgroundColor: isDark
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(99,102,241,0.08)",
                    },
                  ]}
                >
                  <View style={styles.changeItem}>
                    <Text
                      style={[
                        styles.changeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Actual
                    </Text>
                    <Text style={[styles.changeValue, { color: colors.text }]}>
                      {ubicacionActual || "—"}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={28}
                    color={colors.accent}
                  />
                  <View style={styles.changeItem}>
                    <Text
                      style={[
                        styles.changeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Nueva
                    </Text>
                    <Text
                      style={[styles.changeValueNew, { color: colors.accent }]}
                    >
                      {nuevaUbicacion.trim().toUpperCase() || "—"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {/* Bottom Action */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: hayCambios ? colors.accent : colors.border,
                opacity: isSaving ? 0.7 : 1,
              },
            ]}
            onPress={guardarUbicacion}
            disabled={isSaving || !hayCambios}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={hayCambios ? "checkmark-circle" : "remove-circle"}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.primaryBtnText}>
                  {hayCambios ? "Guardar Ubicación" : "Sin cambios"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="none">
        <BlurView
          intensity={isDark ? 50 : 30}
          tint={isDark ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: successScale }],
                opacity: successOpacity,
              },
            ]}
          >
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              ¡Listo!
            </Text>
            <Text
              style={[styles.successSubtitle, { color: colors.textSecondary }]}
            >
              Ubicación actualizada correctamente
            </Text>
            <View style={styles.successDetail}>
              <View style={styles.successFlow}>
                <Text
                  style={[styles.successOld, { color: colors.textSecondary }]}
                >
                  {ubicacionActual || "Sin ubicación"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.accent}
                />
                <Text style={[styles.successNew, { color: colors.accent }]}>
                  {nuevaUbicacion.trim().toUpperCase() || "Sin ubicación"}
                </Text>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Error
            </Text>
            <Text
              style={[styles.errorMessage, { color: colors.textSecondary }]}
            >
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.errorBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowError(false)}
            >
              <Text style={styles.errorBtnText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Header - iOS Style
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  headerBtnText: {
    fontSize: 17,
    fontWeight: "400",
    marginLeft: -4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  scrollContent: {
    paddingTop: 16,
  },

  // Tinder Card Styles
  tinderCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: "center",
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  productImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: CARD_HEIGHT * 0.5,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  overlayNombre: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  overlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  overlayPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  locationBadge: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  locationBadgeBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  locationBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Location Section
  locationSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  inputCard: {
    borderRadius: 16,
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  inputIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ubicacionInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  changePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  changeItem: {
    flex: 1,
    alignItems: "center",
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  changeValueNew: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  successCard: {
    width: 300,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  successDetail: {
    alignItems: "center",
  },
  successFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  successOld: {
    fontSize: 16,
    fontWeight: "500",
  },
  successNew: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorCard: {
    width: 300,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  errorIconWrap: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
