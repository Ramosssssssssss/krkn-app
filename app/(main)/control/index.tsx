import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const mockModules = [
  {
    id: "procesos",
    title: "Procesos",
    subtitle: "Gestión de procesos",
    icon: "git-branch-outline",
  },
  {
    id: "flujos",
    title: "Flujos",
    subtitle: "Flujos de trabajo",
    icon: "git-merge-outline",
  },
  {
    id: "tareas",
    title: "Tareas",
    subtitle: "Control de tareas",
    icon: "checkbox-outline",
  },
  {
    id: "estados",
    title: "Estados",
    subtitle: "Estados de operación",
    icon: "toggle-outline",
  },
];

export default function ControlIndexScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background modules (blurred) */}
      <View style={styles.backgroundContent}>
        {mockModules.map((item) => (
          <View
            key={item.id}
            style={[
              styles.moduleItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.moduleIcon,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color={colors.accent}
              />
            </View>
            <View style={styles.moduleContent}>
              <Text style={[styles.moduleTitle, { color: colors.text + "99" }]}>
                {item.title}
              </Text>
              <Text
                style={[styles.moduleSubtitle, { color: colors.textTertiary }]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </View>
        ))}
      </View>

      {/* Fullscreen Blur Overlay */}
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={50}
          tint={isDark ? "dark" : "light"}
          style={styles.fullscreenBlur}
        >
          <View style={styles.mysteryContent}>
            <View
              style={[
                styles.glowCircle,
                {
                  backgroundColor: colors.accent + "30",
                  borderColor: colors.accent + "60",
                },
              ]}
            >
              <Ionicons name="toggle-outline" size={48} color={colors.text} />
            </View>
            <Text style={[styles.mysteryTitle, { color: colors.text }]}>
              Control
            </Text>
            <Text
              style={[styles.mysterySubtitle, { color: colors.textSecondary }]}
            >
              Próximamente
            </Text>
            <View style={styles.dotsContainer}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 1 },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 0.6 },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 0.3 },
                ]}
              />
            </View>
          </View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.fullscreenBlurAndroid,
            {
              backgroundColor: isDark
                ? "rgba(13, 5, 25, 0.94)"
                : "rgba(255, 255, 255, 0.94)",
            },
          ]}
        >
          <View style={styles.mysteryContent}>
            <View
              style={[
                styles.glowCircle,
                {
                  backgroundColor: colors.accent + "30",
                  borderColor: colors.accent + "60",
                },
              ]}
            >
              <Ionicons name="toggle-outline" size={48} color={colors.text} />
            </View>
            <Text style={[styles.mysteryTitle, { color: colors.text }]}>
              Control
            </Text>
            <Text
              style={[styles.mysterySubtitle, { color: colors.textSecondary }]}
            >
              Próximamente
            </Text>
            <View style={styles.dotsContainer}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 1 },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 0.6 },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, opacity: 0.3 },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContent: {
    padding: 16,
    gap: 12,
    paddingTop: 20,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  moduleContent: {
    flex: 1,
    marginLeft: 14,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  moduleSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  fullscreenBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenBlurAndroid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  mysteryContent: {
    alignItems: "center",
  },
  glowCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  mysteryTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  mysterySubtitle: {
    fontSize: 15,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
