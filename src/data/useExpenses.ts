import { onSnapshot, orderBy, query, where, type Query, type QuerySnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { monthEnd, monthStart } from '../lib/dates';
import { listen } from './listen';
import { useOutbox, type ExpenseEntry } from './outbox';
import { expensesCol } from './refs';
import type { Expense } from './types';

export interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  error: boolean;
}

/** Same day: newest added first. */
function byDateDesc(a: Expense, b: Expense) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) - (a.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER);
}

function fromOutbox(e: ExpenseEntry): Expense {
  return { ...(e.data as Omit<Expense, 'id'>), id: e.eid, createdAt: null, updatedAt: null, pending: true };
}

/**
 * Live expenses for a query. Works offline from the local cache, marks unsynced writes as pending,
 * and adds anything still in the outbox that Firestore's cache no longer has.
 */
function useExpenseQuery(pid: string | undefined, key: string, build: (pid: string) => Query, include: (e: Expense) => boolean): ExpensesState {
  const [state, setState] = useState<ExpensesState>({ expenses: [], loading: true, error: false });
  const outbox = useOutbox();

  useEffect(() => {
    if (!pid) return;
    setState((s) => ({ ...s, loading: true, error: false }));
    const q = build(pid);
    return listen<QuerySnapshot>(
      (next, fail) => onSnapshot(q, { includeMetadataChanges: true }, next, fail),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Expense, 'id'>),
          pending: d.metadata.hasPendingWrites,
        }));
        setState({ expenses: list, loading: false, error: false });
      },
      () => setState({ expenses: [], loading: false, error: true }),
    );
  }, [pid, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const expenses = useMemo(() => {
    const waiting = outbox.filter((e): e is ExpenseEntry => e.kind === 'expense' && e.pid === pid);
    if (waiting.length === 0) return [...state.expenses].sort(byDateDesc);
    const ids = new Map(waiting.map((e) => [e.eid, e]));
    const list = state.expenses.map((e) => (ids.has(e.id) ? { ...e, pending: true } : e));
    const seen = new Set(list.map((e) => e.id));
    for (const e of waiting) {
      const x = fromOutbox(e);
      if (!seen.has(x.id) && include(x)) list.push(x);
    }
    return list.sort(byDateDesc);
  }, [state.expenses, outbox, pid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, expenses };
}

/** Live expenses of a Pocket between two months (inclusive), newest first. */
export function useExpenses(pid: string | undefined, fromMonth: string, toMonth: string = fromMonth): ExpensesState {
  const from = monthStart(fromMonth);
  const to = monthEnd(toMonth);
  return useExpenseQuery(
    pid,
    `${from}..${to}`,
    (p) => query(expensesCol(p), where('date', '>=', from), where('date', '<', to), orderBy('date', 'desc')),
    (e) => e.date >= from && e.date < to,
  );
}

/** Live expenses of a Pocket with one tag, newest first. */
export function useTagExpenses(pid: string | undefined, tag: string): ExpensesState {
  return useExpenseQuery(pid, `tag:${tag}`, (p) => query(expensesCol(p), where('tag', '==', tag)), (e) => e.tag === tag);
}
