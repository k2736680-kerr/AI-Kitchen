import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

export function RecipeSourceBadge({ source = 'local', inverse = false }: { readonly source?: 'local' | 'remote' | 'fixture'; readonly inverse?: boolean }) {
  const { t } = useTranslation();
  if (source !== 'remote') return null;
  return <View style={[styles.badge, inverse ? styles.badgeInverse : styles.badgeNormal]}>
    <ThemedText type="small" style={{ color: inverse ? '#FFFFFF' : '#4F8062', fontWeight: '600' }}>{t('recipe.source')}</ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: Radius.chip, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeNormal: { backgroundColor: 'rgba(79,128,98,0.12)' },
  badgeInverse: { backgroundColor: 'rgba(255,255,255,0.22)' },
});
