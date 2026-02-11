import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// Morado muy oscuro para los iconos blurred
const DARK_PURPLE = '#2D1B4E';

const mockModules = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Vista general', icon: 'grid-outline' },
  { id: 'ventas', title: 'Ventas', subtitle: 'Métricas de ventas', icon: 'trending-up-outline' },
  { id: 'inventario', title: 'Inventario', subtitle: 'Indicadores de stock', icon: 'pie-chart-outline' },
  { id: 'operaciones', title: 'Operaciones', subtitle: 'Eficiencia operativa', icon: 'analytics-outline' },
  { id: 'finanzas', title: 'Finanzas', subtitle: 'Indicadores financieros', icon: 'cash-outline' },
];

export default function KpisIndexScreen() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background modules (blurred) */}
      <View style={styles.backgroundContent}>
        {mockModules.map((item) => (
          <View
            key={item.id}
            style={[styles.moduleItem, { backgroundColor: DARK_PURPLE, borderColor: '#3D2B5E' }]}
          >
            <View style={[styles.moduleIcon, { backgroundColor: 'rgba(157, 78, 221, 0.2)' }]}>
              <Ionicons name={item.icon as any} size={22} color="#7C3AED" />
            </View>
            <View style={styles.moduleContent}>
              <Text style={[styles.moduleTitle, { color: 'rgba(255,255,255,0.6)' }]}>{item.title}</Text>
              <Text style={[styles.moduleSubtitle, { color: 'rgba(255,255,255,0.3)' }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
          </View>
        ))}
      </View>

      {/* Fullscreen Blur Overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={50} tint="dark" style={styles.fullscreenBlur}>
          <View style={styles.mysteryContent}>
            <View style={styles.glowCircle}>
              <Ionicons name="stats-chart" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.mysteryTitle}>KPIs</Text>
            <Text style={styles.mysterySubtitle}>Próximamente</Text>
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, { opacity: 1 }]} />
              <View style={[styles.dot, { opacity: 0.6 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
            </View>
          </View>
        </BlurView>
      ) : (
        <View style={styles.fullscreenBlurAndroid}>
          <View style={styles.mysteryContent}>
            <View style={styles.glowCircle}>
              <Ionicons name="stats-chart" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.mysteryTitle}>KPIs</Text>
            <Text style={styles.mysterySubtitle}>Próximamente</Text>
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, { opacity: 1 }]} />
              <View style={[styles.dot, { opacity: 0.6 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleContent: {
    flex: 1,
    marginLeft: 14,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  moduleSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  fullscreenBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBlurAndroid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 5, 25, 0.94)',
  },
  mysteryContent: {
    alignItems: 'center',
  },
  glowCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  mysteryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  mysterySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
});
