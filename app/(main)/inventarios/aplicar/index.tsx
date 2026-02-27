import { useThemeColors } from '@/context/theme-context';
import { DoctoInvfis, getDoctosInvfisSemana } from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterType = 'todos' | 'pendientes' | 'aplicados';

export default function AplicarInventarioScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [doctos, setDoctos] = useState<DoctoInvfis[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pendientes');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDoctos = useCallback(async (showRefresher = false) => {
    if (!showRefresher) setLoading(true);
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
    loadDoctos(true);
  };

  const filteredDoctos = doctos.filter(doc => {
    if (filter === 'pendientes' && doc.APLICADO === 'S') return false;
    if (filter === 'aplicados' && doc.APLICADO !== 'S') return false;
    
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

  const handlePress = (folio: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(main)/inventarios/aplicar/confirmarInv', params: { folio } });
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
        onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setFilter(type);
        }}
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
      <TouchableOpacity 
        style={[styles.premiumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePress(item.FOLIO)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.dateBox, { backgroundColor: colors.accent + '10' }]}>
            <Text style={[styles.dateDay, { color: colors.accent }]}>
                {new Date(item.FECHA).getDate()}
            </Text>
            <Text style={[styles.dateMonth, { color: colors.accent }]}>
                {new Date(item.FECHA).toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.cardFolio, { color: colors.text }]}>#{formatFolio(item.FOLIO)}</Text>
            <View style={styles.badgeRow}>
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
          </View>
          
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.USUARIO || 'Sin usuario'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.ALMACEN || 'Sin almacén'}</Text>
          </View>
          {item.DESCRIPCION && (
              <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                  {item.DESCRIPCION}
              </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerSubTitle, { color: colors.textTertiary }]}>HISTORIAL</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Aplicar Inventario</Text>
        </View>
      </View>

      {/* Search Bar Refined */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border, marginHorizontal: 20 }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar auditoría..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips Scrollable Row */}
      <View style={styles.filterRow}>
        <FilterChip type="pendientes" label="Pendientes" />
        <FilterChip type="aplicados" label="Aplicados" />
        <FilterChip type="todos" label="Ver Todos" />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sincronizando...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctos}
          renderItem={renderItem}
          keyExtractor={item => item.DOCTO_INVFIS_ID.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
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
              <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
                <Ionicons 
                  name={filter === 'pendientes' ? 'checkmark-done' : 'search-outline'} 
                  size={42} 
                  color={colors.border} 
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {filter === 'pendientes' ? 'Sin pendientes' : 'No hay resultados'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {filter === 'pendientes' 
                  ? 'Todos los inventarios han sido aplicados.'
                  : 'Intenta con otros criterios de búsqueda.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  headerTitleContainer: { flex: 1, marginLeft: 5 },
  headerSubTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 15,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  listContent: { paddingHorizontal: 20 },
  
  premiumCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dateDay: { fontSize: 18, fontWeight: '800' },
  dateMonth: { fontSize: 9, fontWeight: '700', marginTop: -2 },
  headerInfo: { flex: 1 },
  cardFolio: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  
  cardBody: { paddingLeft: 0, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, fontWeight: '500' },
  cardDesc: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

