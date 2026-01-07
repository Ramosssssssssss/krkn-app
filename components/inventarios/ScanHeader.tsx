import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, Vibration } from 'react-native';

interface ScanHeaderProps {
  color: string;
  aggressiveScan: boolean;
  onToggleScan: (value: boolean) => void;
}

export default function ScanHeader({ color, aggressiveScan, onToggleScan }: ScanHeaderProps) {
  const { isDark } = useTheme();
  const zapAnim = useRef(new Animated.Value(1)).current;
  const zapFlashAnim = useRef(new Animated.Value(0)).current;
  const [showZapFlash, setShowZapFlash] = useState(false);

  const theme = {
    border: isDark ? '#1C1326' : '#E8E8E8',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
  };

  const handleZapPress = () => {
    // Mostrar destello
    setShowZapFlash(true);
    zapFlashAnim.setValue(0);

    // Animación del destello
    Animated.sequence([
      Animated.timing(zapFlashAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(zapFlashAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setShowZapFlash(false));

    // Animación de pulso del icono
    Animated.sequence([
      Animated.timing(zapAnim, {
        toValue: 1.4,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(zapAnim, {
        toValue: 0.85,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(zapAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Vibración corta
    Vibration.vibrate(30);

    onToggleScan(!aggressiveScan);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.headerScanToggle,
          {
            borderColor: aggressiveScan ? color : theme.border,
            backgroundColor: 'transparent',
          },
        ]}
        onPress={handleZapPress}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: zapAnim }] }}>
          <Ionicons
            name={aggressiveScan ? 'flash' : 'flash-outline'}
            size={16}
            color={aggressiveScan ? color : theme.textSecondary}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Destello del Zap */}
      {showZapFlash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.zapFlashOverlay,
            {
              opacity: zapFlashAnim,
              backgroundColor: `${color}40`,
            },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerScanToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  zapFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
