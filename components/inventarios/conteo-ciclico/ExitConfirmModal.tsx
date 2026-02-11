/**
 * ExitConfirmModal — Confirmar salida del conteo con borrador.
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

export default function ExitConfirmModal({
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
        <View style={[st.content, { backgroundColor: colors.surface }]}>
          {/* Icon */}
          <View style={st.iconWrap}>
            <View
              style={[st.iconBox, { backgroundColor: `${colors.warning}20` }]}
            >
              <Ionicons name="alert-circle" size={38} color={colors.warning} />
            </View>
          </View>

          <Text style={[st.title, { color: colors.text }]}>
            ¿Salir del conteo?
          </Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>
            Tienes{" "}
            <Text style={{ fontWeight: "700", color: colors.accent }}>
              {totalArticulos} artículo{totalArticulos > 1 ? "s" : ""}
            </Text>{" "}
            con{" "}
            <Text style={{ fontWeight: "700", color: colors.accent }}>
              {totalUnidades} unidades
            </Text>{" "}
            escaneadas. ¿Qué deseas hacer?
          </Text>

          {/* Save draft */}
          <TouchableOpacity
            style={[st.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={onSaveDraft}
          >
            <Ionicons name="bookmark" size={18} color="#fff" />
            <Text style={st.primaryBtnText}>Guardar borrador</Text>
          </TouchableOpacity>

          {/* Discard */}
          <TouchableOpacity
            style={[st.destructiveBtn, { borderColor: "rgba(255,59,48,0.3)" }]}
            onPress={onDiscardExit}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={st.destructiveBtnText}>Salir sin guardar</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={st.cancelBtn} onPress={onCancel}>
            <Text style={[st.cancelBtnText, { color: colors.textSecondary }]}>
              Seguir contando
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
  content: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
  },
  iconWrap: { marginBottom: 16 },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  destructiveBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,59,48,0.06)",
    marginBottom: 6,
  },
  destructiveBtnText: { color: "#FF3B30", fontSize: 15, fontWeight: "600" },
  cancelBtn: { marginTop: 8, padding: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: "500" },
});
