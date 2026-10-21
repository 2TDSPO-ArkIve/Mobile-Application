import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True while the OS "reduce motion" setting is on. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** `Modal` entrance: a fade instead of the slide-up while reduce motion is on. */
export function useModalAnimation(): 'fade' | 'slide' {
  return useReducedMotion() ? 'fade' : 'slide';
}
