import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { Palette, Spacing } from '@/constants/theme';

export function Screen({ children, contentContainerStyle, ...props }: PropsWithChildren<ScrollViewProps>) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...props}>{children}</ScrollView></SafeAreaView>;
}
export function ScreenHeader({ children }: PropsWithChildren) { return <View style={styles.header}>{children}</View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Palette.background }, content: { padding: Spacing.page, gap: Spacing.md, paddingBottom: 48 }, header: { gap: Spacing.xs } });
