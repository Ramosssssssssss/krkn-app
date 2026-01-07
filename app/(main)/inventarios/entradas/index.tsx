import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EntradasListScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Empty State */}
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: 'rgba(27, 94, 32, 0.1)' }]}>
          <Ionicons name="document-text-outline" size={40} color="#1B5E20" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin entradas</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hay entradas registradas. Crea tu primera entrada para comenzar.
        </Text>
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: '#1B5E20' }]}
          onPress={() => router.push('/(main)/inventarios/entradas/crear')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Crear entrada</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, flex: 1 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
