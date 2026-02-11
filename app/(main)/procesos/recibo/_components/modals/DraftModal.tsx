import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DraftModalProps {
  visible: boolean;
  folio: string;
  timestamp: number;
  articulosTotal: number;
  articulosEscaneados: number;
  colors: any;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftModal({
  visible,
  folio,
  timestamp,
  articulosTotal,
  articulosEscaneados,
  colors,
  onRestore,
  onDiscard,
}: DraftModalProps) {
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "hace un momento";
    if (diffMins < 60)
      return `hace ${diffMins} minuto${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24)
      return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;

    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Icono */}
          <View style={[styles.iconCircle, { backgroundColor: "#3B82F620" }]}>
            <Ionicons name="document-text" size={32} color="#3B82F6" />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            Orden en Progreso
          </Text>

          {/* Info de la orden */}
          <View
            style={[styles.infoCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Orden
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {folio}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Progreso
              </Text>
              <Text style={[styles.infoValue, { color: colors.accent }]}>
                {articulosEscaneados} / {articulosTotal} artículos
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Guardado
              </Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                {formatTime(timestamp)}
              </Text>
            </View>
          </View>

          {/* Mensaje */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            ¿Deseas continuar donde te quedaste o empezar de nuevo?
          </Text>

          {/* Botones */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              onPress={onDiscard}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.btnSecondaryText,
                  { color: colors.textSecondary },
                ]}
              >
                Descartar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.accent }]}
              onPress={onRestore}
            >
              <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Continuar</Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoCard: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
