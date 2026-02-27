import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Parada, STOP_COLORS } from './types';

interface StopChipsProps {
  paradas: Parada[];
  selectedIdx: number | null;
  onSelect: (index: number) => void;
  colors: any;
  styles: any;
}

export const StopChips = ({
  paradas,
  selectedIdx,
  onSelect,
  colors,
  styles,
}: StopChipsProps) => {
  return (
    <View style={styles.chipsOverlay}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {paradas.map((p, idx) => (
          <TouchableOpacity
            key={p.docto_ve_id}
            onPress={() => onSelect(idx)}
            style={styles.miniChip}
          >
            <BlurView 
              intensity={Platform.OS === 'ios' ? 40 : 100} 
              tint={colors.isDark ? 'dark' : 'light'} 
              style={[
                styles.miniChipBlur,
                {
                  borderColor: selectedIdx === idx ? STOP_COLORS[idx % STOP_COLORS.length] : colors.border,
                  borderWidth: selectedIdx === idx ? 2 : 1,
                }
              ]}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: STOP_COLORS[idx % STOP_COLORS.length], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{idx + 1}</Text>
              </View>
              <Text style={[styles.miniChipText, { color: colors.text }]} numberOfLines={1}>{p.folio}</Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
