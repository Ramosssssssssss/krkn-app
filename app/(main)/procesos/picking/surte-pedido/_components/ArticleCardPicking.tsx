import { API_CONFIG } from "@/config/api";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ==================== TIPOS ====================
interface Articulo {
  ARTICULO_ID: string;
  CLAVE_ARTICULO: string;
  CODBAR: string;
  NOMBRE: string;
  UNIDADES: number;
  LOCALIZACION: string;
  UNIDAD_VENTA: string;
  SURTIDAS: number;
  IMAGEN_BASE64?: string;
  CONFIRMADO?: boolean;
}

interface ArticleCardPickingProps {
  item: Articulo;
  colors: any;
  isLocked: boolean;
  onConfirm: () => void;
  onUpdateQuantity: (delta: number) => void;
  onSetQuantity: (qty: number) => void;
}

export function ArticleCardPicking({
  item,
  colors,
  isLocked,
  onConfirm,
  onUpdateQuantity,
  onSetQuantity,
}: ArticleCardPickingProps) {
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [localQty, setLocalQty] = useState(item.SURTIDAS.toString());
  const [imgError, setImgError] = useState(false);
  const databaseId = getCurrentDatabaseId();

  const isComplete = item.SURTIDAS >= item.UNIDADES;
  const locUpper = (item.LOCALIZACION || "").toUpperCase().trim();
  const hasNoLocation =
    !item.LOCALIZACION ||
    locUpper === "" ||
    locUpper === "NA" ||
    locUpper === "N/A";

  const handleSaveQty = () => {
    const qty = parseInt(localQty, 10);
    if (!isNaN(qty) && qty >= 0) {
      onSetQuantity(Math.min(qty, item.UNIDADES));
      setShowQtyModal(false);
    }
  };

  const imageUrl = item.ARTICULO_ID
    ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${item.ARTICULO_ID}`
    : null;

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
      {/* Hero Image */}
      <View
        style={[
          styles.heroImageContainer,
          { backgroundColor: colors.background },
        ]}
      >
        {!imgError && (item.IMAGEN_BASE64 || imageUrl) ? (
          <Image
            source={
              item.IMAGEN_BASE64
                ? { uri: `data:image/jpeg;base64,${item.IMAGEN_BASE64}` }
                : { uri: imageUrl || "" }
            }
            style={styles.heroImage}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View
            style={[
              styles.heroImage,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={120}
              color={colors.textTertiary || "#9CA3AF"}
            />
          </View>
        )}

        {/* Location Badge Floating */}
        <View
          style={[
            styles.floatingLoc,
            {
              backgroundColor: isLocked
                ? "#F59E0B"
                : item.CONFIRMADO
                  ? "#10B981"
                  : colors.accent,
            },
          ]}
        >
          <Ionicons
            name={
              isLocked
                ? "lock-closed"
                : item.CONFIRMADO
                  ? "checkmark-circle"
                  : "location"
            }
            size={14}
            color="#fff"
          />
          <Text style={styles.floatingLocText}>{item.LOCALIZACION}</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardClave, { color: colors.accent }]}>
          {item.CLAVE_ARTICULO}
        </Text>
        <Text
          style={[styles.cardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.NOMBRE}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              PEDIDO
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {item.UNIDADES}
            </Text>
          </View>
          <View
            style={[
              styles.statItem,
              styles.statDivider,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              SURTIDO
            </Text>
            <TouchableOpacity
              onPress={() => !isLocked && setShowQtyModal(true)}
              disabled={isLocked}
              style={[
                styles.qtyIndicator,
                { backgroundColor: isComplete ? "#10B98120" : colors.border },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: isComplete ? "#10B981" : colors.text },
                ]}
              >
                {item.SURTIDAS}
              </Text>
              <Ionicons
                name="create-outline"
                size={12}
                color={isComplete ? "#10B981" : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              UNIDAD
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {item.UNIDAD_VENTA}
            </Text>
          </View>
        </View>

        {/* Big Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.mainActionBtn, { backgroundColor: colors.border }]}
            onPress={() => {
              if (isLocked) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
                return;
              }
              if (item.SURTIDAS > 0) onUpdateQuantity(-1);
            }}
          >
            <Ionicons name="remove" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmCircle,
              {
                backgroundColor: isComplete
                  ? "#D1D5DB"
                  : item.CONFIRMADO
                    ? item.SURTIDAS === 0
                      ? "#F59E0B" // Naranja si confirmó 0 para que se note
                      : "#6B7280"
                    : "#10B981",
                shadowColor: isComplete ? "transparent" : "#10B981",
              },
            ]}
            onPress={() => !isLocked && !isComplete && onConfirm()}
            disabled={isLocked || isComplete}
          >
              <Ionicons
                name={
                  isComplete
                    ? "checkmark-done-circle"
                    : item.CONFIRMADO
                      ? item.SURTIDAS === 0
                        ? "alert-circle-outline"
                        : "refresh-outline"
                      : "checkmark"
                }
                size={26}
                color={isComplete ? "#9CA3AF" : "#fff"}
              />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainActionBtn,
              { backgroundColor: isComplete ? colors.border : colors.accent },
            ]}
            onPress={() => {
              if (isLocked) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
                return;
              }
              if (!isComplete) onUpdateQuantity(1);
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Aviso de artículo sin ubicación - FUERA del cardInfo para que siempre se vea */}
      {hasNoLocation && (
        <View style={styles.noLocationWarning}>
          <Ionicons name="warning-outline" size={12} color="#F59E0B" />
          <Text style={styles.noLocationText}>
            Sin ubicación asignada - Reportar a gerencia
          </Text>
        </View>
      )}

      {/* Progress Bar Bottom */}
      <View style={styles.cardProgressTrack}>
        <View
          style={[
            styles.cardProgressFill,
            {
              width: `${(item.SURTIDAS / item.UNIDADES) * 100}%`,
              backgroundColor: isComplete ? "#10B981" : colors.accent,
            },
          ]}
        />
      </View>

      {/* Modal Cantidad */}
      <Modal visible={showQtyModal} transparent animationType="slide">
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.modalCentered}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Ingresar Cantidad
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderBottomColor: colors.accent },
              ]}
              value={localQty}
              onChangeText={setLocalQty}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowQtyModal(false)}
                style={styles.modalBtnCancel}
              >
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveQty}
                style={[
                  styles.modalBtnSave,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLocked && (
        <View style={styles.lockOverlay}>
          <BlurView
            intensity={70}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View style={styles.lockContent}>
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed" size={40} color="#fff" />
            </View>
            <Text style={styles.lockHeadline}>UBICACIÓN REQUERIDA</Text>
            <View style={styles.lockLocContainer}>
              <Ionicons
                name="barcode-outline"
                size={24}
                color={colors.accent}
              />
              <Text style={[styles.lockLocCode, { color: colors.accent }]}>
                {item.LOCALIZACION}
              </Text>
            </View>
            <Text style={styles.lockInstruction}>
              Escanea el código del pasillo para desbloquear este artículo
            </Text>
          </View>
        </View>
      )}

      {/* Overlay de Confirmado / Completado */}
      {!isLocked && item.CONFIRMADO && (
        <View style={styles.confirmedOverlay}>
          <BlurView
            intensity={95}
            style={StyleSheet.absoluteFill}
            tint="systemMaterialDark"
          />
          <View style={styles.confirmedContent}>
            <View
              style={[
                styles.confirmedCircle,
                {
                  backgroundColor:
                    item.SURTIDAS === 0 ? "#F59E0B" : "#10B981",
                },
              ]}
            >
              <Ionicons
                name={
                  item.SURTIDAS === 0
                    ? "alert-outline"
                    : "checkmark-done-outline"
                }
                size={40}
                color="#fff"
              />
            </View>
            <Text
              style={[
                styles.confirmedTitle,
                { color: item.SURTIDAS === 0 ? "#F59E0B" : "#10B981" },
              ]}
            >
              {item.SURTIDAS === 0
                ? "CONFIRMADO EN CERO"
                : isComplete
                  ? "COMPLETADO"
                  : "CONFIRMADO PARCIAL"}
            </Text>
            <Text style={styles.confirmedSub}>
              {item.SURTIDAS} de {item.UNIDADES} piezas surtidas
            </Text>

            <TouchableOpacity
              style={styles.editBtnOverlay}
              onPress={onConfirm}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.editBtnText}>EDITAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
    marginVertical: 10,
  },
  heroImageContainer: {
    height: "30%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroImage: {
    width: "70%",
    height: "85%",
  },
  floatingLoc: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingLocText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  cardInfo: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardClave: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 10,
    borderRadius: 14,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
  },
  qtyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  mainActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  noLocationWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  noLocationText: {
    flex: 1,
    fontSize: 10,
    color: "#92400E",
    fontWeight: "600",
  },
  cardProgressTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardProgressFill: {
    height: "100%",
  },
  modalCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    borderBottomWidth: 3,
    paddingBottom: 8,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalBtnSave: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  lockContent: {
    alignItems: "center",
    padding: 24,
    width: "100%",
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  lockHeadline: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 12,
    opacity: 0.8,
  },
  lockLocContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  lockLocCode: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
  },
  lockInstruction: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 18,
    fontWeight: "600",
  },
  confirmedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 900,
    borderRadius: 20,
    overflow: "hidden",
  },
  confirmedContent: {
    alignItems: "center",
  },
  confirmedCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  confirmedSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
  },
  editBtnOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
