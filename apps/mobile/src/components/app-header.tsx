import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function AppHeader({ title, eyebrow, back = false, trailing }: { readonly title: string; readonly eyebrow?: string; readonly back?: boolean; readonly trailing?: React.ReactNode }) {
  const theme = useTheme();
  return <View style={styles.row}>
    {back ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.icon, { backgroundColor: theme.surfaceTint }]}><ThemedText style={{ fontSize: 22, lineHeight: 26, color: theme.text }}>‹</ThemedText></Pressable> : <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}><ThemedText style={styles.logoText}>AI</ThemedText></LinearGradient>}
    <View style={styles.copy}>{eyebrow ? <ThemedText type="small" themeColor="textSecondary">{eyebrow}</ThemedText> : null}<ThemedText type="pageTitle">{title}</ThemedText></View>
    {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
  logo: { width: 44, height: 44, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  copy: { flex: 1, gap: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
