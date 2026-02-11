import CreateWarehouseModal from '@/components/catalogos/CreateWarehouseModal'; // Assuming this exists or I should comment it out if not
import { useTheme, useThemeColors } from '@/context/theme-context';
import { useSucursalesAlmacenes } from '@/hooks/use-sucursales-almacenes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_COLUMNS = 2;
const GRID_ITEM_WIDTH = (width - 32 - GRID_GAP) / GRID_COLUMNS;

// Placeholders random images
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
  'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400',
  'https://images.unsplash.com/photo-1587293855526-d72af946a941?w=400',
  'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400',
  'https://images.unsplash.com/photo-1601598851547-4302969d0614?w=400',
  'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400'
];

interface AlmacenRich {
  id: number;
  nombre: string;
  codigo: string;
  tipo: string;
  ubicacion: string;
  capacidad: number;
  ocupacion: number;
  encargado: string;
  imagen: string;
  sucursalId: number;
}

type ViewMode = 'list' | 'grid';

export default function BuscarAlmacenesScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSucursalFilter, setSelectedSucursalFilter] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Hook de datos reales
  const {
    sucursales,
    almacenes,
    isLoading,
    error,
    refresh,
  } = useSucursalesAlmacenes();

  // Transformar datos reales a estructura visual rica (con mocks para lo faltante)
  const richWarehouses: AlmacenRich[] = useMemo(() => {
    return almacenes.map((alm) => {
      // Generar datos pseudo-aleatorios consistentes basados en el ID
      const randomSeed = alm.id;
      const imgIndex = randomSeed % PLACEHOLDER_IMAGES.length;
      const capacidad = (randomSeed * 100) % 5000 + 1000;
      const ocupacion = (randomSeed * 53) % 100;
      const sucursalNombre = sucursales.find(s => s.id === alm.sucursalId)?.nombre || 'Sin Sucursal';

      return {
        id: alm.id,
        nombre: alm.nombre,
        codigo: `ALM-${String(alm.id).padStart(3, '0')}`,
        tipo: alm.usoElemento || 'Almacenamiento',
        ubicacion: sucursalNombre,
        capacidad,
        ocupacion,
        encargado: 'Sin asignar', // Placeholder
        imagen: PLACEHOLDER_IMAGES[imgIndex],
        sucursalId: alm.sucursalId,
      };
    });
  }, [almacenes, sucursales]);

  // Filtrado
  const filteredWarehouses = useMemo(() => {
    return richWarehouses.filter((wh) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' ||
        wh.nombre.toLowerCase().includes(query) ||
        wh.codigo.toLowerCase().includes(query) ||
        wh.ubicacion.toLowerCase().includes(query);

      const matchesFilter = selectedSucursalFilter === null || 
        wh.sucursalId === selectedSucursalFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedSucursalFilter, richWarehouses]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refresh();
  }, [refresh]);

  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(prev => prev === 'list' ? 'grid' : 'list');
  };

  const getOccupancyColor = (level: number) => {
    if (level >= 90) return colors.error;
    if (level >= 70) return colors.warning;
    return colors.success;
  };

  // List View Item
  const renderListItem = ({ item }: { item: AlmacenRich }) => {
    const occColor = getOccupancyColor(item.ocupacion);

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.productRow} activeOpacity={0.7} onPress={() => Haptics.selectionAsync()}>
          <Image source={{ uri: item.imagen }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={[styles.productSku, { color: colors.textTertiary }]}>
              {item.codigo}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Tipo</Text>
            <Text style={[styles.detailValue, { color: colors.textSecondary }]}>{item.tipo}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Ubicación</Text>
            <Text style={[styles.detailValue, { color: colors.textSecondary }]} numberOfLines={1}>{item.ubicacion}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Ocupación</Text>
            <Text style={[styles.detailValue, { color: occColor, fontWeight: '700' }]}>{item.ocupacion}%</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.progressBarFill, { width: `${item.ocupacion}%`, backgroundColor: occColor }]} />
          </View>
          <Text style={[styles.capacityText, { color: colors.textTertiary }]}>
            {Math.round(item.capacidad * item.ocupacion / 100)} / {item.capacidad} m³
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Editar</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="map-outline" size={18} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.accent }]}>Ver Mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Grid View Item
  const renderGridItem = ({ item, index }: { item: AlmacenRich; index: number }) => {
    const occColor = getOccupancyColor(item.ocupacion);
    const isLeftColumn = index % 2 === 0;

    return (
      <TouchableOpacity 
        style={[
          styles.gridCard, 
          { 
            backgroundColor: colors.surface,
            marginRight: isLeftColumn ? GRID_GAP : 0,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => Haptics.selectionAsync()}
      >
        <Image source={{ uri: item.imagen }} style={styles.gridImage} />
        
        <View style={[styles.gridBadge, { backgroundColor: `${occColor}20` }]}>
          <Text style={[styles.gridBadgeText, { color: occColor }]}>{item.ocupacion}%</Text>
        </View>

        <View style={styles.gridInfo}>
          <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={[styles.gridSku, { color: colors.textTertiary }]}>
            {item.codigo}
          </Text>
          <View style={styles.gridMeta}>
            <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.gridLocation, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.ubicacion}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Error State
  if (error && !almacenes.length) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: `${colors.error}15` }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Error de conexión</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={refresh}
        >
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar almacenes..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={toggleViewMode}
        >
          <Ionicons 
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
            size={20} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: colors.accent }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sucursal Filters (Horizontal Scroll) */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, nombre: 'Todos' }, ...sucursales]}
          keyExtractor={(item) => String(item.id || 'all')}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = selectedSucursalFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  { backgroundColor: isActive ? `${colors.accent}15` : colors.surface }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedSucursalFilter(item.id);
                }}
              >
                <Text style={[
                  styles.filterLabel,
                  { color: isActive ? colors.accent : colors.textTertiary }
                ]}>
                  {item.nombre}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Warehouses List/Grid */}
      <FlatList
        key={viewMode}
        data={filteredWarehouses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={viewMode === 'list' ? renderListItem : renderGridItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={viewMode === 'list' ? styles.list : styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No se encontraron almacenes
              </Text>
            </View>
          ) : (
             <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
             </View>
          )
        }
      />

       {/* Create Warehouse Modal */}
       {showCreateModal && (
        <CreateWarehouseModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => {
            console.log('New warehouse:', data);
            setShowCreateModal(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  searchSection: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 8 
  },
  searchBar: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 44, 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 17 
  },
  iconButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  filterSection: {
    height: 50,
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0, 
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: { 
    padding: 16, 
    paddingTop: 0, 
    paddingBottom: 100 
  },
  grid: { 
    padding: 16, 
    paddingTop: 0, 
    paddingBottom: 100 
  },
  // List View Styles
  card: { 
    borderRadius: 12, 
    marginBottom: 12, 
    overflow: 'hidden' 
  },
  productRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    gap: 12 
  },
  productImage: { 
    width: 48, 
    height: 48, 
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  productInfo: { 
    flex: 1, 
    gap: 2 
  },
  productName: { 
    fontSize: 17, 
    fontWeight: '600' 
  },
  productSku: { 
    fontSize: 13 
  },
  divider: { 
    height: StyleSheet.hairlineWidth, 
    marginHorizontal: 12 
  },
  detailsRow: { 
    flexDirection: 'row', 
    paddingVertical: 12, 
    paddingHorizontal: 12 
  },
  detailItem: { 
    flex: 1, 
    gap: 2 
  },
  detailLabel: { 
    fontSize: 11, 
    fontWeight: '500', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  detailValue: { 
    fontSize: 14, 
    fontWeight: '500' 
  },
  progressSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: { 
    flexDirection: 'row', 
    height: 44 
  },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6 
  },
  actionLabel: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  actionDivider: { 
    width: StyleSheet.hairlineWidth, 
    marginVertical: 10 
  },
  // Grid View Styles
  gridCard: { 
    width: GRID_ITEM_WIDTH, 
    borderRadius: 12, 
    marginBottom: 12, 
    overflow: 'hidden' 
  },
  gridImage: { 
    width: '100%', 
    height: GRID_ITEM_WIDTH * 0.7, 
    backgroundColor: '#E5E7EB',
  },
  gridBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  gridBadgeText: { 
    fontSize: 12, 
    fontWeight: '700' 
  },
  gridInfo: { 
    padding: 12, 
    gap: 4 
  },
  gridName: { 
    fontSize: 15, 
    fontWeight: '600' 
  },
  gridSku: { 
    fontSize: 12 
  },
  gridMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 4 
  },
  gridLocation: { 
    fontSize: 11,
    flex: 1,
  },
  // States
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
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
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
