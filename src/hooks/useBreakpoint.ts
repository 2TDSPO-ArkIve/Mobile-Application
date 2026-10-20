import { useWindowDimensions } from 'react-native';
import { breakpoint } from '../styles/theme';

export type Breakpoint = 'compact' | 'medium' | 'wide';

/** Width band of the window (revisão §5.1). Re-renders on resize. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= breakpoint.wide) return 'wide';
  if (width >= breakpoint.medium) return 'medium';
  return 'compact';
}
