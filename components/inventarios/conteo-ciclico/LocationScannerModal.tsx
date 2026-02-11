/**
 * LocationScannerModal — Camera scanner for location barcodes.
 */
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (e: { data: string }) => void;
}

export default function LocationScannerModal({ visible, onClose, onScanned }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={onScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "code39", "ean13"],
          }}
        />

        <View style={st.overlay}>
          {/* Header */}
          <View style={[st.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={st.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={st.title}>Escanear Ubicación</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Frame */}
          <View style={st.frameBox}>
            <View style={[st.frame, { borderColor: colors.accent }]}>
              <View style={[st.corner, st.tl, { borderColor: colors.accent }]} />
              <View style={[st.corner, st.tr, { borderColor: colors.accent }]} />
              <View style={[st.corner, st.bl, { borderColor: colors.accent }]} />
              <View style={[st.corner, st.br, { borderColor: colors.accent }]} />
            </View>
            <Text style={st.hint}>Alinea el código de la ubicación</Text>
          </View>

          {/* Footer */}
          <View style={st.footer}>
            <Text style={st.footerText}>Buscando código...</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "space-between" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  frameBox: { alignItems: "center", justifyContent: "center" },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: "transparent",
    position: "relative",
  },
  corner: { position: "absolute", width: 40, height: 40, borderWidth: 4 },
  tl: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 24 },
  tr: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 24 },
  bl: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 24 },
  br: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 24 },
  hint: {
    color: "#fff",
    marginTop: 24,
    fontSize: 15,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  footer: { padding: 40, alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  footerText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
});
