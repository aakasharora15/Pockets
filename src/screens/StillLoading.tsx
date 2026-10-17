import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { HomeSkeleton } from '../components/Skeletons';
import { lastListenError, lastServerSync } from '../data/syncStatus';
import { auth, db } from '../firebase';
import { reportError } from '../lib/report';
import { Logo } from './auth/Logo';

const SLOW_MS = 10_000;

/**
 * The loading placeholders, until loading takes too long. Then it says what it's waiting for and
 * offers a reload, or a repair that throws away this phone's copy of the data and fetches it again.
 * Kept in place across the startup steps, so the time counts from the first placeholder.
 */
export function Loading({ waitingFor, quiet }: { waitingFor: string; quiet?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, []);
  // Quiet: the steps before anything is known about the account show a plain screen, not placeholders.
  return slow ? <StillLoading waitingFor={waitingFor} /> : quiet ? <div className="screen" /> : <HomeSkeleton />;
}

/** Resolves with the promise, or with undefined after `ms`: storage that's stuck must not stop a repair. */
function within<T>(ms: number, p: Promise<T>): Promise<T | undefined> {
  return Promise.race([p.catch(() => undefined), new Promise<undefined>((r) => window.setTimeout(r, ms))]);
}

/**
 * Removes Firestore's local copy and the app's cached files, then reloads. The PIN and the outbox live
 * elsewhere. Every step has a time limit, since storage that's stuck is often why we're here. The copy
 * is also marked for deletion at the next start (index.html), before Firestore opens it, which works
 * even when it can't be deleted now.
 */
async function repair() {
  const names = [`firestore/[DEFAULT]/${db.app.options.projectId}/main`];
  const listed = await within(2000, indexedDB.databases?.() ?? Promise.resolve([]));
  for (const d of listed ?? []) if (d.name?.startsWith('firestore/') && !names.includes(d.name)) names.push(d.name);
  try {
    localStorage.setItem('spendr.repair', JSON.stringify(names));
  } catch {
    /* storage unavailable: the steps below still run */
  }
  if (
    await within(
      3000,
      terminate(db).then(() => true),
    )
  )
    await within(3000, clearIndexedDbPersistence(db));
  const regs = (await within(2000, navigator.serviceWorker?.getRegistrations() ?? Promise.resolve([]))) ?? [];
  await within(2000, Promise.all(regs.map((r) => r.unregister())));
  if ('caches' in window) {
    const keys = (await within(2000, caches.keys())) ?? [];
    await within(2000, Promise.all(keys.filter((n) => n !== 'spendr-ocr').map((n) => caches.delete(n))));
  }
  window.location.reload();
}

function StillLoading({ waitingFor }: { waitingFor: string }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    reportError(
      'still-loading',
      `Waiting for ${waitingFor}; ${navigator.onLine ? 'online' : 'offline'}; ${lastServerSync() ? 'server reached' : 'server not reached'}; ${lastListenError() || 'no listener error'}`,
    );
  }, [waitingFor]);
  const online = navigator.onLine;
  const last = lastServerSync();
  const details = [
    `Waiting for ${waitingFor}`,
    online ? 'online' : 'offline',
    last ? `server reached ${Math.round((Date.now() - last) / 1000)} s ago` : 'server not reached yet',
    lastListenError(),
    auth.currentUser?.email,
    `build ${__APP_BUILD__}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="screen flow">
      <div className="flow-body">
        <div className="unlock-logo">
          <Logo />
        </div>
        <div className="flow-head" style={{ position: 'static' }}>
          <span className="flow-title">Still loading</span>
          <span className="flow-sub">
            {online
              ? `Spendr hasn't been able to load ${waitingFor}. Try again, and if it still sticks, repair this phone's copy. Your expenses are safe in your account, and anything waiting to upload is kept.`
              : "This phone is offline and hasn't saved a copy of your data yet. Connect to the internet and try again."}
          </span>
          <span className="flow-sub still-details">{details}</span>
        </div>
      </div>
      <div className="flow-foot">
        <button className="primary-btn bottom-primary press" onClick={() => window.location.reload()}>
          Try again
        </button>
        <button
          className="bottom-link press"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void repair();
          }}
        >
          {busy ? 'Repairing…' : <b>Repair this phone's copy</b>}
        </button>
      </div>
    </div>
  );
}
