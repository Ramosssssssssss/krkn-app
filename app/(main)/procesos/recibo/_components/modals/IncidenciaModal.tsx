import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import { styles } from "../styles";
import { DetalleArticulo, TIPOS_INCIDENCIA, TipoIncidencia } from "../types";

interface IncidenciaModalProps {
  visible: boolean;
  onClose: () => void;
  articulo: DetalleArticulo | null;
  onSelectTipo: (tipo: TipoIncidencia) => void;
  colors: any;
}

export function IncidenciaModal({
  visible,
  onClose,
  articulo,
  onSelectTipo,
  colors,
}: IncidenciaModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.detailModalOverlay}>
        <View
          style={[
            styles.detailModalContent,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.detailModalHeader}>
            <Text style={[styles.detailModalTitle, { color: colors.text }]}>
              Reportar Incidencia
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close-circle"
                size={28}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {articulo && (
            <Text
              style={[
                styles.incidenciaArticulo,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {articulo.CLAVE} - {articulo.DESCRIPCION}
            </Text>
          )}

          <View style={styles.incidenciasList}>
            {TIPOS_INCIDENCIA.map((tipo) => (
              <TouchableOpacity
                key={tipo.id}
                style={[
                  styles.incidenciaOption,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => onSelectTipo(tipo.id)}
              >
                <Ionicons
                  name={tipo.icon as any}
                  size={24}
                  color={colors.accent}
                />
                <Text style={[styles.incidenciaLabel, { color: colors.text }]}>
                  {tipo.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
