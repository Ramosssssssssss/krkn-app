import BluetoothModal, {
    BluetoothModalRef,
} from "@/components/BluetoothModal";
import { COMPANY_INFO } from "@/constants/company";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { generateTicketZPL } from "@/utils/ticket-printer";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TicketView, { TicketViewProps } from "./TicketView";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticketData: TicketViewProps;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Generate plain-text ticket for sharing via WhatsApp, etc. */
function generatePlainTicket(data: TicketViewProps): string {
  const W = 32;
  const pad = (l: string, r: string) => {
    const sp = W - l.length - r.length;
    return l + " ".repeat(Math.max(sp, 1)) + r;
  };
  const center = (t: string) => {
    const sp = W - t.length;
    return " ".repeat(Math.max(Math.floor(sp / 2), 0)) + t;
  };
  const line = (c = "-") => c.repeat(W);
  const trunc = (s: string, m: number) =>
    s.length > m ? s.substring(0, m - 1) + "." : s;

  const now = new Date();
  const fecha =
    data.fecha ||
    `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  const hora =
    data.hora ||
    `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  let t = "";
  t += center(COMPANY_INFO.nombre) + "\n";
  t += center(trunc(COMPANY_INFO.direccion, W)) + "\n";
  t += center(`RFC: ${COMPANY_INFO.rfc}`) + "\n";
  t += center(`TEL: ${COMPANY_INFO.telefono}`) + "\n";
  t += line("=") + "\n";
  t += pad("FOLIO:", data.folio || "V-0001") + "\n";
  t += pad("FECHA:", fecha) + "\n";
  t += pad("HORA:", hora) + "\n";
  t += line("-") + "\n";
  t += pad("CLIENTE:", trunc(data.cliente, W - 9)) + "\n";
  t += line("=") + "\n";
  t += "CANT  DESCRIPCION         IMPORTE\n";
  t += line("-") + "\n";

  let totalItems = 0;
  data.items.forEach((it) => {
    const lineTotal = it.precio * it.cantidad;
    totalItems += it.cantidad;
    const qtyStr = String(it.cantidad).padEnd(4);
    const priceStr = fmt(lineTotal).padStart(9);
    const descMaxLen = W - 4 - 1 - 9;
    const desc = trunc(it.clave + " " + it.descripcion, descMaxLen).padEnd(
      descMaxLen,
    );
    t += qtyStr + " " + desc + priceStr + "\n";
    if (it.cantidad > 1) {
      t += "      " + fmt(it.precio) + " c/u\n";
    }
  });

  const subtotal = data.total / 1.16;
  const iva = data.total - subtotal;

  t += line("-") + "\n";
  t += pad("SUBTOTAL:", fmt(subtotal)) + "\n";
  t += pad("IVA 16%:", fmt(iva)) + "\n";
  t += line("-") + "\n";
  t += pad("TOTAL:", fmt(data.total)) + "\n";
  t += pad("NO. ARTICULOS:", String(totalItems)) + "\n";
  t += line("=") + "\n";
  t += pad("FORMA PAGO:", data.metodoPago.toUpperCase()) + "\n";
  if (data.recibido && data.recibido > 0) {
    t += pad("RECIBIDO:", fmt(data.recibido)) + "\n";
  }
  if (data.cambio && data.cambio > 0) {
    t += pad("SU CAMBIO:", fmt(data.cambio)) + "\n";
  }
  t += line("-") + "\n";
  t += center("********************************") + "\n";
  t += center("GRACIAS POR SU COMPRA") + "\n";
  t += center("********************************") + "\n";
  t += center(COMPANY_INFO.website) + "\n";
  t += center(`${fecha} ${hora}`) + "\n";

  // Extra blank lines to flush printer buffer and advance paper
  t += "\n\n\n\n\n\n";

  return t;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function TicketModal({
  visible,
  onClose,
  ticketData,
}: TicketModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Bluetooth / Printer
  const bluetoothRef = useRef<BluetoothModalRef>(null);
  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load last connected printer
  useEffect(() => {
    AsyncStorage.getItem("last_printer").then((saved) => {
      if (saved) setConnectedPrinter(JSON.parse(saved));
    });
  }, []);

  const handlePrinterConnected = async (printer: {
    name: string;
    id: string;
  }) => {
    setConnectedPrinter(printer);
    try {
      await AsyncStorage.setItem("last_printer", JSON.stringify(printer));
    } catch (e) {
      console.error("Error saving printer:", e);
    }
  };

  const handlePrinterDisconnected = async () => {
    setConnectedPrinter(null);
    try {
      await AsyncStorage.removeItem("last_printer");
    } catch (e) {
      console.error("Error removing printer:", e);
    }
  };

  // ─── Print ticket ──────────────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!bluetoothRef.current?.isConnected) {
      Alert.alert(
        "Sin Impresora",
        "Conecta una impresora Bluetooth primero.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Conectar",
            onPress: () => setIsBluetoothModalVisible(true),
          },
        ],
      );
      return;
    }

    setIsPrinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Send as ZPL format — Ribetec printers in this app use ZPL mode
      const zplData = generateTicketZPL(ticketData);
      console.log("Sending ZPL Ticket...");

      const result = await bluetoothRef.current.print(zplData);

      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Impreso", "El ticket se envió a la impresora.");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "No se pudo enviar el ticket a la impresora.");
      }
    } catch (error: any) {
      console.error("Print error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error de Impresión",
        error?.message || "No se pudo comunicar con la impresora.",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // ─── Share ticket ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const txt = generatePlainTicket(ticketData);
      await Share.share({
        message: txt,
        title: `Ticket ${ticketData.folio || ""}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <BlurView intensity={isDark ? 40 : 60} tint="dark" style={s.overlay}>
          <View
            style={[
              s.container,
              {
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            {/* ── Header ─── */}
            <View style={s.header}>
              <TouchableOpacity
                onPress={onClose}
                style={s.headerBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Vista Previa Ticket</Text>
              <TouchableOpacity
                onPress={() => setIsBluetoothModalVisible(true)}
                style={[
                  s.headerBtn,
                  connectedPrinter && { backgroundColor: "#34C75930" },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="bluetooth"
                  size={18}
                  color={connectedPrinter ? "#34C759" : "#fff"}
                />
              </TouchableOpacity>
            </View>

            {/* Printer status pill */}
            {connectedPrinter && (
              <View style={s.printerPill}>
                <View style={s.printerDot} />
                <Text style={s.printerName}>{connectedPrinter.name}</Text>
              </View>
            )}

            {/* ── Ticket Paper ─── */}
            <View style={s.paperShadow}>
              <ScrollView
                style={s.paperScroll}
                contentContainerStyle={s.paperContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Top tear edge */}
                <View style={s.tearEdge}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <View key={i} style={s.tearTriangle} />
                  ))}
                </View>

                <TicketView {...ticketData} />

                {/* Bottom tear edge */}
                <View style={s.tearEdgeBottom}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <View key={i} style={s.tearTriangleBottom} />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── Actions ─── */}
            <View style={s.actions}>
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnPrimary]}
                onPress={handlePrint}
                activeOpacity={0.8}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={18} color="#fff" />
                    <Text style={s.actionTxtPrimary}>Imprimir</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnSecondary]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={18} color="#333" />
                <Text style={s.actionTxtSecondary}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Bluetooth Modal — same pattern as generador.tsx */}
      <BluetoothModal
        ref={bluetoothRef}
        visible={isBluetoothModalVisible}
        onClose={() => setIsBluetoothModalVisible(false)}
        onDeviceConnect={handlePrinterConnected}
        onDeviceDisconnect={handlePrinterDisconnected}
      />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // Printer status
  printerPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 6,
    marginTop: 4,
  },
  printerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
  printerName: {
    color: "#34C759",
    fontSize: 11,
    fontWeight: "600",
  },
  // Paper
  paperShadow: {
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  paperScroll: {
    flex: 1,
    backgroundColor: "#FAFAF8",
    borderRadius: 4,
  },
  paperContent: {
    paddingBottom: 0,
  },
  // Tear edges
  tearEdge: {
    flexDirection: "row",
    height: 8,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  tearTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FAFAF8",
  },
  tearEdgeBottom: {
    flexDirection: "row",
    height: 8,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  tearTriangleBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FAFAF8",
  },
  // Actions
  actions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: "#1a1a1a",
  },
  actionBtnSecondary: {
    backgroundColor: "#fff",
  },
  actionTxtPrimary: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  actionTxtSecondary: {
    color: "#333",
    fontWeight: "700",
    fontSize: 14,
  },
});
