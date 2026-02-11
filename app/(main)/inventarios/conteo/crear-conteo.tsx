import ArticleCard from "@/components/inventarios/ArticleCard";
import ProductDetailModal from "@/components/inventarios/ProductDetailModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import ScanHeader from "@/components/inventarios/ScanHeader";
import SearchResultsPicker from "@/components/inventarios/SearchResultsPicker";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { crearInventarioFisico } from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function CrearConteoScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ubicacionInicial, setUbicacionInicial] = useState("");
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [savedResult, setSavedResult] = useState<{
    folio: string;
    doctoInvfisId: number;
    inserted: number;
  } | null>(null);
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState<
    any | null
  >(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const {
    sucursales,
    almacenesFiltrados,
    selectedSucursal,
    selectedAlmacen,
    setSelectedSucursal,
    setSelectedAlmacen,
    isLoading,
    error,
    retryCount,
    refresh,
  } = useSucursalesAlmacenes();

  const {
    searchQuery,
    isSearching,
    detalles,
    lastAddedIndex,
    aggressiveScan,
    searchInputRef,
    listRef,
    flashAnim,
    setAggressiveScan,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleSetQuantity,
    handleRemoveArticle,
    clearArticles,
    searchAndAddArticle,
    searchResults,
    selectFromResults,
    dismissResults,
  } = useArticleScanner();

  const sucursalNombre =
    sucursales.find((s: any) => s.id === selectedSucursal)?.nombre || "";
  const almacenNombre =
    almacenesFiltrados.find((a: any) => a.id === selectedAlmacen)?.nombre || "";

  useEffect(() => {
    if (selectedSucursal && selectedAlmacen) {
      setShowLocationModal(false);
      // Abrir el segundo modal automáticamente al seleccionar el almacén
      setTimeout(() => setShowUbicacionModal(true), 400);
    }
  }, [selectedSucursal, selectedAlmacen]);

  const handleFinishLocationSelection = () => {
    setShowUbicacionModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 300);
  };

  const handleLocationOptions = () => {
    setShowOptionsModal(true);
  };

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

  const handleLocationScanned = ({ data }: { data: string }) => {
    // Transformar '/' a '-' y asegurar mayúsculas
    const transformed = data.replace(/\//g, "-").toUpperCase();
    setUbicacionInicial(transformed);
    setShowCameraScanner(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, item) => sum + item.cantidad, 0);

  const handleSave = () => {
    if (!selectedSucursal || !selectedAlmacen || detalles.length === 0) return;
    setShowSummaryModal(true);
  };

  const handleConfirmSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (!selectedSucursal || !selectedAlmacen) {
        throw new Error("Sucursal o Almacén no seleccionados");
      }

      // Preparar detalles para el backend
      const detallesPayload = detalles.map((d) => ({
        CLAVE: d.clave,
        CANTIDAD: d.cantidad,
      }));

      // Llamar al servicio
      const result = await crearInventarioFisico({
        P_SUCURSAL_ID: Number(selectedSucursal),
        P_ALMACEN_ID: Number(selectedAlmacen),
        P_DESCRIPCION: `Conteo Total - ${ubicacionInicial ? "[" + ubicacionInicial + "] " : ""}${(user?.NOMBRE || "Usuario").substring(0, 20)}`,
        P_USUARIO: user?.NOMBRE || user?.USERNAME || "sistema",
        detalles: detallesPayload,
      });

      if (result.ok) {
        setSavedResult({
          folio: result.folio || "",
          doctoInvfisId: result.doctoInvfisId || 0,
          inserted: result.inserted || 0,
        });
        setShowSummaryModal(false);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("❌ Error en conteo:", error);
      Alert.alert("Error", error?.message || "No se pudo guardar el conteo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    clearArticles();
    router.back();
  };

  const handleNewConteo = () => {
    setShowSuccessModal(false);
    clearArticles();
    // Reiniciar también la ubicación específica si es necesario
    setUbicacionInicial("");
    setSavedResult(null);
    // Podríamos re-abrir el modal de ubicación si se desea un flujo continuo
    setTimeout(() => {
      setShowUbicacionModal(true);
    }, 500);
  };

  const handleGoToAplicar = () => {
    setShowSuccessModal(false);
    clearArticles();
    router.replace("/(main)/inventarios/aplicar?tipo=total");
  };

  const handleArticlePress = (item: any) => {
    setSelectedArticleForDetail(item);
    setShowProductDetail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (isLoading) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {retryCount > 0
            ? `Reintentando... (${retryCount}/3)`
            : "Cargando sucursales..."}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.errorIcon,
            { backgroundColor: "rgba(183, 28, 28, 0.15)" },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={40} color="#C62828" />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Error de conexión
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={refresh}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerTitle: "Conteo cíclico",
          headerTitleAlign: "center",
          headerRight: () => (
            <View style={{ marginRight: Platform.OS === "android" ? 8 : 0 }}>
              <ScanHeader
                color={colors.accent}
                aggressiveScan={aggressiveScan}
                onToggleScan={setAggressiveScan}
              />
            </View>
          ),
        }}
      />

      <ProductSearchBar
        ref={searchInputRef}
        value={searchQuery}
        onChangeText={handleSearchChange}
        onSubmitEditing={handleSearchSubmit}
        isSearching={isSearching}
        aggressiveScan={aggressiveScan}
        color={colors.accent}
        searchAndAddArticle={searchAndAddArticle}
      />

      {selectedSucursal && selectedAlmacen && (
        <TouchableOpacity
          style={[
            styles.locationChip,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={handleLocationOptions}
        >
          <View
            style={[
              styles.locationIconBoxChip,
              { backgroundColor: `${colors.accent}15` },
            ]}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text
              style={[styles.locationChipText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {sucursalNombre} → {almacenNombre}
            </Text>
            <Text
              style={[styles.locationUbicacionText, { color: colors.text }]}
              numberOfLines={2}
            >
              {ubicacionInicial ? (
                <>
                  Ubicación:{" "}
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>
                    {ubicacionInicial}
                  </Text>
                </>
              ) : (
                <Text
                  style={{ color: colors.textTertiary, fontStyle: "italic" }}
                >
                  Sin ubicación específica
                </Text>
              )}
            </Text>
          </View>
          <Ionicons
            name="pencil-sharp"
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {detalles.length > 0 ? (
        <>
          <View
            style={[
              styles.articlesHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.articlesHeaderTitle, { color: colors.text }]}>
              Artículos ({totalArticulos})
            </Text>
            <Text
              style={[
                styles.articlesHeaderTotal,
                { color: colors.textSecondary },
              ]}
            >
              {totalUnidades} unidades
            </Text>
          </View>

          <FlatList
            ref={listRef}
            data={detalles}
            keyExtractor={(item) => item._key}
            renderItem={({ item, index }) => (
              <ArticleCard
                item={item}
                index={index}
                color={colors.accent}
                isFlashing={lastAddedIndex === index}
                flashAnim={flashAnim}
                onUpdateQuantity={handleUpdateQuantity}
                onSetQuantity={handleSetQuantity}
                onRemove={handleRemoveArticle}
                onPress={handleArticlePress}
              />
            )}
            style={styles.articlesList}
            contentContainerStyle={styles.articlesListContent}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <View
            style={[styles.emptyIcon, { backgroundColor: colors.accentLight }]}
          >
            <Ionicons name="scan-outline" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {aggressiveScan ? "Listo para escanear" : "Busca artículos"}
          </Text>
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            {aggressiveScan
              ? "Escanea códigos de barras con tu PDA"
              : "Escribe el código y presiona agregar"}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.bottomActions,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.secondaryButton,
            { borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: colors.textSecondary },
            ]}
          >
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            { backgroundColor: colors.accent },
            (!selectedSucursal || !selectedAlmacen || detalles.length === 0) &&
              styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={
            !selectedSucursal || !selectedAlmacen || detalles.length === 0
          }
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de ubicación */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (selectedSucursal && selectedAlmacen) {
            setShowLocationModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.locationModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Seleccionar ubicación
              </Text>
              {selectedSucursal && selectedAlmacen && (
                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    { backgroundColor: colors.accentLight },
                  ]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.fieldGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Sucursal
              </Text>
              {sucursales.map((suc: any) => (
                <TouchableOpacity
                  key={suc.id}
                  style={[
                    styles.locationOption,
                    {
                      backgroundColor: colors.background,
                      borderColor:
                        selectedSucursal === suc.id
                          ? colors.accent
                          : colors.border,
                    },
                    selectedSucursal === suc.id && { borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedSucursal(suc.id)}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={
                      selectedSucursal === suc.id
                        ? colors.accent
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.locationOptionText,
                      {
                        color:
                          selectedSucursal === suc.id
                            ? colors.accent
                            : colors.text,
                      },
                    ]}
                  >
                    {suc.nombre}
                  </Text>
                  {selectedSucursal === suc.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {selectedSucursal && (
                <View style={styles.fieldGroup}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Almacén
                  </Text>
                  {almacenesFiltrados.map((alm: any) => (
                    <TouchableOpacity
                      key={alm.id}
                      style={[
                        styles.locationOption,
                        {
                          backgroundColor: colors.background,
                          borderColor:
                            selectedAlmacen === alm.id
                              ? colors.accent
                              : colors.border,
                        },
                        selectedAlmacen === alm.id && { borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedAlmacen(alm.id)}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={20}
                        color={
                          selectedAlmacen === alm.id
                            ? colors.accent
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.locationOptionText,
                          {
                            color:
                              selectedAlmacen === alm.id
                                ? colors.accent
                                : colors.text,
                          },
                        ]}
                      >
                        {alm.nombre}
                      </Text>
                      {selectedAlmacen === alm.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {selectedSucursal && selectedAlmacen && (
              <View
                style={[
                  styles.locationModalFooter,
                  { borderTopColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.locationConfirmBtn,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.locationConfirmBtnText}>
                    Seleccionar ubicación
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: UBICACIÓN ESPECÍFICA (PASILLO) */}
      <Modal
        visible={showUbicacionModal}
        transparent
        animationType="fade"
        onRequestClose={handleFinishLocationSelection}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.ubicacionModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.ubicacionIconContainer}>
              <View
                style={[
                  styles.ubicacionIconBox,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Ionicons
                  name="navigate-circle"
                  size={40}
                  color={colors.accent}
                />
              </View>
            </View>

            <Text style={[styles.ubicacionTitle, { color: colors.text }]}>
              ¿Dónde empezarás?
            </Text>
            <Text
              style={[
                styles.ubicacionSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Indica el pasillo, estante o zona de este almacén para organizar
              mejor tu conteo.
            </Text>

            <View
              style={[
                styles.inputWrapperExtended,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={[styles.textInputFull, { color: colors.text }]}
                placeholder="Ej: Pasillo A, Estante 4..."
                placeholderTextColor={colors.textSecondary}
                value={ubicacionInicial}
                onChangeText={(text) => {
                  const transformed = text.replace(/\//g, "-").toUpperCase();
                  setUbicacionInicial(transformed);
                }}
                autoFocus
                onSubmitEditing={handleFinishLocationSelection}
              />
              <TouchableOpacity
                style={[
                  styles.scanIconBtn,
                  { backgroundColor: colors.accentLight },
                ]}
                onPress={handleOpenScanner}
              >
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.startScanBtn, { backgroundColor: colors.accent }]}
              onPress={handleFinishLocationSelection}
            >
              <Text style={styles.startScanBtnText}>Empezar a Escanear</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleFinishLocationSelection}
            >
              <Text
                style={[styles.skipBtnText, { color: colors.textSecondary }]}
              >
                Omitir por ahora
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ACTION SHEET ESTILO IOS (EDITAR UBICACIÓN) */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.actionSheetContainer}>
            <View
              style={[
                styles.actionSheetGroup,
                { backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[
                  styles.actionSheetHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.actionSheetHeaderText,
                    { color: colors.textSecondary },
                  ]}
                >
                  EDITAR UBICACIÓN
                </Text>
                <Text
                  style={[
                    styles.actionSheetSubText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ¿Qué deseas modificar del conteo actual?
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionSheetBtn,
                  { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setShowOptionsModal(false);
                  setTimeout(() => setShowUbicacionModal(true), 100);
                }}
              >
                <Ionicons name="grid-outline" size={20} color={colors.accent} />
                <Text
                  style={[styles.actionSheetBtnText, { color: colors.text }]}
                >
                  Cambiar Pasillo / Estante
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSheetBtn}
                onPress={() => {
                  setShowOptionsModal(false);
                  setTimeout(() => setShowLocationModal(true), 100);
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={colors.accent}
                />
                <Text
                  style={[styles.actionSheetBtnText, { color: colors.text }]}
                >
                  Cambiar Sucursal / Almacén
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.actionSheetCancelBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text
                style={[styles.actionSheetCancelText, { color: "#FF3B30" }]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de resumen */}
      <Modal
        visible={showSummaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <View style={styles.summaryModalOverlay}>
          <View
            style={[
              styles.summaryModalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                styles.summaryModalHeader,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="list"
                size={Platform.OS === "ios" ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.summaryModalTitle}>Resumen de Conteo</Text>
            </View>

            <View style={styles.summaryModalBody}>
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Sucursal
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {sucursalNombre}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Almacén
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {almacenNombre}
                </Text>
              </View>
              {ubicacionInicial ? (
                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Ubicación Inicial
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>
                    {ubicacionInicial}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Fecha
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {new Date().toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Artículos
                </Text>
                <Text
                  style={[styles.summaryValueBig, { color: colors.accent }]}
                >
                  {totalArticulos}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Unidades totales
                </Text>
                <Text
                  style={[styles.summaryValueBig, { color: colors.accent }]}
                >
                  {totalUnidades}
                </Text>
              </View>
            </View>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={[
                  styles.summaryBtn,
                  styles.summaryCancelBtn,
                  { borderColor: colors.border },
                ]}
                onPress={() => setShowSummaryModal(false)}
                disabled={isSubmitting}
              >
                <Text
                  style={[styles.summaryCancelBtnText, { color: colors.text }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.summaryBtn,
                  styles.summaryConfirmBtn,
                  { backgroundColor: colors.accent },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleConfirmSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
                <Text style={styles.summaryConfirmBtnText}>
                  {isSubmitting ? "Guardando..." : "Confirmar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        folio={savedResult?.folio || null}
        doctoInId={savedResult?.doctoInvfisId}
        inserted={savedResult?.inserted}
        title="¡Conteo Guardado!"
        subtitle="El conteo se registró correctamente"
        primaryButtonText="Ir a Aplicar"
        onPrimaryAction={handleGoToAplicar}
        secondaryButtonText="Realizar otro conteo"
        onSecondaryAction={handleNewConteo}
        tertiaryButtonText="Volver al menú"
        onTertiaryAction={handleSuccessClose}
      />

      {/* Modal de Escáner de Cámara */}
      <Modal
        visible={showCameraScanner}
        animationType="slide"
        onRequestClose={() => setShowCameraScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleLocationScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "code128", "code39", "ean13"],
            }}
          />

          <View style={styles.scannerOverlay}>
            <View
              style={[styles.scannerHeader, { paddingTop: insets.top + 16 }]}
            >
              <TouchableOpacity
                style={styles.scannerCloseBtn}
                onPress={() => setShowCameraScanner(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Escanear Ubicación</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.scannerFrameContainer}>
              <View
                style={[styles.scannerFrame, { borderColor: colors.accent }]}
              >
                <View
                  style={[
                    styles.scannerCorner,
                    styles.scannerTL,
                    { borderColor: colors.accent },
                  ]}
                />
                <View
                  style={[
                    styles.scannerCorner,
                    styles.scannerTR,
                    { borderColor: colors.accent },
                  ]}
                />
                <View
                  style={[
                    styles.scannerCorner,
                    styles.scannerBL,
                    { borderColor: colors.accent },
                  ]}
                />
                <View
                  style={[
                    styles.scannerCorner,
                    styles.scannerBR,
                    { borderColor: colors.accent },
                  ]}
                />
              </View>
              <Text style={styles.scannerHint}>
                Alinea el código de la ubicación
              </Text>
            </View>

            <View style={styles.scannerFooter}>
              <Text style={styles.scannerFooterText}>Buscando código...</Text>
            </View>
          </View>
        </View>
      </Modal>

      <ProductDetailModal
        visible={showProductDetail}
        articulo={selectedArticleForDetail}
        onClose={() => setShowProductDetail(false)}
      />

      <SearchResultsPicker
        visible={searchResults.length > 0}
        results={searchResults}
        color={colors.accent}
        onSelect={selectFromResults}
        onDismiss={dismissResults}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  locationIconBoxChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextContainer: {
    flex: 1,
    gap: 2,
  },
  locationChipText: {
    fontSize: 11,
    fontWeight: "400",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationUbicacionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
  },
  articlesList: {
    flex: 1,
  },
  articlesListContent: {
    paddingBottom: 12,
  },
  articlesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  articlesHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  articlesHeaderTotal: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {},
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  locationModalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  locationOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    height: 48,
  },
  textInput: {
    flex: 1,
    height: "100%",
    marginLeft: 10,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
  },
  ubicacionModalContent: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  ubicacionIconContainer: {
    marginBottom: 16,
  },
  ubicacionIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  ubicacionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  ubicacionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  inputWrapperExtended: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 24,
  },
  textInputFull: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  startScanBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  startScanBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  skipBtn: {
    marginTop: 16,
    padding: 8,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  // ACTION SHEET ESTILO IOS
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 10,
  },
  actionSheetContainer: {
    width: "100%",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  actionSheetGroup: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  actionSheetHeader: {
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  actionSheetHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionSheetSubText: {
    fontSize: 12,
    textAlign: "center",
  },
  actionSheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  actionSheetBtnText: {
    fontSize: 17,
    fontWeight: "400",
  },
  actionSheetCancelBtn: {
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  actionSheetCancelText: {
    fontSize: 17,
    fontWeight: "600",
  },
  locationModalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopWidth: 1,
  },
  locationConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  locationConfirmBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  summaryModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    overflow: "hidden",
  },
  summaryModalHeader: {
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  summaryModalTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  summaryModalBody: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValueBig: {
    fontSize: 17,
    fontWeight: "700",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryModalFooter: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 20,
    gap: 10,
  },
  summaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  summaryCancelBtn: {
    borderWidth: 1,
  },
  summaryCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryConfirmBtn: {},
  summaryConfirmBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  scannerFrameContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderRadius: 24,
    backgroundColor: "transparent",
    position: "relative",
  },
  scannerCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  scannerTL: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 24,
  },
  scannerTR: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 24,
  },
  scannerBL: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 24,
  },
  scannerBR: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 24,
  },
  scannerHint: {
    color: "#fff",
    marginTop: 24,
    fontSize: 15,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scannerFooter: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerFooterText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  scanIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
