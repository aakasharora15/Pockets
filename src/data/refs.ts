import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const userRef = (uid: string) => doc(db, 'users', uid);
export const pocketRef = (pid: string) => doc(db, 'pockets', pid);
export const membersCol = (pid: string) => collection(db, 'pockets', pid, 'members');
export const memberRef = (pid: string, uid: string) => doc(db, 'pockets', pid, 'members', uid);
export const categoriesCol = (pid: string) => collection(db, 'pockets', pid, 'categories');
export const categoryRef = (pid: string, cid: string) => doc(db, 'pockets', pid, 'categories', cid);
export const expensesCol = (pid: string) => collection(db, 'pockets', pid, 'expenses');
export const expenseRef = (pid: string, eid: string) => doc(db, 'pockets', pid, 'expenses', eid);
export const recurringCol = (pid: string) => collection(db, 'pockets', pid, 'recurring');
export const recurringRef = (pid: string, rid: string) => doc(db, 'pockets', pid, 'recurring', rid);
export const receiptsCol = (pid: string) => collection(db, 'pockets', pid, 'receipts');
export const receiptRef = (pid: string, eid: string) => doc(db, 'pockets', pid, 'receipts', eid);
export const shoppingCol = (pid: string) => collection(db, 'pockets', pid, 'shopping');
export const shoppingRef = (pid: string, iid: string) => doc(db, 'pockets', pid, 'shopping', iid);
export const invitesCol = () => collection(db, 'invites');
export const inviteRef = (code: string) => doc(db, 'invites', code);

/** Every account's Personal Pocket has a predictable id. */
export const personalPocketId = (uid: string) => `personal_${uid}`;

/** Firestore batches allow 500 writes; stay well under to leave room for rule reads. */
export const BATCH_LIMIT = 400;
