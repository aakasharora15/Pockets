/** Supported currencies. Order is the order shown in Setup and Settings › Currencies. */
export type CurrencyCode = 'GBP' | 'INR' | 'USD' | 'EUR' | 'AUD' | 'CAD' | 'SGD' | 'NZD';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  /** Long name used in lists ("British pound"). */
  name: string;
  /** Short name used on currency pills ("Pound"). */
  short: string;
  /** Plural used on Home cards ("Pounds · September"). */
  plural: string;
  /** Number of decimal places shown and stored as minor units. */
  dp: number;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British pound', short: 'Pound', plural: 'Pounds', dp: 2, locale: 'en-GB' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee', short: 'Rupee', plural: 'Rupees', dp: 0, locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US dollar', short: 'Dollar', plural: 'Dollars', dp: 2, locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', short: 'Euro', plural: 'Euros', dp: 2, locale: 'en-IE' },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar', short: 'Aus dollar', plural: 'Australian dollars', dp: 2, locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar', short: 'Can dollar', plural: 'Canadian dollars', dp: 2, locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore dollar', short: 'Sing dollar', plural: 'Singapore dollars', dp: 2, locale: 'en-SG' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand dollar', short: 'NZ dollar', plural: 'New Zealand dollars', dp: 2, locale: 'en-NZ' },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currency(code: string): Currency {
  return BY_CODE.get(code as CurrencyCode) ?? CURRENCIES[0];
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return BY_CODE.has(code as CurrencyCode);
}

/** Minor units per major unit (100 for pence, 1 for rupees as stored with 0 dp). */
export function minorFactor(code: string): number {
  return 10 ** currency(code).dp;
}
