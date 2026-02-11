import { API_CONFIG } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { ArticuloDetalle } from "@/types/inventarios";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface ArticleCardProps {
  item: ArticuloDetalle;
  index: number;
  color: string;
  isFlashing?: boolean;
  flashAnim?: Animated.Value;
  onUpdateQuantity: (key: string, delta: number) => void;
  onSetQuantity?: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onEdit?: (key: string) => void;
  onPress?: (item: ArticuloDetalle) => void;
}

export default function ArticleCard({
  item,
  index,
  color,
  isFlashing,
  flashAnim,
  onUpdateQuantity,
  onSetQuantity,
  onRemove,
  onEdit,
  onPress,
}: ArticleCardProps) {
  const colors = useThemeColors();
  const databaseId = getCurrentDatabaseId();
  const swipeableRef = useRef<Swipeable>(null);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [localQty, setLocalQty] = useState(item.cantidad.toString());

  useEffect(() => {
    setLocalQty(item.cantidad.toString());
  }, [item.cantidad]);

  const handleSaveQty = () => {
    const qty = parseInt(localQty, 10);
    // Permitir cantidad 0 para conteos donde no hay existencia
    if (!isNaN(qty) && qty >= 0) {
      onSetQuantity?.(item._key, qty);
      swipeableRef.current?.close();
      setShowQtyModal(false);
    }
  };

  const imageUrl = item.articuloId
    ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${item.articuloId}&thumb=1`
    : `https://api.dicebear.com/7.x/identicon/png?seed=${item.clave}`;

  const renderRightActions = () => (
    <View style={styles.swipeActionsContainer}>
      {onSetQuantity && (
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeBtnQuantity]}
          onPress={() => {
            setLocalQty(item.cantidad.toString());
            setShowQtyModal(true);
          }}
        >
          <Ionicons name="calculator" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Cantidad</Text>
        </TouchableOpacity>
      )}
      {onEdit && (
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeActionEdit]}
          onPress={() => {
            if (onEdit) onEdit(item._key);
          }}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.swipeActionText}>Editar</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionDelete]}
        onPress={() => onRemove(item._key)}
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  const cardContent = (
    <Animated.View
      style={[
        styles.articleItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity:
            isFlashing && flashAnim
              ? flashAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.5],
                })
              : 1,
        },
      ]}
    >
      <View
        style={[styles.imageWrapper, { backgroundColor: colors.background }]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.thumbnail}
          resizeMode="contain"
        />
      </View>

      <View style={styles.articleInfo}>
        <Text style={[styles.articleClave, { color }]}>{item.clave}</Text>
        <Text
          style={[styles.articleDesc, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.descripcion || item.nombre}
        </Text>
        {item.umed && (
          <Text style={[styles.articleUmed, { color: colors.textSecondary }]}>
            Unidad: <Text style={{ fontWeight: "600" }}>{item.umed}</Text>
          </Text>
        )}
        {item.localizacion && (
          <View
            style={[styles.locationBadge, { backgroundColor: color + "15" }]}
          >
            <Ionicons name="location" size={10} color={color} />
            <Text style={[styles.locationBadgeText, { color }]}>
              {item.localizacion}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.articleActions}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.border }]}
            onPress={() => onUpdateQuantity(item._key, -1)}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.text }]}>
            {item.cantidad}
          </Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: color }]}
            onPress={() => onUpdateQuantity(item._key, 1)}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        {onPress ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(item)}>
            {cardContent}
          </TouchableOpacity>
        ) : (
          cardContent
        )}
      </Swipeable>

      {/* Modal para Ajustar Cantidad */}
      <Modal
        visible={showQtyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQtyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ajustar Cantidad
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.descripcion}
              </Text>
            </View>

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
                value={localQty}
                onChangeText={setLocalQty}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={handleSaveQty}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.cancelBtn,
                  { borderColor: colors.border },
                ]}
                onPress={() => setShowQtyModal(false)}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: colors.textSecondary },
                  ]}
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
                onPress={handleSaveQty}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  articleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  thumbnail: {
    width: 48,
    height: 48,
  },
  articleInfo: {
    flex: 1,
    marginRight: 10,
  },
  articleClave: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  articleDesc: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 2,
  },
  articleUmed: {
    fontSize: 10,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 3,
  },
  locationBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  articleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginRight: 16,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 16,
    marginLeft: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  swipeActionEdit: {
    backgroundColor: "#6366F1", // Indigo sleek
  },
  swipeActionDelete: {
    backgroundColor: "#F43F5E", // Rose sleek
  },
  swipeBtnQuantity: {
    backgroundColor: "#10B981", // Emerald sleek
  },

  swipeActionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    opacity: 0.8,
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 20,
    marginBottom: 28,
    height: 72,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalInput: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    padding: 0,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 14,
  },
  modalBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  saveBtn: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
