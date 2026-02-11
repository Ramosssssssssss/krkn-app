import { useTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Articulo {
  ARTICULO_ID: number;
  NOMBRE: string;
  CODIGO: string;
  CODBAR: string;
  UNIDADES: number;
  ALL_CODES: string;
  empacado: number;
}

interface ArticleCardPackingProps {
  item: Articulo;
  index: number;
  colors: {
    surface: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    background: string;
    accent: string;
  };
  sistemaColor: string;
  disabled?: boolean;
  onIncrement: (articuloId: number) => void;
  onDecrement: (articuloId: number) => void;
  onFill: (articuloId: number) => void;
  onSetQuantity: (articuloId: number, qty: number) => void;
  onSwipeOpen?: (articuloId: number) => void;
}

export interface ArticleCardPackingHandle {
  close: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ArticleCardPacking = forwardRef<
  ArticleCardPackingHandle,
  ArticleCardPackingProps
>(
  (
    {
      item,
      index,
      colors,
      sistemaColor,
      disabled = false,
      onIncrement,
      onDecrement,
      onFill,
      onSetQuantity,
      onSwipeOpen,
    },
    ref,
  ) => {
    const swipeableRef = useRef<Swipeable>(null);
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [localQty, setLocalQty] = useState(
      Math.floor(item.empacado).toString(),
    );
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      close: () => swipeableRef.current?.close(),
    }));

    const isComplete = item.empacado >= item.UNIDADES;
    const maxAllowed = Math.floor(item.UNIDADES);
    const artProgress =
      item.UNIDADES > 0 ? (item.empacado / item.UNIDADES) * 100 : 0;

    const handleSaveQty = () => {
      const qty = parseInt(localQty, 10);
      if (!isNaN(qty) && qty >= 0) {
        const finalQty = Math.min(qty, maxAllowed);
        onSetQuantity(item.ARTICULO_ID, finalQty);
        swipeableRef.current?.close();
        setShowQtyModal(false);
      }
    };

    const renderRightActions = () => (
      <View style={styles.swipeActionsContainer}>
        {/* Cantidad - Blue */}
        <TouchableOpacity
          style={[styles.swipeActionBtn, styles.swipeActionCantidad]}
          onPress={() => {
            setLocalQty(Math.floor(item.empacado).toString());
            setShowQtyModal(true);
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.swipeActionIconWrap,
              { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
          >
            <Ionicons name="calculator" size={16} color="#fff" />
          </View>
          <Text style={styles.swipeActionLabel}>Cantidad</Text>
        </TouchableOpacity>
        {/* Llenar - Green */}
        <TouchableOpacity
          style={[styles.swipeActionBtn, styles.swipeActionLlenar]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onFill(item.ARTICULO_ID);
            swipeableRef.current?.close();
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.swipeActionIconWrap,
              { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
          >
            <Ionicons name="checkmark-done" size={16} color="#fff" />
          </View>
          <Text style={styles.swipeActionLabel}>Llenar</Text>
        </TouchableOpacity>
        {/* Reset - Red */}
        <TouchableOpacity
          style={[styles.swipeActionBtn, styles.swipeActionReset]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSetQuantity(item.ARTICULO_ID, 0);
            swipeableRef.current?.close();
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.swipeActionIconWrap,
              { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
          </View>
          <Text style={styles.swipeActionLabel}>Reset</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          overshootRight={false}
          friction={0.5}
          overshootFriction={8}
          dragOffsetFromRightEdge={15}
          onSwipeableWillOpen={() => onSwipeOpen?.(item.ARTICULO_ID)}
          enabled={!disabled}
        >
          <View
            style={[
              styles.articleCard,
              { backgroundColor: colors.surface },
              isComplete && styles.articleComplete,
            ]}
          >
            {/* Index Badge */}
            <View
              style={[
                styles.indexBadge,
                { backgroundColor: isComplete ? "#10B981" : sistemaColor },
              ]}
            >
              {isComplete ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={styles.indexText}>{index + 1}</Text>
              )}
            </View>

            {/* Article Row */}
            <View style={styles.articleRow}>
              {/* Info */}
              <View style={styles.articleInfo}>
                <Text
                  style={[styles.articleNombre, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.NOMBRE}
                </Text>
                <Text
                  style={[styles.articleCodigo, { color: colors.textTertiary }]}
                >
                  {item.CODIGO || item.CODBAR}
                </Text>

                {/* Progress bar */}
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${artProgress}%`,
                        backgroundColor: isComplete ? "#10B981" : sistemaColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Quantity Section */}
              <View style={styles.quantitySection}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: colors.border }]}
                    onPress={() => {
                      if (item.empacado > 0) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onDecrement(item.ARTICULO_ID);
                      }
                    }}
                    disabled={item.empacado <= 0 || disabled}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.qtyDisplay}>
                    <Text
                      style={[
                        styles.qtyText,
                        { color: isComplete ? "#10B981" : sistemaColor },
                      ]}
                    >
                      {Math.floor(item.empacado)}
                    </Text>
                    <Text
                      style={[
                        styles.qtySeparator,
                        { color: colors.textTertiary },
                      ]}
                    >
                      /
                    </Text>
                    <Text style={[styles.qtyTotal, { color: colors.text }]}>
                      {Math.floor(item.UNIDADES)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      {
                        backgroundColor: isComplete
                          ? colors.border
                          : sistemaColor,
                      },
                    ]}
                    onPress={() => {
                      if (!isComplete) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onIncrement(item.ARTICULO_ID);
                      }
                    }}
                    disabled={isComplete || disabled}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={isComplete ? colors.textTertiary : "#fff"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Swipeable>

        {/* Quantity Modal (iOS Bottom Sheet) */}
        <Modal
          visible={showQtyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQtyModal(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowQtyModal(false)}
          >
            <View style={{ flex: 1 }} />
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              {/* iOS Handle */}
              <View
                style={[
                  styles.sheetHandle,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.15)",
                  },
                ]}
              />

              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Ajustar Cantidad
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.NOMBRE}
              </Text>

              {/* Input */}
              <View
                style={[
                  styles.qtyInputCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.qtyInputField, { color: sistemaColor }]}
                  value={localQty}
                  onChangeText={(text) => {
                    const numText = text.replace(/[^0-9]/g, "");
                    setLocalQty(numText);
                  }}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                  onSubmitEditing={handleSaveQty}
                />
                <Text
                  style={[styles.qtyInputHint, { color: colors.textTertiary }]}
                >
                  de {maxAllowed} máximo
                </Text>
              </View>

              {/* Buttons Stacked iOS style */}
              <TouchableOpacity
                style={[
                  styles.sheetPrimaryBtn,
                  { backgroundColor: sistemaColor },
                ]}
                onPress={handleSaveQty}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.sheetPrimaryBtnText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sheetCancelBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
                onPress={() => setShowQtyModal(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sheetCancelBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  },
);

ArticleCardPacking.displayName = "ArticleCardPacking";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  articleCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  articleComplete: {
    opacity: 0.55,
  },
  indexBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  indexText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  articleRow: {
    flexDirection: "row",
    gap: 12,
    marginLeft: 36,
  },
  articleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  articleNombre: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  articleCodigo: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  quantitySection: {
    alignItems: "center",
    justifyContent: "center",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    minWidth: 50,
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "800",
  },
  qtySeparator: {
    fontSize: 14,
    marginHorizontal: 2,
  },
  qtyTotal: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ─── Swipe Actions (iOS rounded buttons) ─────────────────────────────
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 8,
    gap: 6,
  },
  swipeActionBtn: {
    width: 64,
    height: "100%",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    gap: 5,
  },
  swipeActionCantidad: {
    backgroundColor: "#3B82F6",
  },
  swipeActionLlenar: {
    backgroundColor: "#10B981",
  },
  swipeActionReset: {
    backgroundColor: "#EF4444",
  },
  swipeActionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ─── iOS Bottom Sheet ────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.6,
  },
  qtyInputCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  qtyInputField: {
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    padding: 0,
    minWidth: 100,
  },
  qtyInputHint: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  sheetPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetPrimaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sheetCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
