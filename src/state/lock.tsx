import { getRedirectResult } from 'firebase/auth';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { auth } from '../firebase';
import { checkPin, clearPin, hasPin, LOCK_AFTER_MS, setPin } from '../lib/pin';

/** Set while a Google re-check goes through a full-page redirect, so the reset finishes on return. */
export const PIN_RESET_KEY = 'spendr.pinReset';
/**
 * When this phone last left Spendr unlocked ({uid, at}). iOS often closes a home-screen app in the
 * background, so a fresh start within the 5 minutes counts as coming back, not as a cold start.
 */
const SEEN_KEY = 'spendr.lastSeen';

function seenRecently(uid: string): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null') as { uid: string; at: number } | null;
    return !!seen && seen.uid === uid && Date.now() - seen.at < LOCK_AFTER_MS && Date.now() >= seen.at;
  } catch {
    return false;
  }
}

function markSeen(uid: string | null) {
  try {
    if (uid) localStorage.setItem(SEEN_KEY, JSON.stringify({ uid, at: Date.now() }));
    else localStorage.removeItem(SEEN_KEY);
  } catch {
    /* storage unavailable: the app just locks on every start */
  }
}
import { useSession } from './session';

type PinState = 'checking' | 'none' | 'locked' | 'unlocked';

interface Lock {
  state: PinState;
  unlock: (pin: string) => Promise<boolean>;
  createPin: (pin: string) => Promise<void>;
  lockNow: () => void;
  /** After you've confirmed it's you (Google or password): clears the PIN so a new one can be set. */
  resetPin: () => Promise<void>;
  /** Gives up on the PIN: clears it and signs out. */
  forgot: () => Promise<void>;
}

const Ctx = createContext<Lock | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const { user, logOut } = useSession();
  const uid = user?.uid;
  const [state, setState] = useState<PinState>('checking');
  const hiddenAt = useRef<number | null>(null);
  const now = useRef({ state, uid });
  now.current = { state, uid };

  // Cold start: locked if this device has a PIN for this account.
  useEffect(() => {
    if (!uid) {
      setState('checking');
      return;
    }
    let live = true;
    (async () => {
      // Back from a Google redirect started on the reset screen: finish the reset.
      let reset = false;
      try {
        reset = sessionStorage.getItem(PIN_RESET_KEY) === uid;
        sessionStorage.removeItem(PIN_RESET_KEY);
      } catch {
        /* storage unavailable */
      }
      if (reset && (await getRedirectResult(auth).catch(() => null))) {
        await clearPin(uid);
        if (live) setState('none');
        return;
      }
      const has = await hasPin(uid);
      if (live) setState(!has ? 'none' : seenRecently(uid) ? 'unlocked' : 'locked');
    })();
    return () => {
      live = false;
    };
  }, [uid]);

  // Lock again after 5 minutes in the background, whether the app stayed open or iOS closed it.
  useEffect(() => {
    const leaving = () => {
      hiddenAt.current = Date.now();
      const { state: s, uid: u } = now.current;
      if (s === 'unlocked' && u) markSeen(u);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        leaving();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current >= LOCK_AFTER_MS) {
        setState((s) => (s === 'unlocked' ? 'locked' : s));
        markSeen(null);
        hiddenAt.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', leaving);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', leaving);
    };
  }, []);

  const value: Lock = {
    state,
    unlock: async (pin) => {
      if (!uid) return false;
      const ok = await checkPin(uid, pin);
      if (ok) setState('unlocked');
      return ok;
    },
    createPin: async (pin) => {
      if (!uid) return;
      await setPin(uid, pin);
      setState('unlocked');
    },
    lockNow: () => {
      markSeen(null);
      setState((s) => (s === 'unlocked' ? 'locked' : s));
    },
    resetPin: async () => {
      if (!uid) return;
      await clearPin(uid);
      setState('none');
    },
    forgot: async () => {
      markSeen(null);
      if (uid) await clearPin(uid);
      await logOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock(): Lock {
  const s = useContext(Ctx);
  if (!s) throw new Error('useLock outside LockProvider');
  return s;
}
