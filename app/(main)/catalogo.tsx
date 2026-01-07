import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const menuItems: MenuItem[] = [
  { id: 'almacenes', title: 'Almacenes', subtitle: 'Ubicaciones y bodegas', icon: 'business-outline' },
  { id: 'articulos', title: 'Artículos', subtitle: 'Productos y SKUs', icon: 'cube-outline' },
  { id: 'precios', title: 'Precios', subtitle: 'Listas y tarifas', icon: 'pricetag-outline' },
  { id: 'linea-articulos', title: 'Línea de Artículos', subtitle: 'Clasificación', icon: 'list-outline' },
  { id: 'grupo-lineas', title: 'Grupo de Líneas', subtitle: 'Agrupaciones', icon: 'layers-outline' },
  { id: 'marcas', title: 'Marcas', subtitle: 'Marcas comerciales', icon: 'bookmark-outline' },
];

export default function CatalogoScreen() {
  const { isDark } = useTheme();
  const colors = useThemeColors();

  const handleMenuPress = (item: MenuItem) => {
    console.log('Pressed:', item.id);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Menu List */}
      <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              index !== menuItems.length - 1 && [styles.menuItemBorder, { borderBottomColor: colors.border }]
            ]}
            onPress={() => handleMenuPress(item)}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name={item.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
});
