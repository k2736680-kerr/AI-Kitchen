import { AppButton } from '@/components/app-button';
import { useTranslation } from 'react-i18next';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { ApiError } from '@ai-kitchen/shared';

export function GenerationErrorState({ error, onRetry, onBack }: { readonly error: ApiError; readonly onRetry: () => void; readonly onBack: () => void }) {
  const { t } = useTranslation();
  return <AppCard><ThemedText type="sectionTitle">{t('generation.failed')}</ThemedText><StatusMessage message={error.message} tone="error" /><AppButton label={t('generation.regenerate')} onPress={onRetry} /><AppButton label={t('recipe.backToConditions')} variant="secondary" onPress={onBack} /></AppCard>;
}
