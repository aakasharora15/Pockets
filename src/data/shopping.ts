import { deleteField, doc, onSnapshot, serverTimestamp, writeBatch, type QuerySnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { listen } from './listen';
import { commit } from './pockets';
import { shoppingCol, shoppingRef } from './refs';
import type { ShoppingItem, ShoppingWhen } from './types';

/** Adds something to a Pocket's list. Works offline: the item shows at once and syncs later. */
export async function addShoppingItem(pid: string, name: string, when: ShoppingWhen, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(shoppingCol(pid)), {
    name: name.trim().slice(0, 60),
    when,
    done: false,
    addedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await commit(batch);
}

/** Ticks an item off (or back on), recording who bought it. */
export async function setShoppingDone(pid: string, iid: string, done: boolean, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(shoppingRef(pid, iid), { done, doneByUid: done ? uid : deleteField(), updatedAt: serverTimestamp() });
  await commit(batch);
}

/** Moves an item between this week and this month. */
export async function setShoppingWhen(pid: string, iid: string, when: ShoppingWhen): Promise<void> {
  const batch = writeBatch(db);
  batch.update(shoppingRef(pid, iid), { when, updatedAt: serverTimestamp() });
  await commit(batch);
}

/** Removes items, such as everything already bought. */
export async function removeShoppingItems(pid: string, ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(shoppingRef(pid, id));
  await commit(batch);
}

/** Live shopping list of a Pocket: still to buy first (oldest at the top), then what's bought. */
export function useShopping(pid: string | undefined): { items: ShoppingItem[]; loading: boolean } {
  const [state, setState] = useState<{ items: ShoppingItem[]; loading: boolean }>({ items: [], loading: true });
  useEffect(() => {
    if (!pid) return;
    setState({ items: [], loading: true });
    return listen<QuerySnapshot>(
      (next, fail) => onSnapshot(shoppingCol(pid), next, fail),
      (snap) => {
        const items = snap.docs.map((x) => ({ id: x.id, ...(x.data({ serverTimestamps: 'estimate' }) as Omit<ShoppingItem, 'id'>) }));
        items.sort((a, b) => Number(a.done) - Number(b.done) || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        setState({ items, loading: false });
      },
      () => setState({ items: [], loading: false }),
    );
  }, [pid]);
  return state;
}
