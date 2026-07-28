import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { AddCustomIngredientResult } from '@/state/p0-state';
import { useTheme } from '@/hooks/use-theme';

const messages = { EMPTY: '请输入食材名称', TOO_LONG: '食材名称不能超过 30 个字符', CATALOG_DUPLICATE: '该食材已经存在于标准食材中', CUSTOM_DUPLICATE: '该自定义食材已经添加' } as const;

export function CustomIngredientForm({ onAdd }: { readonly onAdd: (value: string) => AddCustomIngredientResult }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<keyof typeof messages | null>(null);
  const theme = useTheme();
  const submit = () => { const result = onAdd(value); if (result.ok) { setValue(''); setError(null); } else setError(result.reason); };
  return <View style={styles.container}><ThemedText type="subtitle" style={styles.heading}>添加自定义食材</ThemedText><View style={styles.row}><TextInput value={value} onChangeText={(text) => { setValue(text); setError(null); }} placeholder="例如：香菇" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]} /><AppButton label="添加" onPress={submit} variant="secondary" /></View>{error && <StatusMessage message={messages[error]} tone="error" />}<Pressable onPress={() => setValue('')}><ThemedText type="small" themeColor="textSecondary">输入不会保存到云端</ThemedText></Pressable></View>;
}

const styles = StyleSheet.create({ container: { gap: 10 }, heading: { fontSize: 20, lineHeight: 28 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center' }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 } });
