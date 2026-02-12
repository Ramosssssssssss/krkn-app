import { CameraScannerPicking } from "@/components/CameraScannerPicking";
import { API_URL } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// OpenAI API Key (experimental feature)
const OPENAI_API_KEY =
  "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";

// Interface para artículos sugeridos por IA
interface ArticuloSugerido {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  CODIGO_BARRAS: string;
  UNIDAD_VENTA: string;
  UBICACION: string | null;
  confianza: number; // 0-100
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArticuloEncontrado {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  CODIGO_BARRAS: string;
  UNIDAD_VENTA: string;
  UBICACION_ACTUAL: string | null;
}

interface HistorialItem {
  ID: number;
  USUARIO_ID: number;
  USUARIO_NOMBRE: string;
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE_ARTICULO: string;
  UBICACION_ANTERIOR: string;
  UBICACION_NUEVA: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
  FECHA: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AcomodoScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { onCameraTrigger } = useAssistive();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  // ─── Sucursales / Almacenes ────────────────────────────────────────────────
  const {
    almacenes,
    selectedAlmacen,
    setSelectedAlmacen,
    isLoading: loadingAlmacenes,
  } = useSucursalesAlmacenes();
  const [showAlmacenPicker, setShowAlmacenPicker] = useState(false);

  // Auto-seleccionar CEDIS Totolcingo al cargar
  useEffect(() => {
    if (!selectedAlmacen && almacenes.length > 0) {
      console.log("[Acomodo] Almacenes disponibles:", almacenes);
      // Buscar CEDIS (prioridad) o primer almacén
      const cedis = almacenes.find((a) =>
        a.nombre.toUpperCase().includes("CEDIS"),
      );
      if (cedis) {
        console.log("[Acomodo] Seleccionando CEDIS:", cedis);
        setSelectedAlmacen(cedis.id);
      } else {
        console.log(
          "[Acomodo] CEDIS no encontrado, usando primero:",
          almacenes[0],
        );
        setSelectedAlmacen(almacenes[0].id);
      }
    }
  }, [almacenes, selectedAlmacen, setSelectedAlmacen]);

  const almacenActual = almacenes.find((a) => a.id === selectedAlmacen);
  // selectedAlmacen ya es el ALMACEN_ID real de Microsip
  const almacenIdReal = selectedAlmacen || 19;

  // Debug log cuando cambia el almacén
  useEffect(() => {
    if (almacenActual) {
      console.log("[Acomodo] Almacén actual:", almacenActual);
    }
  }, [almacenActual]);

  // ─── Cargar historial ──────────────────────────────────────────────────────

  const fetchHistorial = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      const databaseId = getCurrentDatabaseId();
      const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const res = await fetch(
        `${API_URL}/api/historial-acomodos.php?databaseId=${databaseId}&fecha=${hoy}&limite=20`,
      );
      const data = await res.json();
      if (data.ok) {
        setHistorial(data.historial || []);
        if (data.total >= 0) setHistorialCount(data.total);
      }
    } catch (err) {
      console.warn("[Historial] Error cargando:", err);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // Cargar historial al montar y cuando la pantalla recibe foco
  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  // Refrescar al volver de detalle
  useEffect(() => {
    const timer = setInterval(fetchHistorial, 30000); // Refresh cada 30s
    return () => clearInterval(timer);
  }, [fetchHistorial]);

  // ─── Búsqueda por texto ─────────────────────────────────────────────────────

  const buscarPorTexto = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearchingText(true);
      try {
        const databaseId = getCurrentDatabaseId();
        const res = await fetch(
          `${API_URL}/api/articulos.php?busqueda=${encodeURIComponent(query.trim())}&databaseId=${databaseId}&almacenId=${almacenIdReal}`,
        );
        const data = await res.json();
        if (data.ok && data.articulos) {
          const results = data.articulos.slice(0, 15);
          if (results.length === 1) {
            // Si solo hay 1 resultado, entrar directo
            setSearchResults([]);
            setSearchQuery("");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: "/(main)/procesos/acomodo/detalle",
              params: {
                articuloId: String(results[0].ARTICULO_ID),
                clave: results[0].CLAVE || "",
                nombre: results[0].NOMBRE || "",
                codigoBarras: results[0].CODIGO_BARRAS || "",
                unidadVenta: results[0].UNIDAD_VENTA || "PZA",
                ubicacionActual: results[0].UBICACION || "",
                almacenId: String(almacenIdReal),
                almacenNombre: almacenActual?.nombre || "CEDIS",
              },
            });
          } else {
            setSearchResults(results);
          }
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchingText(false);
      }
    },
    [almacenIdReal, almacenActual],
  );

  // ─── Revertir acomodo ─────────────────────────────────────────────────────

  const successAnim = useRef(new Animated.Value(0)).current;

  const revertirAcomodo = useCallback(
    async (item: HistorialItem) => {
      setIsReverting(true);
      try {
        const dbId = getCurrentDatabaseId();
        const res = await fetch(`${API_URL}/api/actualizar-ubicacion.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: dbId,
            articuloId: item.ARTICULO_ID,
            almacenId: item.ALMACEN_ID,
            ubicacion: item.UBICACION_ANTERIOR || "",
          }),
        });
        const data = await res.json();
        if (data.ok) {
          // Registrar la reversión en historial
          fetch(`${API_URL}/api/historial-acomodos.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              databaseId: dbId,
              usuarioId: user?.USUARIO_ID || 0,
              usuarioNombre: user
                ? `${user.NOMBRE} ${user.APELLIDO_PATERNO}`.trim()
                : "MOVIL",
              articuloId: item.ARTICULO_ID,
              clave: item.CLAVE,
              nombreArticulo: item.NOMBRE_ARTICULO,
              ubicacionAnterior: item.UBICACION_NUEVA,
              ubicacionNueva: item.UBICACION_ANTERIOR || "",
              almacenId: item.ALMACEN_ID,
              almacenNombre: item.ALMACEN_NOMBRE,
            }),
          }).catch(() => {});

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setRevertedInfo({
            clave: item.CLAVE,
            nombre: item.NOMBRE_ARTICULO,
            ubicacion: item.UBICACION_ANTERIOR || "Sin ubicación",
          });
          setRevertItem(null);
          setShowRevertSuccess(true);
          successAnim.setValue(0);
          Animated.spring(successAnim, {
            toValue: 1,
            damping: 12,
            stiffness: 180,
            useNativeDriver: true,
          }).start();
          setTimeout(() => {
            Animated.timing(successAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setShowRevertSuccess(false);
              setRevertedInfo(null);
            });
          }, 2200);
          fetchHistorial();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsReverting(false);
      }
    },
    [user, fetchHistorial, successAnim],
  );

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => buscarPorTexto(text), 400);
  };

  const focusSearchInput = () => {
    Haptics.selectionAsync();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
  };

  const selectSearchResult = (art: any) => {
    setSearchQuery("");
    setSearchResults([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(main)/procesos/acomodo/detalle",
      params: {
        articuloId: String(art.ARTICULO_ID),
        clave: art.CLAVE || "",
        nombre: art.NOMBRE || "",
        codigoBarras: art.CODIGO_BARRAS || "",
        unidadVenta: art.UNIDAD_VENTA || "PZA",
        ubicacionActual: art.UBICACION || "",
        almacenId: String(almacenIdReal),
        almacenNombre: almacenActual?.nombre || "CEDIS",
      },
    });
  };

  // Estados
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastScanMessage, setLastScanMessage] = useState<string | null>(null);
  const [lastScanSuccess, setLastScanSuccess] = useState(true);
  const scanLockRef = useRef(false);

  // PDA Input
  const pdaInputRef = useRef<TextInput>(null);
  const [pdaValue, setPdaValue] = useState("");
  const isSearchFocusedRef = useRef(false);
  const pdaFocusBlockedRef = useRef(false);

  // Reconocimiento de Artículo (Experimental)
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [recognitionPhoto, setRecognitionPhoto] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [articulosSugeridos, setArticulosSugeridos] = useState<
    ArticuloSugerido[]
  >([]);
  const [iaDeteccion, setIaDeteccion] = useState<string>("");
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const lastDeteccionRef = useRef<{
    nombre?: string;
    marca?: string;
    codigo?: string;
    medida?: string;
    color?: string;
    busquedas?: string[];
  } | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  // Búsqueda por texto
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingText, setIsSearchingText] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Historial
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialCount, setHistorialCount] = useState(0);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [revertItem, setRevertItem] = useState<HistorialItem | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [showRevertSuccess, setShowRevertSuccess] = useState(false);
  const [revertedInfo, setRevertedInfo] = useState<{
    clave: string;
    nombre: string;
    ubicacion: string;
  } | null>(null);

  // ─── Helpers para saber si algún modal está abierto ────────────────────────
  const anyModalOpen = useCallback(() => {
    return (
      scannerVisible ||
      showRecognitionModal ||
      showAlmacenPicker ||
      showHistorialModal ||
      !!revertItem ||
      showRevertSuccess
    );
  }, [
    scannerVisible,
    showRecognitionModal,
    showAlmacenPicker,
    showHistorialModal,
    revertItem,
    showRevertSuccess,
  ]);

  // ─── Recuperar foco PDA cuando nada más lo necesita ────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        !isSearchFocusedRef.current &&
        !pdaFocusBlockedRef.current &&
        !anyModalOpen()
      ) {
        pdaInputRef.current?.focus();
      }
    }, 800);
    return () => clearInterval(interval);
  }, [anyModalOpen]);

  // Cuando todos los modales se cierran, recuperar foco PDA
  useEffect(() => {
    if (!anyModalOpen() && !isSearchFocusedRef.current) {
      setTimeout(() => pdaInputRef.current?.focus(), 300);
    }
  }, [
    scannerVisible,
    showRecognitionModal,
    showAlmacenPicker,
    showHistorialModal,
    revertItem,
    showRevertSuccess,
    anyModalOpen,
  ]);

  // ─── Assistive Touch Camera ────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onCameraTrigger(async () => {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert("Permiso requerido", "Se requiere acceso a la cámara.");
          return;
        }
      }
      setScannerVisible(true);
    });
    return unsubscribe;
  }, [onCameraTrigger, permission, requestPermission]);

  // ─── Buscar Artículo ───────────────────────────────────────────────────────

  const buscarArticulo = async (codigo: string) => {
    const codigoLimpio = codigo.trim().toUpperCase();
    if (!codigoLimpio || isSearching || scanLockRef.current) return;

    scanLockRef.current = true;
    setIsSearching(true);
    setLastScanMessage(null);

    try {
      const databaseId = getCurrentDatabaseId();

      // Buscar artículo con ubicación del almacén seleccionado
      const res = await fetch(
        `${API_URL}/api/articulos.php?busqueda=${encodeURIComponent(codigoLimpio)}&databaseId=${databaseId}&almacenId=${almacenIdReal}`,
      );
      const data = await res.json();

      if (!data.ok || !data.articulos || data.articulos.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastScanMessage(`No encontrado: ${codigoLimpio}`);
        setLastScanSuccess(false);
        setIsSearching(false);
        return;
      }

      const art = data.articulos[0];

      // Ubicación viene directo de la API de artículos
      const ubicacionActual = art.UBICACION || null;
      console.log(
        `[Acomodo] Artículo encontrado: ${art.CLAVE}, ubicación: ${ubicacionActual}`,
      );

      const articuloEncontrado: ArticuloEncontrado = {
        ARTICULO_ID: art.ARTICULO_ID,
        CLAVE: art.CLAVE || art.CLAVE_ARTICULO || "",
        NOMBRE: art.NOMBRE,
        CODIGO_BARRAS: art.CODIGO_BARRAS || "",
        UNIDAD_VENTA: art.UNIDAD_VENTA || "PZA",
        UBICACION_ACTUAL: ubicacionActual,
      };

      // Cerrar scanner y navegar a detalle
      setScannerVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastScanMessage(`✓ ${articuloEncontrado.CLAVE}`);
      setLastScanSuccess(true);

      // Navegar a pantalla de detalle
      router.push({
        pathname: "/(main)/procesos/acomodo/detalle",
        params: {
          articuloId: String(articuloEncontrado.ARTICULO_ID),
          clave: articuloEncontrado.CLAVE,
          nombre: articuloEncontrado.NOMBRE,
          codigoBarras: articuloEncontrado.CODIGO_BARRAS,
          unidadVenta: articuloEncontrado.UNIDAD_VENTA,
          ubicacionActual: articuloEncontrado.UBICACION_ACTUAL || "",
          almacenId: String(almacenIdReal),
          almacenNombre: almacenActual?.nombre || "CEDIS",
        },
      });
    } catch (e) {
      console.error("Error buscando artículo:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLastScanMessage("Error de conexión");
      setLastScanSuccess(false);
    } finally {
      setIsSearching(false);
      // Desbloquear después de un delay para evitar re-escaneos
      setTimeout(() => {
        scanLockRef.current = false;
      }, 2000);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permiso requerido", "Se requiere acceso a la cámara.");
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScan = (data: string) => {
    if (scanLockRef.current) return;
    buscarArticulo(data);
  };

  // ─── Reconocimiento de Artículo (Experimental) ─────────────────────────────

  const openRecognitionCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const photo = result.assets[0];
      setRecognitionPhoto(photo.uri);
      setShowRecognitionModal(true);
      recognizeArticle(photo.base64 || "");
    }
  };

  const recognizeArticle = async (base64Image: string) => {
    if (!base64Image) return;

    setIsRecognizing(true);
    setArticulosSugeridos([]);
    setIaDeteccion("");

    try {
      // 1. Llamar a OpenAI Vision (detail: low = barato, ~$0.002 por foto)
      console.log("[Reconocimiento] Enviando imagen a OpenAI...");
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Identifica el producto en la imagen. Responde SOLO con JSON (sin backticks):
{"nombre":"producto","marca":"marca o null","codigo":"código/SKU visible o null","medida":"tamaño o null","color":"color o null","busquedas":["término1","término2","término3"]}
Ejemplos:
- Cúter: {"nombre":"cuter","marca":"Truper","codigo":null,"medida":null,"color":null,"busquedas":["cuter truper","cuter","navaja"]}
- Cinta: {"nombre":"cinta adhesiva","marca":"3M","codigo":"12500","medida":"48mm","color":"negra","busquedas":["cinta 12500","cinta negra 3M","cinta adhesiva"]}
- Foco: {"nombre":"foco LED","marca":"Philips","codigo":null,"medida":"9W","color":null,"busquedas":["foco philips","foco LED 9W","foco"]}
Lee marca, números de modelo/código y color visibles en el empaque.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "¿Qué producto es?" },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                      detail: "low",
                    },
                  },
                ],
              },
            ],
            max_tokens: 120,
            temperature: 0.2,
          }),
        },
      );

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(
          "[Reconocimiento] OpenAI error:",
          openaiRes.status,
          errText,
        );
        Alert.alert(
          "Error IA",
          `OpenAI respondió con error ${openaiRes.status}`,
        );
        return;
      }

      const openaiData = await openaiRes.json();
      const rawResponse =
        openaiData.choices?.[0]?.message?.content?.trim() || "";
      console.log("[Reconocimiento] Respuesta de OpenAI:", rawResponse);

      if (!rawResponse) {
        Alert.alert("Sin resultados", "No se pudo identificar el producto");
        return;
      }

      // Parsear JSON de OpenAI
      let deteccion: {
        nombre?: string;
        marca?: string;
        codigo?: string;
        medida?: string;
        color?: string;
        busquedas?: string[];
      };
      try {
        // Limpiar posibles backticks/markdown
        const cleaned = rawResponse
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        deteccion = JSON.parse(cleaned);
      } catch {
        console.warn(
          "[Reconocimiento] No se pudo parsear JSON, usando como texto plano",
        );
        deteccion = {
          nombre: rawResponse,
          busquedas: rawResponse.split(",").map((s: string) => s.trim()),
        };
      }

      // Mostrar qué detectó la IA
      const partes = [
        deteccion.nombre,
        deteccion.marca ? `Marca: ${deteccion.marca}` : null,
        deteccion.codigo ? `Código: ${deteccion.codigo}` : null,
        deteccion.medida ? `Medida: ${deteccion.medida}` : null,
        deteccion.color ? `Color: ${deteccion.color}` : null,
      ].filter(Boolean);
      setIaDeteccion(partes.join(" • "));
      console.log("[Reconocimiento] Detección:", deteccion);
      lastDeteccionRef.current = deteccion;
      setExcludedIds(new Set());

      // 2. Estrategia de búsqueda multi-nivel
      const databaseId = getCurrentDatabaseId();
      const allResults: ArticuloSugerido[] = [];
      const seenIds = new Set<number>();

      // Construir lista de búsquedas ordenadas por prioridad
      const searchTerms: string[] = [];

      // Prioridad 1: Código exacto (si IA leyó un código de barras/SKU)
      if (deteccion.codigo) {
        searchTerms.push(deteccion.codigo);
      }

      // Prioridad 2: Marca + nombre (más específico)
      if (deteccion.marca && deteccion.nombre) {
        searchTerms.push(`${deteccion.marca} ${deteccion.nombre}`);
      }

      // Prioridad 3: Nombre con medida
      if (deteccion.nombre && deteccion.medida) {
        searchTerms.push(`${deteccion.nombre} ${deteccion.medida}`);
      }

      // Prioridad 4: Solo nombre
      if (deteccion.nombre) {
        searchTerms.push(deteccion.nombre);
      }

      // Prioridad 5: Términos de búsqueda de la IA
      if (deteccion.busquedas) {
        for (const b of deteccion.busquedas) {
          if (b && !searchTerms.includes(b)) searchTerms.push(b);
        }
      }

      // Prioridad 6: Solo marca
      if (deteccion.marca && !searchTerms.includes(deteccion.marca)) {
        searchTerms.push(deteccion.marca);
      }

      console.log("[Reconocimiento] Términos de búsqueda:", searchTerms);

      // Ejecutar búsquedas (max 5 para no saturar)
      for (const term of searchTerms.slice(0, 5)) {
        try {
          const searchRes = await fetch(
            `${API_URL}/api/articulos.php?busqueda=${encodeURIComponent(term)}&databaseId=${databaseId}&almacenId=${almacenIdReal}`,
          );
          const searchData = await searchRes.json();

          if (searchData.ok && searchData.articulos) {
            for (const art of searchData.articulos.slice(0, 15)) {
              if (seenIds.has(art.ARTICULO_ID)) continue;
              seenIds.add(art.ARTICULO_ID);

              // Scoring avanzado
              const nombreUpper = (art.NOMBRE || "").toUpperCase();
              const claveUpper = (art.CLAVE || "").toUpperCase();
              const codigoUpper = (art.CODIGO_BARRAS || "").toUpperCase();
              let score = 0;
              let maxScore = 0;

              // Match de código exacto (+40 puntos)
              if (deteccion.codigo) {
                maxScore += 40;
                if (
                  codigoUpper === deteccion.codigo.toUpperCase() ||
                  claveUpper === deteccion.codigo.toUpperCase()
                ) {
                  score += 40;
                } else if (
                  codigoUpper.includes(deteccion.codigo.toUpperCase()) ||
                  claveUpper.includes(deteccion.codigo.toUpperCase())
                ) {
                  score += 25;
                }
              }

              // Match de marca (+20 puntos)
              if (deteccion.marca) {
                maxScore += 20;
                if (nombreUpper.includes(deteccion.marca.toUpperCase())) {
                  score += 20;
                }
              }

              // Match de nombre/producto (+25 puntos)
              if (deteccion.nombre) {
                maxScore += 25;
                const palabrasNombre = deteccion.nombre
                  .toUpperCase()
                  .split(/\s+/)
                  .filter((w: string) => w.length >= 3);
                let nameMatches = 0;
                for (const p of palabrasNombre) {
                  if (nombreUpper.includes(p)) nameMatches++;
                }
                score += Math.round(
                  (nameMatches / Math.max(1, palabrasNombre.length)) * 25,
                );
              }

              // Match de medida (+10 puntos)
              if (deteccion.medida) {
                maxScore += 10;
                if (nombreUpper.includes(deteccion.medida.toUpperCase())) {
                  score += 10;
                }
              }

              // Match de color (+5 puntos)
              if (deteccion.color) {
                maxScore += 5;
                if (nombreUpper.includes(deteccion.color.toUpperCase())) {
                  score += 5;
                }
              }

              // Calcular confianza como porcentaje del score máximo posible
              const confianza =
                maxScore > 0
                  ? Math.min(
                      98,
                      Math.max(10, Math.round((score / maxScore) * 100)),
                    )
                  : 20;

              allResults.push({
                ARTICULO_ID: art.ARTICULO_ID,
                CLAVE: art.CLAVE || "",
                NOMBRE: art.NOMBRE || "",
                CODIGO_BARRAS: art.CODIGO_BARRAS || "",
                UNIDAD_VENTA: art.UNIDAD_VENTA || "PZA",
                UBICACION: art.UBICACION || null,
                confianza,
              });
            }
          }
        } catch (searchErr) {
          console.warn("[Reconocimiento] Error buscando:", term, searchErr);
        }
      }

      // Ordenar por confianza descendente y limitar
      allResults.sort((a, b) => b.confianza - a.confianza);
      const top10 = allResults.slice(0, 10);

      setArticulosSugeridos(top10);
      if (top10.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Sin resultados",
          `IA detectó: ${partes.join(", ")}\nPero no se encontraron artículos similares.`,
        );
      }
    } catch (e) {
      console.error("Error reconociendo artículo:", e);
      Alert.alert(
        "Error",
        "No se pudo conectar con el servicio de reconocimiento",
      );
    } finally {
      setIsRecognizing(false);
    }
  };

  const selectSugerido = (art: ArticuloSugerido) => {
    setShowRecognitionModal(false);
    setRecognitionPhoto(null);
    setArticulosSugeridos([]);
    setIaDeteccion("");
    setExcludedIds(new Set());
    lastDeteccionRef.current = null;
    setIsRefining(false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    router.push({
      pathname: "/(main)/procesos/acomodo/detalle",
      params: {
        articuloId: String(art.ARTICULO_ID),
        clave: art.CLAVE,
        nombre: art.NOMBRE,
        codigoBarras: art.CODIGO_BARRAS || "",
        unidadVenta: art.UNIDAD_VENTA || "PZA",
        ubicacionActual: art.UBICACION || "",
        almacenId: String(almacenIdReal),
        almacenNombre: almacenActual?.nombre || "CEDIS",
      },
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* PDA Input invisible */}
      <TextInput
        ref={pdaInputRef}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        value={pdaValue}
        onChangeText={setPdaValue}
        style={styles.hiddenInput}
        onSubmitEditing={() => {
          const code = pdaValue.trim();
          setPdaValue("");
          if (code) buscarArticulo(code);
        }}
        blurOnSubmit={false}
        onBlur={() => {
          // Esperar 350ms para dar tiempo a que onFocus del search input se registre
          setTimeout(() => {
            if (
              !isSearchFocusedRef.current &&
              !pdaFocusBlockedRef.current &&
              !anyModalOpen()
            ) {
              pdaInputRef.current?.focus();
            }
          }, 350);
        }}
      />

      {/* Header iOS Style */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
            <Text style={[styles.headerBtnText, { color: colors.accent }]}>
              Atrás
            </Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Acomodo
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              fetchHistorial();
              setShowHistorialModal(true);
            }}
            style={[styles.scanIconBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowAlmacenPicker(true)}
          style={[
            styles.headerAlmacenPill,
            {
              backgroundColor: isDark
                ? "rgba(99,102,241,0.12)"
                : "rgba(99,102,241,0.08)",
              borderColor: isDark
                ? "rgba(99,102,241,0.3)"
                : "rgba(99,102,241,0.2)",
            },
          ]}
        >
          {loadingAlmacenes ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <Ionicons name="business" size={16} color={colors.accent} />
              <Text
                style={[styles.almacenPillText, { color: colors.accent }]}
                numberOfLines={1}
              >
                {almacenActual?.nombre || "Seleccionar almacén"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.accent} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda por texto */}
      <View style={styles.searchBarWrap}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderColor: searchQuery
                ? colors.accent
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={searchQuery ? colors.accent : colors.textSecondary}
          />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar artículo por nombre o clave..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => {
              isSearchFocusedRef.current = true;
              pdaFocusBlockedRef.current = true;
            }}
            onBlur={() => {
              isSearchFocusedRef.current = false;
              // Devolver foco al PDA tras salir del buscador (con delay generoso)
              setTimeout(() => {
                pdaFocusBlockedRef.current = false;
                if (!anyModalOpen()) {
                  pdaInputRef.current?.focus();
                }
              }, 400);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          {isSearchingText && (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <View
            style={[
              styles.searchDropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView
              style={{ maxHeight: 280 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((art, idx) => (
                <TouchableOpacity
                  key={art.ARTICULO_ID || idx}
                  style={[
                    styles.searchResultItem,
                    idx < searchResults.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => selectSearchResult(art)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchResultInfo}>
                    <Text
                      style={[
                        styles.searchResultClave,
                        { color: colors.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {art.CLAVE}
                    </Text>
                    <Text
                      style={[
                        styles.searchResultNombre,
                        { color: colors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {art.NOMBRE}
                    </Text>
                    {art.UBICACION ? (
                      <View style={styles.searchResultUbicWrap}>
                        <Ionicons name="location" size={12} color="#10B981" />
                        <Text style={styles.searchResultUbicText}>
                          {art.UBICACION}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Indicator ── */}
        {isSearching && (
          <View
            style={[
              styles.searchingBanner,
              {
                backgroundColor: isDark
                  ? "rgba(99,102,241,0.12)"
                  : "rgba(99,102,241,0.08)",
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text
              style={[styles.searchingBannerText, { color: colors.accent }]}
            >
              Buscando artículo...
            </Text>
          </View>
        )}

        {/* ── Feedback Pill ── */}
        {lastScanMessage && (
          <View
            style={[
              styles.feedbackPill,
              {
                backgroundColor: lastScanSuccess
                  ? isDark
                    ? "rgba(52,199,89,0.12)"
                    : "rgba(52,199,89,0.08)"
                  : isDark
                    ? "rgba(255,59,48,0.12)"
                    : "rgba(255,59,48,0.08)",
              },
            ]}
          >
            <Ionicons
              name={lastScanSuccess ? "checkmark-circle" : "alert-circle"}
              size={18}
              color={lastScanSuccess ? "#34C759" : "#FF3B30"}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: lastScanSuccess ? "#34C759" : "#FF3B30" },
              ]}
            >
              {lastScanMessage}
            </Text>
          </View>
        )}

        {/* ── Action Buttons — Compact iOS Style ── */}
        {!isSearching && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              Acciones
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[
                  styles.actionCardCompact,
                  {
                    backgroundColor: isDark ? "rgba(28,28,30,1)" : "#fff",
                    shadowColor: isDark ? "transparent" : "#000",
                  },
                ]}
                onPress={openScanner}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[colors.accent, isDark ? "#818CF8" : "#6366F1"]}
                  style={styles.actionIconCompact}
                >
                  <Ionicons name="camera" size={18} color="#fff" />
                </LinearGradient>
                <Text
                  style={[styles.actionCompactText, { color: colors.text }]}
                >
                  Escanear
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCardCompact,
                  {
                    backgroundColor: isDark ? "rgba(28,28,30,1)" : "#fff",
                    shadowColor: isDark ? "transparent" : "#000",
                  },
                ]}
                onPress={focusSearchInput}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={["#3B82F6", "#22C55E"]}
                  style={styles.actionIconCompact}
                >
                  <Ionicons name="search" size={18} color="#fff" />
                </LinearGradient>
                <Text
                  style={[styles.actionCompactText, { color: colors.text }]}
                >
                  Buscar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCardCompact,
                  {
                    backgroundColor: isDark ? "rgba(28,28,30,1)" : "#fff",
                    shadowColor: isDark ? "transparent" : "#000",
                  },
                ]}
                onPress={openRecognitionCamera}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={["#F59E0B", "#F97316"]}
                  style={styles.actionIconCompact}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                </LinearGradient>
                <Text
                  style={[styles.actionCompactText, { color: colors.text }]}
                >
                  Reconocer
                </Text>
                <View style={styles.aiBadgeCompact}>
                  <Text style={styles.aiBadgeText}>BETA</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── How it works — iOS Grouped ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Cómo funciona
        </Text>
        <View
          style={[
            styles.tipsGroup,
            {
              backgroundColor: isDark ? "rgba(28,28,30,1)" : "#fff",
              shadowColor: isDark ? "transparent" : "#000",
            },
          ]}
        >
          <View style={styles.tipRow}>
            <View
              style={[
                styles.tipIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(99,102,241,0.08)",
                },
              ]}
            >
              <Ionicons name="scan-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Escanea el artículo
              </Text>
              <Text
                style={[styles.tipSubtitle, { color: colors.textSecondary }]}
              >
                Código de barras, clave o búsqueda por texto
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.tipSep,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          />
          <View style={styles.tipRow}>
            <View
              style={[
                styles.tipIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(52,199,89,0.15)"
                    : "rgba(52,199,89,0.08)",
                },
              ]}
            >
              <Ionicons name="location" size={20} color="#34C759" />
            </View>
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Asigna la ubicación
              </Text>
              <Text
                style={[styles.tipSubtitle, { color: colors.textSecondary }]}
              >
                Actualiza dónde se encuentra en el almacén
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.tipSep,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          />
          <View style={styles.tipRow}>
            <View
              style={[
                styles.tipIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(255,149,0,0.15)"
                    : "rgba(255,149,0,0.08)",
                },
              ]}
            >
              <Ionicons name="time" size={20} color="#FF9500" />
            </View>
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Consulta el historial
              </Text>
              <Text
                style={[styles.tipSubtitle, { color: colors.textSecondary }]}
              >
                Revisa y revierte movimientos del día
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ═══════ Modal Historial de Acomodos — Apple Style ═══════ */}
      <Modal
        visible={showHistorialModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowHistorialModal(false)}
      >
        <View
          style={[
            styles.historialModalRoot,
            { backgroundColor: isDark ? "#000" : "#F2F2F7" },
          ]}
        >
          {/* ── iOS Navigation Bar ── */}
          <View
            style={[
              styles.iosNavBar,
              {
                paddingTop: insets.top,
                backgroundColor: isDark
                  ? "rgba(28,28,30,0.94)"
                  : "rgba(249,249,249,0.94)",
                borderBottomColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowHistorialModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.iosNavBtn}
            >
              <Ionicons name="chevron-back" size={28} color={colors.accent} />
              <Text style={[styles.iosNavBtnText, { color: colors.accent }]}>
                Atrás
              </Text>
            </TouchableOpacity>

            <View style={styles.iosNavCenter} pointerEvents="none">
              <Text style={[styles.iosNavTitle, { color: colors.text }]}>
                Historial
              </Text>
            </View>

            <TouchableOpacity
              onPress={fetchHistorial}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.iosNavBtn, { justifyContent: "flex-end" }]}
            >
              {loadingHistorial ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="refresh" size={22} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>

          {/* ── Summary Pill ── */}
          {historialCount > 0 && (
            <View
              style={[
                styles.hSummaryPill,
                {
                  backgroundColor: isDark
                    ? "rgba(99,102,241,0.12)"
                    : "rgba(99,102,241,0.08)",
                },
              ]}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.accent} />
              <Text style={[styles.hSummaryText, { color: colors.text }]}>
                <Text style={{ fontWeight: "700", color: colors.accent }}>
                  {historialCount}
                </Text>{" "}
                movimiento{historialCount !== 1 ? "s" : ""} hoy
              </Text>
            </View>
          )}

          {/* ── Content ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 30,
            }}
            showsVerticalScrollIndicator={false}
          >
            {loadingHistorial && historial.length === 0 ? (
              <View style={styles.hEmptyWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : historial.length === 0 ? (
              <View style={styles.hEmptyWrap}>
                <View
                  style={[
                    styles.hEmptyIcon,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={40}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={[styles.hEmptyTitle, { color: colors.text }]}>
                  Sin movimientos
                </Text>
                <Text
                  style={[
                    styles.hEmptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Los acomodos de hoy aparecerán aquí
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {historial.map((item, idx) => {
                  const fecha = new Date(item.FECHA);
                  const hora = fecha.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const iniciales = item.USUARIO_NOMBRE
                    ? item.USUARIO_NOMBRE.split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "??";

                  return (
                    <View
                      key={item.ID || idx}
                      style={[
                        styles.hCardSingle,
                        {
                          backgroundColor: isDark ? "rgba(28,28,30,1)" : "#fff",
                          shadowColor: isDark ? "transparent" : "#000",
                        },
                      ]}
                    >
                      <View style={styles.hCardItem}>
                        {/* Avatar */}
                        <View
                          style={[
                            styles.hCardAvatar,
                            {
                              backgroundColor: isDark
                                ? "rgba(99,102,241,0.2)"
                                : "rgba(99,102,241,0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.hCardAvatarText,
                              { color: colors.accent },
                            ]}
                          >
                            {iniciales}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={styles.hCardBody}>
                          <View style={styles.hCardRow1}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.hCardClave,
                                  { color: colors.accent },
                                ]}
                                numberOfLines={1}
                              >
                                {item.CLAVE}
                              </Text>
                              <Text
                                style={[
                                  styles.hCardNombre,
                                  { color: colors.text },
                                ]}
                                numberOfLines={2}
                              >
                                {item.NOMBRE_ARTICULO}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.hCardHora,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {hora}
                            </Text>
                          </View>

                          {/* Location Change */}
                          <View
                            style={[
                              styles.hLocRow,
                              {
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.025)",
                              },
                            ]}
                          >
                            <View style={styles.hLocItem}>
                              <Ionicons
                                name="location-outline"
                                size={13}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.hLocValue,
                                  { color: colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {item.UBICACION_ANTERIOR || "—"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.hLocArrow,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(99,102,241,0.15)"
                                    : "rgba(99,102,241,0.1)",
                                },
                              ]}
                            >
                              <Ionicons
                                name="arrow-forward"
                                size={11}
                                color={colors.accent}
                              />
                            </View>
                            <View style={styles.hLocItem}>
                              <Ionicons
                                name="location"
                                size={13}
                                color="#34C759"
                              />
                              <Text
                                style={[
                                  styles.hLocValue,
                                  { color: "#34C759", fontWeight: "600" },
                                ]}
                                numberOfLines={1}
                              >
                                {item.UBICACION_NUEVA}
                              </Text>
                            </View>
                          </View>

                          {/* Bottom: user + revert */}
                          <View style={styles.hCardBottom}>
                            <Text
                              style={[
                                styles.hCardUser,
                                { color: colors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {item.USUARIO_NOMBRE}
                            </Text>
                            {item.UBICACION_ANTERIOR ? (
                              <TouchableOpacity
                                onPress={() => setRevertItem(item)}
                                style={[
                                  styles.hRevertBtn,
                                  {
                                    backgroundColor: isDark
                                      ? "rgba(255,59,48,0.12)"
                                      : "rgba(255,59,48,0.08)",
                                  },
                                ]}
                                activeOpacity={0.6}
                              >
                                <Ionicons
                                  name="arrow-undo"
                                  size={13}
                                  color="#FF3B30"
                                />
                                <Text style={styles.hRevertText}>Deshacer</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ═══════ Modal Confirmar Revertir — iOS Action Sheet ═══════ */}
      <Modal
        visible={!!revertItem}
        transparent
        animationType="fade"
        onRequestClose={() => setRevertItem(null)}
      >
        <BlurView
          intensity={isDark ? 50 : 30}
          tint={isDark ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setRevertItem(null)}
          />
          <View
            style={[
              styles.revertSheet,
              {
                backgroundColor: isDark
                  ? "rgba(28,28,30,0.98)"
                  : "rgba(255,255,255,0.98)",
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View
                style={[
                  styles.handleBar,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.12)",
                  },
                ]}
              />
            </View>

            {/* Icon + Title */}
            <View style={styles.revertSheetContent}>
              <View
                style={[
                  styles.revertIconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,59,48,0.15)"
                      : "rgba(255,59,48,0.08)",
                  },
                ]}
              >
                <Ionicons name="arrow-undo-circle" size={36} color="#FF3B30" />
              </View>

              <Text style={[styles.revertSheetTitle, { color: colors.text }]}>
                ¿Revertir ubicación?
              </Text>
              <Text
                style={[
                  styles.revertSheetDesc,
                  { color: colors.textSecondary },
                ]}
              >
                Esta acción restaurará la ubicación anterior del artículo
              </Text>

              {revertItem && (
                <View
                  style={[
                    styles.revertArticleCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.revertArticleClave,
                      { color: colors.accent },
                    ]}
                  >
                    {revertItem.CLAVE}
                  </Text>
                  <Text
                    style={[styles.revertArticleNombre, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {revertItem.NOMBRE_ARTICULO}
                  </Text>

                  <View style={styles.revertLocFlow}>
                    <View
                      style={[
                        styles.revertLocBox,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,59,48,0.1)"
                            : "rgba(255,59,48,0.06)",
                          borderColor: "rgba(255,59,48,0.2)",
                        },
                      ]}
                    >
                      <Text style={styles.revertLocLabel}>Actual</Text>
                      <Text
                        style={[styles.revertLocText, { color: "#FF3B30" }]}
                      >
                        {revertItem.UBICACION_NUEVA}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.revertLocArrowWrap,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </View>

                    <View
                      style={[
                        styles.revertLocBox,
                        {
                          backgroundColor: isDark
                            ? "rgba(52,199,89,0.1)"
                            : "rgba(52,199,89,0.06)",
                          borderColor: "rgba(52,199,89,0.2)",
                        },
                      ]}
                    >
                      <Text style={styles.revertLocLabel}>Restaurar</Text>
                      <Text
                        style={[styles.revertLocText, { color: "#34C759" }]}
                      >
                        {revertItem.UBICACION_ANTERIOR || "Sin ubicación"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Buttons */}
              <View style={styles.revertBtnRow}>
                <TouchableOpacity
                  onPress={() => setRevertItem(null)}
                  style={[
                    styles.revertCancelBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.revertCancelText, { color: colors.text }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => revertItem && revertirAcomodo(revertItem)}
                  disabled={isReverting}
                  style={[
                    styles.revertConfirmBtn,
                    { opacity: isReverting ? 0.6 : 1 },
                  ]}
                  activeOpacity={0.7}
                >
                  {isReverting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="arrow-undo" size={18} color="#fff" />
                      <Text style={styles.revertConfirmText}>Revertir</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ═══════ Revert Success Overlay ═══════ */}
      <Modal
        visible={showRevertSuccess}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <BlurView
          intensity={isDark ? 60 : 40}
          tint={isDark ? "dark" : "light"}
          style={styles.successOverlay}
        >
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: isDark
                  ? "rgba(28,28,30,0.98)"
                  : "rgba(255,255,255,0.98)",
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: successAnim,
              },
            ]}
          >
            <View style={styles.successCheckWrap}>
              <LinearGradient
                colors={["#34C759", "#30D158"]}
                style={styles.successCheckCircle}
              >
                <Ionicons name="checkmark" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              ¡Ubicación Revertida!
            </Text>
            {revertedInfo && (
              <>
                <Text style={[styles.successClave, { color: colors.accent }]}>
                  {revertedInfo.clave}
                </Text>
                <Text
                  style={[
                    styles.successNombre,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {revertedInfo.nombre}
                </Text>
                <View
                  style={[
                    styles.successLocPill,
                    {
                      backgroundColor: isDark
                        ? "rgba(52,199,89,0.12)"
                        : "rgba(52,199,89,0.08)",
                    },
                  ]}
                >
                  <Ionicons name="location" size={16} color="#34C759" />
                  <Text style={styles.successLocText}>
                    {revertedInfo.ubicacion}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Camera Scanner */}
      <CameraScannerPicking
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScan}
        topInset={insets.top}
        title="Escanear Artículo"
        lastScanMessage={lastScanMessage}
        lastScanSuccess={lastScanSuccess}
      />

      {/* Almacén Picker Modal - iOS Style */}
      <Modal
        visible={showAlmacenPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlmacenPicker(false)}
      >
        <BlurView
          intensity={isDark ? 40 : 20}
          tint={isDark ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setShowAlmacenPicker(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                maxHeight: "60%",
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View
                style={[
                  styles.handleBar,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.15)",
                  },
                ]}
              />
            </View>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Seleccionar Almacén
            </Text>
            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
            >
              {almacenes.map((alm, idx) => (
                <TouchableOpacity
                  key={alm.id}
                  style={[
                    styles.pickerItem,
                    {
                      backgroundColor:
                        selectedAlmacen === alm.id
                          ? isDark
                            ? "rgba(99,102,241,0.15)"
                            : "rgba(99,102,241,0.1)"
                          : "transparent",
                      borderBottomColor: colors.border,
                      borderBottomWidth: idx < almacenes.length - 1 ? 0.5 : 0,
                    },
                  ]}
                  onPress={() => {
                    setSelectedAlmacen(alm.id);
                    setShowAlmacenPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <View
                      style={[
                        styles.pickerItemIcon,
                        {
                          backgroundColor:
                            selectedAlmacen === alm.id
                              ? "rgba(99,102,241,0.2)"
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.05)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="business"
                        size={18}
                        color={
                          selectedAlmacen === alm.id
                            ? colors.accent
                            : colors.textSecondary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.pickerItemText,
                        {
                          color:
                            selectedAlmacen === alm.id
                              ? colors.accent
                              : colors.text,
                          fontWeight:
                            selectedAlmacen === alm.id ? "600" : "500",
                        },
                      ]}
                    >
                      {alm.nombre}
                    </Text>
                  </View>
                  {selectedAlmacen === alm.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      {/* Modal Reconocimiento de Artículo */}
      <Modal
        visible={showRecognitionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRecognitionModal(false);
          setRecognitionPhoto(null);
          setArticulosSugeridos([]);
          setIaDeteccion("");
          setExcludedIds(new Set());
          lastDeteccionRef.current = null;
          setIsRefining(false);
        }}
      >
        <View
          style={[
            styles.recognitionModal,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.recognitionHeader,
              { paddingTop: insets.top + 8, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setShowRecognitionModal(false);
                setRecognitionPhoto(null);
                setArticulosSugeridos([]);
                setIaDeteccion("");
                setExcludedIds(new Set());
                lastDeteccionRef.current = null;
                setIsRefining(false);
              }}
              style={styles.recognitionCloseBtn}
            >
              <Text
                style={[
                  styles.recognitionCloseBtnText,
                  { color: colors.accent },
                ]}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
            <View style={styles.recognitionHeaderCenter}>
              <Text
                style={[styles.recognitionHeaderTitle, { color: colors.text }]}
              >
                Reconocimiento
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: "#F59E0B",
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                  }}
                >
                  EXPERIMENTAL
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={openRecognitionCamera}
              style={styles.recognitionRetakeBtn}
            >
              <Ionicons name="camera-reverse" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Photo Preview */}
          {recognitionPhoto && (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: recognitionPhoto }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", colors.background]}
                style={styles.photoGradient}
              />
            </View>
          )}

          {/* Results */}
          <View
            style={[
              styles.resultsContainer,
              { backgroundColor: colors.background },
            ]}
          >
            {isRecognizing ? (
              <View style={styles.recognizingWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.recognizingText, { color: colors.text }]}>
                  Analizando imagen...
                </Text>
                <Text
                  style={[
                    styles.recognizingSubtext,
                    { color: colors.textSecondary },
                  ]}
                >
                  Leyendo marca, código, medidas...
                </Text>
              </View>
            ) : articulosSugeridos.length > 0 ? (
              <>
                {/* IA Detection Info */}
                {iaDeteccion ? (
                  <View
                    style={{
                      marginHorizontal: 16,
                      marginBottom: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: isDark
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(99,102,241,0.08)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(99,102,241,0.15)",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <Ionicons name="sparkles" size={14} color="#6366F1" />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: "#6366F1",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        IA detectó
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.text,
                        lineHeight: 18,
                      }}
                    >
                      {iaDeteccion}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.resultsTitle, { color: colors.text }]}>
                  Posibles coincidencias
                </Text>
                <FlatList
                  data={articulosSugeridos}
                  keyExtractor={(item) => String(item.ARTICULO_ID)}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={{
                        marginHorizontal: 16,
                        marginTop: 12,
                        paddingVertical: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.08)",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: isRefining ? 0.5 : 1,
                      }}
                      onPress={async () => {
                        if (isRefining || !lastDeteccionRef.current) return;
                        setIsRefining(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                        // Excluir los actuales
                        const newExcluded = new Set(excludedIds);
                        for (const art of articulosSugeridos) {
                          newExcluded.add(art.ARTICULO_ID);
                        }
                        setExcludedIds(newExcluded);

                        const det = lastDeteccionRef.current;
                        const databaseId = getCurrentDatabaseId();
                        const newResults: ArticuloSugerido[] = [];
                        const seenIds = new Set(newExcluded);

                        // Buscar con más términos, página 2, y variaciones
                        const extraTerms: string[] = [];
                        if (det.busquedas) {
                          for (const b of det.busquedas) {
                            if (b) extraTerms.push(b);
                          }
                        }
                        if (det.nombre) {
                          // Buscar palabras individuales del nombre
                          const words = det.nombre
                            .split(/\s+/)
                            .filter((w: string) => w.length >= 3);
                          for (const w of words) {
                            if (!extraTerms.includes(w)) extraTerms.push(w);
                          }
                        }
                        if (det.marca && !extraTerms.includes(det.marca))
                          extraTerms.push(det.marca);
                        if (det.color && det.nombre)
                          extraTerms.push(`${det.nombre} ${det.color}`);

                        console.log(
                          "[Reconocimiento] Refinando búsqueda, excluyendo",
                          newExcluded.size,
                          "artículos. Términos:",
                          extraTerms,
                        );

                        for (const term of extraTerms.slice(0, 6)) {
                          try {
                            // Buscar página 1 y 2
                            for (const pagina of [1, 2]) {
                              const searchRes = await fetch(
                                `${API_URL}/api/articulos.php?busqueda=${encodeURIComponent(term)}&databaseId=${databaseId}&almacenId=${almacenIdReal}&pagina=${pagina}`,
                              );
                              const searchData = await searchRes.json();
                              if (searchData.ok && searchData.articulos) {
                                for (const art of searchData.articulos) {
                                  if (seenIds.has(art.ARTICULO_ID)) continue;
                                  seenIds.add(art.ARTICULO_ID);

                                  const nombreUpper = (
                                    art.NOMBRE || ""
                                  ).toUpperCase();
                                  let score = 0;
                                  let maxScore = 0;

                                  if (det.codigo) {
                                    maxScore += 40;
                                    const codigoUpper = (
                                      art.CODIGO_BARRAS || ""
                                    ).toUpperCase();
                                    const claveUpper = (
                                      art.CLAVE || ""
                                    ).toUpperCase();
                                    if (
                                      codigoUpper ===
                                        det.codigo.toUpperCase() ||
                                      claveUpper === det.codigo.toUpperCase()
                                    )
                                      score += 40;
                                    else if (
                                      codigoUpper.includes(
                                        det.codigo.toUpperCase(),
                                      ) ||
                                      claveUpper.includes(
                                        det.codigo.toUpperCase(),
                                      )
                                    )
                                      score += 25;
                                  }
                                  if (det.marca) {
                                    maxScore += 20;
                                    if (
                                      nombreUpper.includes(
                                        det.marca.toUpperCase(),
                                      )
                                    )
                                      score += 20;
                                  }
                                  if (det.nombre) {
                                    maxScore += 25;
                                    const pw = det.nombre
                                      .toUpperCase()
                                      .split(/\s+/)
                                      .filter((w: string) => w.length >= 3);
                                    let m = 0;
                                    for (const p of pw) {
                                      if (nombreUpper.includes(p)) m++;
                                    }
                                    score += Math.round(
                                      (m / Math.max(1, pw.length)) * 25,
                                    );
                                  }
                                  if (det.medida) {
                                    maxScore += 10;
                                    if (
                                      nombreUpper.includes(
                                        det.medida.toUpperCase(),
                                      )
                                    )
                                      score += 10;
                                  }
                                  if (det.color) {
                                    maxScore += 5;
                                    if (
                                      nombreUpper.includes(
                                        det.color.toUpperCase(),
                                      )
                                    )
                                      score += 5;
                                  }

                                  const confianza =
                                    maxScore > 0
                                      ? Math.min(
                                          98,
                                          Math.max(
                                            10,
                                            Math.round(
                                              (score / maxScore) * 100,
                                            ),
                                          ),
                                        )
                                      : 20;

                                  newResults.push({
                                    ARTICULO_ID: art.ARTICULO_ID,
                                    CLAVE: art.CLAVE || "",
                                    NOMBRE: art.NOMBRE || "",
                                    CODIGO_BARRAS: art.CODIGO_BARRAS || "",
                                    UNIDAD_VENTA: art.UNIDAD_VENTA || "PZA",
                                    UBICACION: art.UBICACION || null,
                                    confianza,
                                  });
                                }
                              }
                            }
                          } catch (err) {
                            console.warn(
                              "[Reconocimiento] Error refinando:",
                              term,
                              err,
                            );
                          }
                        }

                        newResults.sort((a, b) => b.confianza - a.confianza);
                        const top10 = newResults.slice(0, 10);

                        if (top10.length > 0) {
                          setArticulosSugeridos(top10);
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Success,
                          );
                        } else {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning,
                          );
                          Alert.alert(
                            "Sin más resultados",
                            "No se encontraron más artículos similares. Intenta tomar otra foto.",
                          );
                        }
                        setIsRefining(false);
                      }}
                      activeOpacity={0.7}
                      disabled={isRefining}
                    >
                      {isRefining ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.textSecondary}
                        />
                      ) : (
                        <Ionicons
                          name="refresh"
                          size={18}
                          color={colors.textSecondary}
                        />
                      )}
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.textSecondary,
                          fontWeight: "500",
                        }}
                      >
                        {isRefining
                          ? "Buscando más..."
                          : "¿No está aquí? Buscar más opciones"}
                      </Text>
                    </TouchableOpacity>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.sugerenciaCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => selectSugerido(item)}
                      activeOpacity={0.7}
                    >
                      {/* Thumbnail */}
                      <View style={styles.sugerenciaThumb}>
                        <Image
                          source={{
                            uri: `${API_URL}/api/imagen-articulo.php?databaseId=${getCurrentDatabaseId()}&articuloId=${item.ARTICULO_ID}&pos=0`,
                          }}
                          style={styles.sugerenciaImage}
                          contentFit="cover"
                        />
                      </View>

                      {/* Info */}
                      <View style={styles.sugerenciaInfo}>
                        <Text
                          style={[
                            styles.sugerenciaClave,
                            { color: colors.accent },
                          ]}
                        >
                          {item.CLAVE}
                        </Text>
                        <Text
                          style={[
                            styles.sugerenciaNombre,
                            { color: colors.text },
                          ]}
                          numberOfLines={2}
                        >
                          {item.NOMBRE}
                        </Text>
                        {item.UBICACION && (
                          <View style={styles.sugerenciaUbicacion}>
                            <Ionicons
                              name="location"
                              size={12}
                              color="#10B981"
                            />
                            <Text style={styles.sugerenciaUbicacionText}>
                              {item.UBICACION}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Confianza */}
                      <View style={styles.confianzaWrap}>
                        <View
                          style={[
                            styles.confianzaBadge,
                            {
                              backgroundColor:
                                item.confianza >= 80
                                  ? "rgba(16,185,129,0.15)"
                                  : item.confianza >= 50
                                    ? "rgba(245,158,11,0.15)"
                                    : "rgba(239,68,68,0.15)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confianzaText,
                              {
                                color:
                                  item.confianza >= 80
                                    ? "#10B981"
                                    : item.confianza >= 50
                                      ? "#F59E0B"
                                      : "#EF4444",
                              },
                            ]}
                          >
                            {item.confianza}%
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.textTertiary}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <View style={styles.noResultsWrap}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text
                  style={[
                    styles.noResultsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No se encontraron coincidencias
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                  onPress={openRecognitionCamera}
                >
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={styles.retryBtnText}>Tomar otra foto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  hiddenInput: {
    position: "absolute",
    top: -100,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },

  // Header - iOS Style
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  headerBtnText: {
    fontSize: 17,
    fontWeight: "400",
    marginLeft: -4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scanIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  // Almacén Pill
  headerAlmacenPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  almacenPillText: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 180,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Searching Banner
  searchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  searchingBannerText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Action Grid
  actionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  actionCardCompact: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
  },
  actionIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionCompactText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  aiBadgeCompact: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: "#F59E0B",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Section Label
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  // Tips — iOS Grouped
  tipsGroup: {
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tipTextWrap: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  tipSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 17,
  },
  tipSep: {
    height: 0.5,
    marginLeft: 52,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  modalHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  pickerItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pickerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 16,
  },

  // Recognition Modal
  recognitionModal: {
    flex: 1,
  },
  recognitionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  recognitionCloseBtn: {
    minWidth: 60,
  },
  recognitionCloseBtnText: {
    fontSize: 17,
    fontWeight: "400",
  },
  recognitionHeaderCenter: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  recognitionHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  recognitionRetakeBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  photoPreviewContainer: {
    height: SCREEN_WIDTH * 0.6,
    width: SCREEN_WIDTH,
  },
  photoPreview: {
    flex: 1,
  },
  photoGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recognizingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  recognizingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  recognizingSubtext: {
    fontSize: 14,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  sugerenciaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  sugerenciaThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1F2937",
  },
  sugerenciaImage: {
    flex: 1,
  },
  sugerenciaInfo: {
    flex: 1,
    gap: 4,
  },
  sugerenciaClave: {
    fontSize: 13,
    fontWeight: "700",
  },
  sugerenciaNombre: {
    fontSize: 14,
    lineHeight: 18,
  },
  sugerenciaUbicacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  sugerenciaUbicacionText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  confianzaWrap: {
    alignItems: "center",
    gap: 8,
  },
  confianzaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confianzaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  noResultsWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noResultsText: {
    fontSize: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // ─── Búsqueda por texto ───────────────────────────────────────
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    paddingVertical: 0,
  },
  searchDropdown: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchResultInfo: {
    flex: 1,
    gap: 2,
  },
  searchResultClave: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  searchResultNombre: {
    fontSize: 14,
    lineHeight: 18,
  },
  searchResultUbicWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  searchResultUbicText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },

  // ─── Historial — Apple iOS Style ────────────────────────────
  historialModalRoot: {
    flex: 1,
  },
  iosNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  iosNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
    paddingHorizontal: 4,
    height: 44,
  },
  iosNavBtnText: {
    fontSize: 17,
    fontWeight: "400",
    marginLeft: -2,
  },
  iosNavCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iosNavTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  hSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  hSummaryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hEmptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 12,
  },
  hEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  hEmptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  hEmptySubtitle: {
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
  },
  hCardSingle: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  hCardItem: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  hCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  hCardAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  hCardBody: {
    flex: 1,
    gap: 8,
  },
  hCardRow1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  hCardClave: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  hCardNombre: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  hCardHora: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  hLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  hLocItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  hLocValue: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  hLocArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  hCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hCardUser: {
    fontSize: 12,
    fontWeight: "400",
    flex: 1,
  },
  hRevertBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hRevertText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF3B30",
  },
  hSeparator: {
    height: 0.5,
    marginLeft: 66,
  },

  // ─── Revert Confirm Sheet ────────────────────────────────────
  revertSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  revertSheetContent: {
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 12,
  },
  revertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  revertSheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  revertSheetDesc: {
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 4,
  },
  revertArticleCard: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  revertArticleClave: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  revertArticleNombre: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  revertLocFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  revertLocBox: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  revertLocLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  revertLocText: {
    fontSize: 15,
    fontWeight: "700",
  },
  revertLocArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  revertBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  revertCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  revertCancelText: {
    fontSize: 17,
    fontWeight: "600",
  },
  revertConfirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#FF3B30",
  },
  revertConfirmText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },

  // ─── Success Overlay ─────────────────────────────────────────
  successOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 36,
    marginHorizontal: 40,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  successCheckWrap: {
    marginBottom: 8,
  },
  successCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  successClave: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  successNombre: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
  },
  successLocPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  successLocText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#34C759",
  },
});
