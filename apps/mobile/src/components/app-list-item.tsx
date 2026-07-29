import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

interface AppListItemBaseProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly trailingText?: string;
  readonly showChevron?: boolean;
  readonly compact?: boolean;
}

type AppListItemProps =
  | (AppListItemBaseProps & Omit<PressableProps, 'children'> & { readonly onPress: NonNullable<PressableProps['onPress']> })
  | (AppListItemBaseProps & Omit<ViewProps, 'children'> & { readonly onPress?: undefined });

export function AppListItem({ title, subtitle, trailingText, showChevron = false, compact = false, style, ...props }: AppListItemProps) {
  const staticStyle = typeof style === 'function' ? undefined : style;
  const content = (
    <>
      <View style={styles.copy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle ? <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText> : null}
      </View>
      <View style={styles.trailing}>
        {trailingText ? <ThemedText type="small" themeColor="textSecondary">{trailingText}</ThemedText> : null}
        {showChevron ? <ThemedText themeColor="textWeak">›</ThemedText> : null}
      </View>
    </>
  );

  if (typeof props.onPress === 'function') {
    const { onPress, accessibilityHint, accessibilityLabel, ...pressableProps } = props;
    return (
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          compact && styles.compactRow,
          pressed && styles.pressed,
          staticStyle,
        ]}
        {...pressableProps}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, compact && styles.compactRow, staticStyle]} {...props}>
      {content}
    </View>
  );
}

export function AppListSection({ children }: PropsWithChildren) {
  return <View style={styles.section}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.input,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  row: {
    minHeight: 60,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  compactRow: {
    minHeight: 52,
  },
  pressed: {
    backgroundColor: Palette.sageLight,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
