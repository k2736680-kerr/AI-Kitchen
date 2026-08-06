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
  /** 品牌渐变:鼠尾草绿 → 深苔绿。用于头部、主按钮、选中态。 */
  brandGradient: ['#5C9A78', '#3F6B52'],
  /** 暖杏色点缀。用于高亮、装饰。 */
  apricot: '#F2B28C',
  /** 极浅背景,用于卡片内浅色区域。 */
  surfaceTint: '#F3F6F0',
} as const satisfies Readonly<Record<string, unknown>>;

/** 暗色模式的独立调色板。 */
export const PaletteDark = {
  background: '#101612',
  surface: '#1A231D',
  surfaceSecondary: '#243129',
  sage: '#7FB89A',
  sageDeep: '#A3D4BC',
  sageLight: '#2E4436',
  coral: '#F0927A',
  yellow: '#F3C875',
  text: '#E8EFE9',
  textSecondary: '#A8B5AC',
  textWeak: '#7C8A81',
  disabled: '#5C685F',
  border: '#2E3B33',
  dangerSurface: '#3A241E',
  warningSurface: '#3A2F18',
  brandGradient: ['#5C9A78', '#3F6B52'],
  apricot: '#C98A64',
  surfaceTint: '#141B16',
} as const satisfies Readonly<Record<string, unknown>>;

export interface ThemeColors {
  readonly text: string;
  readonly background: string;
  readonly backgroundElement: string;
  readonly backgroundSelected: string;
  readonly textSecondary: string;
  readonly textWeak: string;
  readonly primary: string;
  readonly primaryPressed: string;
  readonly border: string;
  readonly disabled: string;
  readonly brandGradient: readonly [string, string];
  readonly apricot: string;
  readonly surfaceTint: string;
  readonly dangerSurface: string;
  readonly warningSurface: string;
  readonly dangerBorder: string;
  readonly warningBorder: string;
  readonly successBorder: string;
  readonly onPrimary: string;
}

export const Colors: Readonly<Record<'light' | 'dark', ThemeColors>> = {
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
    brandGradient: [Palette.sage, Palette.sageDeep],
    apricot: Palette.apricot,
    surfaceTint: Palette.surfaceTint,
    dangerSurface: Palette.dangerSurface,
    warningSurface: Palette.warningSurface,
    dangerBorder: '#EAA18F',
    warningBorder: '#E9C97F',
    successBorder: '#9BBCA3',
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: PaletteDark.text,
    background: PaletteDark.background,
    backgroundElement: PaletteDark.surface,
    backgroundSelected: PaletteDark.sageLight,
    textSecondary: PaletteDark.textSecondary,
    textWeak: PaletteDark.textWeak,
    primary: PaletteDark.sage,
    primaryPressed: PaletteDark.sageDeep,
    border: PaletteDark.border,
    disabled: PaletteDark.disabled,
    brandGradient: [PaletteDark.sage, PaletteDark.sageDeep],
    apricot: PaletteDark.apricot,
    surfaceTint: PaletteDark.surfaceTint,
    dangerSurface: PaletteDark.dangerSurface,
    warningSurface: PaletteDark.warningSurface,
    dangerBorder: '#8E5548',
    warningBorder: '#7A6332',
    successBorder: '#4F8062',
    onPrimary: '#FFFFFF',
  },
} satisfies Readonly<Record<'light' | 'dark', ThemeColors>>;

export type ThemeColor = keyof typeof Colors.light;
export type TextThemeColor = Exclude<ThemeColor, 'brandGradient'>;
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
