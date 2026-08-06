import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export interface AppButtonProps extends Omit<PressableProps, 'children'> { readonly label: string; readonly variant?: ButtonVariant; }

export function AppButton({ label, variant = 'primary', disabled, style, ...props }: AppButtonProps) {
  const theme = useTheme();
  const styleValue = typeof style === 'function' ? undefined : style;
  const variantStyle = variant === 'primary'
    ? { backgroundColor: theme.primary }
    : variant === 'secondary'
      ? { backgroundColor: theme.backgroundElement, borderColor: theme.primary, borderWidth: 1.5 }
      : undefined;
  return <Pressable accessibilityRole="button" disabled={disabled} style={({ pressed }) => [styles.button, styles[variant], variantStyle, disabled && { backgroundColor: theme.disabled, borderColor: theme.disabled }, pressed && !disabled && styles.pressed, styleValue]} {...props}>
    <ThemedText style={[styles.label, { color: variant === 'primary' || disabled ? theme.onPrimary : theme.primaryPressed }]}>{label}</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: Radius.button, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  primary: { shadowColor: '#1E2922', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  secondary: {},
  ghost: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: Spacing.sm },
  label: { fontWeight: '700', textAlign: 'center' }, pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
