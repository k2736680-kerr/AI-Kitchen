import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SERVING_OPTIONS, type ServingOption } from '@ai-kitchen/shared';
import { SelectionChip } from '@/components/selection-chip';

export function ServingSelector({ value, onChange }: { readonly value: ServingOption; readonly onChange: (value: ServingOption) => void }) {
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{SERVING_OPTIONS.map((option) => <SelectionChip key={option} label={t('common.people', { count: option })} selected={value === option} role="radio" onPress={() => onChange(option)} />)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 8 } });
