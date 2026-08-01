import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Shadows, Spacing } from '@/constants/theme';

const onboardingSlides = [
  {
    image: require('@/assets/images/ai-kitchen/onboarding/select-ingredients.png'),
    titleKey: 'onboarding.slides.selectIngredients.title',
    descriptionKey: 'onboarding.slides.selectIngredients.description',
  },
  {
    image: require('@/assets/images/ai-kitchen/onboarding/ai-recipe-plan.png'),
    titleKey: 'onboarding.slides.aiRecipePlan.title',
    descriptionKey: 'onboarding.slides.aiRecipePlan.description',
  },
  {
    image: require('@/assets/images/ai-kitchen/onboarding/cooking-steps.png'),
    titleKey: 'onboarding.slides.cookingSteps.title',
    descriptionKey: 'onboarding.slides.cookingSteps.description',
  },
] as const;

export function FirstLaunchOnboarding({ disabled = false, onComplete }: { readonly disabled?: boolean; readonly onComplete: () => void }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);

  const slide = onboardingSlides[stepIndex];
  const illustrationWidth = Math.min(width - Spacing.page * 2, 360);
  const illustrationHeight = Math.min(Math.max(height * 0.28, 220), 280);
  const isLastStep = stepIndex === onboardingSlides.length - 1;

  return (
    <SafeAreaView style={styles.overlay}>
      <Image source={require('@/assets/images/ai-kitchen/decor/botanical-sprig-left.png')} style={styles.leftSprig} contentFit="contain" />
      <Image source={require('@/assets/images/ai-kitchen/decor/botanical-sprig-right.png')} style={styles.rightSprig} contentFit="contain" />
      <Image source={require('@/assets/images/ai-kitchen/decor/botanical-wave-bottom.png')} style={styles.bottomWave} contentFit="cover" />

      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.brandChip}>
            <Image source={require('@/assets/images/ai-kitchen/brand/splash-mark.png')} style={styles.brandChipImage} contentFit="contain" />
            <ThemedText type="smallBold" style={styles.brandChipText}>{t('common.appName')}</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onComplete}
            style={[styles.skipButton, __DEV__ && styles.skipButtonDevelopment]}>
            <ThemedText type="smallBold" style={styles.skipButtonText}>{t('onboarding.skip')}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.copyBlock}>
          <ThemedText type="smallBold" style={styles.eyebrow}>{t('onboarding.eyebrow')}</ThemedText>
          <ThemedText type="pageTitle" style={styles.title}>{t('onboarding.title')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>{t('onboarding.subtitle')}</ThemedText>
        </View>

        <View style={styles.card}>
          <Image source={slide.image} style={{ width: illustrationWidth, height: illustrationHeight }} contentFit="contain" />
          <View style={styles.cardCopy}>
            <ThemedText type="sectionTitle" style={styles.cardTitle}>{t(slide.titleKey)}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.cardDescription}>{t(slide.descriptionKey)}</ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {onboardingSlides.map((_, index) => (
              <View key={index} style={[styles.dot, index === stepIndex && styles.dotActive]} />
            ))}
          </View>

          {isLastStep ? (
            <AppButton disabled={disabled} label={t('onboarding.start')} onPress={onComplete} />
          ) : (
            <AppButton label={t('onboarding.next')} onPress={() => setStepIndex((current) => current + 1)} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.background,
    zIndex: 900,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.page,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.surface,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...Shadows.card,
  },
  brandChipImage: {
    width: 22,
    height: 22,
  },
  brandChipText: {
    color: Palette.sageDeep,
  },
  skipButton: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipButtonDevelopment: {
    marginRight: 140,
  },
  skipButtonText: {
    color: Palette.sageDeep,
  },
  copyBlock: {
    gap: Spacing.xs,
  },
  eyebrow: {
    color: Palette.coral,
    letterSpacing: 0.4,
  },
  title: {
    color: Palette.text,
  },
  subtitle: {
    maxWidth: 420,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    backgroundColor: Palette.surface,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    ...Shadows.card,
  },
  cardCopy: {
    gap: Spacing.xs,
    alignItems: 'center',
    maxWidth: 360,
  },
  cardTitle: {
    textAlign: 'center',
  },
  cardDescription: {
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Radius.chip,
    backgroundColor: Palette.border,
  },
  dotActive: {
    width: 28,
    backgroundColor: Palette.sage,
  },
  leftSprig: {
    position: 'absolute',
    top: 84,
    left: -28,
    width: 124,
    height: 124,
    opacity: 0.5,
  },
  rightSprig: {
    position: 'absolute',
    top: 144,
    right: -22,
    width: 118,
    height: 118,
    opacity: 0.5,
  },
  bottomWave: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 180,
    opacity: 0.95,
  },
});
