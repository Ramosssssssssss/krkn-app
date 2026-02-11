import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";

// Habilitar LayoutAnimation en Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Grid dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_PAD = 16;
const GRID_GAP = 12;
const CARD_W = (SCREEN_WIDTH - GRID_PAD * 2 - GRID_GAP) / 2;

// ==================== TIPOS ====================
export interface SubMenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route?: string; // Ruta directa si no tiene subItems
  subItems?: SubMenuItem[]; // Ahora es opcional
  onPress?: () => void; // Handler custom opcional
}

export interface ModuleGroup {
  id: string;
  title: string;
  icon: string;
  color: string;
  route?: string; // Ruta directa si no tiene modules o solo 1
  subtitle?: string; // Subtítulo opcional para grupos directos
  modules?: ModuleItem[]; // Ahora es opcional
  onPress?: () => void; // Handler custom opcional para el grupo
}

export interface StatItem {
  value: string;
  label: string;
  sublabel?: string;
}

export interface ModuleScreenConfig {
  // Header
  headerIcon: string;
  headerTitle: string;
  headerSubtitle: string;
  // Stats (opcional)
  stats?: StatItem[];
  // Sección
  sectionLabel: string;
  // Grupos
  groups: ModuleGroup[];
}

// ==================== COMPONENTE PRINCIPAL ====================
interface ModuleScreenProps {
  config: ModuleScreenConfig;
}

export default function ModuleScreen({ config }: ModuleScreenProps) {
  const colors = useThemeColors();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleGroup = (group: ModuleGroup) => {
    // Si tiene onPress custom, ejecutarlo
    if (group.onPress) {
      group.onPress();
      return;
    }

    const hasModules = group.modules && group.modules.length > 0;

    // Si no tiene modules, navegar directamente a la ruta del grupo
    if (!hasModules) {
      if (group.route) {
        router.push(group.route as any);
      }
      return;
    }

    // Si tiene modules, expandir/colapsar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === group.id ? null : group.id);
    if (expandedGroup !== group.id) {
      setExpandedModule(null);
    }
  };

  const toggleModule = (module: ModuleItem) => {
    // Si tiene onPress custom, ejecutarlo
    if (module.onPress) {
      module.onPress();
      return;
    }

    const hasSubItems = module.subItems && module.subItems.length > 0;

    // Si no tiene subItems, navegar directamente a la ruta del módulo
    if (!hasSubItems) {
      if (module.route) {
        router.push(module.route as any);
      }
      return;
    }

    // Si el módulo tiene solo un subItem, navegar directamente
    if (module.subItems!.length === 1) {
      router.push(module.subItems![0].route as any);
      return;
    }

    // Si tiene múltiples subItems, expandir/colapsar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModule(expandedModule === module.id ? null : module.id);
  };

  const handleSubItemPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Hero spotlight */}
          <View style={styles.hero}>
            <View
              style={[
                styles.heroIconOuter,
                { backgroundColor: `${colors.accent}10` },
              ]}
            >
              <View
                style={[
                  styles.heroIconInner,
                  { backgroundColor: `${colors.accent}18` },
                ]}
              >
                <Ionicons
                  name={config.headerIcon as any}
                  size={28}
                  color={colors.accent}
                />
              </View>
            </View>
            <View style={styles.heroText}>
              <Text
                style={[styles.heroSubtitle, { color: colors.textSecondary }]}
              >
                {config.headerSubtitle}
              </Text>
              <Text style={[styles.heroCount, { color: colors.textTertiary }]}>
                {config.groups.length}{" "}
                {config.groups.length === 1
                  ? "módulo disponible"
                  : "módulos disponibles"}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          {config.stats && config.stats.length > 0 && (
            <View style={styles.statsRow}>
              {config.stats.map((stat) => (
                <View
                  key={stat.label}
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <StatItemComponent
                    value={stat.value}
                    label={stat.label}
                    sublabel={stat.sublabel || ""}
                    colors={colors}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Section Label */}
          {config.sectionLabel ? (
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              {config.sectionLabel}
            </Text>
          ) : null}

          {/* Grid of Cards */}
          <View style={styles.grid}>
            {config.groups.map((group) => {
              const isExpanded = expandedGroup === group.id;
              const hasModules = group.modules && group.modules.length > 0;

              return (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    isExpanded && {
                      borderColor: group.color,
                      borderWidth: 1.5,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleGroup(group)}
                >
                  <View
                    style={[
                      styles.cardIconWrap,
                      { backgroundColor: `${group.color}14` },
                    ]}
                  >
                    <Ionicons
                      name={group.icon as any}
                      size={26}
                      color={group.color}
                    />
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {group.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textTertiary },
                    ]}
                    numberOfLines={2}
                  >
                    {hasModules
                      ? `${group.modules!.length} ${group.modules!.length === 1 ? "opción" : "opciones"}`
                      : group.subtitle || "Acceso directo"}
                  </Text>
                  {hasModules && (
                    <View
                      style={[
                        styles.cardBadge,
                        { backgroundColor: `${group.color}18` },
                      ]}
                    >
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "grid-outline"}
                        size={12}
                        color={group.color}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Expanded Modules Panel */}
          {config.groups.map((group) => {
            const isExpanded = expandedGroup === group.id;
            const hasModules = group.modules && group.modules.length > 0;
            if (!isExpanded || !hasModules) return null;

            return (
              <View
                key={`${group.id}-modules`}
                style={[
                  styles.expandedPanel,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.expandedHeader}>
                  <View
                    style={[
                      styles.expandedDot,
                      { backgroundColor: group.color },
                    ]}
                  />
                  <Text style={[styles.expandedTitle, { color: colors.text }]}>
                    {group.title}
                  </Text>
                </View>
                {group.modules!.map((module, idx) => {
                  const isModuleExpanded = expandedModule === module.id;
                  const hasSubItems =
                    module.subItems && module.subItems.length > 1;
                  const isLast = idx === group.modules!.length - 1;

                  return (
                    <View key={module.id}>
                      <TouchableOpacity
                        style={styles.moduleRow}
                        activeOpacity={0.6}
                        onPress={() => toggleModule(module)}
                      >
                        <View
                          style={[
                            styles.moduleDot,
                            { backgroundColor: module.color },
                          ]}
                        />
                        <Text
                          style={[styles.moduleText, { color: colors.text }]}
                        >
                          {module.title}
                        </Text>
                        <Ionicons
                          name={
                            hasSubItems
                              ? isModuleExpanded
                                ? "chevron-up"
                                : "chevron-down"
                              : "chevron-forward"
                          }
                          size={14}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                      {isModuleExpanded && hasSubItems && module.subItems && (
                        <View style={styles.subChipsWrap}>
                          {module.subItems.map((sub) => (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.subChip,
                                { borderColor: colors.border },
                              ]}
                              activeOpacity={0.6}
                              onPress={() => handleSubItemPress(sub.route)}
                            >
                              <Ionicons
                                name={sub.icon as any}
                                size={13}
                                color={module.color}
                              />
                              <Text
                                style={[
                                  styles.subChipText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {sub.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {!isLast && (
                        <View
                          style={[
                            styles.moduleSep,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ==================== COMPONENTE STAT ====================
function AnimatedPulse({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: pulseAnim,
        transform: [{ scale: pulseAnim }],
        flexDirection: "row",
        gap: 3,
        alignItems: "center",
        height: 26,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.textTertiary,
          }}
        />
      ))}
    </Animated.View>
  );
}

function StatItemComponent({
  value,
  label,
  sublabel,
  colors,
}: {
  value: string;
  label: string;
  sublabel: string;
  colors: any;
}) {
  const isLoading = value === "...";

  return (
    <View style={styles.statItem}>
      {isLoading ? (
        <AnimatedPulse colors={colors} />
      ) : (
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      )}
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.statSublabel, { color: colors.textTertiary }]}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: GRID_PAD,
    paddingTop: 12,
    paddingBottom: 40,
  },
  // Hero spotlight
  hero: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 14,
  },
  heroIconOuter: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  heroIconInner: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroText: {
    flex: 1,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  heroCount: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  // Stats - individual pills
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
  statSublabel: {
    fontSize: 9,
  },
  // Section
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  // Cards
  card: {
    width: CARD_W,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: CARD_W * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  cardBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  // Expanded modules panel
  expandedPanel: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    overflow: "hidden",
    padding: 4,
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  expandedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  moduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moduleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  moduleSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 30,
  },
  // Sub items as chips
  subChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  subChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
