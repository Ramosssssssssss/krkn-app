import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { API_CONFIG, API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ArticuloVentanilla {
  CODIGO_BARRAS: string;
  CODIGO: string;
  UNIDADES: number;
  ARTICULO_ID: number;
  TRASPASO_IN_ID: number;
  NOMBRE: string;
  LOCALIZACION: string;
  UNIDAD_VENTA: string;
  SURTIDAS?: number;
  CONFIRMADO?: boolean;
}

export default function SurteVentanillaScreen() {
  const { folio, traspasoId, traspasoInId, almacen, articulos } =
    useLocalSearchParams();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Soporta tanto traspasoId (del modal) como traspasoInId (de la lista)
  const effectiveTraspasoId = traspasoId || traspasoInId;

  const parsedArticulos: ArticuloVentanilla[] = articulos
    ? JSON.parse(articulos as string).map((art: any) => ({
        ...art,
        SURTIDAS: 0,
        CONFIRMADO: false,
      }))
    : [];

  const [items, setItems] = useState<ArticuloVentanilla[]>(parsedArticulos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!articulos); // Si no hay articulos, cargar del API
  const [alert, setAlert] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });
  const [exitModalVisible, setExitModalVisible] = useState(false);

  // Modal para ingresar cantidad manualmente
  const [qtyModal, setQtyModal] = useState<{
    visible: boolean;
    index: number;
    value: string;
  }>({
    visible: false,
    index: 0,
    value: "0",
  });

  // Candado de ubicaciones
  const [unlockedLocations, setUnlockedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [locationFeedback, setLocationFeedback] = useState<{
    visible: boolean;
    loc: string;
  }>({
    visible: false,
    loc: "",
  });

  // Escaneo
  const [tempBarcode, setTempBarcode] = useState("");
  const scannerRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Camera Scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraScanMessage, setCameraScanMessage] = useState<string | null>(
    null,
  );
  const [cameraScanSuccess, setCameraScanSuccess] = useState(true);
  const cameraScanLock = useRef(false);

  // Cargar artículos del API si no vienen como parámetro (cuando se entra desde lista de ventanillas)
  useEffect(() => {
    const fetchDetalles = async () => {
      if (articulos) return; // Ya tenemos los artículos del modal

      try {
        const databaseId = getCurrentDatabaseId();
        const response = await fetch(`${API_URL}/api/detalle-ventanilla.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            traspasoInId: effectiveTraspasoId,
          }),
        });
        const data = await response.json();

        if (data.success && data.detalles) {
          const mappedItems = data.detalles.map((item: any) => ({
            CODIGO_BARRAS: item.CODBAR || item.CODIGO_BARRAS || "",
            CODIGO: item.CLAVE_ARTICULO || item.CODIGO || "",
            UNIDADES: Number(item.UNIDADES),
            ARTICULO_ID: item.ARTICULO_ID,
            TRASPASO_IN_ID: item.TRASPASO_IN_ID,
            NOMBRE: item.NOMBRE,
            LOCALIZACION: item.LOCALIZACION || "NA",
            UNIDAD_VENTA: item.UNIDAD_VENTA,
            SURTIDAS: 0,
            CONFIRMADO: false,
          }));
          setItems(mappedItems);
        } else {
          setAlert({
            visible: true,
            message: data.message || "Error al cargar los artículos.",
          });
        }
      } catch (e) {
        setAlert({
          visible: true,
          message: "Error de red al obtener detalles.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetalles();
  }, [effectiveTraspasoId, articulos]);

  // Bloquear botón atrás
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setExitModalVisible(true);
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  // Focus scanner
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        !alert.visible &&
        !exitModalVisible &&
        !showCameraScanner &&
        !qtyModal.visible
      ) {
        scannerRef.current?.focus();
      }
    }, 300);
    return () => clearInterval(interval);
  }, [alert.visible, exitModalVisible, showCameraScanner, qtyModal.visible]);

  const handleBarcodeScanned = (code: string) => {
    const cleanedCode = code.trim();
    if (!cleanedCode) return;

    // 1. PRIORIDAD: ¿Es la ubicación del artículo que estoy viendo?
    const currentArt = items[currentIndex];
    if (currentArt && currentArt.LOCALIZACION === cleanedCode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
      setLocationFeedback({ visible: true, loc: cleanedCode });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      setTempBarcode("");
      return;
    }

    // 2. PRIORIDAD: ¿Es el código de barras del artículo que estoy viendo?
    if (
      currentArt &&
      (currentArt.CODIGO === cleanedCode ||
        currentArt.CODIGO_BARRAS === cleanedCode)
    ) {
      const isLocked = !!(
        currentArt.LOCALIZACION &&
        currentArt.LOCALIZACION !== "NA" &&
        !unlockedLocations.has(currentArt.LOCALIZACION)
      );
      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Primero debes desbloquear la ubicación ${currentArt.LOCALIZACION} escaneando el código del pasillo.`,
        });
      } else if ((currentArt.SURTIDAS ?? 0) < currentArt.UNIDADES) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(currentIndex);
      }
      setTempBarcode("");
      return;
    }

    // 3. FALLBACK: Buscar ubicación en toda la lista
    const matchLocIdx = items.findIndex((a) => a.LOCALIZACION === cleanedCode);
    if (matchLocIdx !== -1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
      setLocationFeedback({ visible: true, loc: cleanedCode });
      setTimeout(() => setLocationFeedback({ visible: false, loc: "" }), 2000);
      listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
      setTempBarcode("");
      return;
    }

    // 4. FALLBACK: Buscar artículo en toda la lista
    const foundIndex = items.findIndex(
      (a) =>
        (a.CODIGO === cleanedCode || a.CODIGO_BARRAS === cleanedCode) &&
        (a.SURTIDAS ?? 0) < a.UNIDADES,
    );

    if (foundIndex !== -1) {
      const art = items[foundIndex];
      const isLocked = !!(
        art.LOCALIZACION &&
        art.LOCALIZACION !== "NA" &&
        !unlockedLocations.has(art.LOCALIZACION)
      );

      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlert({
          visible: true,
          message: `⚠️ Ubicación bloqueada. Desliza hacia ${art.LOCALIZACION} y escanea el pasillo.`,
        });
        listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementarSurtido(foundIndex);
        if (foundIndex !== currentIndex) {
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
        }
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTempBarcode("");
  };

  // Handler para escaneo con cámara
  const handleCameraScan = useCallback(
    (data: string) => {
      if (cameraScanLock.current) return;
      cameraScanLock.current = true;

      const cleanedCode = data.trim().toUpperCase();

      const currentArt = items[currentIndex];

      // 1. ¿Es la ubicación del artículo actual?
      if (currentArt && currentArt.LOCALIZACION === cleanedCode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
        setCameraScanMessage(`Ubicación ${cleanedCode} desbloqueada`);
        setCameraScanSuccess(true);
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1500);
        return;
      }

      // 2. ¿Es el código del artículo actual?
      if (
        currentArt &&
        (currentArt.CODIGO === cleanedCode ||
          currentArt.CODIGO_BARRAS === cleanedCode)
      ) {
        const isLocked = !!(
          currentArt.LOCALIZACION &&
          currentArt.LOCALIZACION !== "NA" &&
          !unlockedLocations.has(currentArt.LOCALIZACION)
        );

        if (isLocked) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(
            `Primero escanea ubicación ${currentArt.LOCALIZACION}`,
          );
          setCameraScanSuccess(false);
        } else if ((currentArt.SURTIDAS ?? 0) < currentArt.UNIDADES) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(currentIndex);
          setCameraScanMessage(`+1 ${currentArt.CODIGO}`);
          setCameraScanSuccess(true);
        }
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1200);
        return;
      }

      // 3. Buscar en toda la lista
      const matchLocIdx = items.findIndex(
        (a) => a.LOCALIZACION === cleanedCode,
      );
      if (matchLocIdx !== -1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUnlockedLocations((prev) => new Set(prev).add(cleanedCode));
        setCameraScanMessage(`Ubicación ${cleanedCode} desbloqueada`);
        setCameraScanSuccess(true);
        listRef.current?.scrollToIndex({ index: matchLocIdx, animated: true });
        setTimeout(() => {
          cameraScanLock.current = false;
          setCameraScanMessage(null);
        }, 1500);
        return;
      }

      const foundIndex = items.findIndex(
        (a) =>
          (a.CODIGO === cleanedCode || a.CODIGO_BARRAS === cleanedCode) &&
          (a.SURTIDAS ?? 0) < a.UNIDADES,
      );

      if (foundIndex !== -1) {
        const art = items[foundIndex];
        const isLocked = !!(
          art.LOCALIZACION &&
          art.LOCALIZACION !== "NA" &&
          !unlockedLocations.has(art.LOCALIZACION)
        );

        if (isLocked) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setCameraScanMessage(`Ubicación bloqueada: ${art.LOCALIZACION}`);
          setCameraScanSuccess(false);
          listRef.current?.scrollToIndex({ index: foundIndex, animated: true });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          incrementarSurtido(foundIndex);
          setCameraScanMessage(`+1 ${art.CODIGO}`);
          setCameraScanSuccess(true);
          if (foundIndex !== currentIndex) {
            listRef.current?.scrollToIndex({
              index: foundIndex,
              animated: true,
            });
          }
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setCameraScanMessage(`No encontrado: ${cleanedCode}`);
        setCameraScanSuccess(false);
      }

      setTimeout(() => {
        cameraScanLock.current = false;
        setCameraScanMessage(null);
      }, 1200);
    },
    [items, currentIndex, unlockedLocations],
  );

  // Abrir cámara
  const openCameraScanner = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setAlert({
          visible: true,
          message: "Se requiere acceso a la cámara para escanear.",
        });
        return;
      }
    }
    cameraScanLock.current = false;
    setCameraScanMessage(null);
    setShowCameraScanner(true);
  };

  const incrementarSurtido = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const art = newItems[index];
      if ((art.SURTIDAS ?? 0) < art.UNIDADES) {
        art.SURTIDAS = (art.SURTIDAS ?? 0) + 1;

        // Auto-confirmar si llegó al total
        if (art.SURTIDAS >= art.UNIDADES) {
          art.CONFIRMADO = true;
          // Auto-scroll al siguiente
          if (index < newItems.length - 1) {
            setTimeout(() => {
              const nextIndex = index + 1;
              listRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
              });
              setCurrentIndex(nextIndex);
            }, 600);
          }
        }
      }
      return newItems;
    });
  };

  const decrementarSurtido = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const art = newItems[index];
      if ((art.SURTIDAS ?? 0) > 0) {
        art.SURTIDAS = (art.SURTIDAS ?? 0) - 1;
        art.CONFIRMADO = false;
      }
      return newItems;
    });
  };

  const setSurtidoManual = (index: number, qty: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index].SURTIDAS = Math.min(qty, newItems[index].UNIDADES);
      if (newItems[index].SURTIDAS >= newItems[index].UNIDADES) {
        newItems[index].CONFIRMADO = true;
      }
      return newItems;
    });
  };

  const handleConfirm = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index].CONFIRMADO = !newItems[index].CONFIRMADO;
      return newItems;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const progress =
    items.length > 0
      ? items.reduce((acc, a) => acc + (a.SURTIDAS ?? 0), 0) /
        items.reduce((acc, a) => acc + a.UNIDADES, 0)
      : 0;

  const isOrderFinished =
    items.length > 0 &&
    items.every((a) => (a.SURTIDAS ?? 0) >= a.UNIDADES || a.CONFIRMADO);

  const handleFinish = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const databaseId = getCurrentDatabaseId();
      const ahora = new Date();
      const fechaFin = ahora.toISOString().split("T")[0];
      const horaFin = ahora.toTimeString().split(" ")[0].slice(0, 5);

      const response = await fetch(`${API_URL}/api/ventanilla-enviado.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoId: effectiveTraspasoId,
          nuevoEstatus: "S",
          fechaFin,
          horaFin,
          productos: items.map((item) => ({
            TRASPASO_IN_ID: effectiveTraspasoId,
            ARTICULO_ID: item.ARTICULO_ID,
            CLAVE_ARTICULO: item.CODIGO,
            UNIDADES: item.UNIDADES,
            SURTIDAS: item.SURTIDAS ?? 0,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAlert({
          visible: true,
          message: "¡Ventanilla completada con éxito!",
        });
        setTimeout(() => {
          // Si viene del modal, volver atrás. Si viene de la lista, ir a la lista de ventanillas.
          if (articulos) {
            router.back();
          } else {
            router.replace("/(main)/procesos/picking/ventanilla/index" as any);
          }
        }, 2000);
      } else {
        setAlert({
          visible: true,
          message: data.message || "Error al finalizar ventanilla.",
        });
      }
    } catch (e) {
      setAlert({ visible: true, message: "Error de red al finalizar." });
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    setLoading(true);
    try {
      // Actualizar estatus a "P" (pendiente) de nuevo
      const databaseId = getCurrentDatabaseId();
      await fetch(`${API_URL}/api/update-ventanilla.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          traspasoInId: effectiveTraspasoId,
          estatus: "P",
        }),
      });
    } catch (e) {
      console.error("Error al liberar ventanilla:", e);
    } finally {
      setLoading(false);
      setExitModalVisible(false);
      // Si viene del modal, volver atrás. Si viene de la lista, ir a la lista de ventanillas.
      if (articulos) {
        router.back();
      } else {
        router.replace("/(main)/procesos/picking/ventanilla/index" as any);
      }
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const currentItem = items[currentIndex];

  // Calcular progreso
  const totalUnidades = items.reduce((acc, a) => acc + a.UNIDADES, 0);
  const totalSurtidas = items.reduce((acc, a) => acc + (a.SURTIDAS ?? 0), 0);
  const progressPercent =
    totalUnidades > 0 ? (totalSurtidas / totalUnidades) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ocultar header de expo-router */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Scanner oculto */}
      <TextInput
        ref={scannerRef}
        style={styles.hiddenInput}
        autoFocus
        showSoftInputOnFocus={false}
        blurOnSubmit={false}
        value={tempBarcode}
        onChangeText={setTempBarcode}
        onSubmitEditing={() => {
          const code = tempBarcode.trim();
          setTempBarcode("");
          if (code) handleBarcodeScanned(code);
        }}
        onBlur={() => {
          if (
            !alert.visible &&
            !exitModalVisible &&
            !showCameraScanner &&
            !qtyModal.visible
          ) {
            setTimeout(() => scannerRef.current?.focus(), 100);
          }
        }}
      />

      {/* Header personalizado */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: colors.surface },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => setExitModalVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.background }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {folio}
            </Text>
            <View
              style={[
                styles.almacenBadge,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Ionicons name="business" size={14} color={colors.accent} />
              <Text style={[styles.almacenText, { color: colors.accent }]}>
                {almacen}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Botón de cámara */}
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: "#3B82F6" }]}
              onPress={openCameraScanner}
            >
              <Ionicons name="camera" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de progreso */}
        <View
          style={[styles.progressTrack, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor:
                  progressPercent >= 100 ? "#10B981" : colors.accent,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {totalSurtidas} / {totalUnidades} unidades (
          {Math.round(progressPercent)}%)
        </Text>
      </View>

      {/* Lista de artículos */}
      <Animated.FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item, idx) => `${item.ARTICULO_ID}-${idx}`}
        renderItem={({ item, index }) => {
          const isConfirmed = item.CONFIRMADO;
          const surtidas = item.SURTIDAS ?? 0;
          const isLocked = !!(
            item.LOCALIZACION &&
            item.LOCALIZACION !== "NA" &&
            !unlockedLocations.has(item.LOCALIZACION)
          );

          return (
            <View style={[styles.cardWrapper, { width: SCREEN_WIDTH }]}>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {/* Imagen del artículo */}
                <View
                  style={[
                    styles.imageContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Image
                    source={{
                      uri: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${getCurrentDatabaseId()}&articuloId=${item.ARTICULO_ID}`,
                    }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                  {/* Badge de ubicación flotante */}
                  <View
                    style={[
                      styles.floatingLocationBadge,
                      {
                        backgroundColor: isLocked
                          ? "#F59E0B"
                          : isConfirmed
                            ? "#10B981"
                            : colors.accent,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isLocked
                          ? "lock-closed"
                          : isConfirmed
                            ? "checkmark-circle"
                            : "location"
                      }
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.floatingLocationText}>
                      {item.LOCALIZACION}
                    </Text>
                  </View>
                </View>

                {/* Nombre */}
                <View style={styles.cardContent}>
                  <Text style={[styles.productCode, { color: colors.accent }]}>
                    {item.CODIGO}
                  </Text>
                  <Text
                    style={[styles.productName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.NOMBRE}
                  </Text>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        PEDIDO
                      </Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {item.UNIDADES}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statItem,
                        styles.statDivider,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        SURTIDO
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setQtyModal({
                            visible: true,
                            index: index,
                            value: String(surtidas),
                          });
                        }}
                        disabled={isConfirmed}
                        style={[
                          styles.surtidoIndicator,
                          {
                            backgroundColor:
                              surtidas >= item.UNIDADES
                                ? "#10B98120"
                                : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statValue,
                            {
                              color:
                                surtidas >= item.UNIDADES
                                  ? "#10B981"
                                  : colors.text,
                            },
                          ]}
                        >
                          {surtidas}
                        </Text>
                        <Ionicons
                          name="create-outline"
                          size={12}
                          color={
                            surtidas >= item.UNIDADES
                              ? "#10B981"
                              : colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        UNIDAD
                      </Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {item.UNIDAD_VENTA}
                      </Text>
                    </View>
                  </View>

                  {/* Controles de cantidad */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => decrementarSurtido(index)}
                      style={[
                        styles.qtyBtn,
                        { backgroundColor: colors.border },
                      ]}
                      disabled={isConfirmed}
                    >
                      <Ionicons name="remove" size={24} color={colors.text} />
                    </TouchableOpacity>

                    {/* Botón central de confirmar */}
                    <TouchableOpacity
                      onPress={() => handleConfirm(index)}
                      style={[
                        styles.confirmCircle,
                        {
                          backgroundColor: isConfirmed
                            ? "#6B7280"
                            : surtidas >= item.UNIDADES
                              ? "#10B981"
                              : colors.accent,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isConfirmed ? "refresh-outline" : "checkmark"}
                        size={32}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => incrementarSurtido(index)}
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor:
                            surtidas >= item.UNIDADES
                              ? colors.border
                              : colors.accent,
                        },
                      ]}
                      disabled={isConfirmed || surtidas >= item.UNIDADES}
                    >
                      <Ionicons
                        name="add"
                        size={24}
                        color={surtidas >= item.UNIDADES ? colors.text : "#fff"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Barra de progreso del artículo */}
                <View style={styles.cardProgressTrack}>
                  <View
                    style={[
                      styles.cardProgressFill,
                      {
                        width: `${Math.min((surtidas / item.UNIDADES) * 100, 100)}%`,
                        backgroundColor:
                          surtidas >= item.UNIDADES ? "#10B981" : colors.accent,
                      },
                    ]}
                  />
                </View>

                {/* Overlay confirmado */}
                {isConfirmed && (
                  <View style={styles.confirmedOverlay}>
                    <View style={styles.confirmedIcon}>
                      <Ionicons name="checkmark" size={48} color="#fff" />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleConfirm(index)}
                      style={styles.editBtn}
                    >
                      <Ionicons name="pencil" size={20} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Feedback de ubicación desbloqueada */}
      {locationFeedback.visible && (
        <Animated.View style={styles.locationUnlockedBanner}>
          <Ionicons name="lock-open" size={20} color="#10B981" />
          <Text style={styles.locationUnlockedText}>
            🔓 Ubicación {locationFeedback.loc} desbloqueada
          </Text>
        </Animated.View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: 30 }]}>
        {isOrderFinished ? (
          <TouchableOpacity
            onPress={handleFinish}
            style={[styles.finishBtn, { backgroundColor: "#10B981" }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.finishBtnText}>ENVIAR VENTANILLA</Text>
                <Ionicons name="send-outline" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.deckInfo, { backgroundColor: colors.surface }]}>
            <Text style={[styles.deckCount, { color: colors.textSecondary }]}>
              Artículo {currentIndex + 1} de {items.length}
            </Text>
            <View style={styles.deckDots}>
              {items.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === currentIndex ? colors.accent : colors.border,
                    },
                    i === currentIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Modal Salir */}
      <Modal visible={exitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="warning-outline" size={48} color="#F59E0B" />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿Seguro que quieres salir?
            </Text>
            <Text
              style={[styles.modalMessage, { color: colors.textSecondary }]}
            >
              Se perderá el progreso de esta ventanilla.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setExitModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExit}
                style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cantidad */}
      <Modal visible={qtyModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cantidad surtida
            </Text>
            <TextInput
              style={[
                styles.qtyInput,
                {
                  backgroundColor: colors.border,
                  color: colors.text,
                  borderColor: colors.accent,
                },
              ]}
              keyboardType="numeric"
              value={qtyModal.value}
              onChangeText={(text) =>
                setQtyModal((prev) => ({ ...prev, value: text }))
              }
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() =>
                  setQtyModal({ visible: false, index: 0, value: "0" })
                }
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const qty = parseInt(qtyModal.value, 10);
                  if (!isNaN(qty) && qty >= 0) {
                    const maxQty = items[qtyModal.index]?.UNIDADES || 0;
                    setSurtidoManual(qtyModal.index, Math.min(qty, maxQty));
                  }
                  setQtyModal({ visible: false, index: 0, value: "0" });
                }}
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Alert */}
      <Modal visible={alert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {alert.message.includes("éxito") ? "🎉" : "⚠️"}
            </Text>
            <Text
              style={[styles.modalMessage, { color: colors.textSecondary }]}
            >
              {alert.message}
            </Text>
            <TouchableOpacity
              onPress={() => setAlert({ visible: false, message: "" })}
              style={[styles.modalBtnFull, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 📷 Camera Scanner Modal */}
      <CameraScannerPicking
        visible={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onBarcodeScanned={handleCameraScan}
        topInset={insets.top}
        title="Escanear Artículo"
        lastScanMessage={cameraScanMessage}
        lastScanSuccess={cameraScanSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hiddenInput: { position: "absolute", width: 0, height: 0, opacity: 0 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  almacenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  almacenText: { fontSize: 12, fontWeight: "600" },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: "center", fontWeight: "600" },

  // Cards
  cardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  imageContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  productImage: {
    width: "70%",
    height: "85%",
  },
  floatingLocationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  floatingLocationText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  cardContent: {
    padding: 16,
  },
  productCode: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  surtidoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardProgressTrack: {
    height: 5,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardProgressFill: {
    height: "100%",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  locationText: { fontSize: 14, fontWeight: "700" },
  lockHint: {
    fontSize: 10,
    color: "#EF4444",
    marginLeft: 6,
    fontStyle: "italic",
  },
  locationUnlockedBanner: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 100,
  },
  locationUnlockedText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(128,128,128,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: { fontSize: 11, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  qtyBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyDisplay: {
    minWidth: 80,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  qtyText: { fontSize: 28, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  confirmedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmedIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 16,
    borderRadius: 40,
    marginBottom: 10,
  },
  editBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
  },
  footer: { paddingHorizontal: 20 },
  finishBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  finishBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  deckInfo: {
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  deckCount: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  deckDots: { flexDirection: "row", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  modalMessage: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnFull: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 16, fontWeight: "600" },
  qtyInput: {
    width: "100%",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
});
