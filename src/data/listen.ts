/**
 * Subscribes and, if the listener fails, tries again a few times. Right after creating or joining a
 * Pocket the local cache knows about the membership before the server has committed it, so the first
 * read can be refused; Firestore listeners don't recover from that on their own. After giving up it
 * starts again when the phone comes back online or the app returns to the front, so a list never
 * stays stuck on an old copy.
 */
export function listen<T>(
  start: (next: (v: T) => void, fail: (e: Error) => void) => () => void,
  next: (v: T) => void,
  giveUp: () => void,
  attempt = 0,
): () => void {
  let stop = () => {};
  let timer: number | undefined;
  let stopped = false;
  stop = start(next, () => {
    if (stopped) return;
    if (attempt >= 4) {
      giveUp();
      const again = () => {
        if (document.visibilityState !== 'visible' || stopped) return;
        window.removeEventListener('online', again);
        document.removeEventListener('visibilitychange', again);
        stop = listen(start, next, giveUp);
      };
      window.addEventListener('online', again);
      document.addEventListener('visibilitychange', again);
      const prev = stop;
      stop = () => {
        window.removeEventListener('online', again);
        document.removeEventListener('visibilitychange', again);
        prev();
      };
      return;
    }
    timer = window.setTimeout(
      () => {
        if (!stopped) stop = listen(start, next, giveUp, attempt + 1);
      },
      500 * 2 ** attempt,
    );
  });
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stop();
  };
}
