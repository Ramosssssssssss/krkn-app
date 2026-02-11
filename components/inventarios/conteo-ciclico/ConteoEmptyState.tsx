/**
 * ConteoEmptyState — Empty state when no articles have been added.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  aggressiveScan: boolean;
}

export default function ConteoEmptyState({ aggressiveScan }: Props) {
  const colors = useThemeColors();

  return (
    <View style={st.container}>
      <View style={[st.icon, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="scan-outline" size={36} color={colors.accent} />
      </View>
      <Text style={[st.title, { color: colors.text }]}>
        {aggressiveScan ? "Listo para escanear" : "Busca artículos"}
      </Text>
      <Text style={[st.subtitle, { color: colors.textSecondary }]}>
        {aggressiveScan
          ? "Escanea códigos de barras con tu PDA"
          : "Escribe el código y presiona agregar"}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  icon: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  subtitle: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
