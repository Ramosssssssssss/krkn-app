import BluetoothModal, { BluetoothModalRef } from "@/components/BluetoothModal";
import ArticleSearchBar, {
    SearchResult,
} from "@/components/etiquetado/ArticleSearchBar";
import { useAssistive } from "@/context/assistive-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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

interface Articulo {
  id: number;
  nombre: string;
  sku: string;
  imagen: string;
}

interface ListItem extends Articulo {
  quantity: number;
}

interface LabelConfig {
  offsetX: number;
  offsetY: number;
  barcodeHeight: number;
  barcodeWidth: number;
  fontSize: number;
  textOffsetY: number;
}

const DEFAULT_CONFIG: LabelConfig = {
  offsetX: 5,
  offsetY: 20,
  barcodeHeight: 100,
  barcodeWidth: 7,
  fontSize: 65,
  textOffsetY: 135,
};

interface Template {
  id: string;
  name: string;
  config: LabelConfig;
  labelSize: string;
}

type InputMode = "articulo" | "libre";

export default function GeneradorEtiquetasScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const bluetoothRef = useRef<BluetoothModalRef>(null);
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(
    null,
  );

  // Input Mode State (libre vs articulo)
  const [inputMode, setInputMode] = useState<InputMode>("articulo");
  const [freeText, setFreeText] = useState("");

  // List Mode State
  const [isListMode, setIsListMode] = useState(false);
  const [productList, setProductList] = useState<ListItem[]>([]);
  const [previewProduct, setPreviewProduct] = useState<ListItem | null>(null);

  // Label Configuration State
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(DEFAULT_CONFIG);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("default");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);

  // Bluetooth State
  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<{
    name: string;
    id: string;
  } | null>(null);

  // Scanner State for Free Mode
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { onCameraTrigger } = useAssistive();

  // Camera trigger listener - only activates in libre mode
  useEffect(() => {
    const unsubscribe = onCameraTrigger(() => {
      if (inputMode === "libre") {
        setIsScannerVisible(true);
      }
      // In articulo mode, ArticleSearchBar handles it
    });
    return unsubscribe;
  }, [inputMode, cameraPermission]);

  // Handle barcode scan in free mode
  const handleFreeModeScan = (code: string) => {
    setFreeText(code);
    setIsScannerVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Persistencia de impresora y configuración
  React.useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const [savedPrinter, savedConfig, savedTemplates, savedSize] =
        await Promise.all([
          AsyncStorage.getItem("last_printer"),
          AsyncStorage.getItem("label_config"),
          AsyncStorage.getItem("label_templates"),
          AsyncStorage.getItem("label_size"),
        ]);

      if (savedPrinter) setConnectedPrinter(JSON.parse(savedPrinter));
      if (savedConfig) setLabelConfig(JSON.parse(savedConfig));
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
      if (savedSize) setSelectedSize(savedSize);
    } catch (e) {
      console.error("Error loading saved data:", e);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      Alert.alert("Error", "Ingresa un nombre para la plantilla");
      return;
    }

    const existingIndex = templates.findIndex(
      (t) => t.name.toLowerCase() === newTemplateName.trim().toLowerCase(),
    );

    const newTemplate: Template = {
      id:
        existingIndex >= 0
          ? templates[existingIndex].id
          : Date.now().toString(),
      name: newTemplateName.trim(),
      config: labelConfig,
      labelSize: selectedSize,
    };

    let updatedTemplates;
    if (existingIndex >= 0) {
      updatedTemplates = [...templates];
      updatedTemplates[existingIndex] = newTemplate;
      Alert.alert(
        "Actualizado",
        `Plantilla "${newTemplateName}" actualizada correctamente.`,
      );
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    setTemplates(updatedTemplates);
    await AsyncStorage.setItem(
      "label_templates",
      JSON.stringify(updatedTemplates),
    );
    setNewTemplateName("");
    setIsSavingTemplate(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteTemplate = async (templateId: string) => {
    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    await AsyncStorage.setItem(
      "label_templates",
      JSON.stringify(updatedTemplates),
    );
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("default");
      setLabelConfig(DEFAULT_CONFIG);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setLabelConfig(template.config);
      setSelectedSize(template.labelSize);
      setSelectedTemplateId(templateId);
      AsyncStorage.setItem("label_config", JSON.stringify(template.config));
      AsyncStorage.setItem("label_size", template.labelSize);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (templateId === "default") {
      setLabelConfig(DEFAULT_CONFIG);
      setSelectedTemplateId("default");
      AsyncStorage.setItem("label_config", JSON.stringify(DEFAULT_CONFIG));
    }
  };

  const saveLabelConfig = async (newConfig: LabelConfig) => {
    try {
      await AsyncStorage.setItem("label_config", JSON.stringify(newConfig));
      setLabelConfig(newConfig);
    } catch (e) {
      console.error("Error saving label config:", e);
    }
  };

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

  const [printQuantity, setPrintQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("10x2.5cm");
  const LABEL_SIZES = [
    { id: "7.5x2.5cm", label: "7.5 x 2.5 cm", width: 600 },
    { id: "10x2.5cm", label: "10 x 2.5 cm", width: 800 },
  ];
  const [isPrinting, setIsPrinting] = useState(false);
  const navigation = useNavigation();

  // Configuración de Header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setInputMode(inputMode === "articulo" ? "libre" : "articulo");
              // Limpiar al cambiar de modo
              if (inputMode === "articulo") {
                setSelectedArticulo(null);
              } else {
                setFreeText("");
              }
            }}
            style={styles.headerIconBtn}
          >
            <Ionicons
              name={
                inputMode === "articulo" ? "barcode-outline" : "create-outline"
              }
              size={22}
              color={colors.accent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const newMode = !isListMode;
              setIsListMode(newMode);
              if (newMode) setSelectedArticulo(null);
            }}
            style={styles.headerIconBtn}
          >
            <Ionicons
              name="list-outline"
              size={22}
              color={isListMode ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openBluetoothModal}
            style={styles.headerIconBtn}
          >
            <Ionicons
              name="bluetooth-outline"
              size={22}
              color={connectedPrinter ? colors.accent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsTemplatesModalVisible(true);
            }}
            style={styles.headerIconBtn}
          >
            <Ionicons name="layers-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsConfigModalVisible(true);
            }}
            style={styles.headerIconBtn}
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, connectedPrinter, isListMode, inputMode]);

  // Handler para cuando se selecciona un artículo desde ArticleSearchBar
  const handleSelectArticulo = (article: SearchResult) => {
    const articulo: Articulo = {
      id: article.id,
      nombre: article.nombre,
      sku: article.sku,
      imagen: article.imagen,
    };

    if (isListMode) {
      const existingIndex = productList.findIndex(
        (p) => p.sku === articulo.sku,
      );
      if (existingIndex >= 0) {
        setProductList((prev) =>
          prev.map((p, i) =>
            i === existingIndex ? { ...p, quantity: p.quantity + 1 } : p,
          ),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setProductList((prev) => [...prev, { ...articulo, quantity: 1 }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setSelectedArticulo(articulo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const incrementQty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrintQuantity((prev) => prev + 1);
  };

  const decrementQty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (printQuantity > 1) setPrintQuantity((prev) => prev - 1);
  };

  const openBluetoothModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBluetoothModalVisible(true);
  };

  const handlePrint = async () => {
    // Obtener el texto a imprimir según el modo
    const textToPrint =
      inputMode === "articulo" ? selectedArticulo?.sku : freeText.trim();

    if (!textToPrint) {
      Alert.alert(
        "Error",
        inputMode === "articulo"
          ? "Selecciona un artículo primero"
          : "Escribe un texto para imprimir",
      );
      return;
    }

    setIsPrinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Generar ZPL sin saltos de línea problemáticos
      const labelWidth = LABEL_SIZES.find(s => s.id === selectedSize)?.width || 800;
      const zpl =
        `^XA^CI28^PW${labelWidth}^LL200` +
        `^FO${labelConfig.offsetX},${labelConfig.offsetY}^BY${labelConfig.barcodeWidth}` +
        `^BCN,${labelConfig.barcodeHeight},N,N,N` +
        `^FD${textToPrint}^FS` +
        `^FO${labelConfig.offsetX},${labelConfig.textOffsetY}^A0N,${labelConfig.fontSize},${labelConfig.fontSize}` +
        `^FB${labelWidth - labelConfig.offsetX * 2},1,0,C^FD${textToPrint}^FS` +
        `^PQ${printQuantity}^XZ`;

      console.log("ZPL Length:", zpl.length, "chars");

      const printerResult = await bluetoothRef.current?.print(zpl);

      if (printerResult) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", "No se pudo enviar el comando a la impresora.");
      }

      setIsPrinting(false);
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert(
        "Error de Impresión",
        "No se pudo comunicar con la impresora.",
      );
      setIsPrinting(false);
    }
  };

  // List Mode Functions
  const incrementItemQty = (sku: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, quantity: p.quantity + 1 } : p)),
    );
  };

  const decrementItemQty = (sku: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) =>
      prev.map((p) =>
        p.sku === sku && p.quantity > 1
          ? { ...p, quantity: p.quantity - 1 }
          : p,
      ),
    );
  };

  const removeFromList = (sku: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) => prev.filter((p) => p.sku !== sku));
  };

  const handlePrintList = async () => {
    if (productList.length === 0) return;
    setIsPrinting(true);
    try {
      const labelWidth = LABEL_SIZES.find(s => s.id === selectedSize)?.width || 800;
      for (const product of productList) {
        const zpl =
          `^XA^CI28^PW${labelWidth}^LL200` +
          `^FO${labelConfig.offsetX},${labelConfig.offsetY}^BY${labelConfig.barcodeWidth}` +
          `^BCN,${labelConfig.barcodeHeight},N,N,N` +
          `^FD${product.sku}^FS` +
          `^FO${labelConfig.offsetX},${labelConfig.textOffsetY}^A0N,${labelConfig.fontSize},${labelConfig.fontSize}` +
          `^FB${labelWidth - labelConfig.offsetX * 2},1,0,C^FD${product.sku}^FS` +
          `^PQ${product.quantity}^XZ`;
        await bluetoothRef.current?.print(zpl);
      }
      const totalLabels = productList.reduce((sum, p) => sum + p.quantity, 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Éxito", `Se imprimieron ${totalLabels} etiquetas`);
      setProductList([]);
      setIsListMode(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo imprimir la lista");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* List Mode Indicator */}
        {isListMode && (
          <View
            style={[
              styles.listModeIndicator,
              { backgroundColor: `${colors.accent}15` },
            ]}
          >
            <Ionicons name="list" size={18} color={colors.accent} />
            <Text style={[styles.listModeText, { color: colors.accent }]}>
              Modo Lista Activo - Escanea productos para agregarlos
            </Text>
            {productList.length > 0 && (
              <View
                style={[styles.listBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.listBadgeText}>{productList.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* Mode Indicator */}
        <View
          style={[
            styles.listModeIndicator,
            {
              backgroundColor:
                inputMode === "libre"
                  ? `${colors.success}15`
                  : `${colors.accent}15`,
            },
          ]}
        >
          <Ionicons
            name={
              inputMode === "articulo" ? "barcode-outline" : "create-outline"
            }
            size={18}
            color={inputMode === "libre" ? colors.success : colors.accent}
          />
          <Text
            style={[
              styles.listModeText,
              { color: inputMode === "libre" ? colors.success : colors.accent },
            ]}
          >
            {inputMode === "articulo"
              ? "Modo Artículo - Busca productos"
              : "Modo Libre - Escribe cualquier texto"}
          </Text>
        </View>

        {/* Search Bar - Solo en modo artículo */}
        {inputMode === "articulo" && (
          <ArticleSearchBar
            placeholder="Buscar artículo por nombre o clave..."
            onSelectArticle={handleSelectArticulo}
            onClear={() => setSelectedArticulo(null)}
            autoSelectSingle={true}
            showResultsList={true}
          />
        )}

        {/* Free Text Input - Solo en modo libre */}
        {inputMode === "libre" && (
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="create-outline" size={18} color={colors.success} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Escribe el texto para la etiqueta..."
              placeholderTextColor={colors.textTertiary}
              value={freeText}
              onChangeText={setFreeText}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {freeText.length > 0 && (
              <TouchableOpacity
                onPress={() => setFreeText("")}
                style={{ marginRight: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setIsScannerVisible(true)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={colors.success}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Label Preview - Only show when not in list mode */}
        {!isListMode && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              VISTA PREVIA
            </Text>

            {/* Modo Artículo */}
            {inputMode === "articulo" && selectedArticulo ? (
              <View style={styles.labelPreviewContainer}>
                <View
                  style={[
                    styles.labelCard,
                    { backgroundColor: "#fff", borderColor: "#ccc" },
                  ]}
                >
                  <View style={styles.barcodeContainer}>
                    <Image
                      source={{
                        uri: `https://barcode.tec-it.com/barcode.ashx?data=${selectedArticulo.sku}&code=Code128&translate-esc=true`,
                      }}
                      style={styles.barcodeImage}
                      resizeMode="stretch"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.clearArticulo}
                  onPress={() => setSelectedArticulo(null)}
                >
                  <Ionicons
                    name="close-circle"
                    size={26}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            ) : inputMode === "libre" && freeText.trim() ? (
              /* Modo Libre con texto */
              <View style={styles.labelPreviewContainer}>
                <View
                  style={[
                    styles.labelCard,
                    { backgroundColor: "#fff", borderColor: "#ccc" },
                  ]}
                >
                  <View style={styles.barcodeContainer}>
                    <Image
                      source={{
                        uri: `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(freeText.trim())}&code=Code128&translate-esc=true`,
                      }}
                      style={styles.barcodeImage}
                      resizeMode="stretch"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.clearArticulo}
                  onPress={() => setFreeText("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={26}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyLabel,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={
                    inputMode === "articulo"
                      ? "pricetag-outline"
                      : "create-outline"
                  }
                  size={32}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  {inputMode === "articulo"
                    ? "Busca o escanea un producto para generar su etiqueta"
                    : "Escribe el texto que deseas imprimir"}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Lista de productos en modo lista */}
        {isListMode && productList.length > 0 && (
          <GestureHandlerRootView style={styles.listContainer}>
            <View
              style={[styles.listHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                🏷️ Etiquetas ({productList.length})
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text
                  style={[
                    styles.listHeaderSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {productList.reduce((sum, p) => sum + p.quantity, 0)} a
                  imprimir
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Limpiar Lista",
                      "¿Deseas eliminar todos los productos?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Limpiar",
                          style: "destructive",
                          onPress: () => {
                            setProductList([]);
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

            {productList.map((product) => {
              const renderRightActions = () => (
                <View style={styles.swipeActionsContainer}>
                  <TouchableOpacity
                    style={[styles.swipeAction, styles.swipeActionDelete]}
                    onPress={() => removeFromList(product.sku)}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.swipeActionText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              );

              return (
                <Swipeable
                  key={product.sku}
                  renderRightActions={renderRightActions}
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPreviewProduct(product);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="barcode"
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
                        {product.sku}
                      </Text>
                      <Text
                        style={[styles.productDesc, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {product.nombre}
                      </Text>
                    </View>

                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={[
                          styles.listQtyBtn,
                          { backgroundColor: colors.border },
                        ]}
                        onPress={() => decrementItemQty(product.sku)}
                      >
                        <Ionicons name="remove" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <Text
                        style={[styles.listQtyText, { color: colors.text }]}
                      >
                        {product.quantity}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.listQtyBtn,
                          { backgroundColor: colors.accent },
                        ]}
                        onPress={() => incrementItemQty(product.sku)}
                      >
                        <Ionicons name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Swipeable>
              );
            })}
          </GestureHandlerRootView>
        )}

        {/* New Reorganized Layout - Only show when not in list mode */}
        {!isListMode && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              ORDEN DE IMPRESIÓN
            </Text>

            {/* 1. Quantity Card */}
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
          </>
        )}

        {/* Templates Picker Quick Select - Only show when not in list mode */}
        {!isListMode && templates.length > 0 && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              PLANTILLAS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.templatesScroll}
            >
              <TouchableOpacity
                style={[
                  styles.templateChip,
                  selectedTemplateId === "default" && {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={() => applyTemplate("default")}
              >
                <Text
                  style={[
                    styles.templateChipText,
                    selectedTemplateId === "default" && { color: "#fff" },
                  ]}
                >
                  Predeterminado
                </Text>
              </TouchableOpacity>
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateChip,
                    selectedTemplateId === t.id && {
                      backgroundColor: colors.accent,
                    },
                  ]}
                  onPress={() => applyTemplate(t.id)}
                >
                  <Text
                    style={[
                      styles.templateChipText,
                      selectedTemplateId === t.id && { color: "#fff" },
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Print Button */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {isListMode ? (
          <TouchableOpacity
            style={[
              styles.printBtn,
              {
                backgroundColor:
                  productList.length > 0 ? colors.accent : colors.textTertiary,
              },
            ]}
            onPress={handlePrintList}
            disabled={productList.length === 0 || isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={styles.printBtnText}>
                  IMPRIMIR {productList.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                  ETIQUETAS
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.printBtn,
              {
                backgroundColor: (
                  inputMode === "articulo" ? selectedArticulo : freeText.trim()
                )
                  ? colors.accent
                  : colors.textTertiary,
              },
            ]}
            onPress={handlePrint}
            activeOpacity={0.8}
            disabled={
              !(inputMode === "articulo"
                ? selectedArticulo
                : freeText.trim()) || isPrinting
            }
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={styles.printBtnText}>
                  Imprimir {printQuantity}{" "}
                  {printQuantity === 1 ? "Etiqueta" : "Etiquetas"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Scanner Modal for Free Mode */}
      <Modal
        visible={isScannerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsScannerVisible(false)}
      >
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerModalContent}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Escanear Código</Text>
              <TouchableOpacity
                onPress={() => setIsScannerVisible(false)}
                style={styles.scannerCloseButton}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {cameraPermission?.granted ? (
              <CameraView
                style={styles.scannerCamera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "ean13",
                    "ean8",
                    "code128",
                    "code39",
                    "upc_a",
                    "upc_e",
                    "qr",
                  ],
                }}
                onBarcodeScanned={(result) => {
                  if (result.data) {
                    handleFreeModeScan(result.data);
                  }
                }}
              />
            ) : (
              <View style={styles.scannerPermissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#fff" />
                <Text style={styles.scannerPermissionText}>
                  Se requiere permiso de cámara
                </Text>
                <TouchableOpacity
                  style={styles.scannerPermissionButton}
                  onPress={requestCameraPermission}
                >
                  <Text style={styles.scannerPermissionButtonText}>
                    Dar Permiso
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.scannerFooter}>
              <Text style={styles.scannerFooterText}>
                Apunta al código de barras
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bluetooth Modal */}
      <BluetoothModal
        ref={bluetoothRef}
        visible={isBluetoothModalVisible}
        onClose={() => setIsBluetoothModalVisible(false)}
        onDeviceConnect={handlePrinterConnected}
        onDeviceDisconnect={handlePrinterDisconnected}
      />

      {/* Label Settings Modal */}
      <Modal
        visible={isConfigModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.configModalOverlay}>
          <View
            style={[
              styles.configModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.configModalHeader}>
              <Text style={[styles.configModalTitle, { color: colors.text }]}>
                Ajustes de Etiqueta
              </Text>
              <TouchableOpacity onPress={() => setIsConfigModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                      await AsyncStorage.setItem("label_size", size.id);
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
              <ConfigStepper
                label="Margen Izquierdo (X)"
                value={labelConfig.offsetX}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, offsetX: val })
                }
              />
              <ConfigStepper
                label="Margen Superior (Y)"
                value={labelConfig.offsetY}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, offsetY: val })
                }
              />
              <ConfigStepper
                label="Altura Código Barras"
                value={labelConfig.barcodeHeight}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, barcodeHeight: val })
                }
              />
              <ConfigStepper
                label="Grosor de Barras (1-10)"
                value={labelConfig.barcodeWidth}
                min={1}
                max={10}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, barcodeWidth: val })
                }
              />
              <ConfigStepper
                label="Tamaño de Fuente"
                value={labelConfig.fontSize}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, fontSize: val })
                }
              />
              <ConfigStepper
                label="Posición Texto (Y)"
                value={labelConfig.textOffsetY}
                onChange={(val) =>
                  saveLabelConfig({ ...labelConfig, textOffsetY: val })
                }
              />

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { borderColor: colors.error, marginTop: 20 },
                ]}
                onPress={() => {
                  Alert.alert(
                    "Restablecer",
                    "¿Deseas volver a los valores predeterminados?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Restablecer",
                        onPress: () => saveLabelConfig(DEFAULT_CONFIG),
                      },
                    ],
                  );
                }}
              >
                <Text style={[styles.resetButtonText, { color: colors.error }]}>
                  Restablecer Predeterminados
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.saveTemplateSection,
                  {
                    borderTopColor: colors.border,
                    marginTop: 24,
                    paddingTop: 20,
                  },
                ]}
              >
                <Text
                  style={[styles.stepperLabel, { color: colors.textSecondary }]}
                >
                  GUARDAR COMO PLANTILLA
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                >
                  Guarda los ajustes actuales con un nombre para usar después.
                </Text>
                <View style={styles.saveTemplateRow}>
                  <TextInput
                    style={[
                      styles.templateInput,
                      {
                        backgroundColor: colors.inputBackground,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Ej: Estante Grande..."
                    placeholderTextColor={colors.textTertiary}
                    value={newTemplateName}
                    onChangeText={setNewTemplateName}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                    onPress={handleSaveTemplate}
                  >
                    <Ionicons name="save-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.configModalFooter}>
              <TouchableOpacity
                style={[styles.saveBtnFull, { backgroundColor: colors.accent }]}
                onPress={() => setIsConfigModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Templates Modal */}
      <Modal
        visible={isTemplatesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTemplatesModalVisible(false)}
      >
        <View style={styles.configModalOverlay}>
          <View
            style={[
              styles.configModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.configModalHeader}>
              <Text style={[styles.configModalTitle, { color: colors.text }]}>
                Mis Plantillas
              </Text>
              <TouchableOpacity
                onPress={() => setIsTemplatesModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Predeterminada siempre al inicio */}
              <TouchableOpacity
                style={[
                  styles.manageTemplateRow,
                  selectedTemplateId === "default" && {
                    backgroundColor: `${colors.accent}10`,
                  },
                ]}
                onPress={() => {
                  applyTemplate("default");
                  setIsTemplatesModalVisible(false);
                }}
              >
                <View style={styles.templateInfoBtn}>
                  <Text
                    style={[
                      styles.manageTemplateName,
                      {
                        color:
                          selectedTemplateId === "default"
                            ? colors.accent
                            : colors.text,
                      },
                    ]}
                  >
                    Predeterminada
                  </Text>
                  <Text
                    style={[
                      styles.manageTemplateSize,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Configuración de fábrica
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

              {templates.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.manageTemplateRow,
                    selectedTemplateId === t.id && {
                      backgroundColor: `${colors.accent}10`,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.templateInfoBtn}
                    onPress={() => {
                      applyTemplate(t.id);
                      setNewTemplateName(t.name);
                      setIsTemplatesModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.manageTemplateName,
                        {
                          color:
                            selectedTemplateId === t.id
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                    >
                      {t.name}
                    </Text>
                    <Text
                      style={[
                        styles.manageTemplateSize,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {t.labelSize}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.templateActions}>
                    <TouchableOpacity
                      style={styles.deleteTemplateBtn}
                      onPress={() => {
                        Alert.alert(
                          "Eliminar",
                          `¿Borrar plantilla "${t.name}"?`,
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Eliminar",
                              onPress: () => deleteTemplate(t.id),
                              style: "destructive",
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
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Preview de Etiqueta */}
      <Modal
        visible={!!previewProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewProduct(null)}
      >
        <View style={styles.previewModalOverlay}>
          <View
            style={[
              styles.previewModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.previewModalHeader}>
              <Text style={[styles.previewModalTitle, { color: colors.text }]}>
                Vista Previa
              </Text>
              <TouchableOpacity onPress={() => setPreviewProduct(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {previewProduct && (
              <>
                <View
                  style={[styles.miniLabelPreview, { backgroundColor: "#fff" }]}
                >
                  <Image
                    source={{
                      uri: `https://barcode.tec-it.com/barcode.ashx?data=${previewProduct.sku}&code=Code128&translate-esc=true`,
                    }}
                    style={{ width: "100%", height: 60 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.miniLabelText}>{previewProduct.sku}</Text>
                </View>

                <View style={styles.previewModalInfo}>
                  <View style={styles.previewModalInfoRow}>
                    <Text
                      style={[
                        styles.previewModalInfoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Producto:
                    </Text>
                    <Text
                      style={[
                        styles.previewModalInfoValue,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {previewProduct.nombre}
                    </Text>
                  </View>
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
                      {previewProduct.quantity} etiquetas
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.previewModalBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setPreviewProduct(null)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.previewModalBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Sub-componente para los steppers de configuración
function ConfigStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 800,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
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
          style={[styles.miniBtn, { backgroundColor: colors.inputBackground }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (value > min) onChange(value - 1);
          }}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.miniBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (value < max) onChange(value + 1);
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  resultsContainer: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultsTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultSku: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  noResults: {
    padding: 20,
    textAlign: "center",
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 16,
    marginLeft: 4,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // Label Preview
  labelPreviewContainer: {
    position: "relative",
    marginBottom: 24,
  },
  labelCard: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 180,
  },
  clearArticulo: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  barcodeContainer: {
    width: "100%",
    height: 100,
    marginBottom: 10,
  },
  barcodeImage: {
    width: "100%",
    height: "100%",
  },
  labelClaveBottom: {
    fontSize: 22,
    fontWeight: "500",
    color: "#000",
    textAlign: "center",
    letterSpacing: 2,
  },
  emptyLabel: {
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 24,
    gap: 12,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Config Cards
  configCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  configIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  configInfo: {
    flex: 1,
    gap: 4,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
  },
  configValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  // Quantity
  quantityCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
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
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  printBtn: {
    flexDirection: "row",
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  printBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  // Nuevos estilos para Configuración
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 8,
  },
  gearButton: {
    padding: 8,
  },
  configModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  configModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  configModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  configModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  configStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: "700",
  },
  stepperControls: {
    flexDirection: "row",
    gap: 6,
  },
  miniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 40,
  },
  resetButtonText: {
    fontWeight: "600",
  },
  templatesScroll: {
    flexDirection: "row",
    marginBottom: 12,
    paddingLeft: 4,
  },
  templateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveTemplateSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  saveTemplateRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  templateInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  manageTemplateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    gap: 12,
  },
  templateInfoBtn: {
    flex: 1,
  },
  manageTemplateName: {
    fontSize: 15,
    fontWeight: "600",
  },
  manageTemplateSize: {
    fontSize: 12,
  },
  deleteTemplateBtn: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  configModalFooter: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    marginTop: 10,
  },
  saveBtnFull: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  templateActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  // List Mode Styles
  listModeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  listModeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  listBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContainer: {
    marginTop: 16,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  listHeaderSubtitle: {
    fontSize: 12,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  productImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productCode: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  productDesc: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 2,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listQtyText: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginRight: 16,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 16,
    marginLeft: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  swipeActionDelete: {
    backgroundColor: "#F43F5E",
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewIconOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4,
  },
  // Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewModalContent: {
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  previewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewModalInfo: {
    marginBottom: 16,
  },
  previewModalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  previewModalInfoLabel: {
    fontSize: 14,
  },
  previewModalInfoValue: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  previewModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  previewModalBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  miniLabelPreview: {
    borderRadius: 12,
    padding: 14,
    width: "100%",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLabelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginTop: 8,
    textAlign: "center",
    letterSpacing: 2,
  },
  // Scanner Modal Styles
  scannerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  scannerModalContent: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  scannerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerCamera: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  scannerPermissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  scannerPermissionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  scannerPermissionButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scannerPermissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  scannerFooter: {
    alignItems: "center",
    paddingVertical: 24,
  },
  scannerFooterText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
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
