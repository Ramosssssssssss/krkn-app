import ArticleCard from '@/components/inventarios/ArticleCard';
import ProductSearchBar from '@/components/inventarios/ProductSearchBar';
import ScanHeader from '@/components/inventarios/ScanHeader';
import { useTheme } from '@/context/theme-context';
import { useArticleScanner } from '@/hooks/use-article-scanner';
import { useSucursalesAlmacenes } from '@/hooks/use-sucursales-almacenes';
import { MOVEMENT_COLORS } from '@/types/inventarios';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const ENTRADAS_COLOR = MOVEMENT_COLORS.entrada;

export default function CrearEntradaScreen() {
  const { isDark } = useTheme();
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E8E8E8',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
    accentBg: isDark ? 'rgba(157,78,221,0.12)' : 'rgba(157,78,221,0.08)',
  };

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

  const {
    searchQuery,
    isSearching,
    detalles,
    lastAddedIndex,
    aggressiveScan,
    searchInputRef,
    listRef,
    flashAnim,
    setAggressiveScan,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleRemoveArticle,
    clearArticles,
  } = useArticleScanner();

  const sucursalNombre = sucursales.find((s) => s.id === selectedSucursal)?.nombre || '';
  const almacenNombre = almacenesFiltrados.find((a) => a.id === selectedAlmacen)?.nombre || '';

  useEffect(() => {
    if (selectedSucursal && selectedAlmacen) {
      setShowLocationModal(false);
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [selectedSucursal, selectedAlmacen]);

  const totalArticulos = detalles.length;
  const totalUnidades = detalles.reduce((sum, item) => sum + item.cantidad, 0);

  const handleSave = () => {
    if (!selectedSucursal || !selectedAlmacen || detalles.length === 0) return;
    setShowSummaryModal(true);
  };

  const handleConfirmSave = () => {
    Alert.alert('Guardado', 'Entrada guardada exitosamente', [
      {
        text: 'OK',
        onPress: () => {
          setShowSummaryModal(false);
          clearArticles();
          router.back();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={ENTRADAS_COLOR} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {retryCount > 0 ? `Reintentando... (${retryCount}/3)` : 'Cargando sucursales...'}
        </Text>
      </View>
    );
  }

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

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <ScanHeader color={ENTRADAS_COLOR} aggressiveScan={aggressiveScan} onToggleScan={setAggressiveScan} />
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
        color={ENTRADAS_COLOR}
      />

      {selectedSucursal && selectedAlmacen && (
        <TouchableOpacity
          style={[styles.locationChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setShowLocationModal(true)}
        >
          <Ionicons name="location" size={14} color={ENTRADAS_COLOR} />
          <Text style={[styles.locationChipText, { color: theme.text }]} numberOfLines={1}>
            {sucursalNombre} → {almacenNombre}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
      )}

      {detalles.length > 0 ? (
        <>
          <View style={[styles.articlesHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.articlesHeaderTitle, { color: theme.text }]}>Artículos ({totalArticulos})</Text>
            <Text style={[styles.articlesHeaderTotal, { color: theme.textSecondary }]}>
              {totalUnidades} unidades
            </Text>
          </View>

          <FlatList
            ref={listRef}
            data={detalles}
            keyExtractor={(item) => item._key}
            renderItem={({ item, index }) => (
              <ArticleCard
                item={item}
                index={index}
                color={ENTRADAS_COLOR}
                isFlashing={lastAddedIndex === index}
                flashAnim={flashAnim}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveArticle}
              />
            )}
            style={styles.articlesList}
            contentContainerStyle={styles.articlesListContent}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${ENTRADAS_COLOR}15` }]}>
            <Ionicons name="scan-outline" size={36} color={ENTRADAS_COLOR} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
            {aggressiveScan ? 'Listo para escanear' : 'Busca artículos'}
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            {aggressiveScan ? 'Escanea códigos de barras con tu PDA' : 'Escribe el código y presiona agregar'}
          </Text>
        </View>
      )}

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
            (!selectedSucursal || !selectedAlmacen || detalles.length === 0) && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={!selectedSucursal || !selectedAlmacen || detalles.length === 0}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de ubicación */}
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Seleccionar ubicación</Text>
              {selectedSucursal && selectedAlmacen && (
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: theme.accentBg }]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Sucursal</Text>
              {sucursales.map((suc) => (
                <TouchableOpacity
                  key={suc.id}
                  style={[
                    styles.locationOption,
                    {
                      backgroundColor: theme.bg,
                      borderColor: selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.border,
                    },
                    selectedSucursal === suc.id && { borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedSucursal(suc.id)}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.locationOptionText,
                      { color: selectedSucursal === suc.id ? ENTRADAS_COLOR : theme.text },
                    ]}
                  >
                    {suc.nombre}
                  </Text>
                  {selectedSucursal === suc.id && <Ionicons name="checkmark-circle" size={20} color={ENTRADAS_COLOR} />}
                </TouchableOpacity>
              ))}

              {selectedSucursal && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Almacén</Text>
                  {almacenesFiltrados.map((alm) => (
                    <TouchableOpacity
                      key={alm.id}
                      style={[
                        styles.locationOption,
                        {
                          backgroundColor: theme.bg,
                          borderColor: selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.border,
                        },
                        selectedAlmacen === alm.id && { borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedAlmacen(alm.id)}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={20}
                        color={selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.locationOptionText,
                          { color: selectedAlmacen === alm.id ? ENTRADAS_COLOR : theme.text },
                        ]}
                      >
                        {alm.nombre}
                      </Text>
                      {selectedAlmacen === alm.id && <Ionicons name="checkmark-circle" size={20} color={ENTRADAS_COLOR} />}
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

      {/* Modal de resumen */}
      <Modal visible={showSummaryModal} transparent animationType="fade" onRequestClose={() => setShowSummaryModal(false)}>
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
                  {new Date().toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
