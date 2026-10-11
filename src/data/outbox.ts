import { Bytes, doc, serverTimestamp, Timestamp, writeBatch, type FirestoreError } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { idbAll, idbDelete, idbPut } from '../lib/idb';
import { trackExpenseWrite } from './pending';
import { expenseRef, expensesCol, personalPocketId, receiptRef } from './refs';

/**
 * Outbox: every expense (and receipt photo) the app saves is written here first, in IndexedDB,
 * and removed only when Firestore's server confirms it. Firestore already queues offline writes,
 * but drops them if the server refuses one (for example, you were removed from the Pocket while
 * offline) and loses them if its own storage isn't available. The outbox replays anything left
 * on start, when the connection returns and every minute, so no expense is lost.
 */

interface Base {
  key: string;
  uid: string;
  pid: string;
  eid: string;
  /** Distinguishes a newer save of the same expense from the one being confirmed. */
  queuedAt: number;
  attempts: number;
  error?: string;
}

export interface ExpenseEntry extends Base {
  kind: 'expense';
  /** Expense fields as plain values (no timestamps). */
  data: Record<string, unknown>;
  createdAtMs: number;
}

export interface ReceiptEntry extends Base {
  kind: 'receipt';
  blob: Blob;
  width: number;
  height: number;
  byUid: string;
}

export type OutboxEntry = ExpenseEntry | ReceiptEntry;

const keyOf = (kind: OutboxEntry['kind'], pid: string, eid: string) => `${kind}:${pid}/${eid}`;

const entries = new Map<string, OutboxEntry>();
const listeners = new Set<(list: OutboxEntry[]) => void>();
const inflight = new Set<string>();
let loaded: Promise<void> | null = null;
let movedListener: ((n: number) => void) | null = null;

function emit() {
  const list = [...entries.values()];
  for (const l of listeners) l(list);
}

function load(): Promise<void> {
  if (!loaded) {
    loaded = Promise.race([idbAll<OutboxEntry>('outbox'), delay(1500).then(() => [] as OutboxEntry[])])
      .then((list) => {
        for (const e of list) if (!entries.has(e.key)) entries.set(e.key, e);
        emit();
      })
      .catch(() => {
        /* IndexedDB unavailable: Firestore's own queue is all we have */
      });
  }
  return loaded;
}

async function store(e: OutboxEntry) {
  entries.set(e.key, e);
  emit();
  try {
    // Don't let a slow or stuck IndexedDB hold up saving.
    await Promise.race([idbPut('outbox', e.key, e), delay(1500)]);
  } catch {
    /* kept in memory for this session */
  }
}

async function remove(key: string, onlyIf?: number) {
  const e = entries.get(key);
  if (!e || (onlyIf !== undefined && e.queuedAt !== onlyIf)) return;
  entries.delete(key);
  emit();
  await idbDelete('outbox', key).catch(() => {});
}

function delay(ms: number) {
  return new Promise<'slow'>((r) => setTimeout(() => r('slow'), ms));
}

function expenseWrite(e: ExpenseEntry, first: boolean) {
  const batch = writeBatch(db);
  batch.set(expenseRef(e.pid, e.eid), {
    ...e.data,
    // The first save is stamped by the server; a replay keeps the time it was first saved.
    createdAt: first && !e.createdAtMs ? serverTimestamp() : Timestamp.fromMillis(e.createdAtMs || e.queuedAt),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

async function receiptWrite(e: ReceiptEntry) {
  const buf = new Uint8Array(await e.blob.arrayBuffer());
  const batch = writeBatch(db);
  batch.set(receiptRef(e.pid, e.eid), {
    data: Bytes.fromUint8Array(buf),
    type: 'image/jpeg',
    width: e.width,
    height: e.height,
    byUid: e.byUid,
    createdAt: serverTimestamp(),
  });
  return batch.commit();
}

/**
 * Sends a write and waits briefly for the server. Offline, or if the server is slow, it returns
 * straight away: the write is safe in the outbox and in Firestore's queue. If the server refuses
 * it within that time, the entry is dropped and the error thrown so the sheet can say so.
 */
async function send(e: OutboxEntry, write: Promise<void>, expense: boolean): Promise<void> {
  if (expense) trackExpenseWrite(write);
  inflight.add(e.key);
  const settled = write.then(
    () => remove(e.key, e.queuedAt),
    async (err: FirestoreError) => {
      const cur = entries.get(e.key);
      if (cur && cur.queuedAt === e.queuedAt) await store({ ...cur, attempts: cur.attempts + 1, error: err.code ?? String(err) });
      throw err;
    },
  );
  settled
    .catch((err: FirestoreError) => {
      // Refused after the sheet closed (say, removed from the Pocket while offline): deal with it now.
      if (err?.code === 'permission-denied') setTimeout(() => void replayOutbox(e.uid), 300);
    })
    .finally(() => inflight.delete(e.key));
  if (!navigator.onLine) return;
  const r = await Promise.race([settled.then(() => 'ok' as const, (err: unknown) => ({ err })), delay(2500)]);
  if (typeof r === 'object') {
    await remove(e.key, e.queuedAt);
    throw r.err;
  }
}

/** Saves an expense document (create or full overwrite). */
export async function saveExpenseDoc(uid: string, pid: string, eid: string, data: Record<string, unknown>, createdAt: Timestamp | null): Promise<void> {
  await load();
  const e: ExpenseEntry = {
    kind: 'expense',
    key: keyOf('expense', pid, eid),
    uid,
    pid,
    eid,
    data,
    createdAtMs: createdAt?.toMillis() ?? 0,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await store(e);
  await send(e, expenseWrite(e, true), true);
}

/** Saves a receipt photo for an expense. */
export async function saveReceiptDoc(uid: string, pid: string, eid: string, blob: Blob, width: number, height: number): Promise<void> {
  await load();
  const e: ReceiptEntry = {
    kind: 'receipt',
    key: keyOf('receipt', pid, eid),
    uid,
    pid,
    eid,
    blob,
    width,
    height,
    byUid: uid,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await store(e);
  await send(e, receiptWrite(e), false);
}

/** The expense was deleted or moved: stop trying to save it. */
export async function forgetExpense(pid: string, eid: string) {
  await load();
  await remove(keyOf('expense', pid, eid));
  await remove(keyOf('receipt', pid, eid));
}

let replaying = false;

/** Re-sends everything left in the outbox for this account. */
export async function replayOutbox(uid: string): Promise<void> {
  await load();
  if (replaying || !navigator.onLine) return;
  replaying = true;
  let moved = 0;
  try {
    // Expenses before their photos, so a moved expense takes its photo with it.
    const list = [...entries.values()].filter((e) => e.uid === uid && !inflight.has(e.key));
    list.sort((a, b) => (a.kind === b.kind ? a.queuedAt - b.queuedAt : a.kind === 'expense' ? -1 : 1));
    for (const e of list) {
      if (entries.get(e.key)?.queuedAt !== e.queuedAt) continue;
      inflight.add(e.key);
      try {
        const write = e.kind === 'expense' ? expenseWrite(e, false) : receiptWrite(e);
        const r = await Promise.race([write.then(() => 'ok' as const), delay(15000)]);
        if (r === 'ok') await remove(e.key, e.queuedAt);
      } catch (err) {
        const code = (err as FirestoreError).code;
        const personal = personalPocketId(uid);
        if (code === 'permission-denied' && e.pid !== personal) {
          // No longer in that Pocket: keep the expense in Personal rather than lose it.
          if (await moveToPersonal(e, personal)) moved += e.kind === 'expense' ? 1 : 0;
        } else {
          await store({ ...e, attempts: e.attempts + 1, error: code ?? String(err) });
        }
      } finally {
        inflight.delete(e.key);
      }
    }
  } finally {
    replaying = false;
  }
  if (moved) movedListener?.(moved);
}

const movedIds = new Map<string, string>();

async function moveToPersonal(e: OutboxEntry, personal: string): Promise<boolean> {
  const newId = movedIds.get(`${e.pid}/${e.eid}`) ?? doc(expensesCol(personal)).id;
  movedIds.set(`${e.pid}/${e.eid}`, newId);
  const next: OutboxEntry = { ...e, pid: personal, eid: newId, key: keyOf(e.kind, personal, newId), queuedAt: Date.now(), attempts: 0, error: undefined };
  await store(next);
  await remove(e.key, e.queuedAt);
  try {
    const write = next.kind === 'expense' ? expenseWrite(next, false) : receiptWrite(next);
    await Promise.race([write.then(() => remove(next.key, next.queuedAt)), delay(15000)]);
  } catch {
    /* stays in the outbox for the next replay */
  }
  return true;
}

/** Called with how many expenses were moved to Personal, to tell the user. */
export function onMovedToPersonal(fn: ((n: number) => void) | null) {
  movedListener = fn;
}

export function subscribeOutbox(fn: (list: OutboxEntry[]) => void): () => void {
  listeners.add(fn);
  void load().then(() => fn([...entries.values()]));
  fn([...entries.values()]);
  return () => listeners.delete(fn);
}

/** Live outbox contents. */
export function useOutbox(): OutboxEntry[] {
  const [list, setList] = useState<OutboxEntry[]>(() => [...entries.values()]);
  useEffect(() => subscribeOutbox(setList), []);
  return list;
}

/** Receipt photo waiting in the outbox, if any (so it shows before it has synced). */
export function outboxReceipt(pid: string, eid: string): ReceiptEntry | undefined {
  const e = entries.get(keyOf('receipt', pid, eid));
  return e?.kind === 'receipt' ? e : undefined;
}
