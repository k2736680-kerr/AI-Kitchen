import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAX_TIME_OPTIONS, type MaxTimeMinutes } from '@ai-kitchen/shared';
import { SelectionChip } from '@/components/selection-chip';

export function TimeSelector({ value, onChange }: { readonly value: MaxTimeMinutes; readonly onChange: (value: MaxTimeMinutes) => void }) {
  const { t } = useTranslation();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{MAX_TIME_OPTIONS.map((option) => <SelectionChip key={option} label={t('common.minutes', { count: option })} selected={value === option} role="radio" onPress={() => onChange(option)} />)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 8 } });
