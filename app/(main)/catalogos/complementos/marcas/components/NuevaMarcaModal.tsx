import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export interface NuevaMarcaData {
  nombre: string;
  sitioWeb: string;
  prefijoSku: string;
  codigo: string;
  almacenPrincipal: string;
  logo: string | null;
}

interface NuevaMarcaModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (marca: NuevaMarcaData) => void;
}

const initialFormData: NuevaMarcaData = {
  nombre: '',
  sitioWeb: '',
  prefijoSku: '',
  codigo: '',
  almacenPrincipal: '',
  logo: null,
};

export default function NuevaMarcaModal({ visible, onClose, onSave }: NuevaMarcaModalProps) {
  const colors = useThemeColors();
  const [formData, setFormData] = useState<NuevaMarcaData>(initialFormData);

  const handleSave = () => {
    onSave(formData);
    setFormData(initialFormData);
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const updateField = (field: keyof NuevaMarcaData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.modalCancelBtn, { color: colors.accent }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Marca</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView 
          style={styles.modalContent}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Upload */}
          <View style={styles.logoSection}>
            <TouchableOpacity 
              style={[styles.logoUpload, { backgroundColor: '#E8E4D9' }]}
              onPress={() => {/* TODO: Image picker */}}
            >
              {formData.logo ? (
                <Image source={{ uri: formData.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#999" />
                </View>
              )}
              <View style={[styles.logoEditBadge, { backgroundColor: colors.accent }]}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.logoLabel, { color: colors.accent }]}>Subir Logo</Text>
          </View>

          {/* Información General */}
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>INFORMACIÓN GENERAL</Text>
            
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre de la Marca</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text }]}
                  placeholder="Ej. Nike"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.nombre}
                  onChangeText={(text) => updateField('nombre', text)}
                />
              </View>
              
              <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Sitio Web</Text>
                <View style={styles.formInputRow}>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, flex: 1 }]}
                    placeholder="www.ejemplo.com"
                    placeholderTextColor={colors.textTertiary}
                    value={formData.sitioWeb}
                    onChangeText={(text) => updateField('sitioWeb', text)}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  <Ionicons name="globe-outline" size={20} color={colors.accent} />
                </View>
              </View>
            </View>
          </View>

          {/* Logística */}
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>LOGÍSTICA</Text>
            
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <View style={styles.formRow}>
                <View style={[styles.formFieldHalf, { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Prefijo SKU</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    placeholder="NK-"
                    placeholderTextColor={colors.textTertiary}
                    value={formData.prefijoSku}
                    onChangeText={(text) => updateField('prefijoSku', text)}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Código</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    placeholder="001"
                    placeholderTextColor={colors.textTertiary}
                    value={formData.codigo}
                    onChangeText={(text) => updateField('codigo', text)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              
              <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Almacén Principal</Text>
                <TouchableOpacity style={styles.formInputRow}>
                  <Text style={[styles.formInput, { color: formData.almacenPrincipal ? colors.text : colors.textTertiary }]}>
                    {formData.almacenPrincipal || 'Seleccionar almacén'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botón Guardar */}
        <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Guardar Marca</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancelBtn: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoUpload: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  formCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  formField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formFieldHalf: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  formInput: {
    fontSize: 16,
    padding: 0,
  },
  formInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formDivider: {
    height: 1,
    marginLeft: 16,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
