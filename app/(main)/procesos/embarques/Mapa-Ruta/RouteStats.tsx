import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface RouteStatsProps {
  visible: boolean;
  routeStats: { duration: number; distance: number } | null;
  colors: any;
  styles: any;
}

export const RouteStats = ({
  visible,
  routeStats,
  colors,
  styles,
}: RouteStatsProps) => {
  if (!visible || !routeStats) return null;

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.statsBadge}>
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={colors.isDark ? 'dark' : 'light'} style={styles.statsBlur}>
        <View style={styles.statsRow}>
          <Ionicons name="time" size={16} color="#FF9500" />
          <Text style={[styles.statsText, { color: colors.text }]}>
            {routeStats.duration > 60 
              ? `${Math.floor(routeStats.duration / 60)}h ${Math.round(routeStats.duration % 60)}m` 
              : `${Math.round(routeStats.duration)} min`}
          </Text>
        </View>
        <View style={[styles.statsRow, { marginTop: 4 }]}>
          <Ionicons name="navigate" size={16} color="#3B82F6" />
          <Text style={[styles.statsText, { color: colors.text }]}>{routeStats.distance.toFixed(1)} km</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};
