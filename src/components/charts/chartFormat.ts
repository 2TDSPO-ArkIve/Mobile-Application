/** Short currency for chart axes: `R$ 1,2k`, `R$ 3,4M`. Full values stay with `formatCurrency`. */
export function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  return `R$ ${Math.round(value)}`;
}

/** Smallest "round" number (1, 2, 2.5, 5 × 10ⁿ) at or above `max`, so axis lines land on clean values. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= max) ?? 10;
  return step * magnitude;
}

const MIN_LABEL_SLOT = 32;

/** Label every Nth X tick so labels never overlap (30 daily points on a phone). */
export function labelStep(slot: number): number {
  return slot > 0 ? Math.max(1, Math.ceil(MIN_LABEL_SLOT / slot)) : 1;
}
