/** Default categories created for every new Pocket. Order matches Manage categories (19c). */
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
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', colour: '#8FA0B8' },
  { id: 'transport', name: 'Transport', icon: 'train-simple', colour: '#F09A55' },
  { id: 'gifts', name: 'Gifts', icon: 'gift', colour: '#EE86B4' },
  { id: 'self', name: 'Self improvement', icon: 'book-open', colour: '#E2725E' },
  { id: 'entertainment', name: 'Entertainment', icon: 'ticket', colour: '#EE6F7C' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', colour: '#E8B83E' },
  { id: OTHER_ID, name: 'Other', icon: 'dots-three', colour: '#9AA0AA' },
];

/** Chart colours handed out in turn to new categories. */
export const CATEGORY_PALETTE = DEFAULT_CATEGORIES.map((c) => c.colour);

/** Order values are spaced so new categories can slot in above Other. */
export const ORDER_STEP = 1000;

/** Softer tints used for the Calendar day breakdown bar (from the design's category table). */
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
