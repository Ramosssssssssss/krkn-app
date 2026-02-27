import { useDrawer } from "@/app/(main)/_layout";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getDoctosInvfisSemana } from "@/services/inventarios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Image,
    ImageSourcePropType,
    LayoutAnimation,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Avatares disponibles (mismo que en perfil.tsx)
const AVATARS: { id: string; source: ImageSourcePropType }[] = [
  { id: "a1", source: require("@/assets/images/a1.png") },
  { id: "a2", source: require("@/assets/images/a2.png") },
  { id: "a3", source: require("@/assets/images/a3.png") },
  { id: "a4", source: require("@/assets/images/a4.png") },
  { id: "a5", source: require("@/assets/images/a5.png") },
  { id: "a6", source: require("@/assets/images/a6.png") },
];

export function AvatarDropdown() {
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  
  // Guardamos los documentos completos
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  // Guardamos los que el usuario ha descartado localmente
  const [dismissedDocs, setDismissedDocs] = useState<string[]>([]);
  
  // Filtramos quitando los que el usuario descartó y limitamos a 15
  const visibleDocs = pendingDocs.filter(
    (doc) => !dismissedDocs.includes(doc.FOLIO)
  ).slice(0, 15);
  
  // Derivamos el contador de la longitud del array visible
  const pendingCount = visibleDocs.length;
  
  // Animación para el parpadeo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Flash trigger from layout context (fullscreen overlay lives in MainLayout)
  const { triggerThemeFlash } = useDrawer();

  // Polling para aprobaciones pendientes
  useEffect(() => {
    const checkApprovals = async () => {
      try {
        const doctos = await getDoctosInvfisSemana();
        // Filtrar manualmente tal como se hace en la pantalla de aplicación
        const pendingDocs = doctos.filter(doc => doc.APLICADO !== 'S');
        setPendingDocs(pendingDocs);
        
        // Si hay nuevos y antes no había, o simplemente si hay, avisar con haptic sutil
        if (pendingDocs.length > 0) {
            // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.error("Error polling notifications:", error);
      }
    };

    checkApprovals();
    const interval = setInterval(checkApprovals, 30000); // Cada 30 seg
    return () => clearInterval(interval);
  }, []);

  // Manejar animación de parpadeo
  useEffect(() => {
    if (pendingCount > 0) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current.start();
    } else {
      if (animationRef.current) {
        animationRef.current.stop();
        pulseAnim.setValue(1);
      }
    }
    return () => animationRef.current?.stop();
  }, [pendingCount]);

  // Determinar la fuente del avatar
  const avatarSource = useMemo(() => {
    if (!user?.AVATAR_URL) {
      return require("@/assets/images/avatar.png");
    }

    if (user.AVATAR_URL.startsWith("avatar:")) {
      const avatarId = user.AVATAR_URL.replace("avatar:", "");
      const avatar = AVATARS.find((a) => a.id === avatarId);
      return avatar?.source || require("@/assets/images/avatar.png");
    }

    // Es una URL de imagen
    return { uri: user.AVATAR_URL };
  }, [user?.AVATAR_URL]);

  const menuOptions = [
    {
      icon: "person-outline",
      label: "Perfil",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/configuracion/perfil");
      },
    },
    {
      icon: "chatbubble-outline",
      label: "Chat",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/chats");
      },
    },
    {
      icon: "flash-outline",
      label: "Acción Rápida",
      onPress: () => {
        setIsOpen(false);
        // TODO: Quick action
      },
    },
    {
      icon: "settings-outline",
      label: "Configuración",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/configuracion");
      },
    },
    {
      icon: "log-out-outline",
      label: "Cerrar Sesión",
      color: "#EF4444",
      onPress: () => {
        setIsOpen(false);
        Alert.alert(
          "Cerrar Sesión",
          "¿Estás seguro que deseas cerrar sesión?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Salir",
              style: "destructive",
              onPress: () => {
                logout();
                router.replace("/(auth)/company-code");
              },
            },
          ],
        );
      },
    },
  ];

  return (
    <View style={styles.container}>
      {/* Botón de Notificaciones con Parpadeo */}
      <TouchableOpacity
        onPress={() => setIsNotiOpen(true)}
        activeOpacity={0.7}
        style={[
          styles.iconButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Animated.View style={{ opacity: pulseAnim }}>
            <Ionicons
            name={pendingCount > 0 ? "notifications" : "notifications-outline"}
            size={18}
            color={pendingCount > 0 ? colors.text : colors.accent}
            />
        </Animated.View>
        
        {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: "#FF3B30" }]}>
                <Text style={styles.badgeText}>{pendingCount > 9 ? '+9' : pendingCount}</Text>
            </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isNotiOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotiOpen(false)}
      >
        <TouchableOpacity
          style={[styles.dropdownOverlay, { paddingRight: 55 }]}
          activeOpacity={1}
          onPress={() => setIsNotiOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              { 
                backgroundColor: colors.surface, 
                borderColor: colors.border, 
                maxHeight: 450, 
                width: 280,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: 16
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Notificaciones</Text>
                {pendingCount > 0 && (
                    <TouchableOpacity onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        const newDismissed = [...dismissedDocs, ...visibleDocs.map(d => d.FOLIO)];
                        setDismissedDocs(newDismissed);
                    }}>
                        <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>Limpiar</Text>
                    </TouchableOpacity>
                )}
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
              {pendingCount > 0 ? (
                  visibleDocs.map((doc, index) => (
                    <SwipeableNotification
                        key={doc.DOCTO_INVFIS_ID || index}
                        doc={doc}
                        isLast={index === visibleDocs.length - 1}
                        colors={colors}
                        isDark={isDark}
                        onPress={() => {
                            setIsNotiOpen(false);
                            router.push("/(main)/inventarios/aplicar/aprobaciones");
                        }}
                        onDismiss={(folio: string) => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setDismissedDocs((prev) => [...prev, folio]);
                        }}
                    />
                  ))
              ) : (
                  <View style={[styles.dropdownItem, { justifyContent: 'center', paddingVertical: 40 }]}>
                      <Text style={[styles.dropdownLabel, { color: colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: '500' }]}>
                          No hay notificaciones
                      </Text>
                  </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Botón de Tema */}
      <TouchableOpacity
        onPress={triggerThemeFlash}
        style={[
          styles.iconButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={18}
          color={colors.accent}
        />
      </TouchableOpacity>

      {/* Avatar con Menú */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[
          styles.avatarButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Image source={avatarSource} style={styles.avatarImage} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                   styles.dropdownItem,
                  index < menuOptions.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dropdownIconContainer,
                    {
                      backgroundColor: option.color
                        ? `${option.color}15`
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={option.color || colors.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.dropdownLabel,
                    { color: option.color || colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Platform.OS === "ios" ? 0 : 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Platform.OS === "ios" ? 0 : 8,
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 60,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 200,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});

const SwipeableNotification = ({ doc, isLast, onDismiss, onPress, colors, isDark }: any) => {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dx < -10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) { 
            pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          // Desliza a la izquierda completamente y elimina
          Animated.timing(pan, {
            toValue: -500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss(doc.FOLIO));
        } else {
          // Regresa suavemente a su lugar original
          Animated.spring(pan, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const opacity = pan.interpolate({
      inputRange: [-150, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp'
  });

  return (
    <Animated.View style={[{ opacity, transform: [{ translateX: pan }] }]} {...panResponder.panHandlers}>
      <TouchableOpacity
        style={[
          styles.dropdownItem,
          { backgroundColor: 'transparent' },
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.dropdownIconContainer,
            { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
          ]}
        >
          <Ionicons name="document-text" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.dropdownLabel, { color: colors.text, fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
            Autorización de Inventario
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
            Almacén {doc.ALMACEN_ID} • Folio: {doc.FOLIO}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
