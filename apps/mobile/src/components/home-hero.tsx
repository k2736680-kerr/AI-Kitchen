import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HomeHero({ eyebrow, title, subtitle }: { readonly eyebrow: string; readonly title: string; readonly subtitle: string }) {
  const theme = useTheme();
  return <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
    <View style={styles.emojiRow}>
      <ThemedText style={styles.emoji}>🥘</ThemedText>
      <View style={styles.emojiChip}><ThemedText type="smallBold" style={styles.emojiChipText}>{eyebrow}</ThemedText></View>
    </View>
    <ThemedText style={styles.title}>{title}</ThemedText>
    <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.large, padding: Spacing.lg, gap: Spacing.xs, overflow: 'hidden' },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emoji: { fontSize: 30, lineHeight: 36 },
  emojiChip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: Radius.chip, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  emojiChipText: { color: '#FFFFFF' },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.9)' },
});
