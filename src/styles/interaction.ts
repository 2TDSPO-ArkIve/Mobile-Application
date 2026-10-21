import { Platform, type PressableStateCallbackType, type ViewStyle } from 'react-native';
import type { ColorPalette } from './colors';

/**
 * react-native-web adds `hovered` and `focused` to the Pressable state;
 * native only reports `pressed`. Base components read hover and focus from
 * here so screens never style them by hand (revisão §5.5).
 */
export type InteractionState = PressableStateCallbackType & {
  hovered?: boolean;
  focused?: boolean;
};

/** Keyboard focus ring, web only; a mouse or touch press doesn't match `:focus-visible`. */
export function focusRing({ focused }: InteractionState, colors: ColorPalette): ViewStyle | null {
  if (Platform.OS !== 'web' || !focused || !document.activeElement?.matches(':focus-visible')) return null;
  return { outlineColor: colors.ink, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as ViewStyle;
}

/** True while hovered (web) or pressed. */
export function isActive({ pressed, hovered }: InteractionState) {
  return pressed || !!hovered;
}

/** Drops the browser's own outline on a focused `<input>`; the field draws its focus as an `ink` border instead. */
export const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null;
