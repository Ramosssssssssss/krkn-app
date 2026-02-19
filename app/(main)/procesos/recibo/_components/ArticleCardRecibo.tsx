import { API_CONFIG } from "@/config/api";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { styles } from "./styles";
import { ArticleCardReciboProps } from "./types";

export interface ArticleCardReciboHandle {
  close: () => void;
}

export const ArticleCardRecibo = forwardRef<
  ArticleCardReciboHandle,
  ArticleCardReciboProps
>(
  (
    {
      item,
      colors,
      innerCodes,
      onUpdateQuantity,
      onUpdateQuantityWithDestino,
      onSetQuantity,
      onShowDetails,
      onIncidencia,
      onDevolucion,
      tieneIncidencia,
      cantidadDevolucion = 0,
      isBackorder,
      onBackorder,
      onSwipeOpen,
      isHighlighted,
    },
    ref,
  ) => {
    const swipeableRef = useRef<Swipeable>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [localQty, setLocalQty] = useState(item.cantidadEscaneada.toString());
    const [isProcessing, setIsProcessing] = useState(false);
    const databaseId = getCurrentDatabaseId();

    // Efecto de parpadeo infinito para el ítem resaltado
    useEffect(() => {
      if (isHighlighted) {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        );
        pulse.start();
        return () => {
          pulse.stop();
          pulseAnim.setValue(1);
        };
      } else {
        pulseAnim.setValue(1);
      }
    }, [isHighlighted]);

    // Exponer método close al padre
    useImperativeHandle(ref, () => ({
      close: () => swipeableRef.current?.close(),
    }));

    // Siempre se escanean TODAS las piezas que llegan
    // La devolución es solo información de cuántas se van a regresar después
    // A MENOS que queramos "bloquear" lo que no entra.
    const yaRecibidas = item.UNIDADES_YA_RECIBIDAS || 0;
    const maxAllowed = item.CANTIDAD - cantidadDevolucion - yaRecibidas;
    const isComplete = item.cantidadEscaneada >= maxAllowed || isBackorder;
    const maxReached = item.cantidadEscaneada >= maxAllowed;

    const handleSaveQty = () => {
      const qty = parseInt(localQty, 10);
      if (!isNaN(qty) && qty >= 0) {
        // Limitar a cantidad máxima (reducida por devoluciones)
        const finalQty = Math.min(qty, maxAllowed);
        onSetQuantity(item.ARTICULO_ID, finalQty);
        swipeableRef.current?.close();
        setShowQtyModal(false);
      }
    };

    const imageUrl = item.ARTICULO_ID
      ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${item.ARTICULO_ID}&thumb=1`
      : `https://api.dicebear.com/7.x/identicon/png?seed=${item.CLAVE}`;

    const renderRightActions = () => (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeBtnQuantity]}
          onPress={() => {
            setLocalQty(maxAllowed.toString());
            setShowQtyModal(true);
          }}
        >
          <Ionicons name="calculator" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Cantidad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeBtnDevolucion]}
          onPress={() => {
            swipeableRef.current?.close();
            onDevolucion(item);
          }}
        >
          <Ionicons name="return-down-back" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Devolución</Text>
        </TouchableOpacity>
        {/* Backorder se calcula automáticamente al recibir - botón oculto */}
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeBtnDetails]}
          onPress={() => {
            swipeableRef.current?.close();
            onShowDetails(item, innerCodes);
          }}
        >
          <Ionicons name="information-circle" size={20} color="#fff" />
          <Text style={styles.swipeActionText}>Detalles</Text>
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
        >
          <Animated.View
            style={[
              styles.articleCard,
              {
                backgroundColor: colors.surface,
                opacity: pulseAnim,
                borderWidth: isHighlighted ? 2 : 0,
                borderColor: isHighlighted ? colors.accent : "transparent",
              },
            ]}
          >
            {/* Indicador de incidencia */}
            {tieneIncidencia && (
              <View style={styles.incidenciaIndicator}>
                <Ionicons name="warning" size={12} color="#fff" />
              </View>
            )}
            {/* Backorder indicator removed - se calcula automáticamente */}
            <View style={styles.articleRow}>
              {/* Imagen - Tappable para ampliar */}
              <TouchableOpacity
                style={[
                  styles.imageContainer,
                  { backgroundColor: colors.inputBackground },
                ]}
                onPress={() => setShowImageModal(true)}
                activeOpacity={0.8}
              >
                {item.IMAGEN_BASE64 ? (
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${item.IMAGEN_BASE64}`,
                    }}
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.articleImage}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.zoomIndicator}>
                  <Ionicons name="expand" size={10} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.articleInfo}>
                <Text style={[styles.articleClave, { color: colors.accent }]}>
                  {item.CLAVE}
                </Text>
                <Text
                  style={[styles.articleDesc, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.DESCRIPCION}{" "}
                  {isBackorder && (
                    <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>
                      (BACKORDER)
                    </Text>
                  )}
                </Text>
                {item.CODIGO_BARRAS && (
                  <Text
                    style={[
                      styles.articleBarcode,
                      { color: colors.textTertiary },
                    ]}
                  >
                    CB: {item.CODIGO_BARRAS}
                  </Text>
                )}
              </View>

              {/* Cantidad con controles +/- */}
              <View style={styles.quantitySection}>
                {/* Cantidad esperada + devolución */}
                <Text
                  style={[styles.expectedLabel, { color: colors.textTertiary }]}
                >
                  Esperado: {item.CANTIDAD}
                  {cantidadDevolucion > 0 && (
                    <Text style={{ color: "#F59E0B" }}>
                      {" "}
                      (-{cantidadDevolucion} dev)
                    </Text>
                  )}
                </Text>

                {/* Controles +/- */}
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: colors.border }]}
                    onPress={() => {
                      if (item.cantidadEscaneada <= 0) return;

                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Alert.alert(
                        "Quitar Unidad",
                        "¿Estás seguro de que deseas restar una unidad?",
                        [
                          { text: "No", style: "cancel" },
                          {
                            text: "Sí, restar",
                            onPress: () =>
                              onUpdateQuantity(item.ARTICULO_ID, -1),
                            style: "destructive",
                          },
                        ],
                      );
                    }}
                    onLongPress={() => {
                      if (item.cantidadEscaneada > 0) {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Warning,
                        );
                        Alert.alert(
                          "Reiniciar Contador",
                          "¿Deseas poner el contador en 0 para este artículo?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Reiniciar",
                              onPress: () => onSetQuantity(item.ARTICULO_ID, 0),
                              style: "destructive",
                            },
                          ],
                        );
                      }
                    }}
                    delayLongPress={400}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.qtyDisplay}>
                    <Text
                      style={[
                        styles.qtyText,
                        { color: isComplete ? "#10B981" : colors.text },
                      ]}
                    >
                      {item.cantidadEscaneada}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      {
                        backgroundColor:
                          maxReached || isProcessing
                            ? colors.border
                            : colors.accent,
                      },
                    ]}
                    onPress={async () => {
                      if (!maxReached && !isProcessing) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Usar la versión con destino para verificar apartado
                        // Preferir CLAVE ya que es el identificador principal en pedidos
                        const codigo = item.CLAVE || item.CODIGO_BARRAS;
                        setIsProcessing(true);
                        try {
                          await onUpdateQuantityWithDestino(
                            item.ARTICULO_ID,
                            1,
                            codigo,
                          );
                        } finally {
                          setIsProcessing(false);
                        }
                      } else if (maxReached) {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Warning,
                        );
                      }
                    }}
                    onLongPress={() => {
                      // Long press = completar todo (llenar hasta maxAllowed)
                      if (!maxReached && !isProcessing) {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success,
                        );
                        onSetQuantity(item.ARTICULO_ID, maxAllowed);
                      }
                    }}
                    delayLongPress={400}
                    disabled={maxReached || isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size={16} color="#fff" />
                    ) : (
                      <Ionicons
                        name="add"
                        size={18}
                        color={
                          maxReached || isProcessing
                            ? colors.textTertiary
                            : "#fff"
                        }
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text
                  style={[styles.unitLabel, { color: colors.textTertiary }]}
                >
                  {item.UNIDAD}
                </Text>
              </View>
            </View>
          </Animated.View>
        </Swipeable>

        {/* Modal para ajustar cantidad */}
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
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {item.DESCRIPCION}
                </Text>
                <Text
                  style={[styles.modalExpected, { color: colors.textTertiary }]}
                >
                  Cantidad esperada: {item.CANTIDAD}
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
                  onChangeText={(text) => {
                    // Solo permitir números
                    const numText = text.replace(/[^0-9]/g, "");
                    setLocalQty(numText);
                  }}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                  onSubmitEditing={handleSaveQty}
                />
                <Text style={[styles.maxHint, { color: colors.textTertiary }]}>
                  Máximo: {item.CANTIDAD}
                </Text>
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

        {/* Modal para ver imagen ampliada - Estilo EditProductModal */}
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.photoOverlay}>
            <View
              style={[
                styles.photoContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Image
                source={{
                  uri: item.IMAGEN_BASE64
                    ? `data:image/jpeg;base64,${item.IMAGEN_BASE64}`
                    : imageUrl.replace("&thumb=1", ""),
                }}
                style={styles.photoFull}
                resizeMode="contain"
              />

              <BlurView intensity={95} tint="dark" style={styles.photoInfoBlur}>
                <View style={styles.photoInfo}>
                  <View
                    style={[
                      styles.skuBadge,
                      { backgroundColor: `${colors.accent}15` },
                    ]}
                  >
                    <Text style={[styles.photoSku, { color: colors.accent }]}>
                      {item.CLAVE}
                    </Text>
                  </View>
                  <Text
                    style={[styles.photoName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.DESCRIPCION}
                  </Text>
                  {item.CODIGO_BARRAS && (
                    <Text
                      style={[
                        styles.photoBarcode,
                        { color: colors.textTertiary },
                      ]}
                    >
                      CB: {item.CODIGO_BARRAS}
                    </Text>
                  )}
                </View>
              </BlurView>

              <TouchableOpacity
                style={[
                  styles.photoCloseBtn,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  },
);

ArticleCardRecibo.displayName = "ArticleCardRecibo";
