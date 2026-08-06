import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COOKWARE_OPTIONS, type Cookware } from '@ai-kitchen/shared';
import { SelectionChip } from '@/components/selection-chip';

export function CookwareSelector({ selected, onToggle }: { readonly selected: readonly Cookware[]; readonly onToggle: (value: Cookware) => void }) {
  const { t } = useTranslation();
  return <View style={styles.row}>{COOKWARE_OPTIONS.map((option) => <SelectionChip key={option} label={t(`cookware.${option}`)} selected={selected.includes(option)} role="checkbox" onPress={() => onToggle(option)} />)}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
