import { currency, minorFactor } from './currencies';

/**
 * Money is always stored as integer minor units for the currency's displayed precision
 * (pence for GBP, whole rupees for INR). Totals are per currency and never mixed.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(code: string, dp: number): Intl.NumberFormat {
  const key = `${code}:${dp}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(currency(code).locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
    formatters.set(key, f);
  }
  return f;
}

/** "2,486.50" (no symbol). */
export function formatNumber(minor: number, code: string, dp = currency(code).dp): string {
  return numberFormat(code, dp).format(minor / minorFactor(code));
}

/** "£2,486.50", "₹18,299". */
export function formatMoney(minor: number, code: string): string {
  return currency(code).symbol + formatNumber(minor, code);
}

/** Rounded to whole units: "£2,486", "₹18,299". */
export function formatWhole(minor: number, code: string): string {
  return currency(code).symbol + formatNumber(Math.round(minor / minorFactor(code)) * minorFactor(code), code, 0);
}

/** Short label for chart bars: "£653", "₹4.5k". */
export function formatShort(minor: number, code: string): string {
  const c = currency(code);
  const major = minor / minorFactor(code);
  if (c.code === 'INR') {
    return major >= 1000 ? `₹${Math.round(major / 100) / 10}k` : `₹${Math.round(major)}`;
  }
  return c.symbol + numberFormat(code, 0).format(Math.round(major));
}

/** Major units string for CSV ("86.40", "4500"). Plain, no grouping. */
export function formatPlain(minor: number, code: string): string {
  const dp = currency(code).dp;
  return (minor / minorFactor(code)).toFixed(dp);
}

export const MAX_INT_DIGITS = 7;

/**
 * Applies a keypad press to the typed amount string. Returns the new string,
 * or the old one if the key is not allowed (max 7 integer digits, dp decimals).
 */
export function pressKey(typed: string, key: string, code: string): string {
  const dp = currency(code).dp;
  if (key === 'del') return typed.slice(0, -1);
  if (key === '.') {
    if (dp === 0 || typed.includes('.')) return typed;
    return (typed === '' ? '0' : typed) + '.';
  }
  if (!/^\d$/.test(key)) return typed;
  const [int, dec] = typed.split('.');
  if (dec !== undefined) {
    if (dec.length >= dp) return typed;
    return typed + key;
  }
  if (int === '0') return key;
  if (int.length >= MAX_INT_DIGITS) return typed;
  return typed + key;
}

/** Typed amount string to minor units. */
export function typedToMinor(typed: string, code: string): number {
  if (!typed) return 0;
  const n = Number(typed.endsWith('.') ? typed.slice(0, -1) : typed);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * minorFactor(code));
}

/** Minor units to an editable typed string ("86.4" → "86.40"). */
export function minorToTyped(minor: number, code: string): string {
  if (!minor) return '';
  const dp = currency(code).dp;
  return (minor / minorFactor(code)).toFixed(dp);
}

/** Typed string for display with grouping: "2999" → "2,999", "64.0" → "64.0". */
export function displayTyped(typed: string, code: string): string {
  if (!typed) return '0';
  const [int, dec] = typed.split('.');
  const grouped = new Intl.NumberFormat(currency(code).locale, { maximumFractionDigits: 0 }).format(Number(int || '0'));
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}
