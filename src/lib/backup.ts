import { isCurrencyCode } from './currencies';

/**
 * Backup file format. A backup is a JSON file with every Pocket you're in: its settings, people,
 * categories, expenses, repeats and, if you choose, receipt photos. Restoring adds back anything
 * that's missing and never changes or deletes what's already there.
 */

export const BACKUP_VERSION = 1;

export interface BackupCategory {
  id: string;
  name: string;
  icon: string;
  colour: string;
  order: number;
}

export interface BackupExpense {
  id: string;
  currency: string;
  amountMinor: number;
  name: string;
  categoryId: string;
  byUid: string;
  byInitials: string;
  editedByUid?: string;
  date: string;
  note?: string;
  tag?: string;
  recurringId?: string;
  receipt?: boolean;
  /** Milliseconds since 1970, or null. */
  createdAt: number | null;
}

export interface BackupRecurring {
  id: string;
  currency: string;
  amountMinor: number;
  name: string;
  categoryId: string;
  byUid: string;
  byInitials: string;
  note?: string;
  tag?: string;
  day: number;
  nextDate: string;
}

export interface BackupReceipt {
  id: string;
  width: number;
  height: number;
  /** JPEG, base64. */
  data: string;
}

export interface BackupPocket {
  id: string;
  name: string;
  type: 'personal' | 'shared';
  currencies: string[];
  budgets: Record<string, number>;
  tags: string[];
  members: { uid: string; name: string; initials: string; role: string }[];
  categories: BackupCategory[];
  expenses: BackupExpense[];
  recurring: BackupRecurring[];
  receipts?: BackupReceipt[];
}

export interface Backup {
  app: 'Spendr';
  kind: 'backup';
  version: number;
  createdAt: string;
  account: { uid: string; name: string; email: string };
  pockets: BackupPocket[];
}

const ID = /^[A-Za-z0-9_-]{1,100}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number, min = 0): v is string => typeof v === 'string' && v.length >= min && v.length <= max;
const amount = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) < 1_000_000_000;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** An expense from a backup, checked the same way the security rules check one. Null if invalid. */
export function cleanBackupExpense(v: unknown): BackupExpense | null {
  if (!obj(v)) return null;
  const { id, currency, amountMinor, name, categoryId, byUid, byInitials, editedByUid, date, note, tag, recurringId, receipt, createdAt } = v;
  if (!str(id, 100, 1) || !ID.test(id)) return null;
  if (!str(currency, 3, 3) || !isCurrencyCode(currency) || !amount(amountMinor)) return null;
  if (!str(name, 100) || !str(categoryId, 40, 1) || !str(byUid, 128) || !str(byInitials, 4, 1)) return null;
  if (!str(date, 10, 10) || !DAY.test(date)) return null;
  const e: BackupExpense = { id, currency, amountMinor, name, categoryId, byUid, byInitials, date, createdAt: typeof createdAt === 'number' ? createdAt : null };
  if (str(editedByUid, 128, 1)) e.editedByUid = editedByUid;
  if (str(note, 500, 1)) e.note = note;
  if (str(tag, 40, 1)) e.tag = tag;
  if (str(recurringId, 40, 1)) e.recurringId = recurringId;
  if (receipt === true) e.receipt = true;
  return e;
}

export function cleanBackupRecurring(v: unknown): BackupRecurring | null {
  if (!obj(v)) return null;
  const { id, currency, amountMinor, name, categoryId, byUid, byInitials, note, tag, day, nextDate } = v;
  if (!str(id, 100, 1) || !ID.test(id)) return null;
  if (!str(currency, 3, 3) || !isCurrencyCode(currency) || !amount(amountMinor)) return null;
  if (!str(name, 100) || !str(categoryId, 40, 1) || !str(byUid, 128) || !str(byInitials, 4, 1)) return null;
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31 || !str(nextDate, 10, 10) || !DAY.test(nextDate)) return null;
  const r: BackupRecurring = { id, currency, amountMinor, name, categoryId, byUid, byInitials, day: day as number, nextDate };
  if (str(note, 500, 1)) r.note = note;
  if (str(tag, 40, 1)) r.tag = tag;
  return r;
}

function cleanCategory(v: unknown): BackupCategory | null {
  if (!obj(v)) return null;
  const { id, name, icon, colour, order } = v;
  if (!str(id, 40, 1) || !ID.test(id) || !str(name, 60, 1) || !str(icon, 40, 1) || !str(colour, 9, 1) || typeof order !== 'number') return null;
  return { id, name, icon, colour, order };
}

function cleanReceipt(v: unknown): BackupReceipt | null {
  if (!obj(v)) return null;
  const { id, width, height, data } = v;
  if (!str(id, 100, 1) || !ID.test(id) || !Number.isInteger(width) || !Number.isInteger(height) || !str(data, 1_200_000, 1)) return null;
  return { id, width: width as number, height: height as number, data };
}

export class BackupError extends Error {}

/** Reads a backup file. Throws BackupError if it isn't one; drops any entries that don't check out. */
export function parseBackup(text: string): { backup: Backup; skipped: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError("This file isn't a Spendr backup.");
  }
  if (!obj(raw) || raw.app !== 'Spendr' || raw.kind !== 'backup' || !Array.isArray(raw.pockets)) {
    throw new BackupError("This file isn't a Spendr backup.");
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupError('This backup is from a newer version of Spendr. Update the app and try again.');
  }
  let skipped = 0;
  const keep = <T>(list: unknown[], clean: (v: unknown) => T | null): T[] => {
    const out: T[] = [];
    for (const v of list) {
      const c = clean(v);
      if (c) out.push(c);
      else skipped++;
    }
    return out;
  };
  const pockets: BackupPocket[] = [];
  for (const p of raw.pockets) {
    if (!obj(p) || !str(p.id, 128, 1) || !str(p.name, 60, 1) || (p.type !== 'personal' && p.type !== 'shared')) {
      skipped++;
      continue;
    }
    const currencies = arr(p.currencies).filter((c): c is string => typeof c === 'string' && isCurrencyCode(c));
    const budgets: Record<string, number> = {};
    if (obj(p.budgets)) for (const [k, v] of Object.entries(p.budgets)) if (isCurrencyCode(k) && amount(v)) budgets[k] = v;
    pockets.push({
      id: p.id,
      name: p.name,
      type: p.type,
      currencies: currencies.length ? currencies : ['GBP'],
      budgets,
      tags: arr(p.tags).filter((t): t is string => str(t, 40, 1)).slice(0, 200),
      members: arr(p.members)
        .filter(obj)
        .map((m) => ({ uid: String(m.uid ?? ''), name: String(m.name ?? ''), initials: String(m.initials ?? ''), role: String(m.role ?? '') })),
      categories: keep(arr(p.categories), cleanCategory),
      expenses: keep(arr(p.expenses), cleanBackupExpense),
      recurring: keep(arr(p.recurring), cleanBackupRecurring),
      receipts: keep(arr(p.receipts), cleanReceipt),
    });
  }
  const account = obj(raw.account) ? raw.account : {};
  return {
    backup: {
      app: 'Spendr',
      kind: 'backup',
      version: raw.version,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
      account: { uid: String(account.uid ?? ''), name: String(account.name ?? ''), email: String(account.email ?? '') },
      pockets,
    },
    skipped,
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
