import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  readonly icon?: string;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      {icon ? <ThemedText style={styles.icon}>{icon}</ThemedText> : null}
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>{description}</ThemedText>
      ) : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  icon: { fontSize: 46, marginBottom: Spacing.xs, textAlign: 'center' },
  title: { textAlign: 'center' },
  description: { textAlign: 'center' },
});
