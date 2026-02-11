import { API_CONFIG } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { useSystemSounds } from "@/hooks/use-system-sounds";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ─────────────────────────────────────────────────────────
interface ArticuloComex {
  CLAVE_PRINCIPAL: string;
  CODIGO_BARRAS: string;
  CLAVE_ALTERNA: string;
  NOMBRE: string;
  LINEA: string;
  MARCA: string;
  PROVEEDOR: string;
  ABC: string;
  ESTATUS: string;
  CODIGO_BARRAS_INNER: string;
  CODIGO_BARRAS_PIEZA: string;
  UNIDAD_COMPRA: string;
  UNIDAD_COMPRA_ABRV: string;
  UNIDAD_MEDIDA: string;
  UNIDAD_MEDIDA_ABRV: string;
  INNER_CANTIDAD: number | null;
  COSTO_INNER: number | null;
  UBICACION_TEPEXPAN: string;
  UBICACION_ZACANGO: string;
  UBICACION_VALLEJO: string;
  UBICACION_SEDENA: string;
  FECHA_CREACION: string;
  FECHA_MODIFICACION: string;
  USUARIO_CREACION: string;
  USUARIO_MODIFICACION: string;
  [key: string]: any;
}

interface EditArticleComexModalProps {
  visible: boolean;
  clave: string | null;
  onClose: () => void;
}

const ACCENT = "#3B82F6";

export default function EditArticleComexModal({
  visible,
  clave,
  onClose,
}: EditArticleComexModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { playSound } = useSystemSounds();
  const lottieRef = useRef<LottieView>(null);

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<ArticuloComex | null>(null);

  // Editable fields
  const [nombre, setNombre] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [claveAlterna, setClaveAlterna] = useState("");
  const [cbInner, setCbInner] = useState("");
  const [cbPieza, setCbPieza] = useState("");
  const [abc, setAbc] = useState("");
  const [estatus, setEstatus] = useState("");
  const [innerCantidad, setInnerCantidad] = useState("");
  const [costoInner, setCostoInner] = useState("");
  const [ubicTepexpan, setUbicTepexpan] = useState("");
  const [ubicZacango, setUbicZacango] = useState("");
  const [ubicVallejo, setUbicVallejo] = useState("");
  const [ubicSedena, setUbicSedena] = useState("");

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ─── Fetch article data ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!clave) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONSULTAR_ARTICULO_COMEX}?codigo=${encodeURIComponent(clave)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        const a = json.articulo as ArticuloComex;
        setOriginal(a);
        populateFields(a);
        playSound("scan");
      } else {
        setError(json.message || "Artículo no encontrado");
        playSound("error");
      }
    } catch (e: any) {
      setError(e?.message || "Error de conexión");
      playSound("error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const populateFields = (a: ArticuloComex) => {
    setNombre(a.NOMBRE || "");
    setCodigoBarras(a.CODIGO_BARRAS || "");
    setClaveAlterna(a.CLAVE_ALTERNA || "");
    setCbInner(a.CODIGO_BARRAS_INNER || "");
    setCbPieza(a.CODIGO_BARRAS_PIEZA || "");
    setAbc(a.ABC || "");
    setEstatus(a.ESTATUS || "");
    setInnerCantidad(a.INNER_CANTIDAD != null ? String(a.INNER_CANTIDAD) : "");
    setCostoInner(a.COSTO_INNER != null ? String(a.COSTO_INNER) : "");
    setUbicTepexpan(a.UBICACION_TEPEXPAN || "");
    setUbicZacango(a.UBICACION_ZACANGO || "");
    setUbicVallejo(a.UBICACION_VALLEJO || "");
    setUbicSedena(a.UBICACION_SEDENA || "");
  };

  useEffect(() => {
    if (visible && clave) {
      setIsEditing(false);
      setShowSuccess(false);
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, clave]);

  // ─── Detect unsaved changes ──────────────────────────────────
  const hasChanges = useCallback(() => {
    if (!original) return false;
    return (
      nombre !== (original.NOMBRE || "") ||
      codigoBarras !== (original.CODIGO_BARRAS || "") ||
      claveAlterna !== (original.CLAVE_ALTERNA || "") ||
      cbInner !== (original.CODIGO_BARRAS_INNER || "") ||
      cbPieza !== (original.CODIGO_BARRAS_PIEZA || "") ||
      abc !== (original.ABC || "") ||
      estatus !== (original.ESTATUS || "") ||
      innerCantidad !==
        (original.INNER_CANTIDAD != null
          ? String(original.INNER_CANTIDAD)
          : "") ||
      costoInner !==
        (original.COSTO_INNER != null ? String(original.COSTO_INNER) : "") ||
      ubicTepexpan !== (original.UBICACION_TEPEXPAN || "") ||
      ubicZacango !== (original.UBICACION_ZACANGO || "") ||
      ubicVallejo !== (original.UBICACION_VALLEJO || "") ||
      ubicSedena !== (original.UBICACION_SEDENA || "")
    );
  }, [
    original,
    nombre,
    codigoBarras,
    claveAlterna,
    cbInner,
    cbPieza,
    abc,
    estatus,
    innerCantidad,
    costoInner,
    ubicTepexpan,
    ubicZacango,
    ubicVallejo,
    ubicSedena,
  ]);

  // ─── Save changes ────────────────────────────────────────────
  const handleSave = async () => {
    if (!original || !hasChanges()) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const campos: Record<string, any> = {};
      if (nombre !== (original.NOMBRE || "")) campos.NOMBRE = nombre;
      if (codigoBarras !== (original.CODIGO_BARRAS || ""))
        campos.CODIGO_BARRAS = codigoBarras;
      if (claveAlterna !== (original.CLAVE_ALTERNA || ""))
        campos.CLAVE_ALTERNA = claveAlterna;
      if (cbInner !== (original.CODIGO_BARRAS_INNER || ""))
        campos.CODIGO_BARRAS_INNER = cbInner;
      if (cbPieza !== (original.CODIGO_BARRAS_PIEZA || ""))
        campos.CODIGO_BARRAS_PIEZA = cbPieza;
      if (abc !== (original.ABC || "")) campos.ABC = abc;
      if (estatus !== (original.ESTATUS || "")) campos.ESTATUS = estatus;
      if (
        innerCantidad !==
        (original.INNER_CANTIDAD != null ? String(original.INNER_CANTIDAD) : "")
      )
        campos.INNER_CANTIDAD = innerCantidad;
      if (
        costoInner !==
        (original.COSTO_INNER != null ? String(original.COSTO_INNER) : "")
      )
        campos.COSTO_INNER = costoInner;
      if (ubicTepexpan !== (original.UBICACION_TEPEXPAN || ""))
        campos.UBICACION_TEPEXPAN = ubicTepexpan;
      if (ubicZacango !== (original.UBICACION_ZACANGO || ""))
        campos.UBICACION_ZACANGO = ubicZacango;
      if (ubicVallejo !== (original.UBICACION_VALLEJO || ""))
        campos.UBICACION_VALLEJO = ubicVallejo;
      if (ubicSedena !== (original.UBICACION_SEDENA || ""))
        campos.UBICACION_SEDENA = ubicSedena;

      const res = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ACTUALIZAR_ARTICULO_COMEX}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clave: original.CLAVE_PRINCIPAL, campos }),
        },
      );
      const json = await res.json();

      if (json.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSound("add");
        if (json.articulo) {
          setOriginal(json.articulo);
          populateFields(json.articulo);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsEditing(false);
        }, 2500);
      } else {
        throw new Error(json.message || "Error al guardar");
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound("error");
      Alert.alert("Error", err.message || "No se pudieron guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Handle "Listo" press ────────────────────────────────────
  const handleDonePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasChanges()) {
      Alert.alert(
        "Cambios sin guardar",
        "¿Deseas guardar los cambios antes de salir del modo edición?",
        [
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => {
              if (original) populateFields(original);
              setIsEditing(false);
            },
          },
          { text: "Guardar", onPress: handleSave },
        ],
        { cancelable: true },
      );
    } else {
      setIsEditing(false);
    }
  };

  // ─── Handle close ────────────────────────────────────────────
  const handleClose = () => {
    if (isEditing && hasChanges()) {
      Alert.alert("Cambios sin guardar", "¿Salir sin guardar los cambios?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            setIsEditing(false);
            onClose();
          },
        },
      ]);
    } else {
      setIsEditing(false);
      onClose();
    }
  };

  // ─── Toggle estatus ──────────────────────────────────────────
  const toggleEstatus = () => {
    if (!isEditing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEstatus((prev) => (prev === "A" ? "I" : "A"));
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* ── Header ─────────────────────────── */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.headerAction, { color: ACCENT }]}>Cerrar</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Artículo COMEX
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                handleDonePress();
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditing(true);
              }
            }}
            disabled={loading || !!error}
          >
            <Text
              style={[
                styles.headerAction,
                styles.headerActionBold,
                { color: ACCENT, opacity: loading || error ? 0.3 : 1 },
              ]}
            >
              {isEditing ? "Listo" : "Editar"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Body ───────────────────────────── */}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={[styles.centerText, { color: colors.textSecondary }]}>
              Consultando artículo...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerWrap}>
            <Ionicons name="alert-circle" size={60} color="#EF4444" />
            <Text
              style={[
                styles.centerText,
                { color: colors.text, fontWeight: "600" },
              ]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: ACCENT }]}
              onPress={fetchData}
            >
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : original ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Hero ─────────────────────────── */}
            <View style={styles.heroSection}>
              <View
                style={[styles.heroIcon, { backgroundColor: `${ACCENT}15` }]}
              >
                <Ionicons name="cube" size={36} color={ACCENT} />
              </View>
              <Text
                style={[styles.heroName, { color: colors.text }]}
                numberOfLines={3}
              >
                {original.NOMBRE}
              </Text>
              <View
                style={[styles.heroBadge, { backgroundColor: `${ACCENT}15` }]}
              >
                <Text style={[styles.heroBadgeText, { color: ACCENT }]}>
                  {original.CLAVE_PRINCIPAL}
                </Text>
              </View>

              {/* Status chips */}
              <View style={styles.heroChips}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        estatus === "A"
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(239,68,68,0.12)",
                    },
                  ]}
                  onPress={toggleEstatus}
                  activeOpacity={isEditing ? 0.6 : 1}
                >
                  <View
                    style={[
                      styles.chipDot,
                      {
                        backgroundColor:
                          estatus === "A" ? "#10B981" : "#EF4444",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: estatus === "A" ? "#10B981" : "#EF4444" },
                    ]}
                  >
                    {estatus === "A" ? "Activo" : "Inactivo"}
                  </Text>
                  {isEditing && (
                    <Ionicons
                      name="swap-horizontal"
                      size={12}
                      color={estatus === "A" ? "#10B981" : "#EF4444"}
                    />
                  )}
                </TouchableOpacity>

                {abc ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: "rgba(99,102,241,0.12)" },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: "#6366F1" }]}>
                      ABC: {abc}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Section: Información Básica ──── */}
            <SectionHeader
              label="INFORMACIÓN BÁSICA"
              color={colors.textSecondary}
            />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <FieldRow
                label="Nombre"
                value={nombre}
                onChangeText={setNombre}
                editable={isEditing}
                multiline
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Cód. Barras"
                value={codigoBarras}
                onChangeText={setCodigoBarras}
                editable={isEditing}
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Clave Alterna"
                value={claveAlterna}
                onChangeText={setClaveAlterna}
                editable={isEditing}
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="CB Inner"
                value={cbInner}
                onChangeText={setCbInner}
                editable={isEditing}
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="CB Pieza"
                value={cbPieza}
                onChangeText={setCbPieza}
                editable={isEditing}
                colors={colors}
              />
            </View>

            {/* ── Section: Clasificación ────────── */}
            <SectionHeader label="CLASIFICACIÓN" color={colors.textSecondary} />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <ReadonlyRow
                label="Línea"
                value={original.LINEA}
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Marca"
                value={original.MARCA}
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Proveedor"
                value={original.PROVEEDOR}
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="ABC"
                value={abc}
                onChangeText={(v) => setAbc(v.toUpperCase())}
                editable={isEditing}
                maxLength={1}
                autoCapitalize="characters"
                colors={colors}
              />
            </View>

            {/* ── Section: Unidades / Inner ─────── */}
            <SectionHeader
              label="UNIDADES / INNER"
              color={colors.textSecondary}
            />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <ReadonlyRow
                label="Unidad Compra"
                value={
                  original.UNIDAD_COMPRA
                    ? `${original.UNIDAD_COMPRA} (${original.UNIDAD_COMPRA_ABRV || ""})`
                    : "—"
                }
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Unidad Medida"
                value={
                  original.UNIDAD_MEDIDA
                    ? `${original.UNIDAD_MEDIDA} (${original.UNIDAD_MEDIDA_ABRV || ""})`
                    : "—"
                }
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Inner Cant."
                value={innerCantidad}
                onChangeText={setInnerCantidad}
                editable={isEditing}
                keyboardType="numeric"
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Costo Inner"
                value={costoInner}
                onChangeText={setCostoInner}
                editable={isEditing}
                keyboardType="decimal-pad"
                prefix="$"
                colors={colors}
              />
            </View>

            {/* ── Section: Ubicaciones ──────────── */}
            <SectionHeader label="UBICACIONES" color={colors.textSecondary} />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <FieldRow
                label="Tepexpan"
                value={ubicTepexpan}
                onChangeText={setUbicTepexpan}
                editable={isEditing}
                autoCapitalize="characters"
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Zacango"
                value={ubicZacango}
                onChangeText={setUbicZacango}
                editable={isEditing}
                autoCapitalize="characters"
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Vallejo"
                value={ubicVallejo}
                onChangeText={setUbicVallejo}
                editable={isEditing}
                autoCapitalize="characters"
                colors={colors}
              />
              <Divider color={colors.border} />
              <FieldRow
                label="Sedena"
                value={ubicSedena}
                onChangeText={setUbicSedena}
                editable={isEditing}
                autoCapitalize="characters"
                colors={colors}
              />
            </View>

            {/* ── Section: Auditoría ───────────── */}
            <SectionHeader label="AUDITORÍA" color={colors.textSecondary} />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <ReadonlyRow
                label="Creado"
                value={original.FECHA_CREACION || "—"}
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Creado por"
                value={original.USUARIO_CREACION || "—"}
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Modificado"
                value={original.FECHA_MODIFICACION || "—"}
                colors={colors}
              />
              <Divider color={colors.border} />
              <ReadonlyRow
                label="Modificado por"
                value={original.USUARIO_MODIFICACION || "—"}
                colors={colors}
              />
            </View>

            {/* ── Save / Cancel buttons ─────────── */}
            {isEditing && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: ACCENT,
                      opacity: isSaving || !hasChanges() ? 0.5 : 1,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving || !hasChanges()}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom spacing */}
            <View style={{ height: insets.bottom + 30 }} />
          </ScrollView>
        ) : null}
      </View>

      {/* ── Success Toast ────────────────────── */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.successBackdrop}>
          <View
            style={[styles.successCard, { backgroundColor: colors.background }]}
          >
            <LottieView
              ref={lottieRef}
              source={require("@/assets/animations/success.json")}
              autoPlay
              loop={false}
              style={styles.successLottie}
            />
            <Text style={[styles.successTitle, { color: colors.text }]}>
              ¡Artículo Actualizado!
            </Text>
            <Text
              style={[styles.successSubtitle, { color: colors.textSecondary }]}
            >
              Los cambios se guardaron correctamente en COMEX
            </Text>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{label}</Text>;
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

function FieldRow({
  label,
  value,
  onChangeText,
  editable,
  colors,
  multiline,
  keyboardType,
  maxLength,
  autoCapitalize,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  editable: boolean;
  colors: any;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  prefix?: string;
}) {
  return (
    <View style={[styles.row, multiline && { alignItems: "flex-start" }]}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.rowInputWrap}>
        {prefix && (
          <Text style={[styles.prefix, { color: colors.textTertiary }]}>
            {prefix}
          </Text>
        )}
        <TextInput
          style={[
            styles.rowInput,
            {
              color: editable ? colors.text : colors.textSecondary,
              textAlign: "right",
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          placeholderTextColor={colors.textTertiary}
          placeholder={editable ? "—" : ""}
        />
      </View>
    </View>
  );
}

function ReadonlyRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | null | undefined;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { fontSize: 17 },
  headerActionBold: { fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "600" },

  // Center states
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  centerText: { fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Hero
  heroSection: { alignItems: "center", paddingVertical: 20, gap: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  heroChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { fontSize: 12, fontWeight: "700" },

  // Section
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 16,
    marginTop: 24,
    letterSpacing: 0.5,
  },
  card: { borderRadius: 12, paddingHorizontal: 16 },

  // Row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 17, width: 115 },
  rowInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  rowInput: { fontSize: 17, flex: 1 },
  rowValue: { fontSize: 17, flex: 1, textAlign: "right" },
  prefix: { fontSize: 17, marginRight: 2 },
  divider: { height: StyleSheet.hairlineWidth },

  // Actions
  actions: { gap: 12, marginTop: 24 },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },

  // Success
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  successLottie: { width: 120, height: 120 },
  successTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
