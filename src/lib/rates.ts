import type { Expense } from '../data/types';
import { CURRENCIES, type CurrencyCode } from './currencies';
import { currentMonth, fromDayKey, monthEnd, monthOf, monthStart, toDayKey, todayKey } from './dates';
import { idbGet, idbPut } from './idb';

/**
 * Exchange rates for the optional combined total. Daily reference rates come from Frankfurter
 * (free, no key, central bank data). Each expense is converted at the rate for its own date, or
 * the last working day before it when there's no rate that day (weekends, holidays). Rates are
 * cached on the phone: past months for good, the current month for a day.
 */

const API = 'https://api.frankfurter.dev/v2/rates';

/** date → (currency → units of that currency per 1 unit of the base). */
export type DailyRates = Record<string, Partial<Record<CurrencyCode, number>>>;

interface Cached {
  fetchedOn: string;
  rates: DailyRates;
}

const memory = new Map<string, Cached>();
const inflight = new Map<string, Promise<DailyRates>>();

function shiftDays(day: string, n: number): string {
  const d = fromDayKey(day);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

/** Rate on a date: that day's, or the closest earlier one in the data. */
export function rateOn(rates: DailyRates, code: CurrencyCode, date: string): number | undefined {
  let best: string | undefined;
  for (const d of Object.keys(rates)) {
    if (d <= date && rates[d][code] !== undefined && (best === undefined || d > best)) best = d;
  }
  return best ? rates[best][code] : undefined;
}

/**
 * Total of expenses in one currency, converting each with `lookup` (units of its currency per 1
 * unit of the target, on its date). Every supported currency has 100 minor units, so minor units
 * convert directly. `missing` counts expenses with no rate yet.
 */
export function combine(
  expenses: Pick<Expense, 'currency' | 'amountMinor' | 'date'>[],
  target: CurrencyCode,
  lookup: (code: CurrencyCode, date: string) => number | undefined,
): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const e of expenses) {
    if (e.currency === target) {
      total += e.amountMinor;
      continue;
    }
    const r = lookup(e.currency, e.date);
    if (r && r > 0) total += Math.round(e.amountMinor / r);
    else missing++;
  }
  return { total, missing };
}

/** Rates with `base` for a month, plus the ten days before it (so the 1st after a weekend has one). */
export async function monthRates(base: CurrencyCode, month: string): Promise<DailyRates> {
  const key = `${base}:${month}`;
  const today = todayKey();
  const fresh = (c: Cached | undefined) => !!c && (month < currentMonth() || c.fetchedOn === today);
  const mem = memory.get(key);
  if (fresh(mem)) return mem!.rates;
  const stored = await idbGet<Cached>('rates', key).catch(() => undefined);
  if (fresh(stored)) {
    memory.set(key, stored!);
    return stored!.rates;
  }
  if (month > currentMonth()) return monthRates(base, currentMonth());
  let p = inflight.get(key);
  if (!p) {
    p = fetchRates(base, shiftDays(monthStart(month), -10), month === currentMonth() ? today : shiftDays(monthEnd(month), -1))
      .then(async (rates) => {
        const c = { fetchedOn: today, rates };
        memory.set(key, c);
        await idbPut('rates', key, c).catch(() => {});
        return rates;
      })
      .catch((e) => {
        // Offline: an older copy of this month is better than nothing.
        if (stored) return stored.rates;
        throw e;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

async function fetchRates(base: CurrencyCode, from: string, to: string): Promise<DailyRates> {
  const quotes = CURRENCIES.map((c) => c.code).filter((c) => c !== base);
  const url = `${API}?from=${from}&to=${to}&base=${base}&quotes=${quotes.join(',')}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Rates ${res.status}`);
  const rows = (await res.json()) as { date: string; base: string; quote: string; rate: number }[];
  const out: DailyRates = {};
  for (const r of rows) {
    if (r.base !== base || r.quote === base || !(r.rate > 0)) continue;
    (out[r.date] ??= {})[r.quote as CurrencyCode] = r.rate;
  }
  return out;
}

/** Converts expenses to one currency at each expense's own date. */
export async function combinedTotal(
  expenses: Pick<Expense, 'currency' | 'amountMinor' | 'date'>[],
  target: CurrencyCode,
): Promise<{ total: number; missing: number }> {
  const lookup = await ratesFor(expenses, target);
  return combine(expenses, target, lookup);
}

/** Rates covering every month these expenses fall in. Throws only if none could be loaded. */
async function ratesFor(
  expenses: Pick<Expense, 'currency' | 'amountMinor' | 'date'>[],
  target: CurrencyCode,
): Promise<(code: CurrencyCode, date: string) => number | undefined> {
  const months = [...new Set(expenses.filter((e) => e.currency !== target).map((e) => monthOf(e.date)))];
  const all: DailyRates = {};
  let failed = 0;
  await Promise.all(
    months.map(async (m) => {
      try {
        // A month's first days may need the previous month's last rate.
        Object.assign(all, await monthRates(target, m));
      } catch {
        failed++;
      }
    }),
  );
  if (failed && failed === months.length && months.length) throw new Error('No rates');
  return (code, date) => rateOn(all, code, date);
}
