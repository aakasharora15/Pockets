/** When this phone last heard from the server (a listener result that didn't come from the cache). */
let lastServer = 0;

export function markServerSync() {
  lastServer = Date.now();
}

export function lastServerSync(): number {
  return lastServer;
}

/** The last listener failure worth showing when loading sticks (Firestore error code). */
let lastError = '';

export function markListenError(code: string) {
  lastError = code;
}

export function lastListenError(): string {
  return lastError;
}
