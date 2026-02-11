import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

interface PedidoCompletadoModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  folio: string;
  caja: string;
}

export function PedidoCompletadoModal({
  visible,
  onClose,
  colors,
  folio,
  caja,
}: PedidoCompletadoModalProps) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (visible) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 300 }),
          withTiming(1, { duration: 300 }),
        ),
        3,
        false,
      );
    }
  }, [visible, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Icono de éxito animado */}
          <Animated.View style={[styles.iconContainer, animatedStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-done" size={60} color="#fff" />
            </View>
          </Animated.View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            ¡Pedido Completado!
          </Text>

          {/* Subtítulo */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Todos los artículos han sido apartados
          </Text>

          {/* Info del pedido */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#3B82F620" }]}>
                <Ionicons name="document-text" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Folio del Pedido
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {folio}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#10B98120" }]}>
                <Ionicons name="cube" size={20} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Caja Liberada
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {caja}
                </Text>
              </View>
            </View>
          </View>

          {/* Mensaje */}
          <View style={styles.messageContainer}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textTertiary}
            />
            <Text style={[styles.messageText, { color: colors.textTertiary }]}>
              La caja ha sido liberada y está disponible para nuevos pedidos
            </Text>
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#10B981" }]}
            onPress={onClose}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: width - 48,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  messageText: {
    fontSize: 12,
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
