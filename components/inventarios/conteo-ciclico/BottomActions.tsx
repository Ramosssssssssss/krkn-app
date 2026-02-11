/**
 * BottomActions — Cancel / Save bottom bar for conteo.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  disabled: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function BottomActions({ disabled, onCancel, onSave }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        st.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        },
      ]}
    >
      <TouchableOpacity
        style={[st.btn, st.secondary, { borderColor: colors.border }]}
        onPress={onCancel}
      >
        <Text style={[st.secondaryText, { color: colors.textSecondary }]}>
          Cancelar
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          st.btn,
          st.primary,
          { backgroundColor: colors.accent },
          disabled && st.disabled,
        ]}
        onPress={onSave}
        disabled={disabled}
      >
        <Ionicons name="checkmark" size={18} color="#fff" />
        <Text style={st.primaryText}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondary: { borderWidth: 1, backgroundColor: "transparent" },
  secondaryText: { fontSize: 14, fontWeight: "600" },
  primary: {},
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
