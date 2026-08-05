import { router, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { getAppVersion } from '@/config/app-info';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setAppLanguage, type AppLanguage } from '@/i18n';
import { useAppTheme, type ThemeMode } from '@/theme/app-theme';
import { useP0Store } from '@/state/p0-store';

const THEME_OPTIONS: readonly { readonly value: ThemeMode; readonly labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { mode, setMode } = useAppTheme();
  const { clearLocalData } = useP0Store();
  const language: AppLanguage = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const chooseLanguage = (value: AppLanguage) => { void setAppLanguage(value); };

  const confirmClear = () => {
    Alert.alert(t('settings.clearDataTitle'), t('settings.clearDataConfirm'), [
      { text: t('common.clear'), style: 'destructive', onPress: () => { void clearLocalData(); } },
      { text: t('common.back'), style: 'cancel' },
    ]);
  };

  return <Screen>
    <AppHeader title={t('settings.title')} eyebrow={t('settings.eyebrow')} back />

    <AppCard>
      <ThemedText type="sectionTitle">{t('settings.language')}</ThemedText>
      <ThemedText themeColor="textSecondary">{t('settings.languageHint')}</ThemedText>
      <View style={styles.options}>
        {(['zh-CN', 'en-US'] as const).map((value) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: i18n.language === value }} onPress={() => chooseLanguage(value)} style={[styles.option, { borderColor: theme.border }, language === value && { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
            <ThemedText style={language === value ? { color: theme.primary, fontWeight: '700' } : undefined}>{t(value === 'zh-CN' ? 'settings.chinese' : 'settings.english')}</ThemedText>
            <ThemedText themeColor="textSecondary">{language === value ? '✓' : ''}</ThemedText>
          </Pressable>
        ))}
      </View>
    </AppCard>

    <AppCard>
      <ThemedText type="sectionTitle">{t('settings.theme')}</ThemedText>
      <View style={styles.options}>
        {THEME_OPTIONS.map((option) => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: mode === option.value }} onPress={() => setMode(option.value)} style={[styles.option, { borderColor: theme.border }, mode === option.value && { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
            <ThemedText style={mode === option.value ? { color: theme.primary, fontWeight: '700' } : undefined}>{t(option.labelKey)}</ThemedText>
            <ThemedText themeColor="textSecondary">{mode === option.value ? '✓' : ''}</ThemedText>
          </Pressable>
        ))}
      </View>
    </AppCard>

    <AppCard>
      <ThemedText type="sectionTitle">{t('settings.about')}</ThemedText>
      <Pressable accessibilityRole="link" onPress={() => router.push('/about' as Href)} style={styles.link}>
        <ThemedText>{t('settings.about')}</ThemedText>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms' as Href)} style={styles.link}>
        <ThemedText>{t('settings.terms')}</ThemedText>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy' as Href)} style={styles.link}>
        <ThemedText>{t('settings.privacy')}</ThemedText>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary">{t('settings.version', { version: getAppVersion() })}</ThemedText>
    </AppCard>

    <AppCard>
      <ThemedText type="sectionTitle">{t('settings.data')}</ThemedText>
      <Pressable accessibilityRole="button" onPress={confirmClear} style={[styles.dangerLink, { borderColor: theme.border }]}>
        <ThemedText style={{ color: theme.primary }}>{t('settings.clearData')}</ThemedText>
      </Pressable>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  options: { gap: Spacing.xs },
  option: { minHeight: 48, borderWidth: 1, borderRadius: Radius.input, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dangerLink: { minHeight: 48, borderWidth: 1, borderRadius: Radius.input, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
});
