/** Dates are stored as local calendar days, 'YYYY-MM-DD'. Months as 'YYYY-MM'. */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDayKey(new Date());
}

export function monthOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(todayKey());
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1];
}

export function monthShort(month: string): string {
  return MONTHS_SHORT[Number(month.slice(5, 7)) - 1];
}

export function monthYear(month: string): string {
  return `${monthName(month)} ${month.slice(0, 4)}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

/** First day of the following month, as an exclusive upper bound. */
export function monthEnd(month: string): string {
  return `${addMonths(month, 1)}-01`;
}

/** "18 Sept" */
export function dayMonth(dayKey: string): string {
  const d = fromDayKey(dayKey);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "18 Sept 2026" */
export function longDate(dayKey: string): string {
  const d = fromDayKey(dayKey);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function relative(dayKey: string): 'today' | 'yesterday' | null {
  const today = new Date();
  if (dayKey === toDayKey(today)) return 'today';
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKey === toDayKey(y)) return 'yesterday';
  return null;
}

/** "Thu 17 Sept" */
export function weekdayDate(dayKey: string): string {
  const d = fromDayKey(dayKey);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Expense sheet date row: "Today, 19 Sept" / "Yesterday, 18 Sept" / "Thu 17 Sept". */
export function sheetDateLabel(dayKey: string): string {
  const r = relative(dayKey);
  if (r === 'today') return `Today, ${dayMonth(dayKey)}`;
  if (r === 'yesterday') return `Yesterday, ${dayMonth(dayKey)}`;
  return weekdayDate(dayKey);
}

/** Transactions group header: "Today" / "Yesterday" / "Thu 17 Sept". */
export function groupLabel(dayKey: string): string {
  const r = relative(dayKey);
  if (r === 'today') return 'Today';
  if (r === 'yesterday') return 'Yesterday';
  return weekdayDate(dayKey);
}
