import { useAuth } from '@/context/auth-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isAuthenticated, companyCode } = useAuth();

  useEffect(() => {
    // Usar router.replace en vez de Redirect para mejor control
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(main)');
      } else if (companyCode) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(auth)/company-code');
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, companyCode]);

  // Mostrar loading mientras redirige
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
