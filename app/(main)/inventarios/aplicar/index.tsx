import { useThemeColors } from '@/context/theme-context';
import { DoctoInvfis, getDoctosInvfisSemana } from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type FilterType = 'todos' | 'pendientes' | 'aplicados';

export default function AplicarInventarioScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [doctos, setDoctos] = useState<DoctoInvfis[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pendientes');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDoctos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctosInvfisSemana();
      setDoctos(data);
    } catch (error) {
      console.error('Error cargando doctos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadDoctos();
  }, [loadDoctos]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctos();
  };

  // Filtrar documentos
  const filteredDoctos = doctos.filter(doc => {
    // Filtro por estado
    if (filter === 'pendientes' && doc.APLICADO === 'S') return false;
    if (filter === 'aplicados' && doc.APLICADO !== 'S') return false;
    
    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.FOLIO?.toLowerCase().includes(query) ||
        doc.DESCRIPCION?.toLowerCase().includes(query) ||
        doc.ALMACEN?.toLowerCase().includes(query) ||
        doc.USUARIO?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('es-MX', options);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const FilterChip = ({ type, label }: { type: FilterType; label: string }) => {
    const isActive = filter === type;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          { 
            backgroundColor: isActive ? colors.accent : colors.surface,
            borderColor: isActive ? colors.accent : colors.border,
          }
        ]}
        onPress={() => setFilter(type)}
      >
        <Text style={[
          styles.filterChipText,
          { color: isActive ? '#FFFFFF' : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: DoctoInvfis }) => {
    const isPending = item.APLICADO !== 'S';
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header con fecha y badge */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(item.FECHA)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>
              {formatTime(item.FECHA)}
            </Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isPending ? '#FFF7ED' : '#ECFDF5' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: isPending ? '#EA580C' : '#059669' }
            ]}>
              {isPending ? 'PENDIENTE' : 'APLICADO'}
            </Text>
          </View>
        </View>

        {/* Info del responsable */}
        <View style={styles.infoRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="person" size={16} color={colors.accent} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {item.USUARIO || 'Sin usuario'}
            </Text>
            <Text style={[styles.infoSublabel, { color: colors.textTertiary }]}>
              Responsable
            </Text>
          </View>
        </View>

        {/* Info del almacén */}
        <View style={styles.infoRow}>
          <View style={[styles.avatar, { backgroundColor: `${colors.accent}10` }]}>
            <Ionicons name="location" size={16} color={colors.accent} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {item.ALMACEN || 'Sin almacén'}
            </Text>
            <Text style={[styles.infoSublabel, { color: colors.textTertiary }]}>
              Sucursal
            </Text>
          </View>
        </View>

        {/* Footer con total y botón */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>
              Folio
            </Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatFolio(item.FOLIO)}
            </Text>
          </View>
          
          {isPending ? (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push({ pathname: '/(main)/inventarios/aplicar/confirmarInv', params: { folio: item.FOLIO } })}
            >
              <Text style={styles.actionBtnText}>Aplicar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.detailBtn, { borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(main)/inventarios/aplicar/confirmarInv', params: { folio: item.FOLIO } })}
            >
              <Text style={[styles.detailBtnText, { color: colors.textSecondary }]}>
                Ver Detalle
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: '',
          headerRight: () => (
            <TouchableOpacity style={{ padding: 8 }}>
              <Ionicons name="options-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Inventarios</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar inventario..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <FilterChip type="todos" label="Todos" />
        <FilterChip type="pendientes" label="Pendientes" />
        <FilterChip type="aplicados" label="Aplicados" />
      </View>

      {/* Section Label */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
        HISTORIAL RECIENTE
      </Text>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando inventarios...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctos}
          renderItem={renderItem}
          keyExtractor={item => item.DOCTO_INVFIS_ID.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.accent} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons 
                  name={filter === 'pendientes' ? 'checkmark-done-circle-outline' : 'folder-open-outline'} 
                  size={48} 
                  color={colors.accent} 
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {filter === 'pendientes' ? '¡Todo al día!' : 'Sin resultados'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'pendientes' 
                  ? 'No hay inventarios pendientes por aplicar.'
                  : 'No se encontraron inventarios con estos filtros.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14 
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoSublabel: {
    fontSize: 12,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
