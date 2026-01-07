import { ArticuloDetalle } from '@/types/inventarios';
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Vibration } from 'react-native';

export function useArticleScanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [detalles, setDetalles] = useState<ArticuloDetalle[]>([]);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [aggressiveScan, setAggressiveScan] = useState(true);

  const searchInputRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputTime = useRef<number>(0);
  const lastSearchedCode = useRef<string>('');
  const currentInputValue = useRef<string>('');

  const normalizeClave = (clave: string) => {
    return String(clave).trim().toUpperCase().replace(/[''`´]/g, '-');
  };

  const flashLine = useCallback(
    (index: number) => {
      setLastAddedIndex(index);
      flashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setLastAddedIndex(null));
    },
    [flashAnim]
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
      const idx = detalles.findIndex((d) => normalizeClave(d.clave) === normalizedClave);

      if (idx !== -1) {
        setDetalles((prev) => {
          const cur = prev[idx];
          const updatedItem = { ...cur, cantidad: cur.cantidad + 1 };
          const withoutItem = prev.filter((_, i) => i !== idx);
          return [updatedItem, ...withoutItem];
        });
        Vibration.vibrate(50);
        setTimeout(() => {
          flashLine(0);
          scrollToItem(0);
        }, 50);
        return true;
      }
      return false;
    },
    [detalles, flashLine, scrollToItem]
  );

  const searchAndAddArticle = useCallback(
    async (clave: string) => {
      const normalizedClave = normalizeClave(clave);

      if (!normalizedClave) return;
      if (lastSearchedCode.current === normalizedClave) return;

      lastSearchedCode.current = normalizedClave;
      setIsSearching(true);

      try {
        const response = await fetch(`https://krkn.app/api/v1/articulos/${normalizedClave}`);
        const articulo = await response.json();

        if (articulo && articulo.CLAVE) {
          const idx = detalles.findIndex((d) => normalizeClave(d.clave) === normalizedClave);

          if (idx !== -1) {
            Vibration.vibrate(50);
            setDetalles((prev) => {
              const cur = prev[idx];
              const updatedItem = { ...cur, cantidad: cur.cantidad + 1 };
              const withoutItem = prev.filter((_, i) => i !== idx);
              return [updatedItem, ...withoutItem];
            });

            setTimeout(() => {
              flashLine(0);
              scrollToItem(0);
            }, 50);
          } else {
            Vibration.vibrate(100);
            const newItem: ArticuloDetalle = {
              clave: normalizedClave,
              descripcion: articulo.NOMBRE,
              umed: articulo.UMED || null,
              cantidad: 1,
              _key: `art-${Date.now()}`,
            };

            setDetalles((prev) => [newItem, ...prev]);

            setTimeout(() => {
              flashLine(0);
              scrollToItem(0);
            }, 50);
          }

          setSearchQuery('');
          setTimeout(() => {
            lastSearchedCode.current = '';
          }, 500);
        } else {
          Vibration.vibrate([0, 100, 50, 100]);
          Alert.alert('Artículo no encontrado', `El código "${clave}" no existe en la base de datos.`, [
            { text: 'OK' },
          ]);
          lastSearchedCode.current = '';
        }
      } catch (err) {
        Vibration.vibrate([0, 100, 50, 100]);
        Alert.alert('Error', 'No se pudo buscar el artículo. Verifica tu conexión.');
        lastSearchedCode.current = '';
      } finally {
        setIsSearching(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    },
    [detalles, flashLine, scrollToItem]
  );

  const handleSearchSubmit = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    if (isSearching) return;

    setTimeout(() => {
      const rawText = currentInputValue.current.trim().toUpperCase();
      const currentText = rawText.replace(/[^A-Z0-9]/g, '-');

      if (!currentText) return;

      setSearchQuery('');
      currentInputValue.current = '';
      searchAndAddArticle(currentText);
    }, 100);
  }, [isSearching, searchAndAddArticle]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      currentInputValue.current = text;

      if (aggressiveScan) return;

      if (!text.trim() || isSearching) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        if (currentInputValue.current.trim()) {
          handleSearchSubmit();
        }
      }, 1000);
    },
    [aggressiveScan, isSearching, handleSearchSubmit]
  );

  const handleUpdateQuantity = useCallback((key: string, delta: number) => {
    setDetalles((prev) =>
      prev
        .map((item) => {
          if (item._key === key) {
            const newCantidad = item.cantidad + delta;
            return newCantidad > 0 ? { ...item, cantidad: newCantidad } : null;
          }
          return item;
        })
        .filter((item): item is ArticuloDetalle => item !== null)
    );
  }, []);

  const handleRemoveArticle = useCallback((key: string) => {
    setDetalles((prev) => prev.filter((item) => item._key !== key));
  }, []);

  const clearArticles = useCallback(() => {
    setDetalles([]);
  }, []);

  return {
    // State
    searchQuery,
    isSearching,
    detalles,
    lastAddedIndex,
    aggressiveScan,
    
    // Refs
    searchInputRef,
    listRef,
    flashAnim,
    
    // Actions
    setSearchQuery,
    setAggressiveScan,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleRemoveArticle,
    clearArticles,
    searchAndAddArticle,
  };
}
