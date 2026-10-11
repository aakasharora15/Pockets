/**
 * Subscribes and, if the listener fails, tries again a few times. Right after creating or joining a
 * Pocket the local cache knows about the membership before the server has committed it, so the first
 * read can be refused; Firestore listeners don't recover from that on their own.
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
    if (attempt >= 4) return giveUp();
    timer = window.setTimeout(() => {
      if (!stopped) stop = listen(start, next, giveUp, attempt + 1);
    }, 500 * 2 ** attempt);
  });
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stop();
  };
}
