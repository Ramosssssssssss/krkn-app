import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface ProductSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  isSearching: boolean;
  aggressiveScan: boolean;
  color: string;
}

const ProductSearchBar = forwardRef<TextInput, ProductSearchBarProps>(
  ({ value, onChangeText, onSubmitEditing, isSearching, aggressiveScan, color }, ref) => {
    const { isDark } = useTheme();

    const theme = {
      bg: isDark ? '#08050D' : '#FAFAFA',
      surface: isDark ? '#0D0912' : '#FFFFFF',
      border: isDark ? '#1C1326' : '#E8E8E8',
      text: isDark ? '#FFFFFF' : '#1A1A1A',
      textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
      textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    };

    return (
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: theme.bg, borderColor: aggressiveScan ? color : theme.border },
          ]}
        >
          <Ionicons name="barcode-outline" size={18} color={aggressiveScan ? color : theme.textSecondary} />
          <TextInput
            ref={ref}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={aggressiveScan ? 'Esperando escaneo...' : 'Buscar artículo...'}
            placeholderTextColor={theme.textMuted}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            showSoftInputOnFocus={!aggressiveScan}
            blurOnSubmit={false}
            selectTextOnFocus
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={color} />
          ) : value.length > 0 ? (
            <TouchableOpacity onPress={() => onChangeText('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
);

ProductSearchBar.displayName = 'ProductSearchBar';

export default ProductSearchBar;

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
});
