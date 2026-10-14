import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Sends crashes and failed loads to the `errors` collection so problems on real phones can be seen
 * in the Firebase console without asking for screenshots. Only when signed in (the rules need it),
 * never in development, at most a handful per session and each message once.
 */
const LIMIT = 15;
let sent = 0;
const seen = new Set<string>();

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export function reportError(where: string, err: unknown) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') return;
  const uid = auth.currentUser?.uid;
  if (!uid || sent >= LIMIT) return;
  const e = err instanceof Error ? err : null;
  const message = clip(e ? `${e.name}: ${e.message}` : String(err ?? 'Unknown error'), 500);
  const key = `${where}|${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  addDoc(collection(db, 'errors'), {
    uid,
    where: clip(where, 60),
    message,
    stack: clip(e?.stack ?? '', 4000),
    build: clip(__APP_BUILD__, 20),
    version: clip(__APP_VERSION__, 20),
    ua: clip(navigator.userAgent, 300),
    path: clip(location.pathname, 200),
    at: serverTimestamp(),
  }).catch(() => {
    // Reporting must never cause trouble of its own.
  });
}

/** Catches anything that escapes: uncaught errors and rejected promises nobody handled. */
export function installErrorReporting() {
  window.addEventListener('error', (ev) => reportError('window', ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => reportError('promise', ev.reason));
}
