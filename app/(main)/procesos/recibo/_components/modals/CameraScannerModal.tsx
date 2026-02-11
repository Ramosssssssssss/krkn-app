import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScanResult } from "../types";

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (result: { data: string }) => void;
  lastScanResult: ScanResult | null;
  topInset: number;
}

export function CameraScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
  lastScanResult,
  topInset,
}: CameraScannerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "code39", "ean13"],
          }}
        />

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingBottom: 16,
              gap: 12,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingTop: topInset + 12,
            }}
          >
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
                marginLeft: -8,
              }}
              onPress={onClose}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                flex: 1,
                color: "#fff",
              }}
            >
              Escanear Artículo
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 280,
                height: 280,
                borderWidth: 2,
                borderColor:
                  lastScanResult?.success === false ? "#EF4444" : "#fff",
                borderRadius: 24,
                backgroundColor: "transparent",
              }}
            />
            <Text
              style={{
                color: "#fff",
                marginTop: 24,
                textAlign: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              Apunta al código de barras
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
