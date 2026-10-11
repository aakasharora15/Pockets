import { addMonths, daysInMonth, monthOf } from './dates';

/**
 * Monthly repeats. A repeat has a day of the month (1–31); in months without that day it's
 * logged on the last day (31 → 30 Apr, 28 or 29 Feb), then goes back to the 31st.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** The repeat's date in a month: 'YYYY-MM-DD'. */
export function dueIn(month: string, day: number): string {
  return `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
}

export function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}

/**
 * First date to log automatically after an expense on `date`: the next due date after it that
 * isn't already in the past, so marking an old expense as repeating doesn't back-fill months.
 */
export function firstDue(date: string, day: number, today: string): string {
  let month = monthOf(date);
  let due = dueIn(month, day);
  while (due <= date || due < today) {
    month = addMonths(month, 1);
    due = dueIn(month, day);
  }
  return due;
}

/** Dates due on or before today, starting at nextDate, and the next one after them. */
export function dueDates(nextDate: string, day: number, today: string, max = 36): { dates: string[]; next: string } {
  const dates: string[] = [];
  let due = nextDate;
  let month = monthOf(nextDate);
  while (due <= today && dates.length < max) {
    dates.push(due);
    month = addMonths(month, 1);
    due = dueIn(month, day);
  }
  return { dates, next: due };
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

/** "Monthly on the 1st", "Monthly on the 31st or last day". */
export function repeatLabel(day: number): string {
  return `Monthly on the ${ordinal(day)}${day >= 29 ? ' or last day' : ''}`;
}

/** A logged repeat gets a predictable id, so the same month can never be logged twice. */
export function occurrenceId(rid: string, date: string): string {
  return `rec_${rid}_${date}`;
}
