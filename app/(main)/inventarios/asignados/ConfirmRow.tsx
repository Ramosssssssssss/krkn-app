import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { s } from "./styles";

interface ConfirmRowProps {
  icon: any;
  label: string;
  value: string;
  colors: any;
}

export function ConfirmRow({ icon, label, value, colors }: ConfirmRowProps) {
  return (
    <View style={s.confirmRow}>
      <Ionicons
        name={icon}
        size={18}
        color={colors.textTertiary}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[s.confirmLabel, { color: colors.textTertiary }]}>
          {label}
        </Text>
        <Text style={[s.confirmValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}
