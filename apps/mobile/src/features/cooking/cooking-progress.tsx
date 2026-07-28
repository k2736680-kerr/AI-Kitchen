import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
export function CookingProgress({ completed, total, ratio }: { readonly completed: number; readonly total: number; readonly ratio: number }) { const theme = useTheme(); return <View><ThemedText>进度：{completed} / {total}</ThemedText><View style={[styles.track, { backgroundColor: theme.backgroundElement }]}><View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.text }]} /></View></View>; }
const styles = StyleSheet.create({ track: { height: 8, borderRadius: 4, overflow: 'hidden' }, fill: { height: 8, borderRadius: 4 } });
