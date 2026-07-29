import { StyleSheet, View } from 'react-native';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function StatusMessage({ message, tone = 'info' }: { readonly message: string; readonly tone?: 'info' | 'error' | 'success' | 'warning' }) {
  const presentation = tone === 'error' ? styles.error : tone === 'warning' ? styles.warning : tone === 'success' ? styles.success : styles.info;
  return <View accessibilityRole={tone === 'error' ? 'alert' : 'text'} style={[styles.box, presentation]}><ThemedText type="small" style={styles.text}>{message}</ThemedText></View>;
}
export const InlineNotice = StatusMessage;
const styles = StyleSheet.create({ box: { borderRadius: Radius.input, padding: Spacing.sm, borderWidth: 1 }, text: { color: Palette.textSecondary }, info: { backgroundColor: Palette.sageLight, borderColor: '#CEE0D1' }, error: { backgroundColor: Palette.dangerSurface, borderColor: '#EAA18F' }, warning: { backgroundColor: Palette.warningSurface, borderColor: '#E9C97F' }, success: { backgroundColor: Palette.sageLight, borderColor: '#9BBCA3' } });
