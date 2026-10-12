import { doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where, writeBatch, type QuerySnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { todayKey } from '../lib/dates';
import { dayOf, dueDates, firstDue, occurrenceId } from '../lib/recurring';
import { cleanExpense, type ExpenseInput } from './expenses';
import { listen } from './listen';
import { commit } from './pockets';
import { expenseRef, recurringCol, recurringRef } from './refs';
import type { Recurring } from './types';

/** The template fields shared by a repeat and the expenses it logs. */
function template(input: ExpenseInput) {
  const data = cleanExpense({ ...input, recurringId: undefined, receipt: false });
  delete data.date;
  return data;
}

/** A new repeat id, so the first expense can link to it before it's saved. */
export function newRecurringId(pid: string): string {
  return doc(recurringCol(pid)).id;
}

/** Starts repeating an expense monthly, on the day of its date. */
export async function startRecurring(pid: string, rid: string, input: ExpenseInput, uid: string): Promise<void> {
  const day = dayOf(input.date);
  const batch = writeBatch(db);
  batch.set(recurringRef(pid, rid), {
    ...template(input),
    day,
    nextDate: firstDue(input.date, day, todayKey()),
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await commit(batch);
}

/** Editing an expense that repeats changes what future months log (not their day). */
export async function updateRecurring(pid: string, rid: string, input: ExpenseInput): Promise<void> {
  const batch = writeBatch(db);
  batch.update(recurringRef(pid, rid), { ...template(input), updatedAt: serverTimestamp() });
  await commit(batch);
}

/** Stops a repeat. Expenses it already logged stay. */
export async function stopRecurring(pid: string, rid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(recurringRef(pid, rid));
  await commit(batch);
}

/**
 * Logs every repeat in a Pocket that's due by today. Each repeat is handled in a transaction that
 * re-reads its next date, and logged expenses get predictable ids, so two phones opening the app at
 * the same time can't log the same month twice. Needs a connection; offline it waits until next time.
 */
export async function logDueRecurring(pid: string, today = todayKey()): Promise<number> {
  const due = await getDocs(query(recurringCol(pid), where('nextDate', '<=', today)));
  let logged = 0;
  for (const d of due.docs) {
    logged += await runTransaction(db, async (tx) => {
      const snap = await tx.get(d.ref);
      if (!snap.exists()) return 0;
      const r = snap.data() as Omit<Recurring, 'id'>;
      const { dates, next } = dueDates(r.nextDate, r.day, today);
      if (dates.length === 0) return 0;
      const { day: _day, nextDate: _next, createdByUid: _by, createdAt: _c, updatedAt: _u, ...fields } = r;
      for (const date of dates) {
        tx.set(expenseRef(pid, occurrenceId(d.id, date)), {
          ...fields,
          date,
          recurringId: d.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      tx.update(d.ref, { nextDate: next, updatedAt: serverTimestamp() });
      return dates.length;
    });
  }
  return logged;
}

/** Live repeats of a Pocket, by next date. */
export function useRecurring(pid: string | undefined): { list: Recurring[]; loading: boolean } {
  const [state, setState] = useState<{ list: Recurring[]; loading: boolean }>({ list: [], loading: true });
  useEffect(() => {
    if (!pid) return;
    setState({ list: [], loading: true });
    return listen<QuerySnapshot>(
      (next, fail) => onSnapshot(recurringCol(pid), next, fail),
      (snap) => {
        const list = snap.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Recurring, 'id'>) }));
        list.sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : a.name.localeCompare(b.name)));
        setState({ list, loading: false });
      },
      () => setState({ list: [], loading: false }),
    );
  }, [pid]);
  return state;
}
