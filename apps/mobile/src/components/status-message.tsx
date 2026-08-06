import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function StatusMessage({ message, tone = 'info' }: { readonly message: string; readonly tone?: 'info' | 'error' | 'success' | 'warning' }) {
  const theme = useTheme();
  const presentation = tone === 'error'
    ? { backgroundColor: theme.dangerSurface, borderColor: theme.dangerBorder }
    : tone === 'warning'
      ? { backgroundColor: theme.warningSurface, borderColor: theme.warningBorder }
      : tone === 'success'
        ? { backgroundColor: theme.backgroundSelected, borderColor: theme.successBorder }
        : { backgroundColor: theme.backgroundSelected, borderColor: theme.border };
  return <View accessibilityRole={tone === 'error' ? 'alert' : 'text'} style={[styles.box, presentation]}><ThemedText type="small" style={{ color: theme.textSecondary }}>{message}</ThemedText></View>;
}
export const InlineNotice = StatusMessage;
const styles = StyleSheet.create({ box: { borderRadius: Radius.input, padding: Spacing.sm, borderWidth: 1 } });
