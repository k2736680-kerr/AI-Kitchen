import { ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SERVING_OPTIONS, type ServingOption } from '@ai-kitchen/shared';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ServingSelector({ value, onChange }: { readonly value: ServingOption; readonly onChange: (value: ServingOption) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{SERVING_OPTIONS.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)} style={[styles.item, { borderColor: theme.border }, value === option && { backgroundColor: theme.primary, borderColor: theme.primary }]}><ThemedText style={{ color: value === option ? theme.background : theme.text }}>{t('common.people', { count: option })}</ThemedText></Pressable>)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 8 }, item: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 } });
