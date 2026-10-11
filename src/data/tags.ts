import { arrayRemove, arrayUnion, deleteField, getCountFromServer, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { cleanTag } from './expenses';
import { commit } from './pockets';
import { BATCH_LIMIT, expensesCol, pocketRef } from './refs';
import type { Expense, Pocket } from './types';

/** Tags compare without case: "goa trip" and "Goa Trip" are the same tag. */
export const sameTag = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

/** The Pocket's spelling of a tag, if it already has it. */
export function existingTag(pocket: Pick<Pocket, 'tags'>, tag: string): string | undefined {
  return (pocket.tags ?? []).find((t) => sameTag(t, tag));
}

/** Adds a tag to the Pocket's list if it's new. Returns the spelling to store on the expense. */
export function rememberTag(pocket: Pocket, raw: string): string {
  const tag = cleanTag(raw);
  if (!tag) return '';
  const known = existingTag(pocket, tag);
  if (known) return known;
  const batch = writeBatch(db);
  batch.update(pocketRef(pocket.id), { tags: arrayUnion(tag) });
  void commit(batch).catch(() => {
    /* the expense keeps its tag; the list catches up next time */
  });
  return tag;
}

export async function countTagged(pid: string, tag: string): Promise<number> {
  const snap = await getCountFromServer(query(expensesCol(pid), where('tag', '==', tag)));
  return snap.data().count;
}

export async function taggedExpenses(pid: string, tag: string): Promise<Expense[]> {
  const snap = await getDocs(query(expensesCol(pid), where('tag', '==', tag)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
}

/** Removes a tag from the Pocket and from its expenses. The expenses stay. */
export async function deleteTag(pid: string, tag: string): Promise<void> {
  const snap = await getDocs(query(expensesCol(pid), where('tag', '==', tag)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + BATCH_LIMIT)) batch.update(d.ref, { tag: deleteField() });
    await commit(batch);
  }
  const batch = writeBatch(db);
  batch.update(pocketRef(pid), { tags: arrayRemove(tag) });
  await commit(batch);
}
