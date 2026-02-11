import BluetoothModal, { BluetoothModalRef } from "@/components/BluetoothModal";
import ArticleSearchBar, {
    SearchResult,
} from "@/components/etiquetado/ArticleSearchBar";
import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    Swipeable,
} from "react-native-gesture-handler";

type ViewMode = "picker" | "search";
type CodeType = "barcode" | "qr";

interface Articulo {
  id: number;
  nombre: string;
  sku: string;
  imagen: string;
}

interface Ubicacion {
  almacenId: number;
  almacen: string;
  ubicacion: string;
  maximo: number;
  minimo: number;
  puntoReorden: number;
  selected?: boolean;
}

interface BarcodeConfig {
  offsetX: number;
  offsetY: number;
  barcodeHeight: number;
  barcodeWidth: number;
  fontSize: number;
  darkness: number;
}

interface QRConfig {
  offsetX: number;
  offsetY: number;
  qrSize: number;
  fontSize: number;
  darkness: number;
}

const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  offsetX: 0,
  offsetY: 0,
  barcodeHeight: 85,
  barcodeWidth: 3,
  fontSize: 30,
  darkness: 25,
};

const DEFAULT_QR_CONFIG: QRConfig = {
  offsetX: 0,
  offsetY: 0,
  qrSize: 6,
  fontSize: 45,
  darkness: 25,
};

interface Template {
  id: string;
  name: string;
  barcodeConfig: BarcodeConfig;
  qrConfig: QRConfig;
  codeType: CodeType;
}

interface UbicacionListItem {
  id: string;
  ubicacion: string;
  quantity: number;
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
          style={[styles.miniBtn, { backgroundColor: colors.surface }]}
          onPress={() => value > min && onChange(value - 1)}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.miniBtn, { backgroundColor: colors.surface }]}
          onPress={() => value < max && onChange(value + 1)}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function UbicacionesEtiquetasScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const bluetoothRef = useRef<BluetoothModalRef>(null);

  const [barcodeConfig, setBarcodeConfig] = useState<BarcodeConfig>(
    DEFAULT_BARCODE_CONFIG,
  );
  const [qrConfig, setQRConfig] = useState<QRConfig>(DEFAULT_QR_CONFIG);
  const [codeType, setCodeType] = useState<CodeType>("barcode");
  const [configTab, setConfigTab] = useState<CodeType>("barcode");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("default");
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("picker");
  const [pickerValues, setPickerValues] = useState(["", "", "", ""]);
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(
    null,
  );
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<{
    name: string;
    id: string;
  } | null>(null);

  // Lista deshabilitada por ahora
  const [isListMode, setIsListMode] = useState(false);
  const [ubicacionList, setUbicacionList] = useState<UbicacionListItem[]>([]);
  const [previewUbicacion, setPreviewUbicacion] =
    useState<UbicacionListItem | null>(null);

  // Tipo de ubicación: almacén (Piso-Nivel-Rack-Posición) o piso (Pasillo-Góndola-Nivel-Gancho)
  type UbicationType = "almacen" | "piso";
  const [ubicationType, setUbicationType] = useState<UbicationType>("almacen");

  // Tamaño de etiqueta
  const [selectedSize, setSelectedSize] = useState("10x2.5cm");
  const LABEL_SIZES = [
    { id: "7.5x2.5cm", label: "7.5 x 2.5 cm", width: 600 },
    { id: "10x2.5cm", label: "10 x 2.5 cm", width: 800 },
  ];

  const ubicationLabels =
    ubicationType === "almacen"
      ? ["Piso", "Nivel", "Rack", "Posición"]
      : ["Pasillo", "Góndola", "Nivel", "Gancho"];

  React.useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const [p, bc, qc, t, ct, st, labelSize] = await Promise.all([
        AsyncStorage.getItem("last_printer"),
        AsyncStorage.getItem("ubic_barcode_config"),
        AsyncStorage.getItem("ubic_qr_config"),
        AsyncStorage.getItem("ubic_templates"),
        AsyncStorage.getItem("ubic_code_type"),
        AsyncStorage.getItem("ubic_selected_template"),
        AsyncStorage.getItem("ubic_label_size"),
      ]);
      if (p) setConnectedPrinter(JSON.parse(p));
      if (bc) setBarcodeConfig(JSON.parse(bc));
      if (qc) setQRConfig(JSON.parse(qc));
      if (t) setTemplates(JSON.parse(t));
      if (ct) setCodeType(ct as CodeType);
      if (st) setSelectedTemplateId(st);
      if (labelSize) setSelectedSize(labelSize);
    } catch (e) {}
  };

  const saveBarcodeConfig = async (newConfig: BarcodeConfig) => {
    setBarcodeConfig(newConfig);
    await AsyncStorage.setItem(
      "ubic_barcode_config",
      JSON.stringify(newConfig),
    );
  };

  const saveQRConfig = async (newConfig: QRConfig) => {
    setQRConfig(newConfig);
    await AsyncStorage.setItem("ubic_qr_config", JSON.stringify(newConfig));
  };

  const saveCodeType = async (type: CodeType) => {
    setCodeType(type);
    await AsyncStorage.setItem("ubic_code_type", type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const incrementQty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrintQuantity((prev) => prev + 1);
  };

  const decrementQty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (printQuantity > 1) setPrintQuantity((prev) => prev - 1);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return Alert.alert("Error", "Nombre vacío");
    const newT: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      barcodeConfig,
      qrConfig,
      codeType,
    };
    const updated = [...templates, newT];
    setTemplates(updated);
    await AsyncStorage.setItem("ubic_templates", JSON.stringify(updated));
    setNewTemplateName("");
    Alert.alert("Éxito", "Guardada");
  };

  const applyTemplate = async (t: Template | "default") => {
    if (t === "default") {
      saveBarcodeConfig(DEFAULT_BARCODE_CONFIG);
      saveQRConfig(DEFAULT_QR_CONFIG);
      saveCodeType("barcode");
      setSelectedTemplateId("default");
      await AsyncStorage.setItem("ubic_selected_template", "default");
    } else {
      saveBarcodeConfig(t.barcodeConfig);
      saveQRConfig(t.qrConfig);
      saveCodeType(t.codeType);
      setSelectedTemplateId(t.id);
      await AsyncStorage.setItem("ubic_selected_template", t.id);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteTemplate = async (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    await AsyncStorage.setItem("ubic_templates", JSON.stringify(updated));
    if (selectedTemplateId === id) {
      setSelectedTemplateId("default");
      await AsyncStorage.setItem("ubic_selected_template", "default");
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setUbicationType(
                ubicationType === "almacen" ? "piso" : "almacen",
              );
            }}
          >
            <Ionicons
              name={
                ubicationType === "almacen"
                  ? "grid-outline"
                  : "storefront-outline"
              }
              size={22}
              color={
                ubicationType === "piso" ? colors.accent : colors.textTertiary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsBluetoothModalVisible(true)}
          >
            <Ionicons
              name="bluetooth-outline"
              size={22}
              color={connectedPrinter ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsTemplatesModalVisible(true)}
          >
            <Ionicons name="layers-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsConfigModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, connectedPrinter, ubicationType]);

  const handleInputChange = useCallback((index: number, text: string) => {
    // Solo permitir números y máximo 3 caracteres
    const sanitized = text.replace(/[^0-9]/g, "").slice(0, 3);
    setPickerValues((prev) => {
      if (prev[index] === sanitized) return prev;
      const nv = [...prev];
      nv[index] = sanitized;
      return nv;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const generateZPL = (ubic: string) => {
    // Etiqueta dinámica según tamaño seleccionado
    const LABEL_WIDTH = LABEL_SIZES.find(s => s.id === selectedSize)?.width || 800;
    const LABEL_HEIGHT = 200;
    const MARGIN = 12;
    const values = ubic.split("-");

    if (codeType === "barcode") {
      // ===== LAYOUT CÓDIGO DE BARRAS =====
      const {
        offsetX,
        offsetY,
        barcodeHeight,
        barcodeWidth,
        fontSize,
        darkness,
      } = barcodeConfig;

      let zpl = `^XA^CI28^MD${darkness}^PW${LABEL_WIDTH}^LL${LABEL_HEIGHT}`;

      // Calcular ancho aproximado del barcode para centrarlo
      const barcodeContentWidth = ubic.length * barcodeWidth * 11; // Aproximación Code128
      const barcodeX = (LABEL_WIDTH - barcodeContentWidth) / 2 - 50 + offsetX; // Más a la izquierda
      const barcodeY = MARGIN + 15 + offsetY; // Bajado
      zpl += `^FO${barcodeX},${barcodeY}^BY${barcodeWidth}^BCN,${barcodeHeight},N,N,N^FD${ubic}^FS`;

      // Números y labels abajo, centrados
      const colWidth = (LABEL_WIDTH - MARGIN * 2) / 4;
      const labelY = LABEL_HEIGHT - MARGIN - 16; // Labels hasta abajo
      const textY = labelY - fontSize - 4; // Números arriba de labels

      values.forEach((val, i) => {
        const centerX = MARGIN + i * colWidth + colWidth / 2;
        // Número centrado
        zpl += `^FO${centerX - fontSize / 2 + offsetX},${textY + offsetY}^A0N,${fontSize},${fontSize}^FD${val}^FS`;
        // Separador
        if (i < 3) {
          zpl += `^FO${centerX + colWidth / 2 - 8 + offsetX},${textY + offsetY}^A0N,${fontSize},${fontSize}^FD-^FS`;
        }
        // Label debajo
        const labelText = ubicationLabels[i];
        const labelOffset = labelText.length * 4;
        zpl += `^FO${centerX - labelOffset + offsetX},${labelY + offsetY}^A0N,16,16^FD${labelText}^FS`;
      });

      zpl += `^PQ${printQuantity}^XZ`;
      console.log("ZPL Barcode:", zpl.length, "chars");
      return zpl;
    } else {
      // ===== LAYOUT QR - QR izquierda, ubicación derecha =====
      const { offsetX, offsetY, qrSize, fontSize, darkness } = qrConfig;

      let zpl = `^XA^CI28^MD${darkness}^PW${LABEL_WIDTH}^LL${LABEL_HEIGHT}`;

      // QR a la izquierda, bajado
      const qrX = MARGIN + 15 + offsetX; // Un poco a la derecha
      const qrY = MARGIN + 25 + offsetY; // Bajado más
      zpl += `^FO${qrX},${qrY}^BQN,2,${qrSize}^FDQA,${ubic}^FS`;

      // Espacio para texto a la derecha del QR
      const textStartX = 170; // Después del QR
      const textAreaWidth = LABEL_WIDTH - textStartX - MARGIN;
      const colWidth = textAreaWidth / 4;

      // Centrar verticalmente números y labels, bajados
      const textY = LABEL_HEIGHT / 2 - fontSize + 15 + offsetY;
      const labelY = textY + fontSize + 6;

      values.forEach((val, i) => {
        const centerX = textStartX + i * colWidth + colWidth / 2;
        // Número
        zpl += `^FO${centerX - fontSize / 2 + offsetX},${textY}^A0N,${fontSize},${fontSize}^FD${val}^FS`;
        // Separador
        if (i < 3) {
          zpl += `^FO${centerX + colWidth / 2 - 6 + offsetX},${textY}^A0N,${fontSize},${fontSize}^FD-^FS`;
        }
        // Label debajo
        const labelText = ubicationLabels[i];
        const labelOffset = labelText.length * 3;
        zpl += `^FO${centerX - labelOffset + offsetX},${labelY}^A0N,14,14^FD${labelText}^FS`;
      });

      zpl += `^PQ${printQuantity}^XZ`;
      console.log("ZPL QR:", zpl.length, "chars");
      return zpl;
    }
  };

  const addToList = () => {
    const ubic = pickerValues.join("-");
    const existingIndex = ubicacionList.findIndex((p) => p.ubicacion === ubic);
    if (existingIndex >= 0) {
      setUbicacionList((prev) =>
        prev.map((p, i) =>
          i === existingIndex ? { ...p, quantity: p.quantity + 1 } : p,
        ),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setUbicacionList((prev) => [
        ...prev,
        { id: Date.now().toString(), ubicacion: ubic, quantity: 1 },
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const incrementItemQty = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUbicacionList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: p.quantity + 1 } : p)),
    );
  };

  const decrementItemQty = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUbicacionList((prev) =>
      prev.map((p) =>
        p.id === id && p.quantity > 1 ? { ...p, quantity: p.quantity - 1 } : p,
      ),
    );
  };

  const removeFromList = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUbicacionList((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePrintList = async () => {
    if (ubicacionList.length === 0) return;
    setIsPrinting(true);
    try {
      for (const item of ubicacionList) {
        // Generar ZPL usando la función existente pero con quantity del item
        const originalQty = printQuantity;
        setPrintQuantity(item.quantity);
        const zpl = generateZPL(item.ubicacion);
        setPrintQuantity(originalQty);
        await bluetoothRef.current?.print(zpl);
      }
      const totalLabels = ubicacionList.reduce((sum, p) => sum + p.quantity, 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Éxito", `Se imprimieron ${totalLabels} etiquetas`);
      setUbicacionList([]);
      setIsListMode(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo imprimir la lista");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = async (ubic: string) => {
    setIsPrinting(true);
    try {
      await bluetoothRef.current?.print(generateZPL(ubic));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintSelected = async () => {
    const selected = ubicaciones.filter((u) => u.selected);
    if (selected.length === 0) return Alert.alert("Error", "Nada seleccionado");
    setIsPrinting(true);
    try {
      for (const u of selected)
        await bluetoothRef.current?.print(generateZPL(u.ubicacion));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
    } finally {
      setIsPrinting(false);
    }
  };

  const fetchUbicaciones = async (id: number) => {
    setLoadingUbicaciones(true);
    try {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UBICACIONES_ARTICULO}?databaseId=${getCurrentDatabaseId()}&articuloId=${id}`,
      );
      const data = await res.json();
      if (data.ok)
        setUbicaciones(
          data.ubicaciones.map((u: any) => ({ ...u, selected: true })),
        );
    } catch (e) {
    } finally {
      setLoadingUbicaciones(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modeToggle, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            viewMode === "picker" && { backgroundColor: colors.accent },
          ]}
          onPress={() => setViewMode("picker")}
        >
          <Text
            style={{
              color: viewMode === "picker" ? "#fff" : colors.textSecondary,
            }}
          >
            Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            viewMode === "search" && { backgroundColor: colors.accent },
          ]}
          onPress={() => setViewMode("search")}
        >
          <Text
            style={{
              color: viewMode === "search" ? "#fff" : colors.textSecondary,
            }}
          >
            Por Artículo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Picker wheels fijos fuera del scroll */}
      {viewMode === "picker" && (
        <View style={styles.pickerSection}>
          <View style={styles.ubicTypeHeader}>
            <Ionicons
              name={
                ubicationType === "almacen"
                  ? "grid-outline"
                  : "storefront-outline"
              }
              size={20}
              color={colors.accent}
            />
            <Text
              style={[
                styles.pickerTitle,
                { color: colors.text, marginLeft: 8 },
              ]}
            >
              {ubicationType === "almacen"
                ? "Ubicación Almacén"
                : "Ubicación Piso de Venta"}
            </Text>
          </View>

          {/* Inputs de ubicación */}
          <View style={styles.inputsContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <View style={styles.inputWrapper}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    {ubicationLabels[i]}
                  </Text>
                  <TextInput
                    style={[
                      styles.ubicInput,
                      {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: colors.accent,
                      },
                    ]}
                    value={pickerValues[i]}
                    onChangeText={(text) => handleInputChange(i, text)}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="00"
                    placeholderTextColor={colors.textTertiary}
                    textAlign="center"
                  />
                </View>
                {i < 3 && (
                  <Text
                    style={[
                      styles.inputSeparator,
                      { color: colors.textTertiary },
                    ]}
                  >
                    -
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {viewMode === "picker" ? (
          <View style={{ alignItems: "center" }}>
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.codeSwitch}>
                <TouchableOpacity
                  style={[
                    styles.smallTypeBtn,
                    codeType === "barcode" && {
                      backgroundColor: colors.accent,
                    },
                  ]}
                  onPress={() => saveCodeType("barcode")}
                >
                  <Ionicons
                    name="barcode"
                    size={16}
                    color={codeType === "barcode" ? "#fff" : colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallTypeBtn,
                    codeType === "qr" && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => saveCodeType("qr")}
                >
                  <Ionicons
                    name="qr-code"
                    size={16}
                    color={codeType === "qr" ? "#fff" : colors.text}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.previewValuesRow}>
                {pickerValues.map((val, i) => (
                  <React.Fragment key={i}>
                    <View style={styles.previewValueColumn}>
                      <Text
                        style={[styles.previewValue, { color: colors.text }]}
                      >
                        {val}
                      </Text>
                      <Text
                        style={[
                          styles.previewLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {ubicationLabels[i]}
                      </Text>
                    </View>
                    {i < 3 && (
                      <Text
                        style={[
                          styles.previewSeparator,
                          { color: colors.textTertiary },
                        ]}
                      >
                        -
                      </Text>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Quantity Card */}
            <View
              style={[styles.quantityCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.quantityLabel, { color: colors.textSecondary }]}
              >
                CANTIDAD A IMPRIMIR
              </Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: colors.inputBackground },
                  ]}
                  onPress={decrementQty}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.text }]}>
                  {printQuantity}
                </Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.accent }]}
                  onPress={incrementQty}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista deshabilitada por ahora
            {isListMode && (
              <TouchableOpacity
                style={[
                  styles.addToListBtn,
                  { backgroundColor: colors.accent },
                ]}
                onPress={addToList}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  AGREGAR A LISTA
                </Text>
              </TouchableOpacity>
            )}
            */}

            {false && isListMode && ubicacionList.length > 0 && (
              <GestureHandlerRootView style={styles.listContainer}>
                <View
                  style={[
                    styles.listHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.listHeaderTitle, { color: colors.text }]}
                  >
                    Ubicaciones ({ubicacionList.length})
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={[
                        styles.listHeaderSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {ubicacionList.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                      etiquetas
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          "Limpiar Lista",
                          "¿Deseas eliminar todas las ubicaciones?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Limpiar",
                              style: "destructive",
                              onPress: () => {
                                setUbicacionList([]);
                                Haptics.notificationAsync(
                                  Haptics.NotificationFeedbackType.Warning,
                                );
                              },
                            },
                          ],
                        );
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {ubicacionList.map((item) => (
                  <Swipeable
                    key={item.id}
                    renderRightActions={() => (
                      <View style={styles.swipeActionsContainer}>
                        <TouchableOpacity
                          style={[styles.swipeAction, styles.swipeActionDelete]}
                          onPress={() => removeFromList(item.id)}
                        >
                          <Ionicons name="trash" size={18} color="#fff" />
                          <Text style={styles.swipeActionText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    overshootRight={false}
                    friction={2}
                  >
                    <View
                      style={[
                        styles.productCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.productImageWrapper,
                          { backgroundColor: colors.accent + "15" },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          setPreviewUbicacion(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="location"
                          size={28}
                          color={colors.accent}
                        />
                        <View style={styles.previewIconOverlay}>
                          <Ionicons name="eye" size={12} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.productInfo}>
                        <Text
                          style={[styles.productCode, { color: colors.accent }]}
                        >
                          {item.ubicacion}
                        </Text>
                        <Text
                          style={[
                            styles.productDesc,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.quantity} etiqueta(s)
                        </Text>
                      </View>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: colors.border },
                          ]}
                          onPress={() => decrementItemQty(item.id)}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: colors.text }]}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: colors.accent },
                          ]}
                          onPress={() => incrementItemQty(item.id)}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Swipeable>
                ))}
              </GestureHandlerRootView>
            )}
          </View>
        ) : (
          <>
            <ArticleSearchBar
              placeholder="Busca artículo..."
              onSelectArticle={(article: SearchResult) => {
                setSelectedArticulo({
                  id: article.id,
                  nombre: article.nombre,
                  sku: article.sku,
                  imagen: article.imagen,
                });
                fetchUbicaciones(article.id);
                Keyboard.dismiss();
              }}
              onClear={() => {
                setSelectedArticulo(null);
                setUbicaciones([]);
              }}
            />
            {selectedArticulo && (
              <View
                style={[
                  styles.selectedCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setSelectedArticulo(null)}
                  style={styles.closeArt}
                >
                  <Ionicons name="close" size={20} />
                </TouchableOpacity>
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {selectedArticulo.nombre}
                </Text>
                {loadingUbicaciones ? (
                  <ActivityIndicator style={{ margin: 20 }} />
                ) : (
                  ubicaciones.map((u, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.ubicRow,
                        u.selected && { borderColor: colors.accent },
                      ]}
                      onPress={() =>
                        setUbicaciones((prev) =>
                          prev.map((item, idx) =>
                            idx === i
                              ? { ...item, selected: !item.selected }
                              : item,
                          ),
                        )
                      }
                    >
                      <Text style={{ color: colors.text, fontSize: 18 }}>
                        {u.ubicacion}
                      </Text>
                      <Ionicons
                        name={u.selected ? "checkbox" : "square-outline"}
                        size={22}
                        color={u.selected ? colors.accent : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: Platform.OS === "ios" ? 34 : 16,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.printBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            if (
              viewMode === "picker" &&
              isListMode &&
              ubicacionList.length > 0
            ) {
              handlePrintList();
            } else if (viewMode === "picker") {
              handlePrint(pickerValues.join("-"));
            } else {
              handlePrintSelected();
            }
          }}
          disabled={isPrinting}
        >
          <Ionicons name="print" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {viewMode === "picker" && isListMode && ubicacionList.length > 0
              ? `IMPRIMIR ${ubicacionList.reduce((sum, p) => sum + p.quantity, 0)} ETIQUETAS`
              : viewMode === "search" &&
                  ubicaciones.filter((u) => u.selected).length > 0
                ? `IMPRIMIR (${ubicaciones.filter((u) => u.selected).length})`
                : "IMPRIMIR"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isConfigModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Configuración
              </Text>
              <TouchableOpacity onPress={() => setIsConfigModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs Barcode / QR */}
            <View
              style={[styles.configTabs, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[
                  styles.configTab,
                  configTab === "barcode" && { backgroundColor: colors.accent },
                ]}
                onPress={() => setConfigTab("barcode")}
              >
                <Ionicons
                  name="barcode"
                  size={18}
                  color={
                    configTab === "barcode" ? "#fff" : colors.textSecondary
                  }
                />
                <Text
                  style={{
                    color:
                      configTab === "barcode" ? "#fff" : colors.textSecondary,
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  Código Barras
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.configTab,
                  configTab === "qr" && { backgroundColor: colors.accent },
                ]}
                onPress={() => setConfigTab("qr")}
              >
                <Ionicons
                  name="qr-code"
                  size={18}
                  color={configTab === "qr" ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={{
                    color: configTab === "qr" ? "#fff" : colors.textSecondary,
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  QR
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 16 }}>
              {/* Selector de Tamaño de Etiqueta */}
              <Text
                style={[
                  styles.stepperLabel,
                  { color: colors.textSecondary, marginBottom: 8 },
                ]}
              >
                TAMAÑO DE ETIQUETA
              </Text>
              <View style={styles.sizeSelector}>
                {LABEL_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size.id}
                    style={[
                      styles.sizeOption,
                      {
                        backgroundColor:
                          selectedSize === size.id
                            ? colors.accent
                            : colors.inputBackground,
                        borderColor:
                          selectedSize === size.id
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                    onPress={async () => {
                      setSelectedSize(size.id);
                      await AsyncStorage.setItem("ubic_label_size", size.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text
                      style={[
                        styles.sizeOptionText,
                        {
                          color:
                            selectedSize === size.id ? "#fff" : colors.text,
                        },
                      ]}
                    >
                      {size.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 16 }} />
              {configTab === "barcode" ? (
                <>
                  <Text
                    style={[
                      styles.configSectionTitle,
                      { color: colors.accent },
                    ]}
                  >
                    Código de Barras
                  </Text>
                  <ConfigStepper
                    label="Offset X"
                    value={barcodeConfig.offsetX}
                    min={-100}
                    max={100}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, offsetX: v })
                    }
                  />
                  <ConfigStepper
                    label="Offset Y"
                    value={barcodeConfig.offsetY}
                    min={-100}
                    max={100}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, offsetY: v })
                    }
                  />
                  <ConfigStepper
                    label="Alto Barcode"
                    value={barcodeConfig.barcodeHeight}
                    min={20}
                    max={100}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, barcodeHeight: v })
                    }
                  />
                  <ConfigStepper
                    label="Ancho Barcode"
                    value={barcodeConfig.barcodeWidth}
                    min={1}
                    max={5}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, barcodeWidth: v })
                    }
                  />
                  <ConfigStepper
                    label="Tamaño Fuente"
                    value={barcodeConfig.fontSize}
                    min={16}
                    max={60}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, fontSize: v })
                    }
                  />
                  <ConfigStepper
                    label="Oscuridad"
                    value={barcodeConfig.darkness}
                    min={0}
                    max={30}
                    onChange={(v) =>
                      saveBarcodeConfig({ ...barcodeConfig, darkness: v })
                    }
                  />
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.configSectionTitle,
                      { color: colors.accent },
                    ]}
                  >
                    Código QR
                  </Text>
                  <ConfigStepper
                    label="Offset X"
                    value={qrConfig.offsetX}
                    min={-100}
                    max={100}
                    onChange={(v) => saveQRConfig({ ...qrConfig, offsetX: v })}
                  />
                  <ConfigStepper
                    label="Offset Y"
                    value={qrConfig.offsetY}
                    min={-100}
                    max={100}
                    onChange={(v) => saveQRConfig({ ...qrConfig, offsetY: v })}
                  />
                  <ConfigStepper
                    label="Tamaño QR"
                    value={qrConfig.qrSize}
                    min={2}
                    max={6}
                    onChange={(v) => saveQRConfig({ ...qrConfig, qrSize: v })}
                  />
                  <ConfigStepper
                    label="Tamaño Fuente"
                    value={qrConfig.fontSize}
                    min={16}
                    max={60}
                    onChange={(v) => saveQRConfig({ ...qrConfig, fontSize: v })}
                  />
                  <ConfigStepper
                    label="Oscuridad"
                    value={qrConfig.darkness}
                    min={0}
                    max={30}
                    onChange={(v) => saveQRConfig({ ...qrConfig, darkness: v })}
                  />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginTop: 20,
                  },
                ]}
                onPress={() => {
                  applyTemplate("default");
                  setIsConfigModalVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  REINICIAR CONFIGURACIÓN
                </Text>
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.templateInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Nombre plantilla..."
                placeholderTextColor={colors.textTertiary}
                value={newTemplateName}
                onChangeText={setNewTemplateName}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveTemplate}
              >
                <Text style={{ color: "#fff" }}>Guardar Plantilla</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isTemplatesModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background, maxHeight: "80%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plantillas</Text>
              <TouchableOpacity
                onPress={() => setIsTemplatesModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Input para nueva plantilla */}
            <View style={{ flexDirection: "row", marginBottom: 16, gap: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: colors.text,
                  backgroundColor: colors.surface,
                }}
                placeholder="Nombre de plantilla..."
                placeholderTextColor={colors.textTertiary}
                value={newTemplateName}
                onChangeText={setNewTemplateName}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: colors.accent,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  justifyContent: "center",
                }}
                onPress={handleSaveTemplate}
              >
                <Ionicons name="save" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {/* Plantilla por defecto */}
              <TouchableOpacity
                style={[
                  styles.tempItem,
                  {
                    backgroundColor:
                      selectedTemplateId === "default"
                        ? colors.accent + "20"
                        : colors.surface,
                    borderWidth: selectedTemplateId === "default" ? 1 : 0,
                    borderColor: colors.accent,
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: 12,
                  },
                ]}
                onPress={() => applyTemplate("default")}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 15,
                      }}
                    >
                      Por Defecto
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      Barcode: {DEFAULT_BARCODE_CONFIG.barcodeHeight}h,{" "}
                      {DEFAULT_BARCODE_CONFIG.barcodeWidth}w,{" "}
                      {DEFAULT_BARCODE_CONFIG.fontSize}f
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      QR: {DEFAULT_QR_CONFIG.qrSize}size,{" "}
                      {DEFAULT_QR_CONFIG.fontSize}f
                    </Text>
                  </View>
                  {selectedTemplateId === "default" && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.accent}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Plantillas guardadas */}
              {templates.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.tempRow,
                    {
                      backgroundColor:
                        selectedTemplateId === t.id
                          ? colors.accent + "20"
                          : colors.surface,
                      borderWidth: selectedTemplateId === t.id ? 1 : 0,
                      borderColor: colors.accent,
                      borderRadius: 8,
                      marginBottom: 8,
                      padding: 12,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => applyTemplate(t)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "600",
                              fontSize: 15,
                            }}
                          >
                            {t.name}
                          </Text>
                          <View
                            style={{
                              backgroundColor:
                                t.codeType === "barcode"
                                  ? colors.accent
                                  : colors.success,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: "600",
                              }}
                            >
                              {t.codeType === "barcode" ? "BARCODE" : "QR"}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          Barcode: {t.barcodeConfig.barcodeHeight}h,{" "}
                          {t.barcodeConfig.barcodeWidth}w,{" "}
                          {t.barcodeConfig.fontSize}f
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 11 }}
                        >
                          QR: {t.qrConfig.qrSize}size, {t.qrConfig.fontSize}f
                        </Text>
                      </View>
                      {selectedTemplateId === t.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.accent}
                          style={{ marginRight: 8 }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteTemplate(t.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {templates.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Ionicons
                    name="document-outline"
                    size={32}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    No hay plantillas guardadas.{"\n"}Usa el botón de guardar
                    para crear una.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!previewUbicacion}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUbicacion(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Vista Previa
              </Text>
              <TouchableOpacity onPress={() => setPreviewUbicacion(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {previewUbicacion && (
              <>
                <View
                  style={[styles.miniLabelPreview, { backgroundColor: "#fff" }]}
                >
                  {codeType === "barcode" ? (
                    <Image
                      source={{
                        uri: `https://barcode.tec-it.com/barcode.ashx?data=${previewUbicacion.ubicacion}&code=Code128&translate-esc=true`,
                      }}
                      style={{ width: "100%", height: 60 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${previewUbicacion.ubicacion}`,
                      }}
                      style={{ width: 80, height: 80, alignSelf: "center" }}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={styles.previewModalInfo}>
                  <View style={styles.previewModalInfoRow}>
                    <Text
                      style={[
                        styles.previewModalInfoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cantidad:
                    </Text>
                    <Text
                      style={[
                        styles.previewModalInfoValue,
                        { color: colors.accent },
                      ]}
                    >
                      {previewUbicacion.quantity} etiquetas
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.previewModalBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setPreviewUbicacion(null)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.previewModalBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  modeToggle: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  ubicTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  ubicTypeToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerLabels: {
    flexDirection: "row",
    marginBottom: 8,
  },
  pickerLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerLabel: {
    width: 65,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pickerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 0 },
  pickerSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 16,
    marginBottom: 12,
  },
  inputWrapper: {
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  ubicInput: {
    width: 70,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: "700",
  },
  inputSeparator: {
    fontSize: 28,
    fontWeight: "400",
    marginHorizontal: 4,
    marginTop: 20,
  },
  previewCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
  },
  previewValuesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  previewValueColumn: {
    alignItems: "center",
  },
  previewValue: { fontSize: 28, fontWeight: "900" },
  previewLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
  },
  previewSeparator: {
    fontSize: 22,
    fontWeight: "400",
    marginHorizontal: 6,
    marginTop: 4,
  },
  codeSwitch: { flexDirection: "row", gap: 10, marginBottom: 20 },
  smallTypeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  // Quantity Card
  quantityCard: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  resultsWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 2,
  },
  resultItem: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  resImg: { width: 40, height: 40, borderRadius: 8 },
  selectedCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  closeArt: { alignSelf: "flex-end", padding: 5 },
  ubicRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  printBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { borderRadius: 20, padding: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  configTabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  configTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  configSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  configStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  stepperLabel: { fontSize: 13 },
  stepperValueText: { fontSize: 20, fontWeight: "800" },
  stepperControls: { flexDirection: "row", gap: 10 },
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  templateInput: {
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  saveBtn: {
    height: 45,
    borderRadius: 10,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tempItem: { padding: 15, borderBottomWidth: 1, borderColor: "#eee" },
  tempRow: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  addToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  listContainer: { marginTop: 20, width: "100%" },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  listHeaderTitle: { fontSize: 16, fontWeight: "700" },
  listHeaderSubtitle: { fontSize: 13 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  productImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  productInfo: { flex: 1, marginLeft: 12 },
  productCode: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  productDesc: { fontSize: 12 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 6 },
  listQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    marginBottom: 8,
  },
  swipeAction: {
    height: "100%",
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  swipeActionDelete: { backgroundColor: "#E53935" },
  swipeActionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  previewIconOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLabelPreview: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginVertical: 16,
  },
  miniLabelText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  previewModalInfo: { marginBottom: 16 },
  previewModalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  previewModalInfoLabel: { fontSize: 14 },
  previewModalInfoValue: { fontSize: 14, fontWeight: "600" },
  previewModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  previewModalBtnText: { color: "#fff", fontWeight: "600" },
  sizeSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
