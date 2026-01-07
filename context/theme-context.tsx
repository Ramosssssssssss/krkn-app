import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@krkn_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Cargar tema guardado al iniciar
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  // Determinar el tema actual
  const theme: 'light' | 'dark' = 
    themeMode === 'system' 
      ? (systemColorScheme ?? 'light') 
      : themeMode;

  const isDark = theme === 'dark';

  // Siempre retornar el Provider, incluso durante loading
  return (
    <ThemeContext.Provider value={{ 
      theme, 
      themeMode, 
      setThemeMode, 
      toggleTheme,
      isDark 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Colores del tema - Paleta unificada y profesional
export const themeColors = {
  light: {
    background: '#F5F5F7',
    surface: '#FFFFFF',
    text: '#1D1D1F',
    textSecondary: '#86868B',
    textTertiary: '#AEAEB2',
    border: '#E5E5EA',
    accent: '#7B2CBF',
    accentLight: 'rgba(123,44,191,0.1)',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    inputBackground: '#FFFFFF',
    buttonDisabled: '#D1D1D6',
    cardShadow: 'rgba(0,0,0,0.04)',
  },
  dark: {
    background: '#050208',
    surface: '#0a0612',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#48484A',
    border: '#1a1024',
    accent: '#9D4EDD',
    accentLight: 'rgba(157,78,221,0.15)',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    inputBackground: '#0a0612',
    buttonDisabled: '#2a1a3a',
    cardShadow: 'rgba(123,44,191,0.2)',
  },
};

export function useThemeColors() {
  const { theme } = useTheme();
  return themeColors[theme];
}
