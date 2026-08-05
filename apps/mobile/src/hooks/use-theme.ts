import { useAppTheme } from '@/theme/app-theme';

/** 返回当前生效的主题色(跟随用户设置或系统)。 */
export function useTheme() {
  const { colors } = useAppTheme();
  return colors;
}
