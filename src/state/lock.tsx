import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { checkPin, clearPin, hasPin, LOCK_AFTER_MS, setPin } from '../lib/pin';
import { useSession } from './session';

type PinState = 'checking' | 'none' | 'locked' | 'unlocked';

interface Lock {
  state: PinState;
  unlock: (pin: string) => Promise<boolean>;
  createPin: (pin: string) => Promise<void>;
  lockNow: () => void;
  /** "Forgot PIN? Log in again": clears this device's PIN and signs out. */
  forgot: () => Promise<void>;
}

const Ctx = createContext<Lock | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const { user, logOut } = useSession();
  const uid = user?.uid;
  const [state, setState] = useState<PinState>('checking');
  const hiddenAt = useRef<number | null>(null);

  // Cold start: locked if this device has a PIN for this account.
  useEffect(() => {
    if (!uid) {
      setState('checking');
      return;
    }
    let live = true;
    hasPin(uid).then((has) => live && setState(has ? 'locked' : 'none'));
    return () => {
      live = false;
    };
  }, [uid]);

  // Lock again after 5 minutes in the background.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current >= LOCK_AFTER_MS) {
        setState((s) => (s === 'unlocked' ? 'locked' : s));
        hiddenAt.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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
    lockNow: () => setState((s) => (s === 'unlocked' ? 'locked' : s)),
    forgot: async () => {
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
