import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/onboarding-context';
import { I18nProvider } from '@/i18n';
import { P0StoreProvider } from '@/state/p0-store';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { completed } = useOnboarding();
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!rootNavigationState?.key || completed === null) return;

    const isOnboardingRoute = segments[0] === 'onboarding';
    if (!completed && !isOnboardingRoute) {
      console.info('[navigation] Onboarding incomplete; replacing current route with /onboarding.');
      router.replace('/onboarding');
    } else if (completed && isOnboardingRoute) {
      console.info('[navigation] Onboarding complete; replacing /onboarding with /.');
      router.replace('/');
    }
  }, [completed, rootNavigationState?.key, router, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none', headerShown: false }} />
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
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <OnboardingProvider>
        <P0StoreProvider>
          <RootNavigator />
        </P0StoreProvider>
      </OnboardingProvider>
    </I18nProvider>
  );
}
