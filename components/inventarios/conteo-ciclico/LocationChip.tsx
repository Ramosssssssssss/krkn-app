/**
 * LocationChip — Chip showing current sucursal, almacen and ubicacion.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  sucursalNombre: string;
  almacenNombre: string;
  ubicacion: string;
  onPress: () => void;
}

export default function LocationChip({
  sucursalNombre,
  almacenNombre,
  ubicacion,
  onPress,
}: Props) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        st.chip,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
    >
      <View style={[st.iconBox, { backgroundColor: `${colors.accent}15` }]}>
        <Ionicons name="location" size={18} color={colors.accent} />
      </View>
      <View style={st.textBox}>
        <Text
          style={[st.label, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {sucursalNombre} → {almacenNombre}
        </Text>
        <Text style={[st.ubicacion, { color: colors.text }]} numberOfLines={2}>
          {ubicacion ? (
            <>
              Ubicación:{" "}
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                {ubicacion}
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.textTertiary, fontStyle: "italic" }}>
              Sin ubicación específica
            </Text>
          )}
        </Text>
      </View>
      <Ionicons name="pencil-sharp" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textBox: { flex: 1, gap: 2 },
  label: {
    fontSize: 11,
    fontWeight: "400",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ubicacion: { fontSize: 14, fontWeight: "500" },
});
