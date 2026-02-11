import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EditProductModal from "./catalogos/EditProductModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Interfaz del artículo de la API
interface ArticuloAPI {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  UNIDAD_VENTA?: string;
  PRECIO_LISTA?: number;
  LINEA_NOMBRE?: string;
  CONTENIDO_EMPAQUE?: number;
  EXISTENCIA?: number;
  COSTO?: number;
  PRECIO_DISTRIBUIDOR?: number;
}

// Interfaz que espera EditProductModal
interface ArticuloModal {
  id: number;
  nombre: string;
  sku: string;
  barcode?: string;
  ubicacion: string;
  cantidad: number;
  imagen: string;
  categoria: string;
  precioLista?: number;
  precioDistribuidor?: number;
}

interface GlobalScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GlobalScannerModal({
  visible,
  onClose,
}: GlobalScannerModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [articulo, setArticulo] = useState<ArticuloAPI | null>(null);
  const [articuloModal, setArticuloModal] = useState<ArticuloModal | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convertir ArticuloAPI a ArticuloModal
  const convertToModalFormat = (art: ArticuloAPI): ArticuloModal => {
    const databaseId = getCurrentDatabaseId();
    return {
      id: art.ARTICULO_ID,
      nombre: art.NOMBRE,
      sku: art.CLAVE,
      barcode: art.CLAVE,
      ubicacion: "",
      cantidad: art.EXISTENCIA || 0,
      imagen: `${API_CONFIG.BASE_URL}/api/imagen-articulo.php?databaseId=${databaseId}&articuloId=${art.ARTICULO_ID}&pos=0`,
      categoria: art.LINEA_NOMBRE || "General",
      precioLista: art.PRECIO_LISTA,
      precioDistribuidor: art.PRECIO_DISTRIBUIDOR,
    };
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      setArticulo(null);
      setArticuloModal(null);
      setShowEditModal(false);
      setError(null);
      setIsLoading(false);
    }
  }, [visible]);

  // Request permission when modal opens
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isLoading) return;

    setIsScanning(false);
    setIsLoading(true);
    setError(null);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId) {
        setError("No hay una base de datos seleccionada");
        setIsLoading(false);
        return;
      }

      const url = `${API_CONFIG.BASE_URL}/api/articulos.php?busqueda=${encodeURIComponent(data.trim().toUpperCase())}&databaseId=${databaseId}`;
      const response = await fetch(url);
      const result = await response.json();

      const articulosEncontrados = result.articulos || result.data || [];

      if (result.ok && articulosEncontrados.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const artAPI = articulosEncontrados[0];
        setArticulo(artAPI);
        setArticuloModal(convertToModalFormat(artAPI));
        setShowEditModal(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(`Código "${data}" no encontrado`);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Error de conexión al buscar el artículo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanAgain = () => {
    setArticulo(null);
    setArticuloModal(null);
    setShowEditModal(false);
    setError(null);
    setIsScanning(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    // Después de cerrar el modal de edición, permitir escanear otro
    handleScanAgain();
  };

  const handleClose = () => {
    setIsScanning(false);
    setShowEditModal(false);
    onClose();
  };

  if (!permission?.granted && visible) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.permissionContainer}>
            <Ionicons
              name="camera-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.permissionText, { color: colors.text }]}>
              Necesitamos acceso a la cámara para escanear códigos
            </Text>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Permitir Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeTextButton}
              onPress={handleClose}
            >
              <Text
                style={[
                  styles.closeTextButtonLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Escanear Producto
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Camera or Result */}
        {isScanning && !articulo && !error ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
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
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Buscando producto...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={64}
                  color="#EF4444"
                />
                <Text style={[styles.errorText, { color: colors.text }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.scanAgainButton,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={handleScanAgain}
                >
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.scanAgainButtonText}>
                    Escanear de nuevo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : articulo ? (
              <View style={styles.loadingContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={colors.accent}
                />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Artículo encontrado
                </Text>
                <TouchableOpacity
                  style={[
                    styles.scanAgainButton,
                    { backgroundColor: colors.accent, marginTop: 20 },
                  ]}
                  onPress={handleScanAgain}
                >
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.scanAgainButtonText}>Escanear otro</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* EditProductModal */}
      <EditProductModal
        visible={showEditModal}
        articulo={articuloModal}
        onClose={handleCloseEditModal}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.5,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  cameraText: {
    color: "#fff",
    marginTop: 24,
    fontSize: 16,
    fontWeight: "500",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  scanAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  scanAgainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 20,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeTextButton: {
    marginTop: 10,
    padding: 10,
  },
  closeTextButtonLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
});
