import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { userRef } from '../data/refs';
import type { UserProfile } from '../data/types';
import { auth } from '../firebase';
import { reportError } from '../lib/report';

interface Session {
  /** undefined while Firebase restores the session. */
  user: User | null | undefined;
  /** undefined while loading; null when the account hasn't finished setup. */
  profile: UserProfile | null | undefined;
  profileError: boolean;
  logOut: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) {
      setProfile(user === null ? null : undefined);
      return;
    }
    setProfile(undefined);
    setProfileError(false);
    return onSnapshot(
      userRef(user.uid),
      (snap) => {
        // A cache miss while offline looks like "doesn't exist"; wait for the server before deciding.
        if (!snap.exists() && snap.metadata.fromCache) return;
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      },
      (err) => {
        reportError('profile', err.code);
        setProfileError(true);
      },
    );
  }, [user]);

  const logOut = async () => {
    await signOut(auth);
  };

  return <Ctx.Provider value={{ user, profile, profileError, logOut }}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

/** For screens that only render once signed in with a profile. */
export function useMe(): { user: User; profile: UserProfile } {
  const { user, profile } = useSession();
  if (!user || !profile) throw new Error('useMe used before sign-in');
  return { user, profile };
}
