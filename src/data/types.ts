import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode } from '../lib/currencies';

export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  createdAt: Timestamp | null;
  pocketIds: string[];
  /** The Pocket last opened on any phone; new sessions open on it. */
  lastPocketId?: string;
  /** Hide the Personal Pocket while the account is in a shared one. It still exists as a fallback. */
  hidePersonal?: boolean;
}

export type PocketType = 'personal' | 'shared';

export interface Pocket {
  id: string;
  name: string;
  type: PocketType;
  ownerUid: string;
  /** First is the main currency. */
  currencies: CurrencyCode[];
  /** Monthly budget per currency, in minor units. Missing = no budget. */
  budgets: Partial<Record<CurrencyCode, number>>;
  /** Tags used in this Pocket (trips, events), in the order they were first used. */
  tags?: string[];
  /** Default category set this Pocket has (see DEFAULTS_VERSION). Missing means 1. */
  defaultsVersion?: number;
  createdAt: Timestamp | null;
}

export type Role = 'owner' | 'member';

export interface Member {
  uid: string;
  name: string;
  initials: string;
  role: Role;
  joinedAt: Timestamp | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  colour: string;
  order: number;
  system: boolean;
}

export interface Expense {
  id: string;
  currency: CurrencyCode;
  amountMinor: number;
  name: string;
  categoryId: string;
  byUid: string;
  byInitials: string;
  editedByUid?: string;
  /** 'YYYY-MM-DD' */
  date: string;
  note?: string;
  /** One tag, such as a trip ("India Dec 2026"). */
  tag?: string;
  /** Set when the expense was logged by, or set up, a monthly repeat. */
  recurringId?: string;
  /** A receipt photo is stored at pockets/{pid}/receipts/{id}. */
  receipt?: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  /** Local only: write not yet synced to the server. */
  pending?: boolean;
}

/** When a shopping list item is needed: this week or some time this month. */
export type ShoppingWhen = 'week' | 'month';

/** One thing to buy on a Pocket's shared list. */
export interface ShoppingItem {
  id: string;
  name: string;
  when: ShoppingWhen;
  done: boolean;
  addedByUid: string;
  /** Who ticked it off, while it's done. */
  doneByUid?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** A monthly repeat: logged on `day` each month (the last day in shorter months). */
export interface Recurring {
  id: string;
  currency: CurrencyCode;
  amountMinor: number;
  name: string;
  categoryId: string;
  byUid: string;
  byInitials: string;
  note?: string;
  tag?: string;
  /** Day of the month, 1–31. */
  day: number;
  /** Next date to log, 'YYYY-MM-DD'. */
  nextDate: string;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface InvitePreviewMember {
  name: string;
  initials: string;
}

export interface Invite {
  code: string;
  pocketId: string;
  pocketName: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
  usedByUid: string | null;
  /** Snapshot for the joiner's preview (they can't read the Pocket until they join). */
  members: InvitePreviewMember[];
  currencies: CurrencyCode[];
  /** Set on emailed invites: only an account signed in with this address can use it. */
  email?: string;
}

/** A Pocket the signed-in user belongs to, with its members. */
export interface PocketWithMembers extends Pocket {
  members: Member[];
}
