import { collectionGroup, onSnapshot, orderBy, query, updateDoc, where, type DocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { categoriesCol, membersCol, personalPocketId, pocketRef, userRef } from '../data/refs';
import type { Category, Member, Pocket, PocketWithMembers } from '../data/types';
import { db } from '../firebase';
import { listen } from '../data/listen';
import { markListenError, markServerSync } from '../data/syncStatus';
import { useSession } from './session';

interface PocketsState {
  /** Pockets to show: Personal first (unless hidden), then shared by creation. */
  pockets: PocketWithMembers[];
  /** Every Pocket the user belongs to, the hidden Personal one included (backups, background work). */
  allPockets: PocketWithMembers[];
  /** Personal is hidden: the account asked for it and is in at least one shared Pocket. */
  personalHidden: boolean;
  setHidePersonal: (hide: boolean) => void;
  loading: boolean;
  current: PocketWithMembers | null;
  setCurrent: (id: string) => void;
  /** Categories of the current Pocket, in order. */
  categories: Category[];
  categoriesLoading: boolean;
  categoriesFor: (pid: string) => Category[];
}

const Ctx = createContext<PocketsState | null>(null);

const currentKey = (uid: string) => `spendr.current.${uid}`;

function readCurrent(uid: string): string | null {
  try {
    return localStorage.getItem(currentKey(uid));
  } catch {
    return null;
  }
}

export function PocketsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useSession();
  const uid = user?.uid;
  const [ids, setIds] = useState<string[] | null>(null);
  const [docs, setDocs] = useState<Record<string, Pocket | null>>({});
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [cats, setCats] = useState<Record<string, Category[]>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);

  const pocketIdsRef = useRef<string[]>([]);
  pocketIdsRef.current = profile?.pocketIds ?? [];

  // Which Pockets am I in? One query across every Pocket's members.
  useEffect(() => {
    setIds(null);
    setDocs({});
    setMembers({});
    setCats({});
    if (!uid || !profile) return;
    // The account's last Pocket (from whichever phone used it last), else this phone's.
    setCurrentId(profile.lastPocketId ?? readCurrent(uid));
    return onSnapshot(
      query(collectionGroup(db, 'members'), where('uid', '==', uid)),
      (snap) => {
        if (!snap.metadata.fromCache) markServerSync();
        setIds(snap.docs.map((d) => d.ref.parent.parent!.id));
      },
      (err) => {
        // The query across Pockets failed: fall back to the list kept on the account. A Pocket
        // I've since left just fails its own listener and drops out.
        markListenError(`Pockets list: ${err.code}`);
        const fallback = [...new Set([personalPocketId(uid), ...pocketIdsRef.current])];
        setIds((cur) => (cur && cur.length ? [...new Set([...cur, ...fallback])] : fallback));
      },
    );
  }, [uid, !!profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to each Pocket, its members and its categories.
  const idsKey = (ids ?? []).join(',');
  useEffect(() => {
    if (!ids) return;
    const unsubs: (() => void)[] = [];
    for (const pid of ids) {
      unsubs.push(
        listen<DocumentSnapshot>(
          (next, fail) => onSnapshot(pocketRef(pid), next, fail),
          (s) => setDocs((d) => ({ ...d, [pid]: s.exists() ? { id: pid, ...(s.data() as Omit<Pocket, 'id'>) } : null })),
          // Removed from the Pocket, or it was deleted.
          () => setDocs((d) => ({ ...d, [pid]: null })),
        ),
        listen<QuerySnapshot>(
          (next, fail) => onSnapshot(membersCol(pid), next, fail),
          (s) => setMembers((m) => ({ ...m, [pid]: s.docs.map((x) => ({ ...(x.data() as Member), uid: x.id })) })),
          () => {},
        ),
        listen<QuerySnapshot>(
          (next, fail) => onSnapshot(query(categoriesCol(pid), orderBy('order')), next, fail),
          (s) => setCats((c) => ({ ...c, [pid]: s.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Category, 'id'>) })) })),
          () => {},
        ),
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allPockets = useMemo<PocketWithMembers[]>(() => {
    if (!ids) return [];
    const list = ids
      .map((id) => docs[id])
      .filter((p): p is Pocket => !!p)
      .map((p) => ({ ...p, members: sortMembers(members[p.id] ?? [], uid) }));
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'personal' ? -1 : 1;
      return (a.createdAt?.toMillis() ?? Infinity) - (b.createdAt?.toMillis() ?? Infinity);
    });
  }, [ids, docs, members, uid]);

  // Only the first load shows skeletons; a Pocket appearing later (create, join) loads in place.
  const loadedOnce = useRef(false);
  const stillLoading = !!profile && (ids === null || ids.some((id) => !(id in docs)));
  if (!stillLoading && profile) loadedOnce.current = true;
  if (!profile) loadedOnce.current = false;
  const loading = stillLoading && !loadedOnce.current;

  // Personal only hides while there's a shared Pocket to show instead; leave the last one and it's back.
  const personalHidden = !!profile?.hidePersonal && allPockets.some((p) => p.type === 'shared');
  const pockets = useMemo(
    () => (personalHidden ? allPockets.filter((p) => p.type !== 'personal') : allPockets),
    [allPockets, personalHidden],
  );

  const current = useMemo(() => {
    if (!uid || pockets.length === 0) return null;
    return (
      pockets.find((p) => p.id === currentId) ??
      pockets.find((p) => p.id === personalPocketId(uid)) ??
      pockets[0]
    );
  }, [pockets, currentId, uid]);

  const setCurrent = (id: string) => {
    setCurrentId(id);
    if (uid) {
      try {
        localStorage.setItem(currentKey(uid), id);
      } catch {
        /* storage unavailable */
      }
      // Saved on the account too, so the next phone to open Spendr shows the same Pocket.
      if (profile?.lastPocketId !== id) updateDoc(userRef(uid), { lastPocketId: id }).catch(() => {});
    }
  };

  const setHidePersonal = (hide: boolean) => {
    if (uid) updateDoc(userRef(uid), { hidePersonal: hide }).catch(() => {});
  };

  const value: PocketsState = {
    pockets,
    allPockets,
    personalHidden,
    setHidePersonal,
    loading,
    current,
    setCurrent,
    categories: current ? cats[current.id] ?? [] : [],
    categoriesLoading: !!current && !cats[current.id],
    categoriesFor: (pid) => cats[pid] ?? [],
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Owner first, then by join date; the signed-in user is placed first among equals. */
function sortMembers(list: Member[], me?: string): Member[] {
  return [...list].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
    if (a.uid === me) return -1;
    if (b.uid === me) return 1;
    return (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0);
  });
}

export function usePockets(): PocketsState {
  const s = useContext(Ctx);
  if (!s) throw new Error('usePockets outside PocketsProvider');
  return s;
}

/** The current Pocket; only for screens rendered once Pockets have loaded. */
export function useCurrentPocket(): PocketWithMembers {
  const { current } = usePockets();
  if (!current) throw new Error('No current Pocket');
  return current;
}
