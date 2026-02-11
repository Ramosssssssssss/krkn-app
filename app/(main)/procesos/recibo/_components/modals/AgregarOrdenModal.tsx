import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import type { CombinedOrder } from "../types";

interface AgregarOrdenModalProps {
  visible: boolean;
  onClose: () => void;
  onAgregarOrden: (folio: string) => Promise<{ success: boolean; error?: string }>;
  loadingOrdenAdicional: boolean;
  combinedOrders: CombinedOrder[];
  caratula: { FOLIO: string; FOLIO_DISPLAY?: string } | null;
  detallesCount: number;
  colors: any;
}

export function AgregarOrdenModal({
  visible,
  onClose,
  onAgregarOrden,
  loadingOrdenAdicional,
  combinedOrders,
  caratula,
  detallesCount,
  colors,
}: AgregarOrdenModalProps) {
  const [folioInput, setFolioInput] = useState("");

  const handleAgregar = async () => {
    if (!folioInput.trim()) {
      Alert.alert("Error", "Ingresa un folio válido");
      return;
    }

    const result = await onAgregarOrden(folioInput.trim());
    if (result.success) {
      setFolioInput("");
      // No cerramos el modal para permitir agregar más órdenes
    } else if (result.error) {
      Alert.alert("Error", result.error);
    }
  };

  const handleClose = () => {
    setFolioInput("");
    onClose();
  };

  // Calcular total de productos
  const totalProductos = combinedOrders.length > 0
    ? combinedOrders.reduce((acc, o) => acc + o.productCount, 0)
    : detallesCount;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={localStyles.overlay}>
        <View style={[localStyles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={localStyles.header}>
            <View style={[localStyles.iconContainer, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="layers-outline" size={28} color={colors.accent} />
            </View>
            <View style={localStyles.headerText}>
              <Text style={[localStyles.title, { color: colors.text }]}>
                Combinar Órdenes
              </Text>
              <Text style={[localStyles.subtitle, { color: colors.textTertiary }]}>
                Múltiples órdenes de compra
              </Text>
            </View>
            <TouchableOpacity
              style={[localStyles.closeBtn, { backgroundColor: colors.inputBackground }]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Lista de órdenes actuales */}
          <View style={[localStyles.ordersContainer, { backgroundColor: colors.inputBackground }]}>
            <Text style={[localStyles.ordersLabel, { color: colors.textTertiary }]}>
              Órdenes actuales ({combinedOrders.length > 0 ? combinedOrders.length : 1}):
            </Text>
            
            {combinedOrders.length > 0 ? (
              combinedOrders.map((order, idx) => (
                <View key={idx} style={localStyles.orderRow}>
                  <View style={[localStyles.orderBadge, { backgroundColor: colors.accent }]}>
                    <Text style={localStyles.orderBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={[localStyles.orderFolio, { color: colors.text }]}>
                    {order.folio}
                  </Text>
                  <Text style={[localStyles.orderCount, { color: colors.textSecondary }]}>
                    {order.productCount} productos
                  </Text>
                </View>
              ))
            ) : caratula ? (
              <View style={localStyles.orderRow}>
                <View style={[localStyles.orderBadge, { backgroundColor: colors.accent }]}>
                  <Text style={localStyles.orderBadgeText}>1</Text>
                </View>
                <Text style={[localStyles.orderFolio, { color: colors.text }]}>
                  {caratula.FOLIO_DISPLAY || caratula.FOLIO}
                </Text>
                <Text style={[localStyles.orderCount, { color: colors.textSecondary }]}>
                  {detallesCount} productos
                </Text>
              </View>
            ) : (
              <Text style={[localStyles.noOrderText, { color: colors.textTertiary }]}>
                Primero carga una orden principal
              </Text>
            )}

            {/* Total */}
            {(combinedOrders.length > 0 || caratula) && (
              <View style={[localStyles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[localStyles.totalLabel, { color: colors.textSecondary }]}>
                  Total:
                </Text>
                <Text style={[localStyles.totalValue, { color: colors.accent }]}>
                  {totalProductos} productos
                </Text>
              </View>
            )}
          </View>

          {/* Input de nuevo folio */}
          <View style={localStyles.inputContainer}>
            <Text style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
              Folio de orden adicional
            </Text>
            <TextInput
              style={[
                localStyles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={folioInput}
              onChangeText={setFolioInput}
              placeholder="Ej. A-1234"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              editable={!loadingOrdenAdicional && !!caratula}
              onSubmitEditing={handleAgregar}
              returnKeyType="done"
            />
          </View>

          {/* Botones */}
          <View style={localStyles.footer}>
            <TouchableOpacity
              style={[localStyles.btn, localStyles.closeButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={loadingOrdenAdicional}
            >
              <Text style={[localStyles.closeBtnText, { color: colors.textSecondary }]}>
                Cerrar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.btn,
                localStyles.addButton,
                { backgroundColor: "#F59E0B" },
                (!folioInput.trim() || !caratula || loadingOrdenAdicional) && localStyles.btnDisabled,
              ]}
              onPress={handleAgregar}
              disabled={!folioInput.trim() || !caratula || loadingOrdenAdicional}
            >
              {loadingOrdenAdicional ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={localStyles.addBtnText}>Agregar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  ordersContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  ordersLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  orderBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  orderFolio: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  orderCount: {
    fontSize: 13,
  },
  noOrderText: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    borderWidth: 1,
  },
  addButton: {},
  btnDisabled: {
    opacity: 0.5,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
