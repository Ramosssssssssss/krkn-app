/**
 * UbicacionModal — Input de pasillo/estante con opcion de escanear.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  ubicacion: string;
  onChangeUbicacion: (text: string) => void;
  onFinish: () => void;
  onOpenScanner: () => void;
}

export default function UbicacionModal({
  visible,
  ubicacion,
  onChangeUbicacion,
  onFinish,
  onOpenScanner,
}: Props) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFinish}>
      <View style={st.overlay}>
        <View style={[st.content, { backgroundColor: colors.surface }]}>
          {/* Icon */}
          <View style={st.iconWrap}>
            <View style={[st.iconBox, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="navigate-circle" size={40} color={colors.accent} />
            </View>
          </View>

          <Text style={[st.title, { color: colors.text }]}>¿Dónde empezarás?</Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>
            Indica el pasillo, estante o zona de este almacén para organizar mejor tu conteo.
          </Text>

          {/* Input */}
          <View style={[st.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="grid-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[st.input, { color: colors.text }]}
              placeholder="Ej: Pasillo A, Estante 4..."
              placeholderTextColor={colors.textSecondary}
              value={ubicacion}
              onChangeText={(t) => onChangeUbicacion(t.replace(/\//g, "-").toUpperCase())}
              autoFocus
              onSubmitEditing={onFinish}
            />
            <TouchableOpacity
              style={[st.scanBtn, { backgroundColor: colors.accentLight }]}
              onPress={onOpenScanner}
            >
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <TouchableOpacity style={[st.startBtn, { backgroundColor: colors.accent }]} onPress={onFinish}>
            <Text style={st.startTxt}>Empezar a Escanear</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={st.skipBtn} onPress={onFinish}>
            <Text style={[st.skipTxt, { color: colors.textSecondary }]}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  content: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  iconWrap: { marginBottom: 16 },
  iconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 24,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "500" },
  scanBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  startBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  startTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  skipBtn: { marginTop: 16, padding: 8 },
  skipTxt: { fontSize: 14, fontWeight: "500", textDecorationLine: "underline" },
});
