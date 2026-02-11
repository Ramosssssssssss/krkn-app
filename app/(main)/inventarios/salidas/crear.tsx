import ArticleCard from "@/components/inventarios/ArticleCard";
import MovimientoDraftModal from "@/components/inventarios/MovimientoDraftModal";
import MovimientoExitModal from "@/components/inventarios/MovimientoExitModal";
import ProductDetailModal from "@/components/inventarios/ProductDetailModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import ScanHeader from "@/components/inventarios/ScanHeader";
import SearchResultsPicker from "@/components/inventarios/SearchResultsPicker";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useMovimientoDraft } from "@/hooks/use-movimiento-draft";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import {
    crearSalidaInventario,
    CrearSalidaResponse,
} from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
    TouchableOpacity,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

export default function CrearSalidaScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();

  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] =
    useState<CrearSalidaResponse | null>(null);
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState<
    any | null
  >(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const draftRestored = useRef(false);

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
    setDetalles,
  } = useArticleScanner();

  const { pendingDraft, isLoadingDraft, saveDraft, clearDraft, dismissDraft } =
    useMovimientoDraft("salida_draft");

  const sucursalNombre =
    sucursales.find((s) => s.id === selectedSucursal)?.nombre || "";
  const almacenNombre =
    almacenesFiltrados.find((a) => a.id === selectedAlmacen)?.nombre || "";

  // Cerrar modal de ubicación cuando estén seleccionados los obligatorios
  useEffect(() => {
    if (selectedSucursal && selectedAlmacen) {
      setShowLocationModal(false);
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [selectedSucursal, selectedAlmacen]);

  // — Draft: detectar borrador pendiente al montar
  useEffect(() => {
    if (!isLoadingDraft && pendingDraft && !draftRestored.current) {
      setShowDraftModal(true);
    }
  }, [isLoadingDraft, pendingDraft]);

  // — Draft: auto-guardar cada cambio
  useEffect(() => {
    if (draftRestored.current || detalles.length === 0) return;
    saveDraft({
      sucursalId: selectedSucursal,
      almacenId: selectedAlmacen,
      extra: {},
      detalles,
      savedAt: Date.now(),
    });
  }, [detalles, selectedSucursal, selectedAlmacen]);

  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    draftRestored.current = true;
    setShowDraftModal(false);
    if (pendingDraft.sucursalId) setSelectedSucursal(pendingDraft.sucursalId);
    if (pendingDraft.almacenId) setSelectedAlmacen(pendingDraft.almacenId);
    setDetalles(pendingDraft.detalles);
  }, [pendingDraft]);

  const handleDiscardDraft = useCallback(() => {
    dismissDraft();
    setShowDraftModal(false);
  }, []);

  const handleExit = useCallback(() => {
    if (detalles.length === 0) {
      clearDraft();
      router.back();
      return;
    }
    setShowExitModal(true);
  }, [detalles]);

  const handleExitSaveDraft = useCallback(() => {
    setShowExitModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, []);

  const handleExitDiscard = useCallback(() => {
    setShowExitModal(false);
    clearDraft();
    clearArticles();
    router.back();
  }, []);

  const handleSave = () => {
    if (!selectedSucursal || !selectedAlmacen || detalles.length === 0) return;
    setShowSummaryModal(true);
  };

  const handleConfirmSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Generar descripción corta (máximo 50 caracteres)
      const fechaCorta = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
      const nombreUsuario = (
        user?.NOMBRE ||
        user?.USERNAME ||
        "Usuario"
      ).substring(0, 20);
      const descripcion = `SAL ${fechaCorta} - ${nombreUsuario}`.substring(
        0,
        50,
      );

      // Preparar detalles para el backend
      const detallesPayload = detalles.map((d) => ({
        CLAVE: d.clave,
        CANTIDAD: d.cantidad,
      }));

      // Llamar al servicio
      const result = await crearSalidaInventario({
        P_SUCURSAL_ID: selectedSucursal!,
        P_ALMACEN_ID: selectedAlmacen!,
        P_DESCRIPCION: descripcion,
        P_USUARIO: nombreUsuario,
        detalles: detallesPayload,
      });

      setSuccessResult(result);
      setShowSummaryModal(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("❌ Error en crearSalida:", error);
      Alert.alert(
        "Error",
        error?.message || "No se pudo crear la salida de inventario",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    clearDraft();
    clearArticles();
    router.back();
  };

  const handleArticlePress = (item: any) => {
    setSelectedArticleForDetail(item);
    setShowProductDetail(true);
  };

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, d) => sum + d.cantidad, 0);

  // Loading State
  if (isLoading || isLoadingDraft) {
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

  // Error State
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

  const renderArticuloItem = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => (
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
  );

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={handleExit} style={{ paddingRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <ScanHeader
              color={colors.accent}
              aggressiveScan={aggressiveScan}
              onToggleScan={setAggressiveScan}
            />
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

      {/* Info de ubicación flotante (compacta) */}
      <TouchableOpacity
        style={[
          styles.locationChip,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setShowLocationModal(true)}
      >
        <Ionicons name="location" size={14} color={colors.accent} />
        <Text
          style={[styles.locationChipText, { color: colors.text }]}
          numberOfLines={1}
        >
          {selectedSucursal && selectedAlmacen
            ? `${sucursalNombre} · ${almacenNombre}`
            : "Seleccionar ubicación"}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Lista de artículos */}
      {detalles.length > 0 ? (
        <FlatList
          ref={listRef}
          data={detalles}
          keyExtractor={(item) => item._key}
          renderItem={renderArticuloItem}
          style={styles.articlesList}
          contentContainerStyle={styles.articlesListContent}
          ListHeaderComponent={
            <View
              style={[
                styles.articlesHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.articlesHeaderTitle, { color: colors.text }]}
              >
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
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${colors.accent}15` },
            ]}
          >
            <Ionicons name="scan-outline" size={48} color={colors.accent} />
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

      {/* Bottom Actions */}
      <View
        style={[
          styles.bottomActions,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.secondaryButton,
            { borderColor: colors.border },
          ]}
          onPress={handleExit}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
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

      {/* MODAL DE UBICACIÓN */}
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
                Seleccionar Ubicación
              </Text>
              {selectedSucursal && selectedAlmacen && (
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.locationModalBody}>
              {/* Sucursal */}
              <View style={styles.fieldGroup}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  Sucursal
                </Text>
                {sucursales.map((suc) => (
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
              </View>

              {/* Almacén */}
              {selectedSucursal && (
                <View style={styles.fieldGroup}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Almacén
                  </Text>
                  {almacenesFiltrados.map((alm) => (
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
                    Confirmar ubicación
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL DE RESUMEN */}
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
                name="document-text"
                size={Platform.OS === "ios" ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.summaryModalTitle}>Resumen de Salida</Text>
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
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.summaryConfirmBtnText}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito con Lottie */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        folio={successResult?.folio || null}
        doctoInId={successResult?.doctoInId}
        inserted={successResult?.inserted}
        warnings={successResult?.warnings}
        title="¡Salida Creada!"
        subtitle="El movimiento se registró correctamente"
        type="salida"
      />

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

      <MovimientoDraftModal
        visible={showDraftModal}
        draft={pendingDraft}
        title="Salida en curso"
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />

      <MovimientoExitModal
        visible={showExitModal}
        totalArticulos={totalArticulos}
        totalUnidades={totalUnidades}
        onSaveDraft={handleExitSaveDraft}
        onDiscardExit={handleExitDiscard}
        onCancel={() => setShowExitModal(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Header Scan Toggle
  headerScanToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },

  // Search Bar compacta
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  scanIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // Location Chip compacto
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: width * 0.6,
  },

  disabledButton: {
    opacity: 0.5,
  },

  // Articles List
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  articlesHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  articlesHeaderTotal: {
    fontSize: 12,
  },
  articleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  articleInfo: {
    flex: 1,
    marginRight: 10,
  },
  articleClave: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  articleUmed: {
    fontSize: 11,
    marginTop: 2,
  },
  articleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  removeBtn: {
    padding: 6,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 36,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {},
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  locationModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  locationModalBody: {
    padding: 16,
    maxHeight: height * 0.5,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 2,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  locationOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  // Centros de costo states
  centrosLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  centrosLoadingText: {
    fontSize: 14,
  },
  centrosError: {
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  centrosErrorText: {
    fontSize: 14,
    textAlign: "center",
  },
  centrosRetryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  centrosRetryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  centrosEmpty: {
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  centrosEmptyText: {
    fontSize: 14,
    textAlign: "center",
  },

  locationModalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  locationConfirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Summary Modal
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === "ios" ? 24 : 16,
  },
  summaryModalContent: {
    width: "100%",
    maxWidth: Platform.OS === "ios" ? 340 : 300,
    borderRadius: 16,
    overflow: "hidden",
  },
  summaryModalHeader: {
    padding: Platform.OS === "ios" ? 20 : 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  summaryModalTitle: {
    color: "#fff",
    fontSize: Platform.OS === "ios" ? 17 : 15,
    fontWeight: "600",
  },
  summaryModalBody: {
    padding: Platform.OS === "ios" ? 20 : 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
  },
  summaryLabel: {
    fontSize: Platform.OS === "ios" ? 14 : 12,
  },
  summaryValue: {
    fontSize: Platform.OS === "ios" ? 14 : 12,
    fontWeight: "600",
  },
  summaryValueBig: {
    fontSize: Platform.OS === "ios" ? 18 : 16,
    fontWeight: "700",
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Platform.OS === "ios" ? 8 : 6,
  },
  summaryModalFooter: {
    flexDirection: "row",
    padding: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 44,
    gap: 10,
  },
  summaryBtn: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
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
    fontSize: Platform.OS === "ios" ? 15 : 13,
    fontWeight: "600",
  },
  summaryConfirmBtn: {},
  summaryConfirmBtnText: {
    color: "#fff",
    fontSize: Platform.OS === "ios" ? 15 : 13,
    fontWeight: "600",
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
});
