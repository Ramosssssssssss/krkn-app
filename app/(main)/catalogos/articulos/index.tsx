import EditProductModal from "@/components/catalogos/EditProductModal";
import GanchoModal from "@/components/catalogos/GanchoModal";
import QuickLocationModal from "@/components/catalogos/QuickLocationModal";
import QuickStockModal from "@/components/catalogos/QuickStockModal";
import ScannerModal from "@/components/catalogos/ScannerModal";
import StockAdjustmentModal from "@/components/catalogos/StockAdjustmentModal";
import { SkeletonArticleCatalogList } from "@/components/Skeleton";
import { API_CONFIG } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const GRID_GAP = 12;
const GRID_COLUMNS = 2;
const GRID_ITEM_WIDTH = (width - 32 - GRID_GAP) / GRID_COLUMNS;

interface Articulo {
  id: number;
  nombre: string;
  sku: string;
  ubicacion: string;
  cantidad: number;
  imagen: string;
  originalImagen?: string | null;
  categoria: string;
  barcode?: string;
  color?: string;
  marca?: string;
  proveedor?: string;
  precio?: number;
  precioIva?: number;
  precioLista?: number;
  precioDistribuidor?: number;
}

type FilterType =
  | "all"
  | "sobrestock"
  | "normales"
  | "por_surtir"
  | "criticos"
  | "agotados";
type ViewMode = "list" | "grid";

interface Sucursal {
  id: number;
  nombre: string;
}

interface ArticuloSucursalData {
  stock: number;
  ubicacion: string;
  minimo: number;
  maximo: number;
  puntoReorden: number;
  loading?: boolean;
}

interface ArticuloStockMap {
  [articuloId: number]: ArticuloSucursalData | null; // null = loading
}

export default function ArticulosScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Escuchar trigger de cámara desde el botón flotante
  const { onCameraTrigger } = useAssistive();

  useEffect(() => {
    const unsubscribe = onCameraTrigger(() => {
      setIsScannerVisible(true);
    });
    return unsubscribe;
  }, []);

  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isQuickStockVisible, setIsQuickStockVisible] = useState(false);
  const [isQuickLocationVisible, setIsQuickLocationVisible] = useState(false);
  const [isGanchoVisible, setIsGanchoVisible] = useState(false);
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(
    null,
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewImagesCount, setPreviewImagesCount] = useState(1);
  const [previewCurrentImageIndex, setPreviewCurrentImageIndex] = useState(0);
  const previewScrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = Dimensions.get("window");

  // Real API State
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false); // Start false - no initial fetch
  const [hasFetched, setHasFetched] = useState(false); // Track if user has searched
  const [apiError, setApiError] = useState<string | null>(null);

  // Refs para control de flujo estable
  const pageRef = React.useRef(1);
  const [lastSearch, setLastSearch] = useState("");
  const isFetchingRef = React.useRef(false);
  const requestIdRef = React.useRef(0); // Para cancelar respuestas obsoletas

  // Sucursal State
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(
    null,
  );
  const [isSucursalModalVisible, setIsSucursalModalVisible] = useState(false);
  const [articuloStocks, setArticuloStocks] = useState<ArticuloStockMap>({});

  // Contadores de filtros
  const [filterCounts, setFilterCounts] = useState<{
    all: number;
    out: number;
  }>({ all: 0, out: 0 });

  const fetchArticulos = async (
    pageNum: number,
    search: string,
    isRefresh = false,
    filterOverride?: FilterType,
  ) => {
    const currentFilter = filterOverride || activeFilter;
    // Si es una recarga/búsqueda nueva, permitimos que pase y reseteamos el estado de carga
    if (isFetchingRef.current && !isRefresh) return;
    if (!hasMore && !isRefresh) return;

    // Incrementar ID de solicitud para invalidar respuestas anteriores
    const thisRequestId = ++requestIdRef.current;

    console.log(
      `📡 Solicitando [${thisRequestId}]: p${pageNum}, búsqueda: "${search}", isRefresh: ${isRefresh}, filtro: ${currentFilter}`,
    );

    isFetchingRef.current = true;
    setIsLoading(true);
    const databaseId = getCurrentDatabaseId();

    // Usar API separada para agotados
    const endpoint =
      currentFilter === "agotados"
        ? "/api/articulos-agotados.php"
        : API_CONFIG.ENDPOINTS.ARTICULOS;

    const url = `${API_CONFIG.BASE_URL}${endpoint}?databaseId=${databaseId}&busqueda=${encodeURIComponent(search || "%")}&pagina=${pageNum}${currentFilter !== "agotados" ? `&filtro=${currentFilter}` : ""}&almacenId=${selectedSucursal?.id || 1}&_t=${Date.now()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // Ignorar respuesta si ya hay una solicitud más nueva
      if (thisRequestId !== requestIdRef.current) {
        console.log(
          `⏭️ Ignorando respuesta obsoleta [${thisRequestId}], actual: [${requestIdRef.current}]`,
        );
        return;
      }

      if (data.ok && Array.isArray(data.articulos)) {
        const newArticulos: Articulo[] = data.articulos.map((a: any) => {
          const thumbUri = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${a.ARTICULO_ID}&thumb=1`;
          const fullUri = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${a.ARTICULO_ID}`;

          return {
            id: a.ARTICULO_ID,
            nombre: a.NOMBRE,
            sku: a.CLAVE,
            barcode: a.CODIGO_BARRAS,
            ubicacion: "N/A",
            cantidad: a.CANTIDAD || 0,
            imagen:
              a.IMAGEN === "NONE"
                ? `https://api.dicebear.com/9.x/icons/png?seed=${a.CLAVE}&icon=boxSeam&backgroundType=gradientLinear,solid`
                : thumbUri,
            originalImagen: a.IMAGEN === "NONE" ? null : fullUri,
            categoria: a.CATEGORIA || "General",
            color: a.COLOR || "#f0f0f0",
            marca: a.MARCA,
            proveedor: a.PROVEEDOR,
            precio: a.PRECIO,
            precioIva: a.PRECIO_IVA,
            precioLista: a.PRECIO_LISTA,
            precioDistribuidor: a.PRECIO_DISTRIBUIDOR,
          };
        });

        if (isRefresh) {
          setArticulos(newArticulos);
          pageRef.current = 1;
          setPage(1);
        } else {
          setArticulos((prev) => {
            // Filtrar duplicados por ID para evitar el error de "Encountered two children with the same key"
            const existingIds = new Set(prev.map((a) => a.id));
            const uniqueNew = newArticulos.filter(
              (a) => !existingIds.has(a.id),
            );
            return [...prev, ...uniqueNew];
          });
          pageRef.current = pageNum;
          setPage(pageNum);
        }

        if (data.total_count !== undefined && data.total_count !== -1) {
          setTotalItems(data.total_count);
          // Actualizar contador del filtro actual en paralelo
          if (currentFilter === "all") {
            setFilterCounts((prev) => ({ ...prev, all: data.total_count }));
          } else if (currentFilter === "agotados") {
            setFilterCounts((prev) => ({ ...prev, out: data.total_count }));
          }
        }

        setHasMore(data.hasMore);
        setApiError(null);
      } else {
        setApiError(data.message || "Error desconocido");
        if (isRefresh || pageNum === 1) {
          setArticulos([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching articles:", error);
      if (thisRequestId === requestIdRef.current) {
        setApiError(error?.message || "Error de red");
      }
    } finally {
      // Solo limpiar estados de carga si esta es la solicitud más reciente
      if (thisRequestId === requestIdRef.current) {
        setIsLoading(false);
        isFetchingRef.current = false;
        setIsInitialLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleSearch = (e?: any) => {
    Keyboard.dismiss();
    const text = e?.nativeEvent?.text;
    const finalSearch = (text !== undefined ? text : searchQuery).trim();

    console.log("--- SCANNER/SEARCH DEBUG ---");
    console.log("Event Text:", text);
    console.log("State Text:", searchQuery);
    console.log("Final Search:", `"${finalSearch}"`);

    // Actualizar estados
    setSearchQuery(finalSearch);
    setLastSearch(finalSearch);
    setHasMore(true);

    // Limpiar artículos y mostrar skeleton
    setArticulos([]);
    setIsInitialLoading(true);
    setHasFetched(true);

    // Ejecutar búsqueda directamente
    fetchArticulos(1, finalSearch, true, activeFilter);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Función para manejar click en filtro del dashboard
  const handleFilterClick = (filter: FilterType) => {
    setHasFetched(true);
    setActiveFilter(filter);
    // useEffect[activeFilter] se encarga del fetch y limpieza
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Solo recargar cuando cambia el filtro SI ya se hizo una búsqueda
  useEffect(() => {
    if (!hasFetched) return; // No fetch automático al montar
    console.log("🔄 Filtro cambiado a:", activeFilter);
    setArticulos([]);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    setIsInitialLoading(true);
    fetchArticulos(1, lastSearch, true, activeFilter);
  }, [activeFilter]);

  // Cargar conteos primero (prioridad alta - muestra stats inmediato)
  useEffect(() => {
    fetchFilterCounts();
  }, []);

  // Cargar sucursales después (prioridad baja)
  useEffect(() => {
    fetchSucursales();
  }, []);

  // Función para obtener conteos de filtros (API dedicada, rápida)
  const fetchFilterCounts = async () => {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) return;

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/articulos-stats.php?databaseId=${databaseId}`,
      );
      const data = await response.json();

      if (data.ok && data.stats) {
        setFilterCounts({
          all: data.stats.todos || 0,
          out: data.stats.agotados || 0,
        });
      }
    } catch (e) {
      console.error("Error fetching filter counts:", e);
    }
  };

  const fetchSucursales = async () => {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) return;
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUCURSALES_ALMACENES}?databaseId=${databaseId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Agrupar por sucursal (unique)
        const sucMap = new Map<number, string>();
        data.data.forEach((item: any) => {
          if (!sucMap.has(item.SUCURSAL_ID)) {
            sucMap.set(item.SUCURSAL_ID, item.NOMBRE_SUCURSAL);
          }
        });
        const uniqueSucursales: Sucursal[] = Array.from(sucMap.entries()).map(
          ([id, nombre]) => ({ id, nombre }),
        );
        setSucursales(uniqueSucursales);
      }
    } catch (e) {
      console.error("Error fetching sucursales:", e);
    }
  };

  const fetchStockForArticulo = async (articuloId: number) => {
    if (!selectedSucursal) return;
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) return;

    // Mark as loading
    setArticuloStocks((prev: ArticuloStockMap) => ({
      ...prev,
      [articuloId]: null,
    }));

    try {
      // Fetch both existencias and ubicaciones in parallel
      const [existenciasRes, ubicacionesRes] = await Promise.all([
        fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXISTENCIAS_ARTICULO}?databaseId=${databaseId}&articuloId=${articuloId}&sucursal=${encodeURIComponent(selectedSucursal.nombre)}`,
        ),
        fetch(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UBICACIONES_ARTICULO}?databaseId=${databaseId}&articuloId=${articuloId}`,
        ),
      ]);

      const existenciasData = await existenciasRes.json();
      const ubicacionesData = await ubicacionesRes.json();

      let stockValue = 0;
      let ubicacion = "";
      let minimo = 0;
      let maximo = 0;
      let puntoReorden = 0;

      // Get stock from existencias
      if (existenciasData.ok && Array.isArray(existenciasData.detalles)) {
        const searchName = selectedSucursal.nombre.toLowerCase().trim();
        const sucursalStock = existenciasData.detalles.find((d: any) => {
          const sucName = d.sucursal?.toLowerCase().trim() || "";
          // Excluir CEDIS y buscar coincidencia exacta o contenida
          if (sucName.includes("cedis")) return false;
          return sucName === searchName || sucName.includes(searchName);
        });
        stockValue = sucursalStock?.stock ?? 0;
      }

      // Get ubicacion/reorden from ubicaciones
      if (ubicacionesData.ok && Array.isArray(ubicacionesData.ubicaciones)) {
        const searchName = selectedSucursal.nombre.toLowerCase().trim();
        const sucursalUbic = ubicacionesData.ubicaciones.find((u: any) => {
          const almName = u.almacen?.toLowerCase().trim() || "";
          // Excluir CEDIS y buscar coincidencia exacta o contenida
          if (almName.includes("cedis")) return false;
          return almName === searchName || almName.includes(searchName);
        });
        if (sucursalUbic) {
          ubicacion = sucursalUbic.ubicacion || "";
          minimo = sucursalUbic.minimo || 0;
          maximo = sucursalUbic.maximo || 0;
          puntoReorden = sucursalUbic.puntoReorden || 0;
        }
      }

      setArticuloStocks((prev: ArticuloStockMap) => ({
        ...prev,
        [articuloId]: {
          stock: stockValue,
          ubicacion,
          minimo,
          maximo,
          puntoReorden,
        },
      }));
    } catch (e) {
      setArticuloStocks((prev: ArticuloStockMap) => ({
        ...prev,
        [articuloId]: {
          stock: 0,
          ubicacion: "",
          minimo: 0,
          maximo: 0,
          puntoReorden: 0,
        },
      }));
    }
  };

  // Limpiar stocks y re-buscar cuando cambia la sucursal
  useEffect(() => {
    setArticuloStocks({});
    // Solo re-buscar si ya se hizo una búsqueda previa
    if (hasFetched && lastSearch) {
      console.log("🏢 Sucursal cambiada, re-buscando:", lastSearch);
      setArticulos([]);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      setIsInitialLoading(true);
      fetchArticulos(1, lastSearch, true, activeFilter);
    }
  }, [selectedSucursal]);

  const loadMore = () => {
    if (hasMore && !isLoading && !isFetchingRef.current) {
      const nextPage = pageRef.current + 1;
      fetchArticulos(nextPage, lastSearch, false, activeFilter);
    }
  };

  const handleImagePress = (item: Articulo) => {
    setSelectedArticulo(item);
    setPreviewImage(item.imagen);
    setPreviewCurrentImageIndex(0);
    setPreviewImagesCount(1);

    // Fetch image count immediately
    const databaseId = getCurrentDatabaseId();
    fetch(
      `${API_CONFIG.BASE_URL}/api/get-artimages-count.php?databaseId=${databaseId}&articuloId=${item.id}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setPreviewImagesCount(data.count || 1);
      })
      .catch(() => {});

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const goToPreviewImage = (index: number) => {
    if (index < 0 || index >= previewImagesCount) return;
    previewScrollRef.current?.scrollTo({
      x: index * (windowWidth - 32),
      animated: true,
    });
    setPreviewCurrentImageIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filteredArticles = useMemo(() => {
    // Ya vienen filtrados desde el servidor
    return articulos;
  }, [articulos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchArticulos(1, lastSearch, true, activeFilter);
  }, [lastSearch, activeFilter]);

  const getStatusColor = (cantidad: number) => {
    if (cantidad === 0) return colors.error;
    if (cantidad <= 5) return colors.warning;
    return colors.success;
  };

  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode((prev) => (prev === "list" ? "grid" : "list"));
  };

  const openAdjustment = (articulo: Articulo) => {
    setSelectedArticulo(articulo);
    setIsAdjustModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEdit = (articulo: Articulo) => {
    setSelectedArticulo(articulo);
    setIsEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openQuickStock = (articulo: Articulo) => {
    setSelectedArticulo(articulo);
    setIsQuickStockVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openQuickLocation = (articulo: Articulo) => {
    setSelectedArticulo(articulo);
    setIsQuickLocationVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openGancho = (articulo: Articulo) => {
    setSelectedArticulo(articulo);
    setIsGanchoVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAdjustmentConfirm = (qty: number, reason: string) => {
    console.log("Adjustment confirmed:", {
      articulo: selectedArticulo?.sku,
      qty,
      reason,
    });
    setIsAdjustModalVisible(false);
  };

  const handleEditSave = (data: any) => {
    console.log("Edit saved:", { articulo: selectedArticulo?.sku, ...data });
    setIsEditModalVisible(false);
  };

  const handleEditDelete = () => {
    console.log("Delete requested:", selectedArticulo?.sku);
    setIsEditModalVisible(false);
  };

  // Swipe Actions - Ver/Eliminar
  const renderRightActions = (item: Articulo) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: "#3f5cffff" }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          openEdit(item);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="pencil-outline" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: "#FF3B30" }]}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert("Eliminar", `¿Eliminar "${item.nombre}"?`, [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: () => console.log("Deleting:", item.sku),
            },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  // List View Item - Estilo Apple minimalista con Swipe
  const renderListItem = ({ item }: { item: Articulo }) => {
    const statusColor = getStatusColor(item.cantidad);
    const sucursalData = articuloStocks[item.id];
    const isLoadingStock = sucursalData === null;
    const hasData = sucursalData !== undefined && sucursalData !== null;

    // Trigger stock fetch on first render if sucursal selected (without hook)
    if (selectedSucursal && sucursalData === undefined) {
      setTimeout(() => fetchStockForArticulo(item.id), 0);
    }

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        friction={2}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              onPress={() => handleImagePress(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.imagen }}
                style={[
                  styles.productImage,
                  { backgroundColor: colors.background },
                ]}
                resizeMode="contain"
                onError={() => {
                  item.imagen = `https://api.dicebear.com/9.x/icons/png?seed=${item.sku}&icon=boxSeam&backgroundType=gradientLinear,solid`;
                  setArticulos([...articulos]);
                }}
              />
            </TouchableOpacity>

            <View style={styles.productInfo}>
              <Text
                style={[styles.productName, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.nombre}
              </Text>
              <Text style={[styles.productSku, { color: colors.textTertiary }]}>
                {item.sku}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.printBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/(main)/aplicaciones/etiquetado/precios",
                  params: { codigo: item.sku },
                });
              }}
            >
              <Ionicons name="print-outline" size={30} color={colors.accent} />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Si hay sucursal seleccionada, mostrar info en formato horizontal igual a botones */}
          {selectedSucursal ? (
            <View
              style={[styles.cardActions, { borderTopColor: colors.border }]}
            >
              {isLoadingStock ? (
                <View style={[styles.cardAction, { flex: 1 }]}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : hasData ? (
                <>
                  {/* Maximo - Gancho */}
                  <TouchableOpacity
                    style={styles.cardAction}
                    onPress={() => openGancho(item)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: colors.textSecondary,
                      }}
                    >
                      {sucursalData.maximo}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textTertiary }}>
                      GANCHO
                    </Text>
                  </TouchableOpacity>
                  {/* Ubicacion */}
                  <TouchableOpacity
                    style={styles.cardAction}
                    onPress={() => openQuickLocation(item)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {sucursalData.ubicacion || "-"}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textTertiary }}>
                      UBIC
                    </Text>
                  </TouchableOpacity>
                  {/* Stock */}
                  <TouchableOpacity
                    style={styles.cardAction}
                    onPress={() => openQuickStock(item)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color:
                          sucursalData.stock > 0 ? colors.accent : colors.error,
                      }}
                    >
                      {sucursalData.stock}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textTertiary }}>
                      STOCK
                    </Text>
                  </TouchableOpacity>
                  {/* Ajuste */}
                  <TouchableOpacity
                    style={styles.cardAction}
                    onPress={() => openAdjustment(item)}
                  >
                    <Ionicons
                      name="swap-vertical-outline"
                      size={20}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[styles.cardAction, { flex: 1 }]}>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                    Sin datos
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View
              style={[styles.cardActions, { borderTopColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => openGancho(item)}
              >
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => openQuickLocation(item)}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => openQuickStock(item)}
              >
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => openAdjustment(item)}
              >
                <Ionicons
                  name="swap-vertical-outline"
                  size={20}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Swipeable>
    );
  };

  // Grid View Item
  const renderGridItem = ({
    item,
    index,
  }: {
    item: Articulo;
    index: number;
  }) => {
    const statusColor = getStatusColor(item.cantidad);
    const isLeftColumn = index % 2 === 0;

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => openEdit(item)}
        activeOpacity={0.8}
      >
        <TouchableOpacity
          style={styles.gridImageContainer}
          onPress={() => handleImagePress(item)}
        >
          <Image
            source={{ uri: item.imagen }}
            style={styles.gridImage}
            resizeMode="contain"
            onError={() => {
              item.imagen = `https://api.dicebear.com/9.x/icons/png?seed=${item.sku}&icon=boxSeam&backgroundType=gradientLinear,solid`;
              setArticulos([...articulos]);
            }}
          />
        </TouchableOpacity>

        <View style={styles.gridInfo}>
          <Text
            style={[styles.gridName, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.nombre}
          </Text>
          <Text style={[styles.gridSku, { color: colors.textTertiary }]}>
            {item.sku}
          </Text>
          <View style={styles.gridMeta}>
            <Ionicons
              name="location-outline"
              size={12}
              color={colors.textTertiary}
            />
            <Text style={[styles.gridLocation, { color: colors.textTertiary }]}>
              {item.ubicacion}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Dashboard filter buttons config
  const dashboardFilters = [
    {
      id: "all" as FilterType,
      label: "Todos",
      icon: "apps-outline" as const,
      color: colors.accent,
    },
    {
      id: "sobrestock" as FilterType,
      label: "Sobrestock",
      icon: "trending-up-outline" as const,
      color: "#593ae6",
    },
    {
      id: "normales" as FilterType,
      label: "Normales",
      icon: "checkmark-circle-outline" as const,
      color: "#2196F3",
    },
    {
      id: "por_surtir" as FilterType,
      label: "Por Surtir",
      icon: "alert-circle-outline" as const,
      color: "#FF9800",
    },
    {
      id: "criticos" as FilterType,
      label: "Críticos",
      icon: "warning-outline" as const,
      color: "#f44336",
    },
    {
      id: "agotados" as FilterType,
      label: "Agotados",
      icon: "close-circle-outline" as const,
      color: "#9E9E9E",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Estilo iOS */}
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Artículos
          </Text>
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={() => setIsScannerVisible(true)}
              style={styles.actionIconBtn}
            >
              <Ionicons
                name="options-outline"
                size={24}
                color={colors.accent}
              />
            </TouchableOpacity>
            {/* <TouchableOpacity
              onPress={toggleViewMode}
              style={styles.actionIconBtn}
            >
              <Ionicons
                name={viewMode === "list" ? "grid-outline" : "list-outline"}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View
            style={[
              styles.iosSearchBar,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(142,142,147,0.12)",
              },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.iosSearchInput, { color: colors.text }]}
              placeholder="Buscar"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={(e) => handleSearch(e)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setLastSearch("");
                  if (hasFetched) {
                    fetchArticulos(1, "", true, activeFilter);
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setIsScannerVisible(true)}
              style={{ padding: 4, marginLeft: 4 }}
            >
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dashboard - Solo visible cuando no hay resultados mostrados */}
      {!hasFetched ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Sucursal Selector */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: 10,
                letterSpacing: 0.5,
              }}
            >
              SUCURSAL
            </Text>
            <TouchableOpacity
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: selectedSucursal ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setIsSucursalModalVisible(true)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: selectedSucursal
                      ? colors.accent + "20"
                      : colors.border + "40",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={
                      selectedSucursal ? colors.accent : colors.textSecondary
                    }
                  />
                </View>
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                  >
                    {selectedSucursal
                      ? selectedSucursal.nombre
                      : "Todas las Sucursales"}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                    {sucursales.length} sucursales disponibles
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Dashboard Grid - 6 botones grandes */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 12,
              letterSpacing: 0.5,
            }}
          >
            FILTRAR POR ESTADO DE STOCK
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {dashboardFilters.map((filter) => {
              // Obtener count para all y agotados, 0 para el resto
              const count =
                filter.id === "all"
                  ? filterCounts.all
                  : filter.id === "agotados"
                    ? filterCounts.out
                    : 0;

              return (
                <TouchableOpacity
                  key={filter.id}
                  style={{
                    width: (width - 44) / 2,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 2,
                    borderColor:
                      activeFilter === filter.id ? filter.color : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => handleFilterClick(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "800",
                      color: filter.color,
                      marginBottom: 8,
                    }}
                  >
                    {count.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                      textAlign: "center",
                    }}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Actions */}
        </ScrollView>
      ) : (
        <>
          {/* Sucursal Selector - modo compacto cuando hay resultados */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border + "30",
            }}
          >
            <TouchableOpacity
              style={[
                styles.sucursalChip,
                {
                  backgroundColor: selectedSucursal
                    ? colors.accent
                    : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setIsSucursalModalVisible(true)}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={selectedSucursal ? "#fff" : colors.textSecondary}
              />
              <Text
                style={{
                  color: selectedSucursal ? "#fff" : colors.textSecondary,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {selectedSucursal
                  ? selectedSucursal.nombre.substring(0, 15)
                  : "Todas las Sucursales"}
              </Text>
            </TouchableOpacity>

            {/* Filter chip showing current filter */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  backgroundColor:
                    dashboardFilters.find((f) => f.id === activeFilter)?.color +
                    "20",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name={
                    dashboardFilters.find((f) => f.id === activeFilter)?.icon ||
                    "apps-outline"
                  }
                  size={14}
                  color={
                    dashboardFilters.find((f) => f.id === activeFilter)?.color
                  }
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: dashboardFilters.find((f) => f.id === activeFilter)
                      ?.color,
                  }}
                >
                  {dashboardFilters.find((f) => f.id === activeFilter)?.label}
                </Text>
              </View>

              {/* Clear button to go back to dashboard */}
              <TouchableOpacity
                onPress={() => {
                  setHasFetched(false);
                  setArticulos([]);
                  setSearchQuery("");
                  setLastSearch("");
                  setActiveFilter("all");
                  setSelectedSucursal(null);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Items Indicator */}
          {totalItems > 0 && !isInitialLoading && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border + "30",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                {totalItems.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                {totalItems === 1
                  ? "PRODUCTO ENCONTRADO"
                  : "PRODUCTOS ENCONTRADOS"}
              </Text>
            </View>
          )}

          {isInitialLoading ? (
            <SkeletonArticleCatalogList count={8} />
          ) : (
            <>
              {/* Products List/Grid */}
              {viewMode === "list" ? (
                <FlatList
                  key="list"
                  data={filteredArticles}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderListItem}
                  contentContainerStyle={styles.list}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.5}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons
                        name={
                          apiError ? "alert-circle-outline" : "search-outline"
                        }
                        size={48}
                        color={apiError ? colors.error : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {apiError ||
                          (searchQuery
                            ? `No se encontraron productos para "${searchQuery}"`
                            : "No se encontraron productos")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.retryButton,
                          { backgroundColor: colors.accent, marginTop: 10 },
                        ]}
                        onPress={onRefresh}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                          {apiError ? "Intentar de nuevo" : "Reintentar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  }
                  ListFooterComponent={() =>
                    isLoading && !refreshing ? (
                      <View style={{ padding: 20 }}>
                        <ActivityIndicator color={colors.accent} />
                      </View>
                    ) : null
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor={colors.accent}
                    />
                  }
                />
              ) : (
                <FlatList
                  key="grid"
                  data={filteredArticles}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderGridItem}
                  numColumns={2}
                  contentContainerStyle={styles.grid}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.5}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons
                        name="search-outline"
                        size={48}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        No se encontraron productos
                      </Text>
                    </View>
                  }
                  ListFooterComponent={() =>
                    isLoading && !refreshing ? (
                      <View style={{ padding: 20 }}>
                        <ActivityIndicator color={colors.accent} />
                      </View>
                    ) : null
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor={colors.accent}
                    />
                  }
                />
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <ScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={(code) => {
          setSearchQuery(code);
          handleSearch({ nativeEvent: { text: code } });
          setIsScannerVisible(false);
        }}
      />

      <StockAdjustmentModal
        visible={isAdjustModalVisible}
        articulo={selectedArticulo}
        onClose={() => setIsAdjustModalVisible(false)}
        onConfirm={handleAdjustmentConfirm}
      />

      <EditProductModal
        visible={isEditModalVisible}
        articulo={selectedArticulo}
        onClose={() => setIsEditModalVisible(false)}
      />

      <QuickStockModal
        visible={isQuickStockVisible}
        articulo={selectedArticulo}
        onClose={() => setIsQuickStockVisible(false)}
        sucursalNombre={selectedSucursal?.nombre}
      />

      <QuickLocationModal
        visible={isQuickLocationVisible}
        articulo={selectedArticulo}
        onClose={() => setIsQuickLocationVisible(false)}
        sucursalNombre={selectedSucursal?.nombre}
      />

      <GanchoModal
        visible={isGanchoVisible}
        articulo={selectedArticulo}
        onClose={() => setIsGanchoVisible(false)}
        sucursalNombre={selectedSucursal?.nombre}
      />

      {/* Image Preview */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewBackdrop}>
          <BlurView
            intensity={30}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.previewContent}>
            <ScrollView
              ref={previewScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x /
                    e.nativeEvent.layoutMeasurement.width,
                );
                setPreviewCurrentImageIndex(index);
              }}
            >
              {Array.from({ length: previewImagesCount }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: windowWidth - 32,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{
                      uri: `${API_CONFIG.BASE_URL}/api/imagen-articulo.php?databaseId=${getCurrentDatabaseId()}&articuloId=${selectedArticulo?.id}&pos=${i}&t=${selectedArticulo?.id}_${i}`,
                    }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            {previewImagesCount > 1 && (
              <View style={styles.previewNavButtons} pointerEvents="box-none">
                <TouchableOpacity
                  style={[
                    styles.previewNavBtn,
                    previewCurrentImageIndex === 0 && { opacity: 0 },
                  ]}
                  onPress={() => goToPreviewImage(previewCurrentImageIndex - 1)}
                  disabled={previewCurrentImageIndex === 0}
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.previewNavBtn,
                    previewCurrentImageIndex === previewImagesCount - 1 && {
                      opacity: 0,
                    },
                  ]}
                  onPress={() => goToPreviewImage(previewCurrentImageIndex + 1)}
                  disabled={previewCurrentImageIndex === previewImagesCount - 1}
                >
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {previewImagesCount > 1 && (
              <View style={styles.previewIndicators}>
                {Array.from({ length: previewImagesCount }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.previewIndicator,
                      {
                        backgroundColor:
                          i === previewCurrentImageIndex
                            ? colors.accent
                            : "rgba(255,255,255,0.3)",
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            <BlurView
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={styles.previewInfoBlur}
            >
              <View style={styles.previewInfo}>
                <View
                  style={[
                    styles.previewSkuBadge,
                    { backgroundColor: `${colors.accent}15` },
                  ]}
                >
                  <Text style={[styles.previewSku, { color: colors.accent }]}>
                    {selectedArticulo?.sku}
                  </Text>
                </View>
                <Text
                  style={[styles.previewName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {selectedArticulo?.nombre}
                </Text>
                {previewImagesCount > 1 && (
                  <View style={styles.previewIndexContainer}>
                    <Ionicons
                      name="images-outline"
                      size={10}
                      color={colors.textTertiary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.previewIndexText}>
                      {previewCurrentImageIndex + 1} / {previewImagesCount}
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>

            <TouchableOpacity
              style={styles.previewClose}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sucursal Selection Modal */}
      <Modal visible={isSucursalModalVisible} animationType="slide" transparent>
        <View style={styles.sucursalModalOverlay}>
          <View
            style={[
              styles.sucursalModalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.sucursalModalHeader}>
              <Text style={[styles.sucursalModalTitle, { color: colors.text }]}>
                Seleccionar Sucursal
              </Text>
              <TouchableOpacity
                onPress={() => setIsSucursalModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.sucursalItem,
                {
                  backgroundColor: !selectedSucursal
                    ? `${colors.accent}20`
                    : colors.surface,
                },
              ]}
              onPress={() => {
                setSelectedSucursal(null);
                setIsSucursalModalVisible(false);
              }}
            >
              <Text style={[styles.sucursalItemText, { color: colors.text }]}>
                Todas las Sucursales
              </Text>
              {!selectedSucursal && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.accent}
                />
              )}
            </TouchableOpacity>

            <FlatList
              data={sucursales}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sucursalItem,
                    {
                      backgroundColor:
                        selectedSucursal?.id === item.id
                          ? `${colors.accent}20`
                          : colors.surface,
                    },
                  ]}
                  onPress={() => {
                    setSelectedSucursal(item);
                    setIsSucursalModalVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Text
                    style={[styles.sucursalItemText, { color: colors.text }]}
                  >
                    {item.nombre}
                  </Text>
                  {selectedSucursal?.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    marginRight: 8,
    marginLeft: -8,
    padding: 4,
  },
  mainTitle: {
    flex: 1,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionIconBtn: {
    padding: 4,
  },
  searchContainer: {
    marginBottom: 8,
  },
  iosSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  iosSearchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  filterContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: "rgba(0,122,255,0.1)",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterCount: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  grid: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  // List View Styles - Apple minimalista
  card: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
  },
  productSku: {
    fontSize: 12,
  },
  printBtn: {
    padding: 8,
    marginLeft: 4,
  },
  stockText: {
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  cardAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  // Swipe Actions - Entrada/Salida
  swipeActionsContainer: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
    paddingLeft: 8,
  },
  swipeAction: {
    width: 65,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    gap: 2,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  swipeActionText2: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  // Grid View Styles
  gridCard: {
    width: GRID_ITEM_WIDTH,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  gridImageContainer: {
    width: "100%",
    height: GRID_ITEM_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  gridImage: {
    width: "90%",
    height: "90%",
  },
  gridBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gridBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  gridInfo: {
    padding: 12,
    gap: 4,
  },
  gridName: {
    fontSize: 15,
    fontWeight: "600",
  },
  gridSku: {
    fontSize: 12,
  },
  gridMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  gridLocation: {
    fontSize: 11,
  },
  // Preview Modal
  previewBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    width: width * 0.85,
    borderRadius: 24,
    backgroundColor: "#fff",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  previewInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: width - 80,
    height: width - 80,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  previewNavButtons: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    zIndex: 10,
  },
  previewNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginVertical: 12,
  },
  previewIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewInfoBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  previewInfo: {
    padding: 20,
    paddingBottom: 30,
    alignItems: "center",
  },
  previewSkuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewSku: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewName: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
  previewIndexContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewIndexText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8e8e93",
  },
  previewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  previewClose: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  // Stock Info Styles (when Sucursal is selected)
  cardStockInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  stockInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  stockLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  stockValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  // Sucursal Modal Styles
  sucursalModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sucursalModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  sucursalModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sucursalModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sucursalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sucursalItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sucursalChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
});
