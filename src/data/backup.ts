import { arrayUnion, Bytes, getDocs, serverTimestamp, Timestamp, writeBatch, type Timestamp as TS, type WriteBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { BACKUP_VERSION, base64ToBytes, bytesToBase64, type Backup, type BackupPocket } from '../lib/backup';
import { fromDayKey, toDayKey, todayKey } from '../lib/dates';
import { firstDue } from '../lib/recurring';
import { commit, createSharedPocket } from './pockets';
import {
  BATCH_LIMIT,
  categoriesCol,
  categoryRef,
  expenseRef,
  expensesCol,
  personalPocketId,
  pocketRef,
  receiptRef,
  receiptsCol,
  recurringCol,
  recurringRef,
} from './refs';
import type { PocketWithMembers } from './types';
import type { CurrencyCode } from '../lib/currencies';

const ms = (t: unknown) => (t && typeof (t as TS).toMillis === 'function' ? (t as TS).toMillis() : null);

/** Everything in every Pocket you're in, as a backup file's contents. Needs a connection. */
export async function createBackup(
  pockets: PocketWithMembers[],
  account: { uid: string; name: string; email: string },
  withPhotos: boolean,
): Promise<Backup> {
  const out: BackupPocket[] = [];
  for (const p of pockets) {
    const [cats, exps, recs, recs2] = await Promise.all([
      getDocs(categoriesCol(p.id)),
      getDocs(expensesCol(p.id)),
      getDocs(recurringCol(p.id)),
      withPhotos ? getDocs(receiptsCol(p.id)) : Promise.resolve(null),
    ]);
    out.push({
      id: p.id,
      name: p.name,
      type: p.type,
      currencies: p.currencies,
      budgets: p.budgets as Record<string, number>,
      tags: p.tags ?? [],
      members: p.members.map((m) => ({ uid: m.uid, name: m.name, initials: m.initials, role: m.role })),
      categories: cats.docs.map((d) => {
        const c = d.data();
        return { id: d.id, name: c.name, icon: c.icon, colour: c.colour, order: c.order };
      }),
      expenses: exps.docs.map((d) => {
        const { createdAt, updatedAt: _u, ...rest } = d.data();
        return { id: d.id, ...(rest as Omit<Backup['pockets'][number]['expenses'][number], 'id' | 'createdAt'>), createdAt: ms(createdAt) };
      }),
      recurring: recs.docs.map((d) => {
        const { createdAt: _c, updatedAt: _u, createdByUid: _b, ...rest } = d.data();
        return { id: d.id, ...(rest as Omit<Backup['pockets'][number]['recurring'][number], 'id'>) };
      }),
      receipts: recs2?.docs.map((d) => {
        const r = d.data() as { data: Bytes; width: number; height: number };
        return { id: d.id, width: r.width, height: r.height, data: bytesToBase64(r.data.toUint8Array()) };
      }),
    });
  }
  return {
    app: 'Spendr',
    kind: 'backup',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    account,
    pockets: out,
  };
}

export interface RestoreSummary {
  expenses: number;
  newPockets: number;
  photos: number;
}

/** Writes in batches: up to 400 writes, and few enough photos to stay under Firestore's 10 MB per request. */
class Writer {
  private batch: WriteBatch = writeBatch(db);
  private n = 0;
  private bytes = 0;
  async add(fn: (b: WriteBatch) => void, size = 1000) {
    if (this.n >= BATCH_LIMIT || this.bytes + size > 8_000_000) await this.flush();
    fn(this.batch);
    this.n++;
    this.bytes += size;
  }
  async flush() {
    if (!this.n) return;
    await commit(this.batch);
    this.batch = writeBatch(db);
    this.n = 0;
    this.bytes = 0;
  }
}

function yesterday(): string {
  const d = fromDayKey(todayKey());
  d.setDate(d.getDate() - 1);
  return toDayKey(d);
}

/**
 * Adds back anything in the backup that's missing. Nothing already in Spendr is changed or deleted.
 * Pockets you're still in get their missing expenses back; your Personal Pocket gets the backup's
 * Personal expenses (from any account); shared Pockets you're no longer in come back as new shared
 * Pockets owned by you.
 */
export async function restoreBackup(
  backup: Backup,
  me: { uid: string; name: string; initials: string },
  mine: PocketWithMembers[],
  onProgress?: (done: number, total: number) => void,
): Promise<RestoreSummary> {
  const summary: RestoreSummary = { expenses: 0, newPockets: 0, photos: 0 };
  const today = todayKey();
  const total = backup.pockets.length;
  let done = 0;
  for (const bp of backup.pockets) {
    let pid: string;
    let created = false;
    const fromElsewhere = bp.type === 'personal' && bp.id !== personalPocketId(me.uid);
    if (mine.some((p) => p.id === bp.id)) pid = bp.id;
    else if (bp.type === 'personal') pid = personalPocketId(me.uid);
    else {
      pid = await createSharedPocket(bp.name, bp.currencies as CurrencyCode[], me);
      created = true;
      summary.newPockets++;
    }

    const [cats, exps, recs, rcpts] = await Promise.all([
      getDocs(categoriesCol(pid)),
      getDocs(expensesCol(pid)),
      getDocs(recurringCol(pid)),
      bp.receipts?.length ? getDocs(receiptsCol(pid)) : Promise.resolve(null),
    ]);
    const has = {
      cats: new Set(cats.docs.map((d) => d.id)),
      exps: new Set(exps.docs.map((d) => d.id)),
      recs: new Set(recs.docs.map((d) => d.id)),
      rcpts: new Set(rcpts?.docs.map((d) => d.id) ?? []),
    };
    const w = new Writer();
    const photoIds = new Set((bp.receipts ?? []).map((r) => r.id));
    if (created && Object.keys(bp.budgets).length) await w.add((b) => b.update(pocketRef(pid), { budgets: bp.budgets }));

    for (const c of bp.categories) {
      if (has.cats.has(c.id)) continue;
      await w.add((b) => b.set(categoryRef(pid, c.id), { name: c.name, icon: c.icon, colour: c.colour, order: c.order, system: c.id === 'other' }));
    }
    for (const e of bp.expenses) {
      if (has.exps.has(e.id)) continue;
      const { id, createdAt, ...fields } = e;
      const data: Record<string, unknown> = { ...fields };
      // Personal expenses from another account become yours.
      if (fromElsewhere) {
        data.byUid = me.uid;
        data.byInitials = me.initials;
        delete data.editedByUid;
      }
      // A backup without photos: don't point at a photo that isn't there.
      if (data.receipt && !photoIds.has(id)) delete data.receipt;
      await w.add((b) =>
        b.set(expenseRef(pid, id), {
          ...data,
          createdAt: createdAt ? Timestamp.fromMillis(createdAt) : serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      summary.expenses++;
    }
    for (const r of bp.recurring) {
      if (has.recs.has(r.id)) continue;
      const { id, ...fields } = r;
      // Don't log months that passed while this repeat wasn't in Spendr.
      const nextDate = r.nextDate < today ? firstDue(yesterday(), r.day, today) : r.nextDate;
      await w.add((b) =>
        b.set(recurringRef(pid, id), {
          ...fields,
          ...(fromElsewhere ? { byUid: me.uid, byInitials: me.initials } : {}),
          nextDate,
          createdByUid: me.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    }
    for (const r of bp.receipts ?? []) {
      if (has.rcpts.has(r.id)) continue;
      const bytes = base64ToBytes(r.data);
      if (bytes.length > 900_000) continue;
      await w.add(
        (b) =>
          b.set(receiptRef(pid, r.id), {
            data: Bytes.fromUint8Array(bytes),
            type: 'image/jpeg',
            width: r.width,
            height: r.height,
            byUid: me.uid,
            createdAt: serverTimestamp(),
          }),
        bytes.length + 1000,
      );
      summary.photos++;
    }
    if (bp.tags.length) await w.add((b) => b.update(pocketRef(pid), { tags: arrayUnion(...bp.tags) }));
    await w.flush();
    onProgress?.(++done, total);
  }
  return summary;
}
