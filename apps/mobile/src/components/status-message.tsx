import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

export function StatusMessage({ message, tone = 'info' }: { readonly message: string; readonly tone?: 'info' | 'error' | 'success' }) {
  const theme = useTheme();
  const color = tone === 'error' ? '#c62828' : tone === 'success' ? '#2e7d32' : theme.textSecondary;
  return <View style={[styles.box, { borderColor: color }]}><ThemedText style={{ color }}>{message}</ThemedText></View>;
}

const styles = StyleSheet.create({ box: { borderWidth: 1, borderRadius: 10, padding: 12 } });
