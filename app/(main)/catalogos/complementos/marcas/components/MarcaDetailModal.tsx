import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Marca, Producto } from '../types';

interface MarcaDetailModalProps {
  visible: boolean;
  marca: Marca | null;
  productos: Producto[];
  onClose: () => void;
  onEdit: (marca: Marca) => void;
  onAddProduct: () => void;
}

// Función para obtener color del avatar basado en el nombre
const getAvatarColor = (nombre: string) => {
  const colorsArr = ['#9D4EDD', '#7C3AED', '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6'];
  const index = nombre.charCodeAt(0) % colorsArr.length;
  return colorsArr[index];
};

export default function MarcaDetailModal({ 
  visible, 
  marca, 
  productos,
  onClose, 
  onEdit,
  onAddProduct 
}: MarcaDetailModalProps) {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar productos por búsqueda
  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!marca) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.detailBackBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.detailHeaderTitle, { color: colors.text }]}>Detalle de Marca</Text>
          <TouchableOpacity style={styles.detailMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Brand Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.detailCardIcon, { backgroundColor: getAvatarColor(marca.nombre) }]}>
            <Ionicons name="briefcase" size={24} color="#fff" />
          </View>
          <View style={styles.detailCardInfo}>
            <Text style={[styles.detailCardName, { color: colors.text }]}>{marca.nombre}</Text>
            <Text style={[styles.detailCardStatus, { color: marca.activa ? colors.success : colors.textSecondary }]}>
              {marca.activa ? 'Proveedor Activo' : 'Proveedor Inactivo'}
            </Text>
            <View style={styles.detailCardStats}>
              <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailCardStatsText, { color: colors.textSecondary }]}>
                {marca.skus} Productos • {(marca.skus * 50).toLocaleString()} Unidades
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.detailSearchContainer}>
          <View style={[styles.detailSearchBox, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.detailSearchInput, { color: colors.text }]}
              placeholder="Buscar SKU o Nombre"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Products Header */}
        <View style={styles.detailProductsHeader}>
          <Text style={[styles.detailProductsTitle, { color: colors.textSecondary }]}>INVENTARIO DE PRODUCTOS</Text>
          <TouchableOpacity>
            <Text style={[styles.detailSortBtn, { color: colors.accent }]}>Ordenar por Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <ScrollView style={styles.detailProductsList} showsVerticalScrollIndicator={false}>
          {filteredProductos.map((producto) => (
            <TouchableOpacity key={producto.id} style={[styles.detailProductCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.detailProductIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="cube" size={20} color={colors.accent} />
              </View>
              <View style={styles.detailProductInfo}>
                <View style={styles.detailProductRow}>
                  <Text style={[styles.detailProductName, { color: colors.text }]} numberOfLines={1}>
                    {producto.nombre}
                  </Text>
                  <Text style={[
                    styles.detailProductStock,
                    { color: producto.status === 'low stock' ? colors.warning : colors.success }
                  ]}>
                    {producto.stock} {producto.status === 'low stock' ? 'bajo stock' : 'en stock'}
                  </Text>
                </View>
                <Text style={[styles.detailProductSku, { color: colors.textSecondary }]}>SKU: {producto.sku}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          
          <Text style={[styles.detailShowingText, { color: colors.textSecondary }]}>
            Mostrando {filteredProductos.length} de {marca.skus} productos
          </Text>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.detailFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.detailEditBtn, { backgroundColor: colors.surface }]}
            onPress={() => onEdit(marca)}
          >
            <Ionicons name="pencil" size={16} color={colors.text} />
            <Text style={[styles.detailEditBtnText, { color: colors.text }]}>Editar Marca</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.detailAddBtn, { backgroundColor: colors.accent }]}
            onPress={onAddProduct}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.detailAddBtnText}>Agregar Producto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  detailBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  detailMenuBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  detailCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardInfo: {
    flex: 1,
  },
  detailCardName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailCardStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  detailCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailCardStatsText: {
    fontSize: 13,
  },
  detailSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  detailSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  detailSearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  detailProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailProductsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  detailSortBtn: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailProductsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  detailProductIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailProductInfo: {
    flex: 1,
  },
  detailProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailProductName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  detailProductStock: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailProductSku: {
    fontSize: 13,
  },
  detailShowingText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 100,
  },
  detailFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  detailEditBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  detailAddBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
