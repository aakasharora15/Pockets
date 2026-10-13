import { useEffect, useState } from 'react';
import type { CurrencyCode } from '../lib/currencies';
import { combinedTotal, combinedTotalsBy } from '../lib/rates';
import type { Expense } from './types';

export interface CombinedState {
  total: number;
  /** Expenses that couldn't be converted (no rate available yet). */
  missing: number;
  loading: boolean;
  /** No rates at all (offline and nothing cached). */
  error: boolean;
}

/** All expenses converted into one currency at each expense's own date's rate. */
export function useCombined(expenses: Expense[], target: CurrencyCode | null): CombinedState {
  const [state, setState] = useState<CombinedState>({ total: 0, missing: 0, loading: true, error: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Try again when the connection comes back.
    const on = () => setTick((t) => t + 1);
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);
  const key = target ? expenses.map((e) => `${e.id}:${e.currency}:${e.amountMinor}:${e.date}`).join('|') : '';

  useEffect(() => {
    if (!target) return;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    combinedTotal(expenses, target)
      .then((r) => live && setState({ ...r, loading: false, error: false }))
      .catch(() => live && setState({ total: 0, missing: 0, loading: false, error: true }));
    return () => {
      live = false;
    };
  }, [key, target, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

export interface CombinedByState {
  /** Converted total per payer (byUid), in minor units of the target currency. */
  totals: Map<string, number>;
  /** Expenses that couldn't be converted (no rate yet). */
  missing: number;
  loading: boolean;
  /** No rates at all: totals then count only expenses already in the target currency. */
  error: boolean;
}

/** Each payer's spending converted into one currency, every expense at its own day's rate. */
export function useCombinedByPayer(expenses: Expense[], target: CurrencyCode): CombinedByState {
  const same = (list: Expense[]) => {
    const m = new Map<string, number>();
    for (const e of list) if (e.currency === target) m.set(e.byUid, (m.get(e.byUid) ?? 0) + e.amountMinor);
    return m;
  };
  const [state, setState] = useState<CombinedByState>(() => ({ totals: same(expenses), missing: 0, loading: true, error: false }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);
  const key = expenses.map((e) => `${e.id}:${e.byUid}:${e.currency}:${e.amountMinor}:${e.date}`).join('|');

  useEffect(() => {
    let live = true;
    const mixed = expenses.some((e) => e.currency !== target);
    if (!mixed) {
      setState({ totals: same(expenses), missing: 0, loading: false, error: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    combinedTotalsBy(expenses, target, (i) => expenses[i].byUid)
      .then((by) => {
        if (!live) return;
        const totals = new Map<string, number>();
        let missing = 0;
        for (const [uid, r] of by) {
          totals.set(uid, r.total);
          missing += r.missing;
        }
        setState({ totals, missing, loading: false, error: false });
      })
      .catch(() => live && setState({ totals: same(expenses), missing: 0, loading: false, error: true }));
    return () => {
      live = false;
    };
  }, [key, target, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
