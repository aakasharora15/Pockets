import { describe, expect, it } from 'vitest';
import { base64ToBytes, BackupError, bytesToBase64, parseBackup } from '../backup';

const good = {
  app: 'Spendr',
  kind: 'backup',
  version: 1,
  createdAt: '2026-10-11T17:00:00.000Z',
  account: { uid: 'u1', name: 'Prernaa', email: 'p@example.com' },
  pockets: [
    {
      id: 'home1',
      name: 'Home',
      type: 'shared',
      currencies: ['GBP', 'INR', 'XYZ'],
      budgets: { GBP: 320000, XYZ: 5 },
      tags: ['India Dec 2026'],
      members: [{ uid: 'u1', name: 'Prernaa', initials: 'PS', role: 'owner' }],
      categories: [{ id: 'groceries', name: 'Groceries', icon: 'basket', colour: '#5AA0F0', order: 2000 }],
      expenses: [
        {
          id: 'e1',
          currency: 'GBP',
          amountMinor: 8640,
          name: 'Tesco',
          categoryId: 'groceries',
          byUid: 'u1',
          byInitials: 'PS',
          date: '2026-09-18',
          createdAt: 1758000000000,
          tag: 'India Dec 2026',
        },
        { id: 'bad/id', currency: 'GBP', amountMinor: 100, name: 'x', categoryId: 'other', byUid: 'u1', byInitials: 'PS', date: '2026-09-18' },
        { id: 'e3', currency: 'AED', amountMinor: 100, name: 'x', categoryId: 'other', byUid: 'u1', byInitials: 'PS', date: '2026-09-18' },
        { id: 'e4', currency: 'GBP', amountMinor: 12.5, name: 'x', categoryId: 'other', byUid: 'u1', byInitials: 'PS', date: '2026-09-18' },
      ],
      recurring: [
        { id: 'r1', currency: 'GBP', amountMinor: 120000, name: 'Rent', categoryId: 'other', byUid: 'u1', byInitials: 'PS', day: 1, nextDate: '2026-11-01' },
        { id: 'r2', currency: 'GBP', amountMinor: 1, name: 'Bad', categoryId: 'other', byUid: 'u1', byInitials: 'PS', day: 40, nextDate: '2026-11-01' },
      ],
    },
  ],
};

describe('backup files', () => {
  it('reads a backup and drops entries that would be refused', () => {
    const { backup, skipped } = parseBackup(JSON.stringify(good));
    const p = backup.pockets[0];
    expect(p.currencies).toEqual(['GBP', 'INR']);
    expect(p.budgets).toEqual({ GBP: 320000 });
    expect(p.expenses.map((e) => e.id)).toEqual(['e1']);
    expect(p.expenses[0]).toMatchObject({ tag: 'India Dec 2026', createdAt: 1758000000000 });
    expect(p.recurring.map((r) => r.id)).toEqual(['r1']);
    expect(skipped).toBe(4);
  });

  it('refuses files that are not Spendr backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: 'Other', kind: 'backup', pockets: [] }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...good, version: 99 }))).toThrow(/newer version/);
  });

  it('round-trips photo bytes', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});
