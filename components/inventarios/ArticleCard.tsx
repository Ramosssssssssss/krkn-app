import { useTheme } from '@/context/theme-context';
import { ArticuloDetalle } from '@/types/inventarios';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface ArticleCardProps {
  item: ArticuloDetalle;
  index: number;
  color: string;
  isFlashing?: boolean;
  flashAnim?: Animated.Value;
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onEdit?: (key: string) => void;
}

export default function ArticleCard({
  item,
  index,
  color,
  isFlashing,
  flashAnim,
  onUpdateQuantity,
  onRemove,
  onEdit,
}: ArticleCardProps) {
  const { isDark } = useTheme();

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E8E8E8',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
  };

  const renderRightActions = () => (
    <View style={styles.swipeActionsContainer}>
      {onEdit && (
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeActionEdit]}
          onPress={() => {
            Alert.alert('Editar', `Editar ${item.clave}`);
            if (onEdit) onEdit(item._key);
          }}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.swipeActionText}>Editar</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionDelete]}
        onPress={() => onRemove(item._key)}
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Animated.View
        style={[
          styles.articleItem,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity:
              isFlashing && flashAnim
                ? flashAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.5],
                  })
                : 1,
          },
        ]}
      >
        <View style={styles.articleInfo}>
          <Text style={[styles.articleClave, { color }]}>{item.clave}</Text>
          <Text style={[styles.articleDesc, { color: theme.text }]} numberOfLines={2}>
            {item.descripcion}
          </Text>
          {item.umed && (
            <Text style={[styles.articleUmed, { color: theme.textSecondary }]}>{item.umed}</Text>
          )}
        </View>

        <View style={styles.articleActions}>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.border }]}
              onPress={() => onUpdateQuantity(item._key, -1)}
            >
              <Ionicons name="remove" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.text }]}>{item.cantidad}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: color }]}
              onPress={() => onUpdateQuantity(item._key, 1)}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  articleInfo: {
    flex: 1,
    marginRight: 10,
  },
  articleClave: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  articleUmed: {
    fontSize: 10,
    marginTop: 2,
  },
  articleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginRight: 16,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '100%',
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  swipeActionEdit: {
    backgroundColor: '#3B82F6',
  },
  swipeActionDelete: {
    backgroundColor: '#EF4444',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
