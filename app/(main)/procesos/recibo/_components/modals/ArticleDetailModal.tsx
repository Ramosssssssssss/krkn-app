import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import { styles } from "../styles";
import { CodigoInner, DetalleArticulo } from "../types";

interface ArticleDetailModalProps {
  visible: boolean;
  onClose: () => void;
  article: DetalleArticulo | null;
  innerCodes: CodigoInner[];
  colors: any;
}

export function ArticleDetailModal({
  visible,
  onClose,
  article,
  innerCodes,
  colors,
}: ArticleDetailModalProps) {
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
              Detalles del Artículo
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close-circle"
                size={28}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {article && (
            <View style={styles.detailModalBody}>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Clave
                </Text>
                <Text style={[styles.detailValue, { color: colors.accent }]}>
                  {article.CLAVE}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Descripción
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {article.DESCRIPCION}
                </Text>
              </View>
              {article.CODIGO_BARRAS && (
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: colors.textTertiary }]}
                  >
                    Código de Barras
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {article.CODIGO_BARRAS}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Unidad
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {article.UNIDAD}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Cantidad Esperada
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {article.CANTIDAD}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Cantidad Escaneada
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        article.cantidadEscaneada >= article.CANTIDAD
                          ? "#10B981"
                          : colors.accent,
                    },
                  ]}
                >
                  {article.cantidadEscaneada}
                </Text>
              </View>

              {/* Empaques/Inner codes */}
              {innerCodes.length > 0 && (
                <View style={styles.detailSection}>
                  <Text
                    style={[styles.detailSectionTitle, { color: colors.text }]}
                  >
                    Empaques Disponibles
                  </Text>
                  <View style={styles.empaquesList}>
                    {innerCodes.map((inner, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.empaqueBadge,
                          { backgroundColor: colors.accent + "20" },
                        ]}
                      >
                        <Ionicons name="cube" size={14} color={colors.accent} />
                        <Text
                          style={[styles.empaqueCode, { color: colors.accent }]}
                        >
                          {inner.CODIGO_INNER}
                        </Text>
                        <Text
                          style={[
                            styles.empaqueQty,
                            { color: colors.textSecondary },
                          ]}
                        >
                          x{inner.CONTENIDO_EMPAQUE} unidades
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
