import { useThemeColors } from "@/context/theme-context";
import { formatFolio } from "@/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

// Sonido sutil estilo iOS
const SUCCESS_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  folio: string | null;
  secondaryFolio?: string | null;
  secondaryFolioLabel?: string;
  doctoInId?: number | null;
  inserted?: number;
  warnings?: Array<{ CLAVE: string; error: string }>;
  title?: string;
  subtitle?: string;
  type?: "entrada" | "salida";
  primaryButtonText?: string;
  onPrimaryAction?: () => void;
  secondaryButtonText?: string;
  onSecondaryAction?: () => void;
  tertiaryButtonText?: string;
  onTertiaryAction?: () => void;
}

export default function SuccessModal({
  visible,
  onClose,
  folio,
  secondaryFolio,
  secondaryFolioLabel = "DEVOLUCIÓN",
  doctoInId,
  inserted = 0,
  warnings = [],
  title = "Completado",
  subtitle = "La operación se realizó correctamente",
  type = "entrada",
  primaryButtonText = "Listo",
  onPrimaryAction,
  secondaryButtonText,
  onSecondaryAction,
  tertiaryButtonText,
  onTertiaryAction,
}: SuccessModalProps) {
  const colors = useThemeColors();
  const lottieRef = useRef<LottieView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Usar colores del tema actual
  const isDark =
    colors.background.toLowerCase().includes("0") ||
    colors.text === "#FFFFFF" ||
    colors.text === "#F8FAFC" ||
    colors.text === "#ECFDF5";

  useEffect(() => {
    if (visible) {
      // Animación de entrada suave estilo iOS
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Reproducir animación Lottie
      setTimeout(() => lottieRef.current?.play(), 150);

      // Vibración sutil tipo iOS (haptic)
      if (Platform.OS !== "web") {
        Vibration.vibrate(10);
      }

      // Sonido sutil
      playSuccessSound();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [visible]);

  const playSuccessSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: SUCCESS_SOUND_URI },
        { shouldPlay: true, volume: 0.25 },
      );
      soundRef.current = sound;
    } catch (error) {
      console.log("Sound not available");
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onPrimaryAction) {
        onPrimaryAction();
      } else {
        onClose();
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Fondo blur estilo iOS */}
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={50}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          />
        )}

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icono de éxito */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.accentLight },
            ]}
          >
            <LottieView
              ref={lottieRef}
              source={require("@/assets/animations/success.json")}
              style={styles.lottie}
              autoPlay={false}
              loop={false}
            />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Subtítulo */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>

          {/* Card del folio */}
          <View
            style={[styles.folioCard, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.folioLabel, { color: colors.textSecondary }]}>
              FOLIO
            </Text>
            <Text style={[styles.folioValue, { color: colors.accent }]}>
              {folio ? formatFolio(folio) : "—"}
            </Text>
          </View>

          {/* Card del folio secundario (Devolución) */}
          {secondaryFolio && (
            <View
              style={[
                styles.folioCard,
                { backgroundColor: colors.background, marginTop: 8 },
              ]}
            >
              <Text
                style={[styles.folioLabel, { color: colors.textSecondary }]}
              >
                {secondaryFolioLabel}
              </Text>
              <Text style={[styles.folioValue, { color: "#F59E0B" }]}>
                {formatFolio(secondaryFolio)}
              </Text>
            </View>
          )}

          {/* Stats en línea */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {inserted}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Artículos
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {doctoInId || "—"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                ID Doc
              </Text>
            </View>
          </View>

          {/* Warnings */}
          {warnings.length > 0 && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: `${colors.warning}15` },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: warnings.length > 0 ? 6 : 0,
                }}
              >
                <Ionicons
                  name="alert-circle"
                  size={15}
                  color={colors.warning}
                />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  {warnings.length} artículo{warnings.length > 1 ? "s" : ""} con
                  error (se saltaron)
                </Text>
              </View>
              {warnings.slice(0, 10).map((w, i) => (
                <Text
                  key={i}
                  style={{
                    color: colors.warning,
                    fontSize: 11,
                    fontWeight: "600",
                    fontFamily: Platform.OS === "ios" ? "SF Mono" : "monospace",
                    marginLeft: 20,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  • {w.CLAVE}
                </Text>
              ))}
              {warnings.length > 10 && (
                <Text
                  style={{
                    color: colors.warning,
                    fontSize: 11,
                    marginLeft: 20,
                    marginTop: 4,
                    fontStyle: "italic",
                  }}
                >
                  y {warnings.length - 10} más...
                </Text>
              )}
            </View>
          )}

          {/* Botón principal */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
          </TouchableOpacity>

          {/* Botón Secundario (Opcional) */}
          {secondaryButtonText && onSecondaryAction && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 120,
                    useNativeDriver: true,
                  }),
                  Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                  }),
                ]).start(() => onSecondaryAction());
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
          )}

          {/* Botón Terciario (Opcional) */}
          {tertiaryButtonText && onTertiaryAction && (
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(scaleAnim, {
                    toValue: 0.85,
                    duration: 120,
                    useNativeDriver: true,
                  }),
                  Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                  }),
                ]).start(() => onTertiaryAction());
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tertiaryButtonText, { color: colors.accent }]}
              >
                {tertiaryButtonText}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  androidBackdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: width * 0.85,
    maxWidth: 320,
    borderRadius: 14,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  lottie: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },
  folioCard: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    alignItems: "center",
  },
  folioLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  folioValue: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  secondaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  tertiaryButton: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
