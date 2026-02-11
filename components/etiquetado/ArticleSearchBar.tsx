import ScannerModal from "@/components/catalogos/ScannerModal";
import { API_CONFIG } from "@/config/api";
import { useAssistive } from "@/context/assistive-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface SearchResult {
  id: number;
  nombre: string;
  sku: string;
  imagen: string;
}

interface ArticleSearchBarProps {
  placeholder?: string;
  onSelectArticle: (article: SearchResult) => void;
  onClear?: () => void;
  // Custom fetch function - if not provided, uses default article search
  customFetch?: (query: string) => Promise<SearchResult[]>;
  // Auto-select if only one result
  autoSelectSingle?: boolean;
  // Show search results list
  showResultsList?: boolean;
}

export default function ArticleSearchBar({
  placeholder = "Buscar artículo...",
  onSelectArticle,
  onClear,
  customFetch,
  autoSelectSingle = true,
  showResultsList = true,
}: ArticleSearchBarProps) {
  const colors = useThemeColors();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Camera permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Escuchar trigger de cámara desde el botón flotante
  const { onCameraTrigger } = useAssistive();

  useEffect(() => {
    const unsubscribe = onCameraTrigger(async () => {
      if (!cameraPermission?.granted) {
        const { granted } = await requestCameraPermission();
        if (!granted) {
          Alert.alert(
            "Permiso Requerido",
            "Necesitamos acceso a la cámara para escanear.",
          );
          return;
        }
      }
      setIsScannerVisible(true);
    });
    return unsubscribe;
  }, [cameraPermission]);

  // Refs for scanner detection
  const lastInputTime = useRef<number>(0);
  const scanTimeout = useRef<any>(null);

  // Default fetch function - searches articles
  const defaultFetch = async (query: string): Promise<SearchResult[]> => {
    const db = getCurrentDatabaseId();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ARTICULOS}?databaseId=${db}&busqueda=${encodeURIComponent(query)}&pagina=1`,
    );
    const data = await res.json();

    if (data.ok && Array.isArray(data.articulos)) {
      return data.articulos.slice(0, 10).map((a: any) => ({
        id: a.ARTICULO_ID,
        nombre: a.NOMBRE,
        sku: a.CLAVE,
        imagen:
          a.IMAGEN === "NONE"
            ? `https://api.dicebear.com/7.x/identicon/png?seed=${a.CLAVE}`
            : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${db}&articuloId=${a.ARTICULO_ID}&thumb=1`,
      }));
    }
    return [];
  };

  const fetchFunction = customFetch || defaultFetch;

  const handleSearch = useCallback(
    async (query: string) => {
      const cleanQuery = query.trim();
      if (!cleanQuery) return;

      setIsSearching(true);
      setSearchQuery("");

      try {
        const results = await fetchFunction(cleanQuery);

        if (results.length === 1 && autoSelectSingle) {
          // Auto-select if only one result
          onSelectArticle(results[0]);
          setShowResults(false);
          setSearchResults([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (results.length > 0) {
          setSearchResults(results);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [fetchFunction, autoSelectSingle, onSelectArticle],
  );

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClear?.();
  }, [onClear]);

  const handleScan = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert(
          "Permiso Requerido",
          "Necesitamos acceso a la cámara para escanear códigos de barras.",
        );
        return;
      }
    }

    setIsScannerVisible(true);
  }, [cameraPermission, requestCameraPermission]);

  const handleScanResult = useCallback(
    (code: string) => {
      setIsScannerVisible(false);
      handleSearch(code.trim());
    },
    [handleSearch],
  );

  const handleSelectResult = useCallback(
    (article: SearchResult) => {
      setShowResults(false);
      setSearchResults([]);
      onSelectArticle(article);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [onSelectArticle],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      const now = Date.now();
      const timeDiff = now - lastInputTime.current;
      lastInputTime.current = now;

      // Si el texto contiene un salto de línea, procesar inmediatamente (scanner)
      if (text.includes("\n") || text.includes("\r")) {
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        handleSearch(text.trim());
        return;
      }

      // Limpiar para el estado visual
      const cleanText = text.replace(/[\n\r]/g, "");
      setSearchQuery(cleanText);

      if (scanTimeout.current) clearTimeout(scanTimeout.current);

      // Si es un escaneo rápido, buscar automáticamente después de un pequeño delay
      if (timeDiff < 50 && cleanText.length > 3) {
        scanTimeout.current = setTimeout(() => {
          handleSearch(cleanText.trim());
        }, 200);
      }
    },
    [handleSearch],
  );

  return (
    <>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <Ionicons
          name="search"
          size={18}
          color={colors.textTertiary}
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={handleTextChange}
          onSubmitEditing={() => handleSearch(searchQuery.trim())}
          blurOnSubmit={false}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching ? (
          <ActivityIndicator
            size={18}
            color={colors.accent}
            style={{ marginLeft: 4 }}
          />
        ) : (
          <>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClear} style={styles.iconButton}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleScan} style={styles.iconButton}>
              <Ionicons name="camera-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Results List */}
      {showResultsList && showResults && searchResults.length > 0 && (
        <View style={[styles.resultsList, { backgroundColor: colors.surface }]}>
          <View
            style={[styles.resultsHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.resultsTitle, { color: colors.textTertiary }]}>
              RESULTADOS ({searchResults.length})
            </Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          {searchResults.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.resultItem, { borderBottomColor: colors.border }]}
              onPress={() => handleSelectResult(item)}
            >
              <Image source={{ uri: item.imagen }} style={styles.resultImage} />
              <View style={styles.resultInfo}>
                <Text
                  style={[styles.resultName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.nombre}
                </Text>
                <Text style={[styles.resultSku, { color: colors.accent }]}>
                  {item.sku}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={handleScanResult}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  iconButton: {
    padding: 8,
  },
  resultsList: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  resultImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  resultSku: {
    fontSize: 13,
    fontWeight: "600",
  },
});
