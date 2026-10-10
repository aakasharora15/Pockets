/**
 * App PIN, kept on this device only. Hashed with PBKDF2 (SHA-256, 210k iterations) and stored in
 * IndexedDB, keyed by user id. Never sent to Firestore.
 */
const DB = 'pockets-device';
const STORE = 'pin';
const ITERATIONS = 210_000;

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return b64(bits);
}

export async function hasPin(uid: string): Promise<boolean> {
  try {
    return !!(await tx<PinRecord | undefined>('readonly', (s) => s.get(uid)));
  } catch {
    return false;
  }
}

export async function setPin(uid: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rec: PinRecord = { salt: b64(salt), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS };
  await tx('readwrite', (s) => s.put(rec, uid));
}

export async function checkPin(uid: string, pin: string): Promise<boolean> {
  const rec = await tx<PinRecord | undefined>('readonly', (s) => s.get(uid));
  if (!rec) return false;
  const hash = await derive(pin, unb64(rec.salt), rec.iterations);
  // Constant-time-ish compare; both strings are the same length.
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ rec.hash.charCodeAt(i);
  return diff === 0 && hash.length === rec.hash.length;
}

export async function clearPin(uid: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(uid));
}

/** Lock again after this long in the background. */
export const LOCK_AFTER_MS = 5 * 60 * 1000;
