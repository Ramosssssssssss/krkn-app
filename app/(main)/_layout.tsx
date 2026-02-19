import { AvatarDropdown } from "@/components/avatar-dropdown";
import { ScreenSaver } from "@/components/ScreenSaver";
import { SurveillanceManager } from "@/components/SurveillanceManager";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack, usePathname } from "expo-router";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    Dimensions,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DRAWER_WIDTH = 240;

type MenuItemType = {
  name: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const menuItems: MenuItemType[] = [
  { name: "index", labelKey: "nav.home", icon: "home-outline" },
  { name: "aduana", labelKey: "nav.customs", icon: "airplane-outline" },
  { name: "aplicaciones", labelKey: "nav.apps", icon: "apps-outline" },
  { name: "auditoria", labelKey: "nav.audit", icon: "search-outline" },
  { name: "catalogos", labelKey: "nav.catalogs", icon: "cube-outline" },
  { name: "control", labelKey: "nav.control", icon: "toggle-outline" },
  {
    name: "integracion",
    labelKey: "nav.integrations",
    icon: "git-network-outline",
  },
  {
    name: "inventarios",
    labelKey: "nav.inventory",
    icon: "file-tray-stacked-outline",
  },
  { name: "kpis", labelKey: "nav.kpis", icon: "bar-chart-outline" },
  // { name: 'masivos', labelKey: 'nav.bulk', icon: 'layers-outline' },
  { name: "planeacion", labelKey: "nav.planeacion", icon: "calendar-outline" },

  { name: "procesos", labelKey: "nav.processes", icon: "sync-outline" },
  { name: "reportes", labelKey: "nav.reports", icon: "document-text-outline" },
  { name: "tableros", labelKey: "nav.boards", icon: "document-text-outline" },
  { name: "pos", labelKey: "nav.pos", icon: "cash-outline" },
];

// Contexto para el drawer
type DrawerContextType = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  triggerThemeFlash: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => { },
  closeDrawer: () => { },
  toggleDrawer: () => { },
  triggerThemeFlash: () => { },
});

export const useDrawer = () => useContext(DrawerContext);

function DrawerContent({
  onClose,
  isVisible,
}: {
  onClose: () => void;
  isVisible: boolean;
}) {
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    if (isVisible) setRenderKey((k) => k + 1);
  }, [isVisible]);
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const { companyCode, user, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Saludo según hora del día
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12)
      return { text: "Buenos días", icon: "sunny-outline" as const };
    if (h >= 12 && h < 19)
      return { text: "Buenas tardes", icon: "partly-sunny-outline" as const };
    return { text: "Buenas noches", icon: "moon-outline" as const };
  };
  const greeting = getGreeting();
  // Preferir USERNAME sobre NOMBRE (que puede ser el rol, ej: "ADMINISTRADOR")
  const rawName = user?.USERNAME || user?.NOMBRE || "";
  const firstName =
    rawName.split(" ")[0].charAt(0).toUpperCase() +
    rawName.split(" ")[0].slice(1).toLowerCase();

  const handleLogout = () => {
    logout();
    onClose();
    router.replace("/(auth)/company-code");
  };

  const isActive = (name: string) => {
    if (name === "index")
      return (
        pathname === "/(main)" ||
        pathname === "/(main)/index" ||
        pathname === "/"
      );
    return pathname.includes(name);
  };

  const navigateTo = (name: string) => {
    onClose();
    if (name === "index") {
      router.push("/(main)");
    } else {
      router.push(`/(main)/${name}` as any);
    }
  };

  return (
    <View
      style={[styles.drawerContainer, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.drawerHeader,
          {
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 20) + 10,
          },
        ]}
      >
        <View style={styles.headerInfo}>
          <View style={styles.greetingRow}>
            <Ionicons
              name={greeting.icon}
              size={18}
              color={colors.accent}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.greetingText, { color: colors.textSecondary }]}
            >
              {greeting.text}
            </Text>
          </View>
          <Text
            style={[styles.brandName, { color: colors.text }]}
            numberOfLines={1}
          >
            {firstName || "Usuario"}
          </Text>
          <Text style={[styles.companyTag, { color: colors.textTertiary }]}>
            {companyCode}.krkn.mx
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => {
            const active = isActive(item.name);
            const isNewSection = item.name === "pos";

            return (
              <React.Fragment key={`${item.name}-${renderKey}`}>
                {isNewSection && (
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionHeaderText, { color: colors.textTertiary }]}>
                      {t("nav.new_section")}
                    </Text>
                  </View>
                )}
                <Animated.View
                  entering={FadeIn.delay(80 + index * 40).duration(300)}
                >
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      active && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => navigateTo(item.name)}
                    activeOpacity={0.7}
                  >
                    {active && (
                      <View
                        style={[
                          styles.activeBar,
                          { backgroundColor: colors.accent },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.menuIconBox,
                        active && { backgroundColor: `${colors.accent}18` },
                      ]}
                    >
                      <Ionicons
                        name={
                          active
                            ? (item.icon.replace("-outline", "") as any)
                            : item.icon
                        }
                        size={20}
                        color={active ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuLabel,
                        { color: active ? colors.text : colors.textSecondary },
                        active && styles.menuLabelActive,
                      ]}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.drawerFooter,
          {
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 4,
          },
        ]}
      >
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => {
              onClose();
              router.push("/(main)/configuracion/perfil");
            }}
          >
            <View
              style={[
                styles.circularButton,
                { backgroundColor: colors.surface },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>
              Perfil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => {
              onClose();
              router.push("/(main)/configuracion");
            }}
          >
            <View
              style={[
                styles.circularButton,
                { backgroundColor: colors.surface },
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>
              Ajustes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerItem} onPress={handleLogout}>
            <View style={[styles.circularButton, styles.logoutCircularButton]}>
              <Ionicons name="log-out-outline" size={18} color="#FF453A" />
            </View>
            <Text style={[styles.footerLabel, { color: "#FF453A" }]}>
              Salir
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const colors = useThemeColors();
  const { isDark, toggleTheme } = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerProgress = useSharedValue(0);

  // — Screensaver / Inactivity
  const { isIdle, onActivity, dismiss } = useInactivityTimer(true);

  // PanResponder to detect ANY touch on the whole screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        onActivity();
        return false; // don't steal touches
      },
      onMoveShouldSetPanResponderCapture: () => {
        onActivity();
        return false;
      },
    }),
  ).current;

  // — Circular reveal theme transition (Magic UI style)
  const DIAGONAL = Math.sqrt(SCREEN_WIDTH ** 2 + SCREEN_HEIGHT ** 2);
  const CIRCLE_SIZE = DIAGONAL * 2;
  // Origin: theme toggle button position (top-right)
  const ORIGIN_X = SCREEN_WIDTH - 75;
  const ORIGIN_Y = Platform.OS === "ios" ? 58 : 32;

  const revealProgress = useSharedValue(0);
  const [revealColor, setRevealColor] = useState("#000");
  const [showReveal, setShowReveal] = useState(false);
  const themeToggled = useRef(false);

  const revealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revealProgress.value }],
    opacity: revealProgress.value > 0 ? 1 : 0,
  }));

  const triggerThemeFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    themeToggled.current = false;
    setRevealColor(isDark ? "#F5F5F7" : "#050208");
    setShowReveal(true);
    revealProgress.value = 0;

    revealProgress.value = withTiming(
      1,
      { duration: 450, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(setShowReveal)(false);
        }
      },
    );

    // Toggle when circle covers the screen
    setTimeout(() => {
      if (!themeToggled.current) {
        themeToggled.current = true;
        toggleTheme();
      }
    }, 280);
  }, [isDark, toggleTheme, revealProgress]);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    drawerProgress.value = withTiming(1, { duration: 250 });
  };

  const closeDrawer = () => {
    drawerProgress.value = withTiming(0, { duration: 200 });
    setTimeout(() => setIsDrawerOpen(false), 200);
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          drawerProgress.value,
          [0, 1],
          [-DRAWER_WIDTH, 0],
        ),
      },
    ],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value * 0.5,
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          drawerProgress.value,
          [0, 1],
          [0, DRAWER_WIDTH * 0.3],
        ),
      },
      { scale: interpolate(drawerProgress.value, [0, 1], [1, 0.95]) },
    ],
    borderRadius: interpolate(drawerProgress.value, [0, 1], [0, 20]),
  }));

  return (
    <DrawerContext.Provider
      value={{
        isOpen: isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        triggerThemeFlash,
      }}
    >
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
        {...panResponder.panHandlers}
      >
        {/* Main Screen */}
        <Animated.View style={[styles.screenContainer, screenAnimatedStyle]}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTintColor: colors.text,
              headerTitleStyle: {
                fontWeight: "700",
                fontSize: 17,
              },
              headerShadowVisible: false,
              headerLeft: () => (
                <TouchableOpacity
                  onPress={toggleDrawer}
                  style={styles.menuButton}
                  activeOpacity={0.6}
                >
                  <Ionicons name="menu" size={22} color={colors.text} />
                </TouchableOpacity>
              ),
              headerRight: () => <AvatarDropdown />,
            }}
          >
            <Stack.Screen name="index" options={{ title: "Home" }} />
            <Stack.Screen name="catalogos" options={{ headerShown: false }} />
            <Stack.Screen name="inventarios" options={{ headerShown: false }} />
            <Stack.Screen name="aduana" options={{ headerShown: false }} />
            <Stack.Screen name="auditoria" options={{ headerShown: false }} />
            <Stack.Screen name="kpis" options={{ headerShown: false }} />
            <Stack.Screen name="chats" options={{ headerShown: false }} />
            <Stack.Screen name="reportes" options={{ headerShown: false }} />
            <Stack.Screen name="masivos" options={{ headerShown: false }} />
            <Stack.Screen name="procesos" options={{ headerShown: false }} />
            <Stack.Screen name="integracion" options={{ headerShown: false }} />
            <Stack.Screen
              name="aplicaciones"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="tableros" options={{ headerShown: false }} />
            <Stack.Screen name="control" options={{ headerShown: false }} />
            <Stack.Screen name="planeacion" options={{ headerShown: false }} />
            <Stack.Screen name="pos" options={{ headerShown: false }} />
            <Stack.Screen
              name="configuracion"
              options={{ headerShown: false }}
            />
          </Stack>
        </Animated.View>

        {/* Overlay */}
        {isDrawerOpen && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={closeDrawer}
          >
            <Animated.View
              style={[styles.overlayBackground, overlayAnimatedStyle]}
            />
          </TouchableOpacity>
        )}

        {/* Drawer */}
        {isDrawerOpen && (
          <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
            <DrawerContent onClose={closeDrawer} isVisible={isDrawerOpen} />
          </Animated.View>
        )}
        {/* Circular reveal */}
        {showReveal && (
          <Animated.View
            style={[
              {
                position: "absolute",
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: CIRCLE_SIZE / 2,
                backgroundColor: revealColor,
                left: ORIGIN_X - CIRCLE_SIZE / 2,
                top: ORIGIN_Y - CIRCLE_SIZE / 2,
                zIndex: 9999,
              },
              revealStyle,
            ]}
            pointerEvents="none"
          />
        )}

        {/* Surveillance spying mode POC */}
        <SurveillanceManager />

        {/* Screensaver */}
        <ScreenSaver visible={isIdle} onDismiss={dismiss} />
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    overflow: "hidden",
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "#000",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  headerInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  companyTag: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  closeButton: {
    padding: 4,
  },
  menuScrollView: {
    flex: 1,
  },
  menuSection: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
    position: "relative",
    overflow: "hidden",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  menuLabelActive: {
    fontWeight: "700",
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },
  footerItem: {
    alignItems: "center",
    gap: 4,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  circularButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutCircularButton: {
    backgroundColor: "rgba(255, 69, 58, 0.1)",
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
