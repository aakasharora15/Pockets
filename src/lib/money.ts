import { currency, minorFactor } from './currencies';
import { decimalSign, numberLocale, withSymbol } from './locale';

/**
 * Money is always stored as integer minor units, a hundredth of the main unit (pence, paise,
 * cents), even for currencies shown without decimals. Totals are per currency and never mixed.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(code: string, dp: number): Intl.NumberFormat {
  const key = `${code}:${dp}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(numberLocale(code), { minimumFractionDigits: dp, maximumFractionDigits: dp });
    formatters.set(key, f);
  }
  return f;
}

/** Decimals to show for an amount: rupees drop ".00" on whole amounts. */
function shownDp(minor: number, code: string): number {
  const c = currency(code);
  return c.wholeDisplay && minor % minorFactor(code) === 0 ? 0 : c.dp;
}

/** "2,486.50" (no symbol). */
export function formatNumber(minor: number, code: string, dp = shownDp(minor, code)): string {
  return numberFormat(code, dp).format(minor / minorFactor(code));
}

/** "£2,486.50", "₹18,299", or "2.486,50 €" on a German phone. */
export function formatMoney(minor: number, code: string): string {
  return withSymbol(code, formatNumber(minor, code));
}

/** Rounded to whole units: "£714", "₹18,299". */
export function formatWhole(minor: number, code: string): string {
  return withSymbol(code, formatNumber(Math.round(minor / minorFactor(code)) * minorFactor(code), code, 0));
}

/** Whole units, rounded down so spending is never overstated: £2,486.50 → "£2,486". */
export function formatWholeDown(minor: number, code: string): string {
  return withSymbol(code, formatNumber(Math.floor(minor / minorFactor(code)) * minorFactor(code), code, 0));
}

/** Short label for chart bars: "£653", "₹4.5k". */
export function formatShort(minor: number, code: string): string {
  const c = currency(code);
  const major = minor / minorFactor(code);
  if (c.code === 'INR') {
    return major >= 1000 ? `₹${Math.round(major / 100) / 10}k` : `₹${Math.round(major)}`;
  }
  return withSymbol(code, numberFormat(code, 0).format(Math.round(major)));
}

/** Major units string for CSV ("86.40", "4500"). Plain, no grouping. */
export function formatPlain(minor: number, code: string): string {
  const dp = shownDp(minor, code);
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
  const dp = shownDp(minor, code);
  return (minor / minorFactor(code)).toFixed(dp);
}

/** Typed string for display in the phone's style: "2999" → "2,999" (or "2.999"), "64.0" → "64.0" (or "64,0"). */
export function displayTyped(typed: string, code: string): string {
  if (!typed) return '0';
  const [int, dec] = typed.split('.');
  const grouped = new Intl.NumberFormat(numberLocale(code), { maximumFractionDigits: 0 }).format(Number(int || '0'));
  return dec === undefined ? grouped : `${grouped}${decimalSign(code)}${dec}`;
}
