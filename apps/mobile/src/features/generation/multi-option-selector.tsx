import { StyleSheet, View } from 'react-native';

import { SelectionChip } from '@/components/selection-chip';

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export function MultiOptionSelector<T extends string>({
  options,
  selected,
  onToggle,
}: {
  readonly options: readonly Option<T>[];
  readonly selected: readonly T[];
  readonly onToggle: (value: T) => void;
}) {
  return <View style={styles.container}>
    {options.map((option) => {
      const isSelected = selected.includes(option.value);
      return <SelectionChip
        key={option.value}
        label={option.label}
        selected={isSelected}
        role="checkbox"
        onPress={() => onToggle(option.value)}
      />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
