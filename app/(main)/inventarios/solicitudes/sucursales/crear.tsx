import ArticleCard from "@/components/inventarios/ArticleCard";
import MovimientoDraftModal from "@/components/inventarios/MovimientoDraftModal";
import MovimientoExitModal from "@/components/inventarios/MovimientoExitModal";
import ProductDetailModal from "@/components/inventarios/ProductDetailModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import ScanHeader from "@/components/inventarios/ScanHeader";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useMovimientoDraft } from "@/hooks/use-movimiento-draft";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { crearSolicitudTraspaso } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CrearSolicitudSucursalScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    folio: string;
    solicitud_id: number;
    inserted: number;
  } | null>(null);

  // Selección de Sucursales/Almacenes con el hook centralizado
  const {
    sucursales,
    almacenes,
    isLoading: loadingConfig,
    error: configError,
    refresh: refreshConfig,
  } = useSucursalesAlmacenes();

  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);

  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destinoSucursalId, setDestinoSucursalId] = useState<number | null>(
    null,
  );
  const [destinoAlmacenId, setDestinoAlmacenId] = useState<number | null>(null);

  // Para el modal de detalle de producto
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState<
    any | null
  >(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const draftRestored = useRef(false);

  const origenNombre = sucursales.find((s) => s.id === origenId)?.nombre || "";
  const destinoSucursalNombre =
    sucursales.find((s) => s.id === destinoSucursalId)?.nombre || "";
  const destinoAlmacenNombre =
    almacenes.find((a) => a.id === destinoAlmacenId)?.nombre || "";

  const {
    searchQuery,
    isSearching,
    detalles: articles,
    aggressiveScan,
    searchInputRef,
    setAggressiveScan,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleSetQuantity,
    handleRemoveArticle,
    clearArticles,
    setDetalles,
  } = useArticleScanner();

  const { pendingDraft, isLoadingDraft, saveDraft, clearDraft, dismissDraft } =
    useMovimientoDraft("solicitud_draft");

  const totalArticles = articles.length;
  const totalUnits = articles.reduce((sum, item) => sum + item.cantidad, 0);

  // — Draft: detectar borrador pendiente al montar
  useEffect(() => {
    if (!isLoadingDraft && pendingDraft && !draftRestored.current) {
      setShowDraftModal(true);
    }
  }, [isLoadingDraft, pendingDraft]);

  // — Draft: auto-guardar cada cambio
  useEffect(() => {
    if (draftRestored.current || articles.length === 0) return;
    saveDraft({
      sucursalId: origenId,
      almacenId: null,
      extra: { destinoSucursalId, destinoAlmacenId },
      detalles: articles,
      savedAt: Date.now(),
    });
  }, [articles, origenId, destinoSucursalId, destinoAlmacenId]);

  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    draftRestored.current = true;
    setShowDraftModal(false);
    if (pendingDraft.sucursalId) setOrigenId(pendingDraft.sucursalId);
    if (pendingDraft.extra?.destinoSucursalId)
      setDestinoSucursalId(pendingDraft.extra.destinoSucursalId);
    if (pendingDraft.extra?.destinoAlmacenId)
      setDestinoAlmacenId(pendingDraft.extra.destinoAlmacenId);
    setDetalles(pendingDraft.detalles);
  }, [pendingDraft]);

  const handleDiscardDraft = useCallback(() => {
    dismissDraft();
    setShowDraftModal(false);
  }, []);

  const handleExit = useCallback(() => {
    if (articles.length === 0) {
      clearDraft();
      router.back();
      return;
    }
    setShowExitModal(true);
  }, [articles]);

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

  const handleArticlePress = (article: any) => {
    setSelectedArticleForDetail(article);
    setShowProductDetail(true);
  };

  const handleSave = async () => {
    if (!origenId || !destinoSucursalId || !destinoAlmacenId) {
      Alert.alert("Faltan datos", "Debes seleccionar origen y destino");
      return;
    }
    if (articles.length === 0) {
      Alert.alert("Faltan datos", "Debes agregar al menos un artículo");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        usuario: user?.USERNAME || user?.NOMBRE || "App User",
        descripcion: `Solicitud de ${origenNombre} a ${destinoSucursalNombre}`,
        sucursalOrigenId: origenId,
        sucursalDestinoId: destinoSucursalId,
        almacenDestinoId: destinoAlmacenId,
        articulos: articles.map((a) => ({
          clave: a.clave,
          articulo_id: a.articuloId || 0,
          cantidad: a.cantidad,
        })),
      };

      const res = await crearSolicitudTraspaso(data);
      if (res.ok) {
        setSuccessResult({
          folio: res.folio || `SOL-${res.solicitud_id}`,
          solicitud_id: res.solicitud_id || 0,
          inserted: articles.length,
        });
        setShowSuccessModal(true);
      } else {
        Alert.alert("Error", res.message);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo crear la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConfig || isLoadingDraft) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FB923C" />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Cargando sucursales...
        </Text>
      </View>
    );
  }

  if (configError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons
          name="cloud-offline-outline"
          size={64}
          color={colors.border}
        />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          {configError}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshConfig}>
          <Text style={{ color: "#FB923C", fontWeight: "700" }}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Nueva Solicitud",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity onPress={handleExit} style={{ paddingRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <ScanHeader
              color="#FB923C"
              aggressiveScan={aggressiveScan}
              onToggleScan={setAggressiveScan}
            />
          ),
        }}
      />

      <View style={styles.header}>
        <View style={styles.selectorsRow}>
          <TouchableOpacity
            style={[
              styles.selector,
              {
                backgroundColor: colors.surface,
                borderColor: origenId ? "#FB923C" : colors.border,
              },
            ]}
            onPress={() => setShowOrigenModal(true)}
          >
            <Text
              style={[styles.selectorLabel, { color: colors.textSecondary }]}
            >
              SOLICITA (Origen)
            </Text>
            <Text
              style={[styles.selectorValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {origenNombre || "Seleccionar..."}
            </Text>
          </TouchableOpacity>

          <View style={styles.connector}>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.selector,
              {
                backgroundColor: colors.surface,
                borderColor: destinoAlmacenId ? "#FB923C" : colors.border,
              },
            ]}
            onPress={() => setShowDestinoModal(true)}
          >
            <Text
              style={[styles.selectorLabel, { color: colors.textSecondary }]}
            >
              A (Destino)
            </Text>
            <Text
              style={[styles.selectorValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {destinoAlmacenId
                ? `${destinoSucursalNombre} (${destinoAlmacenNombre})`
                : "Seleccionar..."}
            </Text>
          </TouchableOpacity>
        </View>

        <ProductSearchBar
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          isSearching={isSearching}
          aggressiveScan={aggressiveScan}
          color="#FB923C"
        />
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item._key}
        renderItem={({ item, index }) => (
          <ArticleCard
            item={item}
            index={index}
            color="#FB923C"
            onUpdateQuantity={handleUpdateQuantity}
            onSetQuantity={handleSetQuantity}
            onRemove={handleRemoveArticle}
            onPress={handleArticlePress}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="barcode-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No hay artículos escaneados
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.summary}>
          <View>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              SKUs
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {totalArticles}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              UDs
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {totalUnits}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.btnSubmit,
            {
              backgroundColor: "#FB923C",
              opacity: isSubmitting || articles.length === 0 ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isSubmitting || articles.length === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.btnSubmitText}>Crear Solicitud</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Selección Origen (Sucursal) */}
      <Modal visible={showOrigenModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿Quién solicita?
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {sucursales.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setOrigenId(s.id);
                    setShowOrigenModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {s.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowOrigenModal(false)}
            >
              <Text style={{ color: "#FB923C", fontWeight: "800" }}>
                CERRAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Selección Destino (Sucursal + Almacén) */}
      <Modal visible={showDestinoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿A quién se solicita?
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {almacenes.map((a) => {
                const sucNombre =
                  sucursales.find((s) => s.id === a.sucursalId)?.nombre || "";
                return (
                  <TouchableOpacity
                    key={`${a.sucursalId}-${a.id}`}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      setDestinoSucursalId(a.sucursalId);
                      setDestinoAlmacenId(a.id);
                      setShowDestinoModal(false);
                    }}
                  >
                    <View>
                      <Text
                        style={[styles.modalItemText, { color: colors.text }]}
                      >
                        {sucNombre}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: colors.textSecondary }}
                      >
                        {a.nombre}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowDestinoModal(false)}
            >
              <Text style={{ color: "#FB923C", fontWeight: "800" }}>
                CERRAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Éxito */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          clearDraft();
          clearArticles();
          router.back();
        }}
        folio={successResult?.folio || null}
        doctoInId={successResult?.solicitud_id}
        inserted={successResult?.inserted || 0}
        title="¡Solicitud Creada!"
        subtitle="Tu solicitud de traspaso fue registrada correctamente"
        primaryButtonText="Aceptar"
        onPrimaryAction={() => {
          setShowSuccessModal(false);
          clearDraft();
          clearArticles();
          router.back();
        }}
      />

      {/* Modal de Detalle del Producto */}
      <ProductDetailModal
        visible={showProductDetail}
        articulo={selectedArticleForDetail}
        onClose={() => setShowProductDetail(false)}
      />

      <MovimientoDraftModal
        visible={showDraftModal}
        draft={pendingDraft}
        title="Solicitud en curso"
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />

      <MovimientoExitModal
        visible={showExitModal}
        totalArticulos={totalArticles}
        totalUnidades={totalUnits}
        onSaveDraft={handleExitSaveDraft}
        onDiscardExit={handleExitDiscard}
        onCancel={() => setShowExitModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  retryBtn: { marginTop: 20, padding: 12 },
  header: { padding: 16, gap: 12 },
  selectorsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selector: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  selectorLabel: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  selectorValue: { fontSize: 13, fontWeight: "600" },
  connector: { width: 24, alignItems: "center" },
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryLabel: { fontSize: 10, fontWeight: "700" },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryDivider: { width: 1, height: 24, backgroundColor: "rgba(0,0,0,0.1)" },
  btnSubmit: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    elevation: 4,
  },
  btnSubmitText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText: { fontSize: 16, fontWeight: "600" },
  modalClose: { marginTop: 16, alignItems: "center", padding: 10 },
});
