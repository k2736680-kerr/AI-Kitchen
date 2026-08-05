import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export interface AppButtonProps extends Omit<PressableProps, 'children'> { readonly label: string; readonly variant?: ButtonVariant; }

export function AppButton({ label, variant = 'primary', disabled, style, ...props }: AppButtonProps) {
  const styleValue = typeof style === 'function' ? undefined : style;
  return <Pressable accessibilityRole="button" disabled={disabled} style={({ pressed }) => [styles.button, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed, styleValue]} {...props}>
    <ThemedText style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel, disabled && styles.disabledLabel]}>{label}</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: Radius.button, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: Palette.sage, shadowColor: '#1E2922', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  secondary: { backgroundColor: Palette.surface, borderColor: Palette.sage, borderWidth: 1.5 },
  ghost: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: Spacing.sm },
  label: { fontWeight: '700', textAlign: 'center' }, primaryLabel: { color: Palette.surface }, secondaryLabel: { color: Palette.sageDeep },
  disabled: { backgroundColor: Palette.disabled, borderColor: Palette.disabled }, disabledLabel: { color: Palette.surface }, pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
