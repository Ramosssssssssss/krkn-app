import ArticleCard from "@/components/inventarios/ArticleCard";
import EditArticleComexModal from "@/components/inventarios/EditArticleComexModal";
import ProductSearchBar from "@/components/inventarios/ProductSearchBar";
import ScanHeader from "@/components/inventarios/ScanHeader";
import SearchResultsPicker from "@/components/inventarios/SearchResultsPicker";
import SuccessModal from "@/components/inventarios/SuccessModal";
import { API_CONFIG } from "@/config/api";
import { useLanguage } from "@/context/language-context";
import { useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { useSystemSounds } from "@/hooks/use-system-sounds";
import { completarConteoComex } from "@/services/api";
import { ArticuloDetalle } from "@/types/inventarios";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as FS from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#06B6D4";

export default function ConteoComexScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { playSound } = useSystemSounds();
  const [isExporting, setIsExporting] = useState(false);

  // Modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successInfo, setSuccessInfo] = useState({
    message: "",
    procesados: 0,
    errores: [] as { CLAVE: string; error: string }[],
  });
  const confirmScaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const confirmOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const errorScaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const errorOpacityAnim = React.useRef(new Animated.Value(0)).current;

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailClave, setDetailClave] = useState<string | null>(null);

  // Not-found codes history
  const [notFoundCodes, setNotFoundCodes] = useState<
    { codigo: string; fecha: Date }[]
  >([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [lastNotFoundCode, setLastNotFoundCode] = useState("");
  const [showNotFoundHistoryModal, setShowNotFoundHistoryModal] =
    useState(false);
  const [creatingCode, setCreatingCode] = useState<string | null>(null);
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);
  const [clasificadorActivo, setClasificadorActivo] = useState<string | null>(
    null,
  );
  const [catalogos, setCatalogos] = useState<{
    marcas: string[];
    lineas: string[];
    proveedores: string[];
    unidades_compra: string[];
    unidades_medida: string[];
  }>({
    marcas: [],
    lineas: [],
    proveedores: [],
    unidades_compra: [],
    unidades_medida: [],
  });
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    clave: "",
    nombre: "",
    codigo_barras: "",
    clave_alterna: "",
    linea: "",
    clave_sat: "",
    marca: "",
    proveedor: "",
    abc: "",
    estatus: "ACTIVO",
    codigo_barras_inner: "",
    codigo_barras_pieza: "",
    unidad_compra: "",
    unidad_medida: "PIEZA",
    inner_cantidad: "1",
    costo_inner: "0",
    ubicacion_tepexpan: "",
    ubicacion_zacango: "",
    ubicacion_vallejo: "",
    ubicacion_sedena: "",
  });
  const notFoundScaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const notFoundOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const notFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setShowErrorModal(true);
    errorScaleAnim.setValue(0.85);
    errorOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(errorScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(errorOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeErrorModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(errorScaleAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(errorOpacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setShowErrorModal(false));
  }, []);

  const openConfirmModal = useCallback(() => {
    setShowConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirmScaleAnim.setValue(0.85);
    confirmOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(confirmScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeConfirmModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(confirmScaleAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setShowConfirmModal(false));
  }, []);

  const closeNotFoundModal = useCallback(() => {
    if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
    Animated.parallel([
      Animated.timing(notFoundScaleAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(notFoundOpacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setShowNotFoundModal(false));
  }, []);

  const handleNotFound = useCallback((code: string) => {
    setNotFoundCodes((prev) => {
      if (prev.some((p) => p.codigo === code)) return prev;
      return [{ codigo: code, fecha: new Date() }, ...prev];
    });
    setLastNotFoundCode(code);
    setShowNotFoundModal(true);
    notFoundScaleAnim.setValue(0.85);
    notFoundOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(notFoundScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(notFoundOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
    notFoundTimerRef.current = setTimeout(() => {
      closeNotFoundModal();
    }, 1500);
  }, [closeNotFoundModal]);

  const openCreateForm = useCallback((codigo: string) => {
    setCreateFormData({
      clave: codigo,
      nombre: "",
      codigo_barras: "",
      clave_alterna: "",
      linea: "",
      clave_sat: "",
      marca: "",
      proveedor: "",
      abc: "",
      estatus: "ACTIVO",
      codigo_barras_inner: "",
      codigo_barras_pieza: "",
      unidad_compra: "",
      unidad_medida: "PIEZA",
      inner_cantidad: "1",
      costo_inner: "0",
      ubicacion_tepexpan: "",
      ubicacion_zacango: "",
      ubicacion_vallejo: "",
      ubicacion_sedena: "",
    });
    setShowCreateFormModal(true);
    // Fetch catalogos
    setLoadingCatalogos(true);
    fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATALOGOS_COMEX}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCatalogos({
            marcas: data.marcas || [],
            lineas: data.lineas || [],
            proveedores: data.proveedores || [],
            unidades_compra: data.unidades_compra || [],
            unidades_medida: data.unidades_medida || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCatalogos(false));
  }, []);

  const updateFormField = useCallback((field: string, value: string) => {
    setCreateFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateArticle = useCallback(async () => {
    if (
      !createFormData.clave.trim() ||
      !createFormData.nombre.trim() ||
      !createFormData.codigo_barras.trim()
    ) {
      playSound("error");
      Vibration.vibrate([0, 80, 40, 80]);
      showError("Clave, Nombre y Código de Barras son obligatorios");
      return;
    }
    setCreatingCode(createFormData.clave);
    try {
      const payload: Record<string, any> = { ...createFormData };
      // Limpiar campos vacíos a null
      Object.keys(payload).forEach((k) => {
        if (typeof payload[k] === "string" && payload[k].trim() === "") {
          payload[k] = null;
        }
      });
      // Defaults
      if (!payload.estatus) payload.estatus = "ACTIVO";
      if (!payload.unidad_medida) payload.unidad_medida = "PIEZA";
      if (!payload.inner_cantidad) payload.inner_cantidad = 1;
      if (!payload.costo_inner && payload.costo_inner !== 0)
        payload.costo_inner = 0;

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREAR_ARTICULO_COMEX}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (result.ok) {
        playSound("add");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotFoundCodes((prev) =>
          prev.filter((p) => p.codigo !== createFormData.clave),
        );
        setShowCreateFormModal(false);
      } else {
        playSound("error");
        Vibration.vibrate([0, 80, 40, 80]);
        showError(result.message || "No se pudo crear el artículo");
      }
    } catch {
      playSound("error");
      Vibration.vibrate([0, 80, 40, 80]);
      showError("Error de conexión al crear artículo");
    } finally {
      setCreatingCode(null);
    }
  }, [createFormData, playSound, showError, closeNotFoundModal]);

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
    setDetalles,
    searchAndAddArticle,
    searchResults,
    selectFromResults,
    dismissResults,
  } = useArticleScanner({
    customSearchUrl: (query) =>
      `${API_CONFIG.BASE_URL}/api/buscar-articulo-comex.php?busqueda=${encodeURIComponent(query)}`,
    onNotFound: handleNotFound,
  });

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, item) => sum + item.cantidad, 0);

  // ─── Import TXT ────────────────────────────────────
  const [isImporting, setIsImporting] = useState(false);

  const handleImportTXT = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/csv", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setIsImporting(true);
      const fileUri = result.assets[0].uri;
      const content = await FS.readAsStringAsync(fileUri);

      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        showError("El archivo está vacío");
        setIsImporting(false);
        return;
      }

      const imported: ArticuloDetalle[] = [];
      let skipped = 0;

      for (const line of lines) {
        // Soportar separador ; , o tab
        const parts = line.split(/[;,\t]/);
        if (parts.length < 2) {
          skipped++;
          continue;
        }

        const codigo = parts[0].replace(/"/g, "").trim();
        const cantidad = parseInt(parts[1].replace(/"/g, "").trim(), 10);

        if (!codigo || isNaN(cantidad) || cantidad <= 0) {
          skipped++;
          continue;
        }

        // Si ya existe en la lista importada, sumar
        const existIdx = imported.findIndex((i) => i.clave === codigo);
        if (existIdx !== -1) {
          imported[existIdx] = {
            ...imported[existIdx],
            cantidad: imported[existIdx].cantidad + cantidad,
          };
        } else {
          imported.push({
            clave: codigo,
            descripcion: codigo,
            umed: null,
            cantidad,
            _key: `imp-${Date.now()}-${imported.length}`,
          });
        }
      }

      if (imported.length === 0) {
        showError("No se encontraron artículos válidos en el archivo");
        setIsImporting(false);
        return;
      }

      // Merge con detalles existentes
      setDetalles((prev) => {
        const merged = [...prev];
        for (const item of imported) {
          const idx = merged.findIndex((m) => m.clave === item.clave);
          if (idx !== -1) {
            merged[idx] = {
              ...merged[idx],
              cantidad: merged[idx].cantidad + item.cantidad,
            };
          } else {
            merged.unshift(item);
          }
        }
        return merged;
      });

      playSound("add");
      Vibration.vibrate(100);

      const msg = `${imported.length} artículos importados (${imported.reduce((s, i) => s + i.cantidad, 0)} unidades)`;
      if (skipped > 0) {
        showError(`${msg}\n${skipped} líneas ignoradas`);
      }
    } catch (error: any) {
      playSound("error");
      showError(error?.message || "Error al importar archivo");
    } finally {
      setIsImporting(false);
    }
  }, [detalles, playSound, setDetalles, showError]);

  const runExportProcess = async (shouldShare = true) => {
    try {
      if (detalles.length === 0) return;

      const content = detalles
        .map((d) => `${d.clave};${d.cantidad}`)
        .join("\n");

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const filename = `CONTEO_COMEX_${timestamp}_${Math.floor(Math.random() * 1000)}.txt`;
      const fileUri = FS.cacheDirectory + filename;

      await FS.writeAsStringAsync(fileUri, content, {
        encoding: "utf8",
      });

      // Solo compartir si se solicita explícitamente (ej. botón exportar)
      if (shouldShare && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: "Exportar Conteo Comex",
          UTI: "public.plain-text",
        });
      }
    } catch (error) {
      console.error("Error al exportar/respaldar:", error);
      if (shouldShare) playSound("error");
    }
  };

  const handleExport = async () => {
    if (detalles.length === 0) {
      playSound("error");
      Vibration.vibrate([0, 80, 40, 80]);
      return;
    }
    playSound("add");
    await runExportProcess(true);
  };


  const handleComplete = () => {
    if (detalles.length === 0) {
      playSound("error");
      Vibration.vibrate([0, 80, 40, 80]);
      return;
    }
    openConfirmModal();
  };

  const executeComplete = async () => {
    closeConfirmModal();
    setIsExporting(true);
    try {
      const items = detalles.map((d) => ({
        CODIGO: d.clave,
        CANTIDAD: d.cantidad,
      }));

      const result = await completarConteoComex(items);

      if (result.ok) {
        // Exportar respaldo TXT silencioso
        await runExportProcess(false);

        const hasErrors = (result.errores_count ?? 0) > 0;
        const mappedErrors = (result.errores || []).map((e) => ({
          CLAVE: e.CODIGO,
          error: e.error,
        }));
        setSuccessInfo({
          message: hasErrors
            ? `${result.procesados} de ${result.total} procesados (${result.errores_count} con error, se saltaron)`
            : result.message || "Conteo guardado",
          procesados: result.procesados || detalles.length,
          errores: mappedErrors,
        });
        setShowSuccessModal(true);

        if (hasErrors) {
          // Vibración leve para indicar que hubo errores parciales
          Vibration.vibrate([0, 50, 30, 50]);
        }
      } else {
        playSound("error");
        Vibration.vibrate([0, 100, 50, 100]);
        showError(result.message || "No se pudo completar el conteo");
      }
    } catch (error: any) {
      playSound("error");
      Vibration.vibrate([0, 100, 50, 100]);
      showError(error?.message || "Error al conectar con la API");
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewArticle = useCallback((item: ArticuloDetalle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailClave(item.clave);
    setShowDetailModal(true);
  }, []);

  const handleRemoveWithSound = useCallback(
    (key: string) => {
      playSound("warning");
      Vibration.vibrate(50);
      handleRemoveArticle(key);
    },
    [handleRemoveArticle, playSound],
  );

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerTitle: "Conteo Comex",
          headerTitleAlign: "center",
          headerRight: () => (
            <View style={{ marginRight: Platform.OS === "android" ? 8 : 0 }}>
              <ScanHeader
                color="#06B6D4"
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
        color="#06B6D4"
        searchAndAddArticle={searchAndAddArticle}
      />

      <View
        style={[
          styles.headerStats,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: "#06B6D4" }]}>
            {totalArticulos}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            SKUs
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {totalUnidades}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            UNIDADES
          </Text>
        </View>
        {notFoundCodes.length > 0 && (
          <>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => setShowNotFoundHistoryModal(true)}
              activeOpacity={0.7}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                  {notFoundCodes.length}
                </Text>
                <View style={styles.notFoundBadgeDot} />
              </View>
              <Text style={[styles.statLabel, { color: "#F59E0B" }]}>
                NO ENCONTRADOS
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {detalles.length > 0 ? (
        <FlatList
          ref={listRef}
          data={detalles}
          keyExtractor={(item) => item._key}
          renderItem={({ item, index }) => (
            <ArticleCard
              item={item}
              index={index}
              color="#06B6D4"
              isFlashing={lastAddedIndex === index}
              flashAnim={flashAnim}
              onUpdateQuantity={handleUpdateQuantity}
              onSetQuantity={handleSetQuantity}
              onRemove={handleRemoveWithSound}
              onPress={handleViewArticle}
            />
          )}
          style={styles.articlesList}
          contentContainerStyle={[
            styles.articlesListContent,
            { paddingBottom: insets.bottom + 140 },
          ]}
        />
      ) : (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: "rgba(6, 182, 212, 0.1)" },
            ]}
          >
            <Ionicons name="barcode-outline" size={60} color="#06B6D4" />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            Comienza a escanear
          </Text>
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            Escanea códigos de barras o ingresa claves manualmente para iniciar
            el conteo.
          </Text>
          <TouchableOpacity
            style={[styles.importButton, { borderColor: "#06B6D4" }]}
            onPress={handleImportTXT}
            activeOpacity={0.8}
            disabled={isImporting}
          >
            <Ionicons name="document-text-outline" size={20} color="#06B6D4" />
            <Text
              style={{
                color: "#06B6D4",
                fontWeight: "600",
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              {isImporting ? "Importando..." : "Importar desde TXT"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {detalles.length > 0 && (
        <View style={[styles.bottomContainer, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#06B6D4" }]}
            onPress={handleComplete}
            activeOpacity={0.8}
            disabled={isExporting}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isExporting
                ? "Enviando..."
                : `Guardar en DB (${totalArticulos})`}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.exportSecondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: "#06B6D4",
                  flex: 1,
                },
              ]}
              onPress={handleExport}
              activeOpacity={0.8}
              disabled={isExporting}
            >
              <Ionicons name="share-outline" size={18} color="#06B6D4" />
              <Text
                style={[styles.exportSecondaryButtonText, { color: "#06B6D4" }]}
              >
                Exportar TXT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportSecondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: "#F59E0B",
                  flex: 1,
                },
              ]}
              onPress={handleImportTXT}
              activeOpacity={0.8}
              disabled={isImporting}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#F59E0B"
              />
              <Text
                style={[styles.exportSecondaryButtonText, { color: "#F59E0B" }]}
              >
                {isImporting ? "Importando..." : "Importar TXT"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Confirm Modal ─────────────────────────────────── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="none"
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: confirmScaleAnim }],
                opacity: confirmOpacityAnim,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: "rgba(6,182,212,0.1)" },
              ]}
            >
              <Ionicons name="cloud-upload" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿Completar Conteo?
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              Se enviarán los datos a CONTEO_CIDER y se exportará un respaldo
              TXT.
            </Text>

            <View
              style={[
                styles.modalStatsRow,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: ACCENT }]}>
                  {totalArticulos}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  SKUs
                </Text>
              </View>
              <View
                style={[
                  styles.modalStatDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>
                  {Math.floor(totalUnidades)}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Unidades
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalBtnSecondary,
                  { borderColor: colors.border },
                ]}
                onPress={closeConfirmModal}
              >
                <Text
                  style={[
                    styles.modalBtnSecondaryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: ACCENT }]}
                onPress={executeComplete}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.modalBtnPrimaryText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Error Modal ───────────────────────────────────── */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="none"
        onRequestClose={closeErrorModal}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: errorScaleAnim }],
                opacity: errorOpacityAnim,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: "rgba(239,68,68,0.1)" },
              ]}
            >
              <Ionicons name="close-circle" size={40} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Error
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              {errorMsg}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalBtnPrimary,
                { backgroundColor: "#EF4444", width: "100%" },
              ]}
              onPress={closeErrorModal}
            >
              <Text style={styles.modalBtnPrimaryText}>Entendido</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Success Modal ─────────────────────────────────── */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          clearArticles();
        }}
        folio={null}
        inserted={successInfo.procesados}
        warnings={successInfo.errores}
        title="¡Conteo Guardado!"
        subtitle={successInfo.message}
        primaryButtonText="Listo"
        onPrimaryAction={() => {
          setShowSuccessModal(false);
          clearArticles();
        }}
      />

      {/* ─── Article Detail Modal ──────────────────────────── */}
      <EditArticleComexModal
        visible={showDetailModal}
        clave={detailClave}
        onClose={() => {
          setShowDetailModal(false);
          setDetailClave(null);
        }}
      />

      {/* ─── Not Found Alert Modal ─────────────────────────── */}
      <Modal
        visible={showNotFoundModal}
        transparent
        animationType="none"
        onRequestClose={closeNotFoundModal}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: notFoundScaleAnim }],
                opacity: notFoundOpacityAnim,
              },
            ]}
          >
            {/* Warning Icon */}
            <View style={styles.nfIconOuter}>
              <View style={styles.nfIconMiddle}>
                <Ionicons name="search" size={28} color="#F59E0B" />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Código No Encontrado
            </Text>

            <View
              style={[
                styles.nfCodeBox,
                { backgroundColor: `${colors.border}40` },
              ]}
            >
              <Text style={[styles.nfCodeText, { color: colors.text }]}>
                {lastNotFoundCode}
              </Text>
            </View>

            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              Este código se guardó en el historial de no encontrados.
            </Text>

            {notFoundCodes.length > 1 && (
              <TouchableOpacity
                style={[styles.nfHistoryLink]}
                onPress={() => {
                  closeNotFoundModal();
                  setTimeout(() => setShowNotFoundHistoryModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={styles.nfHistoryLinkText}>
                  Ver historial ({notFoundCodes.length})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.modalBtnPrimary,
                { backgroundColor: "#F59E0B", width: "100%", marginTop: 4 },
              ]}
              onPress={closeNotFoundModal}
            >
              <Text style={styles.modalBtnPrimaryText}>Entendido</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Not Found History Modal ───────────────────────── */}
      <Modal
        visible={showNotFoundHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotFoundHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <View
            style={[styles.nfHistoryCard, { backgroundColor: colors.surface }]}
          >
            {/* Header */}
            <View style={styles.nfHistoryHeader}>
              <View
                style={[
                  styles.nfHistoryIconWrap,
                  { backgroundColor: "rgba(245,158,11,0.1)" },
                ]}
              >
                <Ionicons name="alert-circle" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.nfHistoryTitle, { color: colors.text }]}>
                  Códigos No Encontrados
                </Text>
                <Text
                  style={[
                    styles.nfHistorySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {notFoundCodes.length} código
                  {notFoundCodes.length !== 1 ? "s" : ""} registrado
                  {notFoundCodes.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.nfHistoryCloseBtn,
                  { backgroundColor: `${colors.border}60` },
                ]}
                onPress={() => setShowNotFoundHistoryModal(false)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.nfHistoryDivider,
                { backgroundColor: colors.border },
              ]}
            />

            {/* List */}
            {notFoundCodes.length === 0 ? (
              <View style={styles.nfHistoryEmpty}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.nfHistoryEmptyText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Sin códigos no encontrados
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 340 }}
                showsVerticalScrollIndicator={false}
              >
                {notFoundCodes.map((item, index) => (
                  <View
                    key={`${item.codigo}-${index}`}
                    style={[
                      styles.nfHistoryRow,
                      index === notFoundCodes.length - 1 && {
                        borderBottomWidth: 0,
                      },
                      { borderBottomColor: `${colors.border}60` },
                    ]}
                  >
                    <View
                      style={[
                        styles.nfHistoryIndex,
                        { backgroundColor: "rgba(245,158,11,0.1)" },
                      ]}
                    >
                      <Text style={styles.nfHistoryIndexText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[styles.nfHistoryCode, { color: colors.text }]}
                      >
                        {item.codigo}
                      </Text>
                      <Text
                        style={[
                          styles.nfHistoryTime,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {item.fecha.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.nfCreateBtn,
                        { backgroundColor: "rgba(16,185,129,0.1)" },
                      ]}
                      onPress={() => openCreateForm(item.codigo)}
                      disabled={creatingCode === item.codigo}
                      activeOpacity={0.7}
                    >
                      {creatingCode === item.codigo ? (
                        <ActivityIndicator size="small" color="#10B981" />
                      ) : (
                        <Ionicons name="add-circle" size={22} color="#10B981" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nfHistoryRemoveBtn]}
                      onPress={() => {
                        setNotFoundCodes((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Footer Actions */}
            {notFoundCodes.length > 0 && (
              <View style={styles.nfHistoryFooter}>
                <TouchableOpacity
                  style={[
                    styles.nfHistoryClearBtn,
                    { backgroundColor: `${colors.border}40` },
                  ]}
                  onPress={() => {
                    setNotFoundCodes([]);
                    setShowNotFoundHistoryModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text
                    style={[styles.nfHistoryClearText, { color: "#EF4444" }]}
                  >
                    Limpiar todo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.nfHistoryDoneBtn,
                    { backgroundColor: "#F59E0B" },
                  ]}
                  onPress={() => setShowNotFoundHistoryModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nfHistoryDoneBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Create Article Form Modal ─────────────────────── */}
      <Modal
        visible={showCreateFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateFormModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={50}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(0,0,0,0.5)" },
                ]}
              />
            )}
            <View
              style={[
                styles.createFormCard,
                { backgroundColor: colors.surface },
              ]}
            >
              {/* Header */}
              <View style={styles.createFormHeader}>
                <View
                  style={[
                    styles.createFormIconWrap,
                    { backgroundColor: "rgba(16,185,129,0.1)" },
                  ]}
                >
                  <Ionicons name="add-circle" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[styles.createFormTitle, { color: colors.text }]}
                  >
                    Crear Artículo en COMEX
                  </Text>
                  <Text
                    style={[
                      styles.createFormSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Los campos con * son obligatorios
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.createFormCloseBtn,
                    { backgroundColor: `${colors.border}60` },
                  ]}
                  onPress={() => setShowCreateFormModal(false)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.createFormDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <ScrollView
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ─ Información Principal ─ */}
                <Text
                  style={[styles.createFormSectionTitle, { color: ACCENT }]}
                >
                  Información Principal
                </Text>

                <View style={styles.createFormField}>
                  <Text
                    style={[
                      styles.createFormLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Clave Principal <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.createFormInputWrap,
                      {
                        backgroundColor: `${colors.border}30`,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.createFormInput, { color: colors.text }]}
                      value={createFormData.clave}
                      editable={false}
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>

                <View style={styles.createFormField}>
                  <Text
                    style={[
                      styles.createFormLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Nombre <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.createFormInputWrap,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.createFormInput, { color: colors.text }]}
                      value={createFormData.nombre}
                      onChangeText={(v) => updateFormField("nombre", v)}
                      placeholder="Nombre del artículo"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.createFormField}>
                  <Text
                    style={[
                      styles.createFormLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Código de Barras <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.createFormInputWrap,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.createFormInput, { color: colors.text }]}
                      value={createFormData.codigo_barras}
                      onChangeText={(v) => updateFormField("codigo_barras", v)}
                      placeholder="Código de barras general"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.createFormField}>
                  <Text
                    style={[
                      styles.createFormLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Clave Alterna
                  </Text>
                  <View
                    style={[
                      styles.createFormInputWrap,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.createFormInput, { color: colors.text }]}
                      value={createFormData.clave_alterna}
                      onChangeText={(v) => updateFormField("clave_alterna", v)}
                      placeholder="Clave alterna"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.createFormField}>
                  <Text
                    style={[
                      styles.createFormLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Clave SAT
                  </Text>
                  <View
                    style={[
                      styles.createFormInputWrap,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.createFormInput, { color: colors.text }]}
                      value={createFormData.clave_sat}
                      onChangeText={(v) => updateFormField("clave_sat", v)}
                      placeholder="Clave SAT"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* ─ Clasificación ─ */}
                <Text
                  style={[
                    styles.createFormSectionTitle,
                    { color: ACCENT, marginTop: 16 },
                  ]}
                >
                  Clasificación
                </Text>

                {[
                  {
                    key: "linea",
                    label: "Línea",
                    icon: "layers-outline" as const,
                    items: catalogos.lineas,
                  },
                  {
                    key: "marca",
                    label: "Marca",
                    icon: "pricetag-outline" as const,
                    items: catalogos.marcas,
                  },
                  {
                    key: "proveedor",
                    label: "Proveedor",
                    icon: "business-outline" as const,
                    items: catalogos.proveedores,
                  },
                  {
                    key: "unidad_compra",
                    label: "U. Compra",
                    icon: "cube-outline" as const,
                    items: catalogos.unidades_compra,
                  },
                  {
                    key: "unidad_medida",
                    label: "U. Medida",
                    icon: "resize-outline" as const,
                    items: catalogos.unidades_medida,
                  },
                ].map((cat) => {
                  const selected = (createFormData as any)[cat.key] as string;
                  return (
                    <View key={cat.key} style={styles.createFormField}>
                      <TouchableOpacity
                        style={[
                          styles.clasificadorPickerBtn,
                          {
                            backgroundColor: selected
                              ? `${ACCENT}10`
                              : `${colors.border}20`,
                            borderColor: selected ? ACCENT : colors.border,
                          },
                        ]}
                        onPress={() => setClasificadorActivo(cat.key)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={16}
                          color={selected ? ACCENT : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.clasificadorPickerLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          {selected ? (
                            <View
                              style={[
                                styles.clasificadorPickerValue,
                                { backgroundColor: ACCENT },
                              ]}
                            >
                              <Text style={styles.clasificadorPickerValueText}>
                                {selected}
                              </Text>
                            </View>
                          ) : (
                            <Text
                              style={[
                                styles.clasificadorPickerPlaceholder,
                                { color: colors.textTertiary },
                              ]}
                            >
                              Seleccionar
                            </Text>
                          )}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <View style={styles.createFormRow}>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ABC
                    </Text>
                    <View style={styles.createFormChipRow}>
                      {["A", "B", "C"].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[
                            styles.createFormChip,
                            {
                              backgroundColor:
                                createFormData.abc === v
                                  ? ACCENT
                                  : `${colors.border}40`,
                              borderColor:
                                createFormData.abc === v
                                  ? "transparent"
                                  : colors.border,
                            },
                          ]}
                          onPress={() =>
                            updateFormField(
                              "abc",
                              createFormData.abc === v ? "" : v,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.createFormChipText,
                              {
                                color:
                                  createFormData.abc === v
                                    ? "#fff"
                                    : colors.textSecondary,
                              },
                            ]}
                          >
                            {v}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Estatus
                    </Text>
                    <View style={styles.createFormChipRow}>
                      {["ACTIVO", "INACTIVO"].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.createFormChip,
                            {
                              backgroundColor:
                                createFormData.estatus === s
                                  ? s === "ACTIVO"
                                    ? "#10B981"
                                    : "#EF4444"
                                  : `${colors.border}40`,
                              borderColor:
                                createFormData.estatus === s
                                  ? "transparent"
                                  : colors.border,
                            },
                          ]}
                          onPress={() => updateFormField("estatus", s)}
                        >
                          <Text
                            style={[
                              styles.createFormChipText,
                              {
                                color:
                                  createFormData.estatus === s
                                    ? "#fff"
                                    : colors.textSecondary,
                              },
                            ]}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* ─ Códigos de Barras ─ */}
                <Text
                  style={[
                    styles.createFormSectionTitle,
                    { color: ACCENT, marginTop: 16 },
                  ]}
                >
                  Códigos de Barras
                </Text>

                <View style={styles.createFormRow}>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      CB Inner
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.codigo_barras_inner}
                        onChangeText={(v) =>
                          updateFormField("codigo_barras_inner", v)
                        }
                        placeholder="Código barras inner"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      CB Pieza
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.codigo_barras_pieza}
                        onChangeText={(v) =>
                          updateFormField("codigo_barras_pieza", v)
                        }
                        placeholder="Código barras pieza"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* ─ Unidades / Inner ─ */}
                <Text
                  style={[
                    styles.createFormSectionTitle,
                    { color: ACCENT, marginTop: 16 },
                  ]}
                >
                  Unidades / Inner
                </Text>

                <View style={styles.createFormRow}>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Inner Cantidad
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.inner_cantidad}
                        onChangeText={(v) =>
                          updateFormField(
                            "inner_cantidad",
                            v.replace(/[^0-9]/g, ""),
                          )
                        }
                        placeholder="1"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Costo Inner
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.costo_inner}
                        onChangeText={(v) =>
                          updateFormField(
                            "costo_inner",
                            v.replace(/[^0-9.]/g, ""),
                          )
                        }
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* ─ Ubicaciones ─ */}
                <Text
                  style={[
                    styles.createFormSectionTitle,
                    { color: ACCENT, marginTop: 16 },
                  ]}
                >
                  Ubicaciones
                </Text>

                <View style={styles.createFormRow}>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Tepexpan
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.ubicacion_tepexpan}
                        onChangeText={(v) =>
                          updateFormField("ubicacion_tepexpan", v)
                        }
                        placeholder="—"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Zacango
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.ubicacion_zacango}
                        onChangeText={(v) =>
                          updateFormField("ubicacion_zacango", v)
                        }
                        placeholder="—"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.createFormRow}>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Vallejo
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.ubicacion_vallejo}
                        onChangeText={(v) =>
                          updateFormField("ubicacion_vallejo", v)
                        }
                        placeholder="—"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                  <View style={[styles.createFormField, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.createFormLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Sedena
                    </Text>
                    <View
                      style={[
                        styles.createFormInputWrap,
                        { borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        style={[styles.createFormInput, { color: colors.text }]}
                        value={createFormData.ubicacion_sedena}
                        onChangeText={(v) =>
                          updateFormField("ubicacion_sedena", v)
                        }
                        placeholder="—"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                </View>

                <View style={{ height: 16 }} />
              </ScrollView>

              {/* Footer */}
              <View
                style={[
                  styles.createFormDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.createFormFooter}>
                <TouchableOpacity
                  style={[
                    styles.createFormCancelBtn,
                    { backgroundColor: `${colors.border}40` },
                  ]}
                  onPress={() => setShowCreateFormModal(false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.createFormCancelText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createFormSaveBtn,
                    {
                      backgroundColor: "#10B981",
                      opacity:
                        !createFormData.nombre.trim() ||
                        !createFormData.codigo_barras.trim()
                          ? 0.5
                          : 1,
                    },
                  ]}
                  onPress={handleCreateArticle}
                  disabled={
                    !!creatingCode ||
                    !createFormData.nombre.trim() ||
                    !createFormData.codigo_barras.trim()
                  }
                  activeOpacity={0.8}
                >
                  {creatingCode ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.createFormSaveText}>
                        Crear Artículo
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Clasificador Picker Modal ─────────────────── */}
      <Modal
        visible={!!clasificadorActivo}
        transparent
        animationType="slide"
        onRequestClose={() => setClasificadorActivo(null)}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <View
            style={[
              styles.clasificadoresCard,
              { backgroundColor: colors.surface },
            ]}
          >
            {(() => {
              const catConfig: Record<
                string,
                { label: string; icon: string; items: string[]; field: string }
              > = {
                linea: {
                  label: "Línea",
                  icon: "layers-outline",
                  items: catalogos.lineas,
                  field: "linea",
                },
                marca: {
                  label: "Marca",
                  icon: "pricetag-outline",
                  items: catalogos.marcas,
                  field: "marca",
                },
                proveedor: {
                  label: "Proveedor",
                  icon: "business-outline",
                  items: catalogos.proveedores,
                  field: "proveedor",
                },
                unidad_compra: {
                  label: "Unidad de Compra",
                  icon: "cube-outline",
                  items: catalogos.unidades_compra,
                  field: "unidad_compra",
                },
                unidad_medida: {
                  label: "Unidad de Medida",
                  icon: "resize-outline",
                  items: catalogos.unidades_medida,
                  field: "unidad_medida",
                },
              };
              const cfg = clasificadorActivo
                ? catConfig[clasificadorActivo]
                : null;
              if (!cfg) return null;
              const selected = (createFormData as any)[cfg.field] as string;
              return (
                <>
                  {/* Header */}
                  <View style={styles.createFormHeader}>
                    <View
                      style={[
                        styles.createFormIconWrap,
                        { backgroundColor: `${ACCENT}15` },
                      ]}
                    >
                      <Ionicons
                        name={cfg.icon as any}
                        size={22}
                        color={ACCENT}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[styles.createFormTitle, { color: colors.text }]}
                      >
                        {cfg.label}
                      </Text>
                      <Text
                        style={[
                          styles.createFormSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Toca para seleccionar
                      </Text>
                    </View>
                    {selected ? (
                      <TouchableOpacity
                        style={[
                          styles.clasificadorClearBtn,
                          { backgroundColor: "#EF444420" },
                        ]}
                        onPress={() => updateFormField(cfg.field, "")}
                      >
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color="#EF4444"
                        />
                        <Text
                          style={{
                            color: "#EF4444",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          Limpiar
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.createFormCloseBtn,
                        {
                          backgroundColor: `${colors.border}60`,
                          marginLeft: 8,
                        },
                      ]}
                      onPress={() => setClasificadorActivo(null)}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.createFormDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <ScrollView
                    style={{ maxHeight: 380 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <View
                      style={[styles.clasificadoresChipGrid, { padding: 16 }]}
                    >
                      {cfg.items.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.clasificadoresChip,
                            {
                              backgroundColor:
                                selected === item
                                  ? ACCENT
                                  : `${colors.border}30`,
                              borderColor:
                                selected === item ? ACCENT : colors.border,
                            },
                          ]}
                          onPress={() => {
                            updateFormField(
                              cfg.field,
                              selected === item ? "" : item,
                            );
                            setClasificadorActivo(null);
                          }}
                        >
                          {selected === item && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="#fff"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.clasificadoresChipText,
                              {
                                color: selected === item ? "#fff" : colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {cfg.items.length === 0 && (
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 13,
                            fontStyle: "italic",
                            padding: 20,
                          }}
                        >
                          No hay opciones disponibles
                        </Text>
                      )}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <SearchResultsPicker
        visible={searchResults.length > 0}
        results={searchResults}
        color="#06B6D4"
        onSelect={selectFromResults}
        onDismiss={dismissResults}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerStats: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: { width: 1, height: "60%", alignSelf: "center" },
  articlesList: { flex: 1 },
  articlesListContent: { paddingVertical: 8 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 100,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 20,
  },
  bottomContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  saveButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: "100%",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  exportSecondaryButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    width: "100%",
  },
  exportSecondaryButtonText: { fontSize: 14, fontWeight: "600", marginLeft: 8 },

  // ─── Confirm Modal ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.8,
  },
  modalStatsRow: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
    width: "100%",
  },
  modalStatItem: { flex: 1, alignItems: "center" },
  modalStatValue: { fontSize: 22, fontWeight: "800" },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  modalStatDivider: { width: 1, height: "80%", alignSelf: "center" },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: "600" },
  modalBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Not Found badge dot
  notFoundBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F59E0B",
  },

  // Not Found Alert Modal
  nfIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245,158,11,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  nfIconMiddle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(245,158,11,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  nfCodeBox: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  nfCodeText: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 1,
  },
  nfHistoryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  nfHistoryLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F59E0B",
  },

  // Not Found History Modal
  nfHistoryCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    maxHeight: "75%",
  },
  nfHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  nfHistoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nfHistoryTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  nfHistorySubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  nfHistoryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  nfHistoryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  nfHistoryEmpty: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
  },
  nfHistoryEmptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  nfHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nfHistoryIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  nfHistoryIndexText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },
  nfHistoryCode: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 0.5,
  },
  nfHistoryTime: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  nfHistoryRemoveBtn: {
    padding: 4,
    marginLeft: 4,
  },
  nfCreateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  nfHistoryFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  nfHistoryClearBtn: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  nfHistoryClearText: {
    fontSize: 13,
    fontWeight: "600",
  },
  nfHistoryDoneBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  nfHistoryDoneBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  /* ─── Create Form Modal ─────────────────────────── */
  createFormCard: {
    width: "92%",
    maxWidth: 440,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 15,
  },
  createFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  createFormIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createFormTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  createFormSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  createFormCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createFormDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  createFormSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  createFormField: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  createFormLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
  },
  createFormInputWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  createFormInput: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  createFormRow: {
    flexDirection: "row",
    gap: 10,
  },
  createFormChipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "nowrap",
  },
  createFormChipScroll: {
    maxHeight: 40,
  },
  createFormChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  createFormChipText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  createFormFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  createFormCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createFormCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  createFormSaveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createFormSaveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  /* ─── Clasificadores Button ─────────────────────── */
  clasificadorPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  clasificadorPickerLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  clasificadorPickerValue: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clasificadorPickerValueText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  clasificadorPickerPlaceholder: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },
  clasificadorClearBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },

  /* ─── Clasificadores Modal ──────────────────────── */
  clasificadoresCard: {
    width: "92%",
    maxWidth: 440,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 15,
  },
  clasificadoresSection: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  clasificadoresSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  clasificadoresSectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  clasificadoresSelectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clasificadoresSelectedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  clasificadoresChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  clasificadoresChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  clasificadoresChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
