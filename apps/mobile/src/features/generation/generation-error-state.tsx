import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { ApiError } from '@ai-kitchen/shared';

export function GenerationErrorState({ error, onRetry, onBack }: { readonly error: ApiError; readonly onRetry: () => void; readonly onBack: () => void }) {
  return <AppCard><ThemedText type="subtitle">菜谱生成失败</ThemedText><StatusMessage message={error.message} tone="error" /><AppButton label="重新生成" onPress={onRetry} /><AppButton label="返回生成条件" variant="secondary" onPress={onBack} /></AppCard>;
}
