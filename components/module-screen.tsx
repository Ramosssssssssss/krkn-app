    
import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { borderColor: colors.border }]}>
              <Ionicons name={config.headerIcon as any} size={20} color={colors.accent} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{config.headerTitle}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
                {config.headerSubtitle}
              </Text>
            </View>
          </View>

          {/* Quick Stats (opcional) */}
          {config.stats && config.stats.length > 0 && (
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LinearGradient
                colors={['transparent', `${colors.accent}50`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardGlow}
              />
              <View style={styles.statsGrid}>
                {config.stats.map((stat, index) => (
                  <React.Fragment key={stat.label}>
                    <StatItemComponent 
                      value={stat.value} 
                      label={stat.label} 
                      sublabel={stat.sublabel || ''} 
                      colors={colors} 
                    />
                    {index < config.stats!.length - 1 && (
                      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Section Label */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{config.sectionLabel}</Text>

          {/* Groups */}
          {config.groups.map((group) => {
            const isGroupExpanded = expandedGroup === group.id;
            const hasModules = group.modules && group.modules.length > 0;
            
            return (
              <View 
                key={group.id} 
                style={[
                  styles.groupCard, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: isGroupExpanded ? colors.accent : colors.border,
                  }
                ]}
              >
                {/* Group Header */}
                <TouchableOpacity
                  style={styles.groupHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleGroup(group)}
                >
                  <View style={[styles.groupIcon, { backgroundColor: `${group.color}15` }]}>
                    <Ionicons name={group.icon as any} size={22} color={group.color} />
                  </View>
                  <View style={styles.groupContent}>
                    <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                    <Text style={[styles.groupSubtitle, { color: colors.textTertiary }]}>
                      {hasModules 
                        ? `${group.modules!.length} ${group.modules!.length === 1 ? 'opción disponible' : 'opciones disponibles'}`
                        : group.subtitle || 'Acceso directo'
                      }
                    </Text>
                  </View>
                  {hasModules ? (
                    <Ionicons 
                      name={isGroupExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={isGroupExpanded ? group.color : colors.textTertiary} 
                    />
                  ) : (
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={colors.textTertiary} 
                    />
                  )}
                </TouchableOpacity>

                {/* Modules inside group - Solo si tiene módulos */}
                {isGroupExpanded && hasModules && (
                  <View style={[styles.modulesContainer, { borderTopColor: colors.border }]}>
                    {group.modules!.map((module) => {
                      const isModuleExpanded = expandedModule === module.id;
                      const hasSubItems = module.subItems && module.subItems.length > 1;
                      
                      return (
                        <View key={module.id} style={styles.moduleWrapper}>
                          {/* Module Item */}
                          <TouchableOpacity
                            style={[
                              styles.moduleItem,
                              isModuleExpanded && hasSubItems && { backgroundColor: `${module.color}08` }
                            ]}
                            activeOpacity={0.7}
                            onPress={() => toggleModule(module)}
                          >
                            <View style={[styles.moduleIcon, { backgroundColor: `${module.color}15` }]}>
                              <Ionicons name={module.icon as any} size={18} color={module.color} />
                            </View>
                            <View style={styles.moduleContent}>
                              <View style={styles.moduleTitleRow}>
                                <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
                                <View style={[styles.colorDot, { backgroundColor: module.color }]} />
                              </View>
                              <Text style={[styles.moduleSubtitle, { color: colors.textTertiary }]}>{module.subtitle}</Text>
                            </View>
                            {hasSubItems ? (
                              <Ionicons 
                                name={isModuleExpanded ? 'chevron-up' : 'chevron-down'} 
                                size={16} 
                                color={isModuleExpanded ? module.color : colors.textTertiary} 
                              />
                            ) : (
                              <Ionicons 
                                name="chevron-forward" 
                                size={16} 
                                color={colors.textTertiary} 
                              />
                            )}
                          </TouchableOpacity>

                          {/* Sub Items - Solo si tiene más de 1 */}
                          {isModuleExpanded && hasSubItems && module.subItems && (
                            <View style={[styles.subItemsContainer, { borderTopColor: colors.border }]}>
                              {module.subItems.map((subItem, subIndex) => (
                                <TouchableOpacity
                                  key={subItem.id}
                                  style={[
                                    styles.subItem,
                                    subIndex !== module.subItems!.length - 1 && { 
                                      borderBottomWidth: 1, 
                                      borderBottomColor: colors.border 
                                    }
                                  ]}
                                  activeOpacity={0.6}
                                  onPress={() => handleSubItemPress(subItem.route)}
                                >
                                  <Ionicons name={subItem.icon as any} size={14} color={module.color} />
                                  <Text style={[styles.subItemTitle, { color: colors.text }]}>{subItem.title}</Text>
                                  <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footer, { color: colors.textTertiary }]}>KRKN WMS v1.0.0</Text>
      </View>
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
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={{ 
        opacity: pulseAnim, 
        transform: [{ scale: pulseAnim }],
        flexDirection: 'row',
        gap: 3,
        alignItems: 'center',
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
            backgroundColor: colors.textTertiary 
          }} 
        />
      ))}
    </Animated.View>
  );
}

function StatItemComponent({ value, label, sublabel, colors }: { 
  value: string; 
  label: string; 
  sublabel: string;
  colors: any;
}) {
  const isLoading = value === '...';
  
  return (
    <View style={styles.statItem}>
      {isLoading ? (
        <AnimatedPulse colors={colors} />
      ) : (
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      )}
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.statSublabel, { color: colors.textTertiary }]}>{sublabel}</Text>
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
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  // Stats
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingVertical: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statSublabel: {
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 36,
    alignSelf: 'center',
  },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
    marginLeft: 4,
  },
  // Group Cards
  groupCard: { 
    borderRadius: 14, 
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  groupHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14,
  },
  groupIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  groupContent: { 
    flex: 1, 
    marginLeft: 12,
  },
  groupTitle: { 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupSubtitle: { 
    fontSize: 12, 
    marginTop: 2,
  },
  // Modules Container
  modulesContainer: {
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  moduleWrapper: {
    marginHorizontal: 8,
  },
  moduleItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12,
    borderRadius: 10,
  },
  moduleIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  moduleContent: { 
    flex: 1, 
    marginLeft: 12,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: { 
    fontSize: 14, 
    fontWeight: '600',
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moduleSubtitle: { 
    fontSize: 11, 
    marginTop: 2,
  },
  // Sub Items
  subItemsContainer: {
    borderTopWidth: 1,
    marginLeft: 48,
    marginTop: 4,
    marginBottom: 8,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  subItemTitle: { 
    flex: 1, 
    fontSize: 13, 
    fontWeight: '500',
  },
  // Footer
  footerContainer: {
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footer: {
    fontSize: 11,
  },
});
