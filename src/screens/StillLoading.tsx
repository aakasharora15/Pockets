import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { HomeSkeleton } from '../components/Skeletons';
import { lastListenError, lastServerSync } from '../data/syncStatus';
import { auth, db } from '../firebase';
import { Logo } from './auth/Logo';

const SLOW_MS = 10_000;

/**
 * The loading placeholders, until loading takes too long. Then it says what it's waiting for and
 * offers a reload, or a repair that throws away this phone's copy of the data and fetches it again.
 * Kept in place across the startup steps, so the time counts from the first placeholder.
 */
export function Loading({ waitingFor }: { waitingFor: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, []);
  return slow ? <StillLoading waitingFor={waitingFor} /> : <HomeSkeleton />;
}

/** Removes Firestore's local copy and the app's cached files, then reloads. The PIN and the outbox live elsewhere. */
async function repair() {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    // Another window still has it open: delete the databases directly.
    const dbs = (await indexedDB.databases?.().catch(() => [])) ?? [];
    for (const d of dbs) if (d.name?.startsWith('firestore/')) indexedDB.deleteDatabase(d.name);
  }
  const regs = (await navigator.serviceWorker?.getRegistrations().catch(() => [])) ?? [];
  await Promise.all(regs.map((r) => r.unregister()));
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== 'spendr-ocr').map((n) => caches.delete(n)));
  }
  window.location.reload();
}

function StillLoading({ waitingFor }: { waitingFor: string }) {
  const [busy, setBusy] = useState(false);
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
