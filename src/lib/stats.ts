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

export interface WeekBar {
  label: string;
  total: number;
  /** Week hasn't started yet, or nothing spent this month: drawn as a dashed placeholder. */
  ghost: boolean;
  current: boolean;
}

/** Weekly spend card: 1–7, 8–14, 15–21, 22–28, 29–end. */
export function weeklyBars(expenses: Expense[], code: string, month: string): { weeks: WeekBar[]; avg: number } {
  const dim = daysInMonth(month);
  const elapsed = daysElapsed(month);
  const ranges: [number, number][] = [];
  for (let a = 1; a <= dim; a += 7) ranges.push([a, Math.min(a + 6, dim)]);
  const sums = ranges.map(() => 0);
  let total = 0;
  for (const e of expenses) {
    if (e.currency !== code || !e.date.startsWith(month)) continue;
    const d = Number(e.date.slice(8, 10));
    sums[Math.floor((d - 1) / 7)] += e.amountMinor;
    total += e.amountMinor;
  }
  const empty = total === 0;
  const weeks = ranges.map(([a, b], i) => ({
    label: `${a}–${b}`,
    total: sums[i],
    ghost: empty || a > elapsed,
    current: a <= elapsed && elapsed <= b && month === currentMonth(),
  }));
  const avg = elapsed > 0 ? total / (elapsed / 7) : 0;
  return { weeks, avg };
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
