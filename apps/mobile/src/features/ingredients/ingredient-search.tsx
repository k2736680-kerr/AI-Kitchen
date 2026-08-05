import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function IngredientSearch({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return <View style={styles.row}>
    <View style={[styles.wrap, { backgroundColor: theme.surfaceTint, borderColor: theme.border }]}>
      <ThemedText style={styles.magnifier}>⌕</ThemedText>
      <TextInput value={value} onChangeText={onChange} placeholder={t('home.searchPlaceholder')} placeholderTextColor={theme.textWeak} style={[styles.input, { color: theme.text }]} />
      {value.length > 0 && <Pressable onPress={() => onChange('')} accessibilityLabel={t('home.clearSearch')}><ThemedText type="smallBold" style={{ color: theme.primary }}>{t('common.clear')}</ThemedText></Pressable>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderRadius: Radius.input, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  magnifier: { fontSize: 18, opacity: 0.55 },
});
