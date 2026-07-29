import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app-button';
import { StatusMessage } from '@/components/status-message';
import { ThemedText } from '@/components/themed-text';
import type { AddCustomIngredientResult } from '@/state/p0-state';
import { useTheme } from '@/hooks/use-theme';

export function CustomIngredientForm({ onAdd }: { readonly onAdd: (value: string) => AddCustomIngredientResult }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<Exclude<AddCustomIngredientResult, { readonly ok: true }>['reason'] | null>(null);
  const theme = useTheme();
  const submit = () => { const result = onAdd(value); if (result.ok) { setValue(''); setError(null); } else setError(result.reason); };
  return <View style={styles.container}><ThemedText type="sectionTitle">{t('home.customTitle')}</ThemedText><View style={styles.row}><TextInput value={value} onChangeText={(text) => { setValue(text); setError(null); }} placeholder={t('home.customPlaceholder')} placeholderTextColor={theme.textWeak} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><AppButton label={t('home.add')} onPress={submit} variant="secondary" /></View>{error && <StatusMessage message={t(`custom.${String(error)}`)} tone="error" />}<Pressable onPress={() => setValue('')}><ThemedText type="small" themeColor="textSecondary">{t('home.customPrivacy')}</ThemedText></Pressable></View>;
}

const styles = StyleSheet.create({ container: { gap: 10 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center' }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 } });
