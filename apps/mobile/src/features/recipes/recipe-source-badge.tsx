import { useTranslation } from 'react-i18next';
import { StatusMessage } from '@/components/status-message';
export function RecipeSourceBadge({ source = 'local' }: { readonly source?: 'local' | 'remote' | 'fixture' }) {
  const { t } = useTranslation();
  return source === 'remote' ? <StatusMessage message={t('recipe.source')} tone="success" /> : null;
}
