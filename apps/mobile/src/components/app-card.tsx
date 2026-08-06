import { StyleSheet, View, type ViewProps } from 'react-native';
import type { PropsWithChildren } from 'react';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AppCard({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]} {...props}>{children}</View>;
}
export const SurfaceCard = AppCard;
const styles = StyleSheet.create({ card: { borderRadius: Radius.card, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, ...Shadows.card } });
