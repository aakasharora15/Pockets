/**
 * Counts expense writes the server hasn't acknowledged yet. Firestore resolves a write's promise
 * only when the server confirms it, so while offline these stay pending and drive the offline toast.
 */
let pending = 0;
const listeners = new Set<(n: number) => void>();

export function trackExpenseWrite(p: Promise<unknown>): void {
  pending++;
  emit();
  p.catch(() => {
    /* reported by whoever made the write */
  }).finally(() => {
    pending = Math.max(0, pending - 1);
    emit();
  });
}

function emit() {
  for (const l of listeners) l(pending);
}

export function subscribePending(fn: (n: number) => void): () => void {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
}
