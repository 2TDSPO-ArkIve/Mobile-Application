import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform equivalents of the web's shadow-sm/shadow-md.
 *
 * Native (iOS reads `shadow*`, Android reads `elevation` — both live on the
 * same object and each platform ignores what it doesn't understand) keeps
 * the original RN shadow props. Web is handled separately: React Native
 * Web logs "shadow* style props are deprecated. Use boxShadow." because it
 * maps CSS `box-shadow` directly, and expects a real `boxShadow` string —
 * not a global replacement of native shadow behavior, just the
 * platform-appropriate equivalent for the platform that actually wants it.
 * `react-native`'s own `ViewStyle` type doesn't declare `boxShadow` (that's
 * a react-native-web addition), so this is asserted for just this one
 * object rather than widening the shared style types app-wide.
 */
const nativeShadows = {
  sm: {},
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

const webShadows = {
  sm: {} as ViewStyle,
  md: { boxShadow: '0px 2px 6px rgba(15,23,42,0.14)' } as ViewStyle,
};

/**
 * `sm` is intentionally empty: cards rest flat, separated by tone. `md` is
 * only for floating elements (modal, menu, fixed footer); in dark mode those
 * use `raised` plus a `line` border instead, since shadows vanish on dark.
 */
export const shadows = Platform.OS === 'web' ? webShadows : nativeShadows;
