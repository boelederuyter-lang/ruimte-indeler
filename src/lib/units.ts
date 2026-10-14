import type { Cm } from '../types';

/** Meters (evt. met komma) → hele centimeters. Geeft NaN bij ongeldige invoer. */
export function parseMetersToCm(input: string): Cm {
  const n = Number(input.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

/** Centimeters-invoer → hele centimeters. */
export function parseCm(input: string): Cm {
  const n = Number(input.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

/** 245 → "2,45" (meters, Nederlandse notatie). */
export function cmToMetersString(cm: Cm): string {
  return (cm / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCm(cm: Cm): string {
  return `${Math.round(cm).toLocaleString('nl-NL')} cm`;
}

export function formatDims(w: Cm, d: Cm, h: Cm): string {
  return `${w} × ${d} × ${h} cm`;
}

const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

/** "12,50" of "12.50" of "€ 12" → 1250 eurocent. Leeg → undefined. */
export function parsePriceToCents(input: string): number | undefined {
  const cleaned = input.replace(/[€\s]/g, '');
  if (cleaned === '') return undefined;
  // Accepteer "1.234,56" en "1234.56".
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}
