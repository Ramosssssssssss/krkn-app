import {
    ColorTheme,
    useCombinedThemes,
    useTheme,
    useThemeColors,
} from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Convertir HSL a HEX
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// COLOR PICKER CON DEDO
const ColorSlider = ({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (c: string) => void;
}) => {
  const sliderWidth = SCREEN_WIDTH - 80;
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        const x = Math.max(0, Math.min(gestureState.x0 - 40, sliderWidth));
        const hue = (x / sliderWidth) * 360;
        onValueChange(hslToHex(hue, 80, 50));
        pan.setValue(x);
      },
      onPanResponderMove: (_, gestureState) => {
        const x = Math.max(0, Math.min(gestureState.moveX - 40, sliderWidth));
        const hue = (x / sliderWidth) * 360;
        onValueChange(hslToHex(hue, 80, 50));
        pan.setValue(x);
      },
    }),
  ).current;

  return (
    <View style={styles.sliderContainer}>
      <LinearGradient
        colors={[
          "#FF0000",
          "#FFFF00",
          "#00FF00",
          "#00FFFF",
          "#0000FF",
          "#FF00FF",
          "#FF0000",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { width: sliderWidth }]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: pan }] }]}
        >
          <View style={[styles.thumbInner, { backgroundColor: value }]} />
        </Animated.View>
      </LinearGradient>

      {/* Presets rápidos */}
      <View style={styles.presets}>
        {[
          "#007AFF",
          "#34C759",
          "#FF9500",
          "#FF3B30",
          "#AF52DE",
          "#5856D6",
          "#FF2D55",
          "#000000",
        ].map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onValueChange(c)}
            style={[
              styles.preset,
              {
                backgroundColor: c,
                borderWidth: value === c ? 2 : 0,
                borderColor: "#FFF",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default function AparienciaScreen() {
  const colors = useThemeColors();
  const themeList = useCombinedThemes();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isDark,
    toggleTheme,
    colorTheme,
    setColorTheme,
    isOoledMode,
    setOoledMode,
    isHighContrast,
    setHighContrast,
    uiScale,
    setUiScale,
    addCustomTheme,
    deleteCustomTheme,
  } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [activeToken, setActiveToken] = useState<
    "accent" | "background" | "surface" | "text" | "border"
  >("accent");
  const [themeConfig, setThemeConfig] = useState({
    accent: "#007AFF",
    background: "#000000",
    surface: "#1C1C1E",
    text: "#FFFFFF",
    border: "#38383A",
  });

  const saveTheme = async () => {
    if (!themeName.trim()) {
      Alert.alert("Nombre requerido", "Dale un nombre a tu tema.");
      return;
    }

    const id = `custom_${Date.now()}`;
    const info = {
      id,
      name: themeName.trim(),
      emoji: "✨",
      preview: {
        light: { accent: themeConfig.accent, background: "#F2F2F7" },
        dark: {
          accent: themeConfig.accent,
          background: themeConfig.background,
        },
      },
    };

    const palette = {
      light: {
        background: "#F2F2F7",
        surface: "#FFFFFF",
        text: "#000000",
        textSecondary: "#8E8E93",
        textTertiary: "#C7C7CC",
        border: "#E5E5EA",
        accent: themeConfig.accent,
        accentLight: themeConfig.accent + "20",
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
        inputBackground: "#FFFFFF",
        buttonDisabled: "#D1D1D6",
        cardShadow: "rgba(0,0,0,0.05)",
      },
      dark: {
        background: themeConfig.background,
        surface: themeConfig.surface,
        text: themeConfig.text,
        textSecondary: "#8E8E93",
        textTertiary: "#48484A",
        border: themeConfig.border,
        accent: themeConfig.accent,
        accentLight: themeConfig.accent + "20",
        success: "#30D158",
        warning: "#FF9F0A",
        error: "#FF453A",
        inputBackground: themeConfig.surface,
        buttonDisabled: "#3A3A3C",
        cardShadow: "rgba(0,0,0,0.5)",
      },
    };

    await addCustomTheme(info as any, palette);
    setModalVisible(false);
    setThemeName("");
    setColorTheme(id);
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: isDark ? "#000000" : "#F2F2F7" },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER GRANDE CON FLECHA */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Apariencia</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* PREVIEW */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, marginHorizontal: 20 },
          ]}
        >
          <View style={styles.mockHeader}>
            <View
              style={[styles.mockAvatar, { backgroundColor: colors.accent }]}
            />
            <View>
              <View
                style={[
                  styles.mockLine,
                  { backgroundColor: colors.text, width: 100 },
                ]}
              />
              <View
                style={[
                  styles.mockLine,
                  { backgroundColor: colors.textSecondary, width: 60 },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.mockBox, { backgroundColor: colors.accentLight }]}
          />
          <View style={[styles.mockBtn, { backgroundColor: colors.accent }]}>
            <Text style={styles.mockBtnText}>Confirmar</Text>
          </View>
        </View>

        {/* MODO */}
        <Text style={styles.sectionLabel}>PANTALLA</Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Ionicons name="moon-outline" size={22} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>
              Modo Oscuro
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: "#34C759" }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Ionicons name="contrast-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowText, { color: colors.text }]}>
                Modo OLED
              </Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                Negros puros
              </Text>
            </View>
            <Switch
              value={isOoledMode}
              onValueChange={setOoledMode}
              disabled={!isDark}
              trackColor={{ true: "#34C759" }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Ionicons name="eye-outline" size={22} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>
              Alto Contraste
            </Text>
            <Switch
              value={isHighContrast}
              onValueChange={setHighContrast}
              trackColor={{ true: "#34C759" }}
            />
          </View>
        </View>

        {/* ESCALA DE TEXTO */}
        <Text style={styles.sectionLabel}>TAMAÑO DE TEXTO</Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          {/* Slider visual */}
          <View style={styles.scaleRow}>
            <Ionicons
              name="text-outline"
              size={14}
              color={colors.textSecondary}
            />
            <View style={styles.scaleTrack}>
              <View
                style={[
                  styles.scaleTrackFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${((uiScale - 0.8) / 0.5) * 100}%`,
                  },
                ]}
              />
              {[0.8, 0.9, 1.0, 1.1, 1.3].map((s, i) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setUiScale(s)}
                  style={[
                    styles.scaleDot,
                    {
                      backgroundColor:
                        uiScale === s ? colors.accent : colors.border,
                      left: `${(i / 4) * 100}%`,
                      borderWidth: uiScale === s ? 3 : 0,
                      borderColor: colors.surface,
                    },
                  ]}
                />
              ))}
            </View>
            <Ionicons name="text-outline" size={24} color={colors.text} />
          </View>

          {/* Labels */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 46,
              marginTop: -4,
              marginBottom: 8,
            }}
          >
            {[
              { val: 0.8, label: "XS" },
              { val: 0.9, label: "S" },
              { val: 1.0, label: "M" },
              { val: 1.1, label: "L" },
              { val: 1.3, label: "XL" },
            ].map((item) => (
              <Text
                key={item.val}
                style={{
                  fontSize: 10,
                  fontWeight: uiScale === item.val ? "700" : "500",
                  color:
                    uiScale === item.val ? colors.accent : colors.textTertiary,
                  textAlign: "center",
                  width: 24,
                }}
              >
                {item.label}
              </Text>
            ))}
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border, marginLeft: 0 },
            ]}
          />

          {/* Preview en vivo */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                fontWeight: "600",
                marginBottom: 10,
                letterSpacing: 0.5,
              }}
            >
              VISTA PREVIA
            </Text>
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: Math.round(17 * uiScale),
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                Título de ejemplo
              </Text>
              <Text
                style={{
                  fontSize: Math.round(15 * uiScale),
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Este es un texto de cuerpo normal para que puedas ver cómo se
                ve.
              </Text>
              <Text
                style={{
                  fontSize: Math.round(13 * uiScale),
                  color: colors.textTertiary,
                }}
              >
                Texto secundario · {Math.round(uiScale * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* TEMAS */}
        <Text style={styles.sectionLabel}>TEMAS</Text>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themesRow}
          >
            {themeList.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.themeItem,
                  {
                    borderColor:
                      colorTheme === t.id ? colors.accent : "transparent",
                  },
                ]}
                onPress={() => setColorTheme(t.id as ColorTheme)}
              >
                <View
                  style={[
                    styles.themeCircle,
                    {
                      backgroundColor: isDark
                        ? t.preview.dark.accent
                        : t.preview.light.accent,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                </View>
                <Text style={[styles.themeName, { color: colors.text }]}>
                  {t.name}
                </Text>
                {t.id.startsWith("custom_") && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteCustomTheme(t.id)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.themeItem}
              onPress={() => setModalVisible(true)}
            >
              <View
                style={[
                  styles.themeCircle,
                  {
                    backgroundColor: colors.border,
                    borderStyle: "dashed",
                    borderWidth: 2,
                  },
                ]}
              >
                <Ionicons name="add" size={26} color={colors.textSecondary} />
              </View>
              <Text style={[styles.themeName, { color: colors.textSecondary }]}>
                Crear
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* MODAL CREAR TEMA - ESTILO APPLE */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <View
          style={[
            styles.modal,
            { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { paddingTop: Platform.OS === "ios" ? 15 : insets.top + 10 },
            ]}
          >
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#007AFF", fontSize: 17 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text
              style={[styles.modalTitle, { color: isDark ? "#FFF" : "#000" }]}
            >
              Nueva Apariencia
            </Text>
            <TouchableOpacity onPress={saveTheme}>
              <Text
                style={{ color: "#007AFF", fontSize: 17, fontWeight: "600" }}
              >
                Guardar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2C2C2E" : "#FFF",
                  color: isDark ? "#FFF" : "#000",
                  borderColor: isDark ? "#38383A" : "#E5E5EA",
                },
              ]}
              placeholder="Nombre del tema"
              placeholderTextColor="#8E8E93"
              value={themeName}
              onChangeText={setThemeName}
            />

            {/* Tabs de tokens */}
            <View style={styles.tokenTabs}>
              {(
                ["accent", "background", "surface", "text", "border"] as const
              ).map((token) => (
                <TouchableOpacity
                  key={token}
                  onPress={() => setActiveToken(token)}
                  style={[
                    styles.tokenTab,
                    {
                      borderBottomColor:
                        activeToken === token
                          ? themeConfig.accent
                          : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tokenTabText,
                      {
                        color:
                          activeToken === token
                            ? themeConfig.accent
                            : "#8E8E93",
                      },
                    ]}
                  >
                    {token.charAt(0).toUpperCase() + token.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector de color con dedo */}
            <Text
              style={[styles.colorLabel, { color: isDark ? "#FFF" : "#000" }]}
            >
              Desliza para elegir color de "{activeToken}"
            </Text>
            <ColorSlider
              value={themeConfig[activeToken]}
              onValueChange={(c) =>
                setThemeConfig({ ...themeConfig, [activeToken]: c })
              }
            />

            {/* Preview en vivo */}
            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>
              PREVIEW
            </Text>
            <View
              style={[
                styles.livePreview,
                {
                  backgroundColor: themeConfig.surface,
                  borderColor: themeConfig.border,
                },
              ]}
            >
              <View style={styles.liveHeader}>
                <View
                  style={[
                    styles.liveAvatar,
                    { backgroundColor: themeConfig.accent },
                  ]}
                />
                <View
                  style={[
                    styles.liveLine,
                    { backgroundColor: themeConfig.text },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.liveBox,
                  { backgroundColor: themeConfig.accent + "20" },
                ]}
              />
              <View
                style={[
                  styles.liveBtn,
                  { backgroundColor: themeConfig.accent },
                ]}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Botón</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15 },
  backBtn: { marginLeft: -8, marginBottom: 5 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  card: { borderRadius: 20, padding: 16, marginBottom: 25 },
  mockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 15,
  },
  mockAvatar: { width: 44, height: 44, borderRadius: 14 },
  mockLine: { height: 8, borderRadius: 4, marginBottom: 5 },
  mockBox: { height: 50, borderRadius: 12, marginBottom: 12 },
  mockBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mockBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  sectionLabel: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 35,
    marginBottom: 8,
    fontWeight: "600",
  },
  group: {
    marginHorizontal: 20,
    borderRadius: 14,
    marginBottom: 25,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  rowText: { flex: 1, fontSize: 17 },
  rowSub: { fontSize: 13, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    paddingBottom: 12,
    gap: 15,
  },
  scaleTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#3A3A3C",
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  scaleTrackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    borderRadius: 2,
  },
  scaleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    marginLeft: -10,
  },
  themesRow: { padding: 16, gap: 12 },
  themeItem: {
    alignItems: "center",
    width: 72,
    borderRadius: 14,
    padding: 6,
    borderWidth: 2,
  },
  themeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  themeName: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { position: "absolute", top: -4, right: -4 },
  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#38383A",
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1,
    marginBottom: 20,
  },
  tokenTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  tokenTab: { paddingVertical: 10, borderBottomWidth: 3 },
  tokenTabText: { fontSize: 12, fontWeight: "700" },
  colorLabel: { fontSize: 15, fontWeight: "500", marginBottom: 15 },
  sliderContainer: { marginBottom: 20 },
  gradient: { height: 40, borderRadius: 12, justifyContent: "center" },
  thumb: { position: "absolute", width: 28, height: 28 },
  thumbInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#FFF",
  },
  presets: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 15,
  },
  preset: { width: 32, height: 32, borderRadius: 16 },
  livePreview: { borderRadius: 16, padding: 16, borderWidth: 1 },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  liveAvatar: { width: 36, height: 36, borderRadius: 12 },
  liveLine: { height: 8, width: 80, borderRadius: 4 },
  liveBox: { height: 40, borderRadius: 10, marginBottom: 12 },
  liveBtn: {
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
