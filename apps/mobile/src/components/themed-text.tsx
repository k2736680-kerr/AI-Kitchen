import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & { type?: 'default' | 'title' | 'pageTitle' | 'sectionTitle' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code'; themeColor?: ThemeColor };

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  pageTitle: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  link: { lineHeight: 22, fontSize: 14 },
  linkPrimary: { lineHeight: 22, fontSize: 14, color: '#4F8062', fontWeight: '600' },
  code: { fontFamily: Fonts.mono, fontWeight: Platform.select({ android: '700' }) ?? '500', fontSize: 12 },
});
