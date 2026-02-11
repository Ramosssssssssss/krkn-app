/**
 * SummaryModal — Resumen del conteo antes de guardar.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  sucursalNombre: string;
  almacenNombre: string;
  ubicacion: string;
  totalArticulos: number;
  totalUnidades: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SummaryModal({
  visible,
  sucursalNombre,
  almacenNombre,
  ubicacion,
  totalArticulos,
  totalUnidades,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.overlay}>
        <View style={[st.content, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[st.header, { backgroundColor: colors.accent }]}>
            <Ionicons name="list" size={Platform.OS === "ios" ? 24 : 20} color="#fff" />
            <Text style={st.headerTitle}>Resumen de Conteo</Text>
          </View>

          {/* Body */}
          <View style={st.body}>
            <Row label="Sucursal" value={sucursalNombre} colors={colors} />
            <Row label="Almacén" value={almacenNombre} colors={colors} />
            {ubicacion ? (
              <Row label="Ubicación Inicial" value={ubicacion} colors={colors} accent />
            ) : null}
            <Row
              label="Fecha"
              value={new Date().toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              colors={colors}
            />
            <View style={[st.divider, { backgroundColor: colors.border }]} />
            <Row label="Artículos" value={String(totalArticulos)} colors={colors} big accent />
            <Row label="Unidades totales" value={String(totalUnidades)} colors={colors} big accent />
          </View>

          {/* Footer */}
          <View style={st.footer}>
            <TouchableOpacity
              style={[st.btn, st.cancelBtn, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={[st.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.btn, st.confirmBtn, { backgroundColor: colors.accent }, isSubmitting && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
              <Text style={st.confirmBtnText}>
                {isSubmitting ? "Guardando..." : "Confirmar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Helper ---------- */
function Row({
  label,
  value,
  colors,
  big,
  accent,
}: {
  label: string;
  value: string;
  colors: any;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={st.row}>
      <Text style={[st.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          big ? st.valueBig : st.value,
          { color: accent ? colors.accent : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  content: { width: "100%", maxWidth: 340, borderRadius: 16, overflow: "hidden" },
  header: { padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  body: { padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: "600" },
  valueBig: { fontSize: 17, fontWeight: "700" },
  divider: { height: 1, marginVertical: 8 },
  footer: { flexDirection: "row", padding: 16, paddingBottom: 20, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  cancelBtn: { borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
  confirmBtn: {},
  confirmBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
