import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  background: '#F7F8F3',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF3ED',
  sage: '#4F8062',
  sageDeep: '#355C46',
  sageLight: '#E4EFE7',
  coral: '#E9785D',
  yellow: '#F1B85B',
  text: '#1E2922',
  textSecondary: '#66736B',
  textWeak: '#8D9891',
  disabled: '#B3BBB6',
  border: '#DCE5DD',
  dangerSurface: '#FBEAE5',
  warningSurface: '#FFF4DD',
} as const;

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.sageLight,
    textSecondary: Palette.textSecondary,
    textWeak: Palette.textWeak,
    primary: Palette.sage,
    primaryPressed: Palette.sageDeep,
    border: Palette.border,
    disabled: Palette.disabled,
  },
  dark: {
    text: Palette.text,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.sageLight,
    textSecondary: Palette.textSecondary,
    textWeak: Palette.textWeak,
    primary: Palette.sage,
    primaryPressed: Palette.sageDeep,
    border: Palette.border,
    disabled: Palette.disabled,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64, xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, page: 20 } as const;
export const Radius = { chip: 999, button: 15, card: 18, large: 22, input: 14 } as const;
export const Shadows = {
  card: { shadowColor: '#1E2922', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
} as const;
export const IconSize = { small: 18, medium: 22, large: 28 } as const;
export const Motion = { quick: 140, standard: 220 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
