import { useTheme } from '@/context/theme-context';
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

interface SubMenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  subItems: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { 
    id: 'entradas', 
    title: 'Entradas', 
    subtitle: 'Ingresos de mercancía', 
    icon: 'arrow-down-outline',
    color: '#22C55E',
    subItems: [
      { id: 'crear-entrada', title: 'Crear entrada', icon: 'add-outline', route: '/(main)/inventarios/entradas/crear' },
      { id: 'ver-entradas', title: 'Historial', icon: 'time-outline', route: '/(main)/inventarios/entradas' },
    ]
  },
  { 
    id: 'salidas', 
    title: 'Salidas', 
    subtitle: 'Egresos de mercancía', 
    icon: 'arrow-up-outline',
    color: '#EF4444',
    subItems: [
      { id: 'crear-salida', title: 'Crear salida', icon: 'add-outline', route: '/(main)/inventarios/salidas/crear' },
      { id: 'ver-salidas', title: 'Historial', icon: 'time-outline', route: '/(main)/inventarios/salidas' },
    ]
  },
  { 
    id: 'recepcion', 
    title: 'Recepción', 
    subtitle: 'Recibir mercancía', 
    icon: 'cube-outline',
    color: '#3B82F6',
    subItems: [
      { id: 'recepcionar', title: 'Nueva recepción', icon: 'scan-outline', route: '/(main)/inventarios/recepcion' },
      { id: 'ver-recepciones', title: 'Historial', icon: 'time-outline', route: '/(main)/inventarios/recepcion' },
    ]
  },
];

export default function InventariosIndexScreen() {
  const { isDark } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E8E8E8',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
    accentBg: isDark ? 'rgba(157,78,221,0.12)' : 'rgba(157,78,221,0.08)',
  };
  
  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItem(expandedItem === id ? null : id);
  };

  const handleSubItemPress = (route: string) => {
    router.push(route as any);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { borderColor: theme.border }]}>
              <Ionicons name="layers-outline" size={20} color={theme.accent} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Inventarios</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
                Gestiona el flujo de mercancía
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <LinearGradient
              colors={['transparent', `${theme.accent}50`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGlow}
            />
            <View style={styles.statsGrid}>
              <StatItem value="0" label="Entradas" sublabel="hoy" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <StatItem value="0" label="Salidas" sublabel="hoy" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <StatItem value="0" label="Pendientes" sublabel="" theme={theme} />
            </View>
          </View>

          {/* Section Label */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>MÓDULOS</Text>

          {/* Menu Items */}
          {menuItems.map((item) => {
            const isExpanded = expandedItem === item.id;
            
            return (
              <View 
                key={item.id} 
                style={[
                  styles.card, 
                  { 
                    backgroundColor: theme.surface, 
                    borderColor: isExpanded ? theme.accent : theme.border,
                  }
                ]}
              >
                {/* Main Item */}
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(item.id)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <View style={styles.menuTitleRow}>
                      <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    </View>
                    <Text style={[styles.menuSubtitle, { color: theme.textMuted }]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={isExpanded ? item.color : theme.textMuted} 
                  />
                </TouchableOpacity>

                {/* Sub Items */}
                {isExpanded && (
                  <View style={[styles.subItemsContainer, { borderTopColor: theme.border }]}>
                    {item.subItems.map((subItem, subIndex) => (
                      <TouchableOpacity
                        key={subItem.id}
                        style={[
                          styles.subItem,
                          subIndex !== item.subItems.length - 1 && { 
                            borderBottomWidth: 1, 
                            borderBottomColor: theme.border 
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleSubItemPress(subItem.route)}
                      >
                        <Ionicons name={subItem.icon as any} size={16} color={theme.textMuted} />
                        <Text style={[styles.subItemTitle, { color: theme.text }]}>{subItem.title}</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerContainer, { borderTopColor: theme.border }]}>
        <Text style={[styles.footer, { color: theme.textMuted }]}>KRKN WMS v1.0.0</Text>
      </View>
    </View>
  );
}

function StatItem({ value, label, sublabel, theme }: { 
  value: string; 
  label: string; 
  sublabel: string;
  theme: any;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.statSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
      ) : null}
    </View>
  );
}

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
  // Cards
  card: { 
    borderRadius: 14, 
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14,
  },
  menuIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  menuContent: { 
    flex: 1, 
    marginLeft: 12,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: { 
    fontSize: 15, 
    fontWeight: '600',
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuSubtitle: { 
    fontSize: 12, 
    marginTop: 2,
  },
  // Sub Items
  subItemsContainer: {
    borderTopWidth: 1,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 52,
    gap: 10,
  },
  subItemTitle: { 
    flex: 1, 
    fontSize: 14, 
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
