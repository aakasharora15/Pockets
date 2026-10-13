import { useEffect, useState } from 'react';
import type { CurrencyCode } from '../lib/currencies';
import { combinedTotal } from '../lib/rates';
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
