import { ScrollView, StyleSheet, Pressable } from 'react-native';
import { SERVING_OPTIONS, type ServingOption } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ServingSelector({ value, onChange }: { readonly value: ServingOption; readonly onChange: (value: ServingOption) => void }) {
  const theme = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{SERVING_OPTIONS.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.item, { borderColor: theme.text }, value === option && { backgroundColor: theme.text }]}><ThemedText style={{ color: value === option ? theme.background : theme.text }}>{option} 人</ThemedText></Pressable>)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 8 }, item: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 } });
