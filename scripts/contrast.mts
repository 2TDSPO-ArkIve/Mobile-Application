// WCAG 2.x contrast check for every accent option, in both themes.
// Run: npm run contrast  (exits 1 if any pair fails)
import { accents, buildPalettes, type AccentName } from '../src/styles/colors.ts';

type Palette = ReturnType<typeof buildPalettes>['light'];
type Key = keyof Palette;

const TEXT = 4.5;
const GRAPHIC = 3;

// [foreground, background, minimum]
const pairs: [Key, Key, number][] = [
  ['ink', 'background', TEXT],
  ['ink', 'surface', TEXT],
  ['ink', 'sunken', TEXT],
  ['ink', 'raised', TEXT],
  ['inkSecondary', 'background', TEXT],
  ['inkSecondary', 'surface', TEXT],
  ['inkSecondary', 'sunken', TEXT],
  ['inkSecondary', 'raised', TEXT],
  ['onInk', 'ink', TEXT],
  ['onInk', 'accent', TEXT],
  ['accent', 'surface', TEXT],
  ['accent', 'background', TEXT],
  ['accent', 'accentTint', TEXT],
  ['ai', 'aiTint', TEXT],
  ['ai', 'surface', TEXT],
  ['warning', 'warningTint', TEXT],
  ['success', 'successTint', TEXT],
  ['error', 'errorTint', TEXT],
  ['error', 'surface', TEXT],
  ['neutral', 'neutralTint', TEXT],
  ['chart1', 'surface', GRAPHIC],
  ['chart2', 'surface', GRAPHIC],
  ['chart3', 'surface', GRAPHIC],
  ['chartAi', 'surface', GRAPHIC],
];

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;
for (const name of Object.keys(accents) as AccentName[]) {
  const themes = buildPalettes(name);
  for (const theme of ['light', 'dark'] as const) {
    const p = themes[theme];
    for (const [fg, bg, min] of pairs) {
      const r = ratio(p[fg], p[bg]);
      if (r < min) {
        failures++;
        console.log(`FAIL ${name}/${theme}: ${fg} ${p[fg]} on ${bg} ${p[bg]} = ${r.toFixed(2)}:1 (min ${min})`);
      }
    }
  }
}

const total = Object.keys(accents).length * 2 * pairs.length;
console.log(failures ? `${failures} of ${total} pairs fail.` : `All ${total} pairs pass.`);
process.exit(failures ? 1 : 0);
