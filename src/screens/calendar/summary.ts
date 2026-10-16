import type { Expense, Pocket } from '../../data/types';
import type { CurrencyCode } from '../../lib/currencies';
import { formatMoney } from '../../lib/money';

export interface MonthSummary {
  /** "Left in October", "Over in October" or "Spent in October". */
  label: string;
  /** The amount to show big, in minor units (never negative). */
  amount: number;
  /** "of £2,000.00 budget" or "on 6 days". */
  sub: string;
  /** Days with any spending, as day keys. */
  days: Set<string>;
  /** Past the budget. */
  over: boolean;
}

/** The month at a glance in one currency: what's left of the budget if there is one, else what's been spent. */
export function monthSummary(expenses: Expense[], pocket: Pocket, code: CurrencyCode, monthLabel: string): MonthSummary {
  const spent = expenses.filter((e) => e.currency === code).reduce((s, e) => s + e.amountMinor, 0);
  const days = new Set(expenses.map((e) => e.date));
  const budget = pocket.budgets[code];
  if (budget) {
    const left = budget - spent;
    return {
      label: `${left >= 0 ? 'Left' : 'Over'} in ${monthLabel}`,
      amount: Math.abs(left),
      sub: `of ${formatMoney(budget, code)} budget`,
      days,
      over: left < 0,
    };
  }
  return { label: `Spent in ${monthLabel}`, amount: spent, sub: `on ${days.size} ${days.size === 1 ? 'day' : 'days'}`, days, over: false };
}
