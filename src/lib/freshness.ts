/**
 * Makes sure an installed copy never stays on an old version. The live build is published in
 * /version.json (not cached by the service worker). If this copy is older, ask the service worker
 * to update; the new version then waits and takes over the next time the app is in the background.
 * If nothing has downloaded within a few seconds, the service worker is stuck: next time the app is
 * in the background, remove it and the app's cached files and reload from the network. Saved data
 * (expenses, the offline queue, settings) lives elsewhere and isn't touched.
 */

const BUILD = __APP_BUILD__;

/**
 * Runs `apply` (which reloads the app) the next time Spendr goes to the background, so an update
 * never reloads the screen while you're using it. Not while a sheet is open, since a reload would lose
 * what's being typed there; then it waits for the next time.
 */
export function whenAway(apply: () => void) {
  const busy = () => !!document.querySelector('.sheet');
  if (document.visibilityState === 'hidden' && !busy()) return apply();
  const onVis = () => {
    if (document.visibilityState !== 'hidden' || busy()) return;
    document.removeEventListener('visibilitychange', onVis);
    apply();
  };
  document.addEventListener('visibilitychange', onVis);
}

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
    window.setTimeout(async () => {
      // Downloaded and waiting is the normal case: it takes over next time the app is in the background.
      const r = await navigator.serviceWorker?.getRegistration();
      if (r?.waiting || r?.installing) return;
      whenAway(() => void startClean(live));
    }, 8000);
  } catch {
    // Offline or the file isn't there: nothing to compare with.
  } finally {
    checking = false;
  }
}
