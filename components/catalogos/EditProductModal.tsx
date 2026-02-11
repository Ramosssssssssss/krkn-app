import { API_CONFIG } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Articulo {
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

interface StockInfo {
  sucursal: string;
  almacen: string;
  stock: number;
}

interface EditProductModalProps {
  visible: boolean;
  articulo: Articulo | null;
  onClose: () => void;
}

export default function EditProductModal({
  visible,
  articulo,
  onClose,
}: EditProductModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [linea, setLinea] = useState("");
  const [precioLista, setPrecioLista] = useState("");
  const [precioDistribuidor, setPrecioDistribuidor] = useState("");
  const [originalPrecioLista, setOriginalPrecioLista] = useState("");
  const [originalPrecioDistribuidor, setOriginalPrecioDistribuidor] =
    useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [imagesCount, setImagesCount] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const imageScrollRef = useRef<ScrollView>(null);

  const goToImage = (index: number) => {
    if (index < 0 || index >= imagesCount) return;
    imageScrollRef.current?.scrollTo({
      x: index * (windowWidth - 40),
      animated: true,
    });
    setCurrentImageIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (articulo) {
      setName(articulo.nombre);
      setSku(articulo.sku);
      setBarcode(articulo.barcode || "");
      setCategory(articulo.categoria);
      setLinea("General");
      const precioListaStr = articulo.precioLista?.toString() || "0.00";
      const precioDistStr = articulo.precioDistribuidor?.toString() || "0.00";
      setPrecioLista(precioListaStr);
      setPrecioDistribuidor(precioDistStr);
      setOriginalPrecioLista(precioListaStr);
      setOriginalPrecioDistribuidor(precioDistStr);
      setImageUri(articulo.imagen);
      setIsEditing(false); // Reset editing mode when article changes
      setCurrentImageIndex(0);
      setImagesCount(1);
    }
  }, [articulo]);

  useEffect(() => {
    if (visible && articulo && isPhotoModalVisible) {
      fetchImageCount();
    }
  }, [visible, articulo, isPhotoModalVisible]);

  const fetchImageCount = async () => {
    if (!articulo) return;
    const databaseId = getCurrentDatabaseId();
    try {
      const url = `${API_CONFIG.BASE_URL}/api/get-artimages-count.php?databaseId=${databaseId}&articuloId=${articulo.id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setImagesCount(data.count || 1);
      }
    } catch (e) {
      console.error("Error fetching images count:", e);
      setImagesCount(1);
    }
  };

  const handleEditPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert("Editar Foto", "Selecciona el origen de la imagen", [
      {
        text: "Cámara",
        onPress: takePhoto,
      },
      {
        text: "Galería",
        onPress: pickImage,
      },
      {
        text: "Cancelar",
        style: "cancel",
      },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tu galería para cambiar la foto.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tu cámara para tomar la foto.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [showPriceSuccess, setShowPriceSuccess] = useState(false);
  const [priceChangeInfo, setPriceChangeInfo] = useState<{
    precioListaAnterior: number;
    precioListaNuevo: number;
    precioDistAnterior: number;
    precioDistNuevo: number;
  } | null>(null);
  const lottieRef = useRef<LottieView>(null);

  const handleSaveChanges = async () => {
    if (!articulo) return;

    // Guardar precios anteriores antes de actualizar
    const precioListaAnterior = parseFloat(
      articulo.precioLista?.toString() || "0",
    );
    const precioDistAnterior = parseFloat(
      articulo.precioDistribuidor?.toString() || "0",
    );

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const databaseId = getCurrentDatabaseId();

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/actualizar-precios.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            articulo_id: articulo.id,
            precio_publico: precioLista,
            precio_distribuidor: precioDistribuidor,
          }),
        },
      );

      const result = await response.json();

      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Guardar info de cambios para mostrar en el modal
        setPriceChangeInfo({
          precioListaAnterior,
          precioListaNuevo: parseFloat(precioLista) || 0,
          precioDistAnterior,
          precioDistNuevo: parseFloat(precioDistribuidor) || 0,
        });
        setShowPriceSuccess(true);

        // Cerrar el modal de éxito después de 3 segundos
        setTimeout(() => {
          setShowPriceSuccess(false);
          setIsEditing(false);
        }, 3000);
      } else {
        throw new Error(result.message || "Error al guardar");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error.message || "No se pudieron guardar los cambios",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!articulo) return null;

  // Detectar si hay cambios pendientes
  const hasUnsavedChanges = () => {
    return (
      precioLista !== originalPrecioLista ||
      precioDistribuidor !== originalPrecioDistribuidor
    );
  };

  // Manejar el botón "Listo"
  const handleDonePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (hasUnsavedChanges()) {
      Alert.alert(
        "Cambios sin guardar",
        "¿Deseas guardar los cambios de precio antes de salir?",
        [
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => {
              // Restaurar valores originales y salir de edición
              setPrecioLista(originalPrecioLista);
              setPrecioDistribuidor(originalPrecioDistribuidor);
              setIsEditing(false);
            },
          },
          {
            text: "Guardar",
            onPress: handleSaveChanges,
          },
        ],
        { cancelable: true },
      );
    } else {
      setIsEditing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerAction, { color: colors.accent }]}>
              Cerrar
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Detalle Producto
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                handleDonePress();
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditing(true);
              }
            }}
          >
            <Text
              style={[
                styles.headerAction,
                styles.headerActionBold,
                { color: colors.accent },
              ]}
            >
              {isEditing ? "Listo" : "Editar"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Product Image */}
          <TouchableOpacity
            style={styles.imageSection}
            onPress={
              isEditing ? handleEditPhoto : () => setIsPhotoModalVisible(true)
            }
            activeOpacity={0.7}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri || articulo.imagen }}
                style={styles.productImage}
              />
              {isEditing && (
                <View
                  style={[styles.editBadge, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="pencil" size={12} color="#fff" />
                </View>
              )}
            </View>
            {isEditing && (
              <Text style={[styles.editPhotoText, { color: colors.accent }]}>
                Toca para editar foto
              </Text>
            )}
          </TouchableOpacity>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              INFORMACIÓN BÁSICA
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.row, { alignItems: "flex-start" }]}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Nombre
                </Text>
                <TextInput
                  style={[
                    styles.rowInput,
                    { color: isEditing ? colors.text : colors.textSecondary },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del producto"
                  placeholderTextColor={colors.textTertiary}
                  editable={isEditing}
                  multiline={true}
                />
              </View>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  SKU
                </Text>
                <TextInput
                  style={[
                    styles.rowInput,
                    {
                      color: isEditing ? colors.text : colors.textSecondary,
                      textAlign: "right",
                    },
                  ]}
                  value={sku}
                  onChangeText={setSku}
                  placeholder="Código SKU"
                  placeholderTextColor={colors.textTertiary}
                  editable={isEditing}
                />
              </View>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Código de Barras
                </Text>
                <TextInput
                  style={[
                    styles.rowInput,
                    {
                      color: isEditing ? colors.text : colors.textSecondary,
                      textAlign: "right",
                    },
                  ]}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="EAN/UPC"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <TouchableOpacity
                style={styles.row}
                onPress={
                  isEditing
                    ? () => {
                        /* Logic to change category */
                      }
                    : undefined
                }
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Categoría
                </Text>
                <View style={styles.rowRight}>
                  <Text
                    style={[styles.rowValue, { color: colors.textSecondary }]}
                  >
                    {category}
                  </Text>
                  {isEditing && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textTertiary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              PRECIOS
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Precio Lista
                </Text>
                <View style={styles.priceInput}>
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: colors.textTertiary },
                    ]}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[
                      styles.rowInput,
                      {
                        color: isEditing ? colors.text : colors.textSecondary,
                        textAlign: "right",
                        fontWeight: "600",
                      },
                    ]}
                    value={precioLista}
                    onChangeText={setPrecioLista}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    editable={isEditing}
                  />
                </View>
              </View>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Precio Mayoreo
                </Text>
                <View style={styles.priceInput}>
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: colors.textTertiary },
                    ]}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[
                      styles.rowInput,
                      {
                        color: isEditing ? colors.text : colors.textSecondary,
                        textAlign: "right",
                        fontWeight: "600",
                      },
                    ]}
                    value={precioDistribuidor}
                    onChangeText={setPrecioDistribuidor}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    editable={isEditing}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              QUIEBRES
            </Text>
            <View style={[styles.card]}>
              <Text style={[{ color: colors.textSecondary }]}>
                PROXIMAMENTE
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              VENTAS
            </Text>
            <View style={[styles.card]}>
              <Text style={[{ color: colors.textSecondary }]}>
                PROXIMAMENTE
              </Text>
            </View>
          </View>
          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: isSaving ? 0.6 : 1,
                  },
                ]}
                onPress={handleSaveChanges}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 59, 48, 0.2)"
                      : "#FFEBEB",
                  },
                ]}
                onPress={() => setIsDeleteConfirmVisible(true)}
              >
                <Text style={[styles.deleteButtonText, { color: "#FF3B30" }]}>
                  Eliminar Producto
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={isDeleteConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDeleteConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.confirmContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.confirmHeader}>
                <View
                  style={[
                    styles.warningIconContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 59, 48, 0.2)"
                        : "#FFEBEB",
                    },
                  ]}
                >
                  <Ionicons name="trash-outline" size={32} color="#FF3B30" />
                </View>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>
                  ¿Eliminar producto?
                </Text>
                <Text
                  style={[
                    styles.confirmSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Esta acción no se puede deshacer y el producto se eliminará
                  permanentemente.
                </Text>
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setIsDeleteConfirmVisible(false)}
                >
                  <Text
                    style={[
                      styles.confirmBtnText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: "#FF3B30" }]}
                  onPress={() => {
                    setIsDeleteConfirmVisible(false);
                    // Aquí iría la lógica de eliminación
                    onClose();
                  }}
                >
                  <Text style={[styles.confirmBtnText, { color: "#fff" }]}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Photo Viewer Modal */}
        <Modal
          visible={isPhotoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPhotoModalVisible(false)}
        >
          <View style={styles.photoOverlay}>
            <View
              style={[
                styles.photoContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x /
                      e.nativeEvent.layoutMeasurement.width,
                  );
                  setCurrentImageIndex(index);
                }}
              >
                {Array.from({ length: imagesCount }).map((_, i) => (
                  <View key={i} style={{ width: windowWidth - 40 }}>
                    <Image
                      source={{
                        uri: `${API_CONFIG.BASE_URL}/api/imagen-articulo.php?databaseId=${getCurrentDatabaseId()}&articuloId=${articulo.id}&pos=${i}&t=${articulo.id}_${i}`,
                      }}
                      style={styles.photoFull}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              {imagesCount > 1 && (
                <View
                  style={styles.navButtonsContainer}
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    style={[
                      styles.navBtn,
                      currentImageIndex === 0 && { opacity: 0 },
                    ]}
                    onPress={() => goToImage(currentImageIndex - 1)}
                    disabled={currentImageIndex === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navBtn,
                      currentImageIndex === imagesCount - 1 && { opacity: 0 },
                    ]}
                    onPress={() => goToImage(currentImageIndex + 1)}
                    disabled={currentImageIndex === imagesCount - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {imagesCount > 1 && (
                <View style={styles.photoIndicators}>
                  {Array.from({ length: imagesCount }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.indicator,
                        {
                          backgroundColor:
                            i === currentImageIndex
                              ? colors.accent
                              : isDark
                                ? "rgba(255,255,255,0.3)"
                                : "rgba(0,0,0,0.1)",
                        },
                      ]}
                    />
                  ))}
                </View>
              )}

              <BlurView
                intensity={95}
                tint={isDark ? "dark" : "light"}
                style={styles.photoInfoBlur}
              >
                <View style={styles.photoInfo}>
                  <View
                    style={[
                      styles.skuBadge,
                      { backgroundColor: `${colors.accent}15` },
                    ]}
                  >
                    <Text style={[styles.photoSku, { color: colors.accent }]}>
                      {sku}
                    </Text>
                  </View>
                  <Text style={[styles.photoName, { color: colors.text }]}>
                    {name}
                  </Text>
                  {imagesCount > 1 && (
                    <View style={styles.photoIndexContainer}>
                      <Ionicons
                        name="images-outline"
                        size={12}
                        color={colors.textTertiary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.photoIndexText}>
                        {currentImageIndex + 1} / {imagesCount}
                      </Text>
                    </View>
                  )}
                </View>
              </BlurView>
              <TouchableOpacity
                style={[
                  styles.photoCloseBtn,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setIsPhotoModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Price Success Modal */}
        <Modal
          visible={showPriceSuccess}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.priceSuccessBackdrop}>
            <View
              style={[
                styles.priceSuccessCard,
                { backgroundColor: colors.background },
              ]}
            >
              <LottieView
                ref={lottieRef}
                source={require("@/assets/animations/success.json")}
                autoPlay
                loop={false}
                style={styles.priceSuccessLottie}
              />
              <Text style={[styles.priceSuccessTitle, { color: colors.text }]}>
                ¡Precios Actualizados!
              </Text>

              {priceChangeInfo && (
                <View style={styles.priceChangeContainer}>
                  {/* Precio Lista */}
                  {priceChangeInfo.precioListaNuevo !==
                    priceChangeInfo.precioListaAnterior && (
                    <View
                      style={[
                        styles.priceChangeRow,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priceChangeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Precio Lista
                      </Text>
                      <View style={styles.priceChangeValues}>
                        <Text
                          style={[
                            styles.priceOld,
                            { color: colors.textTertiary },
                          ]}
                        >
                          ${priceChangeInfo.precioListaAnterior.toFixed(2)}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={colors.textTertiary}
                          style={{ marginHorizontal: 8 }}
                        />
                        <Text style={[styles.priceNew, { color: colors.text }]}>
                          ${priceChangeInfo.precioListaNuevo.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.priceDiffBadge,
                          {
                            backgroundColor:
                              priceChangeInfo.precioListaNuevo >
                              priceChangeInfo.precioListaAnterior
                                ? "#10b98120"
                                : "#ef444420",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            priceChangeInfo.precioListaNuevo >
                            priceChangeInfo.precioListaAnterior
                              ? "arrow-up"
                              : "arrow-down"
                          }
                          size={12}
                          color={
                            priceChangeInfo.precioListaNuevo >
                            priceChangeInfo.precioListaAnterior
                              ? "#10b981"
                              : "#ef4444"
                          }
                        />
                        <Text
                          style={[
                            styles.priceDiffText,
                            {
                              color:
                                priceChangeInfo.precioListaNuevo >
                                priceChangeInfo.precioListaAnterior
                                  ? "#10b981"
                                  : "#ef4444",
                            },
                          ]}
                        >
                          $
                          {Math.abs(
                            priceChangeInfo.precioListaNuevo -
                              priceChangeInfo.precioListaAnterior,
                          ).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Precio Distribuidor */}
                  {priceChangeInfo.precioDistNuevo !==
                    priceChangeInfo.precioDistAnterior && (
                    <View
                      style={[
                        styles.priceChangeRow,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priceChangeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Precio Mayoreo
                      </Text>
                      <View style={styles.priceChangeValues}>
                        <Text
                          style={[
                            styles.priceOld,
                            { color: colors.textTertiary },
                          ]}
                        >
                          ${priceChangeInfo.precioDistAnterior.toFixed(2)}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={colors.textTertiary}
                          style={{ marginHorizontal: 8 }}
                        />
                        <Text style={[styles.priceNew, { color: colors.text }]}>
                          ${priceChangeInfo.precioDistNuevo.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.priceDiffBadge,
                          {
                            backgroundColor:
                              priceChangeInfo.precioDistNuevo >
                              priceChangeInfo.precioDistAnterior
                                ? "#10b98120"
                                : "#ef444420",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            priceChangeInfo.precioDistNuevo >
                            priceChangeInfo.precioDistAnterior
                              ? "arrow-up"
                              : "arrow-down"
                          }
                          size={12}
                          color={
                            priceChangeInfo.precioDistNuevo >
                            priceChangeInfo.precioDistAnterior
                              ? "#10b981"
                              : "#ef4444"
                          }
                        />
                        <Text
                          style={[
                            styles.priceDiffText,
                            {
                              color:
                                priceChangeInfo.precioDistNuevo >
                                priceChangeInfo.precioDistAnterior
                                  ? "#10b981"
                                  : "#ef4444",
                            },
                          ]}
                        >
                          $
                          {Math.abs(
                            priceChangeInfo.precioDistNuevo -
                              priceChangeInfo.precioDistAnterior,
                          ).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
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
    paddingTop: Platform.OS === "ios" ? 16 : 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerAction: {
    fontSize: 17,
  },
  headerActionBold: {
    fontWeight: "600",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoText: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowLabel: {
    fontSize: 17,
    width: 125, // Fixed width to align inputs
  },
  rowValue: {
    fontSize: 17,
  },
  rowInput: {
    fontSize: 17,
    flex: 1,
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  currencySymbol: {
    fontSize: 17,
    marginRight: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 17,
    fontWeight: "500",
    minWidth: 40,
    textAlign: "center",
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  deleteButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  stockItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stockInfo: {
    flex: 1,
  },
  stockSucursal: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  stockAlmacen: {
    fontSize: 15,
    fontWeight: "500",
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
  },
  stockValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmContainer: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  confirmHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  photoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoContainer: {
    borderRadius: 24,
    overflow: "hidden",
    width: "100%",
    position: "relative",
  },
  photoFull: {
    width: "100%",
    height: 450,
    backgroundColor: "#fff",
  },
  photoInfoBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  photoInfo: {
    padding: 24,
    alignItems: "center",
  },
  skuBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoSku: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  photoName: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },
  photoIndexContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoIndexText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8e8e93",
  },
  photoCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  photoIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navButtonsContainer: {
    position: "absolute",
    top: 200,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 50,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Price Success Modal Styles
  priceSuccessBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  priceSuccessCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  priceSuccessLottie: {
    width: 120,
    height: 120,
  },
  priceSuccessTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 20,
  },
  priceChangeContainer: {
    width: "100%",
    gap: 12,
  },
  priceChangeRow: {
    borderRadius: 12,
    padding: 14,
  },
  priceChangeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceChangeValues: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  priceOld: {
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  priceNew: {
    fontSize: 18,
    fontWeight: "700",
  },
  priceDiffBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 4,
  },
  priceDiffText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
