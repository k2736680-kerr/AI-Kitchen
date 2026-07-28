import { StatusMessage } from '@/components/status-message';
import type { RecipeSafetyNotice } from '@ai-kitchen/shared';
export function SafetyNotice({ notices }: { readonly notices: readonly RecipeSafetyNotice[] }) { return <>{notices.map((notice) => <StatusMessage key={notice.message} message={`${notice.message} 当前仅作提示，不代表完整食品安全规则校验。`} />)}</>; }
