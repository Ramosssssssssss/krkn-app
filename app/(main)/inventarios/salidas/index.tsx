import CalendarPicker from '@/components/ui/CalendarPicker';
import { useThemeColors } from '@/context/theme-context';
import { DoctoEntrada, getDoctosSalidas } from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type FilterType = 'TODOS' | 'APLICADOS' | 'PENDIENTES' | 'CANCELADOS';

export default function SalidasListScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salidas, setSalidas] = useState<DoctoEntrada[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('TODOS');

  // Filtros de fecha
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  
  // Estado para selección manual
  const [tempStart, setTempStart] = useState({ d: new Date().getDate(), m: new Date().getMonth() + 1, y: new Date().getFullYear() });
  const [tempEnd, setTempEnd] = useState({ d: new Date().getDate(), m: new Date().getMonth() + 1, y: new Date().getFullYear() });

  const loadSalidas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctosSalidas({
        limit: 100,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setSalidas(data);
    } catch (error) {
      console.error('Error cargando historial de salidas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadSalidas();
  }, [loadSalidas, startDate, endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSalidas();
  };

  const filteredItems = useMemo(() => {
    return salidas.filter(item => {
      const matchesSearch = item.folio.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.almacen.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      if (activeFilter === 'APLICADOS') matchesFilter = item.aplicado && !item.cancelado;
      if (activeFilter === 'PENDIENTES') matchesFilter = !item.aplicado && !item.cancelado;
      if (activeFilter === 'CANCELADOS') matchesFilter = item.cancelado;

      return matchesSearch && matchesFilter;
    });
  }, [salidas, searchQuery, activeFilter]);

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

  const renderItem = ({ item }: { item: DoctoEntrada }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(main)/inventarios/detalle', params: { folio: item.folio } })}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: item.cancelado ? '#EF4444' : (item.aplicado ? '#10B981' : '#F59E0B') }]} />
          <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>
            {item.cancelado ? 'CANCELADO' : (item.aplicado ? 'APLICADO' : 'PENDIENTE')}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
            {formatTime(item.fecha)}
        </Text>
      </View>

      <Text style={[styles.folioText, { color: '#EF4444' }]}>{formatFolio(item.folio)}</Text>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.fecha)}</Text>

      <View style={[styles.cardFooter, { backgroundColor: colors.background + '50' }]}>
        <View style={styles.footerStat}>
          <Text style={[styles.footerStatLabel, { color: colors.textTertiary }]}>ARTÍCULOS</Text>
          <Text style={[styles.footerStatValue, { color: colors.text }]}>{item.total_articulos}</Text>
        </View>
        
        <View style={styles.footerDivider} />

        <View style={styles.footerStat}>
          <Text style={[styles.footerStatLabel, { color: colors.textTertiary }]}>TOTAL</Text>
          <Text style={[styles.footerStatValue, { color: colors.text }]}>
            ${item.total_importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={[styles.chevronContainer, { backgroundColor: '#EF444415' }]}>
          <Ionicons name="chevron-forward" size={20} color="#EF4444" />
        </View>
      </View>
    </TouchableOpacity>
  );

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
  };



  const FilterChip = ({ type, label }: { type: FilterType, label: string }) => (
    <TouchableOpacity 
      onPress={() => setActiveFilter(type)}
      style={[
        styles.chip, 
        activeFilter === type ? { backgroundColor: colors.accent } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />

      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Salidas</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => router.push('/(main)/inventarios/salidas/crear')}
              style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.headerIconBtn, 
                { backgroundColor: (startDate || endDate) ? colors.accent : colors.surface }
              ]}
            >
              <Ionicons name="calendar-outline" size={20} color={(startDate || endDate) ? '#FFF' : colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
          <TextInput
            placeholder="Buscar por folio..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filtersContainer}>
          <FilterChip type="TODOS" label="TODOS" />
          <FilterChip type="APLICADOS" label="APLICADOS" />
          <FilterChip type="PENDIENTES" label="PENDIENTES" />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No se encontraron registros
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.folio}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EF4444']} />
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
                  <Ionicons name="today-outline" size={20} color={colors.accent} />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(1)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Ayer y Hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(7)}
                >
                  <Ionicons name="calendar-number-outline" size={20} color={colors.accent} />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Últimos 7 días</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border }]} 
                  onPress={() => handleQuickDate(30)}
                >
                  <Ionicons name="time-outline" size={20} color={colors.accent} />
                  <Text style={[styles.dateOptionText, { color: colors.text }]}>Últimos 30 días</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateOption, { borderColor: colors.border, backgroundColor: colors.accent + '10' }]} 
                  onPress={() => setIsCustomRange(true)}
                >
                  <Ionicons name="options-outline" size={20} color={colors.accent} />
                  <Text style={[styles.dateOptionText, { color: colors.accent }]}>Rango Personalizado...</Text>
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
                style={[styles.dateModalClose, { backgroundColor: colors.accent }]}
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
  headerBtn: {
    padding: 8,
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    fontSize: 16,
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
