import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { P0State } from '@/state/p0-state';

export function GeneratingState({ state, onCancel }: { readonly state: P0State; readonly onCancel: () => void }) {
  const { t } = useTranslation();
  return <AppCard>
    <ThemedText type="sectionTitle" style={styles.heading}>{t('generation.generatingHeading')}</ThemedText>
    <StatusMessage message={t('generation.generatingHint')} />
    <ThemedText>{state.selectedIngredients.map((item) => item.displayName).join(' · ')}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">{t('common.people', { count: state.generationDraft.servings })} · {t('common.minutes', { count: state.generationDraft.maxCookingTimeMinutes })}</ThemedText>
    <AppButton label={t('generation.cancel')} variant="secondary" onPress={onCancel} />
  </AppCard>;
}

const styles = StyleSheet.create({ heading: { fontSize: 22, lineHeight: 30 } });
