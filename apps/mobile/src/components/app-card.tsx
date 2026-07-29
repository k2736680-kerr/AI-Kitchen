import { StyleSheet, View, type ViewProps } from 'react-native';
import type { PropsWithChildren } from 'react';
import { Palette, Radius, Shadows, Spacing } from '@/constants/theme';

export function AppCard({ children, style, ...props }: PropsWithChildren<ViewProps>) { return <View style={[styles.card, style]} {...props}>{children}</View>; }
export const SurfaceCard = AppCard;
const styles = StyleSheet.create({ card: { backgroundColor: Palette.surface, borderRadius: Radius.card, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: '#EDF0EA', ...Shadows.card } });
