import {
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CurrencyCode } from '../lib/currencies';
import { commit } from './pockets';
import { BATCH_LIMIT, expenseRef, expensesCol } from './refs';
import type { Expense } from './types';

export interface ExpenseInput {
  currency: CurrencyCode;
  amountMinor: number;
  name: string;
  categoryId: string;
  byUid: string;
  byInitials: string;
  date: string;
  note: string;
}

function clean(input: ExpenseInput) {
  const data: Record<string, unknown> = {
    currency: input.currency,
    amountMinor: Math.round(input.amountMinor),
    name: input.name.trim().slice(0, 100),
    categoryId: input.categoryId,
    byUid: input.byUid,
    byInitials: input.byInitials,
    date: input.date,
  };
  const note = input.note.trim();
  if (note) data.note = note.slice(0, 500);
  return data;
}

export async function addExpense(pid: string, input: ExpenseInput): Promise<string> {
  const ref = doc(expensesCol(pid));
  const batch = writeBatch(db);
  batch.set(ref, { ...clean(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await commit(batch, { expense: true });
  return ref.id;
}

/** Saves an edit. If the Pocket changed, the expense moves (create in the new one, delete the old). */
export async function saveExpenseEdit(
  original: Expense,
  fromPid: string,
  toPid: string,
  input: ExpenseInput,
  editorUid: string,
): Promise<void> {
  const batch = writeBatch(db);
  const data = { ...clean(input), editedByUid: editorUid, updatedAt: serverTimestamp() };
  if (fromPid === toPid) {
    // Overwrite so a cleared note is removed; keep the original creation time.
    batch.set(expenseRef(fromPid, original.id), { ...data, createdAt: original.createdAt ?? serverTimestamp() });
  } else {
    batch.set(doc(expensesCol(toPid)), { ...data, createdAt: original.createdAt ?? serverTimestamp() });
    batch.delete(expenseRef(fromPid, original.id));
  }
  await commit(batch, { expense: true });
}

export async function deleteExpense(pid: string, id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(expenseRef(pid, id));
  await commit(batch, { expense: true });
}

export async function countInCategory(pid: string, categoryId: string): Promise<number> {
  const snap = await getCountFromServer(query(expensesCol(pid), where('categoryId', '==', categoryId)));
  return snap.data().count;
}

export async function allExpenses(pid: string): Promise<Expense[]> {
  const snap = await getDocs(query(expensesCol(pid), orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
}

/** Moves every expense from one Pocket to another (used when joining with "Move to {Pocket}"). */
export async function moveAllExpenses(fromPid: string, toPid: string): Promise<number> {
  const snap = await getDocs(expensesCol(fromPid));
  const docs = snap.docs;
  const per = Math.floor(BATCH_LIMIT / 2);
  for (let i = 0; i < docs.length; i += per) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + per)) {
      batch.set(doc(expensesCol(toPid)), d.data());
      batch.delete(d.ref);
    }
    await commit(batch);
  }
  return docs.length;
}

/** Re-points every expense in a category to another (Other). */
export async function recategorise(pid: string, fromId: string, toId: string): Promise<void> {
  const snap = await getDocs(query(expensesCol(pid), where('categoryId', '==', fromId)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + BATCH_LIMIT)) batch.update(d.ref, { categoryId: toId });
    await commit(batch);
  }
}
