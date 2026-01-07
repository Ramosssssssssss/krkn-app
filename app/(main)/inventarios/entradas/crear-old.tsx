import { useTheme } from '@/context/theme-context';
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
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Color principal para Entradas (verde)
const ENTRADAS_COLOR = '#22C55E';

interface ArticuloDetalle {
  clave: string;
  descripcion: string;
  umed: string | null;
  cantidad: number;
  _key: string;
}

export default function CrearEntradaScreen() {
  const { isDark } = useTheme();
  
  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E8E8E8',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
  };
  
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
  const zapAnim = useRef(new Animated.Value(1)).current;
  const zapFlashAnim = useRef(new Animated.Value(0)).current;
  const [showZapFlash, setShowZapFlash] = useState(false);
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
        const newQty = Math.max(1, d.cantidad + delta);
        return { ...d, cantidad: newQty };
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
    Alert.alert('Éxito', `Entrada guardada con ${totalArticulos} artículos (${totalUnidades} unidades)`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
    setShowSummaryModal(false);
  };

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, d) => sum + d.cantidad, 0);

  // Loading State
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {retryCount > 0 ? `Reintentando... (${retryCount}/3)` : 'Cargando sucursales...'}
        </Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <View style={[styles.errorIcon, { backgroundColor: 'rgba(183, 28, 28, 0.15)' }]}>
          <Ionicons name="cloud-offline-outline" size={40} color="#C62828" />
        </View>
        <Text style={[styles.errorTitle, { color: theme.text }]}>Error de conexión</Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.accent }]} onPress={refresh}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderArticuloItem = ({ item, index }: { item: ArticuloDetalle; index: number }) => {
    const isFlashing = lastAddedIndex === index;
    
    const renderRightActions = () => (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionEdit]}
          onPress={() => {
            // Aqui puedes abrir un modal de edición
            Alert.alert('Editar', `Editar ${item.clave}`);
          }}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.swipeActionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionDelete]}
          onPress={() => handleRemoveArticle(item._key)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.swipeActionText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    );
    
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Animated.View 
          style={[
            styles.articleItem,
            { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: isFlashing ? flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.5]
              }) : 1,
            }
          ]}
        >
          <View style={styles.articleInfo}>
            <Text style={[styles.articleClave, { color: ENTRADAS_COLOR }]}>{item.clave}</Text>
            <Text style={[styles.articleDesc, { color: theme.text }]} numberOfLines={2}>
              {item.descripcion}
            </Text>
            {item.umed && (
              <Text style={[styles.articleUmed, { color: theme.textSecondary }]}>{item.umed}</Text>
            )}
          </View>
          
          <View style={styles.articleActions}>
            <View style={styles.quantityControl}>
              <TouchableOpacity 
                style={[styles.qtyBtn, { backgroundColor: theme.border }]}
                onPress={() => handleUpdateQuantity(item._key, -1)}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.qtyText, { color: theme.text }]}>{item.cantidad}</Text>
              <TouchableOpacity 
                style={[styles.qtyBtn, { backgroundColor: ENTRADAS_COLOR }]}
                onPress={() => handleUpdateQuantity(item._key, 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Swipeable>
    );
  };

  const handleZapPress = () => {
    // Mostrar destello
    setShowZapFlash(true);
    zapFlashAnim.setValue(0);
    
    // Animación del destello
    Animated.sequence([
      Animated.timing(zapFlashAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(zapFlashAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setShowZapFlash(false));
    
    // Animación de pulso del icono
    Animated.sequence([
      Animated.timing(zapAnim, {
        toValue: 1.4,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(zapAnim, {
        toValue: 0.85,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(zapAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Vibración corta
    Vibration.vibrate(30);
    
    setAggressiveScan(!aggressiveScan);
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Custom Header con toggle de escaneo */}
      <Stack.Screen 
        options={{
          headerRight: () => (
            <TouchableOpacity 
              style={[
                styles.headerScanToggle,
                { 
                  borderColor: aggressiveScan ? ENTRADAS_COLOR : theme.border,
                  backgroundColor: 'transparent'
                }
              ]}
              onPress={handleZapPress}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: zapAnim }] }}>
                <Ionicons 
                  name={aggressiveScan ? "flash" : "flash-outline"} 
                  size={16} 
                  color={aggressiveScan ? ENTRADAS_COLOR : theme.textSecondary} 
                />
              </Animated.View>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Barra de búsqueda compacta en la parte superior */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.bg, borderColor: aggressiveScan ? ENTRADAS_COLOR : theme.border }]}>
          <Ionicons name="barcode-outline" size={18} color={aggressiveScan ? ENTRADAS_COLOR : theme.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={aggressiveScan ? "Esperando escaneo..." : "Buscar artículo..."}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            showSoftInputOnFocus={!aggressiveScan}
            blurOnSubmit={false}
            selectTextOnFocus
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={ENTRADAS_COLOR} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : aggressiveScan && (
            <View style={[styles.scanIndicator, { backgroundColor: ENTRADAS_COLOR }]} />
          )}
          

        </View>
        
        {!aggressiveScan && searchQuery.trim() && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: ENTRADAS_COLOR }]}
            onPress={handleSearchSubmit}
            disabled={isSearching}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info de ubicación flotante (compacta) */}
      <TouchableOpacity 
        style={[styles.locationChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setShowLocationModal(true)}
      >
        <Ionicons name="location" size={14} color={ENTRADAS_COLOR} />
        <Text style={[styles.locationChipText, { color: theme.text }]} numberOfLines={1}>
          {selectedSucursal && selectedAlmacen 
            ? `${sucursalNombre} · ${almacenNombre}`
            : 'Seleccionar ubicación'
          }
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
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
            <View style={[styles.articlesHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.articlesHeaderTitle, { color: theme.text }]}>
                Artículos ({totalArticulos})
              </Text>
              <Text style={[styles.articlesHeaderTotal, { color: theme.textSecondary }]}>
                {totalUnidades} unidades
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${ENTRADAS_COLOR}15` }]}>
            <Ionicons name="scan-outline" size={48} color={ENTRADAS_COLOR} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
            {aggressiveScan ? 'Listo para escanear' : 'Busca artículos'}
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            {aggressiveScan 
              ? 'Escanea códigos de barras con tu PDA'
              : 'Escribe el código y presiona agregar'
            }
          </Text>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.primaryButton, 
            { backgroundColor: ENTRADAS_COLOR },
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
          <View style={[styles.locationModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Seleccionar Ubicación</Text>
              {selectedSucursal && selectedAlmacen && (
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.locationModalBody}>
              {/* Sucursal */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Sucursal</Text>
                {sucursales.map((suc) => (
                  <TouchableOpacity
                    key={suc.id}
                    style={[
                      styles.locationOption,
                      { backgroundColor: theme.bg, borderColor: selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.border },
                      selectedSucursal === suc.id && { borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedSucursal(suc.id)}
                  >
                    <Ionicons 
                      name="business-outline" 
                      size={20} 
                      color={selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.textSecondary} 
                    />
                    <Text style={[styles.locationOptionText, { color: selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.text }]}>
                      {suc.nombre}
                    </Text>
                    {selectedSucursal === suc.id && (
                      <Ionicons name="checkmark-circle" size={20} color={ENTRADAS_COLOR} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Almacén */}
              {selectedSucursal && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Almacén</Text>
                  {almacenesFiltrados.map((alm) => (
                    <TouchableOpacity
                      key={alm.id}
                      style={[
                        styles.locationOption,
                        { backgroundColor: theme.bg, borderColor: selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.border },
                        selectedAlmacen === alm.id && { borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedAlmacen(alm.id)}
                    >
                      <Ionicons 
                        name="cube-outline" 
                        size={20} 
                        color={selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.textSecondary} 
                      />
                      <Text style={[styles.locationOptionText, { color: selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.text }]}>
                        {alm.nombre}
                      </Text>
                      {selectedAlmacen === alm.id && (
                        <Ionicons name="checkmark-circle" size={20} color={ENTRADAS_COLOR} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {selectedSucursal && selectedAlmacen && (
              <View style={[styles.locationModalFooter, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.locationConfirmBtn, { backgroundColor: ENTRADAS_COLOR }]}
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
          <View style={[styles.summaryModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.summaryModalHeader, { backgroundColor: ENTRADAS_COLOR }]}>
              <Ionicons name="document-text" size={Platform.OS === 'ios' ? 24 : 20} color="#fff" />
              <Text style={styles.summaryModalTitle}>Resumen de Entrada</Text>
            </View>
            
            <View style={styles.summaryModalBody}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Sucursal</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{sucursalNombre}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Almacén</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{almacenNombre}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Fecha</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Artículos</Text>
                <Text style={[styles.summaryValueBig, { color: ENTRADAS_COLOR }]}>{totalArticulos}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Unidades totales</Text>
                <Text style={[styles.summaryValueBig, { color: ENTRADAS_COLOR }]}>{totalUnidades}</Text>
              </View>
            </View>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryCancelBtn, { borderColor: theme.border }]}
                onPress={() => setShowSummaryModal(false)}
              >
                <Text style={[styles.summaryCancelBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.summaryBtn, styles.summaryConfirmBtn, { backgroundColor: ENTRADAS_COLOR }]}
                onPress={handleConfirmSave}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.summaryConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Destello del Zap */}
      {showZapFlash && (
        <Animated.View 
          pointerEvents="none"
          style={[
            styles.zapFlashOverlay,
            { opacity: zapFlashAnim }
          ]}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  zapFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    zIndex: 9999,
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
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header Scan Toggle
  headerScanToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  headerScanIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Bar compacta
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  locationChipText: {
    fontSize: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  articlesHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  articlesHeaderTotal: {
    fontSize: 11,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  articleInfo: {
    flex: 1,
    marginRight: 10,
  },
  articleClave: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  articleUmed: {
    fontSize: 10,
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
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },

  // Swipe Actions
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginRight: 16,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '100%',
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  swipeActionEdit: {
    backgroundColor: '#3B82F6',
  },
  swipeActionDelete: {
    backgroundColor: '#EF4444',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {},
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationModalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  locationOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  locationModalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
  },
  locationConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  locationConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary Modal
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryModalHeader: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  summaryModalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryModalBody: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValueBig: {
    fontSize: 17,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryModalFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 20,
    gap: 10,
  },
  summaryBtn: {
    flex: 1,
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  summaryConfirmBtn: {},
  summaryConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
