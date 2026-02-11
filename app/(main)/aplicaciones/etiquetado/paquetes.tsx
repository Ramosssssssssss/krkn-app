import BluetoothModal, { BluetoothModalRef } from "@/components/BluetoothModal";
import ScannerModal from "@/components/catalogos/ScannerModal";
import { API_CONFIG } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type TipoEtiqueta = "factura" | "traspaso" | "puntoVenta";

interface FolioData {
  folio: string;
  peso_embarque: number;
  sucursal: string;
  via_embarque: string;
  cliente: string;
  nombre_calle: string;
  colonia: string;
  ciudad: string;
  codigo_postal: string;
  Factura: string;
  tipoDetectado: TipoEtiqueta;
}

const LABEL_WIDTH = 600;
const LABEL_HEIGHT = 816;

const getTipoLabel = (tipo: TipoEtiqueta) => {
  switch (tipo) {
    case "traspaso":
      return "TRASPASO";
    case "puntoVenta":
      return "PUNTO DE VENTA";
    case "factura":
      return "FACTURA";
    default:
      return "DOCUMENTO";
  }
};

const getFechaActual = () => {
  const now = new Date();
  return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
};

interface LabelConfig {
  offsetX: number;
  offsetY: number;
  barcodeHeight: number;
  barcodeWidth: number;
  fontSize: number;
  addressFontSize: number;
  sdndFontSize: number;
}

const DEFAULT_CONFIG: LabelConfig = {
  offsetX: 0,
  offsetY: 0,
  barcodeHeight: 140,
  barcodeWidth: 3,
  fontSize: 40,
  addressFontSize: 28,
  sdndFontSize: 60,
};

interface Template {
  id: string;
  name: string;
  config: LabelConfig;
}

const ConfigStepper = ({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) => {
  const colors = useThemeColors();
  return (
    <View style={styles.configStepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.stepperValueText, { color: colors.text }]}>
          {value}
        </Text>
      </View>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[
            styles.miniBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => value > min && onChange(value - 1)}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.miniBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => value < max && onChange(value + 1)}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EtiquetasPaquetesScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const bluetoothRef = useRef<BluetoothModalRef>(null);

  const [folio, setFolio] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [folioData, setFolioData] = useState<FolioData | null>(null);
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Camera permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Refs for scanner detection
  const lastInputTime = useRef<number>(0);
  const scanTimeout = useRef<any>(null);
  const [paqueteActual, setPaqueteActual] = useState(1);
  const [totalPaquetes, setTotalPaquetes] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("default");
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<{
    name: string;
    id: string;
  } | null>(null);

  // Escuchar trigger de cámara desde el botón flotante
  const { onCameraTrigger } = useAssistive();

  useEffect(() => {
    const unsubscribe = onCameraTrigger(async () => {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert("Permiso de cámara requerido");
          return;
        }
      }
      setIsScannerVisible(true);
    });
    return unsubscribe;
  }, [cameraPermission]);

  const remitente = {
    empresa: "FYTTSA",
    direccion: "CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN",
    direccion2: "KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO,",
    ciudad: "ACOLMAN, 55885",
  };

  const sucursalLabel = folioData
    ? (
        folioData.sucursal || getTipoLabel(folioData.tipoDetectado)
      ).toUpperCase()
    : "";

  React.useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const [savedPrinter, savedConfig, savedTemplates] = await Promise.all([
        AsyncStorage.getItem("last_printer"),
        AsyncStorage.getItem("shipping_label_config"),
        AsyncStorage.getItem("shipping_label_templates"),
      ]);
      if (savedPrinter) setConnectedPrinter(JSON.parse(savedPrinter));
      if (savedConfig) setLabelConfig(JSON.parse(savedConfig));
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    } catch (e) {
      console.error("Error loading saved data:", e);
    }
  };

  const saveLabelConfig = async (newConfig: LabelConfig) => {
    try {
      setLabelConfig(newConfig);
      await AsyncStorage.setItem(
        "shipping_label_config",
        JSON.stringify(newConfig),
      );
    } catch (e) {
      console.error("Error saving config:", e);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      Alert.alert("Error", "Ingresa un nombre para la plantilla");
      return;
    }
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      config: labelConfig,
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    await AsyncStorage.setItem(
      "shipping_label_templates",
      JSON.stringify(updated),
    );
    setNewTemplateName("");
    Alert.alert("Éxito", "Plantilla guardada");
  };

  const applyTemplate = (template: Template | "default") => {
    if (template === "default") {
      saveLabelConfig(DEFAULT_CONFIG);
      setSelectedTemplateId("default");
    } else {
      saveLabelConfig(template.config);
      setSelectedTemplateId(template.id);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteTemplate = async (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    await AsyncStorage.setItem(
      "shipping_label_templates",
      JSON.stringify(updated),
    );
    if (selectedTemplateId === id) setSelectedTemplateId("default");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const buscarFolio = useCallback(
    async (folioValue?: string) => {
      const searchFolio = folioValue || folio;
      if (!searchFolio.trim()) {
        Alert.alert("Error", "Ingresa un folio");
        return;
      }
      const dbId = getCurrentDatabaseId();
      if (!dbId) {
        Alert.alert("Error", "No hay base de datos");
        return;
      }
      Keyboard.dismiss();
      setIsSearching(true);
      try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BUSCAR_FOLIO}?folio=${encodeURIComponent(searchFolio.trim())}&databaseId=${dbId}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.ok && data.data && data.data.length > 0) {
          setFolioData(data.data[0]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setFolioData(null);
          Alert.alert("No encontrado", "El folio no existe");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (e) {
        Alert.alert("Error de red");
      } finally {
        setIsSearching(false);
      }
    },
    [folio],
  );

  // Header Actions
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setIsBluetoothModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <Ionicons
              name="bluetooth-outline"
              size={22}
              color={connectedPrinter ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsTemplatesModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <Ionicons name="layers-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsConfigModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, connectedPrinter]);

  const generateZPL = (): string => {
    if (!folioData) return "";
    const { offsetX, offsetY, barcodeHeight, barcodeWidth, sdndFontSize } =
      labelConfig;
    const direccionDestino =
      `${folioData.nombre_calle || ""} ${folioData.colonia || ""} ${folioData.ciudad || ""} CP ${folioData.codigo_postal || ""}`
        .trim()
        .toUpperCase();
    const fecha = getFechaActual();

    // Logo FYTTSA Alta Fidelidad (Corrected Alignment 20 bytes/row)
    const logoHex = `^GFA,1600,1600,20,,000000000000000000000000000000000000000000001FF800000000000000000000000000003FFF00000000000000000000000000007FFF8000000000000000000000000000FFFFC000000000000000000000000000FFFFE000000000000000000000000001FFFF0000000000000000000000000001FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000003FFFF0000000000000000000000000001FFFF0000000000000000000000000001FFFF0000000000000000000000000000FFFFE000000000000000000000000000FFFFC0000000000000000000000000007FFF80000000000000000000000000003FFF0000000000040003FE001FF000001FF800000000001FF001FFF003FF80000F8000FF0000000003FFC003FFF807FFC0001FC01FFC0000000007FFE007FFFF0FFFFE0003FE03FFC000000000FFFF00FFFFF1FFFFF0007FF07FF8000000001FFFF01FFFFF3FFFFF800FFF0FFF0000000003FFFF03FFFFF7FFFFFC01FFF9FFF0000000003FFFF03FFFFF7FFFFFC01FFFBFFE0000000007FFFF87FFFFF7FFFFFE03FFFBFFE0000000007FFFF87FFFFF7FFFFFE03FFFFFFE0000000007FFFF87FFFFF7FFFFFE03FFFFFFF0000000007FFFF87FFFFF7FFFFFE03FFFFFFF000000000FFFFFCFFFFF7FFFFFE01FFFFFFF000000000FFFFFCFFFFFF7FFFFFE00FFFFFFF80000000007FFFF87FFFFF7FFFFFC007FFFFFF80000000003FFFF03FFFFF7FFFFF8003FFFFFF80000000001FFFF01FFFFF3FFFFF0001FFFFFFC0000000000FFF00FFFFF1FFFFE0000FFFFFFC00000000007FE007FFFF0FFFFC00003FFFFC00000000003FC003FFF807FF800001FFFF00000000001F8001FF8001F0000003FFC00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001FFFE00000000001FFFE00000000001FFFE00000000001C000000000000001C000000000000001C000000000000001FFFE00000000001FFFE00000000001FFFE00000000001C000000000000001C000000000000001C000000000000001C000000000000001C000000000000000000000000000000`;

    // ZPL como string continuo (SIN saltos de línea)
    let zpl = `^XA^CI28^PW${LABEL_WIDTH}^LL${LABEL_HEIGHT}`;
    zpl += `^FO${40 + offsetX},${20 + offsetY}${logoHex}^FS`;
    zpl += `^FO${210 + offsetX},${32 + offsetY}^A0N,18,18^FB360,2,0,R^FD${remitente.direccion}\\&${remitente.direccion2}\\&${remitente.ciudad}^FS`;
    zpl += `^FO30,115^GB540,0,1,B,1^FS`;
    zpl += `^FO${35 + offsetX},${125 + offsetY}^A0N,40,40^FB530,1,0,C^FD${sucursalLabel}^FS`;
    zpl += `^FO${35 + offsetX},${175 + offsetY}^A0N,28,28^FB530,3,0,C^FD${direccionDestino}^FS`;
    zpl += `^FO${35 + offsetX},${350 + offsetY}^A0N,${sdndFontSize},${sdndFontSize}^FB530,1,0,C^FDSD/ND^FS`;
    zpl += `^FO35,340^A0N,36,36^FDPAQ:^FS`;
    zpl += `^FO35,385^A0N,60,60^FD${paqueteActual}/${totalPaquetes}^FS`;
    zpl += `^FO500,355^A0N,22,22^FDPeso^FS`;
    zpl += `^FO45,505^GB60,60,4^FS`;
    zpl += `^FO120,500^A0N,80,80^FB360,1,0,C^FD${folioData.folio}^FS`;
    zpl += `^FO495,505^GB60,60,4^FS`;
    zpl += `^FO150,625^BY${barcodeWidth}^BCN,${barcodeHeight},N,N,N^FD${folioData.folio}^FS`;
    zpl += `^FO${35 + offsetX},${785 + offsetY}^A0N,18,18^FDpowered by black_sheep^FS`;
    zpl += `^FO${470 + offsetX},${785 + offsetY}^A0N,20,20^FD${fecha}^FS`;
    zpl += `^XZ`;

    console.log("ZPL Paquetes:", zpl.length, "chars");
    return zpl;
  };

  const handlePrint = async () => {
    if (!folioData) return;
    setIsPrinting(true);
    try {
      const zpl = generateZPL();
      const success = await bluetoothRef.current?.print(zpl);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert("Error de Impresión");
    } finally {
      setIsPrinting(false);
    }
  };

  const limpiar = () => {
    setFolio("");
    setFolioData(null);
    setPaqueteActual(1);
    setTotalPaquetes(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          Folio / Documento
        </Text>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="TC37615..."
            placeholderTextColor={colors.textTertiary}
            value={folio}
            onChangeText={(text) => {
              const now = Date.now();
              const timeDiff = now - lastInputTime.current;
              lastInputTime.current = now;

              // Si el texto contiene un salto de línea, procesar inmediatamente
              if (text.includes("\n") || text.includes("\r")) {
                if (scanTimeout.current) clearTimeout(scanTimeout.current);
                const cleanText = text.replace(/[\n\r]/g, "").trim();
                setFolio(cleanText);
                buscarFolio(cleanText);
                return;
              }

              // Limpiar para el estado visual
              const cleanText = text.replace(/[\n\r]/g, "");
              setFolio(cleanText);

              if (scanTimeout.current) clearTimeout(scanTimeout.current);

              // Si es un escaneo rápido, buscar automáticamente después de un pequeño delay
              if (timeDiff < 50 && cleanText.length > 1) {
                scanTimeout.current = setTimeout(() => {
                  buscarFolio(cleanText.trim());
                }, 300);
              }
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Enter") {
                if (scanTimeout.current) clearTimeout(scanTimeout.current);
                buscarFolio();
              }
            }}
            onSubmitEditing={() => {
              if (scanTimeout.current) clearTimeout(scanTimeout.current);
              buscarFolio();
            }}
            blurOnSubmit={false}
          />
          {folio.length > 0 && (
            <TouchableOpacity onPress={limpiar}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <TouchableOpacity
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!cameraPermission?.granted) {
                  const result = await requestCameraPermission();
                  if (!result.granted) {
                    Alert.alert("Permiso de cámara requerido");
                    return;
                  }
                }
                setIsScannerVisible(true);
              }}
            >
              <Ionicons name="camera-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.accent }]}
          onPress={() => buscarFolio()}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchBtnText}>BUSCAR FOLIO</Text>
          )}
        </TouchableOpacity>

        {folioData && (
          <>
            <Text style={styles.previewTitle}>VISTA PREVIA</Text>
            <View style={styles.labelCard}>
              <View style={styles.labelHeader}>
                <Image
                  source={require("../../../../assets/images/logo1.png")}
                  style={{ width: 80, height: 40 }}
                  resizeMode="contain"
                />
                <View style={styles.labelHeaderRight}>
                  <Text style={styles.labelHeaderText}>
                    {remitente.direccion}
                  </Text>
                  <Text style={styles.labelHeaderText}>
                    {remitente.direccion2}
                  </Text>
                  <Text style={styles.labelHeaderText}>{remitente.ciudad}</Text>
                </View>
              </View>
              <View style={styles.dottedLine} />
              <Text style={styles.labelTipo}>{sucursalLabel}</Text>
              <Text style={styles.labelDireccion}>
                {`${folioData.nombre_calle} ${folioData.colonia} ${folioData.ciudad}`.toUpperCase()}
              </Text>
              <View style={styles.centralContainer}>
                <View style={styles.paqSection}>
                  <Text style={styles.labelPaqHeader}>PAQ:</Text>
                  <Text style={styles.labelPaqValue}>
                    {paqueteActual}/{totalPaquetes}
                  </Text>
                </View>
                <View style={styles.folioSection}>
                  <Text
                    style={{
                      fontSize: labelConfig.sdndFontSize / 2.5,
                      fontWeight: "900",
                    }}
                  >
                    SD/ND
                  </Text>
                  <View style={styles.folioWithCheckboxes}>
                    <View style={styles.checkbox} />
                    <Text style={styles.labelFolio}>{folioData.folio}</Text>
                    <View style={styles.checkbox} />
                  </View>
                </View>
                <View style={styles.pesoSection}>
                  <Text style={styles.labelPr}>PR</Text>
                  <Text style={styles.labelPesoLabel}>Peso</Text>
                </View>
              </View>
              <View style={styles.barcodeContainer}>
                <View style={styles.barcodePlaceholder}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <View key={i} style={styles.barcodeLine} />
                  ))}
                </View>
              </View>
            </View>

            <View
              style={[styles.quantityCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.quantityLabel, { color: colors.textSecondary }]}
              >
                PAQUETES A IMPRIMIR
              </Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: colors.inputBackground },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (totalPaquetes > 1) {
                      setTotalPaquetes((p) => p - 1);
                      if (paqueteActual > totalPaquetes - 1)
                        setPaqueteActual(totalPaquetes - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.text }]}>
                  {totalPaquetes}
                </Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTotalPaquetes((p) => p + 1);
                  }}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.paqueteIndicator, { color: colors.accent }]}>
                {paqueteActual}/{totalPaquetes}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {folioData && (
        <View style={styles.footerPrint}>
          <TouchableOpacity
            style={[styles.printBtnMain, { backgroundColor: colors.accent }]}
            onPress={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.printBtnText}>IMPRIMIR ETIQUETA</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Config Modal */}
      <Modal visible={isConfigModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calibración de Etiqueta</Text>
              <TouchableOpacity onPress={() => setIsConfigModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ConfigStepper
                label="Offset Horizontal (X)"
                value={labelConfig.offsetX}
                min={-200}
                max={200}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, offsetX: v })
                }
              />
              <ConfigStepper
                label="Offset Vertical (Y)"
                value={labelConfig.offsetY}
                min={-200}
                max={200}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, offsetY: v })
                }
              />
              <ConfigStepper
                label="Altura Barcode"
                value={labelConfig.barcodeHeight}
                min={50}
                max={300}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, barcodeHeight: v })
                }
              />
              <ConfigStepper
                label="Ancho Barcode"
                value={labelConfig.barcodeWidth}
                min={1}
                max={5}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, barcodeWidth: v })
                }
              />
              <ConfigStepper
                label="Tamaño SD/ND"
                value={labelConfig.sdndFontSize}
                min={20}
                max={150}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, sdndFontSize: v })
                }
              />
              <ConfigStepper
                label="Tamaño Fuente Dir"
                value={labelConfig.addressFontSize}
                min={10}
                max={60}
                onChange={(v) =>
                  saveLabelConfig({ ...labelConfig, addressFontSize: v })
                }
              />

              <View
                style={[styles.saveTemplateBox, { borderColor: colors.border }]}
              >
                <TextInput
                  style={[
                    styles.templateInput,
                    { color: colors.text, backgroundColor: colors.surface },
                  ]}
                  placeholder="Nombre de nueva plantilla..."
                  value={newTemplateName}
                  onChangeText={setNewTemplateName}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSaveTemplate}
                >
                  <Text style={styles.saveBtnText}>Guardar Plantilla</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Templates Modal */}
      <Modal
        visible={isTemplatesModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plantillas Guardadas</Text>
              <TouchableOpacity
                onPress={() => setIsTemplatesModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.templateItem,
                  {
                    backgroundColor:
                      selectedTemplateId === "default"
                        ? `${colors.accent}15`
                        : colors.surface,
                    borderColor:
                      selectedTemplateId === "default"
                        ? colors.accent
                        : colors.border,
                  },
                ]}
                onPress={() => applyTemplate("default")}
              >
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: colors.text }]}>
                    Por Defecto (Original)
                  </Text>
                  <Text
                    style={[
                      styles.templateMeta,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Configuración inicial del sistema
                  </Text>
                </View>
                {selectedTemplateId === "default" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>

              {templates.map((template) => (
                <View key={template.id} style={[styles.templateItemWrap]}>
                  <TouchableOpacity
                    style={[
                      styles.templateItem,
                      {
                        flex: 1,
                        backgroundColor:
                          selectedTemplateId === template.id
                            ? `${colors.accent}15`
                            : colors.surface,
                        borderColor:
                          selectedTemplateId === template.id
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                    onPress={() => applyTemplate(template)}
                  >
                    <View style={styles.templateInfo}>
                      <Text
                        style={[styles.templateName, { color: colors.text }]}
                      >
                        {template.name}
                      </Text>
                      <Text
                        style={[
                          styles.templateMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        X: {template.config.offsetX}, Y:{" "}
                        {template.config.offsetY}, BC:{" "}
                        {template.config.barcodeHeight}
                      </Text>
                    </View>
                    {selectedTemplateId === template.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteTemplate(template.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {templates.length === 0 && (
                <View style={styles.emptyTemplates}>
                  <Ionicons
                    name="layers-outline"
                    size={40}
                    color={colors.textTertiary}
                  />
                  <Text style={{ color: colors.textTertiary, marginTop: 10 }}>
                    No tienes plantillas guardadas
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BluetoothModal
        ref={bluetoothRef}
        visible={isBluetoothModalVisible}
        onClose={() => setIsBluetoothModalVisible(false)}
        onDeviceConnect={(device) => {
          setConnectedPrinter(device);
          AsyncStorage.setItem("last_printer", JSON.stringify(device));
        }}
        onDeviceDisconnect={() => {
          setConnectedPrinter(null);
          AsyncStorage.removeItem("last_printer");
        }}
      />

      <ScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={(code) => {
          setFolio(code);
          buscarFolio(code);
          setIsScannerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  headerActions: { flexDirection: "row", gap: 10 },
  headerIconBtn: { padding: 5 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  searchBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  quantityCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 20,
  },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 32 },
  qtyBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qtyValue: {
    fontSize: 40,
    fontWeight: "800",
    minWidth: 80,
    textAlign: "center",
  },
  paqueteIndicator: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 25,
    marginBottom: 10,
  },
  labelCard: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1.5,
    width: 280,
    height: 380,
    alignSelf: "center",
  },
  labelHeader: { flexDirection: "row", justifyContent: "space-between" },
  labelHeaderRight: { flex: 1, marginLeft: 8 },
  labelHeaderText: { fontSize: 6.5, textAlign: "right" },
  dottedLine: {
    borderBottomWidth: 1,
    borderStyle: "dotted",
    marginVertical: 4,
  },
  labelTipo: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  labelDireccion: {
    fontSize: 11,
    textAlign: "center",
    height: 45,
    marginTop: 5,
  },
  centralContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  paqSection: { alignItems: "flex-start" },
  labelPaqHeader: { fontSize: 14, fontWeight: "800" },
  labelPaqValue: { fontSize: 20, fontWeight: "800" },
  folioSection: { flex: 1, alignItems: "center" },
  folioWithCheckboxes: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelFolio: { fontSize: 22, fontWeight: "900" },
  checkbox: { width: 20, height: 20, borderWidth: 1.5 },
  pesoSection: { alignItems: "flex-end" },
  labelPr: { fontSize: 12, fontWeight: "700" },
  labelPesoLabel: { fontSize: 10 },
  barcodeContainer: { alignItems: "center", marginTop: 15 },
  barcodePlaceholder: { flexDirection: "row", height: 50, gap: 1 },
  barcodeLine: { width: 4, height: "100%", backgroundColor: "#000" },
  footerPrint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  printBtnMain: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  printBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  configStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  stepperLabel: { fontSize: 13, marginBottom: 4 },
  stepperValueText: { fontSize: 20, fontWeight: "800" },
  stepperControls: { flexDirection: "row", gap: 12 },
  miniBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveTemplateBox: {
    marginTop: 20,
    padding: 15,
    borderTopWidth: 1,
    paddingTop: 30,
  },
  templateInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  templateItemWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: "700" },
  templateMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTemplates: { alignItems: "center", padding: 40 },
});
