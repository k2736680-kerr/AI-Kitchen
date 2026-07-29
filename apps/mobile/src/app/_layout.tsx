import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { I18nProvider } from '@/i18n';
import { P0StoreProvider } from '@/state/p0-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <I18nProvider>
    <P0StoreProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="generate" options={{ headerShown: false }} />
          <Stack.Screen name="generating" options={{ headerShown: false }} />
          <Stack.Screen name="generation-result" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[recipeId]" options={{ headerShown: false }} />
          <Stack.Screen name="cooking/[recipeId]" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ headerShown: false }} />
          <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
          <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </P0StoreProvider>
    </I18nProvider>
  );
}
