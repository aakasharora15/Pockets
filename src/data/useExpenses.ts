import { onSnapshot, orderBy, query, where, type QuerySnapshot } from 'firebase/firestore';
import { listen } from './listen';
import { useEffect, useState } from 'react';
import { monthEnd, monthStart } from '../lib/dates';
import { expensesCol } from './refs';
import type { Expense } from './types';

export interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  error: boolean;
}

/**
 * Live expenses of a Pocket between two months (inclusive), newest first. Works offline from the
 * local cache and marks unsynced writes as pending.
 */
export function useExpenses(pid: string | undefined, fromMonth: string, toMonth: string = fromMonth): ExpensesState {
  const [state, setState] = useState<ExpensesState>({ expenses: [], loading: true, error: false });

  useEffect(() => {
    if (!pid) return;
    setState((s) => ({ ...s, loading: true, error: false }));
    const q = query(
      expensesCol(pid),
      where('date', '>=', monthStart(fromMonth)),
      where('date', '<', monthEnd(toMonth)),
      orderBy('date', 'desc'),
    );
    return listen<QuerySnapshot>(
      (next, fail) => onSnapshot(q, { includeMetadataChanges: true }, next, fail),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Expense, 'id'>),
          pending: d.metadata.hasPendingWrites,
        }));
        // Same day: newest added first.
        list.sort((a, b) => (a.date === b.date ? (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0) : a.date < b.date ? 1 : -1));
        setState({ expenses: list, loading: false, error: false });
      },
      () => setState({ expenses: [], loading: false, error: true }),
    );
  }, [pid, fromMonth, toMonth]);

  return state;
}
