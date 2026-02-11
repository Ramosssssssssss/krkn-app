import BluetoothModal, { BluetoothModalRef } from "@/components/BluetoothModal";
import { Bone } from "@/components/Skeleton";
import ArticleSearchBar, {
    SearchResult,
} from "@/components/etiquetado/ArticleSearchBar";
import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_SIZE = (width - 32 - GRID_GAP) / 2;

interface ApiPriceProduct {
  codigo: string;
  descripcion: string;
  unidad_venta: string;
  inventario_maximo: number;
  precio_lista_iva: number;
  precio_mayor_iva: number;
  estatus: string | null;
}

interface ListItem extends ApiPriceProduct {
  quantity: number;
}

interface LabelConfig {
  offsetX: number;
  offsetY: number;
  titleFontSize: number;
  priceFontSize: number;
  distFontSize: number;
}

const DEFAULT_CONFIG: LabelConfig = {
  offsetX: 10,
  offsetY: 10,
  titleFontSize: 28,
  priceFontSize: 75,
  distFontSize: 22,
};

interface Template {
  id: string;
  name: string;
  config: LabelConfig;
}

export default function EtiquetasPreciosScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const bluetoothRef = useRef<BluetoothModalRef>(null);
  const hasAutoSearched = useRef(false);

  const [selectedProduct, setSelectedProduct] =
    useState<ApiPriceProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const [labelConfig, setLabelConfig] = useState<LabelConfig>(DEFAULT_CONFIG);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("default");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);

  const [connectedPrinter, setConnectedPrinter] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [printQuantity, setPrintQuantity] = useState(1);

  // List Mode State
  const [isListMode, setIsListMode] = useState(false);
  const [productList, setProductList] = useState<ListItem[]>([]);
  const [previewProduct, setPreviewProduct] = useState<ListItem | null>(null);

  // Almacen Selection
  const {
    sucursales,
    almacenesFiltrados,
    selectedSucursal,
    selectedAlmacen,
    setSelectedSucursal,
    setSelectedAlmacen,
    isLoading: loadingAlms,
  } = useSucursalesAlmacenes();

  const [isAlmacenModalVisible, setIsAlmacenModalVisible] = useState(false);

  // Tamaño de etiqueta
  const [selectedSize, setSelectedSize] = useState("10x2.5cm");
  const LABEL_SIZES = [
    { id: "7.5x2.5cm", label: "7.5 x 2.5 cm", width: 600, height: 200 },
    { id: "10x2.5cm", label: "10 x 2.5 cm", width: 800, height: 200 },
  ];

  useEffect(() => {
    loadSavedData();
  }, []);

  // Auto-search when coming from another screen with a code
  useEffect(() => {
    if (codigo && selectedAlmacen && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      fetchProductDetails(codigo);
    }
  }, [codigo, selectedAlmacen]);

  const loadSavedData = async () => {
    const [
      savedPrinter,
      savedConfig,
      savedAlm,
      savedSuc,
      savedTemplates,
      savedSize,
    ] = await Promise.all([
      AsyncStorage.getItem("last_printer"),
      AsyncStorage.getItem("price_label_config"),
      AsyncStorage.getItem("preferred_almacen"),
      AsyncStorage.getItem("preferred_sucursal"),
      AsyncStorage.getItem("price_label_templates"),
      AsyncStorage.getItem("price_label_size"),
    ]);
    if (savedPrinter) setConnectedPrinter(JSON.parse(savedPrinter));
    if (savedConfig) setLabelConfig(JSON.parse(savedConfig));
    if (savedAlm) setSelectedAlmacen(Number(savedAlm));
    if (savedSuc) setSelectedSucursal(Number(savedSuc));
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedSize) setSelectedSize(savedSize);

    // Si no hay almacén guardado, mostrar modal al cargar
    if (!savedAlm) {
      setIsAlmacenModalVisible(true);
    }
  };

  const saveAlmacen = async (almId: number) => {
    setSelectedAlmacen(almId);
    await AsyncStorage.setItem("preferred_almacen", String(almId));
  };

  const saveSucursal = async (sucId: number) => {
    setSelectedSucursal(sucId);
    await AsyncStorage.setItem("preferred_sucursal", String(sucId));
  };

  // Template Functions
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
      "price_label_templates",
      JSON.stringify(updatedTemplates),
    );
    setNewTemplateName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteTemplate = async (templateId: string) => {
    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    await AsyncStorage.setItem(
      "price_label_templates",
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
      setSelectedTemplateId(templateId);
      AsyncStorage.setItem(
        "price_label_config",
        JSON.stringify(template.config),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (templateId === "default") {
      setLabelConfig(DEFAULT_CONFIG);
      setSelectedTemplateId("default");
      AsyncStorage.setItem(
        "price_label_config",
        JSON.stringify(DEFAULT_CONFIG),
      );
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

  React.useLayoutEffect(() => {
    const almacenNombre =
      almacenesFiltrados.find((a) => a.id === selectedAlmacen)?.nombre ||
      "Sel. Almacén";

    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const newMode = !isListMode;
              setIsListMode(newMode);
              if (newMode && selectedProduct) {
                // Pasar el producto actual a la lista
                setProductList((prev) => [
                  { ...selectedProduct, quantity: 1 },
                  ...prev,
                ]);
                setSelectedProduct(null);
              } else if (!newMode && productList.length > 0) {
                // Al salir de modo lista, pasar el primero a preview
                const firstProduct = productList[0];
                setSelectedProduct({
                  codigo: firstProduct.codigo,
                  descripcion: firstProduct.descripcion,
                  unidad_venta: firstProduct.unidad_venta,
                  inventario_maximo: firstProduct.inventario_maximo,
                  precio_lista_iva: firstProduct.precio_lista_iva,
                  precio_mayor_iva: firstProduct.precio_mayor_iva,
                  estatus: firstProduct.estatus,
                });
                setProductList((prev) => prev.slice(1));
              }
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
            onPress={() => setIsBluetoothModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <Ionicons
              name="bluetooth-outline"
              size={22}
              color={colors.accent}
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
            onPress={() => setIsConfigModalVisible(true)}
            style={styles.headerIconBtn}
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [
    navigation,
    colors,
    connectedPrinter,
    selectedAlmacen,
    almacenesFiltrados,
    isListMode,
    selectedProduct,
    productList,
  ]);

  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);

  const handleSelectArticle = useCallback(
    (article: SearchResult) => {
      fetchProductDetails(article.sku);
    },
    [selectedAlmacen, isListMode, productList],
  );

  const fetchProductDetails = async (codigo: string) => {
    if (!selectedAlmacen) {
      setIsAlmacenModalVisible(true);
      return;
    }
    setIsLoadingProduct(true);
    try {
      const databaseId = await getCurrentDatabaseId();
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ETIQUETAS_PISO}?codigo=${codigo}&almacen=${selectedAlmacen}`,
        {
          headers: { "x-tenant": String(databaseId || "") },
        },
      );
      const result = await response.json();
      if (result.ok && result.data && result.data.length > 0) {
        const product = result.data[0];
        if (isListMode) {
          const existingIndex = productList.findIndex(
            (p) => p.codigo === product.codigo,
          );
          if (existingIndex >= 0) {
            setProductList((prev) =>
              prev.map((p, i) =>
                i === existingIndex ? { ...p, quantity: p.quantity + 1 } : p,
              ),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            setProductList((prev) => [...prev, { ...product, quantity: 1 }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else {
          setSelectedProduct(product);
          setPrintQuantity(1);
        }
      } else {
        Alert.alert(
          "No encontrado",
          `No se encontró información para el código: ${codigo}`,
        );
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handlePrint = async () => {
    if (!selectedProduct) return;

    setIsPrinting(true);
    try {
      const dateStr = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      // ZPL recalibrated: Added QR Code in the middle
      const labelWidth =
        LABEL_SIZES.find((s) => s.id === selectedSize)?.width || 800;
      const zpl = `^XA
^CI28
^PW${labelWidth}
^LL300
^FO${labelConfig.offsetX},${labelConfig.offsetY}^A0N,${labelConfig.titleFontSize},${labelConfig.titleFontSize}^FB${labelWidth - 20},2,0,L^FD${selectedProduct.descripcion}^FS
^FO${labelConfig.offsetX},85^A0N,28,28^FB250,1,0,L^FD${selectedProduct.estatus || "G-68"}^FS
^FO${labelConfig.offsetX},115^A0N,28,28^FB250,1,0,L^FD${selectedProduct.estatus?.includes("A") ? "" : "A"}^FS
^FO${labelConfig.offsetX},145^A0N,32,32^FB250,1,0,L^FD${selectedProduct.unidad_venta}^FS
^FO${labelConfig.offsetX},230^A0N,28,28^FB300,1,0,L^FD${selectedProduct.codigo}^FS
^FO170,70^BQN,2,5^FDQA,${selectedProduct.codigo}^FS
^FO${labelWidth - 220},85^A0N,24,24^FB200,1,0,R^FD${dateStr}^FS
^FO${labelWidth - 380},110^A0N,${labelConfig.priceFontSize},${labelConfig.priceFontSize}^FB360,1,0,R^FD$${selectedProduct.precio_lista_iva.toFixed(2)}^FS
^FO${labelWidth - 250},230^A0N,${labelConfig.distFontSize},${labelConfig.distFontSize}^FB230,1,0,R^FDDist: $${selectedProduct.precio_mayor_iva.toFixed(2)}^FS
^PQ${printQuantity}
^XZ`;

      const success = await bluetoothRef.current?.print(zpl);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo imprimir");
    } finally {
      setIsPrinting(false);
    }
  };

  // Función para imprimir toda la lista
  const handlePrintList = async () => {
    if (productList.length === 0) return;

    setIsPrinting(true);
    try {
      const dateStr = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const labelWidth =
        LABEL_SIZES.find((s) => s.id === selectedSize)?.width || 800;

      for (const product of productList) {
        const zpl = `^XA
^CI28
^PW${labelWidth}
^LL300
^FO${labelConfig.offsetX},${labelConfig.offsetY}^A0N,${labelConfig.titleFontSize},${labelConfig.titleFontSize}^FB${labelWidth - 20},2,0,L^FD${product.descripcion}^FS
^FO${labelConfig.offsetX},85^A0N,28,28^FB250,1,0,L^FD${product.estatus || "G-68"}^FS
^FO${labelConfig.offsetX},115^A0N,28,28^FB250,1,0,L^FD${product.estatus?.includes("A") ? "" : "A"}^FS
^FO${labelConfig.offsetX},145^A0N,32,32^FB250,1,0,L^FD${product.unidad_venta}^FS
^FO${labelConfig.offsetX},230^A0N,28,28^FB300,1,0,L^FD${product.codigo}^FS
^FO170,70^BQN,2,5^FDQA,${product.codigo}^FS
^FO${labelWidth - 220},85^A0N,24,24^FB200,1,0,R^FD${dateStr}^FS
^FO${labelWidth - 380},110^A0N,${labelConfig.priceFontSize},${labelConfig.priceFontSize}^FB360,1,0,R^FD$${product.precio_lista_iva.toFixed(2)}^FS
^FO${labelWidth - 250},230^A0N,${labelConfig.distFontSize},${labelConfig.distFontSize}^FB230,1,0,R^FDDist: $${product.precio_mayor_iva.toFixed(2)}^FS
^PQ${product.quantity}
^XZ`;

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

  // Funciones para modificar cantidad en lista
  const incrementItemQty = (codigo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) =>
      prev.map((p) =>
        p.codigo === codigo ? { ...p, quantity: p.quantity + 1 } : p,
      ),
    );
  };

  const decrementItemQty = (codigo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) =>
      prev.map((p) =>
        p.codigo === codigo && p.quantity > 1
          ? { ...p, quantity: p.quantity - 1 }
          : p,
      ),
    );
  };

  const removeFromList = (codigo: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductList((prev) => prev.filter((p) => p.codigo !== codigo));
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

        {/* Search Bar */}
        <ArticleSearchBar
          placeholder="Código de artículo o ubicación..."
          onSelectArticle={handleSelectArticle}
          onClear={() => setSelectedProduct(null)}
          autoSelectSingle={true}
        />

        {isLoadingProduct && !selectedProduct && !isListMode ? (
          /* ─── Skeleton Loading ─── */
          <View style={{ marginTop: 16 }}>
            {/* Article header skeleton */}
            <View
              style={[
                styles.articleHeader,
                { backgroundColor: colors.surface },
              ]}
            >
              <Bone width={42} height={42} radius={12} />
              <View style={{ flex: 1, gap: 6 }}>
                <Bone width={100} height={10} radius={3} />
                <Bone width={180} height={14} radius={4} />
              </View>
            </View>
            {/* 2x2 Grid skeleton */}
            <View style={styles.priceGrid}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.priceCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Bone width={80} height={10} radius={3} />
                  <Bone width={100} height={28} radius={5} />
                  <Bone width={60} height={8} radius={3} />
                </View>
              ))}
            </View>
            {/* Label preview skeleton */}
            <View
              style={[
                styles.labelPreviewCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Bone width={120} height={10} radius={3} />
              <Bone width={"100%"} height={120} radius={10} />
            </View>
          </View>
        ) : selectedProduct && !isListMode ? (
          <View style={{ marginTop: 16 }}>
            {/* ─── Article Header ─── */}
            <View
              style={[
                styles.articleHeader,
                { backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[
                  styles.articleIcon,
                  { backgroundColor: `${colors.accent}12` },
                ]}
              >
                <Ionicons name="pricetag" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.articleSku, { color: colors.accent }]}>
                  {selectedProduct.codigo}
                </Text>
                <Text
                  style={[styles.articleName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {selectedProduct.descripcion}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* ─── 2x2 Price Grid ─── */}
            <View style={styles.priceGrid}>
              {/* Precio Lista */}
              <View
                style={[styles.priceCard, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.priceCardLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  PRECIO LISTA
                </Text>
                <Text
                  style={[styles.priceCardValue, { color: colors.success }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  ${selectedProduct.precio_lista_iva.toFixed(2)}
                </Text>
                <Text
                  style={[styles.priceCardSub, { color: colors.textTertiary }]}
                >
                  con IVA
                </Text>
              </View>
              {/* Precio Dist */}
              <View
                style={[styles.priceCard, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.priceCardLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  DISTRIBUIDOR
                </Text>
                <Text
                  style={[styles.priceCardValue, { color: colors.accent }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  ${selectedProduct.precio_mayor_iva.toFixed(2)}
                </Text>
                <Text
                  style={[styles.priceCardSub, { color: colors.textTertiary }]}
                >
                  mayoreo
                </Text>
              </View>
              {/* Unidad */}
              <View
                style={[styles.priceCard, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.priceCardLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  UNIDAD
                </Text>
                <Text style={[styles.priceCardValueMd, { color: colors.text }]}>
                  {selectedProduct.unidad_venta}
                </Text>
                <Text
                  style={[styles.priceCardSub, { color: colors.textTertiary }]}
                >
                  de venta
                </Text>
              </View>
              {/* Estatus */}
              <View
                style={[styles.priceCard, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.priceCardLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  ESTATUS
                </Text>
                <Text style={[styles.priceCardValueMd, { color: colors.text }]}>
                  {selectedProduct.estatus || "G-68"}
                </Text>
                <Text
                  style={[styles.priceCardSub, { color: colors.textTertiary }]}
                >
                  clasificación
                </Text>
              </View>
            </View>

            {/* ─── Label Preview ─── */}
            <View
              style={[
                styles.labelPreviewCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.labelPreviewTitle,
                  { color: colors.textTertiary },
                ]}
              >
                VISTA PREVIA ETIQUETA
              </Text>
              <View style={[styles.labelPreview, { backgroundColor: "#fff" }]}>
                <Text style={styles.labelTitle} numberOfLines={2}>
                  {selectedProduct.descripcion}
                </Text>
                <View style={styles.labelMainSection}>
                  <View style={styles.labelColumnLeft}>
                    <View>
                      <Text style={styles.labelHeavyText}>
                        {selectedProduct.estatus || "G-68"}
                      </Text>
                      <Text style={styles.labelHeavyText}>A</Text>
                      <Text style={styles.labelHeavyText}>
                        {selectedProduct.unidad_venta}
                      </Text>
                    </View>
                    <Text style={styles.labelHeavyText}>
                      {selectedProduct.codigo}
                    </Text>
                  </View>
                  <View style={styles.labelColumnCenter}>
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedProduct.codigo}`,
                      }}
                      style={styles.qrImage}
                    />
                  </View>
                  <View style={styles.labelColumnRight}>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.labelDateSmall}>
                        {new Date().toLocaleDateString("es-MX")}
                      </Text>
                      <Text
                        style={styles.labelPriceBig}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                      >
                        ${selectedProduct.precio_lista_iva.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.labelDistSmall}>
                      Dist: ${selectedProduct.precio_mayor_iva.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── Almacén + Cantidad ─── */}
            <TouchableOpacity
              style={[styles.settingsCard, { backgroundColor: colors.surface }]}
              onPress={() => setIsAlmacenModalVisible(true)}
            >
              <Text
                style={[styles.settingsLabel, { color: colors.textTertiary }]}
              >
                ALMACÉN SELECCIONADO
              </Text>
              <View style={styles.almacenDisplay}>
                <Text
                  style={[styles.almacenDisplayValue, { color: colors.text }]}
                >
                  {almacenesFiltrados.find((a) => a.id === selectedAlmacen)
                    ?.nombre || "Toque para seleccionar"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

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
                    styles.previewQtyBtn,
                    { backgroundColor: colors.inputBackground },
                  ]}
                  onPress={decrementQty}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.previewQtyValue, { color: colors.text }]}>
                  {printQuantity}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.previewQtyBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={incrementQty}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : !isListMode ? (
          <View style={styles.emptyWrap}>
            <View
              style={[styles.emptyCircle, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name="pricetag-outline"
                size={32}
                color={colors.textTertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Buscar artículo
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              Escanea o busca un código para ver sus precios y generar etiquetas
            </Text>
          </View>
        ) : null}

        {/* Lista de productos en modo lista */}
        {isListMode && productList.length > 0 && (
          <GestureHandlerRootView style={styles.listContainer}>
            <View
              style={[styles.listHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                Etiquetas ({productList.length})
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
                    name="refresh-outline"
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
                    onPress={() => removeFromList(product.codigo)}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.swipeActionText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              );

              return (
                <Swipeable
                  key={product.codigo}
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
                        name="pricetag"
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
                        {product.codigo}
                      </Text>
                      <Text
                        style={[styles.productDesc, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {product.descripcion}
                      </Text>
                      <View style={styles.productMeta}>
                        <Text
                          style={[
                            styles.productUnit,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {product.unidad_venta}
                        </Text>
                        <View
                          style={[
                            styles.priceBadge,
                            { backgroundColor: colors.accent + "15" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priceBadgeText,
                              { color: colors.accent },
                            ]}
                          >
                            ${product.precio_lista_iva.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { backgroundColor: colors.border },
                        ]}
                        onPress={() => decrementItemQty(product.codigo)}
                      >
                        <Ionicons name="remove" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>
                        {product.quantity}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { backgroundColor: colors.accent },
                        ]}
                        onPress={() => incrementItemQty(product.codigo)}
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
      </ScrollView>

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
              <Text style={styles.printBtnText}>
                IMPRIMIR {productList.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                ETIQUETAS
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.printBtn,
              {
                backgroundColor: selectedProduct
                  ? colors.accent
                  : colors.textTertiary,
              },
            ]}
            onPress={handlePrint}
            disabled={!selectedProduct || isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.printBtnText}>
                IMPRIMIR {printQuantity > 1 ? `${printQuantity} ` : ""}
                ETIQUETA{printQuantity > 1 ? "S" : ""}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <BluetoothModal
        ref={bluetoothRef}
        visible={isBluetoothModalVisible}
        onClose={() => setIsBluetoothModalVisible(false)}
        onDeviceConnect={(d) => {
          setConnectedPrinter(d);
          AsyncStorage.setItem("last_printer", JSON.stringify(d));
        }}
        onDeviceDisconnect={() => {
          setConnectedPrinter(null);
          AsyncStorage.removeItem("last_printer");
        }}
      />

      {/* Modal de Selección de Almacén */}
      <Modal visible={isAlmacenModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, maxHeight: "80%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ubicación de Precios
              </Text>
              <TouchableOpacity onPress={() => setIsAlmacenModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                Sucursal
              </Text>
              <View style={styles.optionGrid}>
                {sucursales.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.optionBtn,
                      {
                        borderColor:
                          selectedSucursal === s.id
                            ? colors.accent
                            : colors.border,
                      },
                      selectedSucursal === s.id && {
                        backgroundColor: `${colors.accent}10`,
                      },
                    ]}
                    onPress={() => saveSucursal(s.id)}
                  >
                    <Text
                      style={{
                        color:
                          selectedSucursal === s.id
                            ? colors.accent
                            : colors.text,
                      }}
                    >
                      {s.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedSucursal && (
                <>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.textSecondary, marginTop: 20 },
                    ]}
                  >
                    Almacén
                  </Text>
                  <View style={styles.optionGrid}>
                    {almacenesFiltrados.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.optionBtn,
                          {
                            borderColor:
                              selectedAlmacen === a.id
                                ? colors.accent
                                : colors.border,
                          },
                          selectedAlmacen === a.id && {
                            backgroundColor: `${colors.accent}10`,
                          },
                        ]}
                        onPress={() => {
                          saveAlmacen(a.id);
                          setIsAlmacenModalVisible(false);
                        }}
                      >
                        <Text
                          style={{
                            color:
                              selectedAlmacen === a.id
                                ? colors.accent
                                : colors.text,
                          }}
                        >
                          {a.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                      await AsyncStorage.setItem("price_label_size", size.id);
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
                  setLabelConfig({ ...labelConfig, offsetX: val })
                }
              />
              <ConfigStepper
                label="Margen Superior (Y)"
                value={labelConfig.offsetY}
                onChange={(val) =>
                  setLabelConfig({ ...labelConfig, offsetY: val })
                }
              />
              <ConfigStepper
                label="Tamaño Fuente Título"
                value={labelConfig.titleFontSize}
                onChange={(val) =>
                  setLabelConfig({ ...labelConfig, titleFontSize: val })
                }
              />
              <ConfigStepper
                label="Tamaño Fuente Precio"
                value={labelConfig.priceFontSize}
                onChange={(val) =>
                  setLabelConfig({ ...labelConfig, priceFontSize: val })
                }
              />
              <ConfigStepper
                label="Tamaño Fuente Dist."
                value={labelConfig.distFontSize}
                onChange={(val) =>
                  setLabelConfig({ ...labelConfig, distFontSize: val })
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
                        onPress: () => {
                          setLabelConfig(DEFAULT_CONFIG);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                        },
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
                    placeholder="Ej: Etiqueta Grande..."
                    placeholderTextColor={colors.textTertiary}
                    value={newTemplateName}
                    onChangeText={setNewTemplateName}
                  />
                  <TouchableOpacity
                    style={[
                      styles.saveBtnIcon,
                      { backgroundColor: colors.accent },
                    ]}
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
                onPress={async () => {
                  await AsyncStorage.setItem(
                    "price_label_config",
                    JSON.stringify(labelConfig),
                  );
                  setIsConfigModalVisible(false);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                }}
              >
                <Text style={styles.saveBtnFullText}>Guardar Cambios</Text>
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
                      Plantilla personalizada
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
                Vista Previa de Etiqueta
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
                  <Text style={styles.miniLabelTitle} numberOfLines={2}>
                    {previewProduct.descripcion}
                  </Text>

                  <View style={styles.miniLabelMainSection}>
                    <View style={styles.miniLabelColumnLeft}>
                      <View>
                        <Text style={styles.miniLabelText}>
                          {previewProduct.estatus || "G-68"}
                        </Text>
                        <Text style={styles.miniLabelText}>A</Text>
                        <Text style={styles.miniLabelText}>
                          {previewProduct.unidad_venta}
                        </Text>
                      </View>
                      <Text style={styles.miniLabelText}>
                        {previewProduct.codigo}
                      </Text>
                    </View>

                    <View style={styles.miniLabelColumnCenter}>
                      <Image
                        source={{
                          uri: `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${previewProduct.codigo}`,
                        }}
                        style={styles.miniQrImage}
                      />
                    </View>

                    <View style={styles.miniLabelColumnRight}>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.miniLabelDate}>
                          {new Date().toLocaleDateString("es-MX")}
                        </Text>
                        <Text
                          style={styles.miniLabelPrice}
                          adjustsFontSizeToFit
                          numberOfLines={1}
                        >
                          ${previewProduct.precio_lista_iva.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.miniLabelDist}>
                        Dist: ${previewProduct.precio_mayor_iva.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.previewModalInfo}>
                  <View style={styles.previewModalInfoRow}>
                    <Text
                      style={[
                        styles.previewModalInfoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cantidad a imprimir:
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

// Sub-componente para los steppers de configuración (igual que en generador)
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
  // Article Header
  articleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  articleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  articleSku: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  articleName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  // 2x2 Grid
  priceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginTop: 12,
  },
  priceCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  priceCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  priceCardValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  priceCardValueMd: {
    fontSize: 22,
    fontWeight: "800",
  },
  priceCardSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  // Label Preview Card
  labelPreviewCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  labelPreviewTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  previewContainer: {},
  labelPreview: {
    borderRadius: 12,
    padding: 16,
    width: "100%",
    minHeight: 180,
    borderWidth: 1,
    borderColor: "#eee",
  },
  labelTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    marginBottom: 4,
  },
  labelMainSection: { flexDirection: "row", flex: 1, marginTop: 4 },
  labelColumnLeft: { flex: 0.8, justifyContent: "space-between" },
  labelColumnCenter: {
    flex: 1.2,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 0,
  },
  labelColumnRight: {
    flex: 1.5,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  qrImage: { width: 70, height: 70 },
  labelHeavyText: { fontSize: 14, fontWeight: "900", color: "#000" },
  labelDateSmall: { fontSize: 11, fontWeight: "900", color: "#000" },
  labelPriceBig: {
    fontSize: 42,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -2,
    lineHeight: 46,
  },
  labelDistSmall: { fontSize: 14, fontWeight: "900", color: "#000" },
  clearBtn: {},
  settingsCard: { marginTop: 12, padding: 16, borderRadius: 14 },
  settingsLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  almacenInput: {
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  resultsList: { borderRadius: 12, marginTop: 10, overflow: "hidden" },
  resultItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  resultName: { fontSize: 14, fontWeight: "600" },
  resultSku: { fontSize: 12 },
  resultPrice: { fontSize: 16, fontWeight: "700" },
  emptyCard: {},
  emptyText: {},
  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingCard: {},
  loadingText: {},
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
  listPreviewContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  listPreviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  listPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  listPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  listPreviewCode: {
    fontSize: 14,
    fontWeight: "700",
  },
  listPreviewName: {
    fontSize: 13,
    fontWeight: "500",
  },
  listPreviewPrice: {
    fontSize: 12,
    fontWeight: "600",
  },
  listPreviewRemove: {
    padding: 4,
  },
  clearListBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  clearListText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // FAB Styles
  fab: {
    position: "absolute",
    right: 20,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff3b30",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  fabBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  printListModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  printListModalText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  printBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  printBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerActions: { flexDirection: "row", gap: 5, alignItems: "center" },
  headerIconBtn: { padding: 4 },
  warehouseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  warehouseText: { fontSize: 12, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { borderRadius: 20, padding: 25, width: "90%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: "45%",
  },
  almacenDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  almacenDisplayValue: { fontSize: 18, fontWeight: "700" },
  // Config Modal Styles (igual que generador)
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
  saveBtnFullText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // Template styles
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
  saveBtnIcon: {
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
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
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
  templateActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteTemplateBtn: {
    padding: 8,
  },
  configItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 15 },
  stepBtn: { padding: 5 },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalFooterActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
  },
  resetBtnText: { fontWeight: "600", fontSize: 14 },
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
  previewQtyBtn: {
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
  previewQtyValue: {
    fontSize: 40,
    fontWeight: "800",
    minWidth: 80,
    textAlign: "center",
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  // Estilos para lista de productos (ArticleCard style)
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
  productThumbnail: {
    width: 48,
    height: 48,
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
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productUnit: {
    fontSize: 10,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyText: {
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
  // Preview Icon Overlay
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
  // Mini Label Preview (para modal)
  miniLabelPreview: {
    borderRadius: 12,
    padding: 14,
    width: "100%",
    minHeight: 160,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
  },
  miniLabelTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    marginBottom: 4,
  },
  miniLabelMainSection: {
    flexDirection: "row",
    flex: 1,
    marginTop: 4,
  },
  miniLabelColumnLeft: {
    flex: 0.8,
    justifyContent: "space-between",
  },
  miniLabelColumnCenter: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 0,
  },
  miniLabelColumnRight: {
    flex: 1.2,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  miniLabelText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
  },
  miniQrImage: {
    width: 55,
    height: 55,
  },
  miniLabelDate: {
    fontSize: 10,
    fontWeight: "900",
    color: "#000",
  },
  miniLabelPrice: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -1,
    lineHeight: 36,
  },
  miniLabelDist: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
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
