import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MercadoPagoScreen() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="card-outline" size={48} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Mercado Pago</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Próximamente...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  placeholder: { padding: 40, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14 },
});
