import type { Expense } from '../data/types';
import { currentMonth, daysInMonth } from './dates';

/** Sum of an expense list in one currency (minor units). Totals never mix currencies. */
export function totalIn(expenses: Expense[], code: string): number {
  let s = 0;
  for (const e of expenses) if (e.currency === code) s += e.amountMinor;
  return s;
}

export function inMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => e.date.startsWith(month));
}

/** How many days of the month have happened (all of them for past months, none for future ones). */
export function daysElapsed(month: string, now = new Date()): number {
  const cur = currentMonth();
  if (month < cur) return daysInMonth(month);
  if (month > cur) return 0;
  return now.getDate();
}

/** Spend per day of the month in one currency (index 0 is the 1st), for the day-by-day timeline. */
export function dailySpend(expenses: Expense[], code: string, month: string, now = new Date()): { days: number[]; elapsed: number; perDay: number } {
  const days = new Array<number>(daysInMonth(month)).fill(0);
  let total = 0;
  for (const e of expenses) {
    if (e.currency !== code || !e.date.startsWith(month)) continue;
    days[Number(e.date.slice(8, 10)) - 1] += e.amountMinor;
    total += e.amountMinor;
  }
  const elapsed = daysElapsed(month, now);
  return { days, elapsed, perDay: elapsed > 0 ? total / elapsed : 0 };
}

/** Category totals in one currency, biggest first. */
export function byCategory(expenses: Expense[], code: string): { categoryId: string; total: number }[] {
  const m = new Map<string, number>();
  for (const e of expenses) if (e.currency === code) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amountMinor);
  return [...m.entries()].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total);
}

/** Percentage change vs a previous total, rounded; null when there's nothing to compare. */
export function trend(now: number, before: number): number | null {
  if (!before || !now) return null;
  return Math.round(((now - before) / before) * 100);
}
