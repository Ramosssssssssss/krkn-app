import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CameraScannerPickingProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (data: string) => void;
  topInset: number;
  title?: string;
  lastScanMessage?: string | null;
  lastScanSuccess?: boolean;
}

export function CameraScannerPicking({
  visible,
  onClose,
  onBarcodeScanned,
  topInset,
  title = "Escanear Artículo",
  lastScanMessage = null,
  lastScanSuccess = true,
}: CameraScannerPickingProps) {
  const handleBarcodeScan = ({ data }: { data: string }) => {
    onBarcodeScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "code128",
              "code39",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
            ],
          }}
        />

        <View style={styles.overlay}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: topInset + 12 }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Scan Frame */}
          <View style={styles.frameContainer}>
            <View
              style={[
                styles.scanFrame,
                {
                  borderColor: lastScanSuccess === false ? "#EF4444" : "#fff",
                },
              ]}
            />

            {/* Mensaje de último escaneo */}
            {lastScanMessage ? (
              <View
                style={[
                  styles.messageContainer,
                  {
                    backgroundColor: lastScanSuccess
                      ? "rgba(16, 185, 129, 0.9)"
                      : "rgba(239, 68, 68, 0.9)",
                  },
                ]}
              >
                <Ionicons
                  name={lastScanSuccess ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.messageText}>{lastScanMessage}</Text>
              </View>
            ) : (
              <Text style={styles.helpText}>
                Apunta al código de barras o QR
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    color: "#fff",
  },
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  helpText: {
    color: "#fff",
    marginTop: 24,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    fontSize: 14,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  messageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
