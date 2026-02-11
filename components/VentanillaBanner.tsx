import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width } = Dimensions.get("window");

interface VentanillaData {
  TRASPASO_IN_ID: number;
  FOLIO: string;
  ALMACEN: string;
  ESTATUS: string;
}

interface VentanillaBannerProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  duration?: number;
  ventanilla?: VentanillaData;
  loading?: boolean;
  colors: any;
}

export function VentanillaBanner({
  visible,
  onAccept,
  onDismiss,
  duration = 30,
  ventanilla,
  loading = false,
  colors,
}: VentanillaBannerProps) {
  const [countdown, setCountdown] = useState(duration);
  const [isAccepted, setIsAccepted] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const isUrgent = countdown <= 10;

  // Vibración al aparecer
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [visible]);

  // Pulso de urgencia
  useEffect(() => {
    if (visible && isUrgent) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [visible, isUrgent]);

  // Animación de entrada/salida
  useEffect(() => {
    if (visible) {
      setCountdown(duration);
      setIsAccepted(false);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Contador
      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = duration - elapsed;

        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setCountdown(0);
          if (!isAccepted) {
            onDismiss();
          }
        } else {
          setCountdown(remaining);
          // Vibración cada 10 segundos
          if (remaining % 10 === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, isAccepted, duration]);

  if (!visible || !ventanilla) return null;

  const handleAccept = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAccepted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  const handleDismiss = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onDismiss();
  };

  // Limpiar folio
  const limpiarFolio = (folio: string) => {
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/);
    if (match) {
      return `${match[1]}${match[2]}`;
    }
    return folio;
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: isUrgent ? "#EF4444" : colors.accent,
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        {/* Header con ícono */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: (isUrgent ? "#EF4444" : colors.accent) + "20",
              },
            ]}
          >
            <Ionicons
              name="notifications"
              size={28}
              color={isUrgent ? "#EF4444" : colors.accent}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              🚨 Nueva Ventanilla
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Traspaso disponible para surtir
            </Text>
          </View>
          <View
            style={[
              styles.countdownBadge,
              { backgroundColor: isUrgent ? "#EF4444" : colors.accent },
            ]}
          >
            <Text style={styles.countdownText}>{countdown}s</Text>
          </View>
        </View>

        {/* Info del traspaso */}
        <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={20} color={colors.accent} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Folio:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {limpiarFolio(ventanilla.FOLIO)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={20} color={colors.accent} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Almacén:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {ventanilla.ALMACEN}
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: colors.border }]}
            onPress={handleDismiss}
            disabled={loading}
          >
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
              Ignorar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.acceptBtn,
              { backgroundColor: isUrgent ? "#EF4444" : colors.accent },
            ]}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.acceptText}>Tomando...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.acceptText}>¡Tomar!</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Barra de progreso */}
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: isUrgent ? "#EF4444" : colors.accent,
                width: `${(countdown / duration) * 100}%`,
              },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  container: {
    width: width - 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  countdownBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countdownText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  infoCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "600",
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
});
