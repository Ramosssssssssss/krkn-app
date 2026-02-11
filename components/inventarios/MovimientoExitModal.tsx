/**
 * MovimientoExitModal — Confirma la salida de pantalla cuando hay artículos pendientes.
 * Genérico para entradas, salidas, conteo, solicitudes.
 */
import { useThemeColors } from "@/context/theme-context";
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

interface Props {
  visible: boolean;
  totalArticulos: number;
  totalUnidades: number;
  onSaveDraft: () => void;
  onDiscardExit: () => void;
  onCancel: () => void;
}

export default function MovimientoExitModal({
  visible,
  totalArticulos,
  totalUnidades,
  onSaveDraft,
  onDiscardExit,
  onCancel,
}: Props) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={st.overlay}>
        <View style={[st.card, { backgroundColor: colors.surface }]}>
          {/* Ícono */}
          <View
            style={[st.iconBox, { backgroundColor: `${colors.warning}18` }]}
          >
            <Ionicons name="warning" size={36} color={colors.warning} />
          </View>

          <Text style={[st.title, { color: colors.text }]}>
            ¿Salir sin enviar?
          </Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>
            Tienes {totalArticulos} artículo{totalArticulos !== 1 ? "s" : ""} (
            {totalUnidades} unidad
            {totalUnidades !== 1 ? "es" : ""}) sin enviar. ¿Qué deseas hacer?
          </Text>

          {/* Guardar borrador */}
          <TouchableOpacity
            style={[st.btn, { backgroundColor: colors.accent }]}
            onPress={onSaveDraft}
          >
            <Ionicons name="bookmark" size={18} color="#fff" />
            <Text style={st.btnLabel}>Guardar borrador</Text>
          </TouchableOpacity>

          {/* Salir sin guardar */}
          <TouchableOpacity
            style={[st.btn, st.btnOutline, { borderColor: colors.error }]}
            onPress={onDiscardExit}
          >
            <Ionicons name="trash" size={18} color={colors.error} />
            <Text style={[st.btnLabel, { color: colors.error }]}>
              Salir sin guardar
            </Text>
          </TouchableOpacity>

          {/* Seguir */}
          <TouchableOpacity style={st.link} onPress={onCancel}>
            <Text style={[st.linkText, { color: colors.textSecondary }]}>
              Seguir editando
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: width * 0.88,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  btnLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  link: { marginTop: 6, padding: 8 },
  linkText: { fontSize: 14, fontWeight: "500" },
});
