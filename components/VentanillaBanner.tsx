import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const { height } = Dimensions.get("window");

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

// Circular countdown — el protagonista
const CircularTimer = ({
  countdown,
  duration,
  isUrgent,
}: {
  countdown: number;
  duration: number;
  isUrgent: boolean;
}) => {
  const SIZE = 80;
  const STROKE = 4;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = RADIUS * 2 * Math.PI;
  const progress = countdown / duration;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const trackColor = isUrgent ? "#FECACA" : "#E5E7EB";
  const fillColor = isUrgent ? "#EF4444" : "#111827";

  return (
    <View style={timerStyles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE}
          fill="transparent"
        />
        {/* Fill */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={fillColor}
          strokeWidth={STROKE}
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={timerStyles.center}>
        <Text style={[timerStyles.number, { color: fillColor }]}>{countdown}</Text>
      </View>
    </View>
  );
};

const timerStyles = StyleSheet.create({
  wrap: { position: "relative", justifyContent: "center", alignItems: "center" },
  center: { position: "absolute", alignItems: "center" },
  number: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
});

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

  const translateY = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<any>(null);

  const isUrgent = countdown <= 10;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCountdown(duration);
      setIsAccepted(false);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();

      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = duration - elapsed;
        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setCountdown(0);
          if (!isAccepted) onDismiss();
        } else {
          setCountdown(remaining);
          if (remaining === 10) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 250,
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

  const limpiarFolio = (folio: string) => {
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/);
    if (match) return `${match[1]}${match[2]}`;
    return folio;
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      {/* Tap outside = dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <Animated.View
        style={[styles.card, { transform: [{ translateY }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Main row: info + timer */}
        <View style={styles.mainRow}>
          {/* Left: icon + text */}
          <View style={styles.leftCol}>
            <View style={styles.iconBox}>
              <Ionicons name="flash" size={20} color="#111827" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.label}>Nueva ventanilla</Text>
              <Text style={styles.folio}>{limpiarFolio(ventanilla.FOLIO)}</Text>
              <Text style={styles.almacen}>{ventanilla.ALMACEN}</Text>
            </View>
          </View>

          {/* Right: circular timer */}
          <CircularTimer
            countdown={countdown}
            duration={duration}
            isUrgent={isUrgent}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleDismiss}
            disabled={loading}
            activeOpacity={0.6}
          >
            <Text style={styles.dismissText}>Ignorar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptBtn,
              isUrgent && styles.acceptBtnUrgent,
            ]}
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptText}>
              {loading ? "Tomando..." : "Tomar"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 24,
  },
  // Main content row
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  folio: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  almacen: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 20,
  },
  // Buttons
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  acceptBtnUrgent: {
    backgroundColor: "#EF4444",
  },
  acceptText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
