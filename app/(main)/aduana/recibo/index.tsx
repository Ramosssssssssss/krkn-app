import { API_CONFIG, API_URL } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Caratula {
  traspasoInId: number;
  folio: string;
  fecha: string;
  origen: string;
  destino: string;
  estatus: string;
}

interface DetalleArticulo {
  clave: string;
  nombre: string;
  unidades: number;
  umed: string;
  codigoBarras: string | null;
  // Estado de escaneo
  escaneados: number;
}

const ACCENT_COLOR = "#9D4EDD";

export default function ReciboAduanaScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sucursalId, sucursalNombre, almacenId } = useLocalSearchParams<{
    sucursalId: string;
    sucursalNombre: string;
    almacenId: string;
  }>();

  // Estados de búsqueda
  const [folio, setFolio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [caratula, setCaratula] = useState<Caratula | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Estado del scanner
  const [scannerValue, setScannerValue] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Calcular progreso
  const totalUnidades = detalles.reduce((sum, d) => sum + d.unidades, 0);
  const totalEscaneados = detalles.reduce((sum, d) => sum + d.escaneados, 0);
  const todosCompletos =
    detalles.length > 0 && detalles.every((d) => d.escaneados >= d.unidades);

  const consultarRecibo = async () => {
    if (!folio.trim()) {
      Alert.alert("Error", "Ingresa un folio para consultar");
      return;
    }

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const databaseId = getCurrentDatabaseId();
      const requestBody = {
        folio: folio.trim(),
        sucursalDestinoId: parseInt(sucursalId),
        databaseId,
      };

      console.log("=== CONSULTA RECIBO DEBUG ===");
      console.log("URL:", `${API_URL}/api/consulta-recibos.php`);
      console.log("Body:", JSON.stringify(requestBody, null, 2));
      console.log("sucursalId param:", sucursalId);

      const response = await fetch(`${API_URL}/api/consulta-recibos.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();

      if (data.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCaratula(data.caratula);
        // Inicializar escaneados en 0
        setDetalles(data.detalles.map((d: any) => ({ ...d, escaneados: 0 })));
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("No encontrado", data.error || "Traspaso no encontrado");
        setCaratula(null);
        setDetalles([]);
      }
    } catch (error: any) {
      console.error("=== ERROR NETWORK ===");
      console.error("Error tipo:", error?.name);
      console.error("Error mensaje:", error?.message);
      console.error("Error completo:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        `Network: ${error?.message || "No se pudo consultar"}`,
      );
      setCaratula(null);
      setDetalles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarBusqueda = () => {
    setFolio("");
    setCaratula(null);
    setDetalles([]);
    setHasSearched(false);
    setScannerValue("");
    setLastScanned(null);
  };

  // Procesar escaneo
  const procesarEscaneo = useCallback(
    (codigo: string) => {
      if (!codigo.trim()) return;

      const codigoLimpio = codigo.trim().toUpperCase();
      console.log("=== PROCESANDO ESCANEO ===");
      console.log("Código escaneado:", codigoLimpio);
      console.log(
        "Detalles disponibles:",
        detalles.map((d) => ({ clave: d.clave, codigoBarras: d.codigoBarras })),
      );

      // Buscar artículo por código de barras o clave
      const index = detalles.findIndex(
        (d) =>
          d.codigoBarras?.toUpperCase() === codigoLimpio ||
          d.clave.toUpperCase() === codigoLimpio,
      );

      console.log("Index encontrado:", index);

      if (index === -1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastScanned(`❌ No encontrado: ${codigo}`);
        return;
      }

      const articulo = detalles[index];

      // Verificar si ya está completo
      if (articulo.escaneados >= articulo.unidades) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setLastScanned(`⚠️ ${articulo.clave} ya está completo`);
        return;
      }

      // Incrementar escaneados
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDetalles((prev) =>
        prev.map((d, i) =>
          i === index ? { ...d, escaneados: d.escaneados + 1 } : d,
        ),
      );
      setLastScanned(
        `✅ ${articulo.clave} (${articulo.escaneados + 1}/${articulo.unidades})`,
      );
    },
    [detalles],
  );

  // Detectar escaneo por teclado (Enter) o procesar manualmente
  const handleScanSubmit = useCallback(() => {
    if (scannerValue.trim()) {
      procesarEscaneo(scannerValue);
      setScannerValue("");
    }
  }, [scannerValue, procesarEscaneo]);

  useEffect(() => {
    if (scannerValue.includes("\n") || scannerValue.includes("\r")) {
      const codigo = scannerValue.replace(/[\n\r]/g, "");
      procesarEscaneo(codigo);
      setScannerValue("");
    }
  }, [scannerValue, procesarEscaneo]);

  const handleManualAdd = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetalles((prev) =>
      prev.map((d, i) =>
        i === index && d.escaneados < d.unidades
          ? { ...d, escaneados: d.escaneados + 1 }
          : d,
      ),
    );
  };

  const handleManualRemove = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetalles((prev) =>
      prev.map((d, i) =>
        i === index && d.escaneados > 0
          ? { ...d, escaneados: d.escaneados - 1 }
          : d,
      ),
    );
  };

  const [isConfirming, setIsConfirming] = useState(false);

  const confirmarRecepcion = async () => {
    if (!caratula) return;

    Alert.alert(
      "Confirmar Recepción",
      `¿Confirmar recepción del traspaso ${caratula.folio}?\n\nTotal artículos: ${detalles.length}\nUnidades verificadas: ${totalEscaneados}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setIsConfirming(true);
            try {
              const databaseId = getCurrentDatabaseId();
              const response = await fetch(
                `${API_URL}/api/recibo-correcto.php`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    traspasoId: caratula.traspasoInId,
                    databaseId,
                  }),
                },
              );

              const data = await response.json();

              if (data.ok) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                Alert.alert(
                  "¡Recepción Exitosa!",
                  "El traspaso ha sido recibido correctamente",
                  [{ text: "OK", onPress: () => limpiarBusqueda() }],
                );
              } else {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                Alert.alert(
                  "Error",
                  data.error || "No se pudo confirmar la recepción",
                );
              }
            } catch (error) {
              console.error("Error confirmando recepción:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "No se pudo conectar con el servidor");
            } finally {
              setIsConfirming(false);
            }
          },
        },
      ],
    );
  };

  // Reportar incidencia
  const reportarIncidencia = (item: DetalleArticulo) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reportar Incidencia",
      `Artículo: ${item.clave}\n${item.nombre}\n\n¿Qué tipo de incidencia deseas reportar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Faltante",
          onPress: () => Alert.alert("Incidencia", "Faltante registrado"),
        },
        {
          text: "Dañado",
          onPress: () => Alert.alert("Incidencia", "Daño registrado"),
        },
        {
          text: "Otro",
          onPress: () => Alert.alert("Incidencia", "Incidencia registrada"),
        },
      ],
    );
  };

  // Componente de card con swipe
  const SwipeableCard = ({
    item,
    index,
  }: {
    item: DetalleArticulo;
    index: number;
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeThreshold = -80;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 10 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -100));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < swipeThreshold) {
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    ).current;

    const closeSwipe = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    };

    const isComplete = item.escaneados >= item.unidades;
    const progress =
      item.unidades > 0 ? (item.escaneados / item.unidades) * 100 : 0;
    const databaseId = getCurrentDatabaseId();

    return (
      <View style={styles.swipeContainer}>
        {/* Acción de incidencia (fondo) */}
        <TouchableOpacity
          style={styles.incidenciaAction}
          onPress={() => {
            closeSwipe();
            reportarIncidencia(item);
          }}
        >
          <Ionicons name="warning" size={24} color="#FFF" />
          <Text style={styles.incidenciaText}>Incidencia</Text>
        </TouchableOpacity>

        {/* Card principal */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.articleCard,
            {
              backgroundColor: colors.surface,
              borderColor: isComplete ? "#06D6A0" : colors.border,
              borderWidth: isComplete ? 2 : 1,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Row superior: imagen + info */}
          <View style={styles.cardTopRow}>
            {/* Imagen */}
            <View
              style={[
                styles.imageWrapper,
                { backgroundColor: colors.background },
              ]}
            >
              <Image
                source={{
                  uri: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&clave=${item.clave}&thumb=1`,
                }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
              {isComplete && (
                <View style={styles.checkOverlay}>
                  <Ionicons name="checkmark-circle" size={24} color="#06D6A0" />
                </View>
              )}
            </View>

            {/* Info del artículo */}
            <View style={styles.articleInfo}>
              <View style={styles.claveRow}>
                <Text style={[styles.articleClave, { color: ACCENT_COLOR }]}>
                  {item.clave}
                </Text>
                {item.codigoBarras && (
                  <View style={styles.barcodeTag}>
                    <Ionicons
                      name="barcode-outline"
                      size={11}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.barcodeText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {item.codigoBarras}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.articleNombre, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.nombre}
              </Text>
              <Text
                style={[styles.articleUmed, { color: colors.textSecondary }]}
              >
                {item.umed}
              </Text>
            </View>
          </View>

          {/* Row inferior: progress + controles */}
          <View style={styles.cardBottomRow}>
            {/* Progress bar con texto */}
            <View style={styles.progressSection}>
              <View
                style={[styles.progressBar, { backgroundColor: colors.border }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: isComplete ? "#06D6A0" : ACCENT_COLOR,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Controles de cantidad */}
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  {
                    backgroundColor:
                      item.escaneados === 0 ? colors.border : "#EF476F20",
                  },
                ]}
                onPress={() => handleManualRemove(index)}
                disabled={item.escaneados === 0}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={
                    item.escaneados === 0 ? colors.textTertiary : "#EF476F"
                  }
                />
              </TouchableOpacity>

              <View style={styles.qtyDisplay}>
                <Text
                  style={[
                    styles.qtyText,
                    { color: isComplete ? "#06D6A0" : colors.text },
                  ]}
                >
                  {item.escaneados}
                </Text>
                <Text
                  style={[styles.qtyDivider, { color: colors.textTertiary }]}
                >
                  /
                </Text>
                <Text
                  style={[styles.qtyTotal, { color: colors.textSecondary }]}
                >
                  {item.unidades}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  {
                    backgroundColor: isComplete ? colors.border : ACCENT_COLOR,
                  },
                ]}
                onPress={() => handleManualAdd(index)}
                disabled={isComplete}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={isComplete ? colors.textTertiary : "#FFF"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderArticulo = ({
    item,
    index,
  }: {
    item: DetalleArticulo;
    index: number;
  }) => {
    return <SwipeableCard item={item} index={index} />;
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Recibo Aduana
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {sucursalNombre || "Sucursal"}
          </Text>
        </View>
        {caratula && (
          <View
            style={[
              styles.progressBadge,
              {
                backgroundColor: todosCompletos
                  ? "#06D6A020"
                  : ACCENT_COLOR + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.progressText,
                { color: todosCompletos ? "#06D6A0" : ACCENT_COLOR },
              ]}
            >
              {totalEscaneados}/{totalUnidades}
            </Text>
          </View>
        )}
      </View>

      {/* Input de Folio (solo si no hay carátula) */}
      {!caratula && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputWrapper,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={colors.textTertiary}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Ingresa el folio del traspaso"
              placeholderTextColor={colors.textTertiary}
              value={folio}
              onChangeText={setFolio}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={consultarRecibo}
              returnKeyType="search"
            />
            {folio.length > 0 && (
              <TouchableOpacity onPress={limpiarBusqueda}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.searchBtn,
              {
                backgroundColor: ACCENT_COLOR,
                opacity: folio.trim().length === 0 || isLoading ? 0.5 : 1,
              },
            ]}
            onPress={consultarRecibo}
            disabled={folio.trim().length === 0 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Scanner Input (solo cuando hay carátula) */}
      {caratula && (
        <View style={styles.scannerSection}>
          <View style={styles.scannerRow}>
            <View
              style={[
                styles.scannerInputWrapper,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                  borderColor: colors.border,
                  flex: 1,
                },
              ]}
            >
              <Ionicons name="scan-outline" size={20} color={ACCENT_COLOR} />
              <TextInput
                style={[styles.scannerInput, { color: colors.text }]}
                placeholder="Escanea código de barras..."
                placeholderTextColor={colors.textTertiary}
                value={scannerValue}
                onChangeText={setScannerValue}
                onSubmitEditing={handleScanSubmit}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: ACCENT_COLOR }]}
              onPress={handleScanSubmit}
            >
              <Ionicons name="checkmark" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          {lastScanned && (
            <Text
              style={[styles.lastScannedText, { color: colors.textSecondary }]}
            >
              {lastScanned}
            </Text>
          )}
        </View>
      )}

      {/* Carátula del Traspaso */}
      {caratula && (
        <View
          style={[
            styles.caratulaCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.caratulaRow}>
            <View
              style={[styles.caratulaIcon, { backgroundColor: "#06D6A020" }]}
            >
              <Ionicons name="swap-horizontal" size={20} color="#06D6A0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.caratulaFolio, { color: colors.text }]}>
                {caratula.folio}
              </Text>
              <Text
                style={[styles.caratulaRoute, { color: colors.textSecondary }]}
              >
                {caratula.origen} → {caratula.destino}
              </Text>
            </View>
            <TouchableOpacity onPress={limpiarBusqueda}>
              <Ionicons
                name="close-circle"
                size={24}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lista de Artículos */}
      {caratula ? (
        <>
          <FlatList
            data={detalles}
            keyExtractor={(item, index) => `${item.clave}-${index}`}
            renderItem={renderArticulo}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No hay artículos
                </Text>
              </View>
            }
          />

          {/* Botón de Recibir */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recibirBtn,
                {
                  backgroundColor:
                    todosCompletos && !isConfirming ? "#06D6A0" : colors.border,
                },
              ]}
              onPress={confirmarRecepcion}
              disabled={!todosCompletos || isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={todosCompletos ? "checkmark-circle" : "lock-closed"}
                    size={22}
                    color={todosCompletos ? "#fff" : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.recibirBtnText,
                      { color: todosCompletos ? "#fff" : colors.textTertiary },
                    ]}
                  >
                    {todosCompletos
                      ? "Confirmar Recepción"
                      : `Faltan ${totalUnidades - totalEscaneados} unidades`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.placeholderContainer}>
          {!hasSearched ? (
            <>
              <View
                style={[
                  styles.placeholderIcon,
                  { backgroundColor: ACCENT_COLOR + "15" },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={ACCENT_COLOR}
                />
              </View>
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                Consulta un Traspaso
              </Text>
              <Text
                style={[
                  styles.placeholderText,
                  { color: colors.textSecondary },
                ]}
              >
                Ingresa el folio del traspaso para ver los artículos a recibir
              </Text>
            </>
          ) : !isLoading ? (
            <>
              <View
                style={[
                  styles.placeholderIcon,
                  { backgroundColor: colors.error + "15" },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={colors.error}
                />
              </View>
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                Sin Resultados
              </Text>
              <Text
                style={[
                  styles.placeholderText,
                  { color: colors.textSecondary },
                ]}
              >
                No se encontró ningún traspaso con el folio ingresado
              </Text>
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
    marginLeft: -8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scannerInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  scannerInput: {
    flex: 1,
    fontSize: 15,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lastScannedText: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  caratulaCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  caratulaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  caratulaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  caratulaFolio: {
    fontSize: 15,
    fontWeight: "700",
  },
  caratulaRoute: {
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
  },
  incidenciaAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#EF476F",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  incidenciaText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  articleCard: {
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 48,
    height: 48,
  },
  checkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  articleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  claveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  articleClave: {
    fontSize: 13,
    fontWeight: "700",
  },
  articleNombre: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 2,
  },
  articleUmed: {
    fontSize: 11,
    fontWeight: "500",
  },
  barcodeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  barcodeText: {
    fontSize: 10,
  },
  progressSection: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    minWidth: 50,
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "700",
  },
  qtyDivider: {
    fontSize: 14,
    marginHorizontal: 2,
  },
  qtyTotal: {
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  recibirBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    gap: 10,
  },
  recibirBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  placeholderIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
});
