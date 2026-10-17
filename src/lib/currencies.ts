/** Supported currencies. Order is the order shown in Setup and Settings › Currencies. */
export type CurrencyCode =
  | 'GBP'
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'NZD'
  | 'CHF'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'CZK'
  | 'HUF'
  | 'RON'
  | 'TRY'
  | 'JPY'
  | 'CNY'
  | 'HKD'
  | 'KRW'
  | 'TWD'
  | 'THB'
  | 'MYR'
  | 'IDR'
  | 'PHP'
  | 'VND'
  | 'AED'
  | 'SAR'
  | 'PKR'
  | 'BDT'
  | 'LKR'
  | 'NPR';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  /** Long name used in lists ("British pound"). */
  name: string;
  /** Short name used on currency pills ("Pound"). */
  short: string;
  /** Plural used on Home cards ("Pounds"). */
  plural: string;
  /**
   * Decimal places accepted when typing and shown on amounts. 0 for currencies spent in whole units
   * (yen, won). Storage doesn't change: every amount is kept in hundredths whatever this says.
   */
  dp: number;
  /** Show whole amounts without decimals ("₹8,830", but "₹1.03" when there are paise). */
  wholeDisplay?: boolean;
  /** How English-speaking phones write its numbers (rupees keep lakh grouping: ₹1,00,000). */
  locale: string;
  /** The European Central Bank publishes a daily rate, so it can join a combined total. */
  rates: boolean;
  /** Regions (ISO country codes) where it's the everyday currency, to suggest it in setup. */
  regions: string[];
}

const EURO_AREA = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British pound', short: 'Pound', plural: 'Pounds', dp: 2, locale: 'en-GB', rates: true, regions: ['GB'] },
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian rupee',
    short: 'Rupee',
    plural: 'Rupees',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-IN',
    rates: true,
    regions: ['IN'],
  },
  { code: 'USD', symbol: '$', name: 'US dollar', short: 'Dollar', plural: 'Dollars', dp: 2, locale: 'en-US', rates: true, regions: ['US'] },
  { code: 'EUR', symbol: '€', name: 'Euro', short: 'Euro', plural: 'Euros', dp: 2, locale: 'en-IE', rates: true, regions: EURO_AREA },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian dollar',
    short: 'Aus dollar',
    plural: 'Australian dollars',
    dp: 2,
    locale: 'en-AU',
    rates: true,
    regions: ['AU'],
  },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar', short: 'Can dollar', plural: 'Canadian dollars', dp: 2, locale: 'en-CA', rates: true, regions: ['CA'] },
  {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore dollar',
    short: 'Sing dollar',
    plural: 'Singapore dollars',
    dp: 2,
    locale: 'en-SG',
    rates: true,
    regions: ['SG'],
  },
  {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand dollar',
    short: 'NZ dollar',
    plural: 'New Zealand dollars',
    dp: 2,
    locale: 'en-NZ',
    rates: true,
    regions: ['NZ'],
  },
  // Europe
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc', short: 'Franc', plural: 'Swiss francs', dp: 2, locale: 'en-GB', rates: true, regions: ['CH', 'LI'] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish krona', short: 'Krona', plural: 'Swedish kronor', dp: 2, locale: 'en-GB', rates: true, regions: ['SE'] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian krone', short: 'Krone', plural: 'Norwegian kroner', dp: 2, locale: 'en-GB', rates: true, regions: ['NO'] },
  { code: 'DKK', symbol: 'kr', name: 'Danish krone', short: 'Krone', plural: 'Danish kroner', dp: 2, locale: 'en-GB', rates: true, regions: ['DK'] },
  { code: 'PLN', symbol: 'zł', name: 'Polish złoty', short: 'Złoty', plural: 'Złoty', dp: 2, locale: 'en-GB', rates: true, regions: ['PL'] },
  { code: 'CZK', symbol: 'Kč', name: 'Czech koruna', short: 'Koruna', plural: 'Czech koruny', dp: 2, locale: 'en-GB', rates: true, regions: ['CZ'] },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian forint', short: 'Forint', plural: 'Forints', dp: 0, locale: 'en-GB', rates: true, regions: ['HU'] },
  { code: 'RON', symbol: 'lei', name: 'Romanian leu', short: 'Leu', plural: 'Lei', dp: 2, locale: 'en-GB', rates: true, regions: ['RO'] },
  { code: 'TRY', symbol: '₺', name: 'Turkish lira', short: 'Lira', plural: 'Turkish lira', dp: 2, locale: 'en-GB', rates: true, regions: ['TR'] },
  // Asia and the Gulf
  { code: 'JPY', symbol: '¥', name: 'Japanese yen', short: 'Yen', plural: 'Yen', dp: 0, locale: 'en-GB', rates: true, regions: ['JP'] },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese yuan', short: 'Yuan', plural: 'Yuan', dp: 2, locale: 'en-GB', rates: true, regions: ['CN'] },
  {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong dollar',
    short: 'HK dollar',
    plural: 'Hong Kong dollars',
    dp: 2,
    locale: 'en-GB',
    rates: true,
    regions: ['HK'],
  },
  { code: 'KRW', symbol: '₩', name: 'South Korean won', short: 'Won', plural: 'Won', dp: 0, locale: 'en-GB', rates: true, regions: ['KR'] },
  {
    code: 'TWD',
    symbol: 'NT$',
    name: 'New Taiwan dollar',
    short: 'NT dollar',
    plural: 'New Taiwan dollars',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-GB',
    rates: false,
    regions: ['TW'],
  },
  { code: 'THB', symbol: '฿', name: 'Thai baht', short: 'Baht', plural: 'Baht', dp: 2, locale: 'en-GB', rates: true, regions: ['TH'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian ringgit', short: 'Ringgit', plural: 'Ringgit', dp: 2, locale: 'en-GB', rates: true, regions: ['MY'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian rupiah', short: 'Rupiah', plural: 'Rupiah', dp: 0, locale: 'en-GB', rates: true, regions: ['ID'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine peso', short: 'Peso', plural: 'Philippine pesos', dp: 2, locale: 'en-GB', rates: true, regions: ['PH'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese đồng', short: 'Đồng', plural: 'Đồng', dp: 0, locale: 'en-GB', rates: false, regions: ['VN'] },
  { code: 'AED', symbol: 'AED', name: 'UAE dirham', short: 'Dirham', plural: 'Dirhams', dp: 2, locale: 'en-GB', rates: false, regions: ['AE'] },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi riyal', short: 'Riyal', plural: 'Saudi riyals', dp: 2, locale: 'en-GB', rates: false, regions: ['SA'] },
  {
    code: 'PKR',
    symbol: 'PKR',
    name: 'Pakistani rupee',
    short: 'PK rupee',
    plural: 'Pakistani rupees',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-GB',
    rates: false,
    regions: ['PK'],
  },
  {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi taka',
    short: 'Taka',
    plural: 'Taka',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-IN',
    rates: false,
    regions: ['BD'],
  },
  {
    code: 'LKR',
    symbol: 'LKR',
    name: 'Sri Lankan rupee',
    short: 'LK rupee',
    plural: 'Sri Lankan rupees',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-GB',
    rates: false,
    regions: ['LK'],
  },
  {
    code: 'NPR',
    symbol: 'NPR',
    name: 'Nepalese rupee',
    short: 'NP rupee',
    plural: 'Nepalese rupees',
    dp: 2,
    wholeDisplay: true,
    locale: 'en-IN',
    rates: false,
    regions: ['NP'],
  },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currency(code: string): Currency {
  return BY_CODE.get(code as CurrencyCode) ?? CURRENCIES[0];
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return BY_CODE.has(code as CurrencyCode);
}

/**
 * Minor units per major unit. Always 100, so every amount is stored the same way whatever is shown:
 * ₹4,500 is 450000 paise, and ¥1,500 (shown without decimals) is 150000 hundredths.
 */
export function minorFactor(_code: string): number {
  return 100;
}

/** The currency of the phone's region (from its language settings), if Spendr has it. */
export function suggestedCurrency(): CurrencyCode | null {
  try {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(tag).maximize().region;
      const hit = region && CURRENCIES.find((c) => c.regions.includes(region));
      if (hit) return hit.code;
    }
  } catch {
    /* Older browsers without Intl.Locale: no suggestion. */
  }
  return null;
}
