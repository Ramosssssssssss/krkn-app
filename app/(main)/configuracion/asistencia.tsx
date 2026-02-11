import {
  AVAILABLE_ACTIONS,
  BUTTON_STYLES,
  ButtonStyleId,
  useAssistive,
} from "@/context/assistive-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_SIZE = 90;

// Componente para renderizar cada estilo de botón (versión grande)
const ButtonStylePreview = ({
  styleId,
  isDark,
  size = PREVIEW_SIZE,
  colors,
}: {
  styleId: ButtonStyleId;
  isDark: boolean;
  size?: number;
  colors: ReturnType<typeof useThemeColors>;
}) => {
  const outerBg = isDark ? `${colors.surface}A5` : `${colors.surface}C0`;
  const outerBorder = colors.border;
  const innerBg = isDark ? `${colors.accent}40` : `${colors.accent}30`;
  const innerBorder = isDark ? `${colors.accent}50` : `${colors.accent}40`;
  const ringColor = colors.accent;

  const dotSize = size * 0.7;

  switch (styleId) {
    case "classic":
      return (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              backgroundColor: outerBg,
              borderColor: outerBorder,
            },
          ]}
        >
          <View
            style={[
              {
                width: size * 0.56,
                height: size * 0.56,
                borderRadius: (size * 0.56) / 2,
                borderWidth: 1,
                backgroundColor: innerBg,
                borderColor: innerBorder,
              },
            ]}
          />
        </View>
      );
    case "minimal":
      return (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: outerBg,
            },
          ]}
        />
      );
    case "ring":
      return (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 4,
              backgroundColor: "transparent",
              borderColor: ringColor,
            },
          ]}
        />
      );
    case "dot":
      return (
        <View
          style={[
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: outerBg,
            },
          ]}
        />
      );
    default:
      return null;
  }
};

export default function AsistenciaConfigScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isEnabled,
    setEnabled,
    enabledActions,
    toggleAction,
    buttonStyle,
    setButtonStyle,
  } = useAssistive();
  const stylesScrollRef = useRef<ScrollView>(null);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(
    BUTTON_STYLES.findIndex((s) => s.id === buttonStyle),
  );

  const handleStyleSelect = (styleId: ButtonStyleId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setButtonStyle(styleId);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (
      index !== currentStyleIndex &&
      index >= 0 &&
      index < BUTTON_STYLES.length
    ) {
      setCurrentStyleIndex(index);
      handleStyleSelect(BUTTON_STYLES[index].id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header minimalista */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              backgroundColor: `${colors.surface}90`,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          AssistiveTouch
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Carrusel de estilos - Página completa */}
        <View style={styles.stylesSection}>
          <ScrollView
            ref={stylesScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentOffset={{ x: currentStyleIndex * SCREEN_WIDTH, y: 0 }}
          >
            {BUTTON_STYLES.map((style, index) => (
              <View key={style.id} style={styles.styleSlide}>
                <View style={styles.previewContainer}>
                  <ButtonStylePreview
                    styleId={style.id}
                    isDark={isDark}
                    size={PREVIEW_SIZE}
                    colors={colors}
                  />
                </View>
                <Text style={[styles.styleName, { color: colors.text }]}>
                  {style.name}
                </Text>
                <Text
                  style={[
                    styles.styleDesc,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  {style.description}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Indicadores de página */}
          <View style={styles.pageIndicators}>
            {BUTTON_STYLES.map((style, index) => (
              <View
                key={style.id}
                style={[
                  styles.pageIndicator,
                  {
                    backgroundColor:
                      currentStyleIndex === index
                        ? colors.accent
                        : `${colors.accent}40`,
                    width: currentStyleIndex === index ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Toggle principal */}
        <View style={styles.section}>
          <BlurView
            intensity={Platform.OS === "ios" ? 40 : 80}
            tint={isDark ? "dark" : "light"}
            style={styles.blurCard}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: `${colors.surface}B0`,
                },
              ]}
            >
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Activar
                </Text>
                <Switch
                  value={isEnabled}
                  onValueChange={setEnabled}
                  trackColor={{
                    false: `${colors.border}`,
                    true: colors.accent,
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={`${colors.border}`}
                />
              </View>
            </View>
          </BlurView>
        </View>

        {/* Acciones - solo si está habilitado */}
        {isEnabled && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              ACCIONES
            </Text>
            <BlurView
              intensity={Platform.OS === "ios" ? 40 : 80}
              tint={isDark ? "dark" : "light"}
              style={styles.blurCard}
            >
              <View
                style={[
                  styles.actionsCard,
                  {
                    backgroundColor: `${colors.surface}B0`,
                  },
                ]}
              >
                {AVAILABLE_ACTIONS.map((action, index) => (
                  <React.Fragment key={action.id}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.divider,
                          {
                            backgroundColor: `${colors.border}50`,
                          },
                        ]}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.actionRow}
                      onPress={() => toggleAction(action.id)}
                      activeOpacity={0.6}
                    >
                      <View
                        style={[
                          styles.actionIcon,
                          {
                            backgroundColor: `${colors.accent}20`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={action.icon as any}
                          size={18}
                          color={colors.accent}
                        />
                      </View>
                      <Text
                        style={[styles.actionLabel, { color: colors.text }]}
                      >
                        {action.label}
                      </Text>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            backgroundColor: enabledActions.includes(action.id)
                              ? colors.accent
                              : "transparent",
                            borderColor: enabledActions.includes(action.id)
                              ? colors.accent
                              : colors.border,
                          },
                        ]}
                      >
                        {enabledActions.includes(action.id) && (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </BlurView>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            Arrastra el botón a cualquier posición. Se vuelve semi-transparente
            cuando no lo usas.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginRight: 36,
  },
  headerRight: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  stylesSection: {
    marginBottom: 24,
  },
  styleSlide: {
    width: SCREEN_WIDTH,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  previewContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  styleName: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  styleDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  pageIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  pageIndicator: {
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    paddingHorizontal: 16,
  },
  blurCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  card: {
    borderRadius: 16,
    padding: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
