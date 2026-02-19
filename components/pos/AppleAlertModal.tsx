import { useTheme, useThemeColors } from '@/context/theme-context';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface AppleAlertAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AppleAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  actions: AppleAlertAction[];
  onClose: () => void;
}

export default function AppleAlertModal({ visible, title, message, actions, onClose }: AppleAlertModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        
        <View style={[
          styles.alertContainer, 
          { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFFE6' }
        ]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          </View>

          <View style={[styles.actionsContainer, { borderTopColor: colors.border + '40' }]}>
            {actions.map((action, index) => {
              const isDestructive = action.style === 'destructive';
              const isCancel = action.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionBtn,
                    index > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border + '40' }
                  ]}
                  onPress={() => {
                    action.onPress();
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.actionText,
                    { color: isDestructive ? colors.error : colors.primary },
                    isCancel && { fontWeight: '600' }
                  ]}>
                    {action.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  alertContainer: {
    width: 270,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  actionsContainer: {
    flexDirection: 'column',
    borderTopWidth: 0.5,
  },
  actionBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 17,
    letterSpacing: -0.4,
  },
});
