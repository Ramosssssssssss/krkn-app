import { AvatarDropdown } from '@/components/avatar-dropdown';
import { useLanguage } from '@/context/language-context';
import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useDrawer } from '../_layout';

export default function CatalogosLayout() {
  const colors = useThemeColors();
  const { toggleDrawer } = useDrawer();
  const { t } = useLanguage();

  const MenuButton = () => (
    <TouchableOpacity 
      onPress={toggleDrawer} 
      style={[
        styles.menuButton, 
        { backgroundColor: colors.surface, borderColor: colors.border }
      ]}
    >
      <Ionicons name="menu-outline" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { 
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { 
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { 
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: t('catalogs.title'),
          headerLeft: () => <MenuButton />,
          headerRight: () => <AvatarDropdown />,
        }} 
      />
      <Stack.Screen 
        name="almacenes/buscar" 
        options={{ 
          title: t('catalogs.searchWarehouses'),
        }} 
      />
      <Stack.Screen 
        name="articulos/index" 
        options={{ 
          title: t('catalogs.articles'),
        }} 
      />
      <Stack.Screen 
        name="articulos/buscar" 
        options={{ 
          title: t('catalogs.searchArticles'),
        }} 
      />
      <Stack.Screen 
        name="complementos/precios" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/precios/index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/lineas" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/lineas/index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/grupolineas" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/grupolineas/index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/marcas" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/marcas/index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/clasificadores" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="complementos/clasificadores/index" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
