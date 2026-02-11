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

const { width } = Dimensions.get("window");

export interface DestinoInfo {
  RESULTADO: string;
  MENSAJE: string;
  FOLIO_SUGERIDO: string;
  CAJA_ASIGNADA: string;
  NECESITA_SELECCION_CAJA: boolean;
  UNIDADES_PENDIENTES: number;
  ARTICULOS_PENDIENTES: string;
}

interface DestinoAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCaja: () => void;
  destinoInfo: DestinoInfo | null;
  colors: any;
}

export function DestinoAlertModal({
  visible,
  onClose,
  onSelectCaja,
  destinoInfo,
  colors,
}: DestinoAlertModalProps) {
  if (!destinoInfo) return null;

  const isAutoAsignado = destinoInfo.RESULTADO === "AUTO_ASIGNADO";
  const isSeleccionCaja = destinoInfo.RESULTADO === "SELECCION_CAJA";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Icono de alerta */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isAutoAsignado ? "#10B98120" : "#F59E0B20",
              },
            ]}
          >
            <Ionicons
              name={isAutoAsignado ? "checkmark-circle" : "alert-circle"}
              size={48}
              color={isAutoAsignado ? "#10B981" : "#F59E0B"}
            />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isAutoAsignado
              ? "¡Artículo Asignado!"
              : "Artículo con Pedido Pendiente"}
          </Text>

          {/* Mensaje */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {destinoInfo.MENSAJE}
          </Text>

          {/* Info del pedido */}
          <View
            style={[styles.infoCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Folio
              </Text>
              <Text style={[styles.infoValue, { color: colors.accent }]}>
                {destinoInfo.FOLIO_SUGERIDO || "-"}
              </Text>
            </View>

            {destinoInfo.CAJA_ASIGNADA && (
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.textTertiary }]}
                >
                  Caja Asignada
                </Text>
                <Text style={[styles.infoValue, { color: "#10B981" }]}>
                  {destinoInfo.CAJA_ASIGNADA}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Unidades Pendientes
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {destinoInfo.UNIDADES_PENDIENTES}
              </Text>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            {isSeleccionCaja && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.accent },
                ]}
                onPress={onSelectCaja}
              >
                <Ionicons name="cube-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Seleccionar Caja</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                {isAutoAsignado ? "Entendido" : "Cerrar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  infoCard: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
