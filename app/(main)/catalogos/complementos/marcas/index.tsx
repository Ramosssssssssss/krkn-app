import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { MarcaDetailModal, NuevaMarcaModal } from './components';
import { MARCAS_DATA, PRODUCTOS_EJEMPLO } from './data';
import { Marca, NuevaMarcaData } from './types';

export default function MarcasScreen() {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);

  // Filtrar marcas
  const { activas, archivadas } = useMemo(() => {
    const filtered = MARCAS_DATA.filter(m =>
      m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.categorias.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      activas: filtered.filter(m => m.activa),
      archivadas: filtered.filter(m => !m.activa),
    };
  }, [searchQuery]);

  // Abrir detalle de marca
  const openMarcaDetail = (marca: Marca) => {
    setSelectedMarca(marca);
    setShowDetailModal(true);
  };

  // Guardar nueva marca
  const handleSaveNewMarca = (marcaData: NuevaMarcaData) => {
    console.log('Nueva marca:', marcaData);
    // TODO: Implementar guardado
  };

  // Editar marca
  const handleEditMarca = (marca: Marca) => {
    console.log('Editar marca:', marca);
    // TODO: Implementar edición
  };

  // Agregar producto
  const handleAddProduct = () => {
    console.log('Agregar producto a marca:', selectedMarca?.nombre);
    // TODO: Implementar agregar producto
  };

  // Obtener iniciales para el avatar
  const getInitials = (nombre: string) => {
    return nombre.substring(0, 2).toUpperCase();
  };

  // Color basado en el nombre
  const getAvatarColor = (nombre: string) => {
    const colorsArr = ['#9D4EDD', '#7C3AED', '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6'];
    const index = nombre.charCodeAt(0) % colorsArr.length;
    return colorsArr[index];
  };

  const renderMarca = ({ item }: { item: Marca }) => (
    <TouchableOpacity
      style={[styles.marcaCard, { backgroundColor: colors.surface }]}
      onPress={() => openMarcaDetail(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.marcaAvatar, { backgroundColor: getAvatarColor(item.nombre) + '20' }]}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.marcaLogo} />
        ) : (
          <Text style={[styles.marcaInitials, { color: getAvatarColor(item.nombre) }]}>
            {getInitials(item.nombre)}
          </Text>
        )}
      </View>
      
      <View style={styles.marcaInfo}>
        <Text style={[styles.marcaNombre, { color: colors.text }]}>{item.nombre}</Text>
        <Text style={[styles.marcaCategorias, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.categorias}
        </Text>
      </View>
      
      <View style={styles.marcaSkus}>
        <Text style={[styles.skusCount, { color: colors.textSecondary }]}>{item.skus} SKUs</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter} />
        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
          <Text style={[styles.editBtn, { color: colors.accent }]}>
            {isEditMode ? 'Listo' : 'Editar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Título */}
      <View style={[styles.titleContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Marcas</Text>
      </View>

      {/* Búsqueda */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Activas */}
            {activas.length > 0 && (
              <>
                {renderSectionHeader('ACTIVAS')}
                <View style={[styles.listSection, { backgroundColor: colors.surface }]}>
                  {activas.map((marca, index) => (
                    <View key={marca.id}>
                      {renderMarca({ item: marca })}
                      {index < activas.length - 1 && (
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

  
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Botón Nueva Marca */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nueva Marca</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Nueva Marca */}
      <NuevaMarcaModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveNewMarca}
      />

      {/* Modal Detalle de Marca */}
      <MarcaDetailModal
        visible={showDetailModal}
        marca={selectedMarca}
        productos={PRODUCTOS_EJEMPLO}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEditMarca}
        onAddProduct={handleAddProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  backBtn: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
  },
  editBtn: {
    fontSize: 16,
    fontWeight: '500',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  listSection: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  marcaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  marcaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  marcaInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  marcaInfo: {
    flex: 1,
  },
  marcaNombre: {
    fontSize: 16,
    fontWeight: '600',
  },
  marcaCategorias: {
    fontSize: 13,
    marginTop: 2,
  },
  marcaSkus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skusCount: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginLeft: 72,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
