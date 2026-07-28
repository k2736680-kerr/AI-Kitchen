import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface AppButtonProps extends Omit<PressableProps, 'children'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
}

export function AppButton({ label, variant = 'primary', disabled, ...props }: AppButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variant === 'primary' ? theme.text : 'transparent' },
        variant === 'secondary' && { borderColor: theme.text, borderWidth: 1 },
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      {...props}>
      <ThemedText
        style={[
          styles.label,
          { color: variant === 'primary' ? theme.background : theme.text },
          disabled && { color: theme.textSecondary },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: '700' },
  ghost: { paddingHorizontal: 8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
