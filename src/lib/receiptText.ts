import type { CurrencyCode } from './currencies';

/**
 * Reads the total, the shop name and, if it's obvious, the currency from a receipt's text (as
 * recognised by OCR). It's a best guess: the sheet fills the form and the person checks it.
 */

export interface ReceiptGuess {
  /** Total in major units (12.5 = £12.50). */
  amount?: number;
  merchant?: string;
  currency?: CurrencyCode;
}

// 1,234.56 · 1,23,456.00 · 12.50 · 12,50 (comma decimals) · 450 (₹, whole)
const MONEY = /(?:£|₹|rs\.?|inr|gbp|\$|€)?\s*(\d{1,3}(?:[,\s]\d{2,3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)(?!\d)/gi;

const STRONG = /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due|total\s*to\s*pay|to\s*pay|amount\s*payable|net\s*payable|net\s*amount|total\s*amount|bill\s*amount|amount\s*paid)\b/i;
const TOTAL = /\btota[l1]\b/i;
const NOT_TOTAL = /\b(sub\s*-?\s*tota[l1]|total\s*(savings?|discount|items?|qty|quantity|vat|tax|gst|points?)|savings|discount|change|cash\s*back|tendered|vat\s*@|tax\s*@|items?\s*sold)\b/i;

const NOT_NAME = /\b(receipt|invoice|tax|vat|gst|gstin|tel|phone|www|http|\.com|\.co\.uk|date|time|till|cashier|order|table|bill\s*no|welcome|thank|customer|copy|store\s*no|reg|no\.?\s*\d)\b/i;

function toNumber(raw: string): number | null {
  let s = raw.replace(/\s/g, '');
  // "12,50" (comma decimals) → 12.50; "1,234" or "1,23,456" (grouping) → drop commas.
  if (/^\d+,\d{2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
}

/** Money amounts on a line, left to right. Ignores dates, times, percentages and long ids. */
function amountsOn(line: string): number[] {
  const clean = line
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
    .replace(/\d+(\.\d+)?\s*%/g, ' ')
    .replace(/\b\d{7,}\b/g, ' ');
  const out: number[] = [];
  for (const m of clean.matchAll(MONEY)) {
    const n = toNumber(m[1]);
    if (n !== null) out.push(n);
  }
  return out;
}

/** Decimal amounts are much more likely to be prices than counts. */
const hasDecimals = (line: string) => /\d[.,]\d{2}(?!\d)/.test(line);

export function guessAmount(lines: string[]): number | undefined {
  const pick = (re: RegExp) => {
    let best: number | undefined;
    lines.forEach((line, i) => {
      if (!re.test(line) || NOT_TOTAL.test(line)) return;
      // The amount is usually on the same line, sometimes on the next.
      const own = amountsOn(line);
      const nums = own.length ? own : i + 1 < lines.length ? amountsOn(lines[i + 1]) : [];
      const n = nums[nums.length - 1];
      if (n !== undefined && (best === undefined || n >= best)) best = n;
    });
    return best;
  };
  const strong = pick(STRONG);
  if (strong !== undefined) return strong;
  const total = pick(TOTAL);
  if (total !== undefined) return total;
  // No "total" line: the largest price on the receipt.
  let max: number | undefined;
  for (const line of lines) {
    if (!hasDecimals(line) || NOT_TOTAL.test(line)) continue;
    for (const n of amountsOn(line)) if (max === undefined || n > max) max = n;
  }
  return max;
}

function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'&-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

export function guessMerchant(lines: string[]): string | undefined {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.replace(/[|_*=~#<>«»{}[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
    const letters = (line.match(/[a-z]/gi) ?? []).length;
    if (letters < 3 || letters < line.length * 0.5) continue;
    if (NOT_NAME.test(line) || /\d{3,}/.test(line)) continue;
    return titleCase(line.replace(/[.,:;\-–]+$/, '')).slice(0, 60);
  }
  return undefined;
}

export function guessCurrency(text: string): CurrencyCode | undefined {
  if (/₹|\brs\.?\s*\d|\binr\b|\bgstin?\b|\bcgst\b|\bsgst\b/i.test(text)) return 'INR';
  if (/£|\bgbp\b|\bvat\s*(reg|no)/i.test(text)) return 'GBP';
  if (/€|\beur\b/i.test(text)) return 'EUR';
  return undefined;
}

export function parseReceipt(text: string): ReceiptGuess {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { amount: guessAmount(lines), merchant: guessMerchant(lines), currency: guessCurrency(text) };
}
