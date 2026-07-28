import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function IngredientSearch({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const theme = useTheme();
  return <View style={styles.row}>
    <TextInput value={value} onChangeText={onChange} placeholder="搜索食材或别名" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]} />
    {value.length > 0 && <Pressable onPress={() => onChange('')} accessibilityLabel="清空搜索"><ThemedText>清空</ThemedText></Pressable>}
  </View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 } });
