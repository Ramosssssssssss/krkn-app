import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  onBack: () => void;
  title: string;
  numParadas: number;
  loadingSamsara: boolean;
  mostrarOperadoresMapa: boolean;
  setMostrarOperadoresMapa: (show: boolean) => void;
  mapMode: 'full' | 'half' | 'hidden';
  setMapMode: (mode: 'full' | 'half' | 'hidden') => void;
  colors: any;
  styles: any;
  insets: any;
}

export const Header = ({
  onBack,
  title,
  numParadas,
  loadingSamsara,
  mostrarOperadoresMapa,
  setMostrarOperadoresMapa,
  mapMode,
  setMapMode,
  colors,
  styles,
  insets,
}: HeaderProps) => {
  return (
    <View style={styles.header}>
      <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint={colors.isDark ? "dark" : "light"} style={[styles.headerBlur, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {numParadas} paradas · {loadingSamsara ? "Sincronizando..." : "Samsara Live"}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setMostrarOperadoresMapa(!mostrarOperadoresMapa)}
              style={[styles.backBtn, { backgroundColor: mostrarOperadoresMapa ? colors.accent + "15" : "transparent" }]}
            >
              <Ionicons
                name={mostrarOperadoresMapa ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={mostrarOperadoresMapa ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMapMode(mapMode === "full" ? "half" : "full")}
              style={[styles.backBtn, { backgroundColor: mapMode === "full" ? colors.accent + "15" : "transparent" }]}
            >
              <Ionicons
                name={mapMode === "full" ? "contract-outline" : "expand-outline"}
                size={20}
                color={mapMode === "full" ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  );
};
