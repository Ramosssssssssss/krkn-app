import { API_CONFIG } from "@/config/api";
import { getCurrentDatabaseId } from "@/services/api";
import { ArticuloDetalle } from "@/types/inventarios";
import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import { Alert, Animated, FlatList, Vibration } from "react-native";

// Mapeo de sonidos locales reutilizable
const SOUNDS = {
  scan: require("../assets/sounds/check.wav"), // Éxito en escaneo
  add: require("../assets/sounds/done.mp3"), // Acción completada/Añadido
  error: require("../assets/sounds/wrong.mp3"), // Error
};

export interface ArticleScannerOptions {
  /** Override the search URL builder. Receives the normalized search query. */
  customSearchUrl?: (query: string) => string;
  /** Called when a scanned code is not found. If provided, replaces the default Alert. */
  onNotFound?: (code: string) => void;
}

export function useArticleScanner(options?: ArticleScannerOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [detalles, setDetalles] = useState<ArticuloDetalle[]>([]);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [aggressiveScan, setAggressiveScan] = useState(true);
  // Resultados múltiples para selección manual
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchInputRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputTime = useRef<number>(0);
  const lastSearchedCode = useRef<string>("");
  const currentInputValue = useRef<string>("");
  const soundRef = useRef<Audio.Sound | null>(null);

  // Función para reproducir sonidos
  const playSound = useCallback(async (type: "scan" | "add" | "error") => {
    try {
      // Limpiar sonido anterior
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        SOUNDS[type], // Usar require() directamente
        { shouldPlay: true, volume: type === "error" ? 1.0 : 0.8 },
      );

      soundRef.current = sound;

      // Auto cleanup después de reproducir
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      // Silently fail if sound can't play
      console.log("Sound playback failed:", error);
    }
  }, []);

  const normalizeClave = (clave: string) => {
    return String(clave).trim().toUpperCase();
  };

  const flashLine = useCallback(
    (index: number) => {
      setLastAddedIndex(index);
      flashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => setLastAddedIndex(null));
    },
    [flashAnim],
  );

  const scrollToItem = useCallback((index: number) => {
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    }, 100);
  }, []);

  const addExistingArticle = useCallback(
    (clave: string) => {
      const normalizedClave = normalizeClave(clave);
      const idx = detalles.findIndex(
        (d) => normalizeClave(d.clave) === normalizedClave,
      );

      if (idx !== -1) {
        setDetalles((prev) => {
          const cur = prev[idx];
          const updatedItem = { ...cur, cantidad: cur.cantidad + 1 };
          const withoutItem = prev.filter((_, i) => i !== idx);
          return [updatedItem, ...withoutItem];
        });
        Vibration.vibrate(50);
        playSound("scan"); // Sonido de incremento
        setTimeout(() => {
          flashLine(0);
          scrollToItem(0);
        }, 50);
        return true;
      }
      return false;
    },
    [detalles, flashLine, scrollToItem, playSound],
  );

  // Caché persistente durante la sesión del componente (scannedCode -> SKU)
  const codesMapping = useRef<Map<string, string>>(new Map());
  // Caché de datos de productos (SKU -> ArticuloDetalle base)
  const productsCache = useRef<Map<string, any>>(new Map());

  const searchAndAddArticle = useCallback(
    async (clave: string) => {
      const normalizedQuery = normalizeClave(clave);
      if (!normalizedQuery) return;

      // 1. INTENTO DE DETERMINAR EL SKU (desde caché o directo)
      const mappedSku = codesMapping.current.get(normalizedQuery) || normalizedQuery;

      // 2. BUSQUEDA LOCAL EN LA LISTA ACTUAL (detalles)
      const existingIdx = detalles.findIndex(
        (d) => normalizeClave(d.clave) === mappedSku,
      );

      if (existingIdx !== -1) {
        // Encontrado en la lista actual: Incrementamos localmente
        Vibration.vibrate(50);
        playSound("scan");

        setDetalles((prev) => {
          const items = [...prev];
          const item = items[existingIdx];
          const updatedItem = { ...item, cantidad: item.cantidad + 1 };
          items.splice(existingIdx, 1);
          return [updatedItem, ...items];
        });

        setTimeout(() => {
          flashLine(0);
          scrollToItem(0);
        }, 30);

        setSearchQuery("");
        return;
      }

      // 3. BUSQUEDA EN CACHÉ DE PRODUCTOS (por si no está en la lista actual pero ya se buscó antes)
      const cachedProduct = productsCache.current.get(mappedSku);
      if (cachedProduct) {
        Vibration.vibrate(100);
        playSound("add");

        const empaque = cachedProduct.CONTENIDO_EMPAQUE && cachedProduct.CONTENIDO_EMPAQUE > 0
          ? cachedProduct.CONTENIDO_EMPAQUE
          : 1;

        const newItem: ArticuloDetalle = {
          clave: mappedSku,
          descripcion: cachedProduct.NOMBRE,
          umed: cachedProduct.UNIDAD_VENTA || null,
          cantidad: empaque,
          _key: `art-${Date.now()}`,
          articuloId: cachedProduct.ARTICULO_ID,
        };

        setDetalles((prev) => [newItem, ...prev]);

        setTimeout(() => {
          flashLine(0);
          scrollToItem(0);
        }, 30);

        setSearchQuery("");
        return;
      }

      // 4. BÚSQUEDA EN SERVIDOR (Solo si no está en ningún caché)
      if (lastSearchedCode.current === normalizedQuery) return;
      if (isSearching) return; // Evitar ráfagas de red para el mismo código

      lastSearchedCode.current = normalizedQuery;
      setIsSearching(true);

      try {
        let url: string;
        if (options?.customSearchUrl) {
          url = options.customSearchUrl(normalizedQuery);
        } else {
          const databaseId = getCurrentDatabaseId();
          if (!databaseId) {
            Alert.alert("Error", "No hay una base de datos seleccionada");
            return;
          }
          url = `${API_CONFIG.BASE_URL}/api/articulos.php?busqueda=${encodeURIComponent(normalizedQuery)}&databaseId=${databaseId}&skipPrices=1`;
        }

        const response = await fetch(url);
        const result = await response.json();
        const articulosEncontrados = result.articulos || result.data || [];

        if (result.ok && articulosEncontrados.length > 0) {
          const articulo = articulosEncontrados[0];
          const firstClave = normalizeClave(articulo.CLAVE || articulo.CLAVE_ARTICULO);
          const firstBarcode = normalizeClave(articulo.CODIGO_BARRAS);

          // Determinar si es un match exacto (el código buscado coincide con clave o barcode del primer resultado)
          const isExactMatch = (
            firstClave === normalizedQuery ||
            firstBarcode === normalizedQuery ||
            articulosEncontrados.length === 1
          );

          if (!isExactMatch && articulosEncontrados.length > 1) {
            // MÚLTIPLES RESULTADOS: mostrar selector
            setSearchResults(articulosEncontrados);
            playSound("scan");
          } else {
            // MATCH EXACTO: auto-agregar como siempre
            const currentClave = firstClave;
            const currentBarcode2 = firstBarcode;

            // Guardar en cachés para escaneos futuros ultra-rápidos
            codesMapping.current.set(normalizedQuery, currentClave);
            if (currentBarcode2) {
              codesMapping.current.set(currentBarcode2, currentClave);
            }
            productsCache.current.set(currentClave, articulo);

            // Verificar si ya existe
            setDetalles((prev) => {
              const idx = prev.findIndex((d) => normalizeClave(d.clave) === currentClave);
              const empaque = articulo.CONTENIDO_EMPAQUE && articulo.CONTENIDO_EMPAQUE > 0 ? articulo.CONTENIDO_EMPAQUE : 1;

              if (idx !== -1) {
                const items = [...prev];
                const item = items[idx];
                const updatedItem = { ...item, cantidad: item.cantidad + empaque };
                items.splice(idx, 1);
                return [updatedItem, ...items];
              } else {
                const newItem: ArticuloDetalle = {
                  clave: currentClave,
                  descripcion: articulo.NOMBRE,
                  umed: articulo.UNIDAD_VENTA || null,
                  cantidad: empaque,
                  _key: `art-${Date.now()}`,
                  articuloId: articulo.ARTICULO_ID,
                };
                return [newItem, ...prev];
              }
            });

            Vibration.vibrate(100);
            playSound(detalles.some(d => normalizeClave(d.clave) === currentClave) ? "scan" : "add");

            setTimeout(() => {
              flashLine(0);
              scrollToItem(0);
            }, 50);

            setSearchQuery("");
          }
        } else {
          Vibration.vibrate([0, 100, 50, 100]);
          playSound("error");
          if (options?.onNotFound) {
            options.onNotFound(clave);
          } else {
            Alert.alert("Artículo no encontrado", `El código "${clave}" no existe.`);
          }
        }
      } catch (err) {
        Vibration.vibrate([0, 100, 50, 100]);
        playSound("error");
        Alert.alert("Error", "No se pudo buscar el artículo.");
      } finally {
        setIsSearching(false);
        lastSearchedCode.current = "";
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    },
    [detalles, flashLine, scrollToItem, playSound, isSearching],
  );

  const handleSearchSubmit = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    const currentText = currentInputValue.current.trim().toUpperCase();
    if (!currentText) return;

    // LIMPIEZA SÍNCRONA (INSTANTÁNEA): 
    // Limpiamos todo ANTES de procesar para que el input esté libre para el siguiente código de inmediato
    currentInputValue.current = "";
    setSearchQuery("");

    if (searchInputRef.current) {
      searchInputRef.current.setNativeProps({ text: "" });
    }

    // Optimizacion: Si ya conocemos el codigo, ignoramos isSearching para permitir el incremento local instantaneo
    const mappedSku = codesMapping.current.get(currentText) || currentText;
    const alreadyInList = detalles.some(d => normalizeClave(d.clave) === mappedSku);
    const inCache = productsCache.current.has(mappedSku);

    if (!alreadyInList && !inCache && isSearching) {
      return;
    }

    searchAndAddArticle(currentText);
  }, [isSearching, searchAndAddArticle, detalles]);

  const handleSearchChange = useCallback((text: string) => {
    // Si detectamos que el texto contiene saltos de línea (típico de scanners en modo teclado)
    // o si el cambio es muy grande de golpe, disparamos el submit
    if (text.includes("\n") || text.includes("\r")) {
      currentInputValue.current = text.replace(/[\r\n]/g, "");
      handleSearchSubmit();
      return;
    }

    setSearchQuery(text);
    currentInputValue.current = text;
  }, [handleSearchSubmit]);

  const handleUpdateQuantity = useCallback((key: string, delta: number) => {
    setDetalles((prev) =>
      prev.map((item) => {
        if (item._key === key) {
          const newCantidad = item.cantidad + delta;
          // Permitir cantidad 0 (para conteos donde no hay existencia)
          return newCantidad >= 0 ? { ...item, cantidad: newCantidad } : item;
        }
        return item;
      }),
    );
  }, []);

  const handleSetQuantity = useCallback((key: string, quantity: number) => {
    setDetalles((prev) =>
      prev.map((item) => {
        if (item._key === key) {
          // Permitir cantidad 0 (para conteos donde no hay existencia)
          return { ...item, cantidad: Math.max(0, quantity) };
        }
        return item;
      }),
    );
  }, []);

  const handleRemoveArticle = useCallback((key: string) => {
    setDetalles((prev) => prev.filter((item) => item._key !== key));
  }, []);

  const clearArticles = useCallback(() => {
    setDetalles([]);
  }, []);

  /**
   * Sembrar el caché manualmente (ej. desde una búsqueda por ubicación)
   */
  const seedCache = useCallback((items: any[]) => {
    items.forEach((item) => {
      const sku = normalizeClave(item.clave || item.CLAVE_ARTICULO || item.CLAVE);
      const barcode = normalizeClave(item.codigo_barras || item.CODIGO_BARRAS);
      if (sku && barcode) {
        codesMapping.current.set(barcode, sku);
      }
      if (sku) {
        // Guardar estructura base en caché de productos
        productsCache.current.set(sku, {
          CLAVE: sku,
          NOMBRE: item.descripcion || item.NOMBRE,
          UNIDAD_VENTA: item.umed || item.UNIDAD_VENTA,
          ARTICULO_ID: item.articuloId || item.ARTICULO_ID,
          CONTENIDO_EMPAQUE: item.contenido_empaque || item.CONTENIDO_EMPAQUE || 1,
        });
      }
    });
  }, []);

  /**
   * Seleccionar un artículo de los resultados múltiples
   */
  const selectFromResults = useCallback((articulo: any) => {
    const currentClave = normalizeClave(articulo.CLAVE || articulo.CLAVE_ARTICULO);
    const currentBarcode = normalizeClave(articulo.CODIGO_BARRAS);

    // Guardar en cachés
    codesMapping.current.set(currentClave, currentClave);
    if (currentBarcode) {
      codesMapping.current.set(currentBarcode, currentClave);
    }
    productsCache.current.set(currentClave, articulo);

    const empaque = articulo.CONTENIDO_EMPAQUE && articulo.CONTENIDO_EMPAQUE > 0 ? articulo.CONTENIDO_EMPAQUE : 1;

    setDetalles((prev) => {
      const idx = prev.findIndex((d) => normalizeClave(d.clave) === currentClave);
      if (idx !== -1) {
        const items = [...prev];
        const item = items[idx];
        const updatedItem = { ...item, cantidad: item.cantidad + empaque };
        items.splice(idx, 1);
        return [updatedItem, ...items];
      } else {
        const newItem: ArticuloDetalle = {
          clave: currentClave,
          descripcion: articulo.NOMBRE,
          umed: articulo.UNIDAD_VENTA || null,
          cantidad: empaque,
          _key: `art-${Date.now()}`,
          articuloId: articulo.ARTICULO_ID,
        };
        return [newItem, ...prev];
      }
    });

    Vibration.vibrate(100);
    playSound("add");

    setTimeout(() => {
      flashLine(0);
      scrollToItem(0);
    }, 50);

    setSearchResults([]);
    setSearchQuery("");
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [flashLine, scrollToItem, playSound]);

  const dismissResults = useCallback(() => {
    setSearchResults([]);
    setSearchQuery("");
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  return {
    // State
    searchQuery,
    isSearching,
    detalles,
    lastAddedIndex,
    aggressiveScan,
    searchResults,

    // Refs
    searchInputRef,
    listRef,
    flashAnim,

    // Actions
    setDetalles,
    setSearchQuery,
    setAggressiveScan,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleSetQuantity,
    handleRemoveArticle,
    clearArticles,
    searchAndAddArticle,
    seedCache,
    selectFromResults,
    dismissResults,
  };
}
