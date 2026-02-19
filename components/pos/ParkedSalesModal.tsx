import { ParkedSale, useParkedSales } from '@/context/pos/parked-sales-context';
import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ParkedSalesModalProps {
  visible: boolean;
  onClose: () => void;
  onResume: (sale: ParkedSale) => void;
}

export default function ParkedSalesModal({ visible, onClose, onResume }: ParkedSalesModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { parkedSales, removeParkedSale } = useParkedSales();

  const renderItem = ({ item }: { item: ParkedSale }) => {
    const totalQty = item.items.reduce((sum, it) => sum + it.cantidad, 0);
    const date = new Date(item.timestamp).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor: colors.border }]}
        onPress={() => onResume(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>{item.client.nombre}</Text>
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
              {date} • {totalQty} {totalQty === 1 ? 'artículo' : 'artículos'}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.total, { color: colors.text }]}>${item.total.toFixed(2)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.deleteIndicator}
          onPress={() => removeParkedSale(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error + '99'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[
          styles.content, 
          { 
            backgroundColor: isDark ? '#1C1C1E' : '#FFF',
            borderTopColor: colors.border 
          }
        ]}>
          <View style={styles.header}>
            <View style={[styles.headerLine, { backgroundColor: colors.textTertiary + '40' }]} />
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>Ventas en Espera</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Pausa compras y atiende a otros clientes.
            </Text>
          </View>

          <FlatList
            data={parkedSales}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.textTertiary + '10' }]}>
                  <Ionicons name="pause-outline" size={32} color={colors.textTertiary} />
                </View>
                <Text style={[styles.emptyTxt, { color: colors.textTertiary }]}>Nada en pausa por ahora</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  content: {
    height: '75%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    paddingTop: 12,
    ...Platform.select({
      ios: { 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: -12 }, 
        shadowOpacity: 0.15, 
        shadowRadius: 24 
      },
      android: { elevation: 20 },
    }),
  },
  header: { paddingHorizontal: 28, paddingBottom: 12 },
  headerLine: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#8888', alignSelf: 'center', marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginTop: 4, fontWeight: '500', opacity: 0.7 },
  closeBtn: { padding: 4 },
  list: { padding: 20, paddingBottom: 60, gap: 12 },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  clientName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  cardMeta: { fontSize: 13, fontWeight: '500' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  total: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  deleteIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
});
