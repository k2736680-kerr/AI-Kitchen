import { StatusMessage } from '@/components/status-message';
import type { RecipeSafetyNotice } from '@ai-kitchen/shared';
export function SafetyNotice({ notices }: { readonly notices: readonly RecipeSafetyNotice[] }) { return <>{notices.map((notice) => <StatusMessage key={notice.message} message={`${notice.message} 仅为 P0 演示信息，不代表正式食品安全规则校验`} />)}</>; }
