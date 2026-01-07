import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const menuItems = [
  { id: 'carga', title: 'Carga Masiva', subtitle: 'Importar datos', icon: 'cloud-upload-outline' },
  { id: 'exportar', title: 'Exportar', subtitle: 'Descargar datos', icon: 'cloud-download-outline' },
  { id: 'plantillas', title: 'Plantillas', subtitle: 'Formatos de carga', icon: 'document-outline' },
  { id: 'historial', title: 'Historial', subtitle: 'Cargas anteriores', icon: 'time-outline' },
];

export default function MasivosScreen() {
  const colors = useThemeColors();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, index !== menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            activeOpacity={0.6}
          >
            <View style={[styles.icon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name={item.icon as any} size={20} color={colors.accent} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemSubtitle: { fontSize: 13, marginTop: 1 },
});
