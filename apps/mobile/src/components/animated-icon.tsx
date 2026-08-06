import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

const DURATION = 1180;

export function AnimatedSplashOverlay({ onFinished }: { readonly onFinished?: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    68: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    100: {
      opacity: 0,
      transform: [{ scale: 0.96 }],
      easing: Easing.out(Easing.cubic),
    },
  });

  const content = (
    <View style={styles.content}>
      <View style={[styles.markContainer, { backgroundColor: theme.backgroundElement }]}>
        <Image style={styles.brandMark} source={require('@/assets/images/ai-kitchen/brand/splash-mark.png')} contentFit="contain" />
      </View>
      <ThemedText type="title" style={{ color: theme.text }}>{t('common.appName')}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.slogan}>{t('launch.slogan')}</ThemedText>
      <Image style={styles.bottomDecor} source={require('@/assets/images/ai-kitchen/decor/botanical-wave-bottom.png')} contentFit="contain" />
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
          if (onFinished) {
            scheduleOnRN(onFinished);
          }
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {content}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    width: 108,
    height: 108,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.page,
    gap: Spacing.sm,
  },
  markContainer: {
    width: 156,
    height: 156,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E2922',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  slogan: {
    maxWidth: 280,
    textAlign: 'center',
  },
  bottomDecor: {
    width: 248,
    height: 74,
    marginTop: Spacing.sm,
  },
});
