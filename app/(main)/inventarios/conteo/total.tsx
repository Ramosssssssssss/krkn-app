import CalendarPicker from '@/components/ui/CalendarPicker';
import { useThemeColors } from '@/context/theme-context';
import { DoctoInvfis, getDoctosInvfisSemana } from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type FilterType = 'TODOS' | 'PENDIENTES' | 'APLICADOS';

export default function ConteoTotalListScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [doctos, setDoctos] = useState<DoctoInvfis[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtros de fecha
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);

  const loadDoctos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctosInvfisSemana(
        startDate || undefined,
        endDate || undefined
      );
      setDoctos(data);
    } catch (error) {
      console.error('Error cargando historial de cíclicos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  React.useEffect(() => {
    loadDoctos();
  }, [loadDoctos, startDate, endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctos();
  };

  const filteredDoctos = useMemo(() => {
    return doctos.filter(doc => {
      // Filtro por estado
      let matchesFilter = true;
      if (activeFilter === 'PENDIENTES') matchesFilter = doc.APLICADO !== 'S';
      if (activeFilter === 'APLICADOS') matchesFilter = doc.APLICADO === 'S';
      
      // Filtro por búsqueda
      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch = (
          doc.FOLIO?.toLowerCase().includes(query) ||
          doc.ALMACEN?.toLowerCase().includes(query) ||
          doc.USUARIO?.toLowerCase().includes(query)
        );
      }
      return matchesFilter && matchesSearch;
    });
  }, [doctos, activeFilter, searchQuery]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
  };

  const handleQuickDate = (days: number | null) => {
    if (days === null) {
      setStartDate(null);
      setEndDate(null);
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const end = new Date();
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
    setShowDatePicker(false);
  };

  const handleApplyRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setShowDatePicker(false);
    setIsCustomRange(false);
  };

  const FilterChip = ({ type, label }: { type: FilterType, label: string }) => (
    <TouchableOpacity 
      onPress={() => setActiveFilter(type)}
      style={[
        styles.chip, 
        activeFilter === type ? { backgroundColor: '#F59E0B' } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
      ]}
    >
      <Text style={[
        styles.chipText, 
        activeFilter === type ? { color: '#FFF' } : { color: colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: DoctoInvfis }) => {
    const isApplied = item.APLICADO === 'S';
    
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/(main)/inventarios/conteo/detalle-conteo', params: { folio: item.FOLIO } })}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: isApplied ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>
              {isApplied ? 'APLICADO' : 'PENDIENTE'}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>
              {formatTime(item.FECHA)}
          </Text>
        </View>

        <Text style={[styles.folioText, { color: colors.text }]}>{formatFolio(item.FOLIO)}</Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.FECHA)}</Text>

        <View style={[styles.cardFooter, { backgroundColor: colors.background + '50' }]}>
          <View style={styles.footerStat}>
            <Text style={[styles.footerStatLabel, { color: colors.textTertiary }]}>ALMACÉN</Text>
            <Text style={[styles.footerStatValue, { color: colors.text }]} numberOfLines={1}>{item.ALMACEN}</Text>
          </View>
          
          <View style={styles.footerDivider} />

          <View style={[styles.footerStat, { flex: 0.8 }]}>
            <Text style={[styles.footerStatLabel, { color: colors.textTertiary }]}>RESPONSABLE</Text>
            <Text style={[styles.footerStatValue, { color: colors.text }]} numberOfLines={1}>{item.USUARIO}</Text>
          </View>

          <View style={[styles.chevronContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Conteos</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => router.push('/(main)/inventarios/conteo/crear-conteo')}
              style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.headerIconBtn, 
                { backgroundColor: (startDate || endDate) ? '#F59E0B' : colors.surface }
              ]}
            >
              <Ionicons name="calendar-outline" size={20} color={(startDate || endDate) ? '#FFF' : colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
          <TextInput
            placeholder="Buscar por folio o almacén..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filtersContainer}>
          <FilterChip type="TODOS" label="TODOS" />
          <FilterChip type="PENDIENTES" label="PENDIENTES" />
          <FilterChip type="APLICADOS" label="APLICADOS" />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : filteredDoctos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No se encontraron registros
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctos}
          renderItem={renderItem}
          keyExtractor={(item) => item.FOLIO}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F59E0B']} tintColor="#F59E0B" />
          }
        />
      )}

      {/* Modal de Filtro de Fecha */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDatePicker(false)}
        >
          <View style={[styles.dateModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dateModalTitle, { color: colors.text }]}>Filtrar por Fecha</Text>
            
            {!isCustomRange ? (
              <View style={styles.dateOptions}>
                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(0)}
                >
                  <Ionicons name="today-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(1)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Ayer y Hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(7)}
                >
                  <Ionicons name="calendar-number-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Últimos 7 días</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(30)}
                >
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Últimos 30 días</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border, backgroundColor: 'rgba(245, 158, 11, 0.1)' }]} 
                  onPress={() => setIsCustomRange(true)}
                >
                  <Ionicons name="options-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.dateOptionText, { color: '#F59E0B' }]}>Rango Personalizado...</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(null)}
                >
                  <Ionicons name="refresh-outline" size={20} color={colors.textTertiary} />
                  <Text style={[styles.dateOptionText, { color: colors.textTertiary }]}>Limpiar filtro</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.customRangeContainer}>
                <CalendarPicker 
                  onSelectRange={handleApplyRange}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
                
                <TouchableOpacity 
                  style={{ alignSelf: 'center', marginTop: 10 }}
                  onPress={() => setIsCustomRange(false)}
                >
                  <Text style={{ color: colors.textTertiary, fontWeight: '700' }}>Volver a opciones rápidas</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isCustomRange && (
              <TouchableOpacity 
                style={[styles.dateModalClose, { backgroundColor: '#F59E0B' }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateModalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: {
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  folioText: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  footerStat: {
    flex: 1,
    gap: 4,
  },
  footerStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerStatValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  dateModalContent: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  dateOptions: {
    gap: 12,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateModalClose: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dateModalCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  customRangeContainer: {
    paddingVertical: 10,
  }
});
