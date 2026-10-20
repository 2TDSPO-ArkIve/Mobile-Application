import { Easing } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  /** Text fields (AppInput, date/time, search). */
  field: 14,
  /** AppCard and surfaces at rest. */
  card: 20,
  /** Pill radius (≥ half the control's height). */
  full: 999,
} as const;

/**
 * Mapped to the exact web type scale: 11 / 13 / 15 / 17 / 20, plus one larger
 * size for page-level titles the web spec doesn't need (a mobile page title
 * carries hierarchy a desktop page header gets from surrounding chrome).
 * Every screen/component references these by name, so this single mapping
 * is what makes the whole app's type scale match the web app's.
 */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FontWeight = keyof typeof fontWeight;

/** Multipliers over fontSize: `lineHeight: fontSize.md * lineHeight.body`. */
export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  body: 1.5,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

/** Durations in ms; pair with `motionEasing`. */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const motionEasing = Easing.bezier(0.2, 0, 0, 1);

/** Font family names registered by `useFonts` in App.tsx. */
export const fontFamilies: Record<FontWeight, string> = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

/**
 * Use instead of `fontWeight`. Each weight is its own font family, and
 * Android does not pick the variant from `fontWeight` on a custom font,
 * so mixing the two can render the wrong weight.
 */
export function font(weight: FontWeight = 'regular') {
  return { fontFamily: fontFamilies[weight] };
}
