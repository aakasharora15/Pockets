import { currency } from './currencies';

/**
 * Numbers follow the phone. English phones keep each currency's own English style (rupees in lakhs:
 * ₹1,00,000); other languages use theirs, so a German phone shows 1.234,56 € and a French one
 * 1 234,56 €. The words in the app stay English for now.
 */
const DEVICE = (() => {
  try {
    const tag = navigator.languages?.[0] ?? navigator.language ?? 'en-GB';
    return Intl.NumberFormat.supportedLocalesOf([tag]).length ? tag : 'en-GB';
  } catch {
    return 'en-GB';
  }
})();

/** Locale to write a currency's numbers in. */
export function numberLocale(code: string): string {
  return /^en\b/i.test(DEVICE) ? currency(code).locale : DEVICE;
}

const after = new Map<string, boolean>();

/** Whether the symbol goes after the number in the phone's style ("1.234,56 €"). */
export function symbolAfter(code: string): boolean {
  let v = after.get(code);
  if (v === undefined) {
    v = false;
    try {
      const parts = new Intl.NumberFormat(numberLocale(code), { style: 'currency', currency: code }).formatToParts(1);
      v = parts.findIndex((p) => p.type === 'currency') > parts.findIndex((p) => p.type === 'integer');
    } catch {
      /* Unknown to this browser: symbol first. */
    }
    after.set(code, v);
  }
  return v;
}

/** The decimal sign in the phone's style: "." or ",". */
export function decimalSign(code: string): string {
  try {
    return new Intl.NumberFormat(numberLocale(code)).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
  } catch {
    return '.';
  }
}

/** A number with its currency symbol on the right side for the phone: "£12.50", "12,50 €". */
export function withSymbol(code: string, number: string): string {
  const sym = currency(code).symbol;
  if (symbolAfter(code)) return `${number}\u00a0${sym}`;
  // Letter symbols get a space ("CHF 12.50"); signs sit tight ("£12.50").
  return /\p{L}$/u.test(sym) ? `${sym}\u00a0${number}` : `${sym}${number}`;
}

/** The phone's country (ISO region code, "DE", "IN"), from its language settings, or null. */
export function deviceRegion(): string | null {
  try {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(tag).maximize().region;
      if (region) return region;
    }
  } catch {
    /* Older browsers without Intl.Locale. */
  }
  return null;
}
