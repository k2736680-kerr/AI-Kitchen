import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { readOnboardingCompleted, writeOnboardingCompleted } from './storage';

interface OnboardingContextValue {
  readonly completed: boolean | null;
  complete(): Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    void readOnboardingCompleted().then((storedCompleted) => {
      if (active) {
        setCompleted(storedCompleted);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<OnboardingContextValue>(() => ({
    completed,
    complete: async () => {
      await writeOnboardingCompleted();
      setCompleted(true);
    },
  }), [completed]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider.');
  }
  return context;
}
