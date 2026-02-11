import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Tipos
export interface CajaDisponible {
  CODIGO_CAJA: string;
  NOMBRE_CAJA: string;
  ESTADO: string;
}

export interface GrupoCajas {
  tipo: string;
  prefijo: string;
  total: number;
  mostrando: number;
  cajas: CajaDisponible[];
}

export interface CajaOcupada {
  CODIGO_CAJA: string;
  NOMBRE_CAJA: string;
  ESTADO_CAJA: string;
  FOLIO: string;
  NOMBRE_PICKER: string;
  FECHA_APARTADO: string | null;
  TOTAL_ARTICULOS: number;
  TOTAL_UNIDADES: number;
}

interface CajasModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  apiBase: string;
  // Props para modo selección
  selectionMode?: boolean;
  selectedCaja?: string | null;
  onSelectCaja?: (codigo: string) => void;
  onConfirmSelection?: (codigo: string) => void;
  loading?: boolean;
  // Ver detalle de caja ocupada
  onVerCaja?: (caja: CajaOcupada) => void;
  // Validar caja escaneada
  onValidateScan?: (codigo: string) => Promise<boolean>;
}

type TabType = "disponibles" | "ocupadas";

// Colores por tipo de caja (basado en NOMBRE_CAJA)
const TIPO_COLORS: Record<string, { bg: string; text: string; icon: string }> =
  {
    "CAJA AZUL RECIBO": { bg: "#3B82F620", text: "#3B82F6", icon: "cube" },
    "CAJA NARANJA": { bg: "#F9731620", text: "#F97316", icon: "cube" },
    "CAJA CAFE": { bg: "#78350F20", text: "#92400E", icon: "cube" },
    TARIMA: { bg: "#8B5CF620", text: "#8B5CF6", icon: "grid" },
    "CARRITO CHICO": { bg: "#06B6D420", text: "#06B6D4", icon: "cart" },
    "CARRITO MEDIANO": { bg: "#14B8A620", text: "#14B8A6", icon: "cart" },
    "CARRITO GRANDE": { bg: "#10B98120", text: "#10B981", icon: "cart" },
  };

export function CajasModal({
  visible,
  onClose,
  colors,
  apiBase,
  selectionMode = false,
  selectedCaja = null,
  onSelectCaja,
  onConfirmSelection,
  loading: externalLoading = false,
  onVerCaja,
  onValidateScan,
}: CajasModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("disponibles");
  const [loading, setLoading] = useState(false);
  const [gruposDisponibles, setGruposDisponibles] = useState<GrupoCajas[]>([]);
  const [totalDisponibles, setTotalDisponibles] = useState(0);
  const [cajasOcupadas, setCajasOcupadas] = useState<CajaOcupada[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set());

  // Estados para escaneo
  const [scannerText, setScannerText] = useState("");
  const [validating, setValidating] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanInputRef = useRef<TextInput>(null);

  // Estados para cámara
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedRef = useRef<string>("");

  // Cargar datos cuando se abre el modal
  // Solo cargar si NO estamos en modo selección
  useEffect(() => {
    if (visible) {
      // Limpiar estado de escaneo al abrir
      setScannerText("");
      setScanError(null);
      setShowCamera(false);

      if (selectionMode) {
        // En modo selección, solo enfocar input, NO cargar cajas
        setTimeout(() => scanInputRef.current?.focus(), 500);
      } else {
        // En modo visualización, cargar ambas listas de una vez
        fetchCajas();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectionMode]);

  // Manejar escaneo desde cámara
  const handleCameraScan = async (result: { data: string }) => {
    const codigo = result.data.trim().toUpperCase();

    // Evitar escaneos duplicados
    if (codigo === lastScannedRef.current) return;
    lastScannedRef.current = codigo;

    // Cerrar cámara y procesar
    setShowCamera(false);
    setScannerText(codigo);

    // Resetear después de un tiempo para permitir re-escaneo
    setTimeout(() => {
      lastScannedRef.current = "";
    }, 1500);

    // Validar directamente
    setScanError(null);
    setValidating(true);

    try {
      if (onValidateScan) {
        const isValid = await onValidateScan(codigo);
        if (isValid) {
          setScannerText("");
        } else {
          setScanError("Caja no válida o no disponible");
        }
      } else if (onConfirmSelection) {
        onConfirmSelection(codigo);
        setScannerText("");
      }
    } catch (err: any) {
      setScanError(err.message || "Error al validar caja");
    } finally {
      setValidating(false);
    }
  };

  // Abrir cámara
  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setScanError("Se necesita permiso de cámara");
        return;
      }
    }
    setShowCamera(true);
  };

  // Manejar escaneo de caja
  const handleScanSubmit = async () => {
    // Limpiar código: quitar espacios, saltos de línea, etc.
    const codigo = scannerText
      .trim()
      .toUpperCase()
      .replace(/[\n\r]/g, "");
    if (!codigo) return;

    console.log("[CAJAS] Validando código:", codigo);
    setScanError(null);
    setValidating(true);

    try {
      // Si hay función de validación, usarla
      if (onValidateScan) {
        const isValid = await onValidateScan(codigo);
        if (isValid) {
          // Selección exitosa, la función ya manejó todo
          setScannerText("");
        } else {
          setScanError("Caja no válida o no disponible");
        }
      } else if (onConfirmSelection) {
        // Sin validación, confirmar directamente
        onConfirmSelection(codigo);
        setScannerText("");
      }
    } catch (err: any) {
      setScanError(err.message || "Error al validar caja");
    } finally {
      setValidating(false);
      scanInputRef.current?.focus();
    }
  };

  // Detectar Enter del scanner automáticamente o patrón de caja
  const processingRef = useRef(false);

  const handleTextChange = (text: string) => {
    console.log("[CAJAS] Input recibido:", JSON.stringify(text));

    // Si ya estamos procesando, ignorar
    if (processingRef.current) {
      console.log("[CAJAS] Ignorando - ya procesando");
      return;
    }

    // Detectar si el texto contiene un salto de línea (Enter del scanner)
    if (text.includes("\n") || text.includes("\r")) {
      // Limpiar el texto y procesar inmediatamente
      const cleanText = text.replace(/[\n\r]/g, "").trim();
      processingRef.current = true;
      setScannerText("");
      setScanError(null);
      console.log("[CAJAS] Detectado Enter, procesando:", cleanText);
      // Ejecutar submit
      if (cleanText) {
        procesarCodigo(cleanText);
      }
      setTimeout(() => {
        processingRef.current = false;
      }, 500);
      return;
    }

    // Si no hay Enter, detectar patrón de caja y procesar automáticamente
    // El scanner puede no enviar Enter, así que detectamos patrones comunes
    const cleanText = text.trim().toUpperCase();

    // Detectar patrones: "CAJA XX", "TARIMA XX", "CARRITO XX"
    const patronCaja = /^(CAJA|TARIMA|CARRITO)\s*\d+$/i;

    if (patronCaja.test(cleanText)) {
      console.log("[CAJAS] Detectado patrón de caja sin Enter:", cleanText);
      processingRef.current = true;
      setScannerText("");
      setScanError(null);
      // Procesar inmediatamente
      procesarCodigo(cleanText);
      setTimeout(() => {
        processingRef.current = false;
      }, 500);
      return;
    }

    setScannerText(text);
    setScanError(null);
  };

  // Procesar código de caja
  const procesarCodigo = async (codigo: string) => {
    console.log("[CAJAS] Validando código:", codigo);
    setValidating(true);

    try {
      if (onValidateScan) {
        const isValid = await onValidateScan(codigo);
        if (!isValid) {
          setScanError("Caja no válida o no disponible");
        }
      } else if (onConfirmSelection) {
        onConfirmSelection(codigo);
      }
    } catch (err: any) {
      setScanError(err.message || "Error al validar caja");
    } finally {
      setValidating(false);
      scanInputRef.current?.focus();
    }
  };

  // Cargar ambas listas (disponibles y ocupadas) en paralelo
  const fetchCajas = async () => {
    setLoading(true);
    setError(null);

    try {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId) {
        throw new Error("No hay base de datos seleccionada");
      }

      // Hacer ambas consultas en paralelo
      const [disponiblesRes, ocupadasRes] = await Promise.all([
        fetch(`${apiBase}/cajas-disponibles.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId, limit: 5 }),
        }),
        fetch(`${apiBase}/cajas-ocupadas.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId }),
        }),
      ]);

      const [disponiblesData, ocupadasData] = await Promise.all([
        disponiblesRes.json(),
        ocupadasRes.json(),
      ]);

      // Procesar disponibles
      if (disponiblesData.success) {
        setGruposDisponibles(disponiblesData.grupos || []);
        setTotalDisponibles(disponiblesData.totalDisponibles || 0);
      }

      // Procesar ocupadas
      if (ocupadasData.success) {
        setCajasOcupadas(ocupadasData.data || []);
      }

      // Si ambas fallaron, mostrar error
      if (!disponiblesData.success && !ocupadasData.success) {
        setError("Error al cargar cajas");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (tipo: string) => {
    setExpandedTipos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tipo)) {
        newSet.delete(tipo);
      } else {
        newSet.add(tipo);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getTipoColor = (tipo: string) => {
    return (
      TIPO_COLORS[tipo] || { bg: "#10B98120", text: "#10B981", icon: "cube" }
    );
  };

  const renderGrupoDisponibles = (grupo: GrupoCajas) => {
    const isExpanded = expandedTipos.has(grupo.tipo);
    const tipoColor = getTipoColor(grupo.tipo);

    return (
      <View key={grupo.tipo} style={modalStyles.grupoContainer}>
        {/* Header del grupo */}
        <TouchableOpacity
          style={[modalStyles.grupoHeader, { backgroundColor: colors.surface }]}
          onPress={() => toggleExpanded(grupo.tipo)}
        >
          <View
            style={[modalStyles.grupoIcon, { backgroundColor: tipoColor.bg }]}
          >
            <Ionicons
              name={tipoColor.icon as any}
              size={20}
              color={tipoColor.text}
            />
          </View>
          <View style={modalStyles.grupoInfo}>
            <Text style={[modalStyles.grupoTipo, { color: colors.text }]}>
              {grupo.tipo}
            </Text>
            <Text
              style={[
                modalStyles.grupoSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {grupo.total} disponibles
            </Text>
          </View>
          <View
            style={[modalStyles.grupoBadge, { backgroundColor: tipoColor.bg }]}
          >
            <Text
              style={[modalStyles.grupoBadgeText, { color: tipoColor.text }]}
            >
              {grupo.total}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Lista de cajas (colapsable) */}
        {isExpanded && (
          <View style={modalStyles.grupoContent}>
            {grupo.cajas.map((caja, index) => {
              const isSelected =
                selectionMode && selectedCaja === caja.CODIGO_CAJA;

              return (
                <TouchableOpacity
                  key={`${grupo.tipo}-${index}-${caja.CODIGO_CAJA}`}
                  style={[
                    modalStyles.cajaItem,
                    { backgroundColor: colors.surface },
                    isSelected && {
                      backgroundColor: colors.accent + "20",
                      borderWidth: 2,
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={() => {
                    if (selectionMode && onSelectCaja) {
                      onSelectCaja(caja.CODIGO_CAJA);
                    }
                  }}
                  disabled={!selectionMode}
                >
                  <View
                    style={[
                      modalStyles.cajaItemIcon,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : tipoColor.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark" : "cube-outline"}
                      size={16}
                      color={isSelected ? "#fff" : tipoColor.text}
                    />
                  </View>
                  <Text
                    style={[modalStyles.cajaItemCodigo, { color: colors.text }]}
                  >
                    {caja.CODIGO_CAJA}
                  </Text>
                  <Text
                    style={[
                      modalStyles.cajaItemNombre,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {caja.NOMBRE_CAJA || ""}
                  </Text>
                  {selectionMode && (
                    <View
                      style={[
                        modalStyles.radioOuter,
                        {
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            modalStyles.radioInner,
                            { backgroundColor: colors.accent },
                          ]}
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {grupo.total > grupo.mostrando && (
              <Text
                style={[modalStyles.masText, { color: colors.textTertiary }]}
              >
                +{grupo.total - grupo.mostrando} más...
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View
          style={[
            modalStyles.container,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header */}
          <View
            style={[modalStyles.header, { borderBottomColor: colors.border }]}
          >
            <View style={modalStyles.headerLeft}>
              <Ionicons name="cube-outline" size={24} color={colors.accent} />
              <Text style={[modalStyles.headerTitle, { color: colors.text }]}>
                {selectionMode ? "Asignar Caja" : "Cajas de Apartado"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tabs - Solo en modo visualización */}
          {!selectionMode && (
            <View
              style={[modalStyles.tabs, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[
                  modalStyles.tab,
                  activeTab === "disponibles" && {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={() => setActiveTab("disponibles")}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={18}
                  color={
                    activeTab === "disponibles" ? "#fff" : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    modalStyles.tabText,
                    {
                      color:
                        activeTab === "disponibles"
                          ? "#fff"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Disponibles
                </Text>
                {!loading && activeTab !== "disponibles" && (
                  <View
                    style={[
                      modalStyles.tabBadge,
                      { backgroundColor: "#10B981" },
                    ]}
                  >
                    <Text style={modalStyles.tabBadgeText}>
                      {totalDisponibles}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.tab,
                  activeTab === "ocupadas" && {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={() => setActiveTab("ocupadas")}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={
                    activeTab === "ocupadas" ? "#fff" : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    modalStyles.tabText,
                    {
                      color:
                        activeTab === "ocupadas"
                          ? "#fff"
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Ocupadas
                </Text>
                {!loading && activeTab !== "ocupadas" && (
                  <View
                    style={[
                      modalStyles.tabBadge,
                      { backgroundColor: "#F59E0B" },
                    ]}
                  >
                    <Text style={modalStyles.tabBadgeText}>
                      {cajasOcupadas.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Zona de escaneo - solo en modo selección */}
          {selectionMode && (
            <View
              style={[
                modalStyles.scanSection,
                modalStyles.scanSectionFull,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={modalStyles.scanHeader}>
                <Ionicons
                  name="barcode-outline"
                  size={24}
                  color={colors.accent}
                />
                <Text style={[modalStyles.scanTitle, { color: colors.text }]}>
                  Escanear Caja
                </Text>
              </View>
              <Text
                style={[
                  modalStyles.scanSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Escanea el código de la caja con tu pistola o selecciona de la
                lista
              </Text>

              {/* Input oculto para recibir escaneo */}
              <TextInput
                ref={scanInputRef}
                style={modalStyles.hiddenInput}
                value={scannerText}
                onChangeText={handleTextChange}
                onSubmitEditing={handleScanSubmit}
                autoCapitalize="characters"
                autoCorrect={false}
                blurOnSubmit={false}
                showSoftInputOnFocus={false}
                autoFocus={selectionMode}
                onBlur={() => {
                  // Re-enfocar si pierde el foco y estamos en modo selección
                  if (selectionMode && visible && !showCamera) {
                    setTimeout(() => scanInputRef.current?.focus(), 100);
                  }
                }}
              />

              {/* Área visual de escaneo con botón de cámara */}
              <View style={modalStyles.scanRow}>
                <TouchableOpacity
                  style={[
                    modalStyles.scanArea,
                    modalStyles.scanAreaFlex,
                    {
                      backgroundColor: colors.background,
                      borderColor: validating
                        ? colors.accent
                        : scanError
                          ? "#EF4444"
                          : colors.border,
                    },
                  ]}
                  onPress={() => scanInputRef.current?.focus()}
                  activeOpacity={0.7}
                >
                  {validating ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Ionicons
                      name={scanError ? "alert-circle" : "scan-outline"}
                      size={28}
                      color={scanError ? "#EF4444" : colors.textTertiary}
                    />
                  )}
                  <Text
                    style={[
                      modalStyles.scanAreaText,
                      {
                        color: scanError
                          ? "#EF4444"
                          : validating
                            ? colors.accent
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {validating
                      ? "Validando..."
                      : scanError
                        ? scanError
                        : scannerText
                          ? `Código: ${scannerText}`
                          : "Esperando escaneo..."}
                  </Text>
                </TouchableOpacity>

                {/* Botón de cámara */}
                <TouchableOpacity
                  style={[
                    modalStyles.cameraButton,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={openCamera}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Modal de cámara */}
          <Modal
            visible={showCamera}
            animationType="slide"
            onRequestClose={() => setShowCamera(false)}
          >
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={handleCameraScan}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "code128", "code39", "ean13"],
                }}
              />

              {/* Header con botón cerrar */}
              <View style={modalStyles.cameraHeader}>
                <TouchableOpacity
                  style={modalStyles.cameraCloseBtn}
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={modalStyles.cameraTitle}>Escanear Caja</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Marco de escaneo */}
              <View style={modalStyles.cameraCenterContainer}>
                <View style={modalStyles.cameraScanFrame} />
                <Text style={modalStyles.cameraScanHint}>
                  Apunta al código de la caja
                </Text>
              </View>
            </View>
          </Modal>

          {/* Content - Solo en modo visualización */}
          {!selectionMode && (
            <ScrollView
              style={modalStyles.content}
              contentContainerStyle={modalStyles.contentContainer}
            >
              {loading ? (
                <View style={modalStyles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text
                    style={[
                      modalStyles.loadingText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cargando cajas...
                  </Text>
                </View>
              ) : error ? (
                <View style={modalStyles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color="#EF4444"
                  />
                  <Text style={modalStyles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={[
                      modalStyles.retryBtn,
                      { backgroundColor: colors.accent },
                    ]}
                    onPress={fetchCajas}
                  >
                    <Text style={modalStyles.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : activeTab === "disponibles" ? (
                // Lista agrupada de cajas disponibles
                gruposDisponibles.length === 0 ? (
                  <View style={modalStyles.emptyContainer}>
                    <Ionicons
                      name="cube-outline"
                      size={48}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        modalStyles.emptyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No hay cajas disponibles
                    </Text>
                  </View>
                ) : (
                  gruposDisponibles.map(renderGrupoDisponibles)
                )
              ) : // Lista de cajas ocupadas
              cajasOcupadas.length === 0 ? (
                <View style={modalStyles.emptyContainer}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={48}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[
                      modalStyles.emptyText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No hay cajas ocupadas
                  </Text>
                </View>
              ) : (
                cajasOcupadas.map((caja, index) => (
                  <View
                    key={`ocupada-${index}-${caja.CODIGO_CAJA}`}
                    style={[
                      modalStyles.cajaCardOcupada,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <View style={modalStyles.cajaHeaderOcupada}>
                      <View style={modalStyles.cajaIconContainer}>
                        <View
                          style={[
                            modalStyles.cajaIcon,
                            { backgroundColor: "#F59E0B20" },
                          ]}
                        >
                          <Ionicons name="cube" size={24} color="#F59E0B" />
                        </View>
                      </View>
                      <View style={modalStyles.cajaInfo}>
                        <Text
                          style={[
                            modalStyles.cajaCodigo,
                            { color: colors.text },
                          ]}
                        >
                          {caja.CODIGO_CAJA}
                        </Text>
                        <Text
                          style={[
                            modalStyles.cajaNombre,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {caja.NOMBRE_CAJA || "Sin nombre"}
                        </Text>
                      </View>
                      <View
                        style={[
                          modalStyles.statusBadge,
                          { backgroundColor: "#F59E0B20" },
                        ]}
                      >
                        <Text
                          style={[modalStyles.statusText, { color: "#F59E0B" }]}
                        >
                          Ocupada
                        </Text>
                      </View>
                    </View>

                    {/* Detalles del apartado */}
                    <View
                      style={[
                        modalStyles.apartadoDetails,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <View style={modalStyles.detailRow}>
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color={colors.textTertiary}
                        />
                        <Text
                          style={[
                            modalStyles.detailLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Pedido:
                        </Text>
                        <Text
                          style={[
                            modalStyles.detailValue,
                            { color: colors.text },
                          ]}
                        >
                          {caja.FOLIO || "-"}
                        </Text>
                      </View>

                      <View style={modalStyles.detailRow}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color={colors.textTertiary}
                        />
                        <Text
                          style={[
                            modalStyles.detailLabel,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Picker:
                        </Text>
                        <Text
                          style={[
                            modalStyles.detailValue,
                            { color: colors.text },
                          ]}
                        >
                          {caja.NOMBRE_PICKER || "-"}
                        </Text>
                      </View>

                      <View style={modalStyles.statsRow}>
                        <View style={modalStyles.statItem}>
                          <Text
                            style={[
                              modalStyles.statValue,
                              { color: colors.accent },
                            ]}
                          >
                            {caja.TOTAL_ARTICULOS}
                          </Text>
                          <Text
                            style={[
                              modalStyles.statLabel,
                              { color: colors.textTertiary },
                            ]}
                          >
                            Artículos
                          </Text>
                        </View>
                        <View style={modalStyles.statItem}>
                          <Text
                            style={[
                              modalStyles.statValue,
                              { color: colors.accent },
                            ]}
                          >
                            {caja.TOTAL_UNIDADES}
                          </Text>
                          <Text
                            style={[
                              modalStyles.statLabel,
                              { color: colors.textTertiary },
                            ]}
                          >
                            Unidades
                          </Text>
                        </View>
                        <View style={modalStyles.statItem}>
                          <Text
                            style={[
                              modalStyles.statValue,
                              { color: colors.textSecondary },
                              { fontSize: 11 },
                            ]}
                          >
                            {formatDate(caja.FECHA_APARTADO)}
                          </Text>
                          <Text
                            style={[
                              modalStyles.statLabel,
                              { color: colors.textTertiary },
                            ]}
                          >
                            Fecha
                          </Text>
                        </View>
                      </View>

                      {/* Botón Ver Caja */}
                      <TouchableOpacity
                        style={[
                          modalStyles.verCajaBtn,
                          { backgroundColor: colors.accent },
                        ]}
                        onPress={() => onVerCaja?.(caja)}
                      >
                        <Ionicons name="eye-outline" size={18} color="#fff" />
                        <Text style={modalStyles.verCajaBtnText}>VER CAJA</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* Footer con resumen - Solo en modo visualización */}
          {!selectionMode && (
            <View
              style={[
                modalStyles.footer,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={modalStyles.footerStat}>
                <Text style={[modalStyles.footerValue, { color: "#10B981" }]}>
                  {totalDisponibles}
                </Text>
                <Text
                  style={[
                    modalStyles.footerLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Disponibles
                </Text>
              </View>
              <View
                style={[
                  modalStyles.footerDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={modalStyles.footerStat}>
                <Text style={[modalStyles.footerValue, { color: "#F59E0B" }]}>
                  {cajasOcupadas.length}
                </Text>
                <Text
                  style={[
                    modalStyles.footerLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Ocupadas
                </Text>
              </View>
              <View
                style={[
                  modalStyles.footerDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={modalStyles.footerStat}>
                <Text style={[modalStyles.footerValue, { color: colors.text }]}>
                  {totalDisponibles + cajasOcupadas.length}
                </Text>
                <Text
                  style={[
                    modalStyles.footerLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Total
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get("window");

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  tabs: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: {
    color: "#EF4444",
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  // Estilos para grupos
  grupoContainer: {
    marginBottom: 12,
  },
  grupoHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  grupoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  grupoInfo: {
    flex: 1,
  },
  grupoTipo: {
    fontSize: 16,
    fontWeight: "700",
  },
  grupoSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  grupoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
  },
  grupoBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  grupoContent: {
    paddingLeft: 20,
    paddingTop: 8,
  },
  cajaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    gap: 10,
  },
  cajaItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cajaItemCodigo: {
    fontSize: 14,
    fontWeight: "600",
  },
  cajaItemNombre: {
    fontSize: 12,
    flex: 1,
  },
  masText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
    fontStyle: "italic",
  },
  // Estilos para cajas ocupadas
  cajaCardOcupada: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  cajaHeaderOcupada: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cajaIconContainer: {
    marginRight: 12,
  },
  cajaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cajaInfo: {
    flex: 1,
  },
  cajaCodigo: {
    fontSize: 16,
    fontWeight: "700",
  },
  cajaNombre: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  apartadoDetails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerStat: {
    flex: 1,
    alignItems: "center",
  },
  footerValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  footerLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  footerDivider: {
    width: 1,
    height: 36,
  },
  // Estilos para modo selección
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 10,
  },
  assignButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  verCajaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  verCajaBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Estilos para zona de escaneo
  scanSection: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanSectionFull: {
    flex: 1,
    marginBottom: 16,
    justifyContent: "center",
  },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  scanSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  scanArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 10,
  },
  scanAreaFlex: {
    flex: 1,
  },
  scanAreaText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cameraButton: {
    width: 56,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  cameraCenterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraScanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  cameraScanHint: {
    color: "#fff",
    marginTop: 20,
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
});
