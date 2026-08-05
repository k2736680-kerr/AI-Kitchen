import { useTranslation } from 'react-i18next';

import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function TermsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppHeader title={t('legal.termsTitle')} eyebrow={t('legal.eyebrow')} back />
      <AppCard>
        <ThemedText type="sectionTitle">{t('legal.termsTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('legal.termsBody')}</ThemedText>
      </AppCard>
    </Screen>
  );
}
