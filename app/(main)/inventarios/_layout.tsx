import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useDrawer } from '../_layout';

export default function InventariosLayout() {
  const colors = useThemeColors();
  const { toggleDrawer } = useDrawer();

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
          title: 'Inventarios',
          headerLeft: () => <MenuButton />,
        }} 
      />
      <Stack.Screen 
        name="entradas/crear" 
        options={{ 
          title: 'Nueva Entrada',
        }} 
      />
      <Stack.Screen 
        name="entradas/index" 
        options={{ 
          title: 'Entradas',
        }} 
      />
      <Stack.Screen 
        name="salidas/crear" 
        options={{ 
          title: 'Nueva Salida',
        }} 
      />
      <Stack.Screen 
        name="salidas/index" 
        options={{ 
          title: 'Salidas',
        }} 
      />
      <Stack.Screen 
        name="recepcion/crear" 
        options={{ 
          title: 'Recepcionar',
        }} 
      />
      <Stack.Screen 
        name="recepcion/index" 
        options={{ 
          title: 'Recepciones',
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
