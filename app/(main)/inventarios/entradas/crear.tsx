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
    crearEntradaInventario,
    CrearEntradaResponse,
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

const { width } = Dimensions.get("window");

export default function CrearEntradaScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] =
    useState<CrearEntradaResponse | null>(null);
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
    useMovimientoDraft("entrada_draft");

  const sucursalNombre =
    sucursales.find((s) => s.id === selectedSucursal)?.nombre || "";
  const almacenNombre =
    almacenesFiltrados.find((a) => a.id === selectedAlmacen)?.nombre || "";

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
      const descripcion = `ENT ${fechaCorta} - ${nombreUsuario}`.substring(
        0,
        50,
      );

      // Preparar detalles para el backend
      const detallesPayload = detalles.map((d) => ({
        CLAVE: d.clave,
        CANTIDAD: d.cantidad,
      }));

      // Llamar al servicio
      const result = await crearEntradaInventario({
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
      console.error("❌ Error en crearEntrada:", error);
      Alert.alert(
        "Error",
        error?.message || "No se pudo crear la entrada de inventario",
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

      {selectedSucursal && selectedAlmacen && (
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
            {sucursalNombre} → {almacenNombre}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
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
            style={[
              styles.emptyIcon,
              { backgroundColor: `${colors.accent}15` },
            ]}
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
                name="document-text"
                size={Platform.OS === "ios" ? 24 : 20}
                color="#fff"
              />
              <Text style={styles.summaryModalTitle}>Resumen de Entrada</Text>
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

      {/* Modal de éxito con Lottie */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        folio={successResult?.folio || null}
        doctoInId={successResult?.doctoInId}
        inserted={successResult?.inserted}
        warnings={successResult?.warnings}
        title="¡Entrada Creada!"
        subtitle="El movimiento se registró correctamente"
        type="entrada"
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
        title="Entrada en curso"
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
    alignSelf: "flex-start",
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  locationChipText: {
    fontSize: 12,
    fontWeight: "500",
    maxWidth: width * 0.6,
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
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
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
});
