import { StatusMessage } from '@/components/status-message';
export function RecipeSourceBadge({ source = 'local' }: { readonly source?: 'local' | 'remote' | 'fixture' }) {
  const label = source === 'remote' ? '远程生成菜谱' : source === 'fixture' ? '示例菜谱' : '本地菜谱';
  return <StatusMessage message={label} tone="info" />;
}
