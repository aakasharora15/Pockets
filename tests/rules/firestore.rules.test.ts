import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  Bytes,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const HOME = 'home1';
const OWNER = 'prernaa';
const MEMBER = 'aakash';
const STRANGER = 'trina';

const hour = 60 * 60 * 1000;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-spendr-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

/** Seeds a shared Pocket "Home" owned by Prernaa with Aakash as a member, plus an open invite. */
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'pockets', HOME), {
      name: 'Home',
      type: 'shared',
      ownerUid: OWNER,
      currencies: ['GBP', 'INR'],
      budgets: {},
      createdAt: Timestamp.now(),
    });
    for (const [uid, name, initials, role] of [
      [OWNER, 'Prernaa Singh', 'PS', 'owner'],
      [MEMBER, 'Aakash', 'AA', 'member'],
    ]) {
      await setDoc(doc(db, 'pockets', HOME, 'members', uid), { uid, name, initials, role, joinedAt: Timestamp.now() });
    }
    await setDoc(doc(db, 'pockets', HOME, 'categories', 'other'), {
      name: 'Other', icon: 'dots-three', colour: '#9AA0AA', order: 10000, system: true,
    });
    await setDoc(doc(db, 'pockets', HOME, 'categories', 'groceries'), {
      name: 'Groceries', icon: 'basket', colour: '#5AA0F0', order: 2000, system: false,
    });
    await setDoc(doc(db, 'pockets', HOME, 'expenses', 'e1'), expense({ byUid: OWNER, byInitials: 'PS' }));
    await setDoc(doc(db, 'invites', 'K7PQ2M'), invite());
    await setDoc(doc(db, 'users', STRANGER), { name: 'Trina', initials: 'TR', email: 't@x.com', createdAt: null, pocketIds: [] });
  });
});

function expense(over: Record<string, unknown> = {}) {
  return {
    currency: 'GBP',
    amountMinor: 8640,
    name: 'Tesco weekly shop',
    categoryId: 'groceries',
    byUid: OWNER,
    byInitials: 'PS',
    date: '2026-09-18',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...over,
  };
}

function invite(over: Record<string, unknown> = {}) {
  return {
    code: 'K7PQ2M',
    pocketId: HOME,
    pocketName: 'Home',
    createdByUid: OWNER,
    createdByName: 'Prernaa Singh',
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 48 * hour),
    usedByUid: null,
    members: [{ name: 'Prernaa Singh', initials: 'PS' }],
    currencies: ['GBP', 'INR'],
    ...over,
  };
}

const as = (uid: string | null, email?: string): Firestore =>
  (uid ? env.authenticatedContext(uid, email ? { email } : undefined) : env.unauthenticatedContext()).firestore() as unknown as Firestore;

function joinBatch(db: Firestore, uid: string, code = 'K7PQ2M', pid = HOME) {
  const b = writeBatch(db);
  b.update(doc(db, 'invites', code), { usedByUid: uid, usedAt: Timestamp.now() });
  b.set(doc(db, 'pockets', pid, 'members', uid), {
    uid, name: 'Trina', initials: 'TR', role: 'member', joinedAt: Timestamp.now(), inviteCode: code,
  });
  if (uid === STRANGER) b.update(doc(db, 'users', uid), { pocketIds: arrayUnion(pid) });
  return b;
}

describe('pockets', () => {
  it('a non-member cannot read a Pocket or its expenses', async () => {
    await assertFails(getDoc(doc(as(STRANGER), 'pockets', HOME)));
    await assertFails(getDocs(collection(as(STRANGER), 'pockets', HOME, 'expenses')));
    await assertFails(getDoc(doc(as(null), 'pockets', HOME)));
  });

  it('members can read the Pocket and its expenses', async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER), 'pockets', HOME)));
    await assertSucceeds(getDocs(collection(as(MEMBER), 'pockets', HOME, 'expenses')));
  });

  it('a member cannot delete the Pocket; the owner can', async () => {
    await assertFails(deleteDoc(doc(as(MEMBER), 'pockets', HOME)));
    await assertSucceeds(deleteDoc(doc(as(OWNER), 'pockets', HOME)));
  });

  it('only the owner can rename or change currencies', async () => {
    await assertFails(updateDoc(doc(as(MEMBER), 'pockets', HOME), { name: 'Flat' }));
    await assertFails(updateDoc(doc(as(MEMBER), 'pockets', HOME), { currencies: ['GBP'] }));
    await assertSucceeds(updateDoc(doc(as(OWNER), 'pockets', HOME), { name: 'Flat 4B', currencies: ['GBP'] }));
  });

  it('rejects unknown currencies', async () => {
    await assertFails(updateDoc(doc(as(OWNER), 'pockets', HOME), { currencies: ['AED'] }));
  });

  it('any member can set budgets', async () => {
    await assertSucceeds(updateDoc(doc(as(MEMBER), 'pockets', HOME), { 'budgets.GBP': 320000 }));
  });

  it('creates a Personal Pocket with its owner membership and categories in one batch', async () => {
    const db = as(STRANGER);
    const pid = `personal_${STRANGER}`;
    const b = writeBatch(db);
    b.set(doc(db, 'pockets', pid), {
      name: 'Personal', type: 'personal', ownerUid: STRANGER, currencies: ['GBP'], budgets: {}, createdAt: Timestamp.now(),
    });
    b.set(doc(db, 'pockets', pid, 'members', STRANGER), {
      uid: STRANGER, name: 'Trina', initials: 'TR', role: 'owner', joinedAt: Timestamp.now(),
    });
    b.set(doc(db, 'pockets', pid, 'categories', 'other'), {
      name: 'Other', icon: 'dots-three', colour: '#9AA0AA', order: 1, system: true,
    });
    await assertSucceeds(b.commit());
  });

  it("cannot create someone else's Personal Pocket", async () => {
    const db = as(STRANGER);
    const pid = `personal_${OWNER}`;
    const b = writeBatch(db);
    b.set(doc(db, 'pockets', pid), {
      name: 'Personal', type: 'personal', ownerUid: STRANGER, currencies: ['GBP'], budgets: {}, createdAt: Timestamp.now(),
    });
    b.set(doc(db, 'pockets', pid, 'members', STRANGER), {
      uid: STRANGER, name: 'Trina', initials: 'TR', role: 'owner', joinedAt: Timestamp.now(),
    });
    await assertFails(b.commit());
  });

  it('cannot add yourself to an existing Pocket as owner', async () => {
    await assertFails(
      setDoc(doc(as(STRANGER), 'pockets', HOME, 'members', STRANGER), {
        uid: STRANGER, name: 'Trina', initials: 'TR', role: 'owner', joinedAt: Timestamp.now(),
      }),
    );
  });
});

describe('members', () => {
  it('owner can remove a member; a member cannot remove others', async () => {
    await assertFails(deleteDoc(doc(as(MEMBER), 'pockets', HOME, 'members', OWNER)));
    await assertSucceeds(deleteDoc(doc(as(OWNER), 'pockets', HOME, 'members', MEMBER)));
  });

  it('a member can leave', async () => {
    await assertSucceeds(deleteDoc(doc(as(MEMBER), 'pockets', HOME, 'members', MEMBER)));
  });

  it('the owner cannot just leave while the Pocket exists', async () => {
    await assertFails(deleteDoc(doc(as(OWNER), 'pockets', HOME, 'members', OWNER)));
  });

  it('the owner can delete the Pocket and their membership together', async () => {
    const db = as(OWNER);
    const b = writeBatch(db);
    b.delete(doc(db, 'pockets', HOME));
    b.delete(doc(db, 'pockets', HOME, 'members', OWNER));
    await assertSucceeds(b.commit());
  });

  it('a member cannot promote themselves to owner', async () => {
    await assertFails(updateDoc(doc(as(MEMBER), 'pockets', HOME, 'members', MEMBER), { role: 'owner' }));
  });

  it('a member can change their own name and initials', async () => {
    await assertSucceeds(updateDoc(doc(as(MEMBER), 'pockets', HOME, 'members', MEMBER), { name: 'Aakash A', initials: 'AK' }));
  });

  it('lists only your own memberships across Pockets', async () => {
    await assertSucceeds(getDocs(query(collectionGroup(as(MEMBER), 'members'), where('uid', '==', MEMBER))));
    await assertFails(getDocs(query(collectionGroup(as(MEMBER), 'members'), where('uid', '==', OWNER))));
  });
});

describe('expenses', () => {
  it('members can add, edit and delete expenses', async () => {
    const db = as(MEMBER);
    await assertSucceeds(setDoc(doc(db, 'pockets', HOME, 'expenses', 'e2'), expense({ byUid: MEMBER, byInitials: 'AA' })));
    await assertSucceeds(updateDoc(doc(db, 'pockets', HOME, 'expenses', 'e1'), { amountMinor: 9000, editedByUid: MEMBER }));
    await assertSucceeds(deleteDoc(doc(db, 'pockets', HOME, 'expenses', 'e1')));
  });

  it('non-members cannot write expenses', async () => {
    await assertFails(setDoc(doc(as(STRANGER), 'pockets', HOME, 'expenses', 'e3'), expense()));
  });

  it('amounts must be positive integers in minor units', async () => {
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 'x1'), expense({ amountMinor: 12.5 })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 'x2'), expense({ amountMinor: 0 })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 'x3'), expense({ currency: 'AED' })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 'x4'), expense({ date: '18/09/2026' })));
  });
});

describe('tags, recurring and receipts', () => {
  it('expenses can carry a tag, a recurring link and a receipt flag', async () => {
    const db = as(MEMBER);
    await assertSucceeds(setDoc(doc(db, 'pockets', HOME, 'expenses', 't1'), expense({ tag: 'India Dec 2026', recurringId: 'r1', receipt: true })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 't2'), expense({ tag: '' })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 't3'), expense({ tag: 'x'.repeat(41) })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'expenses', 't4'), expense({ receipt: 'yes' })));
  });

  it('any member can record that new default categories were added', async () => {
    await assertSucceeds(updateDoc(doc(as(MEMBER), 'pockets', HOME), { defaultsVersion: 2 }));
    await assertFails(updateDoc(doc(as(MEMBER), 'pockets', HOME), { defaultsVersion: 'two' }));
    await assertFails(updateDoc(doc(as(STRANGER), 'pockets', HOME), { defaultsVersion: 2 }));
  });

  it('any member can add tags to the Pocket', async () => {
    await assertSucceeds(updateDoc(doc(as(MEMBER), 'pockets', HOME), { tags: arrayUnion('India Dec 2026') }));
    await assertFails(updateDoc(doc(as(STRANGER), 'pockets', HOME), { tags: arrayUnion('Nope') }));
  });

  const rule = (over: Record<string, unknown> = {}) => ({
    currency: 'GBP', amountMinor: 120000, name: 'Rent', categoryId: 'other', byUid: OWNER, byInitials: 'PS',
    day: 1, nextDate: '2026-11-01', createdByUid: OWNER, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), ...over,
  });

  it('members can create, change and stop recurring expenses', async () => {
    const db = as(MEMBER);
    await assertSucceeds(setDoc(doc(db, 'pockets', HOME, 'recurring', 'r1'), rule()));
    await assertSucceeds(updateDoc(doc(db, 'pockets', HOME, 'recurring', 'r1'), { nextDate: '2026-12-01' }));
    await assertSucceeds(getDocs(collection(db, 'pockets', HOME, 'recurring')));
    await assertSucceeds(deleteDoc(doc(db, 'pockets', HOME, 'recurring', 'r1')));
  });

  it('recurring expenses are checked like expenses', async () => {
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'recurring', 'x1'), rule({ day: 32 })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'recurring', 'x2'), rule({ amountMinor: 0 })));
    await assertFails(setDoc(doc(db, 'pockets', HOME, 'recurring', 'x3'), rule({ nextDate: 'soon' })));
    await assertFails(setDoc(doc(as(STRANGER), 'pockets', HOME, 'recurring', 'x4'), rule()));
    await assertFails(getDocs(collection(as(STRANGER), 'pockets', HOME, 'recurring')));
  });

  const receipt = (size: number) => ({
    data: Bytes.fromUint8Array(new Uint8Array(size)), type: 'image/jpeg', width: 800, height: 1200, byUid: MEMBER, createdAt: Timestamp.now(),
  });

  it('members can attach a receipt photo; others cannot see it', async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), 'pockets', HOME, 'receipts', 'e1'), receipt(200000)));
    await assertSucceeds(getDoc(doc(as(OWNER), 'pockets', HOME, 'receipts', 'e1')));
    await assertFails(getDoc(doc(as(STRANGER), 'pockets', HOME, 'receipts', 'e1')));
    await assertFails(setDoc(doc(as(STRANGER), 'pockets', HOME, 'receipts', 'e2'), receipt(1000)));
  });

  it('receipt photos must be small JPEGs', async () => {
    await assertFails(setDoc(doc(as(MEMBER), 'pockets', HOME, 'receipts', 'e1'), receipt(950000)));
    await assertFails(setDoc(doc(as(MEMBER), 'pockets', HOME, 'receipts', 'e1'), { ...receipt(1000), type: 'image/png' }));
  });
});

describe('categories', () => {
  it('members can add and delete categories but not Other', async () => {
    const db = as(MEMBER);
    await assertSucceeds(
      setDoc(doc(db, 'pockets', HOME, 'categories', 'pets'), {
        name: 'Pets', icon: 'paw-print', colour: '#5AA0F0', order: 9000, system: false,
      }),
    );
    await assertSucceeds(deleteDoc(doc(db, 'pockets', HOME, 'categories', 'groceries')));
    await assertFails(deleteDoc(doc(db, 'pockets', HOME, 'categories', 'other')));
  });

  it('cannot mark a new category as system', async () => {
    await assertFails(
      setDoc(doc(as(MEMBER), 'pockets', HOME, 'categories', 'fake'), {
        name: 'Fake', icon: 'star', colour: '#fff', order: 1, system: true,
      }),
    );
  });
});

describe('invites', () => {
  it('any signed-in user can read an invite by code', async () => {
    await assertSucceeds(getDoc(doc(as(STRANGER), 'invites', 'K7PQ2M')));
    await assertFails(getDoc(doc(as(null), 'invites', 'K7PQ2M')));
  });

  it('only members can create invites', async () => {
    await assertSucceeds(setDoc(doc(as(MEMBER), 'invites', 'ABCDEF'), invite({ code: 'ABCDEF', createdByUid: MEMBER, createdAt: serverTimestamp() })));
    await assertFails(setDoc(doc(as(STRANGER), 'invites', 'ABCDE2'), invite({ code: 'ABCDE2', createdByUid: STRANGER, createdAt: serverTimestamp() })));
  });

  it('invites must be stamped with the server time', async () => {
    await assertFails(
      setDoc(doc(as(MEMBER), 'invites', 'ABCDE3'), invite({ code: 'ABCDE3', createdByUid: MEMBER, createdAt: Timestamp.fromMillis(Date.now() + 30 * 24 * hour) })),
    );
  });

  it('rejects codes with ambiguous characters', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'invites', 'ABC0O1'), invite({ code: 'ABC0O1', createdAt: serverTimestamp() })));
  });

  it('joining with a valid invite works and makes you a member', async () => {
    await assertSucceeds(joinBatch(as(STRANGER), STRANGER).commit());
    await assertSucceeds(getDoc(doc(as(STRANGER), 'pockets', HOME)));
  });

  it('an invite works once', async () => {
    await assertSucceeds(joinBatch(as(STRANGER), STRANGER).commit());
    await assertFails(joinBatch(as('someone'), 'someone').commit());
  });

  it('an expired invite does not work', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      // Created 49 hours ago: expired by the server's clock, whatever expiresAt says.
      await setDoc(doc(ctx.firestore(), 'invites', 'QLDQLD'), invite({
        code: 'QLDQLD', createdAt: Timestamp.fromMillis(Date.now() - 49 * hour), expiresAt: Timestamp.fromMillis(Date.now() + hour),
      }));
    });
    await assertFails(joinBatch(as(STRANGER), STRANGER, 'QLDQLD').commit());
  });

  it('cannot join without marking the invite used', async () => {
    await assertFails(
      setDoc(doc(as(STRANGER), 'pockets', HOME, 'members', STRANGER), {
        uid: STRANGER, name: 'Trina', initials: 'TR', role: 'member', joinedAt: Timestamp.now(), inviteCode: 'K7PQ2M',
      }),
    );
  });

  it('cannot use an invite for a different Pocket', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'pockets', 'other1'), {
        name: 'Other', type: 'shared', ownerUid: 'x', currencies: ['GBP'], budgets: {}, createdAt: Timestamp.now(),
      });
    });
    await assertFails(joinBatch(as(STRANGER), STRANGER, 'K7PQ2M', 'other1').commit());
  });

  it('an emailed invite must have a valid, lower-case address', async () => {
    const make = (code: string, email: string) =>
      setDoc(doc(as(OWNER), 'invites', code), invite({ code, email, createdAt: serverTimestamp() }));
    await assertSucceeds(make('MAQWE2', 'trina@example.com'));
    await assertFails(make('MAQWE3', 'Trina@Example.com'));
    await assertFails(make('MAQWE4', 'not an email'));
  });

  it('an emailed invite works only for that email', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invites', 'MAILME'), invite({ code: 'MAILME', email: 'trina@example.com' }));
    });
    await assertFails(joinBatch(as(STRANGER), STRANGER, 'MAILME').commit());
    await assertFails(joinBatch(as(STRANGER, 'someone@example.com'), STRANGER, 'MAILME').commit());
    await assertSucceeds(joinBatch(as(STRANGER, 'Trina@Example.com'), STRANGER, 'MAILME').commit());
  });

  it('members can cancel invites; strangers cannot', async () => {
    await assertFails(deleteDoc(doc(as(STRANGER), 'invites', 'K7PQ2M')));
    await assertSucceeds(deleteDoc(doc(as(OWNER), 'invites', 'K7PQ2M')));
  });

  it('members can list their Pocket invites', async () => {
    await assertSucceeds(getDocs(query(collection(as(OWNER), 'invites'), where('pocketId', '==', HOME))));
    await assertFails(getDocs(query(collection(as(STRANGER), 'invites'), where('pocketId', '==', HOME))));
  });
});

describe('users', () => {
  it('a user can only read and write their own profile', async () => {
    await assertSucceeds(getDoc(doc(as(STRANGER), 'users', STRANGER)));
    await assertFails(getDoc(doc(as(OWNER), 'users', STRANGER)));
    await assertFails(updateDoc(doc(as(OWNER), 'users', STRANGER), { name: 'Hacked' }));
  });
});
