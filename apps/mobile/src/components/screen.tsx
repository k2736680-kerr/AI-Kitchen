import { FlatList, ScrollView, StyleSheet, View, type FlatListProps, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, contentContainerStyle, ...props }: PropsWithChildren<ScrollViewProps>) {
  const theme = useTheme();
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...props}>{children}</ScrollView></SafeAreaView>;
}

export function ScreenList<ItemT>({ contentContainerStyle, ...props }: FlatListProps<ItemT>) {
  const theme = useTheme();
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
    <FlatList
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  </SafeAreaView>;
}
export function ScreenHeader({ children }: PropsWithChildren) { return <View style={styles.header}>{children}</View>; }
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: Spacing.page, gap: Spacing.md, paddingBottom: 48 }, header: { gap: Spacing.xs } });
