import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function AppHeader({ title, eyebrow, back = false }: { readonly title: string; readonly eyebrow?: string; readonly back?: boolean }) {
  return <View style={styles.row}>{back ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.icon}><ThemedText>‹</ThemedText></Pressable> : <View style={styles.logo}><ThemedText style={styles.logoText}>AI</ThemedText></View>}<View style={styles.copy}>{eyebrow ? <ThemedText type="small" themeColor="textSecondary">{eyebrow}</ThemedText> : null}<ThemedText type="pageTitle">{title}</ThemedText></View><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings' as Href)} style={styles.icon}><ThemedText>⚙</ThemedText></Pressable></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 }, logo: { width: 40, height: 40, borderRadius: Radius.button, backgroundColor: Palette.sage, alignItems: 'center', justifyContent: 'center' }, logoText: { color: Palette.surface, fontWeight: '800', fontSize: 14 }, copy: { flex: 1, gap: 1 }, icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.surfaceSecondary, alignItems: 'center', justifyContent: 'center' } });
