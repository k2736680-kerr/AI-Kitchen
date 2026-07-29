import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
export function CookingProgress({ completed, total, ratio }: { readonly completed: number; readonly total: number; readonly ratio: number }) { const theme = useTheme(); const { t } = useTranslation(); return <View style={styles.container}><ThemedText type="small" themeColor="textSecondary">{t('cooking.progress', { completed, total })}</ThemedText><View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.primary }]} /></View></View>; }
const styles = StyleSheet.create({ container: { gap: 6 }, track: { height: 8, borderRadius: 4, overflow: 'hidden' }, fill: { height: 8, borderRadius: 4 } });
