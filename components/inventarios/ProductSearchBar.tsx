import { useAssistive } from "@/context/assistive-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { forwardRef, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface ProductSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  isSearching: boolean;
  aggressiveScan: boolean;
  color: string;
  searchAndAddArticle?: (code: string) => void;
}

const ProductSearchBar = forwardRef<TextInput, ProductSearchBarProps>(
  (
    {
      value,
      onChangeText,
      onSubmitEditing,
      isSearching,
      aggressiveScan,
      color,
      searchAndAddArticle,
    },
    ref,
  ) => {
    const colors = useThemeColors();
    const [permission, requestPermission] = useCameraPermissions();
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const { onCameraTrigger } = useAssistive();

    const handleOpenScanner = async () => {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permiso requerido",
            "Necesitamos acceso a la cámara para escanear.",
          );
          return;
        }
      }
      setShowCameraScanner(true);
    };

    // Escuchar trigger de cámara desde el botón flotante
    useEffect(() => {
      const unsubscribe = onCameraTrigger(() => {
        handleOpenScanner();
      });
      return unsubscribe;
    }, [permission]);

    // Registro de los últimos códigos escaneados con su timestamp para evitar duplicados por ráfaga
    const lastScanned = React.useRef<Map<string, number>>(new Map());
    // Códigos acumulados en ráfaga
    const [stagedCodes, setStagedCodes] = useState<string[]>([]);

    const handleBarcodeScanned = ({ data }: { data: string }) => {
      if (!data) return;

      const now = Date.now();
      const lastTime = lastScanned.current.get(data) || 0;

      // Ignorar si el mismo código se escaneó hace menos de 1.2 segundos (evita spam accidental)
      if (now - lastTime < 1200) return;

      lastScanned.current.set(data, now);

      // Si es aggressiveScan (Modo Ráfaga), acumulamos
      if (aggressiveScan) {
        // Si ya está en la lista, ignorar completamente (sin vibración)
        if (stagedCodes.includes(data)) return;

        // Nuevo código: vibrar y añadir
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStagedCodes((prev) => [...prev, data]);
      } else {
        // Modo sencillo: vibrar, cerrar y poner en el input
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCameraScanner(false);
        onChangeText(data);
        setTimeout(() => {
          onSubmitEditing();
        }, 50);
      }
    };

    const handleCommitStaged = () => {
      if (stagedCodes.length === 0) return;
      
      // Pasar cada código al buscador
      stagedCodes.forEach(code => {
        searchAndAddArticle?.(code);
      });
      
      // Limpiar y cerrar
      setStagedCodes([]);
      setShowCameraScanner(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleRemoveStaged = (index: number) => {
      setStagedCodes(prev => prev.filter((_, i) => i !== index));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.searchInputWrapper,
            {
              backgroundColor: colors.background,
              borderColor: aggressiveScan ? color : colors.border,
            },
          ]}
        >
          <Ionicons
            name="barcode-outline"
            size={18}
            color={aggressiveScan ? color : colors.textSecondary}
          />
          <TextInput
            ref={ref}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={
              aggressiveScan ? "Esperando escaneo..." : "Buscar artículo..."
            }
            placeholderTextColor={colors.textTertiary}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            showSoftInputOnFocus={!aggressiveScan}
            blurOnSubmit={false}
            selectTextOnFocus
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={color} />
          ) : value.length > 0 ? (
            <TouchableOpacity onPress={() => onChangeText("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.scanIconBtn, { backgroundColor: colors.background }]}
            onPress={handleOpenScanner}
          >
            <Ionicons name="camera-outline" size={20} color={color} />
          </TouchableOpacity>
        </View>

        {/* Modal de Cámara */}
        <Modal
          visible={showCameraScanner}
          animationType="slide"
          onRequestClose={() => setShowCameraScanner(false)}
        >
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={
                showCameraScanner ? handleBarcodeScanned : undefined
              }
              barcodeScannerSettings={{
                barcodeTypes: [
                  "qr",
                  "ean13",
                  "ean8",
                  "code128",
                  "code39",
                  "upc_a",
                  "upc_e",
                ],
              }}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.cameraText}>
                  Apunta al código de barras
                </Text>

                {stagedCodes.length > 0 && (
                  <View style={styles.burstContainer}>
                    <View style={styles.burstHeader}>
                      <Ionicons name="list" size={20} color="#fff" />
                      <Text style={styles.burstTitle}>Códigos detectados ({stagedCodes.length})</Text>
                    </View>
                    <View style={styles.stagedListContainer}>
                      <View style={styles.pillsWrapper}>
                        {stagedCodes.map((code, idx) => (
                          <TouchableOpacity 
                            key={`${code}-${idx}`} 
                            style={styles.codePill}
                            onPress={() => handleRemoveStaged(idx)}
                          >
                            <Text style={styles.codePillText}>{code}</Text>
                            <Ionicons name="close-circle" size={14} color="#fff" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.commitBtn, { backgroundColor: color }]}
                      onPress={handleCommitStaged}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.commitBtnText}>Procesar Lote</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeCameraButton}
                  onPress={() => {
                    setStagedCodes([]);
                    setShowCameraScanner(false);
                  }}
                >
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        </Modal>
      </View>
    );
  },
);

ProductSearchBar.displayName = "ProductSearchBar";

export default ProductSearchBar;

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  scanIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  cameraText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 24,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeCameraButton: {
    position: "absolute",
    top: 50,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  burstContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  burstHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  burstTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  stagedListContainer: {
    maxHeight: 120,
    marginBottom: 16,
  },
  pillsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  codePillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  commitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    gap: 10,
  },
  commitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
