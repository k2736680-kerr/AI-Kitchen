import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  return <View style={styles.container}>
    {options.map((option) => {
      const isSelected = selected.includes(option.value);
      return <Pressable
        key={option.value}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        onPress={() => onToggle(option.value)}
        style={[styles.option, { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement }]}
      >
        <ThemedText style={{ color: isSelected ? theme.primaryPressed : theme.text }}>{isSelected ? '✓ ' : ''}{option.label}</ThemedText>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10 },
});
