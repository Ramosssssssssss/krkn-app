import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

interface MapControlsProps {
  visible: boolean;
  onRecenter: () => void;
  onRefreshSamsara: () => void;
  colors: any;
  styles: any;
}

export const MapControls = ({
  visible,
  onRecenter,
  onRefreshSamsara,
  colors,
  styles,
}: MapControlsProps) => {
  if (!visible) return null;

  return (
    <View style={styles.mapControls}>
      <TouchableOpacity
        onPress={onRecenter}
        style={styles.mapControlBtn}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={colors.isDark ? 'dark' : 'light'} style={styles.controlBlur}>
          <Ionicons name="navigate-outline" size={24} color={colors.accent} />
        </BlurView>
      </TouchableOpacity>
      <TouchableOpacity
         onPress={onRefreshSamsara}
         style={styles.mapControlBtn}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={colors.isDark ? 'dark' : 'light'} style={styles.controlBlur}>
          <Ionicons name="refresh" size={24} color="#34C759" />
        </BlurView>
      </TouchableOpacity>
    </View>
  );
};
