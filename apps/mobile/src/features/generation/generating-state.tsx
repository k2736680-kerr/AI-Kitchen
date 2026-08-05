import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { P0State } from '@/state/p0-state';
import { presentSelectedIngredient, resolveIngredientLocale } from '@/features/ingredients/ingredient-presentation';

export function GeneratingState({ state, onCancel }: { readonly state: P0State; readonly onCancel: () => void }) {
  const { t, i18n } = useTranslation(); const locale = resolveIngredientLocale(i18n.language);
  const theme = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return <AppCard style={styles.card}>
    <View style={styles.spinnerWrap}>
      <LinearGradient colors={theme.brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.spinner}>
        <Animated.View style={[styles.spinnerArc, { transform: [{ rotate }] }]} />
        <ThemedText style={styles.spinnerEmoji}>🍳</ThemedText>
      </LinearGradient>
    </View>
    <ThemedText type="sectionTitle" style={styles.heading}>{t('generation.generatingHeading')}</ThemedText>
    <ThemedText themeColor="textSecondary" style={styles.hint}>{t('generation.generatingHint')}</ThemedText>
    <View style={styles.ingredientsChip}>
      <ThemedText type="small" style={{ color: theme.primary }}>{state.selectedIngredients.map((item) => presentSelectedIngredient(item, locale)).join(' · ')}</ThemedText>
    </View>
    <ThemedText type="small" themeColor="textWeak">{t('common.people', { count: state.generationDraft.servings })} · {t('common.minutes', { count: state.generationDraft.maxCookingTimeMinutes })}</ThemedText>
    <AppButton label={t('generation.cancel')} variant="secondary" onPress={onCancel} />
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  spinnerWrap: { marginBottom: Spacing.sm },
  spinner: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  spinnerArc: { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderTopColor: 'rgba(255,255,255,0.95)' },
  spinnerEmoji: { fontSize: 36, lineHeight: 44 },
  heading: { fontSize: 22, lineHeight: 30, textAlign: 'center' },
  hint: { textAlign: 'center' },
  ingredientsChip: { backgroundColor: 'rgba(79,128,98,0.1)', borderRadius: Radius.chip, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginTop: Spacing.xs },
});
