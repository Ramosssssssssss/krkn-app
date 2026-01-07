import { useAuth } from '@/context/auth-context';
import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, usePathname } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

type MenuItemType = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const menuItems: MenuItemType[] = [
  { name: 'index', label: 'Home', icon: 'home-outline' },
  { name: 'catalogo', label: 'Catálogo', icon: 'cube-outline' },
  { name: 'inventarios', label: 'Inventarios', icon: 'file-tray-stacked-outline' },
  { name: 'aduana', label: 'Aduana', icon: 'airplane-outline' },
  { name: 'auditoria', label: 'Auditoría', icon: 'search-outline' },
  { name: 'kpis', label: 'KPIs', icon: 'bar-chart-outline' },
  { name: 'chats', label: 'Chats', icon: 'chatbubble-outline' },
  { name: 'reportes', label: 'Reportes', icon: 'document-text-outline' },
  { name: 'masivos', label: 'Masivos', icon: 'layers-outline' },
  { name: 'integracion', label: 'Integración', icon: 'git-network-outline' },
  { name: 'aplicaciones', label: 'Aplicaciones', icon: 'apps-outline' },
];

// Contexto para el drawer
type DrawerContextType = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

function DrawerContent({ onClose }: { onClose: () => void }) {
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { companyCode, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    onClose();
    router.replace('/(auth)/company-code');
  };

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/(main)' || pathname === '/(main)/index' || pathname === '/';
    return pathname.includes(name);
  };

  const navigateTo = (name: string) => {
    onClose();
    if (name === 'index') {
      router.push('/(main)');
    } else {
      router.push(`/(main)/${name}` as any);
    }
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.logoContainer, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
          <Text style={[styles.logoText, { color: isDark ? '#000000' : '#FFFFFF' }]}>K</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.brandName, { color: colors.text }]}>KRKN WMS</Text>
          <Text style={[styles.companyName, { color: colors.textSecondary }]}>
            {companyCode}.krkn.mx
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {menuItems.map((item) => {
            const active = isActive(item.name);
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.menuItem,
                  active && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                ]}
                onPress={() => navigateTo(item.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={active ? colors.accent : colors.textSecondary}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    { color: active ? colors.text : colors.textSecondary },
                    active && styles.menuLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                {active && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: colors.surface }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.textSecondary}
          />
          <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>
            {isDark ? 'Modo Claro' : 'Modo Oscuro'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF453A" />
          <Text style={[styles.footerButtonText, { color: '#FF453A' }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const colors = useThemeColors();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerProgress = useSharedValue(0);

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
      { translateX: interpolate(drawerProgress.value, [0, 1], [-DRAWER_WIDTH, 0]) }
    ],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value * 0.5,
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [0, DRAWER_WIDTH * 0.3]) },
      { scale: interpolate(drawerProgress.value, [0, 1], [1, 0.95]) },
    ],
    borderRadius: interpolate(drawerProgress.value, [0, 1], [0, 20]),
  }));

  return (
    <DrawerContext.Provider value={{ isOpen: isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Main Screen */}
        <Animated.View style={[styles.screenContainer, screenAnimatedStyle]}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTintColor: colors.text,
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
              headerShadowVisible: false,
              headerLeft: () => (
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="menu-outline" size={20} color={colors.text} />
                </TouchableOpacity>
              ),
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="catalogo" options={{ title: 'Catálogo' }} />
            <Stack.Screen name="inventarios" options={{ headerShown: false }} />
            <Stack.Screen name="aduana" options={{ title: 'Aduana' }} />
            <Stack.Screen name="auditoria" options={{ title: 'Auditoría' }} />
            <Stack.Screen name="kpis" options={{ title: 'KPIs' }} />
            <Stack.Screen name="chats" options={{ title: 'Chats' }} />
            <Stack.Screen name="reportes" options={{ title: 'Reportes' }} />
            <Stack.Screen name="masivos" options={{ title: 'Masivos' }} />
            <Stack.Screen name="integracion" options={{ title: 'Integración' }} />
            <Stack.Screen name="aplicaciones" options={{ title: 'Aplicaciones' }} />
          </Stack>
        </Animated.View>

        {/* Overlay */}
        {isDrawerOpen && (
          <TouchableOpacity 
            style={styles.overlay} 
            activeOpacity={1} 
            onPress={closeDrawer}
          >
            <Animated.View style={[styles.overlayBackground, overlayAnimatedStyle]} />
          </TouchableOpacity>
        )}

        {/* Drawer */}
        {isDrawerOpen && (
          <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
            <DrawerContent onClose={closeDrawer} />
          </Animated.View>
        )}
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
    overflow: 'hidden',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  companyName: {
    fontSize: 13,
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuLabelActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
});
