import { View, StyleSheet } from 'react-native';
import type { PropsWithChildren } from 'react';

import { useTheme } from '@/hooks/use-theme';

export function AppCard({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>;
}

const styles = StyleSheet.create({ card: { borderRadius: 16, padding: 16, gap: 12 } });
