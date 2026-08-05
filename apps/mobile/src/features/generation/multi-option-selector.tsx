import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
        style={[styles.option, { borderColor: theme.border, backgroundColor: theme.surfaceTint }, isSelected && { borderColor: 'transparent' }]}
      >
        {isSelected && <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} />}
        <ThemedText type="smallBold" style={{ color: isSelected ? '#FFFFFF' : theme.text }}>{isSelected ? '✓ ' : ''}{option.label}</ThemedText>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden', position: 'relative' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});
