import { AvatarDropdown } from '@/components/avatar-dropdown';
import { useLanguage } from '@/context/language-context';
import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useDrawer } from '../_layout';

export default function IntegracionLayout() {
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
          title: t('nav.integrations'),
          headerLeft: () => <MenuButton />,
          headerRight: () => <AvatarDropdown />,
        }} 
      />
      <Stack.Screen name="skydropx/index" options={{ title: 'Skydropx' }} />
      <Stack.Screen name="mercadopago/index" options={{ title: 'Mercado Pago' }} />
      <Stack.Screen name="samsara/index" options={{ title: 'Samsara' }} />
      <Stack.Screen name="stripe/index" options={{ title: 'Stripe' }} />
      <Stack.Screen name="zkteco/index" options={{ title: 'ZKTeco' }} />
      <Stack.Screen name="api-docs/endpoints" options={{ title: 'Endpoints / APIs' }} />
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
