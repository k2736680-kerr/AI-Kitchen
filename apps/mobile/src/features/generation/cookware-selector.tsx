import { Pressable, StyleSheet, View } from 'react-native';
import { COOKWARE_OPTIONS, type Cookware } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const labels: Record<Cookware, string> = { 'frying-pan': '平底锅', pot: '锅', oven: '烤箱', 'rice-cooker': '电饭锅' };
export function CookwareSelector({ selected, onToggle }: { readonly selected: readonly Cookware[]; readonly onToggle: (value: Cookware) => void }) {
  const theme = useTheme();
  return <View style={styles.row}>{COOKWARE_OPTIONS.map((option) => { const active = selected.includes(option); return <Pressable key={option} onPress={() => onToggle(option)} style={[styles.item, { borderColor: theme.text }, active && { backgroundColor: theme.text }]}><ThemedText style={{ color: active ? theme.background : theme.text }}>{labels[option]}</ThemedText></Pressable>; })}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, item: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 } });
