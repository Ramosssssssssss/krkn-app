import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Operador } from './types';

interface OperadorModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: any;
  insets: any;
  searchText: string;
  onSearchChange: (text: string) => void;
  loading: boolean;
  data: Operador[];
  selectedOperador: any;
  onSelect: (item: any) => void;
}

export const OperadorModal = ({
  visible,
  onClose,
  colors,
  styles,
  insets,
  searchText,
  onSearchChange,
  loading,
  data,
  selectedOperador,
  onSelect,
}: OperadorModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <BlurView intensity={Platform.OS === "ios" ? 80 : 100} tint={colors.isDark ? "dark" : "light"} style={[styles.modalContent, { backgroundColor: colors.surface + "F2" }]}>
          <View style={styles.modalHandle} />

          <Text style={[styles.modalTitle, { color: colors.text }]}>Asignar Conductor</Text>

          {/* Buscador */}
          <View style={[styles.modalSearch, { backgroundColor: colors.background }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.modalSearchInput, { color: colors.text }]}
              placeholder="Buscar por nombre o usuario..."
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={onSearchChange}
            />
            {searchText !== "" && (
              <TouchableOpacity onPress={() => onSearchChange("")}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={{ alignItems: "center", marginVertical: 40, gap: 12 }}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sincronizando flota...</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item.usuario_id.toString()}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isSelected = selectedOperador?.usuario_id === item.usuario_id;
                const enLinea = (item as any).en_linea;
                return (
                  <TouchableOpacity
                    onPress={() => onSelect(item)}
                    style={[styles.operadorItem, isSelected && styles.operadorSelected]}
                  >
                    <View style={[styles.operadorAvatar, { backgroundColor: isSelected ? colors.accent : enLinea ? "#34C75930" : colors.background, borderRadius: 24 }]}>
                      {enLinea ? (
                         <Ionicons name="car-sport" size={20} color={isSelected ? "#fff" : "#34C759"} />
                      ) : (
                        <Text style={[styles.operadorInitial, { color: isSelected ? "#fff" : colors.textSecondary }]}>
                          {item.nombre_completo?.charAt(0)?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.operadorNombre, { color: isSelected ? colors.accent : colors.text }]}>
                        {item.nombre_completo}
                      </Text>
                      <Text style={[styles.operadorUser, { color: colors.textTertiary }]}>
                        @{item.usuario} · {enLinea ? "Live" : "Sin señal"}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: colors.textTertiary, marginVertical: 40 }}>
                  No se encontraron resultados
                </Text>
              }
            />
          )}

          {/* Cerrar */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseBtn}
          >
            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 10 }} />
        </BlurView>
      </View>
    </Modal>
  );
};
