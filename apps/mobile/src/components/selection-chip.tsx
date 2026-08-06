import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function SelectionChip({
  label,
  selected,
  onPress,
  role = 'button',
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly role?: 'button' | 'checkbox' | 'radio';
}) {
  const theme = useTheme();
  const accessibilityState = role === 'checkbox' ? { checked: selected } : { selected };

  return <Pressable
    accessibilityRole={role}
    accessibilityState={accessibilityState}
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      { backgroundColor: theme.surfaceTint, borderColor: theme.border },
      selected && styles.selected,
      pressed && styles.pressed,
    ]}
  >
    {selected ? <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} /> : null}
    <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>{selected && role === 'checkbox' ? '✓ ' : ''}{label}</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, borderWidth: 1, borderRadius: Radius.chip, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  selected: { borderColor: 'transparent' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});
