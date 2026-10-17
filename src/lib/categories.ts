/** Default categories created for every new Pocket, in display order. */
export interface CategorySeed {
  id: string;
  name: string;
  icon: string;
  colour: string;
}

export const OTHER_ID = 'other';

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { id: 'restaurants', name: 'Restaurants', icon: 'fork-knife', colour: '#4FC48A' },
  { id: 'groceries', name: 'Groceries', icon: 'basket', colour: '#5AA0F0' },
  { id: 'shopping', name: 'Shopping', icon: 'bag-simple', colour: '#A884F0' },
  { id: 'amazon', name: 'Amazon', icon: 'package', colour: '#A8D65C' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', colour: '#8FA0B8' },
  { id: 'rent', name: 'Rent', icon: 'key', colour: '#7C8CF8' },
  { id: 'counciltax', name: 'Council tax', icon: 'bank', colour: '#B38E5D' },
  { id: 'water', name: 'Water bill', icon: 'drop', colour: '#4FD1E8' },
  { id: 'household', name: 'Household', icon: 'couch', colour: '#73A6A0' },
  { id: 'transport', name: 'Travel', icon: 'train-simple', colour: '#F09A55' },
  { id: 'health', name: 'Health', icon: 'heartbeat', colour: '#F2777A' },
  { id: 'personalcare', name: 'Personal care', icon: 'scissors', colour: '#C792EA' },
  { id: 'gifts', name: 'Gifts', icon: 'gift', colour: '#EE86B4' },
  { id: 'self', name: 'Self improvement', icon: 'book-open', colour: '#E2725E' },
  { id: 'entertainment', name: 'Entertainment', icon: 'ticket', colour: '#EE6F7C' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', colour: '#E8B83E' },
  { id: OTHER_ID, name: 'Other', icon: 'dots-three', colour: '#9AA0AA' },
];

/**
 * Every starter category, in display order. A new Pocket gets the common ones plus those that suit
 * its owner's country (see defaultCategoriesFor), so nobody in Germany starts with Council tax.
 */
const ALL_SEEDS: CategorySeed[] = [
  { id: 'restaurants', name: 'Restaurants', icon: 'fork-knife', colour: '#4FC48A' },
  { id: 'groceries', name: 'Groceries', icon: 'basket', colour: '#5AA0F0' },
  { id: 'shopping', name: 'Shopping', icon: 'bag-simple', colour: '#A884F0' },
  { id: 'amazon', name: 'Amazon', icon: 'package', colour: '#A8D65C' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', colour: '#8FA0B8' },
  { id: 'mobile', name: 'Mobile & internet', icon: 'device-mobile', colour: '#6FB6D8' },
  { id: 'rent', name: 'Rent', icon: 'key', colour: '#7C8CF8' },
  { id: 'counciltax', name: 'Council tax', icon: 'bank', colour: '#B38E5D' },
  { id: 'water', name: 'Water bill', icon: 'drop', colour: '#4FD1E8' },
  { id: 'household', name: 'Household', icon: 'couch', colour: '#73A6A0' },
  { id: 'domestichelp', name: 'Domestic help', icon: 'hand-heart', colour: '#D49A6A' },
  { id: 'transport', name: 'Travel', icon: 'train-simple', colour: '#F09A55' },
  { id: 'fuel', name: 'Fuel', icon: 'gas-pump', colour: '#E0845A' },
  { id: 'health', name: 'Health', icon: 'heartbeat', colour: '#F2777A' },
  { id: 'personalcare', name: 'Personal care', icon: 'scissors', colour: '#C792EA' },
  { id: 'gifts', name: 'Gifts', icon: 'gift', colour: '#EE86B4' },
  { id: 'self', name: 'Self improvement', icon: 'book-open', colour: '#E2725E' },
  { id: 'entertainment', name: 'Entertainment', icon: 'ticket', colour: '#EE6F7C' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', colour: '#E8B83E' },
  { id: OTHER_ID, name: 'Other', icon: 'dots-three', colour: '#9AA0AA' },
];

/** Everyone starts with these. */
const COMMON = [
  'restaurants',
  'groceries',
  'shopping',
  'bills',
  'rent',
  'household',
  'transport',
  'health',
  'personalcare',
  'gifts',
  'self',
  'entertainment',
  'subscriptions',
  OTHER_ID,
];

/** Extra starters by country (ISO region code). */
const AMAZON = ['GB', 'US', 'CA', 'IN', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'PL', 'IE', 'AT', 'JP', 'AU', 'SG', 'AE', 'SA', 'TR'];
const FUEL = ['US', 'CA', 'AU', 'NZ', 'IN', 'PK', 'BD', 'LK', 'NP', 'AE', 'SA', 'MY', 'TH', 'ID', 'PH', 'VN'];
const DOMESTIC_HELP = ['IN', 'PK', 'BD', 'LK', 'NP', 'AE', 'SA', 'SG', 'HK', 'MY', 'PH'];
const MOBILE_BILL = ['IN', 'PK', 'BD', 'LK', 'NP', 'AE', 'SA', 'MY', 'TH', 'ID', 'PH', 'VN', 'JP', 'KR', 'CN', 'HK', 'TW', 'SG'];

/** Starter categories for a new Pocket, for its owner's country (null: not known, so the common set). */
export function defaultCategoriesFor(region: string | null): CategorySeed[] {
  const keep = new Set(COMMON);
  if (region === 'GB' || region === null) ['amazon', 'counciltax', 'water'].forEach((id) => keep.add(id));
  if (region && AMAZON.includes(region)) keep.add('amazon');
  if (region && FUEL.includes(region)) keep.add('fuel');
  if (region && DOMESTIC_HELP.includes(region)) keep.add('domestichelp');
  if (region && MOBILE_BILL.includes(region)) keep.add('mobile');
  return ALL_SEEDS.filter((c) => keep.has(c.id));
}

/**
 * Version of the default category set. Pockets created before a version are brought up to date
 * once (see upgradeDefaults), so nobody has to do it by hand.
 *   2: adds Amazon, Rent, Council tax, Water bill and Household
 *   3: renames Transport to Travel
 *   4: adds Health and Personal care
 */
export const DEFAULTS_VERSION = 4;
/** Categories each version added, by version. */
export const ADDED_IN: Record<number, string[]> = {
  2: ['amazon', 'rent', 'counciltax', 'water', 'household'],
  4: ['health', 'personalcare'],
};
export const RENAMED_IN_V3: Record<string, [from: string, to: string]> = { transport: ['Transport', 'Travel'] };

/** Chart colours handed out in turn to new categories. */
export const CATEGORY_PALETTE = ['#4FC48A', '#5AA0F0', '#A884F0', '#8FA0B8', '#F09A55', '#EE86B4', '#E2725E', '#EE6F7C', '#E8B83E', '#9AA0AA'];

/** Order values are spaced so new categories can slot in above Other. */
export const ORDER_STEP = 1000;

/** Softer tints used for the Calendar day breakdown bar. */
const PASTEL: Record<string, string> = {
  groceries: '#9EC5EE',
  restaurants: '#9BE39B',
  shopping: '#C79BEA',
  bills: '#D2C6B8',
  subscriptions: '#EFD36A',
  entertainment: '#EE7B86',
  transport: '#F2C27A',
  gifts: '#F4A6C8',
  self: '#E8746A',
  other: '#C9C9C9',
};

export function pastelFor(id: string, colour: string): string {
  if (PASTEL[id]) return PASTEL[id];
  const hex = colour.replace('#', '');
  if (hex.length !== 6) return colour;
  const mix = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.6 + 255 * 0.4);
  return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
}
