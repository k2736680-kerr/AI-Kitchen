import AsyncStorage from '@react-native-async-storage/async-storage';

const onboardingStorageKey = 'ai-kitchen.onboarding.completed.v1';

export async function readOnboardingCompleted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(onboardingStorageKey)) === 'true';
  } catch (error) {
    console.warn('[onboarding] Failed to read completion flag; treating onboarding as incomplete.', error);
    return false;
  }
}

export async function writeOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(onboardingStorageKey, 'true');
}
