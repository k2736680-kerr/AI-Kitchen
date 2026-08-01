import { useState } from 'react';

import { FirstLaunchOnboarding } from '@/features/onboarding/first-launch-onboarding';
import { useOnboarding } from '@/features/onboarding/onboarding-context';

export default function OnboardingScreen() {
  const { complete } = useOnboarding();
  const [isCompleting, setIsCompleting] = useState(false);

  const finishOnboarding = async () => {
    if (isCompleting) return;

    setIsCompleting(true);
    try {
      await complete();
      console.info('[onboarding] Completion persisted; navigation gate will enter /.');
    } catch (error) {
      console.error('[onboarding] Failed to persist completion flag.', error);
      setIsCompleting(false);
    }
  };

  return <FirstLaunchOnboarding disabled={isCompleting} onComplete={() => void finishOnboarding()} />;
}
