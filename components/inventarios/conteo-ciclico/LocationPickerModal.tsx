/**
 * LocationPickerModal — Seleccion de Sucursal y Almacen (bottom sheet).
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Props {
  visible: boolean;
  sucursales: { id: number; nombre: string }[];
  almacenes: { id: number; nombre: string }[];
  selectedSucursal: number | null;
  selectedAlmacen: number | null;
  onSelectSucursal: (id: number) => void;
  onSelectAlmacen: (id: number) => void;
  onClose: () => void;
}

export default function LocationPickerModal({
  visible,
  sucursales,
  almacenes,
  selectedSucursal,
  selectedAlmacen,
  onSelectSucursal,
  onSelectAlmacen,
  onClose,
}: Props) {
  const colors = useThemeColors();
  const canClose = selectedSucursal != null && selectedAlmacen != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (canClose) onClose();
      }}
    >
      <View style={st.overlay}>
        <View style={[st.content, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[st.header, { borderBottomColor: colors.border }]}>
            <Text style={[st.title, { color: colors.text }]}>
              Seleccionar ubicación
            </Text>
            {canClose && (
              <TouchableOpacity
                style={[st.closeBtn, { backgroundColor: colors.accentLight }]}
                onPress={onClose}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={st.body}>
            {/* Sucursales */}
            <Text style={[st.label, { color: colors.textSecondary }]}>
              Sucursal
            </Text>
            {sucursales.map((suc) => (
              <TouchableOpacity
                key={suc.id}
                style={[
                  st.option,
                  {
                    backgroundColor: colors.background,
                    borderColor:
                      selectedSucursal === suc.id
                        ? colors.accent
                        : colors.border,
                  },
                  selectedSucursal === suc.id && { borderWidth: 2 },
                ]}
                onPress={() => onSelectSucursal(suc.id)}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={
                    selectedSucursal === suc.id
                      ? colors.accent
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    st.optionText,
                    {
                      color:
                        selectedSucursal === suc.id
                          ? colors.accent
                          : colors.text,
                    },
                  ]}
                >
                  {suc.nombre}
                </Text>
                {selectedSucursal === suc.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>
            ))}

            {/* Almacenes */}
            {selectedSucursal != null && (
              <View style={st.almSection}>
                <Text style={[st.label, { color: colors.textSecondary }]}>
                  Almacén
                </Text>
                {almacenes.map((alm) => (
                  <TouchableOpacity
                    key={alm.id}
                    style={[
                      st.option,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          selectedAlmacen === alm.id
                            ? colors.accent
                            : colors.border,
                      },
                      selectedAlmacen === alm.id && { borderWidth: 2 },
                    ]}
                    onPress={() => onSelectAlmacen(alm.id)}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={
                        selectedAlmacen === alm.id
                          ? colors.accent
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        st.optionText,
                        {
                          color:
                            selectedAlmacen === alm.id
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {alm.nombre}
                    </Text>
                    {selectedAlmacen === alm.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {canClose && (
            <View style={[st.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[st.confirmBtn, { backgroundColor: colors.accent }]}
                onPress={onClose}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={st.confirmTxt}>Seleccionar ubicación</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: "600" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  body: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  optionText: { flex: 1, fontSize: 14, fontWeight: "500" },
  almSection: { marginTop: 4 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  confirmTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
