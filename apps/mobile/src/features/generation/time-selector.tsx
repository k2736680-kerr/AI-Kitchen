import { ScrollView, StyleSheet, Pressable } from 'react-native';
import { MAX_TIME_OPTIONS, type MaxTimeMinutes } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function TimeSelector({ value, onChange }: { readonly value: MaxTimeMinutes; readonly onChange: (value: MaxTimeMinutes) => void }) {
  const theme = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{MAX_TIME_OPTIONS.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.item, { borderColor: theme.text }, value === option && { backgroundColor: theme.text }]}><ThemedText style={{ color: value === option ? theme.background : theme.text }}>{option} 分钟</ThemedText></Pressable>)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 8 }, item: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 } });
