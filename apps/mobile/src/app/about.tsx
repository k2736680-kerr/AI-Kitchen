import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { AppListItem, AppListSection } from '@/components/app-list-item';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { getAppVersion, supportedLanguageNames } from '@/config/app-info';
import { Spacing } from '@/constants/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const version = getAppVersion();

  return (
    <Screen>
      <AppHeader title={t('about.title')} eyebrow={t('about.eyebrow')} back />
      <AppCard>
        <View style={styles.copy}>
          <ThemedText type="sectionTitle">{t('common.appName')}</ThemedText>
          <ThemedText themeColor="textSecondary">{t('about.description')}</ThemedText>
        </View>
        <AppListSection>
          <AppListItem title={t('about.version')} trailingText={version} compact />
          <AppListItem title={t('about.languages')} trailingText={supportedLanguageNames.join(' / ')} compact />
          <AppListItem title={t('about.guestMode')} subtitle={t('about.guestModeDetail')} compact />
        </AppListSection>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: Spacing.xs,
  },
});
