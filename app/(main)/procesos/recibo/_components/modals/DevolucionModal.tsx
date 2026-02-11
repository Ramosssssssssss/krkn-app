import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

import { styles } from "../styles";
import { DetalleArticulo } from "../types";

interface DevolucionModalProps {
  visible: boolean;
  onClose: () => void;
  articulo: DetalleArticulo | null;
  cantidadInput: string;
  onCantidadChange: (value: string) => void;
  onGuardar: () => void;
  colors: any;
}

export function DevolucionModal({
  visible,
  onClose,
  articulo,
  cantidadInput,
  onCantidadChange,
  onGuardar,
  colors,
}: DevolucionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Devolución de Producto
            </Text>
            {articulo && (
              <>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {articulo.DESCRIPCION}
                </Text>
                <Text
                  style={[styles.modalExpected, { color: colors.textTertiary }]}
                >
                  Cantidad en orden: {articulo.CANTIDAD}
                </Text>
              </>
            )}
          </View>

          <Text
            style={[styles.devolucionHint, { color: colors.textSecondary }]}
          >
            ¿Cuántas unidades se devolverán al proveedor?
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.modalInput, { color: colors.text }]}
              value={cantidadInput}
              onChangeText={(text) => {
                const numText = text.replace(/[^0-9]/g, "");
                onCantidadChange(numText);
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={onGuardar}
            />
            <Text style={[styles.maxHint, { color: colors.textTertiary }]}>
              Ingresa 0 para cancelar la devolución
            </Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.cancelBtn,
                { borderColor: colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.saveBtn,
                { backgroundColor: "#F59E0B" },
              ]}
              onPress={onGuardar}
            >
              <Ionicons
                name="return-down-back"
                size={18}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
