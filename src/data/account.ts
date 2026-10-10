import { deleteUser, type User } from 'firebase/auth';
import { writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { uniqueInitials } from '../lib/initials';
import { clearPin } from '../lib/pin';
import { commit, deletePocket, leavePocket } from './pockets';
import { memberRef, pocketRef, userRef } from './refs';
import type { PocketWithMembers } from './types';

/** Renames the user everywhere: profile and every Pocket membership (initials stay unique per Pocket). */
export async function updateName(uid: string, name: string, initials: string, pockets: PocketWithMembers[]) {
  const batch = writeBatch(db);
  batch.update(userRef(uid), { name, initials });
  for (const p of pockets) {
    const taken = p.members.filter((m) => m.uid !== uid).map((m) => m.initials);
    batch.update(memberRef(p.id, uid), { name, initials: uniqueInitials(initials, taken) });
  }
  await commit(batch);
}

/**
 * Deletes the account. Personal and solo Pockets are deleted. Shared Pockets with other people stay:
 * if the user owns one, ownership passes to the longest-standing other member first.
 */
export async function deleteAccount(user: User, pockets: PocketWithMembers[]) {
  for (const p of pockets) {
    const others = p.members.filter((m) => m.uid !== user.uid);
    if (p.ownerUid === user.uid) {
      if (others.length === 0) {
        await deletePocket(p.id, user.uid);
      } else {
        const heir = [...others].sort((a, b) => (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0))[0];
        const batch = writeBatch(db);
        batch.update(memberRef(p.id, heir.uid), { role: 'owner' });
        batch.update(pocketRef(p.id), { ownerUid: heir.uid });
        batch.delete(memberRef(p.id, user.uid));
        await commit(batch);
      }
    } else {
      await leavePocket(p.id, user.uid);
    }
  }
  const batch = writeBatch(db);
  batch.delete(userRef(user.uid));
  await commit(batch);
  await clearPin(user.uid);
  await deleteUser(user);
}
