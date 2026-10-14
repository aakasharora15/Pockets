import { arrayUnion, getDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { generateCode, INVITE_TTL_MS } from '../lib/inviteCode';
import { moveAllExpenses } from './expenses';
import { commit } from './pockets';
import { inviteRef, memberRef, personalPocketId, userRef } from './refs';
import type { Invite, PocketWithMembers } from './types';

/** Creates a single-use invite that expires in 48 hours, optionally locked to one email address. */
export async function createInvite(pocket: PocketWithMembers, me: { uid: string; name: string }, email?: string): Promise<Invite> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const existing = await getDoc(inviteRef(code)).catch(() => null);
    if (existing?.exists()) continue;
    const invite: Omit<Invite, 'createdAt'> = {
      code,
      pocketId: pocket.id,
      pocketName: pocket.name,
      createdByUid: me.uid,
      createdByName: me.name,
      expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_MS),
      usedByUid: null,
      members: pocket.members.map((m) => ({ name: m.name, initials: m.initials })),
      currencies: pocket.currencies,
      ...(email ? { email: email.trim().toLowerCase() } : {}),
    };
    const batch = writeBatch(db);
    batch.set(inviteRef(code), { ...invite, createdAt: serverTimestamp() });
    await commit(batch);
    return { ...invite, createdAt: Timestamp.now() };
  }
  throw new Error('Could not create an invite code. Try again.');
}

export async function cancelInvite(code: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(inviteRef(code));
  await commit(batch);
}

/** Invites last 48 hours from when the server stored them. */
export function expiryOf(inv: Pick<Invite, 'createdAt' | 'expiresAt'>): number {
  return inv.createdAt ? inv.createdAt.toMillis() + INVITE_TTL_MS : inv.expiresAt.toMillis();
}

export type InviteProblem = 'not-found' | 'expired' | 'used' | 'already-member' | 'wrong-email';

export async function lookupInvite(code: string, uid: string, email: string | null): Promise<Invite | InviteProblem> {
  const snap = await getDoc(inviteRef(code));
  if (!snap.exists()) return 'not-found';
  const inv = { ...(snap.data() as Omit<Invite, 'code'>), code } as Invite;
  if (inv.usedByUid === uid) return 'already-member';
  if (inv.usedByUid) return 'used';
  if (expiryOf(inv) < Date.now()) return 'expired';
  if (inv.email && inv.email !== email?.toLowerCase()) return 'wrong-email';
  return inv;
}

/**
 * Redeems an invite: marks it used and adds the caller as a member in one batch. Security rules
 * check the invite is unused, unexpired and being used by the caller. If asked, the caller's
 * Personal expenses then move to the Pocket.
 */
export async function redeemInvite(opts: { invite: Invite; uid: string; name: string; initials: string; moveExpenses: boolean }): Promise<void> {
  const { invite, uid } = opts;
  const batch = writeBatch(db);
  batch.update(inviteRef(invite.code), { usedByUid: uid, usedAt: serverTimestamp() });
  batch.set(memberRef(invite.pocketId, uid), {
    uid,
    name: opts.name,
    initials: opts.initials,
    role: 'member',
    joinedAt: serverTimestamp(),
    inviteCode: invite.code,
  });
  batch.update(userRef(uid), { pocketIds: arrayUnion(invite.pocketId) });
  // Joining needs the server to check the invite, so wait for it.
  await batch.commit();
  if (opts.moveExpenses) await moveAllExpenses(personalPocketId(uid), invite.pocketId);
}
