/**
 * ArkIve palette. The only file with color hex values: every screen and
 * component reads colors by role through useThemeColors(), never by hex.
 *
 * Token names describe the role, never the color (`accent`, not `pinho`),
 * so a color can change without renaming anything in src.
 */

type AccentTokens = { accent: string; accentTint: string };

/** Veterinarian accent options. The contrast script checks every entry. */
export const accents = {
  pinho: {
    light: { accent: '#1F6B57', accentTint: '#E4F0EC' },
    dark: { accent: '#4FB394', accentTint: '#16261F' },
  },
  petroleo: {
    light: { accent: '#0E6973', accentTint: '#E3F1F2' },
    dark: { accent: '#5CC2C9', accentTint: '#132A2D' },
  },
} satisfies Record<string, { light: AccentTokens; dark: AccentTokens }>;

export type AccentName = keyof typeof accents;

/** Accent in use. Changing it here changes the whole app. */
export const ACTIVE_ACCENT: AccentName = 'pinho';

const baseLight = {
  background: '#F5F6F4',
  surface: '#FFFFFF',
  sunken: '#ECEEEA',
  raised: '#FFFFFF',
  line: '#DEE1DC',

  ink: '#15171A',
  inkSecondary: '#5B616B',
  onInk: '#FFFFFF',

  ai: '#4A6584',
  aiTint: '#EAF0F6',

  chart3: '#B7791F',

  // Clinical status: text color over its own tint.
  warning: '#9A4A00',
  warningTint: '#FDF0E3',
  success: '#1E6B3A',
  successTint: '#E7F3EA',
  error: '#B42318',
  errorTint: '#FDECEA',
  neutral: '#5B616B',
  neutralTint: '#ECEEEA',

  scrim: 'rgba(0,0,0,0.35)',
  // Drawn over the live camera feed, so it never follows the theme.
  onCamera: '#FFFFFF',
};

const baseDark: typeof baseLight = {
  background: '#0E0F11',
  surface: '#17191C',
  sunken: '#1F2226',
  raised: '#2A2D32',
  line: '#2A2D32',

  ink: '#ECEDEE',
  inkSecondary: '#9AA0A9',
  onInk: '#0E0F11',

  ai: '#8FA9C6',
  aiTint: '#1C2633',

  chart3: '#E0A84E',

  warning: '#F2B36B',
  warningTint: '#2E2215',
  success: '#7FCB95',
  successTint: '#17291E',
  error: '#F29A90',
  errorTint: '#331B19',
  neutral: '#9AA0A9',
  neutralTint: '#1F2226',

  scrim: 'rgba(0,0,0,0.6)',
  onCamera: '#FFFFFF',
};

function palette(base: typeof baseLight, accent: AccentTokens) {
  const p = {
    ...base,
    ...accent,
    chart1: base.ink,
    chart2: base.inkSecondary,
    chartAi: base.ai,
  };
  return {
    ...p,
    // Temporary migration aliases (revisão §3.3). Removed in one commit after
    // the last screen; do not use them in new code.
    primary: p.ink,
    text: p.ink,
    textSecondary: p.inkSecondary,
    border: p.line,
  };
}

export function buildPalettes(name: AccentName) {
  return {
    light: palette(baseLight, accents[name].light),
    dark: palette(baseDark, accents[name].dark),
  };
}

const active = buildPalettes(ACTIVE_ACCENT);

export const lightColors = active.light;
export type ColorPalette = typeof lightColors;
export const darkColors: ColorPalette = active.dark;
