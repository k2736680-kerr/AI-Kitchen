import { StatusMessage } from '@/components/status-message';
import { useTranslation } from 'react-i18next';
import type { RecipeSafetyNotice } from '@ai-kitchen/shared';
export function SafetyNotice({ notices }: { readonly notices: readonly RecipeSafetyNotice[] }) { const { t } = useTranslation(); return <>{notices.map((notice) => <StatusMessage key={notice.message} message={`${t('recipe.safetyNote')}：${notice.message.replace(/\\n/g, '\n')}`} tone={notice.level === 'warning' ? 'warning' : 'info'} />)}</>; }
