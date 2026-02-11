import { AssistiveAction, useAssistive } from "@/context/assistive-context";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlobalScannerModal from "./global-scanner-modal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUTTON_SIZE = 50;
const DOT_SIZE = 36;

interface MenuActionHandler {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

export default function FloatingAssistButton() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isEnabled, getEnabledActionsList, buttonStyle, triggerCamera } =
    useAssistive();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Ref para el handler de presión (para que panResponder siempre use la versión actualizada)
  const handlePressRef = useRef<() => void>(() => {});

  // Long press para ir a configuración
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const LONG_PRESS_DURATION = 500;
  const routerRef = useRef(router);

  // Mantener routerRef actualizado
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Posición del botón
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - BUTTON_SIZE - 20,
      y: SCREEN_HEIGHT - 200,
    }),
  ).current;

  // Animaciones
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const menuScaleAnim = useRef(new Animated.Value(0)).current;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Renderizar botón según estilo
  const renderButtonContent = () => {
    // Colores más visibles y sólidos
    const outerBg = isDark ? "#3A3A3C" : "#E5E5EA";
    const outerBorder = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
    const innerBg = colors.accent;
    const innerBorder = colors.accent;
    const ringColor = colors.accent;

    switch (buttonStyle) {
      case "classic":
        return (
          <View
            style={[
              buttonStyles.classic,
              { backgroundColor: outerBg, borderColor: outerBorder },
            ]}
          >
            <View
              style={[
                buttonStyles.classicInner,
                { backgroundColor: innerBg, borderColor: innerBorder },
              ]}
            />
          </View>
        );
      case "minimal":
        return (
          <View style={[buttonStyles.minimal, { backgroundColor: outerBg }]} />
        );
      case "ring":
        return <View style={[buttonStyles.ring, { borderColor: ringColor }]} />;
      case "dot":
        return (
          <View style={[buttonStyles.dot, { backgroundColor: outerBg }]} />
        );
      default:
        return (
          <View
            style={[
              buttonStyles.classic,
              { backgroundColor: outerBg, borderColor: outerBorder },
            ]}
          >
            <View
              style={[
                buttonStyles.classicInner,
                { backgroundColor: innerBg, borderColor: innerBorder },
              ]}
            />
          </View>
        );
    }
  };

  // Resetear timer de inactividad
  const resetIdleTimer = () => {
    setIsIdle(false);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
      Animated.timing(opacityAnim, {
        toValue: 0.4,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, 3000);
  };

  useEffect(() => {
    if (isEnabled) {
      resetIdleTimer();
    }
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isEnabled]);

  // Pan responder para arrastrar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        resetIdleTimer();
        isLongPress.current = false;

        // Iniciar timer de long press
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          // Usar push en lugar de replace para mantener el historial de navegación
          routerRef.current.push("/(main)/configuracion/asistencia");
        }, LONG_PRESS_DURATION);

        Animated.spring(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: false,
        }).start();
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        // Cancelar long press si hay movimiento
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        // Actualizar posición
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
        }).start();

        // Snap a los bordes
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        // Limitar Y
        const minY = insets.top + 60;
        const maxY = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 100;
        const clampedY = Math.max(minY, Math.min(maxY, currentY));

        // Snap a izquierda o derecha
        const snapX =
          currentX < SCREEN_WIDTH / 2 ? 16 : SCREEN_WIDTH - BUTTON_SIZE - 16;

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
        }).start();

        // Cancelar timer de long press
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Si no hubo movimiento significativo y no fue long press, ejecutar acción
        if (
          Math.abs(gestureState.dx) < 10 &&
          Math.abs(gestureState.dy) < 10 &&
          !isLongPress.current
        ) {
          handlePressRef.current();
        }
      },
    }),
  ).current;

  // Manejar presión del botón
  const handleButtonPress = () => {
    const actions = getEnabledActionsList();

    // Si solo hay una acción, ejecutarla directamente
    if (actions.length === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const action = actions[0];
      // Ejecutar acción directamente
      if (action.id === "camera") {
        // Si no hay listeners (no estamos en pantalla con scanner), abrir modal global
        const hadListeners = triggerCamera();
        if (!hadListeners) {
          setShowScanner(true);
        }
      } else if (action.id === "refresh") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Trigger refresh en la pantalla actual
      } else if (action.route) {
        router.replace(action.route as any);
      }
    } else {
      // Si hay más de una, abrir el menú
      openMenu();
    }
  };

  // Actualizar el ref cuando cambia la función
  useEffect(() => {
    handlePressRef.current = handleButtonPress;
  });

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMenuOpen(true);
    Animated.spring(menuScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuScaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setIsMenuOpen(false));
    resetIdleTimer();
  };

  // Generar handlers para las acciones habilitadas
  const getActionHandler = (action: AssistiveAction): (() => void) => {
    switch (action.id) {
      case "camera":
        return () => {
          closeMenu();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => {
            const hadListeners = triggerCamera();
            if (!hadListeners) {
              setShowScanner(true);
            }
          }, 200);
        };
      case "refresh":
        return () => {
          closeMenu();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // TODO: Trigger refresh en la pantalla actual
        };
      default:
        return () => {
          closeMenu();
          if (action.route) {
            router.replace(action.route as any);
          }
        };
    }
  };

  // Construir acciones del menú desde el contexto
  const menuActions: MenuActionHandler[] = getEnabledActionsList().map(
    (action) => ({
      id: action.id,
      icon: action.icon as keyof typeof Ionicons.glyphMap,
      label: action.label,
      color: action.color,
      onPress: getActionHandler(action),
    }),
  );

  if (!isEnabled || menuActions.length === 0 || !isAuthenticated) return null;

  const currentButtonSize = buttonStyle === "dot" ? DOT_SIZE : BUTTON_SIZE;

  return (
    <>
      {/* Botón flotante - Estilo dinámico */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingButton,
          {
            width: currentButtonSize,
            height: currentButtonSize,
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        {renderButtonContent()}
      </Animated.View>

      {/* Menú Modal - Estilo iPhone AssistiveTouch */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ scale: menuScaleAnim }],
                opacity: menuScaleAnim,
              },
            ]}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 60 : 100}
              tint={isDark ? "dark" : "light"}
              style={styles.blurContainer}
            >
              <View
                style={[
                  styles.menuContent,
                  {
                    backgroundColor: isDark
                      ? `${colors.surface}C0`
                      : `${colors.surface}E0`,
                  },
                ]}
              >
                {/* Grid circular de acciones */}
                <View style={styles.actionsGrid}>
                  {menuActions.slice(0, 8).map((action, index) => {
                    // Calcular posición en círculo
                    const totalItems = Math.min(menuActions.length, 8);
                    const angle =
                      (index * (360 / totalItems) - 90) * (Math.PI / 180);
                    const radius = 85;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                      <TouchableOpacity
                        key={action.id}
                        style={[
                          styles.actionItem,
                          {
                            transform: [{ translateX: x }, { translateY: y }],
                          },
                        ]}
                        onPress={action.onPress}
                        activeOpacity={0.6}
                      >
                        <View
                          style={[
                            styles.actionIcon,
                            {
                              backgroundColor: isDark
                                ? `${colors.surface}E8`
                                : `${colors.surface}F5`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={action.icon}
                            size={22}
                            color={colors.accent}
                          />
                        </View>
                        <Text
                          style={[styles.actionLabel, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Botón central X para cerrar */}
                  <TouchableOpacity
                    style={[
                      styles.centerButton,
                      {
                        backgroundColor: `${colors.accent}20`,
                        borderColor: `${colors.accent}40`,
                      },
                    ]}
                    onPress={closeMenu}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={28} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Escaneo Global */}
      <GlobalScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
  },
  blurContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
    overflow: "hidden",
  },
  menuContent: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsGrid: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  actionItem: {
    position: "absolute",
    alignItems: "center",
    width: 60,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

// Estilos para los diferentes tipos de botón
const buttonStyles = StyleSheet.create({
  classic: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  classicInner: {
    width: BUTTON_SIZE * 0.56,
    height: BUTTON_SIZE * 0.56,
    borderRadius: (BUTTON_SIZE * 0.56) / 2,
    borderWidth: 1,
  },
  minimal: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
  },
  ring: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 3,
    backgroundColor: "transparent",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
