/**
 * DraftResumeModal — Pregunta si desea continuar con un movimiento en curso.
 * Genérico para entradas, salidas, conteo, solicitudes.
 */
import { useThemeColors } from "@/context/theme-context";
import type { MovimientoDraft } from "@/hooks/use-movimiento-draft";
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
  draft: MovimientoDraft | null;
  title?: string;
  onResume: () => void;
  onDiscard: () => void;
}

export default function MovimientoDraftModal({
  visible,
  draft,
  title = "Movimiento en curso",
  onResume,
  onDiscard,
}: Props) {
  const colors = useThemeColors();

  if (!draft) return null;

  const savedDate = new Date(draft.savedAt);
  const timeAgo = getTimeAgo(savedDate);
  const totalUnidades = draft.detalles.reduce((s, d) => s + d.cantidad, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDiscard}
    >
      <View style={st.overlay}>
        <View style={[st.content, { backgroundColor: colors.surface }]}>
          <View style={st.iconWrap}>
            <View style={[st.iconBox, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="document-text" size={36} color={colors.accent} />
            </View>
          </View>

          <Text style={[st.title, { color: colors.text }]}>{title}</Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>
            Tienes un borrador sin guardar de hace {timeAgo}. ¿Deseas continuar
            donde te quedaste?
          </Text>

          <View
            style={[
              st.summaryBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <SummaryRow
              icon="scan-outline"
              label="Artículos"
              value={String(draft.detalles.length)}
              colors={colors}
            />
            <SummaryRow
              icon="cube-outline"
              label="Unidades"
              value={String(totalUnidades)}
              colors={colors}
            />
            <View style={st.timeLine}>
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.textTertiary}
              />
              <Text style={[st.timeText, { color: colors.textTertiary }]}>
                Guardado:{" "}
                {savedDate.toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[st.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={onResume}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={st.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.secondaryBtn} onPress={onDiscard}>
            <Text
              style={[st.secondaryBtnText, { color: colors.textSecondary }]}
            >
              Descartar e iniciar nuevo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={st.summaryRow}>
      <View style={st.summaryRowLeft}>
        <Ionicons name={icon} size={16} color={colors.accent} />
        <Text style={[st.summaryLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text style={[st.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function getTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "unos segundos";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
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
  iconWrap: { marginBottom: 16 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  summaryBox: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  timeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  timeText: { fontSize: 11 },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: { marginTop: 14, padding: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: "500" },
});
