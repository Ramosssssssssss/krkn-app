import ArticleCard from "@/components/inventarios/ArticleCard";
import {
  BottomActions,
  ConteoEmptyState,
  DraftResumeModal,
  ExitConfirmModal,
  LocationChip,
  LocationPickerModal,
  LocationScannerModal,
  OptionsActionSheet,
  SummaryModal,
  UbicacionModal,
} from "@/components/inventarios/conteo-ciclico";
import ProductDetailModal from "@/components/inventarios/ProductDetailModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import ScanHeader from "@/components/inventarios/ScanHeader";
import SearchResultsPicker from "@/components/inventarios/SearchResultsPicker";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { SkeletonFormWithSearch } from "@/components/Skeleton";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useConteoDraft } from "@/hooks/use-conteo-draft";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { crearInventarioFisico } from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function CrearConteoScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    sucursalId?: string;
    almacenId?: string;
  }>();
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
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const draftRestored = useRef(false);

  const { pendingDraft, isLoadingDraft, saveDraft, clearDraft, dismissDraft } =
    useConteoDraft();

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

  const sucursalNombre =
    sucursales.find((s: any) => s.id === selectedSucursal)?.nombre || "";
  const almacenNombre =
    almacenesFiltrados.find((a: any) => a.id === selectedAlmacen)?.nombre || "";

  // ── Mostrar modal de borrador pendiente ────────────────
  useEffect(() => {
    if (!isLoadingDraft && pendingDraft && !draftRestored.current) {
      setShowDraftModal(true);
    }
  }, [isLoadingDraft, pendingDraft]);

  // ── Restaurar borrador ────────────────────────────────
  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    draftRestored.current = true;
    setShowDraftModal(false);
    setShowLocationModal(false);

    // Restaurar sucursal/almacen
    if (pendingDraft.sucursalId) setSelectedSucursal(pendingDraft.sucursalId);
    if (pendingDraft.almacenId) {
      setTimeout(() => setSelectedAlmacen(pendingDraft.almacenId!), 100);
    }
    // Restaurar ubicación y artículos
    setUbicacionInicial(pendingDraft.ubicacion);
    setDetalles(pendingDraft.detalles);
  }, [pendingDraft, setSelectedSucursal, setSelectedAlmacen, setDetalles]);

  const handleDiscardDraft = useCallback(() => {
    draftRestored.current = true;
    setShowDraftModal(false);
    dismissDraft();
  }, [dismissDraft]);

  // ── Auto-guardar borrador cuando cambia el estado ─────
  useEffect(() => {
    // No guardar mientras se carga o si el modal de draft está abierto
    if (isLoadingDraft || showDraftModal) return;
    saveDraft({
      sucursalId: selectedSucursal,
      almacenId: selectedAlmacen,
      ubicacion: ubicacionInicial,
      detalles,
    });
  }, [
    detalles,
    selectedSucursal,
    selectedAlmacen,
    ubicacionInicial,
    saveDraft,
    isLoadingDraft,
    showDraftModal,
  ]);

  // Auto-seleccionar sucursal/almacen si vienen de push notification
  useEffect(() => {
    if (
      params.sucursalId &&
      params.almacenId &&
      sucursales.length > 0 &&
      !selectedSucursal
    ) {
      const sId = Number(params.sucursalId);
      const aId = Number(params.almacenId);
      if (sucursales.some((s: any) => s.id === sId)) {
        setSelectedSucursal(sId);
        // Dar tiempo al filtro de almacenes antes de seleccionar almacen
        setTimeout(() => setSelectedAlmacen(aId), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sucursalId, params.almacenId, sucursales]);

  useEffect(() => {
    if (selectedSucursal && selectedAlmacen) {
      setShowLocationModal(false);
      // Abrir el segundo modal automÃ¡ticamente al seleccionar el almacÃ©n
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
          "Necesitamos acceso a la cÃ¡mara para escanear.",
        );
        return;
      }
    }
    setShowCameraScanner(true);
  };

  const handleLocationScanned = ({ data }: { data: string }) => {
    // Transformar '/' a '-' y asegurar mayÃºsculas
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
        throw new Error("Sucursal o AlmacÃ©n no seleccionados");
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
        // Limpiar borrador al guardar exitosamente
        await clearDraft();
        setSavedResult({
          folio: result.folio || "",
          doctoInvfisId: result.doctoInvfisId || 0,
          inserted: result.inserted || 0,
        });
        setShowSummaryModal(false);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("âŒ Error en conteo:", error);
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
    clearDraft();
    // Reiniciar tambiÃ©n la ubicaciÃ³n especÃ­fica si es necesario
    setUbicacionInicial("");
    setSavedResult(null);
    // PodrÃ­amos re-abrir el modal de ubicaciÃ³n si se desea un flujo continuo
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

  // ── Salir con confirmación ──────────────────────────────
  const handleExit = useCallback(() => {
    if (detalles.length === 0) {
      clearDraft();
      router.back();
      return;
    }
    setShowExitModal(true);
  }, [detalles, clearDraft]);

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
  }, [clearDraft, clearArticles]);

  if (isLoading || isLoadingDraft) {
    return <SkeletonFormWithSearch />;
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
          Error de conexiÃ³n
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
          headerTitle: "Conteo cÃ­clico",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleExit}
              style={{ marginLeft: Platform.OS === "android" ? 8 : 0 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
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
        <LocationChip
          sucursalNombre={sucursalNombre}
          almacenNombre={almacenNombre}
          ubicacion={ubicacionInicial}
          onPress={handleLocationOptions}
        />
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
              ArtÃ­culos ({totalArticulos})
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
        <ConteoEmptyState aggressiveScan={aggressiveScan} />
      )}

      <BottomActions
        disabled={
          !selectedSucursal || !selectedAlmacen || detalles.length === 0
        }
        onCancel={handleExit}
        onSave={handleSave}
      />

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

      <LocationPickerModal
        visible={showLocationModal}
        sucursales={sucursales}
        almacenes={almacenesFiltrados}
        selectedSucursal={selectedSucursal}
        selectedAlmacen={selectedAlmacen}
        onSelectSucursal={setSelectedSucursal}
        onSelectAlmacen={setSelectedAlmacen}
        onClose={() => {
          if (selectedSucursal && selectedAlmacen) setShowLocationModal(false);
        }}
      />

      <UbicacionModal
        visible={showUbicacionModal}
        ubicacion={ubicacionInicial}
        onChangeUbicacion={setUbicacionInicial}
        onFinish={handleFinishLocationSelection}
        onOpenScanner={handleOpenScanner}
      />

      <OptionsActionSheet
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onChangeUbicacion={() => {
          setShowOptionsModal(false);
          setTimeout(() => setShowUbicacionModal(true), 100);
        }}
        onChangeLocation={() => {
          setShowOptionsModal(false);
          setTimeout(() => setShowLocationModal(true), 100);
        }}
      />

      <SummaryModal
        visible={showSummaryModal}
        sucursalNombre={sucursalNombre}
        almacenNombre={almacenNombre}
        ubicacion={ubicacionInicial}
        totalArticulos={totalArticulos}
        totalUnidades={totalUnidades}
        isSubmitting={isSubmitting}
        onCancel={() => setShowSummaryModal(false)}
        onConfirm={handleConfirmSave}
      />

      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        folio={savedResult?.folio || null}
        doctoInId={savedResult?.doctoInvfisId}
        inserted={savedResult?.inserted}
        title="Â¡Conteo Guardado!"
        subtitle="El conteo se registrÃ³ correctamente"
        primaryButtonText="Ir a Aplicar"
        onPrimaryAction={handleGoToAplicar}
        secondaryButtonText="Realizar otro conteo"
        onSecondaryAction={handleNewConteo}
        tertiaryButtonText="Volver al menÃº"
        onTertiaryAction={handleSuccessClose}
      />

      <LocationScannerModal
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanned={handleLocationScanned}
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

      <DraftResumeModal
        visible={showDraftModal}
        draft={pendingDraft}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />

      <ExitConfirmModal
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
  loadingText: { marginTop: 16, fontSize: 14 },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  errorMessage: { fontSize: 13, textAlign: "center", marginBottom: 20 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  retryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  articlesList: { flex: 1 },
  articlesListContent: { paddingBottom: 12 },
  articlesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  articlesHeaderTitle: { fontSize: 13, fontWeight: "600" },
  articlesHeaderTotal: { fontSize: 11 },
});
