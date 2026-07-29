import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { setAppLanguage, type AppLanguage } from '@/i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const chooseLanguage = (value: AppLanguage) => { void setAppLanguage(value); };
  return <Screen><AppHeader title={t('settings.title')} eyebrow={t('settings.eyebrow')} back />
    <AppCard><ThemedText type="sectionTitle">{t('settings.language')}</ThemedText><ThemedText themeColor="textSecondary">{t('settings.languageHint')}</ThemedText>
      <View style={styles.options}>{(['zh-CN', 'en-US'] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: i18n.language === value }} onPress={() => chooseLanguage(value)} style={[styles.option, language === value && styles.selected]}><ThemedText style={language === value ? styles.selectedText : undefined}>{t(value === 'zh-CN' ? 'settings.chinese' : 'settings.english')}</ThemedText><ThemedText themeColor="textSecondary">{language === value ? '✓' : ''}</ThemedText></Pressable>)}</View>
    </AppCard><AppCard><ThemedText type="sectionTitle">{t('settings.about')}</ThemedText><ThemedText>{t('common.appName')}</ThemedText><ThemedText type="small" themeColor="textSecondary">{t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}</ThemedText></AppCard></Screen>;
}
const styles = StyleSheet.create({ options: { gap: Spacing.xs }, option: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.input, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selected: { backgroundColor: Palette.sageLight, borderColor: Palette.sage }, selectedText: { color: Palette.sageDeep, fontWeight: '700' } });
