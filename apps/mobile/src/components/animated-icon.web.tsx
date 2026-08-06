import { useEffect } from 'react';

export function AnimatedSplashOverlay({ onFinished }: { readonly onFinished?: () => void }) {
  useEffect(() => {
    onFinished?.();
  }, [onFinished]);

  return null;
}
