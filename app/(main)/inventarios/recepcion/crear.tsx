import ArticleCard from '@/components/inventarios/ArticleCard';
import ProductSearchBar from '@/components/inventarios/ProductSearchBar';
import ScanHeader from '@/components/inventarios/ScanHeader';
import { useThemeColors } from '@/context/theme-context';
import { useSucursalesAlmacenes } from '@/hooks/use-sucursales-almacenes';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ArticuloDetalle {
  clave: string;
  descripcion: string;
  umed: string | null;
  cantidad: number;
  _key: string;
}

export default function CrearRecepcionScreen() {
  const colors = useThemeColors();
  
  // Modal de ubicación se muestra al inicio si no hay ubicación seleccionada
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [detalles, setDetalles] = useState<ArticuloDetalle[]>([]);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);
  const [aggressiveScan, setAggressiveScan] = useState(true);
  
  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputTime = useRef<number>(0);
  const lastSearchedCode = useRef<string>(''); // Evitar búsquedas duplicadas
  const currentInputValue = useRef<string>(''); // Valor actual del input (para leer en submit)
  
  const {
    sucursales,
    almacenesFiltrados,
    selectedSucursal,
    selectedAlmacen,
    setSelectedSucursal,
    setSelectedAlmacen,
    isLoading,
    error,
    retryCount,
    refresh,
  } = useSucursalesAlmacenes();

  // Obtener nombres seleccionados
  const sucursalNombre = sucursales.find(s => s.id === selectedSucursal)?.nombre || '';
  const almacenNombre = almacenesFiltrados.find(a => a.id === selectedAlmacen)?.nombre || '';

  // Cerrar modal de ubicación cuando ambos estén seleccionados y enfocar input
  useEffect(() => {
    if (selectedSucursal && selectedAlmacen) {
      setShowLocationModal(false);
      // Auto-focus en el input de búsqueda cuando se cierra el modal
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [selectedSucursal, selectedAlmacen]);

  // Normalizar clave para comparaciones
  // También convierte apóstrofes a guiones (problema común de layout de teclado en scanners)
  const normalizeClave = (clave: string) => {
    return String(clave)
      .trim()
      .toUpperCase()
      .replace(/[''`´]/g, '-'); // Convertir apóstrofes y acentos a guiones
  };

  // Animación de flash en el item agregado
  const flashLine = (index: number) => {
    setLastAddedIndex(index);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setLastAddedIndex(null);
    });
  };

  // Scroll al item
  const scrollToItem = (index: number) => {
    if (listRef.current && detalles.length > 0) {
      listRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }
  };

  // Agregar artículo existente (sin fetch)
  const addExistingArticle = useCallback((clave: string) => {
    const normalizedInput = normalizeClave(clave);
    
    setDetalles(prev => {
      const idx = prev.findIndex(d => normalizeClave(d.clave) === normalizedInput);
      
      if (idx !== -1) {
        Vibration.vibrate(50);
        const cur = prev[idx];
        const updatedItem = { ...cur, cantidad: cur.cantidad + 1 };
        const withoutItem = prev.filter((_, i) => i !== idx);
        const updated = [updatedItem, ...withoutItem];
        
        setTimeout(() => {
          flashLine(0);
          scrollToItem(0);
        }, 50);
        
        return updated;
      }
      return prev;
    });
    
    setSearchQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Buscar y agregar artículo
  const searchAndAddArticle = useCallback(async (clave: string) => {
    if (!clave.trim()) return;
    
    const normalizedInput = normalizeClave(clave);
    
    // PRIMERO: Verificar si ya existe localmente - agregar sin fetch
    const existingIdx = detalles.findIndex(d => normalizeClave(d.clave) === normalizedInput);
    if (existingIdx !== -1) {
      addExistingArticle(clave);
      return;
    }
    
    // Si no existe, buscar en el API
    setIsSearching(true);
    
    try {
      const fetchWithRetry = async (url: string, retries = 5) => {
        let lastErr;
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP error');
            return res;
          } catch (err) {
            lastErr = err;
            if (i < retries - 1) {
              await new Promise(r => setTimeout(r, 300 * (i + 1)));
            }
          }
        }
        throw lastErr;
      };

      const response = await fetchWithRetry(
        `https://fyttsanet.com/backend/krkn/buscar-articulo-recibo.php?q=${encodeURIComponent(clave)}`
      );
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const articulo = data.data[0];
        const normalizedClave = normalizeClave(articulo.CLAVE_ARTICULO);

        setDetalles(prev => {
          // Doble verificación por si acaso
          const idx = prev.findIndex(d => normalizeClave(d.clave) === normalizedClave);

          if (idx !== -1) {
            Vibration.vibrate(50);
            const cur = prev[idx];
            const updatedItem = { ...cur, cantidad: cur.cantidad + 1 };
            const withoutItem = prev.filter((_, i) => i !== idx);
            const updated = [updatedItem, ...withoutItem];
            
            setTimeout(() => {
              flashLine(0);
              scrollToItem(0);
            }, 50);
            
            return updated;
          } else {
            Vibration.vibrate(100);
            const newItem: ArticuloDetalle = {
              clave: normalizedClave,
              descripcion: articulo.NOMBRE,
              umed: articulo.UMED || null,
              cantidad: 1,
              _key: `art-${Date.now()}`,
            };
            
            const updated = [newItem, ...prev];
            
            setTimeout(() => {
              flashLine(0);
              scrollToItem(0);
            }, 50);
            
            return updated;
          }
        });

        setSearchQuery('');
        // Limpiar para permitir escanear el mismo código de nuevo
        setTimeout(() => { lastSearchedCode.current = ''; }, 500);
        
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
        Alert.alert('Artículo no encontrado', `El código "${clave}" no existe en la base de datos.`, [{ text: 'OK' }]);
        lastSearchedCode.current = ''; // Permitir reintentar
      }
    } catch (err) {
      Vibration.vibrate([0, 100, 50, 100]);
      Alert.alert('Error', 'No se pudo buscar el artículo. Verifica tu conexión.');
      lastSearchedCode.current = ''; // Permitir reintentar
    } finally {
      setIsSearching(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [detalles, addExistingArticle]);

  const handleSearchSubmit = () => {
    // Cancelar cualquier debounce pendiente
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    
    // No buscar si ya está buscando
    if (isSearching) return;
    
    // Delay para esperar que lleguen todos los caracteres
    // Leemos del REF, no del state (el state puede estar desactualizado)
    setTimeout(() => {
      const rawText = currentInputValue.current.trim().toUpperCase();
      
      // Normalización AGRESIVA: cualquier carácter que NO sea letra o número = guión
      // Esto arregla cualquier problema de layout de teclado del scanner
      const currentText = rawText.replace(/[^A-Z0-9]/g, '-');
      
      console.log('Raw:', rawText, '-> Normalized:', currentText);
      
      if (!currentText) return;
      
      // Limpiar input inmediatamente
      setSearchQuery('');
      currentInputValue.current = '';
      
      searchAndAddArticle(currentText);
    }, 100); // 100ms para asegurar que lleguen todos los caracteres
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    currentInputValue.current = text; // Guardar en ref para leer en submit
    
    // En modo aggressive NO hacemos auto-búsqueda, esperamos el Enter del scanner
    if (aggressiveScan) {
      return;
    }
    
    // Modo manual: auto-buscar con debounce largo (para escritura manual)
    if (!text.trim() || isSearching) {
      return;
    }
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      if (isSearching) return;
      
      const trimmedText = text.trim().toUpperCase();
      
      if (trimmedText === lastSearchedCode.current) {
        setSearchQuery('');
        return;
      }
      
      if (trimmedText.length >= 3) {
        lastSearchedCode.current = trimmedText;
        searchAndAddArticle(trimmedText);
      }
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleRemoveArticle = (key: string) => {
    setDetalles(prev => prev.filter(d => d._key !== key));
  };

  const handleUpdateQuantity = (key: string, delta: number) => {
    setDetalles(prev => prev.map(d => {
      if (d._key === key) {
        const newQty = d.cantidad + delta;
        return newQty > 0 ? { ...d, cantidad: newQty } : d;
      }
      return d;
    }));
  };

  const handleSetQuantity = (key: string, qty: number) => {
    setDetalles(prev => prev.map(d => {
      if (d._key === key) {
        return { ...d, cantidad: Math.max(1, qty) };
      }
      return d;
    }));
  };

  const handleSave = () => {
    if (!selectedSucursal || !selectedAlmacen || detalles.length === 0) return;
    setShowSummaryModal(true);
  };

  const handleConfirmSave = () => {
    // TODO: Implementar guardado real
    Alert.alert('Éxito', `Recepción guardada con ${totalArticulos} artículos (${totalUnidades} unidades)`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
    setShowSummaryModal(false);
  };

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, d) => sum + d.cantidad, 0);

  // Loading State
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {retryCount > 0 ? `Reintentando... (${retryCount}/3)` : 'Cargando sucursales...'}
        </Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: 'rgba(183, 28, 28, 0.15)' }]}>
          <Ionicons name="cloud-offline-outline" size={40} color="#C62828" />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Error de conexión</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={refresh}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderArticuloItem = ({ item, index }: { item: ArticuloDetalle; index: number }) => (
    <ArticleCard
      item={item}
      index={index}
      color={colors.accent}
      isFlashing={lastAddedIndex === index}
      flashAnim={flashAnim}
      onUpdateQuantity={handleUpdateQuantity}
      onSetQuantity={handleSetQuantity}
      onRemove={handleRemoveArticle}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header con toggle de escaneo */}
      <Stack.Screen 
        options={{
          headerTitle: 'Crear Recepción',
          headerRight: () => (
            <ScanHeader 
              color={colors.accent} 
              aggressiveScan={aggressiveScan} 
              onToggleScan={setAggressiveScan} 
            />
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
        color={colors.accent}
      />

      {/* Info de ubicación flotante (compacta) */}
      <TouchableOpacity 
        style={[styles.locationChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLocationModal(true)}
      >
        <Ionicons name="location" size={14} color={colors.accent} />
        <Text style={[styles.locationChipText, { color: colors.text }]} numberOfLines={1}>
          {selectedSucursal && selectedAlmacen 
            ? `${sucursalNombre} · ${almacenNombre}`
            : 'Seleccionar ubicación'
          }
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Lista de artículos */}
      {detalles.length > 0 ? (
        <FlatList
          ref={listRef}
          data={detalles}
          keyExtractor={item => item._key}
          renderItem={renderArticuloItem}
          style={styles.articlesList}
          contentContainerStyle={styles.articlesListContent}
          ListHeaderComponent={
            <View style={[styles.articlesHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.articlesHeaderTitle, { color: colors.text }]}>
                Artículos ({totalArticulos})
              </Text>
              <Text style={[styles.articlesHeaderTotal, { color: colors.textSecondary }]}>
                {totalUnidades} unidades
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.accent}15` }]}>
            <Ionicons name="scan-outline" size={48} color={colors.accent} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {aggressiveScan ? 'Listo para escanear' : 'Busca artículos'}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {aggressiveScan 
              ? 'Escanea códigos de barras con tu PDA'
              : 'Escribe el código y presiona agregar'
            }
          </Text>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.primaryButton, 
            { backgroundColor: colors.accent },
            (!selectedSucursal || !selectedAlmacen || detalles.length === 0) && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={!selectedSucursal || !selectedAlmacen || detalles.length === 0}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE UBICACIÓN */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (selectedSucursal && selectedAlmacen) {
            setShowLocationModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.locationModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Ubicación</Text>
              {selectedSucursal && selectedAlmacen && (
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.locationModalBody}>
              {/* Sucursal */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sucursal</Text>
                {sucursales.map((suc) => (
                  <TouchableOpacity
                    key={suc.id}
                    style={[
                      styles.locationOption,
                      { backgroundColor: colors.background, borderColor: selectedSucursal === suc.id ? colors.accent : colors.border },
                      selectedSucursal === suc.id && { borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedSucursal(suc.id)}
                  >
                    <Ionicons 
                      name="business-outline" 
                      size={20} 
                      color={selectedSucursal === suc.id ? colors.accent : colors.textSecondary} 
                    />
                    <Text style={[styles.locationOptionText, { color: selectedSucursal === suc.id ? colors.accent : colors.text }]}>
                      {suc.nombre}
                    </Text>
                    {selectedSucursal === suc.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Almacén */}
              {selectedSucursal && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Almacén</Text>
                  {almacenesFiltrados.map((alm) => (
                    <TouchableOpacity
                      key={alm.id}
                      style={[
                        styles.locationOption,
                        { backgroundColor: colors.background, borderColor: selectedAlmacen === alm.id ? colors.accent : colors.border },
                        selectedAlmacen === alm.id && { borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedAlmacen(alm.id)}
                    >
                      <Ionicons 
                        name="cube-outline" 
                        size={20} 
                        color={selectedAlmacen === alm.id ? colors.accent : colors.textSecondary} 
                      />
                      <Text style={[styles.locationOptionText, { color: selectedAlmacen === alm.id ? colors.accent : colors.text }]}>
                        {alm.nombre}
                      </Text>
                      {selectedAlmacen === alm.id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {selectedSucursal && selectedAlmacen && (
              <View style={[styles.locationModalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.locationConfirmBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.locationConfirmBtnText}>Confirmar ubicación</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL DE RESUMEN */}
      <Modal
        visible={showSummaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <View style={styles.summaryModalOverlay}>
          <View style={[styles.summaryModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryModalHeader, { backgroundColor: colors.accent }]}>
              <Ionicons name="document-text" size={Platform.OS === 'ios' ? 24 : 20} color="#fff" />
              <Text style={styles.summaryModalTitle}>Resumen de Recepción</Text>
            </View>
            
            <View style={styles.summaryModalBody}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sucursal</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{sucursalNombre}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Almacén</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{almacenNombre}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fecha</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Artículos</Text>
                <Text style={[styles.summaryValueBig, { color: colors.accent }]}>{totalArticulos}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Unidades totales</Text>
                <Text style={[styles.summaryValueBig, { color: colors.accent }]}>{totalUnidades}</Text>
              </View>
            </View>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowSummaryModal(false)}
              >
                <Text style={[styles.summaryCancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryConfirmBtn, { backgroundColor: colors.accent }]}
                onPress={handleConfirmSave}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.summaryConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Header Scan Toggle
  headerScanToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },

  // Search Bar compacta
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  scanIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Location Chip compacto
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: width * 0.6,
  },

  disabledButton: {
    opacity: 0.5,
  },

  // Articles List
  articlesList: {
    flex: 1,
  },
  articlesListContent: {
    paddingBottom: 12,
  },
  articlesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  articlesHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  articlesHeaderTotal: {
    fontSize: 12,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  articleInfo: {
    flex: 1,
    marginRight: 10,
  },
  articleClave: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  articleUmed: {
    fontSize: 11,
    marginTop: 2,
  },
  articleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 6,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 36,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {},
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  locationModalBody: {
    padding: 16,
    maxHeight: height * 0.5,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 2,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  locationOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  locationModalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  locationConfirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Summary Modal
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 24 : 16,
  },
  summaryModalContent: {
    width: '100%',
    maxWidth: Platform.OS === 'ios' ? 340 : 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryModalHeader: {
    padding: Platform.OS === 'ios' ? 20 : 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  summaryModalTitle: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 17 : 15,
    fontWeight: '600',
  },
  summaryModalBody: {
    padding: Platform.OS === 'ios' ? 20 : 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  summaryLabel: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
  },
  summaryValue: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    fontWeight: '600',
  },
  summaryValueBig: {
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    fontWeight: '700',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  summaryModalFooter: {
    flexDirection: 'row',
    padding: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 44,
    gap: 10,
  },
  summaryBtn: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryCancelBtn: {
    borderWidth: 1,
  },
  summaryCancelBtnText: {
    fontSize: Platform.OS === 'ios' ? 15 : 13,
    fontWeight: '600',
  },
  summaryConfirmBtn: {},
  summaryConfirmBtnText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 15 : 13,
    fontWeight: '600',
  },
});
