/**
 * OptionsActionSheet — iOS-style action sheet for editing location.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onChangeUbicacion: () => void;
  onChangeLocation: () => void;
}

export default function OptionsActionSheet({
  visible,
  onClose,
  onChangeUbicacion,
  onChangeLocation,
}: Props) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose}>
        <View style={st.container}>
          <View style={[st.group, { backgroundColor: colors.surface }]}>
            <View style={[st.header, { borderBottomColor: colors.border }]}>
              <Text style={[st.headerText, { color: colors.textSecondary }]}>
                EDITAR UBICACIÓN
              </Text>
              <Text style={[st.subText, { color: colors.textSecondary }]}>
                ¿Qué deseas modificar del conteo actual?
              </Text>
            </View>

            <TouchableOpacity
              style={[
                st.btn,
                { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={onChangeUbicacion}
            >
              <Ionicons name="grid-outline" size={20} color={colors.accent} />
              <Text style={[st.btnText, { color: colors.text }]}>
                Cambiar Pasillo / Estante
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.btn} onPress={onChangeLocation}>
              <Ionicons
                name="business-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={[st.btnText, { color: colors.text }]}>
                Cambiar Sucursal / Almacén
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[st.cancelBtn, { backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <Text style={[st.cancelText, { color: "#FF3B30" }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 10,
  },
  container: { width: "100%", paddingBottom: Platform.OS === "ios" ? 20 : 10 },
  group: { borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  header: { padding: 16, alignItems: "center", borderBottomWidth: 1 },
  headerText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subText: { fontSize: 12, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  btnText: { fontSize: 17, fontWeight: "400" },
  cancelBtn: {
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: { fontSize: 17, fontWeight: "600" },
});
