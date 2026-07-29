import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { AppListItem, AppListSection } from '@/components/app-list-item';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { getAppVersion, supportedLanguageNames } from '@/config/app-info';
import { Palette, Radius, Spacing, BottomTabInset } from '@/constants/theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language === 'en-US' ? t('settings.english') : t('settings.chinese');
  const version = getAppVersion();

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader title={t('profile.title')} eyebrow={t('profile.eyebrow')} />

      <AppCard>
        <View style={styles.guestHeader}>
          <View style={styles.guestBadge}>
            <ThemedText type="smallBold" style={styles.guestBadgeText}>{t('profile.guestBadge')}</ThemedText>
          </View>
          <ThemedText type="sectionTitle">{t('profile.guestTitle')}</ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">{t('profile.guestDescription')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('profile.guestFuture')}</ThemedText>
        <StatusMessage message={t('profile.guestDataNotice')} tone="warning" />
      </AppCard>

      <AppCard>
        <ThemedText type="sectionTitle">{t('profile.accountSection')}</ThemedText>
        <AppListSection>
          <AppListItem
            title={t('profile.accountTitle')}
            subtitle={t('profile.accountStatus')}
            showChevron
            onPress={() => Alert.alert(t('profile.accountComingSoonTitle'), t('profile.accountComingSoonMessage'))}
          />
        </AppListSection>
      </AppCard>

      <AppCard>
        <ThemedText type="sectionTitle">{t('profile.preferencesSection')}</ThemedText>
        <AppListSection>
          <AppListItem
            title={t('profile.languageTitle')}
            subtitle={supportedLanguageNames.join(' / ')}
            trailingText={currentLanguage}
            showChevron
            onPress={() => router.push('/settings' as Href)}
          />
        </AppListSection>
      </AppCard>

      <AppCard>
        <ThemedText type="sectionTitle">{t('profile.infoSection')}</ThemedText>
        <AppListSection>
          <AppListItem
            title={t('profile.termsTitle')}
            showChevron
            onPress={() => router.push('/legal/terms' as Href)}
          />
          <AppListItem
            title={t('profile.privacyTitle')}
            showChevron
            onPress={() => router.push('/legal/privacy' as Href)}
          />
          <AppListItem
            title={t('profile.aboutTitle')}
            showChevron
            onPress={() => router.push('/about' as Href)}
          />
          <AppListItem
            title={t('profile.versionTitle')}
            trailingText={version}
            compact
          />
        </AppListSection>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BottomTabInset + Spacing.lg,
  },
  guestHeader: {
    gap: Spacing.xs,
  },
  guestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.sageLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  guestBadgeText: {
    color: Palette.sageDeep,
  },
});
