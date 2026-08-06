import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ai-kitchen.theme-mode.v1';

interface AppThemeValue {
  readonly mode: ThemeMode;
  readonly resolved: ResolvedTheme;
  readonly colors: typeof Colors.light;
  readonly setMode: (mode: ThemeMode) => void;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!active) return;
      if (value === 'light' || value === 'dark' || value === 'system') setModeState(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setMode = (value: ThemeMode) => {
    setModeState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value).catch(() => undefined);
  };

  const value = useMemo<AppThemeValue>(() => {
    const resolved: ResolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return { mode, resolved, colors: Colors[resolved], setMode };
  }, [mode, systemScheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used within an AppThemeProvider.');
  return context;
}
