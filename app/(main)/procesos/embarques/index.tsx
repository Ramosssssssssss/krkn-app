import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Opciones del menú ───────────────────────────────────────────────────────
const MENU_OPTIONS = [
  {
    id: "crear-ruta",
    icon: "add-circle" as const,
    label: "Crear Ruta",
    description: "Planifica y asigna una nueva ruta de entrega",
    color: "#3B82F6",   // azul
    gradient: ["#3B82F6", "#1D4ED8"] as [string, string],
  },
  {
    id: "ver-rutas",
    icon: "map" as const,
    label: "Ver Rutas Disponibles",
    description: "Consulta las rutas activas y pendientes",
    color: "#10B981",   // verde
    gradient: ["#10B981", "#059669"] as [string, string],
  },
];

// ─── Card animada ─────────────────────────────────────────────────────────────
function MenuCard({
  item,
  index,
  colors,
}: {
  item: (typeof MENU_OPTIONS)[0];
  index: number;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          router.push(`/(main)/procesos/embarques/${item.id}` as any);
        }}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: item.color,
          },
        ]}
      >
        {/* Ícono con gradiente */}
        <View style={styles.cardLeft}>
          <LinearGradient
            colors={item.gradient}
            style={styles.iconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={item.icon} size={28} color="#fff" />
          </LinearGradient>
        </View>

        {/* Texto */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {item.label}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function EmbarquesScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* ── Header estilo Apple ── */}
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 100}
        tint={colors.isDark ? "dark" : "light"}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Embarques
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </BlurView>

      {/* ── Contenido ── */}
      <Animated.View
        style={[
          styles.body,
          { paddingTop: 80 + insets.top, opacity: headerFade },
        ]}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: colors.accent + "15" },
            ]}
          >
            <Ionicons name="car-sport" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Gestión de Rutas
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Administra las rutas de salida de mercancía
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            OPCIONES
          </Text>
          <View style={styles.cardsList}>
            {MENU_OPTIONS.map((item, index) => (
              <MenuCard
                key={item.id}
                item={item}
                index={index}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Footer badge */}
        <View style={styles.footer}>
          <View
            style={[
              styles.footerBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="construct-outline"
              size={13}
              color={colors.textTertiary}
            />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Módulo en desarrollo
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerContent: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 10,
  },
  heroIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },

  // Cards
  cardsSection: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
    marginLeft: 4,
  },
  cardsList: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 14,
  },
  cardLeft: {},
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
