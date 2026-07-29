import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COOKWARE_OPTIONS, type Cookware } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function CookwareSelector({ selected, onToggle }: { readonly selected: readonly Cookware[]; readonly onToggle: (value: Cookware) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <View style={styles.row}>{COOKWARE_OPTIONS.map((option) => { const active = selected.includes(option); return <Pressable key={option} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(option)} style={[styles.item, { borderColor: theme.border }, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}><ThemedText style={{ color: active ? theme.background : theme.text }}>{t(`cookware.${option}`)}</ThemedText></Pressable>; })}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, item: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 } });
