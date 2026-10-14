import { doc, getCountFromServer, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { CurrencyCode } from '../lib/currencies';
import { forgetExpense, saveExpenseDoc } from './outbox';
import { commit } from './pockets';
import { BATCH_LIMIT, expenseRef, expensesCol, receiptRef } from './refs';
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
  tag?: string;
  recurringId?: string;
  receipt?: boolean;
}

export function cleanExpense(input: ExpenseInput): Record<string, unknown> {
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
  const tag = cleanTag(input.tag ?? '');
  if (tag) data.tag = tag;
  if (input.recurringId) data.recurringId = input.recurringId;
  if (input.receipt) data.receipt = true;
  return data;
}

export function cleanTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').slice(0, 40);
}

const me = () => auth.currentUser?.uid ?? '';

/** A new expense id, so a receipt photo can be saved under it before or after the expense. */
export function newExpenseId(pid: string): string {
  return doc(expensesCol(pid)).id;
}

export async function addExpense(pid: string, input: ExpenseInput, id = newExpenseId(pid)): Promise<string> {
  await saveExpenseDoc(me(), pid, id, cleanExpense(input), null);
  return id;
}

/** Saves an edit. If the Pocket changed, the expense moves (create in the new one, delete the old). */
export async function saveExpenseEdit(original: Expense, fromPid: string, toPid: string, input: ExpenseInput, editorUid: string): Promise<string> {
  const data = { ...cleanExpense(input), editedByUid: editorUid };
  if (fromPid === toPid) {
    // Overwrite so a cleared note is removed; keep the original creation time.
    await saveExpenseDoc(me(), fromPid, original.id, data, original.createdAt);
    return original.id;
  }
  const id = newExpenseId(toPid);
  await saveExpenseDoc(me(), toPid, id, data, original.createdAt);
  await forgetExpense(fromPid, original.id);
  const batch = writeBatch(db);
  batch.delete(expenseRef(fromPid, original.id));
  if (original.receipt) batch.delete(receiptRef(fromPid, original.id));
  await commit(batch, { expense: true });
  return id;
}

export async function deleteExpense(pid: string, id: string, hasReceipt = false): Promise<void> {
  await forgetExpense(pid, id);
  const batch = writeBatch(db);
  batch.delete(expenseRef(pid, id));
  if (hasReceipt) batch.delete(receiptRef(pid, id));
  await commit(batch, { expense: true });
}

export async function countInCategory(pid: string, categoryId: string): Promise<number> {
  const snap = await getCountFromServer(query(expensesCol(pid), where('categoryId', '==', categoryId)));
  return snap.data().count;
}

/** Expenses dated within [from, to), oldest first. */
export async function expensesBetween(pid: string, from: string, to: string): Promise<Expense[]> {
  const snap = await getDocs(query(expensesCol(pid), where('date', '>=', from), where('date', '<', to), orderBy('date')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
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
