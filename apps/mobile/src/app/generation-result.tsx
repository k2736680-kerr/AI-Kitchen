import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import { useP0Store } from '@/state/p0-store';

export default function GenerationResultScreen() {
  const { t } = useTranslation();
  const { state } = useP0Store();
  const message = state.generation.status === 'no-match'
    ? state.generation.message ?? t('generation.noMatchFallback')
    : t('generation.noMatchFallback');

  return <Screen>
    <AppHeader title={t('generation.noMatchTitle')} back />
    <AppCard>
      <StatusMessage message={message} tone="error" />
      <ThemedText themeColor="textSecondary">{t('generation.noMatchHint')}</ThemedText>
    </AppCard>
    <AppButton label={t('common.adjust')} onPress={() => router.replace('/generate' as Href)} />
    <AppButton label={t('common.home')} variant="secondary" onPress={() => router.replace('/' as Href)} />
  </Screen>;
}
