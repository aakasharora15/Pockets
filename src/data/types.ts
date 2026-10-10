import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode } from '../lib/currencies';

export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  createdAt: Timestamp | null;
  pocketIds: string[];
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
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  /** Local only: write not yet synced to the server. */
  pending?: boolean;
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
}

/** A Pocket the signed-in user belongs to, with its members. */
export interface PocketWithMembers extends Pocket {
  members: Member[];
}
