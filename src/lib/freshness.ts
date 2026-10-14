/**
 * Makes sure an installed copy never stays on an old version. The live build is published in
 * /version.json (not cached by the service worker). If this copy is older, ask the service worker
 * to update, which normally reloads into the new version. If that hasn't happened within a few
 * seconds, the service worker is stuck: remove it and the app's cached files and reload from the
 * network. Saved data (expenses, the offline queue, settings) lives elsewhere and isn't touched.
 */

const BUILD = __APP_BUILD__;

async function liveBuild(): Promise<string | null> {
  const res = await fetch('/version.json', { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { build?: string };
  return data.build ?? null;
}

async function startClean(live: string) {
  // Once per new build per session, so a failure can't turn into a reload loop.
  const key = `spendr.reset.${live}`;
  if (sessionStorage.getItem(key)) return;
  // Don't pull the page away from someone typing an expense; try again next time.
  if (document.querySelector('.expense-sheet')) return;
  sessionStorage.setItem(key, '1');
  const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
  await Promise.all(regs.map((r) => r.unregister()));
  if ('caches' in window) {
    const names = await caches.keys();
    // The receipt reader's files are large and don't change with app versions: keep them.
    await Promise.all(names.filter((n) => n !== 'spendr-ocr').map((n) => caches.delete(n)));
  }
  window.location.reload();
}

let checking = false;

export async function checkFreshness() {
  if (import.meta.env.DEV || BUILD === 'local' || checking || !navigator.onLine) return;
  checking = true;
  try {
    const live = await liveBuild();
    if (!live || live === BUILD) return;
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update().catch(() => {});
    window.setTimeout(() => void startClean(live), 8000);
  } catch {
    // Offline or the file isn't there: nothing to compare with.
  } finally {
    checking = false;
  }
}
