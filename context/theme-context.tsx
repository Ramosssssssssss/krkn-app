import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "system";

// Definir los temas de color disponibles
export type ColorTheme =
  | "default" // Morado KRKN original
  | "ocean" // Azul océano
  | "forest" // Verde bosque
  | "sunset" // Naranja atardecer
  | "cherry" // Rosa cereza
  | "cyberpunk" // Neón cyberpunk
  | "coffee" // Café/marrón
  | "industrial" // Naranja Industrial (WMS)
  | "crimson" // Rojo carmesí
  | string; // Para temas personalizados (ID dinámico)

export interface ThemeInfo {
  id: ColorTheme;
  name: string;
  emoji: string;
  preview: {
    light: { accent: string; background: string };
    dark: { accent: string; background: string };
  };
}

// Info de cada tema para mostrar en la UI
export const themeList: ThemeInfo[] = [
  {
    id: "default",
    name: "KRKN",
    emoji: "💜",
    preview: {
      light: { accent: "#7B2CBF", background: "#F5F5F7" },
      dark: { accent: "#9D4EDD", background: "#050208" },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    preview: {
      light: { accent: "#0EA5E9", background: "#F0F9FF" },
      dark: { accent: "#38BDF8", background: "#020617" },
    },
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    preview: {
      light: { accent: "#059669", background: "#F0FDF4" },
      dark: { accent: "#34D399", background: "#022C22" },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    preview: {
      light: { accent: "#EA580C", background: "#FFF7ED" },
      dark: { accent: "#FB923C", background: "#1C0A00" },
    },
  },
  {
    id: "cherry",
    name: "Cherry",
    emoji: "🌸",
    preview: {
      light: { accent: "#DB2777", background: "#FDF2F8" },
      dark: { accent: "#F472B6", background: "#1A0312" },
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    emoji: "⚡",
    preview: {
      light: { accent: "#06B6D4", background: "#ECFEFF" },
      dark: { accent: "#22D3EE", background: "#0A0A0A" },
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌙",
    preview: {
      light: { accent: "#4F46E5", background: "#EEF2FF" },
      dark: { accent: "#818CF8", background: "#030712" },
    },
  },
  {
    id: "coffee",
    name: "Coffee",
    emoji: "☕",
    preview: {
      light: { accent: "#92400E", background: "#FFFBEB" },
      dark: { accent: "#D97706", background: "#1C1410" },
    },
  },
  {
    id: "industrial",
    name: "Industrial",
    emoji: "🏗️",
    preview: {
      light: { accent: "#F59E0B", background: "#F8FAFC" },
      dark: { accent: "#FCD34D", background: "#0F172A" },
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    emoji: "🔴",
    preview: {
      light: { accent: "#B91C1C", background: "#FEF2F2" },
      dark: { accent: "#F87171", background: "#1C0808" },
    },
  },
];

// Colores completos por tema
export const colorThemes = {
  default: {
    light: {
      background: "#F5F5F7",
      surface: "#FFFFFF",
      text: "#1D1D1F",
      textSecondary: "#86868B",
      textTertiary: "#AEAEB2",
      border: "#E5E5EA",
      accent: "#7B2CBF",
      accentLight: "rgba(123,44,191,0.1)",
      success: "#34C759",
      warning: "#FF9500",
      error: "#FF3B30",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#D1D1D6",
      cardShadow: "rgba(0,0,0,0.04)",
    },
    dark: {
      background: "#050208",
      surface: "#0a0612",
      text: "#FFFFFF",
      textSecondary: "#8E8E93",
      textTertiary: "#48484A",
      border: "#1a1024",
      accent: "#9D4EDD",
      accentLight: "rgba(157,78,221,0.15)",
      success: "#30D158",
      warning: "#FF9F0A",
      error: "#FF453A",
      inputBackground: "#0a0612",
      buttonDisabled: "#2a1a3a",
      cardShadow: "rgba(123,44,191,0.2)",
    },
  },
  ocean: {
    light: {
      background: "#F0F9FF",
      surface: "#FFFFFF",
      text: "#0C4A6E",
      textSecondary: "#64748B",
      textTertiary: "#94A3B8",
      border: "#E0F2FE",
      accent: "#0EA5E9",
      accentLight: "rgba(14,165,233,0.1)",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#CBD5E1",
      cardShadow: "rgba(14,165,233,0.08)",
    },
    dark: {
      background: "#020617",
      surface: "#0F172A",
      text: "#F8FAFC",
      textSecondary: "#94A3B8",
      textTertiary: "#475569",
      border: "#1E293B",
      accent: "#38BDF8",
      accentLight: "rgba(56,189,248,0.15)",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      inputBackground: "#0F172A",
      buttonDisabled: "#334155",
      cardShadow: "rgba(56,189,248,0.2)",
    },
  },
  forest: {
    light: {
      background: "#F0FDF4",
      surface: "#FFFFFF",
      text: "#14532D",
      textSecondary: "#4B5563",
      textTertiary: "#9CA3AF",
      border: "#D1FAE5",
      accent: "#059669",
      accentLight: "rgba(5,150,105,0.1)",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#D1D5DB",
      cardShadow: "rgba(5,150,105,0.08)",
    },
    dark: {
      background: "#022C22",
      surface: "#064E3B",
      text: "#ECFDF5",
      textSecondary: "#A7F3D0",
      textTertiary: "#6EE7B7",
      border: "#065F46",
      accent: "#34D399",
      accentLight: "rgba(52,211,153,0.15)",
      success: "#6EE7B7",
      warning: "#FCD34D",
      error: "#FCA5A5",
      inputBackground: "#064E3B",
      buttonDisabled: "#047857",
      cardShadow: "rgba(52,211,153,0.2)",
    },
  },
  sunset: {
    light: {
      background: "#FFF7ED",
      surface: "#FFFFFF",
      text: "#7C2D12",
      textSecondary: "#78716C",
      textTertiary: "#A8A29E",
      border: "#FFEDD5",
      accent: "#EA580C",
      accentLight: "rgba(234,88,12,0.1)",
      success: "#22C55E",
      warning: "#EAB308",
      error: "#DC2626",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#D6D3D1",
      cardShadow: "rgba(234,88,12,0.08)",
    },
    dark: {
      background: "#1C0A00",
      surface: "#2A1810",
      text: "#FFF7ED",
      textSecondary: "#FDBA74",
      textTertiary: "#FB923C",
      border: "#431407",
      accent: "#FB923C",
      accentLight: "rgba(251,146,60,0.15)",
      success: "#4ADE80",
      warning: "#FACC15",
      error: "#F87171",
      inputBackground: "#2A1810",
      buttonDisabled: "#57534E",
      cardShadow: "rgba(251,146,60,0.2)",
    },
  },
  cherry: {
    light: {
      background: "#FDF2F8",
      surface: "#FFFFFF",
      text: "#831843",
      textSecondary: "#6B7280",
      textTertiary: "#9CA3AF",
      border: "#FCE7F3",
      accent: "#DB2777",
      accentLight: "rgba(219,39,119,0.1)",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#D1D5DB",
      cardShadow: "rgba(219,39,119,0.08)",
    },
    dark: {
      background: "#1A0312",
      surface: "#2D0A1E",
      text: "#FDF2F8",
      textSecondary: "#F9A8D4",
      textTertiary: "#F472B6",
      border: "#500724",
      accent: "#F472B6",
      accentLight: "rgba(244,114,182,0.15)",
      success: "#4ADE80",
      warning: "#FBBF24",
      error: "#FCA5A5",
      inputBackground: "#2D0A1E",
      buttonDisabled: "#831843",
      cardShadow: "rgba(244,114,182,0.2)",
    },
  },
  cyberpunk: {
    light: {
      background: "#ECFEFF",
      surface: "#FFFFFF",
      text: "#164E63",
      textSecondary: "#64748B",
      textTertiary: "#94A3B8",
      border: "#CFFAFE",
      accent: "#06B6D4",
      accentLight: "rgba(6,182,212,0.1)",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#CBD5E1",
      cardShadow: "rgba(6,182,212,0.08)",
    },
    dark: {
      background: "#0A0A0A",
      surface: "#141414",
      text: "#00FFFF",
      textSecondary: "#22D3EE",
      textTertiary: "#67E8F9",
      border: "#1F1F1F",
      accent: "#22D3EE",
      accentLight: "rgba(34,211,238,0.15)",
      success: "#00FF7F",
      warning: "#FFFF00",
      error: "#FF0055",
      inputBackground: "#141414",
      buttonDisabled: "#2D2D2D",
      cardShadow: "rgba(34,211,238,0.3)",
    },
  },
  midnight: {
    light: {
      background: "#EEF2FF",
      surface: "#FFFFFF",
      text: "#312E81",
      textSecondary: "#6366F1",
      textTertiary: "#A5B4FC",
      border: "#E0E7FF",
      accent: "#4F46E5",
      accentLight: "rgba(79,70,229,0.1)",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#C7D2FE",
      cardShadow: "rgba(79,70,229,0.08)",
    },
    dark: {
      background: "#030712",
      surface: "#111827",
      text: "#F9FAFB",
      textSecondary: "#A5B4FC",
      textTertiary: "#6366F1",
      border: "#1F2937",
      accent: "#818CF8",
      accentLight: "rgba(129,140,248,0.15)",
      success: "#4ADE80",
      warning: "#FBBF24",
      error: "#F87171",
      inputBackground: "#111827",
      buttonDisabled: "#374151",
      cardShadow: "rgba(129,140,248,0.2)",
    },
  },
  coffee: {
    light: {
      background: "#FFFBEB",
      surface: "#FFFFFF",
      text: "#451A03",
      textSecondary: "#78716C",
      textTertiary: "#A8A29E",
      border: "#FEF3C7",
      accent: "#92400E",
      accentLight: "rgba(146,64,14,0.1)",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#D6D3D1",
      cardShadow: "rgba(146,64,14,0.08)",
    },
    dark: {
      background: "#1C1410",
      surface: "#292018",
      text: "#FFFBEB",
      textSecondary: "#FCD34D",
      textTertiary: "#FBBF24",
      border: "#3D2E1F",
      accent: "#D97706",
      accentLight: "rgba(217,119,6,0.15)",
      success: "#4ADE80",
      warning: "#FDE047",
      error: "#FCA5A5",
      inputBackground: "#292018",
      buttonDisabled: "#57534E",
      cardShadow: "rgba(217,119,6,0.2)",
    },
  },
  industrial: {
    light: {
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      textSecondary: "#64748B",
      textTertiary: "#94A3B8",
      border: "#E2E8F0",
      accent: "#F59E0B",
      accentLight: "rgba(245,158,11,0.1)",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#CBD5E1",
      cardShadow: "rgba(245,158,11,0.08)",
    },
    dark: {
      background: "#0F172A",
      surface: "#1E293B",
      text: "#F8FAFC",
      textSecondary: "#94A3B8",
      textTertiary: "#475569",
      border: "#334155",
      accent: "#FCD34D",
      accentLight: "rgba(252,211,77,0.15)",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      inputBackground: "#1E293B",
      buttonDisabled: "#334155",
      cardShadow: "rgba(252,211,77,0.2)",
    },
  },
  crimson: {
    light: {
      background: "#FEF2F2",
      surface: "#FFFFFF",
      text: "#450A0A",
      textSecondary: "#78716C",
      textTertiary: "#A8A29E",
      border: "#FECACA",
      accent: "#B91C1C",
      accentLight: "rgba(185,28,28,0.1)",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#DC2626",
      inputBackground: "#FFFFFF",
      buttonDisabled: "#E7E5E4",
      cardShadow: "rgba(185,28,28,0.08)",
    },
    dark: {
      background: "#1C0808",
      surface: "#2A1010",
      text: "#FEF2F2",
      textSecondary: "#FCA5A5",
      textTertiary: "#F87171",
      border: "#450A0A",
      accent: "#F87171",
      accentLight: "rgba(248,113,113,0.15)",
      success: "#4ADE80",
      warning: "#FBBF24",
      error: "#FCA5A5",
      inputBackground: "#2A1010",
      buttonDisabled: "#57534E",
      cardShadow: "rgba(248,113,113,0.2)",
    },
  },
};

interface ThemeContextType {
  theme: "light" | "dark";
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  isOoledMode: boolean;
  isHighContrast: boolean;
  uiScale: number;
  customThemes: ThemeInfo[];
  customColorThemes: Record<string, any>;
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setOoledMode: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setUiScale: (scale: number) => void;
  addCustomTheme: (
    theme: ThemeInfo,
    colors: { light: any; dark: any },
  ) => Promise<void>;
  deleteCustomTheme: (id: string) => Promise<void>;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@krkn_theme_mode";
const COLOR_THEME_STORAGE_KEY = "@krkn_color_theme";
const OLED_MODE_KEY = "@krkn_oled_mode";
const HIGH_CONTRAST_KEY = "@krkn_high_contrast";
const UI_SCALE_KEY = "@krkn_ui_scale";
const CUSTOM_THEMES_INFO_KEY = "@krkn_custom_themes_info";
const CUSTOM_THEMES_COLORS_KEY = "@krkn_custom_themes_colors";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [isOoledMode, setOoledModeState] = useState(false);
  const [isHighContrast, setHighContrastState] = useState(false);
  const [uiScale, setUiScaleState] = useState(1.0);
  const [customThemes, setCustomThemes] = useState<ThemeInfo[]>([]);
  const [customColorThemes, setCustomColorThemes] = useState<
    Record<string, any>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // Cargar tema guardado al iniciar
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const [
        savedTheme,
        savedColorTheme,
        savedOoled,
        savedContrast,
        savedScale,
        savedCustomInfo,
        savedCustomColors,
      ] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(COLOR_THEME_STORAGE_KEY),
        AsyncStorage.getItem(OLED_MODE_KEY),
        AsyncStorage.getItem(HIGH_CONTRAST_KEY),
        AsyncStorage.getItem(UI_SCALE_KEY),
        AsyncStorage.getItem(CUSTOM_THEMES_INFO_KEY),
        AsyncStorage.getItem(CUSTOM_THEMES_COLORS_KEY),
      ]);

      if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
      if (savedColorTheme) setColorThemeState(savedColorTheme as ColorTheme);
      if (savedOoled) setOoledModeState(savedOoled === "true");
      if (savedContrast) setHighContrastState(savedContrast === "true");
      if (savedScale) setUiScaleState(parseFloat(savedScale));

      if (savedCustomInfo) setCustomThemes(JSON.parse(savedCustomInfo));
      if (savedCustomColors)
        setCustomColorThemes(JSON.parse(savedCustomColors));
    } catch (error) {
      console.log("Error loading theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomTheme = async (
    theme: ThemeInfo,
    colors: { light: any; dark: any },
  ) => {
    const newThemes = [...customThemes, theme];
    const newColors = { ...customColorThemes, [theme.id]: colors };

    setCustomThemes(newThemes);
    setCustomColorThemes(newColors);

    await AsyncStorage.setItem(
      CUSTOM_THEMES_INFO_KEY,
      JSON.stringify(newThemes),
    );
    await AsyncStorage.setItem(
      CUSTOM_THEMES_COLORS_KEY,
      JSON.stringify(newColors),
    );
  };

  const deleteCustomTheme = async (id: string) => {
    const newThemes = customThemes.filter((t) => t.id !== id);
    const newColors = { ...customColorThemes };
    delete newColors[id];

    setCustomThemes(newThemes);
    setCustomColorThemes(newColors);

    if (colorTheme === id) {
      setColorTheme("default");
    }

    await AsyncStorage.setItem(
      CUSTOM_THEMES_INFO_KEY,
      JSON.stringify(newThemes),
    );
    await AsyncStorage.setItem(
      CUSTOM_THEMES_COLORS_KEY,
      JSON.stringify(newColors),
    );
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const setColorTheme = async (theme: ColorTheme) => {
    setColorThemeState(theme);
    await AsyncStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  };

  const setOoledMode = async (enabled: boolean) => {
    setOoledModeState(enabled);
    await AsyncStorage.setItem(OLED_MODE_KEY, String(enabled));
  };

  const setHighContrast = async (enabled: boolean) => {
    setHighContrastState(enabled);
    await AsyncStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
  };

  const setUiScale = async (scale: number) => {
    setUiScaleState(scale);
    await AsyncStorage.setItem(UI_SCALE_KEY, String(scale));
  };

  const toggleTheme = () => {
    const newMode = theme === "dark" ? "light" : "dark";
    setThemeMode(newMode);
  };

  // Determinar el tema actual
  const theme: "light" | "dark" =
    themeMode === "system" ? (systemColorScheme ?? "light") : themeMode;

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        colorTheme,
        isOoledMode,
        isHighContrast,
        uiScale,
        customThemes,
        customColorThemes,
        setThemeMode,
        setColorTheme,
        setOoledMode,
        setHighContrast,
        setUiScale,
        addCustomTheme,
        deleteCustomTheme,
        toggleTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useCombinedThemes() {
  const { customThemes } = useTheme();
  return [...themeList, ...customThemes];
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function useThemeScale() {
  const { uiScale } = useTheme();
  return (size: number) => Math.round(size * uiScale);
}

/**
 * Hook para escalar fuentes según el uiScale del usuario.
 * Retorna un objeto con tamaños escalados para uso directo.
 * Ejemplo: const fs = useFontScale(); <Text style={{ fontSize: fs(16) }}>
 */
export function useFontScale() {
  const { uiScale } = useTheme();
  const scale = (size: number) => Math.round(size * uiScale);
  return scale;
}

// Mantener compatibilidad con el código existente
export const themeColors = colorThemes.default;

export function useThemeColors() {
  const { theme, colorTheme, isOoledMode, isHighContrast, customThemes } =
    useTheme();
  const { customColorThemes } = useContext(ThemeContext) as any;

  // Buscar en temas predefinidos o personalizados
  let baseColors = (colorThemes as any)[colorTheme]?.[theme];
  if (!baseColors && customColorThemes[colorTheme]) {
    baseColors = customColorThemes[colorTheme][theme];
  }

  if (!baseColors) {
    baseColors = colorThemes.default[theme];
  }

  // Procesar colores basados en configuraciones
  let colors = { ...baseColors };

  if (theme === "dark" && isOoledMode) {
    colors.background = "#000000";
    colors.surface = "#000000";
    colors.inputBackground = "#050505";
  }

  if (isHighContrast) {
    colors.textSecondary = colors.text;
    colors.border = theme === "dark" ? "#FFFFFF" : "#000000";
    colors.accentLight = colors.accent + "40";
  }

  // Token para efectos de desenfoque/glass
  (colors as any).glass =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return colors as any;
}
