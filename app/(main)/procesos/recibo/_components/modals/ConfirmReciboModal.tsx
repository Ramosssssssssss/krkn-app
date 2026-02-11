import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import { styles } from "../styles";

interface ConfirmReciboModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folio: string;
  totalDevoluciones: number;
  unidadesDevueltas: number;
  colors: any;
}

export function ConfirmReciboModal({
  visible,
  onClose,
  onConfirm,
  folio,
  totalDevoluciones,
  unidadesDevueltas,
  colors,
}: ConfirmReciboModalProps) {
  const hayDevoluciones = totalDevoluciones > 0;

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
          <View style={styles.confirmModalIconContainer}>
            <Ionicons name="cube" size={48} color={colors.accent} />
          </View>

          <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
            Confirmar Recepción
          </Text>

          <Text style={[styles.confirmModalFolio, { color: colors.accent }]}>
            {folio}
          </Text>

          {hayDevoluciones ? (
            <View style={styles.confirmModalInfo}>
              <View style={styles.confirmModalInfoRow}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.confirmModalInfoText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Se recibirán todos los artículos
                </Text>
              </View>
              <View style={styles.confirmModalInfoRow}>
                <Ionicons name="return-down-back" size={20} color="#F59E0B" />
                <Text
                  style={[styles.confirmModalInfoText, { color: "#F59E0B" }]}
                >
                  {totalDevoluciones} devolución(es) por {unidadesDevueltas}{" "}
                  unidad(es)
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                styles.confirmModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Esto actualizará las existencias en el sistema
            </Text>
          )}

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
                { backgroundColor: colors.accent },
              ]}
              onPress={onConfirm}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.saveBtnText}>Recibir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
