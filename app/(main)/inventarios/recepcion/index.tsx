import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RecepcionTipo = 'manual' | 'xml' | 'excel';
type ProveedorXML = 'panam' | 'cachorro' | 'mundo';

interface OpcionRecepcion {
  id: RecepcionTipo;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}

interface OpcionProveedor {
  id: ProveedorXML;
  nombre: string;
  icono: keyof typeof Ionicons.glyphMap;
}

const OPCIONES_RECEPCION: OpcionRecepcion[] = [
  {
    id: 'manual',
    titulo: 'Manual',
    descripcion: 'Escanea o busca artículos uno por uno',
    icono: 'scan-outline',
  },
  {
    id: 'xml',
    titulo: 'Importar XML',
    descripcion: 'Carga un archivo XML con los artículos',
    icono: 'code-slash-outline',
  },
  {
    id: 'excel',
    titulo: 'Importar Excel',
    descripcion: 'Carga un archivo Excel (.xlsx) con los artículos',
    icono: 'document-text-outline',
  },
];

const PROVEEDORES_XML: OpcionProveedor[] = [
  { id: 'panam', nombre: 'GRUPO PANAM', icono: 'business-outline' },
  { id: 'cachorro', nombre: 'EL CACHORRO', icono: 'storefront-outline' },
  { id: 'mundo', nombre: 'MUNDO', icono: 'globe-outline' },
];

export default function RecepcionesListScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);

  // Si viene con tipo=xml, mostrar directo el modal de proveedores
  useEffect(() => {
    if (params.tipo === 'xml') {
      setShowProveedorModal(true);
    } else {
      setShowTipoModal(true);
    }
  }, [params.tipo]);

  const handleSeleccionTipo = (tipo: RecepcionTipo) => {
    setShowTipoModal(false);
    
    if (tipo === 'manual') {
      router.push('/(main)/inventarios/recepcion/crear');
    } else if (tipo === 'xml') {
      // Mostrar modal de proveedores con delay para evitar conflictos
      setTimeout(() => {
        setShowProveedorModal(true);
      }, 300);
    } else {
      // TODO: Implementar importación Excel
      Alert.alert('Próximamente', 'Importación Excel en desarrollo');
    }
  };

  const handleSeleccionProveedor = (proveedor: ProveedorXML) => {
    setShowProveedorModal(false);
    // Navegar al selector de XML con el proveedor seleccionado
    router.push(`/(main)/inventarios/recepcion/xml/selector?proveedor=${proveedor}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Empty State */}
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.accent}15` }]}>
            <Ionicons name="cube-outline" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin recepciones</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay recepciones registradas. Crea tu primera recepción para comenzar.
          </Text>
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowTipoModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Recepcionar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de selección de tipo */}
      <Modal
        visible={showTipoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTipoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>¿Cómo deseas recepcionar?</Text>
              <TouchableOpacity onPress={() => setShowTipoModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {OPCIONES_RECEPCION.map((opcion) => (
                <TouchableOpacity
                  key={opcion.id}
                  style={[styles.opcionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSeleccionTipo(opcion.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.opcionIconWrapper, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name={opcion.icono} size={28} color={colors.accent} />
                  </View>
                  <View style={styles.opcionInfo}>
                    <Text style={[styles.opcionTitulo, { color: colors.text }]}>{opcion.titulo}</Text>
                    <Text style={[styles.opcionDescripcion, { color: colors.textSecondary }]}>{opcion.descripcion}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de selección de proveedor XML */}
      <Modal
        visible={showProveedorModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowProveedorModal(false);
          setShowTipoModal(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity 
                onPress={() => {
                  setShowProveedorModal(false);
                  setShowTipoModal(true);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                Selecciona proveedor
              </Text>
              <TouchableOpacity onPress={() => setShowProveedorModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {PROVEEDORES_XML.map((proveedor) => (
                <TouchableOpacity
                  key={proveedor.id}
                  style={[styles.proveedorCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSeleccionProveedor(proveedor.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.proveedorIconWrapper, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name={proveedor.icono} size={24} color={colors.accent} />
                  </View>
                  <Text style={[styles.proveedorNombre, { color: colors.text }]}>{proveedor.nombre}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, flex: 1 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  backButton: {
    marginRight: 8,
  },
  opcionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  opcionIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcionInfo: {
    flex: 1,
  },
  opcionTitulo: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  opcionDescripcion: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Proveedor card
  proveedorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  proveedorIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proveedorNombre: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
