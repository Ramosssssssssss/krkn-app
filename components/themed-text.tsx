import { StyleSheet, Text, type TextProps } from 'react-native';

import { useFontScale } from '@/context/theme-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const fs = useFontScale();

  // Escalar el estilo base según el tipo
  const getBaseStyle = () => {
    const base = (styles as any)[type] || styles.default;
    return {
      ...base,
      fontSize: fs(base.fontSize),
      lineHeight: base.lineHeight ? fs(base.lineHeight) : undefined,
    };
  };

  return (
    <Text
      style={[
        { color },
        getBaseStyle(),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#7B2CBF',
  },
});
