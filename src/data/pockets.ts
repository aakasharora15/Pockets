import { arrayRemove, arrayUnion, collection, deleteField, doc, getDocs, query, serverTimestamp, where, writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { trackExpenseWrite } from './pending';
import { defaultCategoriesFor, DEFAULTS_VERSION, ORDER_STEP } from '../lib/categories';
import { deviceRegion } from '../lib/locale';
import type { CurrencyCode } from '../lib/currencies';
import {
  BATCH_LIMIT,
  categoriesCol,
  categoryRef,
  expensesCol,
  invitesCol,
  memberRef,
  membersCol,
  personalPocketId,
  pocketRef,
  receiptsCol,
  recurringCol,
  shoppingCol,
  userRef,
} from './refs';
import type { PocketType } from './types';

interface NewPocket {
  id?: string;
  name: string;
  type: PocketType;
  currencies: CurrencyCode[];
  owner: { uid: string; name: string; initials: string };
}

/** Adds the writes that create a Pocket, its owner membership and its default categories. */
export function addPocketCreation(batch: WriteBatch, p: NewPocket): string {
  const ref = p.id ? pocketRef(p.id) : doc(collection(db, 'pockets'));
  batch.set(ref, {
    name: p.name,
    type: p.type,
    ownerUid: p.owner.uid,
    currencies: p.currencies,
    budgets: {},
    defaultsVersion: DEFAULTS_VERSION,
    createdAt: serverTimestamp(),
  });
  batch.set(memberRef(ref.id, p.owner.uid), {
    uid: p.owner.uid,
    name: p.owner.name,
    initials: p.owner.initials,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });
  // Starter categories that suit the owner's country (from the phone's settings).
  defaultCategoriesFor(deviceRegion()).forEach((c, i) => {
    batch.set(categoryRef(ref.id, c.id), {
      name: c.name,
      icon: c.icon,
      colour: c.colour,
      order: (i + 1) * ORDER_STEP,
      system: c.id === 'other',
    });
  });
  batch.update(userRef(p.owner.uid), { pocketIds: arrayUnion(ref.id) });
  return ref.id;
}

/** Setup 4/4: creates the profile, the Personal Pocket and, optionally, a shared "Home". */
export async function completeSetup(opts: {
  uid: string;
  email: string;
  name: string;
  initials: string;
  currencies: CurrencyCode[];
  /** Name of a shared Pocket to create with the account, if any. */
  sharedName?: string;
  /** Keep the Personal Pocket out of sight (it's still created, as a fallback). */
  hidePersonal: boolean;
}): Promise<{ personalId: string; sharedId?: string }> {
  const batch = writeBatch(db);
  batch.set(userRef(opts.uid), {
    name: opts.name,
    initials: opts.initials,
    email: opts.email,
    createdAt: serverTimestamp(),
    pocketIds: [],
    ...(opts.hidePersonal ? { hidePersonal: true } : {}),
  });
  const owner = { uid: opts.uid, name: opts.name, initials: opts.initials };
  const personalId = addPocketCreation(batch, {
    id: personalPocketId(opts.uid),
    name: 'Personal',
    type: 'personal',
    currencies: opts.currencies,
    owner,
  });
  let sharedId: string | undefined;
  if (opts.sharedName) {
    sharedId = addPocketCreation(batch, { name: opts.sharedName, type: 'shared', currencies: opts.currencies, owner });
  }
  await commit(batch);
  return { personalId, sharedId };
}

export async function createSharedPocket(name: string, currencies: CurrencyCode[], owner: NewPocket['owner']): Promise<string> {
  const batch = writeBatch(db);
  const id = addPocketCreation(batch, { name, type: 'shared', currencies, owner });
  await commit(batch);
  return id;
}

export async function updatePocket(pid: string, data: { name?: string; currencies?: CurrencyCode[] }) {
  const batch = writeBatch(db);
  batch.update(pocketRef(pid), data);
  await commit(batch);
}

export async function setBudget(pid: string, code: CurrencyCode, minor: number | null) {
  const batch = writeBatch(db);
  batch.update(pocketRef(pid), { [`budgets.${code}`]: minor && minor > 0 ? minor : deleteField() });
  await commit(batch);
}

/** Owner removes someone. Their expenses stay, showing their initials. */
export async function removeMember(pid: string, uid: string) {
  const batch = writeBatch(db);
  batch.delete(memberRef(pid, uid));
  await commit(batch);
}

/** A member leaves a shared Pocket. */
export async function leavePocket(pid: string, uid: string) {
  const batch = writeBatch(db);
  batch.delete(memberRef(pid, uid));
  batch.update(userRef(uid), { pocketIds: arrayRemove(pid) });
  await commit(batch);
}

/** Deletes everything under a Pocket in chunks, then the Pocket and finally the owner's membership. */
export async function deletePocket(pid: string, ownerUid: string) {
  for (const col of [expensesCol(pid), categoriesCol(pid), recurringCol(pid), receiptsCol(pid), shoppingCol(pid)]) {
    await deleteAll((await getDocs(col)).docs.map((d) => d.ref));
  }
  const invites = await getDocs(query(invitesCol(), where('pocketId', '==', pid)));
  await deleteAll(invites.docs.map((d) => d.ref));
  const members = await getDocs(membersCol(pid));
  await deleteAll(members.docs.filter((d) => d.id !== ownerUid).map((d) => d.ref));
  const batch = writeBatch(db);
  batch.delete(pocketRef(pid));
  batch.delete(memberRef(pid, ownerUid));
  batch.update(userRef(ownerUid), { pocketIds: arrayRemove(pid) });
  await commit(batch);
}

async function deleteAll(refs: { path: string }[]) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const r of refs.slice(i, i + BATCH_LIMIT)) batch.delete(r as never);
    await commit(batch);
  }
}

/**
 * Commits a batch. When offline, Firestore queues the write locally and the promise only resolves
 * once the server acknowledges it, so we don't await forever: the local cache is updated
 * immediately and listeners fire straight away.
 */
export function commit(batch: WriteBatch, opts: { expense?: boolean } = {}): Promise<void> {
  const p = batch.commit();
  if (opts.expense) trackExpenseWrite(p);
  if (!navigator.onLine) {
    p.catch((e) => console.error('Queued write failed', e));
    return Promise.resolve();
  }
  return p;
}
