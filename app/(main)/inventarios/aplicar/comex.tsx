import { useThemeColors } from '@/context/theme-context';
import { actualizarConteoComex, ConteoComexItem, eliminarConteoComex, getConteoComex, limpiarConteoComex } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as FS from 'expo-file-system/legacy';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AplicarComexScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState<ConteoComexItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [txtContent, setTxtContent] = useState('');
  const [totalSKUs, setTotalSKUs] = useState(0);
  const [totalUnidades, setTotalUnidades] = useState(0);
  
  // Para edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ConteoComexItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Para Limpieza "Fina"
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const CONFIRM_WORD = 'CONFIRMAR';

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const result = await getConteoComex();
      if (result.ok) {
        setDatos(result.datos || []);
        setTxtContent(result.contenido || '');
        setTotalSKUs(result.total || 0);
        
        const units = (result.datos || []).reduce((sum, item) => sum + Number(item.CANTIDAD), 0);
        setTotalUnidades(units);
      } else {
        Alert.alert('Error', result.message || 'No se pudo obtener el conteo');
      }
    } catch (error) {
      console.error('Error fetching comex data:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const filteredDatos = useMemo(() => {
    if (!searchQuery.trim()) return datos;
    const query = searchQuery.trim().toUpperCase();
    return datos.filter(item => item.CODIGO.toUpperCase().includes(query));
  }, [datos, searchQuery]);

  const handleDownload = async () => {
    if (!txtContent) {
      Alert.alert('Atención', 'No hay contenido para descargar');
      return;
    }
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `CONTEO_COMEX_FINAL_${timestamp}.txt`;
      const fileUri = FS.cacheDirectory + filename;
      await FS.writeAsStringAsync(fileUri, txtContent, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Descargar Conteo Comex Final',
          UTI: 'public.plain-text',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo generar el archivo');
    }
  };

  const handleEditPress = (item: ConteoComexItem) => {
    setEditingItem(item);
    setEditQty(item.CANTIDAD.toString());
    setShowEditModal(true);
    swipeableRefs.current.get(item.CODIGO)?.close();
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Cantidad inválida');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await actualizarConteoComex(editingItem.CODIGO, qty);
      if (res.ok) {
        await fetchDatos();
        setShowEditModal(false);
        setEditingItem(null);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItem = (item: ConteoComexItem) => {
    Alert.alert(
      'Eliminar Registro',
      `¿Borrar ${item.CODIGO}?`,
      [
        { text: 'No', style: 'cancel', onPress: () => swipeableRefs.current.get(item.CODIGO)?.close() },
        { 
          text: 'Sí, borrar', 
          style: 'destructive',
          onPress: async () => {
            const res = await eliminarConteoComex(item.CODIGO);
            if (res.ok) await fetchDatos();
          }
        }
      ]
    );
  };

  const executeClearAll = async () => {
    if (confirmText.toUpperCase() !== CONFIRM_WORD) return;
    
    setShowClearModal(false);
    setLoading(true);
    try {
      const res = await limpiarConteoComex();
      if (res.ok) {
        setConfirmText('');
        await fetchDatos();
      } else {
        Alert.alert('Error', res.message);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const renderRightActions = (item: ConteoComexItem) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity style={[styles.swipeBtn, styles.editBtn]} onPress={() => handleEditPress(item)}>
        <Ionicons name="pencil" size={20} color="#fff" />
        <Text style={styles.swipeBtnText}>Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.swipeBtn, styles.deleteBtn]} onPress={() => handleDeleteItem(item)}>
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.swipeBtnText}>Borrar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ConteoComexItem }) => (
    <Swipeable
      ref={(ref) => ref && swipeableRefs.current.set(item.CODIGO, ref)}
      renderRightActions={() => renderRightActions(item)}
      friction={2}
      rightThreshold={40}
    >
      <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemCode, { color: colors.text }]}>{item.CODIGO}</Text>
          <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Clave de artículo</Text>
        </View>
        <View style={styles.itemValueContainer}>
          <Text style={[styles.itemValue, { color: '#06B6D4' }]}>{item.CANTIDAD}</Text>
          <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Cant.</Text>
        </View>
      </View>
    </Swipeable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Aplicar Comex',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowClearModal(true)} style={styles.headerRightBtn}>
              <Ionicons name="trash-bin-outline" size={22} color="#F43F5E" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Buscador */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar código..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.summaryHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#06B6D4' }]}>{totalSKUs}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>SKUs Totales</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{totalUnidades}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Unidades Totales</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Procesando...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDatos}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.CODIGO}-${index}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {searchQuery ? 'Sin coincidencias' : 'No hay conteos guardados'}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL DE EDICIÓN (iPhone Style) */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.iphoneModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Cantidad</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{editingItem?.CODIGO}</Text>
            <TextInput
              style={[styles.iphoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editQty}
              onChangeText={setEditQty}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.iphoneModalButtons}>
              <TouchableOpacity style={[styles.iphoneBtn, styles.iphoneCancelBtn]} onPress={() => setShowEditModal(false)}>
                <Text style={[styles.iphoneBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iphoneBtn, styles.iphoneConfirmBtn]} onPress={handleUpdate}>
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.iphoneBtnTextConfirm}>Actualizar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE LIMPIEZA TOTAL (Super Fino) */}
      <Modal visible={showClearModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.dangerModal, { backgroundColor: colors.surface }]}>
              <View style={styles.dangerHeader}>
                <Ionicons name="warning" size={48} color="#F43F5E" />
                <Text style={[styles.dangerTitle, { color: colors.text }]}>¡Acción Crítica!</Text>
                <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>
                  Se eliminarán todos los registros de Comex. Escribe <Text style={{fontWeight: '800', color: colors.text}}>{CONFIRM_WORD}</Text> para continuar.
                </Text>
              </View>

              <TextInput
                style={[styles.dangerInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Escribe aquí..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoFocus
              />

              <View style={styles.dangerButtons}>
                <TouchableOpacity 
                  style={[styles.dangerBtn, styles.dangerCancel]} 
                  onPress={() => { setShowClearModal(false); setConfirmText(''); }}
                >
                  <Text style={[styles.dangerBtnText, { color: colors.textSecondary }]}>No, volver</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.dangerBtn, 
                    styles.dangerConfirm, 
                    { opacity: confirmText.toUpperCase() === CONFIRM_WORD ? 1 : 0.4 }
                  ]} 
                  disabled={confirmText.toUpperCase() !== CONFIRM_WORD}
                  onPress={executeClearAll}
                >
                  <Text style={styles.dangerBtnTextConfirm}>Confirmar Borrado</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {!loading && datos.length > 0 && (
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: '#06B6D4' }]}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={styles.downloadButtonText}>Descargar TXT Final</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  headerRightBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 22, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8, padding: 0 },
  summaryHeader: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, paddingHorizontal: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  divider: { width: 1, height: '70%', alignSelf: 'center' },
  listContent: { padding: 16 },
  itemCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1 },
  itemCode: { fontSize: 16, fontWeight: '700' },
  itemLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  itemValueContainer: { alignItems: 'flex-end' },
  itemValue: { fontSize: 18, fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  downloadButton: { flexDirection: 'row', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  downloadButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 12 },
  swipeActions: { flexDirection: 'row', width: 140, marginBottom: 10, marginLeft: 10 },
  swipeBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  swipeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 4 },
  editBtn: { backgroundColor: '#6366F1', marginRight: 5 },
  deleteBtn: { backgroundColor: '#F43F5E' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  iphoneModal: { borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  iphoneInput: { width: '100%', height: 60, borderRadius: 16, borderWidth: 1.5, textAlign: 'center', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  iphoneModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  iphoneBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iphoneCancelBtn: { backgroundColor: 'transparent' },
  iphoneConfirmBtn: { backgroundColor: '#06B6D4' },
  iphoneBtnText: { fontSize: 16, fontWeight: '600' },
  iphoneBtnTextConfirm: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerModal: { borderRadius: 32, padding: 32, shadowColor: '#000', shadowOffset: {width:0, height:10}, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  dangerHeader: { alignItems: 'center', marginBottom: 24 },
  dangerTitle: { fontSize: 24, fontWeight: '900', marginTop: 12 },
  dangerDesc: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginTop: 8 },
  dangerInput: { height: 56, borderRadius: 16, borderWidth: 2, textAlign: 'center', fontSize: 18, fontWeight: '800', marginBottom: 24 },
  dangerButtons: { flexDirection: 'column', gap: 12 },
  dangerBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dangerCancel: { backgroundColor: 'transparent' },
  dangerConfirm: { backgroundColor: '#F43F5E' },
  dangerBtnText: { fontSize: 16, fontWeight: '600' },
  dangerBtnTextConfirm: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
