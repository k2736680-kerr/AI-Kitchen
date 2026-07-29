import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function IngredientSearch({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <View style={styles.row}>
    <TextInput value={value} onChangeText={onChange} placeholder={t('home.searchPlaceholder')} placeholderTextColor={theme.textWeak} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
    {value.length > 0 && <Pressable onPress={() => onChange('')} accessibilityLabel={t('home.clearSearch')}><ThemedText type="small" style={{ color: theme.primary }}>{t('common.clear')}</ThemedText></Pressable>}
  </View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 } });
